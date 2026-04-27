/**
 * BLL Scraper - Web Scraping para BLL Compras
 * 
 * Este módulo usa Playwright para fazer scraping do portal BLL Compras
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
const BLL_BASE_URL = 'https://bllcompras.com';
const BLL_LOGIN_URL = `${BLL_BASE_URL}/login`;
const BLL_SEARCH_URL = `${BLL_BASE_URL}/licitacoes/buscar`;
const COOKIES_FILE = '/tmp/bll-cookies.json';
const SCREENSHOT_DIR = '/tmp/screenshots';

// Timeout padrão (30 segundos)
const DEFAULT_TIMEOUT = 30000;

/**
 * Inicializa o navegador Playwright
 * @param {boolean} headless - Modo headless (true em produção)
 * @returns {Promise<Browser>}
 */
async function initBrowser(headless = true) {
  console.log('[BLL Scraper] Inicializando navegador...');
  
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
    console.log('[BLL Scraper] Cookies salvos com sucesso');
  } catch (err) {
    console.error('[BLL Scraper] Erro ao salvar cookies:', err.message);
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
    console.log('[BLL Scraper] Cookies carregados com sucesso');
    return true;
  } catch (err) {
    console.log('[BLL Scraper] Nenhum cookie salvo encontrado');
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
    console.log(`[BLL Scraper] Screenshot salvo: ${filename}`);
    return filename;
  } catch (err) {
    console.error('[BLL Scraper] Erro ao tirar screenshot:', err.message);
    return null;
  }
}

/**
 * Realiza login no portal BLL
 * @param {Page} page - Página do Playwright
 * @param {string} email - Email de login
 * @param {string} password - Senha
 * @returns {Promise<boolean>} - True se login foi bem-sucedido
 */
async function login(page, email, password) {
  console.log('[BLL Scraper] Iniciando login...');
  
  try {
    // Navegar para página de login
    await page.goto(BLL_LOGIN_URL, { waitUntil: 'networkidle', timeout: DEFAULT_TIMEOUT });
    
    // Aguardar formulário de login
    await page.waitForSelector('input[name="email"], input[type="email"], #email', { timeout: 10000 });
    
    // Preencher email
    const emailSelector = await page.locator('input[name="email"], input[type="email"], #email').first();
    await emailSelector.fill(email);
    console.log('[BLL Scraper] Email preenchido');
    
    // Preencher senha
    const passwordSelector = await page.locator('input[name="password"], input[type="password"], #password').first();
    await passwordSelector.fill(password);
    console.log('[BLL Scraper] Senha preenchida');
    
    // Clicar no botão de login
    const loginButton = await page.locator('button[type="submit"], input[type="submit"], button:has-text("Entrar")').first();
    await loginButton.click();
    console.log('[BLL Scraper] Botão de login clicado');
    
    // Aguardar navegação ou erro
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // Verificar se login foi bem-sucedido
    const currentUrl = page.url();
    const hasError = await page.locator('.error, .alert-danger, [class*="error"]').count() > 0;
    
    if (hasError || currentUrl.includes('login')) {
      console.error('[BLL Scraper] Login falhou - credenciais inválidas');
      await takeScreenshot(page, 'login-failed');
      return false;
    }
    
    console.log('[BLL Scraper] Login bem-sucedido!');
    await saveCookies(page);
    return true;
    
  } catch (err) {
    console.error('[BLL Scraper] Erro durante login:', err.message);
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
    await page.goto(BLL_SEARCH_URL, { waitUntil: 'networkidle', timeout: 10000 });
    const isLoginPage = page.url().includes('login');
    return !isLoginPage;
  } catch {
    return false;
  }
}

/**
 * Busca editais no portal BLL
 * @param {Object} params - Parâmetros de busca
 * @param {string} params.email - Email de login
 * @param {string} params.password - Senha
 * @param {string} params.objeto - Palavra-chave de busca
 * @param {string} params.uf - UF para filtrar
 * @param {number} params.pagina - Número da página
 * @returns {Promise<Array>} - Lista de editais
 */
export async function scrapeBLL({ email, password, objeto = '', uf = '', pagina = 1 }) {
  let browser = null;
  let page = null;
  
  try {
    console.log('[BLL Scraper] Iniciando scraping...');
    
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
      console.log('[BLL Scraper] Sessão válida:', sessionValid);
    }
    
    // Fazer login se necessário
    if (!sessionValid) {
      const loginSuccess = await login(page, email, password);
      if (!loginSuccess) {
        throw new Error('Falha no login');
      }
    }
    
    // Navegar para página de busca
    console.log('[BLL Scraper] Navegando para página de busca...');
    await page.goto(BLL_SEARCH_URL, { waitUntil: 'networkidle', timeout: DEFAULT_TIMEOUT });
    
    // Preencher campo de busca
    if (objeto) {
      const searchInput = await page.locator('input[name="q"], input[name="search"], input[type="search"], #search').first();
      await searchInput.fill(objeto);
      console.log(`[BLL Scraper] Termo de busca preenchido: ${objeto}`);
    }
    
    // Filtrar por UF se especificado
    if (uf) {
      const ufSelect = await page.locator('select[name="uf"], #uf').first();
      if (await ufSelect.count() > 0) {
        await ufSelect.selectOption(uf);
        console.log(`[BLL Scraper] UF selecionada: ${uf}`);
      }
    }
    
    // Clicar no botão de busca
    const searchButton = await page.locator('button[type="submit"], button:has-text("Buscar"), input[type="submit"]').first();
    await searchButton.click();
    console.log('[BLL Scraper] Busca disparada');
    
    // Aguardar resultados
    await page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT });
    await page.waitForTimeout(2000); // Aguardar renderização
    
    // Extrair dados dos editais
    console.log('[BLL Scraper] Extraindo dados...');
    const editais = await page.evaluate(() => {
      const results = [];
      
      // Seletores comuns para cards de licitação
      const cards = document.querySelectorAll(
        '.licitacao-card, .edital-item, .resultado-item, [class*="licitacao"], [class*="edital"]'
      );
      
      cards.forEach((card, index) => {
        try {
          // Extrair título/objeto
          const tituloEl = card.querySelector('h3, h4, .titulo, .objeto, [class*="titulo"]');
          const titulo = tituloEl?.textContent?.trim() || '';
          
          // Extrair órgão
          const orgaoEl = card.querySelector('.orgao, .entidade, [class*="orgao"]');
          const orgao = orgaoEl?.textContent?.trim() || '';
          
          // Extrair modalidade
          const modalidadeEl = card.querySelector('.modalidade, [class*="modalidade"]');
          const modalidade = modalidadeEl?.textContent?.trim() || 'Pregão Eletrônico';
          
          // Extrair valor
          const valorEl = card.querySelector('.valor, [class*="valor"]');
          const valorText = valorEl?.textContent?.trim() || '';
          const valor = valorText ? parseFloat(valorText.replace(/[^\d,]/g, '').replace(',', '.')) : null;
          
          // Extrair data de abertura
          const dataEl = card.querySelector('.data-abertura, .data, [class*="data"]');
          const data = dataEl?.textContent?.trim() || '';
          
          // Extrair link
          const linkEl = card.querySelector('a[href*="licitacao"], a[href*="edital"]');
          const link = linkEl?.href || '';
          
          // Extrair número do edital
          const numeroEl = card.querySelector('.numero, [class*="numero"]');
          const numero = numeroEl?.textContent?.trim() || '';
          
          // Extrair UF
          const ufEl = card.querySelector('.uf, [class*="uf"]');
          const uf = ufEl?.textContent?.trim() || '';
          
          if (titulo || orgao) {
            results.push({
              titulo,
              orgao,
              modalidade,
              valor,
              dataAbertura: data,
              link,
              numero,
              uf,
              _index: index
            });
          }
        } catch (err) {
          console.error('Erro ao extrair card:', err);
        }
      });
      
      return results;
    });
    
    console.log(`[BLL Scraper] ${editais.length} editais extraídos`);
    
    // Normalizar dados para formato padrão
    const normalized = editais.map((item, index) => ({
      id: `bll-scraped-${Date.now()}-${index}`,
      objetoCompra: item.titulo,
      orgaoEntidade: { razaoSocial: item.orgao },
      modalidadeNome: item.modalidade,
      valorTotalEstimado: item.valor,
      dataAberturaProposta: item.dataAbertura,
      dataEncerramentoProposta: null,
      unidadeOrgao: { ufSigla: item.uf },
      linkSistemaOrigem: item.link.startsWith('http') ? item.link : `${BLL_BASE_URL}${item.link}`,
      fonte: 'BLL',
      numeroCompra: item.numero,
      _scraped: true
    }));
    
    return normalized;
    
  } catch (err) {
    console.error('[BLL Scraper] Erro:', err.message);
    if (page) {
      await takeScreenshot(page, 'error');
    }
    throw err;
  } finally {
    if (browser) {
      await browser.close();
      console.log('[BLL Scraper] Navegador fechado');
    }
  }
}

/**
 * Limpa cookies salvos (útil para forçar novo login)
 */
export async function clearCookies() {
  try {
    await fs.unlink(COOKIES_FILE);
    console.log('[BLL Scraper] Cookies removidos');
    return true;
  } catch {
    return false;
  }
}
