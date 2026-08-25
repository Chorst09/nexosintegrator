const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { Prisma } = require('@prisma/client');
const { prisma } = require('../lib/prisma.cjs');
const { requireRole } = require('../lib/auth.cjs');

const router = express.Router();

const uploadsRoot = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads');
const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const migrationsPath = path.join(__dirname, '..', 'prisma', 'migrations');
const DEFAULT_UPLOAD_CONTENT_LIMIT = 100 * 1024 * 1024;

const normalizeRole = (user = {}) => String(user.actualRole || user.role || '').trim().toUpperCase();
const isGlobalBackupAdmin = (user = {}) => {
  const role = normalizeRole(user);
  if (role === 'MASTER') return true;
  return role === 'ADMIN' && !user.tenantCompanyId;
};

const escapeIdentifier = (value) => `"${String(value).replace(/"/g, '""')}"`;

const jsonReplacer = (_key, value) => {
  if (typeof value === 'bigint') return value.toString();
  if (Buffer.isBuffer(value)) return value.toString('base64');
  return value;
};

const getUploadContentLimit = () => {
  const configured = Number(process.env.BACKUP_MAX_UPLOAD_BYTES || DEFAULT_UPLOAD_CONTENT_LIMIT);
  return Number.isFinite(configured) && configured >= 0 ? configured : DEFAULT_UPLOAD_CONTENT_LIMIT;
};

const getPrismaModels = () =>
  (Prisma.dmmf?.datamodel?.models || []).map((model) => ({
    name: model.name,
    tableName: model.dbName || model.name,
    fields: model.fields.map((field) => ({
      name: field.name,
      kind: field.kind,
      type: field.type,
      isList: Boolean(field.isList),
      isRequired: Boolean(field.isRequired),
      isId: Boolean(field.isId),
      relationName: field.relationName || null
    }))
  }));

const listDatabaseTables = async () => {
  const tables = await prisma.$queryRaw`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name ASC
  `;

  return tables.map((row) => row.table_name).filter(Boolean);
};

const readDatabaseTables = async () => {
  const tableNames = await listDatabaseTables();
  const tables = {};
  let totalRows = 0;

  for (const tableName of tableNames) {
    const rows = await prisma.$queryRawUnsafe(`SELECT * FROM ${escapeIdentifier(tableName)}`);
    tables[tableName] = {
      count: rows.length,
      rows
    };
    totalRows += rows.length;
  }

  return { tableNames, tables, totalRows };
};

const summarizeDatabaseTables = async () => {
  const tableNames = await listDatabaseTables();
  const tables = [];
  let totalRows = 0;

  for (const tableName of tableNames) {
    const result = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::bigint AS count FROM ${escapeIdentifier(tableName)}`);
    const count = Number(result?.[0]?.count || 0);
    tables.push({ tableName, count });
    totalRows += count;
  }

  return { tables, totalRows };
};

const fileSha256 = async (filePath) => {
  const hash = crypto.createHash('sha256');
  const data = await fs.readFile(filePath);
  hash.update(data);
  return { hash: hash.digest('hex'), data };
};

const walkUploads = async (dir, options, state) => {
  let entries = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }

  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);
    const relativePath = path.relative(uploadsRoot, absolutePath).split(path.sep).join('/');

    if (entry.isDirectory()) {
      await walkUploads(absolutePath, options, state);
      continue;
    }

    if (!entry.isFile()) continue;

    const stats = await fs.stat(absolutePath);
    state.totalFiles += 1;
    state.totalBytes += stats.size;

    const file = {
      path: relativePath,
      size: stats.size,
      mtime: stats.mtime.toISOString(),
      sha256: null,
      contentBase64: null
    };

    if (options.includeContents && state.includedBytes + stats.size <= options.contentLimit) {
      const { hash, data } = await fileSha256(absolutePath);
      file.sha256 = hash;
      file.contentBase64 = data.toString('base64');
      state.includedBytes += stats.size;
    } else {
      const { hash } = await fileSha256(absolutePath);
      file.sha256 = hash;
      if (options.includeContents) {
        state.omittedFiles += 1;
      }
    }

    state.files.push(file);
  }
};

const collectUploads = async ({ includeContents }) => {
  const state = {
    root: 'uploads',
    absoluteRoot: uploadsRoot,
    totalFiles: 0,
    totalBytes: 0,
    includedBytes: 0,
    omittedFiles: 0,
    files: []
  };

  await walkUploads(
    uploadsRoot,
    {
      includeContents,
      contentLimit: getUploadContentLimit()
    },
    state
  );

  return {
    root: state.root,
    totalFiles: state.totalFiles,
    totalBytes: state.totalBytes,
    includedBytes: state.includedBytes,
    omittedFiles: state.omittedFiles,
    files: state.files,
    warning: state.omittedFiles
      ? `${state.omittedFiles} arquivo(s) ficaram somente no manifesto por limite de tamanho. Ajuste BACKUP_MAX_UPLOAD_BYTES para incluir tudo.`
      : null
  };
};

const readSystemMetadata = async () => {
  const [schema, migrations] = await Promise.all([
    fs.readFile(schemaPath, 'utf8').catch(() => null),
    fs.readdir(migrationsPath, { withFileTypes: true })
      .then((entries) =>
        entries
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name)
          .sort()
      )
      .catch(() => [])
  ]);

  return {
    prismaSchema: schema,
    prismaMigrations: migrations,
    prismaModels: getPrismaModels()
  };
};

const normalizeBackupTables = (backup) => {
  const rawTables = backup?.database?.tables;
  if (!rawTables || typeof rawTables !== 'object' || Array.isArray(rawTables)) {
    throw new Error('Arquivo de backup completo inválido: tabelas do banco não encontradas');
  }

  return Object.entries(rawTables).map(([tableName, payload]) => {
    const rows = Array.isArray(payload?.rows) ? payload.rows : [];
    return { tableName, rows };
  });
};

const readForeignKeyDependencies = async () => {
  const rows = await prisma.$queryRaw`
    SELECT
      tc.table_name AS table_name,
      ccu.table_name AS foreign_table_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
  `;

  return rows
    .map((row) => ({
      tableName: row.table_name,
      dependsOn: row.foreign_table_name
    }))
    .filter((row) => row.tableName && row.dependsOn && row.tableName !== row.dependsOn);
};

const orderTablesForInsert = async (tableNames) => {
  const tableSet = new Set(tableNames);
  const dependencies = await readForeignKeyDependencies();
  const dependencyMap = new Map(tableNames.map((tableName) => [tableName, new Set()]));

  for (const dependency of dependencies) {
    if (!tableSet.has(dependency.tableName) || !tableSet.has(dependency.dependsOn)) continue;
    dependencyMap.get(dependency.tableName)?.add(dependency.dependsOn);
  }

  const ordered = [];
  const temporary = new Set();
  const permanent = new Set();

  const visit = (tableName) => {
    if (permanent.has(tableName)) return;
    if (temporary.has(tableName)) return;

    temporary.add(tableName);
    for (const dependency of dependencyMap.get(tableName) || []) {
      visit(dependency);
    }
    temporary.delete(tableName);
    permanent.add(tableName);
    ordered.push(tableName);
  };

  tableNames.forEach(visit);
  return ordered;
};

const normalizeRestoreValue = (value) => {
  if (value && typeof value === 'object' && value.type === 'Buffer' && Array.isArray(value.data)) {
    return Buffer.from(value.data);
  }
  if (value === undefined) return null;
  return value;
};

const insertRows = async (tx, tableName, rows) => {
  let inserted = 0;

  for (const row of rows) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue;

    const columns = Object.keys(row);
    if (columns.length === 0) continue;

    const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
    const columnSql = columns.map(escapeIdentifier).join(', ');
    const values = columns.map((column) => normalizeRestoreValue(row[column]));

    await tx.$executeRawUnsafe(
      `INSERT INTO ${escapeIdentifier(tableName)} (${columnSql}) VALUES (${placeholders})`,
      ...values
    );
    inserted += 1;
  }

  return inserted;
};

const restoreDatabase = async (backupTables) => {
  const currentTables = new Set(await listDatabaseTables());
  const tableNames = backupTables.map((table) => table.tableName);
  const missingTables = tableNames.filter((tableName) => !currentTables.has(tableName));

  if (missingTables.length > 0) {
    throw new Error(`O banco atual não possui tabela(s) do backup: ${missingTables.join(', ')}`);
  }

  const tableByName = new Map(backupTables.map((table) => [table.tableName, table]));
  const orderedTableNames = await orderTablesForInsert(tableNames);
  const truncateSql = tableNames.map(escapeIdentifier).join(', ');

  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(`TRUNCATE TABLE ${truncateSql} RESTART IDENTITY CASCADE`);

      let restoredRows = 0;
      const tables = [];

      for (const tableName of orderedTableNames) {
        const rows = tableByName.get(tableName)?.rows || [];
        const insertedRows = await insertRows(tx, tableName, rows);
        restoredRows += insertedRows;
        tables.push({ tableName, restoredRows: insertedRows });
      }

      return { tableCount: orderedTableNames.length, totalRows: restoredRows, tables };
    },
    {
      maxWait: 30000,
      timeout: Number(process.env.BACKUP_RESTORE_TIMEOUT_MS || 10 * 60 * 1000)
    }
  );
};

const resolveSafeUploadPath = (relativePath) => {
  const cleanRelativePath = String(relativePath || '').replace(/\\/g, '/').replace(/^\/+/, '');
  const absolutePath = path.resolve(uploadsRoot, cleanRelativePath);
  const root = path.resolve(uploadsRoot);

  if (absolutePath !== root && !absolutePath.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Caminho de upload inválido no backup: ${relativePath}`);
  }

  return absolutePath;
};

const restoreUploads = async (uploads) => {
  const files = Array.isArray(uploads?.files) ? uploads.files : [];
  let restoredFiles = 0;
  let skippedFiles = 0;
  let restoredBytes = 0;

  for (const file of files) {
    if (!file?.contentBase64) {
      skippedFiles += 1;
      continue;
    }

    const targetPath = resolveSafeUploadPath(file.path);
    const data = Buffer.from(String(file.contentBase64), 'base64');

    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, data);

    restoredFiles += 1;
    restoredBytes += data.length;
  }

  return { restoredFiles, skippedFiles, restoredBytes };
};

router.use(requireRole(['ADMIN', 'MASTER']));
router.use((req, res, next) => {
  if (isGlobalBackupAdmin(req.user)) return next();
  return res.status(403).json({
    error: 'Backup completo restrito ao administrador global. Usuários de uma empresa não podem acessar dados de outros tenants.'
  });
});

router.get('/summary', async (_req, res) => {
  try {
    const [database, uploads, system] = await Promise.all([
      summarizeDatabaseTables(),
      collectUploads({ includeContents: false }),
      readSystemMetadata()
    ]);

    res.json({
      generatedAt: new Date().toISOString(),
      database: {
        tableCount: database.tables.length,
        totalRows: database.totalRows,
        tables: database.tables
      },
      uploads: {
        totalFiles: uploads.totalFiles,
        totalBytes: uploads.totalBytes
      },
      system: {
        prismaModelCount: system.prismaModels.length,
        prismaMigrationCount: system.prismaMigrations.length
      }
    });
  } catch (error) {
    console.error('Erro ao gerar resumo do backup:', error);
    res.status(500).json({ error: 'Erro ao gerar resumo do backup completo' });
  }
});

router.get('/export', async (req, res) => {
  try {
    req.setTimeout?.(0);
    res.setTimeout?.(0);

    const includeUploadContents = String(req.query.includeUploadContents || 'true') !== 'false';
    const generatedAt = new Date().toISOString();
    const [database, uploads, system] = await Promise.all([
      readDatabaseTables(),
      collectUploads({ includeContents: includeUploadContents }),
      readSystemMetadata()
    ]);

    const backup = {
      format: 'nexoscrm-full-system-backup',
      version: 1,
      generatedAt,
      generatedBy: {
        id: req.user?.id || req.user?.userId || null,
        name: req.user?.name || null,
        email: req.user?.email || null,
        role: req.user?.actualRole || req.user?.role || null
      },
      database: {
        provider: 'postgresql',
        schema: 'public',
        tableCount: database.tableNames.length,
        totalRows: database.totalRows,
        tables: database.tables
      },
      uploads,
      system,
      notes: [
        'Backup gerado pelo backend ativo do NexosCRM.',
        'Inclui todas as tabelas reais do schema public do PostgreSQL.',
        'Inclui manifesto dos uploads e conteúdo base64 quando dentro do limite BACKUP_MAX_UPLOAD_BYTES.'
      ]
    };

    const body = JSON.stringify(backup, jsonReplacer, 2);
    const filename = `nexoscrm-backup-completo-${generatedAt.slice(0, 19).replace(/[:T]/g, '-')}.json`;

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(body);
  } catch (error) {
    console.error('Erro ao exportar backup completo:', error);
    res.status(500).json({ error: 'Erro ao exportar backup completo do sistema' });
  }
});

router.post('/restore', async (req, res) => {
  try {
    req.setTimeout?.(0);
    res.setTimeout?.(0);

    const confirmation = String(req.headers['x-restore-confirmation'] || '').trim();
    if (confirmation !== 'RESTAURAR_BACKUP_COMPLETO') {
      return res.status(400).json({ error: 'Confirmação de restauração completa não informada' });
    }

    const backup = req.body;
    if (backup?.format !== 'nexoscrm-full-system-backup') {
      return res.status(400).json({ error: 'Arquivo não é um backup completo do NexosCRM' });
    }

    const backupTables = normalizeBackupTables(backup);
    const database = await restoreDatabase(backupTables);
    const uploads = await restoreUploads(backup.uploads);

    res.json({
      message: 'Backup completo restaurado com sucesso',
      restoredAt: new Date().toISOString(),
      restoredBy: {
        id: req.user?.id || req.user?.userId || null,
        name: req.user?.name || null,
        email: req.user?.email || null,
        role: req.user?.actualRole || req.user?.role || null
      },
      database,
      uploads
    });
  } catch (error) {
    console.error('Erro ao restaurar backup completo:', error);
    res.status(500).json({ error: error.message || 'Erro ao restaurar backup completo do sistema' });
  }
});

module.exports = router;
