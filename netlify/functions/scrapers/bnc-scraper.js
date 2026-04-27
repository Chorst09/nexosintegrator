/**
 * BNC Scraper - Web Scraping para BNC Compras
 * 
 * Este módulo usa Playwright para fazer scraping do portal BNC Compras
 * quando a API não está disponível ou não retorna resultados.
 * 
 * Funcionalidades:
 * - Login com credenciais
 * - Gestão de sessão (cookies salvos)
 * - Busca de editais com filtros
 * - Extração estruturada de dados
 * - Tratamento de erros e screenshots para debug
 */

import { chromium } from 'playwright-core';
import chromium_pkg from '@sparticuz/chromium';
import fs from 'fs/promises';
import path from 'path';

const { default: chromiumPkg } = chromium_pkg;

// Configurações
const BNC_BASE_URL = 'https://bnccompras.com';
const BNC_LOGIN_URL = `${BNC_BASE_URL}/login`;
const BNC_SEARCH_URL = `${BNC_BASE_URL}/licitacoes`;
const COOKIES_FILE = '/tmp/bnc-cookies.json';
const SCREENSHOT_DIR = '/tmp/screenshots';

// Timeout padrão (30 segundos)
const DEFAULT_TIMEOUT = 30000;

/**
 * Inicializa o navegador Playwright
 * @param {boolean} headless - Modo headless (true em produção)
 * @returns {Promise<Browser>}
 */
async function initBrowser(headless = true) {
  console.log('[BNC Scraper] Inicializando navegador...');
  
  const browser = await chromium.launch({
    args: chromiumPkg.args,
    defaultViewport: chromiumPkg.defaultViewport,
    executablePath: await chromiumPkg.executablePath(),
    headless: headless ? chromiumPkg.headless : false,
    ignoreHTTPSErrors: true
  });

  return browser;
}

/**
 * Salva cookies da sessão em arquivo
 * @param {Page} page - Página do Playwright
 */
async function saveCookies(page) {
  try {
    const cookies = await page.context().cookies();
    await fs.mkdir(path.dirname(COOKIES_FILE), { recursive: true });
    await fs.writeFile(COOKIES_FILE, JSON.stringify(cookies, null, 2));
    console.log('[BNC Scraper] Cookies salvos com sucesso');
  } catch (err) {
    console.error('[BNC Scraper] Erro ao salvar cookies:', err.message);
  }
}

/**
 * Carrega cookies salvos
 * @param {BrowserContext} context - Contexto do navegador
 * @returns {Promise<boolean>} - True se cookies foram carregados
 */
async function loadCookies(context) {
  try {
    const cookiesData = await fs.readFile(COOKIES_FILE, 'utf-8');
    const cookies = JSON.parse(cookiesData);
    await context.addCookies(cookies);
    console.log('[BNC Scraper] Cookies carregados com sucesso');
    return true;
  } catch (err) {
    console.log('[BNC Scraper] Nenhum cookie salvo encontrado');
    return false;
  }
}

/**
 * Tira screenshot para debug
 * @param {Page} page - Página do Playwright
 * @param {string} name - Nome do arquivo
 */
async function takeScreenshot(page, name) {
  try {
    await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
    const filename = path.join(SCREENSHOT_DIR, `${name}-${Date.now()}.png`);
    await page.screenshot({ path: filename, fullPage: true });
    console.log(`[BNC Scraper] Screenshot salvo: ${filename}`);
    return filename;
  } catch (err) {
    console.error('[BNC Scraper] Erro ao tirar screenshot:', err.message);
    return null;
  }
}

/**
 * Realiza login no portal BNC
 * @param {Page} page - Página do Playwright
 * @param {string} email - Email de login
 * @param {string} password - Senha
 * @returns {Promise<boolean>} - True se login foi bem-sucedido
 */
async function login(page, email, password) {
  console.log('[BNC Scraper] Iniciando login...');
  
  try {
    // Navegar para página de login
    await page.goto(BNC_LOGIN_URL, { waitUntil: 'networkidle', timeout: DEFAULT_TIMEOUT });
    
    // Aguardar formulário de login
    await page.waitForSelector('input[name="email"], input[type="email"], #email, #username', { timeout: 10000 });
    
    // Preencher email/username
    const emailSelector = await page.locator('input[name="email"], input[type="email"], #email, #username').first();
    await emailSelector.fill(email);
    console.log('[BNC Scraper] Email preenchido');
    
    // Preencher senha
    const passwordSelector = await page.locator('input[name="password"], input[type="password"], #password, #senha').first();
    await passwordSelector.fill(password);
    console.log('[BNC Scraper] Senha preenchida');
    
    // Clicar no botão de login
    const loginButton = await page.locator('button[type="submit"], input[type="submit"], button:has-text("Entrar"), button:has-text("Login")').first();
    await loginButton.click();
    console.log('[BNC Scraper] Botão de login clicado');
    
    // Aguardar navegação ou erro
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // Verificar se login foi bem-sucedido
    const currentUrl = page.url();
    const hasError = await page.locator('.error, .alert-danger, .alert-error, [class*="error"]').count() > 0;
    
    if (hasError || currentUrl.includes('login')) {
      console.error('[BNC Scraper] Login falhou - credenciais inválidas');
      await takeScreenshot(page, 'login-failed');
      return false;
    }
    
    console.log('[BNC Scraper] Login bem-sucedido!');
    await saveCookies(page);
    return true;
    
  } catch (err) {
    console.error('[BNC Scraper] Erro durante login:', err.message);
    await takeScreenshot(page, 'login-error');
    return false;
  }
}

/**
 * Verifica se a sessão ainda está válida
 * @param {Page} page - Página do Playwright
 * @returns {Promise<boolean>}
 */
async function isSessionValid(page) {
  try {
    await page.goto(BNC_SEARCH_URL, { waitUntil: 'networkidle', timeout: 10000 });
    const isLoginPage = page.url().includes('login');
    return !isLoginPage;
  } catch {
    return false;
  }
}

/**
 * Busca editais no portal BNC
 * @param {Object} params - Parâmetros de busca
 * @param {string} params.email - Email de login
 * @param {string} params.password - Senha
 * @param {string} params.objeto - Palavra-chave de busca
 * @param {string} params.uf - UF para filtrar
 * @param {number} params.pagina - Número da página
 * @returns {Promise<Array>} - Lista de editais
 */
export async function scrapeBNC({ email, password, objeto = '', uf = '', pagina = 1 }) {
  let browser = null;
  let page = null;
  
  try {
    console.log('[BNC Scraper] Iniciando scraping...');
    
    // Inicializar navegador
    browser = await initBrowser(process.env.NODE_ENV === 'production');
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    page = await context.newPage();
    
    // Tentar carregar cookies salvos
    const hasCookies = await loadCookies(context);
    
    // Verificar se sessão é válida
    let sessionValid = false;
    if (hasCookies) {
      sessionValid = await isSessionValid(page);
      console.log('[BNC Scraper] Sessão válida:', sessionValid);
    }
    
    // Fazer login se necessário
    if (!sessionValid) {
      const loginSuccess = await login(page, email, password);
      if (!loginSuccess) {
        throw new Error('Falha no login');
      }
    }
    
    // Navegar para página de busca
    console.log('[BNC Scraper] Navegando para página de busca...');
    await page.goto(BNC_SEARCH_URL, { waitUntil: 'networkidle', timeout: DEFAULT_TIMEOUT });
    
    // Preencher campo de busca
    if (objeto) {
      const searchInput = await page.locator('input[name="q"], input[name="search"], input[name="palavra"], input[type="search"], #search, #busca').first();
      await searchInput.fill(objeto);
      console.log(`[BNC Scraper] Termo de busca preenchido: ${objeto}`);
    }
    
    // Filtrar por UF se especificado
    if (uf) {
      const ufSelect = await page.locator('select[name="uf"], select[name="estado"], #uf, #estado').first();
      if (await ufSelect.count() > 0) {
        await ufSelect.selectOption(uf);
        console.log(`[BNC Scraper] UF selecionada: ${uf}`);
      }
    }
    
    // Clicar no botão de busca
    const searchButton = await page.locator('button[type="submit"], button:has-text("Buscar"), button:has-text("Pesquisar"), input[type="submit"]').first();
    await searchButton.click();
    console.log('[BNC Scraper] Busca disparada');
    
    // Aguardar resultados
    await page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT });
    await page.waitForTimeout(2000); // Aguardar renderização
    
    // Extrair dados dos editais
    console.log('[BNC Scraper] Extraindo dados...');
    const editais = await page.evaluate(() => {
      const results = [];
      
      // Seletores comuns para cards/linhas de licitação
      const items = document.querySelectorAll(
        '.licitacao-item, .edital-card, .resultado-item, .licitacao, .edital, ' +
        'tr[class*="licitacao"], tr[class*="edital"], ' +
        '[data-licitacao], [data-edital], ' +
        '.card-licitacao, .item-licitacao'
      );
      
      items.forEach((item, index) => {
        try {
          // Extrair título/objeto
          const tituloEl = item.querySelector(
            'h3, h4, h5, .titulo, .objeto, .descricao, ' +
            '[class*="titulo"], [class*="objeto"], [class*="descricao"], ' +
            'td:nth-child(2), .col-objeto'
          );
          const titulo = tituloEl?.textContent?.trim() || '';
          
          // Extrair órgão
          const orgaoEl = item.querySelector(
            '.orgao, .entidade, .cliente, [class*="orgao"], [class*="entidade"], ' +
            'td:nth-child(3), .col-orgao'
          );
          const orgao = orgaoEl?.textContent?.trim() || '';
          
          // Extrair modalidade
          const modalidadeEl = item.querySelector(
            '.modalidade, .tipo, [class*="modalidade"], [class*="tipo"], ' +
            'td:nth-child(4), .col-modalidade'
          );
          const modalidade = modalidadeEl?.textContent?.trim() || 'Pregão Eletrônico';
          
          // Extrair valor
          const valorEl = item.querySelector(
            '.valor, .preco, [class*="valor"], [class*="preco"], ' +
            'td:nth-child(5), .col-valor'
          );
          const valorText = valorEl?.textContent?.trim() || '';
          const valor = valorText ? parseFloat(valorText.replace(/[^\d,]/g, '').replace(',', '.')) : null;
          
          // Extrair data de abertura
          const dataEl = item.querySelector(
            '.data-abertura, .data, .abertura, [class*="data"], ' +
            'td:nth-child(6), .col-data'
          );
          const data = dataEl?.textContent?.trim() || '';
          
          // Extrair link
          const linkEl = item.querySelector(
            'a[href*="licitacao"], a[href*="edital"], a[href*="detalhe"], ' +
            'a.btn-detalhes, a.ver-mais'
          );
          const link = linkEl?.href || '';
          
          // Extrair número do edital
          const numeroEl = item.querySelector(
            '.numero, .codigo, [class*="numero"], [class*="codigo"], ' +
            'td:first-child, .col-numero'
          );
          const numero = numeroEl?.textContent?.trim() || '';
          
          // Extrair UF
          const ufEl = item.querySelector(
            '.uf, .estado, [class*="uf"], [class*="estado"], ' +
            '.col-uf'
          );
          const uf = ufEl?.textContent?.trim() || '';
          
          // Extrair status
          const statusEl = item.querySelector(
            '.status, .situacao, [class*="status"], [class*="situacao"]'
          );
          const status = statusEl?.textContent?.trim() || 'Aberto';
          
          if (titulo || orgao || numero) {
            results.push({
              titulo,
              orgao,
              modalidade,
              valor,
              dataAbertura: data,
              link,
              numero,
              uf,
              status,
              _index: index
            });
          }
        } catch (err) {
          console.error('Erro ao extrair item:', err);
        }
      });
      
      return results;
    });
    
    console.log(`[BNC Scraper] ${editais.length} editais extraídos`);
    
    // Normalizar dados para formato padrão
    const normalized = editais.map((item, index) => ({
      id: `bnc-scraped-${Date.now()}-${index}`,
      objetoCompra: item.titulo,
      orgaoEntidade: { razaoSocial: item.orgao },
      modalidadeNome: item.modalidade,
      valorTotalEstimado: item.valor,
      dataAberturaProposta: item.dataAbertura,
      dataEncerramentoProposta: null,
      unidadeOrgao: { ufSigla: item.uf },
      linkSistemaOrigem: item.link.startsWith('http') ? item.link : `${BNC_BASE_URL}${item.link}`,
      fonte: 'BNC',
      numeroCompra: item.numero,
      status: item.status,
      _scraped: true
    }));
    
    return normalized;
    
  } catch (err) {
    console.error('[BNC Scraper] Erro:', err.message);
    if (page) {
      await takeScreenshot(page, 'error');
    }
    throw err;
  } finally {
    if (browser) {
      await browser.close();
      console.log('[BNC Scraper] Navegador fechado');
    }
  }
}

/**
 * Limpa cookies salvos (útil para forçar novo login)
 */
export async function clearCookies() {
  try {
    await fs.unlink(COOKIES_FILE);
    console.log('[BNC Scraper] Cookies removidos');
    return true;
  } catch {
    return false;
  }
}
