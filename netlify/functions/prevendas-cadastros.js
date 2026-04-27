import crypto from 'crypto';

import getPrisma from './lib/prisma.js';
import { success, error, handleCORS } from './lib/response.js';
import { authenticateUser } from './lib/auth.js';
import { canAccessModule, isMaster } from './lib/permissions.js';

const SETTINGS_KEY = 'pre_sales_registry_v1';

const ENTITY_KIND = {
  distribuidores: 'distribuidores',
  fornecedores: 'fornecedores',
  oportunidades: 'oportunidades'
};

const toString = (value, fallback = '') => {
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
};

const toNumberOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toDateOrNull = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const toStringArray = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => String(entry || '').trim())
    .filter(Boolean);
};

const ensureStoreShape = (raw) => {
  const base = {
    version: 1,
    distribuidores: [],
    fornecedores: [],
    oportunidades: [],
    updatedAt: null,
    updatedBy: null
  };

  if (!raw || typeof raw !== 'object') return base;

  return {
    ...base,
    ...raw,
    distribuidores: Array.isArray(raw.distribuidores) ? raw.distribuidores : [],
    fornecedores: Array.isArray(raw.fornecedores) ? raw.fornecedores : [],
    oportunidades: Array.isArray(raw.oportunidades) ? raw.oportunidades : []
  };
};

const normalizeBasePartner = (input = {}, preserve = {}) => {
  const now = new Date().toISOString();
  return {
    id: toString(input.id || preserve.id) || crypto.randomUUID(),
    nome: toString(input.nome, preserve.nome || ''),
    razaoSocial: toString(input.razaoSocial, preserve.razaoSocial || ''),
    cnpj: toString(input.cnpj, preserve.cnpj || ''),
    contato: toString(input.contato, preserve.contato || ''),
    email: toString(input.email, preserve.email || ''),
    telefone: toString(input.telefone, preserve.telefone || ''),
    cidade: toString(input.cidade, preserve.cidade || ''),
    estado: toString(input.estado, preserve.estado || ''),
    site: toString(input.site, preserve.site || ''),
    categorias: toStringArray(input.categorias ?? preserve.categorias),
    status: toString(input.status, preserve.status || 'ATIVO').toUpperCase() || 'ATIVO',
    observacoes: toString(input.observacoes, preserve.observacoes || ''),
    createdAt: toDateOrNull(input.createdAt || preserve.createdAt) || now,
    updatedAt: now
  };
};

const normalizeOpportunityRegistry = (input = {}, preserve = {}) => {
  const now = new Date().toISOString();
  return {
    id: toString(input.id || preserve.id) || crypto.randomUUID(),
    oportunidadeId: toString(input.oportunidadeId, preserve.oportunidadeId || ''),
    titulo: toString(input.titulo, preserve.titulo || ''),
    cliente: toString(input.cliente, preserve.cliente || ''),
    origem: toString(input.origem, preserve.origem || 'B2B').toUpperCase() || 'B2B',
    modalidade: toString(input.modalidade, preserve.modalidade || 'VENDA').toUpperCase() || 'VENDA',
    valorEstimado: toNumberOrNull(input.valorEstimado ?? preserve.valorEstimado),
    prazo: toDateOrNull(input.prazo || preserve.prazo),
    status: toString(input.status, preserve.status || 'ABERTA').toUpperCase() || 'ABERTA',
    prioridade: toString(input.prioridade, preserve.prioridade || 'MEDIUM').toUpperCase() || 'MEDIUM',
    distribuidorIds: toStringArray(input.distribuidorIds ?? preserve.distribuidorIds),
    fornecedorIds: toStringArray(input.fornecedorIds ?? preserve.fornecedorIds),
    observacoes: toString(input.observacoes, preserve.observacoes || ''),
    createdById: toString(input.createdById, preserve.createdById || ''),
    createdByName: toString(input.createdByName, preserve.createdByName || ''),
    createdAt: toDateOrNull(input.createdAt || preserve.createdAt) || now,
    updatedAt: now
  };
};

const normalizeStore = (store) => {
  const data = ensureStoreShape(store);

  return {
    ...data,
    distribuidores: data.distribuidores.map((item) => normalizeBasePartner(item)),
    fornecedores: data.fornecedores.map((item) => normalizeBasePartner(item)),
    oportunidades: data.oportunidades.map((item) => normalizeOpportunityRegistry(item))
  };
};

const readStore = async (prisma) => {
  const row = await prisma.systemSetting.findUnique({
    where: { key: SETTINGS_KEY },
    select: { value: true }
  });

  if (!row?.value) return ensureStoreShape(null);

  try {
    const parsed = JSON.parse(row.value);
    return normalizeStore(parsed);
  } catch {
    return ensureStoreShape(null);
  }
};

const persistStore = async (prisma, store, user) => {
  const payload = {
    ...normalizeStore(store),
    updatedAt: new Date().toISOString(),
    updatedBy: {
      id: user.id,
      name: user.name,
      email: user.email
    }
  };

  await prisma.systemSetting.upsert({
    where: { key: SETTINGS_KEY },
    update: {
      value: JSON.stringify(payload)
    },
    create: {
      key: SETTINGS_KEY,
      value: JSON.stringify(payload)
    }
  });

  return payload;
};

const parsePath = (path) => {
  return String(path || '')
    .split('?')[0]
    .replace('/.netlify/functions/prevendas-cadastros', '')
    .replace('/api/prevendas-cadastros', '')
    .split('/')
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment));
};

const inferKind = (segment) => {
  const token = toString(segment).toLowerCase();
  if (token.startsWith('distrib')) return ENTITY_KIND.distribuidores;
  if (token.startsWith('fornec')) return ENTITY_KIND.fornecedores;
  if (token.startsWith('oportun')) return ENTITY_KIND.oportunidades;
  return null;
};

const ensurePreSalesAccess = (user) => {
  if (isMaster(user)) return true;
  if (!canAccessModule(user, 'PRE_SALES')) {
    throw new Error('Acesso negado ao módulo de Pré-Vendas');
  }
  return true;
};

const normalizeByKind = (kind, payload, current, user) => {
  if (kind === ENTITY_KIND.oportunidades) {
    return normalizeOpportunityRegistry(
      {
        ...payload,
        createdById: payload.createdById || current?.createdById || user.id,
        createdByName: payload.createdByName || current?.createdByName || user.name
      },
      current
    );
  }

  return normalizeBasePartner(payload, current);
};

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return handleCORS();

  const prisma = getPrisma();
  const method = event.httpMethod;
  const segments = parsePath(event.path);
  const kind = inferKind(segments[0]);
  const entityId = segments[1] ? toString(segments[1]) : null;

  try {
    const user = await authenticateUser(event.headers || {});
    ensurePreSalesAccess(user);

    if (method === 'GET') {
      const store = await readStore(prisma);

      if (!kind) return success(store);

      const list = store[kind] || [];
      if (!entityId) return success({ [kind]: list, total: list.length });

      const found = list.find((item) => item.id === entityId);
      if (!found) return error('Registro não encontrado', 404);
      return success(found);
    }

    const body = JSON.parse(event.body || '{}');

    if (!kind) {
      return error('Tipo de cadastro inválido. Use /distribuidores, /fornecedores ou /oportunidades', 400);
    }

    if (method === 'POST') {
      const store = await readStore(prisma);
      const created = normalizeByKind(kind, body, null, user);

      if (!created.nome && kind !== ENTITY_KIND.oportunidades) {
        return error('Nome é obrigatório', 400);
      }

      if (!created.titulo && kind === ENTITY_KIND.oportunidades) {
        return error('Título da oportunidade é obrigatório', 400);
      }

      store[kind] = [created, ...(store[kind] || [])];
      const saved = await persistStore(prisma, store, user);
      return success({ item: created, total: saved[kind].length }, 201);
    }

    if (method === 'PUT') {
      if (!entityId) return error('ID do registro não informado', 400);

      const store = await readStore(prisma);
      const list = store[kind] || [];
      const index = list.findIndex((item) => item.id === entityId);
      if (index < 0) return error('Registro não encontrado', 404);

      const updated = normalizeByKind(kind, { ...body, id: entityId }, list[index], user);

      if (!updated.nome && kind !== ENTITY_KIND.oportunidades) {
        return error('Nome é obrigatório', 400);
      }

      if (!updated.titulo && kind === ENTITY_KIND.oportunidades) {
        return error('Título da oportunidade é obrigatório', 400);
      }

      list[index] = updated;
      store[kind] = list;

      await persistStore(prisma, store, user);
      return success({ item: updated });
    }

    if (method === 'DELETE') {
      if (!entityId) return error('ID do registro não informado', 400);

      const store = await readStore(prisma);
      const list = store[kind] || [];
      const before = list.length;
      store[kind] = list.filter((item) => item.id !== entityId);

      if (store[kind].length === before) {
        return error('Registro não encontrado', 404);
      }

      if (kind !== ENTITY_KIND.oportunidades) {
        const refField = kind === ENTITY_KIND.distribuidores ? 'distribuidorIds' : 'fornecedorIds';
        store.oportunidades = (store.oportunidades || []).map((item) => ({
          ...item,
          [refField]: toStringArray(item?.[refField]).filter((id) => id !== entityId)
        }));
      }

      const saved = await persistStore(prisma, store, user);
      return success({ removed: true, total: saved[kind].length });
    }

    return error('Método não permitido', 405);
  } catch (err) {
    if (String(err?.message || '').includes('Acesso negado')) {
      return error(err.message, 403);
    }

    console.error('Erro em prevendas-cadastros:', err);
    return error(err.message || 'Erro interno do servidor', 500);
  }
}
