/**
 * Scrapers Manager - Gerenciador Unificado de Scrapers
 * 
 * Este módulo gerencia todos os scrapers de portais de licitação,
 * fornecendo uma interface unificada para busca em múltiplas fontes.
 * 
 * Portais suportados:
 * - BLL Compras (bllcompras.com)
 * - BNC Compras (bnccompras.com)
 * - ConLicitacao (consulteonline.conlicitacao.com.br)
 */

import { scrapeBLL } from './bll-scraper.js';
import { scrapeBNC } from './bnc-scraper.js';
import { scrapeConLicitacao } from './conlicitacao-scraper.js';

/**
 * Configuração de credenciais por portal
 * Prioridade: headers > env > default
 */
function getCredentials(portal, headers = {}) {
  const portalUpper = portal.toUpperCase();
  
  return {
    email: headers[`x-${portal}-email`] || 
           process.env[`${portalUpper}_EMAIL`] || 
           process.env.SCRAPER_EMAIL || 
           '',
    password: headers[`x-${portal}-password`] || 
              process.env[`${portalUpper}_PASSWORD`] || 
              process.env.SCRAPER_PASSWORD || 
              ''
  };
}

/**
 * Busca em um portal específico
 * @param {string} portal - Nome do portal (bll, bnc, conlicitacao)
 * @param {Object} params - Parâmetros de busca
 * @returns {Promise<Array>} - Lista de editais
 */
export async function scrapePortal(portal, params) {
  const { headers = {}, objeto = '', uf = '', pagina = 1 } = params;
  const credentials = getCredentials(portal, headers);
  
  if (!credentials.email || !credentials.password) {
    console.warn(`[Scrapers] Credenciais não configuradas para ${portal}`);
    return [];
  }
  
  const searchParams = {
    email: credentials.email,
    password: credentials.password,
    objeto,
    uf,
    pagina
  };
  
  try {
    switch (portal.toLowerCase()) {
      case 'bll':
        return await scrapeBLL(searchParams);
      
      case 'bnc':
        return await scrapeBNC(searchParams);
      
      case 'conlicitacao':
        return await scrapeConLicitacao(searchParams);
      
      default:
        console.error(`[Scrapers] Portal desconhecido: ${portal}`);
        return [];
    }
  } catch (err) {
    console.error(`[Scrapers] Erro ao buscar em ${portal}:`, err.message);
    return [];
  }
}

/**
 * Busca em múltiplos portais em paralelo
 * @param {Array<string>} portals - Lista de portais para buscar
 * @param {Object} params - Parâmetros de busca
 * @returns {Promise<Object>} - Resultados por portal
 */
export async function scrapeMultiplePortals(portals, params) {
  console.log(`[Scrapers] Buscando em ${portals.length} portais:`, portals.join(', '));
  
  const results = await Promise.allSettled(
    portals.map(portal => scrapePortal(portal, params))
  );
  
  const data = {};
  portals.forEach((portal, index) => {
    const result = results[index];
    data[portal] = result.status === 'fulfilled' ? result.value : [];
  });
  
  return data;
}

/**
 * Busca em todos os portais disponíveis
 * @param {Object} params - Parâmetros de busca
 * @returns {Promise<Array>} - Lista combinada de editais
 */
export async function scrapeAllPortals(params) {
  const portals = ['bll', 'bnc', 'conlicitacao'];
  const results = await scrapeMultiplePortals(portals, params);
  
  // Combinar todos os resultados
  const combined = Object.values(results).flat();
  
  // Deduplica por número do edital ou título
  const unique = [];
  const seen = new Set();
  
  for (const item of combined) {
    const key = item.numeroCompra || item.objetoCompra || item.id;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }
  
  console.log(`[Scrapers] Total de editais únicos: ${unique.length}`);
  return unique;
}

/**
 * Verifica quais portais têm credenciais configuradas
 * @param {Object} headers - Headers HTTP com credenciais
 * @returns {Object} - Status de configuração por portal
 */
export function checkCredentials(headers = {}) {
  const portals = ['bll', 'bnc', 'conlicitacao'];
  const status = {};
  
  portals.forEach(portal => {
    const creds = getCredentials(portal, headers);
    status[portal] = {
      configured: Boolean(creds.email && creds.password),
      source: creds.email ? (
        headers[`x-${portal}-email`] ? 'headers' :
        process.env[`${portal.toUpperCase()}_EMAIL`] ? 'env-specific' :
        'env-default'
      ) : 'none'
    };
  });
  
  return status;
}

export default {
  scrapePortal,
  scrapeMultiplePortals,
  scrapeAllPortals,
  checkCredentials
};
