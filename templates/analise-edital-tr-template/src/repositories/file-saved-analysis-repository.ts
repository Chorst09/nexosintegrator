import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname } from "node:path";
import type { RequestScope, SaveAnalysisPayload, SavedAnalysisRecord } from "../types.js";
import type { SavedAnalysisRepository } from "./saved-analysis-repository.js";

function hasAccess(record: SavedAnalysisRecord, scope: RequestScope): boolean {
  if (scope.role === "master") return true;
  if (scope.role === "admin") return record.companyId === scope.companyId;
  return record.companyId === scope.companyId && record.createdByUserId === scope.userId;
}

export class FileSavedAnalysisRepository implements SavedAnalysisRepository {
  private readonly filePath: string;
  private queue: Promise<void>;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.queue = Promise.resolve();
  }

  async init(): Promise<void> {
    await this.ensureFile();
  }

  async list(scope: RequestScope): Promise<SavedAnalysisRecord[]> {
    const all = await this.readAll();
    return all
      .filter((record) => hasAccess(record, scope))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getById(id: string, scope: RequestScope): Promise<SavedAnalysisRecord | null> {
    const all = await this.readAll();
    const found = all.find((record) => record.id === id) ?? null;
    if (!found) return null;
    return hasAccess(found, scope) ? found : null;
  }

  async upsert(payload: SaveAnalysisPayload, scope: RequestScope): Promise<SavedAnalysisRecord> {
    return this.withWriteLock(async () => {
      const all = await this.readAll();
      const now = new Date().toISOString();
      const existingIndex = all.findIndex(
        (record) => record.analysisId === payload.analysisId && record.companyId === scope.companyId
      );

      if (existingIndex >= 0) {
        const existing = all[existingIndex];
        if (!hasAccess(existing, scope)) {
          throw new Error("Sem permissao para atualizar este registro.");
        }
        const updated: SavedAnalysisRecord = {
          ...existing,
          fileName: payload.fileName,
          processedAt: payload.processedAt,
          extractedData: payload.extractedData,
          originalFileDataUri: payload.originalFileDataUri ?? null,
          summaryPdfDataUri: payload.summaryPdfDataUri ?? null,
          updatedAt: now
        };
        all[existingIndex] = updated;
        await this.writeAll(all);
        return updated;
      }

      const created: SavedAnalysisRecord = {
        id: crypto.randomUUID(),
        analysisId: payload.analysisId,
        companyId: scope.companyId,
        createdByUserId: scope.userId,
        fileName: payload.fileName,
        processedAt: payload.processedAt,
        extractedData: payload.extractedData,
        originalFileDataUri: payload.originalFileDataUri ?? null,
        summaryPdfDataUri: payload.summaryPdfDataUri ?? null,
        createdAt: now,
        updatedAt: now
      };
      all.push(created);
      await this.writeAll(all);
      return created;
    });
  }

  async remove(id: string, scope: RequestScope): Promise<boolean> {
    return this.withWriteLock(async () => {
      const all = await this.readAll();
      const existing = all.find((record) => record.id === id);
      if (!existing) return false;
      if (!hasAccess(existing, scope)) return false;
      const next = all.filter((record) => record.id !== id);
      await this.writeAll(next);
      return true;
    });
  }

  private async ensureFile(): Promise<void> {
    const dir = dirname(this.filePath);
    await mkdir(dir, { recursive: true });
    try {
      await access(this.filePath, constants.F_OK);
    } catch {
      await writeFile(this.filePath, "[]", "utf8");
    }
  }

  private async readAll(): Promise<SavedAnalysisRecord[]> {
    await this.ensureFile();
    const raw = await readFile(this.filePath, "utf8");
    if (!raw.trim()) return [];
    try {
      const parsed = JSON.parse(raw) as SavedAnalysisRecord[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private async writeAll(records: SavedAnalysisRecord[]): Promise<void> {
    await this.ensureFile();
    await writeFile(this.filePath, JSON.stringify(records, null, 2), "utf8");
  }

  private async withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(fn, fn);
    this.queue = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }
}
