import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings, FileText, AlertTriangle, CheckCircle, Play, Loader2,
  Code, ChevronRight, Layers, Upload, FileCheck, Trash2,
  Search, History, LayoutDashboard, ArrowLeft,
  Save, Zap, Calendar, Building2, Globe, FileSearch, ListChecks, ShieldAlert, Clock, Info
} from 'lucide-react';
import { buildApiUrl, getAuthHeaders } from '../config/api';

const API_KEYS = {
  gemini: 'AIzaSyBxDlaZFzQ-4xmXzqZ36sDLtcVIRXe9HPk',
  groq: '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',
  mistral: 'Vjx0JiXn3teksaferkwlKkyDYuiZ4Lne'
};

const GEMINI_MODEL = 'gemini-2.5-flash';

const toText = (value) => {
  if (typeof value === 'string') return value.trim();
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const toTextArray = (value) => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => toText(item)).filter(Boolean);
};

const toSafeFileName = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'resumo-edital-tr';

const extractDateFromText = (value) => {
  const text = toText(value);
  const match = text.match(/\b(\d{2}\/\d{2}\/\d{4})\b/);
  return match?.[1] || '';
};

const extractTimeFromText = (value) => {
  const text = toText(value);
  const match = text.match(/\b(\d{1,2}:\d{2})\b/);
  return match?.[1] || '';
};

const toIsoDate = (value) => {
  const text = toText(value);
  if (!text) return null;

  const br = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}T00:00:00.000Z`;

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

const resolveSavedAnalysisScope = () => {
  try {
    const rawUser = localStorage.getItem('user');
    const user = rawUser ? JSON.parse(rawUser) : {};
    const userId = String(user?.id || user?.userId || '').trim();
    if (!userId) return null;

    const companyId = String(
      localStorage.getItem('companyId') ||
        localStorage.getItem('selectedCompanyId') ||
        localStorage.getItem('tenantId') ||
        'crm-b2g-default'
    ).trim();

    const roleRaw = String(user?.role || '').toUpperCase();
    const userRole =
      roleRaw === 'ADMIN' || roleRaw === 'DIRECTOR' || roleRaw === 'MANAGER' ? 'admin' : 'user';

    return {
      companyId: companyId || 'crm-b2g-default',
      userId,
      userRole
    };
  } catch (_error) {
    return null;
  }
};

const normalizeItems = (items) => {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      const row = item && typeof item === 'object' ? item : {};
      const name = toText(row.item || row.name || row.nome);
      const quantity = toText(row.qtd || row.quantity || row.quantidade);
      const specs = toText(row.desc || row.specs || row.especificacoes);
      if (!name && !quantity && !specs) return null;
      return {
        name: name || 'Não identificado',
        quantity: quantity || 'Não identificado',
        specs: specs || 'Não identificado'
      };
    })
    .filter(Boolean);
};

const normalizeRisks = (risks) => {
  if (!Array.isArray(risks)) return [];
  return risks
    .map((risk) => {
      if (typeof risk === 'string') return risk.trim();
      if (!risk || typeof risk !== 'object') return '';
      const title = toText(risk.titulo || risk.title);
      const description = toText(risk.descricao || risk.description);
      const severity = toText(risk.severidade || risk.severity);
      if (!title && !description) return '';
      const severityText = severity ? ` (${severity})` : '';
      return `${title || 'Risco identificado'}${severityText}: ${description || 'Não identificado'}`.trim();
    })
    .filter(Boolean);
};

const normalizeEditalResult = (result) => {
  const data = result && typeof result === 'object' ? result : {};
  const identificacao = data.identificacao && typeof data.identificacao === 'object' ? data.identificacao : {};
  const prazos = Array.isArray(data.prazos) ? data.prazos : [];
  const exigencias = Array.isArray(data.exigencias) ? data.exigencias : [];
  const openingDate = extractDateFromText(identificacao.data_sessao);
  const openingTime = extractTimeFromText(identificacao.data_sessao);

  const deadlines = {
    publicationDate: 'Não identificado',
    impugnationDeadline: 'Não identificado',
    clarificationDeadline: 'Não identificado',
    proposalDeadline: 'Não identificado',
    contractTerm: 'Não identificado'
  };

  prazos.forEach((prazo) => {
    const titulo = toText(prazo?.titulo).toLowerCase();
    const descricao = toText(prazo?.descricao) || toText(prazo?.titulo);
    if (!descricao) return;

    if (titulo.includes('public')) deadlines.publicationDate = descricao;
    else if (titulo.includes('impugn')) deadlines.impugnationDeadline = descricao;
    else if (titulo.includes('esclarec')) deadlines.clarificationDeadline = descricao;
    else if (titulo.includes('proposta') || titulo.includes('sess') || titulo.includes('abertura')) deadlines.proposalDeadline = descricao;
    else if (titulo.includes('contrat') || titulo.includes('vig') || titulo.includes('execu')) deadlines.contractTerm = descricao;
  });

  const requirements = {
    legal: [],
    technical: [],
    economic: [],
    fiscal: []
  };

  exigencias.forEach((item) => {
    const categoria = toText(item?.categoria).toLowerCase();
    const requisito = toText(item?.requisito || item?.desc || item?.item);
    if (!requisito) return;

    if (categoria.includes('jur') || categoria.includes('legal')) requirements.legal.push(requisito);
    else if (categoria.includes('econ') || categoria.includes('finan') || categoria.includes('balan')) requirements.economic.push(requisito);
    else if (categoria.includes('fiscal') || categoria.includes('tribut')) requirements.fiscal.push(requisito);
    else requirements.technical.push(requisito);
  });

  return {
    analysisType: 'edital',
    general: {
      openingDate: openingDate || 'Não identificado',
      openingTime: openingTime || 'Não identificado',
      portal: toText(identificacao.portal) || 'Não identificado',
      agency: toText(identificacao.orgao) || 'Não identificado',
      modality: toText(identificacao.modalidade) || 'Não identificado',
      objectSummary: toText(identificacao.objeto) || 'Não identificado'
    },
    deadlines,
    requirements,
    items: normalizeItems(data.itens_tr),
    risks: normalizeRisks(data.riscos),
    legacy: data
  };
};

const normalizeTrResult = (result) => {
  const data = result && typeof result === 'object' ? result : {};
  const identificacao = data.identificacao && typeof data.identificacao === 'object' ? data.identificacao : {};
  const normalizedItems = normalizeItems(data.itens_tr);
  const risks = normalizeRisks(data.riscos);
  const trSummary =
    toText(data.resumo_especificacoes) ||
    toText(identificacao.objeto) ||
    'Não identificado';
  const termRequirements = normalizedItems
    .map((item) => toText(item.specs) || toText(item.name))
    .filter(Boolean);
  const technicalNotebook = termRequirements.slice(0, 10).map((termRequirement) => ({
    termRequirement,
    meetsRequirement: 'NAO_ATENDE',
    datasheetEvidence: `TR exige ${termRequirement}. Modelo possui Não identificado`,
    rationale: 'Comparação técnica detalhada indisponível neste fluxo sem modelo/datasheet.'
  }));
  while (technicalNotebook.length < 5) {
    technicalNotebook.push({
      termRequirement: `Requisito técnico ${technicalNotebook.length + 1} não identificado`,
      meetsRequirement: 'NAO_ATENDE',
      datasheetEvidence: 'TR exige requisito técnico. Modelo possui Não identificado',
      rationale: 'Documento analisado não trouxe requisito técnico estruturado para este item.'
    });
  }

  return {
    analysisType: 'tr',
    trSummary,
    analyzedModel: {
      modelName: 'Não identificado',
      manufacturer: 'Não identificado',
      providedSpecs: 'Não identificado'
    },
    termRequirements,
    technicalNotebook,
    compliantEquipment: [],
    complianceOverview: {
      totalRequirements: technicalNotebook.length,
      metRequirements: technicalNotebook.filter((row) => row.meetsRequirement === 'ATENDE').length,
      fullCompliance: false
    },
    general: {
      openingDate: 'Não identificado',
      openingTime: 'Não identificado',
      portal: 'Não identificado',
      agency: toText(identificacao.orgao) || 'Não identificado',
      modality: 'Não identificado',
      objectSummary: toText(identificacao.objeto) || trSummary
    },
    deadlines: {
      publicationDate: 'Não identificado',
      impugnationDeadline: 'Não identificado',
      clarificationDeadline: 'Não identificado',
      proposalDeadline: 'Não identificado',
      contractTerm: 'Não identificado'
    },
    requirements: {
      legal: [],
      technical: [],
      economic: [],
      fiscal: []
    },
    items: normalizedItems,
    risks,
    legacy: data
  };
};

const normalizeResultForPersistence = (result, mode) =>
  mode === 'tr' ? normalizeTrResult(result) : normalizeEditalResult(result);

const B2GAnaliseEditaisTR = () => {
  const navigate = useNavigate();
  const [view, setView] = useState('dashboard');
  const [modoAnalise, setModoAnalise] = useState('edital');
  const [editalText, setEditalText] = useState('');
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [result, setResult] = useState(null);
  const [normalizedResult, setNormalizedResult] = useState(null);
  const [activeTab, setActiveTab] = useState('geral');
  const [savingToResumos, setSavingToResumos] = useState(false);
  const [convertingToOpportunity, setConvertingToOpportunity] = useState(false);
  const [createdNoticeId, setCreatedNoticeId] = useState('');
  const [actionFeedback, setActionFeedback] = useState({ type: '', message: '' });

  const editalFileRef = useRef(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }
    };
    document.head.appendChild(script);
  }, []);

  const addLog = (msg, type = 'info') => {
    setLogs((prev) => [...prev, { msg, type, time: new Date().toLocaleTimeString() }]);
  };

  const extractTextFromPDF = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i += 1) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      fullText += `${textContent.items.map((item) => item.str).join(' ')}\n`;
    }
    return fullText;
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    setNormalizedResult(null);
    setCreatedNoticeId('');
    setActionFeedback({ type: '', message: '' });
    addLog(`Lendo arquivo: ${file.name}...`);
    try {
      const text = await extractTextFromPDF(file);
      setEditalText(text);
      addLog('Texto extraído com sucesso.', 'success');
    } catch (_error) {
      addLog('Erro ao ler PDF.', 'error');
    }
  };

  const fetchAPI = async (provider, prompt) => {
    const key = API_KEYS[provider];
    const systemPrompt = 'Aja como um Auditor Sênior de Licitações. Analise o texto e retorne um objeto JSON completo e exaustivo. Não economize palavras nas descrições técnicas. Retorne apenas o JSON bruto, sem markdown.';

    let response;
    if (provider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] }
        })
      });
    } else {
      const url = provider === 'groq'
        ? 'https://api.groq.com/openai/v1/chat/completions'
        : 'https://api.mistral.ai/v1/chat/completions';
      const saferPrompt = prompt.slice(0, 25000);
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`
        },
        body: JSON.stringify({
          model: provider === 'groq' ? 'llama-3.3-70b-versatile' : 'mistral-large-latest',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: saferPrompt }
          ],
          response_format: { type: 'json_object' }
        })
      });
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || `Status ${response.status}`);
    }

    const data = await response.json();
    const text = provider === 'gemini'
      ? data.candidates?.[0]?.content?.parts?.[0]?.text
      : data.choices?.[0]?.message?.content;

    if (!text) {
      throw new Error('A IA não retornou conteúdo para análise.');
    }

    const startIdx = text.indexOf('{');
    const endIdx = text.lastIndexOf('}') + 1;
    if (startIdx < 0 || endIdx <= startIdx) {
      throw new Error('A IA não retornou JSON válido.');
    }
    return JSON.parse(text.substring(startIdx, endIdx));
  };

  const runAnalysis = async () => {
    if (!editalText) {
      addLog('Por favor, selecione um documento.', 'error');
      return;
    }

    setLoading(true);
    addLog(`Iniciando análise profunda de ${modoAnalise.toUpperCase()}...`);

    const structure = modoAnalise === 'edital'
      ? `{
      "identificacao": { "data_sessao": "data", "orgao": "nome", "modalidade": "modalidade", "portal": "portal", "objeto": "objeto" },
      "prazos": [{"titulo": "prazo", "descricao": "desc"}],
      "exigencias": [{"categoria": "tipo", "requisito": "desc"}],
      "documentacao": [{"tipo": "tipo", "doc": "nome", "obrigatorio": true}],
      "itens_tr": [{"item": "nome", "desc": "especificacao tecnica detalhada e completa", "qtd": "valor"}],
      "riscos": [{"titulo": "risco", "descricao": "desc", "severidade": "alta|media"}],
      "pontuacao_viabilidade": 8
    }`
      : `{
      "identificacao": { "orgao": "nome do órgão", "objeto": "descrição completa do objeto licitado" },
      "resumo_especificacoes": "Um texto extremamente detalhado, com vários parágrafos, abordando: 1. Requisitos Técnicos Mínimos. 2. Normas Técnicas e Padrões de Qualidade (ABNT, ISO, etc). 3. Garantias e Assistência Técnica. 4. Níveis de Serviço (SLA) exigidos. 5. Obrigações acessórias da contratada.",
      "itens_tr": [{"item": "nome exato do item", "desc": "descrição técnica exaustiva conforme consta no TR, incluindo marca/modelo de referência se houver", "qtd": "quantidade total e unidade de medida"}],
      "riscos": [{"titulo": "alerta técnico", "descricao": "detalhamento de possíveis dificuldades de atendimento ou exigências desproporcionais", "severidade": "alta|media"}],
      "pontuacao_viabilidade": 7
    }`;

    const prompt = `Analise este documento (${modoAnalise.toUpperCase()}) de forma exaustiva.
    Não resuma demais. Traga o máximo de detalhamento possível para que um técnico possa avaliar a viabilidade de atendimento sem precisar ler o PDF original.

    Retorne este JSON:
    ${structure}

    TEXTO DO DOCUMENTO: ${editalText.slice(0, 60000)}`;

    const providers = [
      { id: 'gemini', name: 'Gemini' },
      { id: 'groq', name: 'Groq' },
      { id: 'mistral', name: 'Mistral' }
    ];

    for (const p of providers) {
      try {
        addLog(`Consultando inteligência via ${p.name}...`);
        const res = await fetchAPI(p.id, prompt);
        const normalized = normalizeResultForPersistence(res, modoAnalise);
        setResult({ ...res, _tipo: modoAnalise });
        setNormalizedResult(normalized);
        setCreatedNoticeId('');
        setActionFeedback({ type: '', message: '' });
        setView('detail');
        setLoading(false);
        setActiveTab(modoAnalise === 'tr' ? 'resumo especificações' : 'geral');
        addLog(`Sucesso! Análise detalhada concluída via ${p.name}.`, 'success');
        return;
      } catch (e) {
        addLog(`${p.name} falhou: ${e.message}`, 'error');
      }
    }

    setLoading(false);
    addLog('Falha total na análise. Tente um trecho menor ou verifique as chaves.', 'error');
  };

  const scoreFromResult = (mode, normalizedData, rawResult) => {
    const rawScore = Number(rawResult?.pontuacao_viabilidade);
    if (Number.isFinite(rawScore)) {
      if (rawScore >= 0 && rawScore <= 10) return Math.max(0, Math.min(100, Math.round(rawScore * 10)));
      return Math.max(0, Math.min(100, Math.round(rawScore)));
    }
    if (mode === 'tr') {
      const total = Number(normalizedData?.complianceOverview?.totalRequirements) || 0;
      const met = Number(normalizedData?.complianceOverview?.metRequirements) || 0;
      if (total > 0) return Math.max(0, Math.min(100, Math.round((met / total) * 100)));
    }
    return 55;
  };

  const getNoticeSummary = (mode, normalizedData) => {
    if (mode === 'tr') {
      return toText(normalizedData?.trSummary) || toText(normalizedData?.general?.objectSummary) || 'Resumo não identificado.';
    }
    return toText(normalizedData?.general?.objectSummary) || 'Resumo não identificado.';
  };

  const buildNoticePayload = (mode, normalizedData) => {
    const summary = getNoticeSummary(mode, normalizedData);
    const score = scoreFromResult(mode, normalizedData, result);
    const recommendation = score >= 75 ? 'GO' : score >= 55 ? 'GO_COM_RESSALVAS' : 'NO_GO';
    const baseName = toText(fileName).replace(/\.pdf$/i, '') || 'Documento analisado';
    const agency = toText(normalizedData?.general?.agency);
    const portal = toText(normalizedData?.general?.portal);
    const proposalDeadline = toText(normalizedData?.deadlines?.proposalDeadline);
    const openingDate = toText(normalizedData?.general?.openingDate);
    const riskList = toTextArray(normalizedData?.risks);

    return {
      type: mode === 'tr' ? 'TERMO_REFERENCIA' : 'EDITAL',
      title: baseName,
      organization: agency && agency !== 'Não identificado' ? agency : 'Órgão não identificado',
      stateCode: '',
      modality: toText(normalizedData?.general?.modality) || '',
      objectDescription: toText(normalizedData?.general?.objectSummary) || summary,
      openingDate: toIsoDate(openingDate),
      proposalDueDate: toIsoDate(proposalDeadline),
      sourceUrl: portal && portal !== 'Não identificado' ? portal : '',
      summary,
      status: 'ANALISE_CONCLUIDA',
      documentText: toText(editalText).slice(0, 30000),
      aiAnalysis: {
        generatedAt: new Date().toISOString(),
        resumoExecutivo: summary,
        scoreAderencia: score,
        recomendacao: recommendation,
        riscos: riskList,
        pontosChave: [],
        oportunidades: [],
        checklistDocumentacao: [],
        templateExtractedData: normalizedData
      }
    };
  };

  const ensureNoticeForConversion = async (normalizedData) => {
    if (createdNoticeId) {
      return { id: createdNoticeId };
    }

    const payload = buildNoticePayload(modoAnalise, normalizedData);
    const response = await fetch(buildApiUrl('/b2g/editais'), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.id) {
      throw new Error(data?.error || data?.message || 'Não foi possível criar o edital base para conversão.');
    }
    setCreatedNoticeId(data.id);
    return data;
  };

  const handleSaveToResumos = async () => {
    if (!result || !normalizedResult || savingToResumos) return;
    const scope = resolveSavedAnalysisScope();
    if (!scope) {
      const message = 'Sessão inválida para salvar resumo.';
      setActionFeedback({ type: 'error', message });
      addLog(message, 'error');
      return;
    }

    setSavingToResumos(true);
    setActionFeedback({ type: '', message: '' });
    try {
      const payload = {
        analysisId: `${modoAnalise}-${Date.now()}-${toSafeFileName(fileName || 'resumo.pdf')}`,
        fileName: fileName || 'resumo.pdf',
        processedAt: new Date().toISOString(),
        extractedData: normalizedResult,
        originalFileDataUri: null,
        summaryPdfDataUri: null
      };
      const response = await fetch(buildApiUrl('/analyses/saved'), {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'x-company-id': scope.companyId,
          'x-user-id': scope.userId,
          'x-user-role': scope.userRole
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || 'Não foi possível salvar em Resumos de Edital.');
      }
      const message = 'Resumo salvo com sucesso em Resumos de Edital.';
      setActionFeedback({ type: 'success', message });
      addLog(message, 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao salvar resumo.';
      setActionFeedback({ type: 'error', message });
      addLog(message, 'error');
    } finally {
      setSavingToResumos(false);
    }
  };

  const handleConvertToOpportunity = async () => {
    if (!result || !normalizedResult || convertingToOpportunity) return;
    setConvertingToOpportunity(true);
    setActionFeedback({ type: '', message: '' });
    try {
      const notice = await ensureNoticeForConversion(normalizedResult);
      if (!notice?.id) {
        throw new Error('Não foi possível preparar o resumo para conversão.');
      }
      const response = await fetch(buildApiUrl(`/b2g/editais/${notice.id}/converter-oportunidade`), {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.opportunity?.id) {
        throw new Error(data?.error || 'Não foi possível converter em oportunidade.');
      }
      const message = 'Resumo convertido com sucesso. Redirecionando para Oportunidades...';
      setActionFeedback({ type: 'success', message });
      addLog(message, 'success');
      navigate(`/oportunidades?clientType=B2G&opportunityId=${encodeURIComponent(data.opportunity.id)}&mode=edit`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao converter resumo em oportunidade.';
      setActionFeedback({ type: 'error', message });
      addLog(message, 'error');
    } finally {
      setConvertingToOpportunity(false);
    }
  };

  const renderTabContent = () => {
    if (!result) return null;

    switch (activeTab) {
      case 'resumo especificações':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <h3 className="text-white font-bold text-lg flex items-center gap-3">
              <Info className="w-5 h-5 text-sky-400" /> Detalhamento Técnico do TR
            </h3>
            <div className="bg-[#1e293b]/40 p-8 rounded-[2.5rem] border border-slate-800 leading-relaxed text-slate-300 text-sm whitespace-pre-wrap">
              {result.resumo_especificacoes || 'Não foi possível consolidar as especificações técnicas detalhadas.'}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-sky-500/5 p-6 rounded-3xl border border-sky-500/10">
                <h4 className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <ShieldAlert className="w-3 h-3" /> Conformidade Normativa
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">Verifique se as certificações exigidas no resumo acima estão vigentes para sua empresa.</p>
              </div>
              <div className="bg-emerald-500/5 p-6 rounded-3xl border border-emerald-500/10">
                <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <ListChecks className="w-3 h-3" /> Próximos Passos
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">Utilize o resumo acima para solicitar cotações precisas com seus fornecedores habituais.</p>
              </div>
            </div>
          </div>
        );
      case 'geral':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <section>
              <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">Identificação do Certame</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {result.identificacao?.data_sessao && (
                  <div className="bg-[#1e293b]/40 p-6 rounded-3xl border border-slate-800 flex items-start gap-4">
                    <div className="p-3 bg-slate-800 rounded-2xl text-sky-400 shadow-inner"><Calendar className="w-5 h-5" /></div>
                    <div>
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Data da Sessão</span>
                      <p className="text-white font-bold text-base mt-1">{result.identificacao.data_sessao}</p>
                    </div>
                  </div>
                )}
                <div className="bg-[#1e293b]/40 p-6 rounded-3xl border border-slate-800 flex items-start gap-4">
                  <div className="p-3 bg-slate-800 rounded-2xl text-sky-400 shadow-inner"><Building2 className="w-5 h-5" /></div>
                  <div>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Órgão Licitante</span>
                    <p className="text-white font-bold text-base mt-1">{result.identificacao?.orgao || 'Não identificado'}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-8">
                {result.identificacao?.modalidade && (
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase mb-3 block tracking-widest">Modalidade do Processo</label>
                    <div className="inline-block bg-sky-500/10 text-sky-400 border border-sky-500/20 px-4 py-2 rounded-xl text-xs font-bold">
                      {result.identificacao.modalidade}
                    </div>
                  </div>
                )}
                {result.identificacao?.portal && (
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase mb-3 block tracking-widest">Plataforma Eletrônica</label>
                    <div className="flex items-center gap-3 p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                      <Globe className="w-4 h-4 text-sky-500" />
                      <p className="text-sky-400 text-sm font-bold">{result.identificacao.portal}</p>
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase mb-3 block tracking-widest">Objeto Principal Analisado</label>
                  <p className="text-slate-300 text-sm leading-relaxed bg-[#1e293b]/30 p-6 rounded-[2rem] border border-slate-800/50 shadow-inner italic">
                    "{result.identificacao?.objeto || 'Resumo não disponível.'}"
                  </p>
                </div>
              </div>
            </section>
          </div>
        );
      case 'itens / tr':
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-bold text-lg">Catálogo Técnico de Itens</h3>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-800 px-3 py-1 rounded-full">
                {result.itens_tr?.length || 0} Itens Mapeados
              </span>
            </div>
            {result.itens_tr?.map((item, i) => (
              <div key={i} className="bg-[#1e293b]/40 p-6 rounded-[2rem] border border-slate-800 flex flex-col gap-4 hover:bg-slate-800/60 transition-all group">
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400 font-black text-xs">
                      {i + 1}
                    </div>
                    <div className="text-sm text-white font-black uppercase tracking-tight">{item.item}</div>
                  </div>
                  <div className="text-xs font-black text-sky-400 bg-sky-500/10 px-4 py-1.5 rounded-full border border-sky-500/20 shadow-lg shadow-sky-500/5">
                    Qtd: {item.qtd}
                  </div>
                </div>
                <div className="text-xs text-slate-400 leading-relaxed font-medium bg-black/30 p-5 rounded-2xl border border-slate-800/50">
                  {item.desc}
                </div>
              </div>
            )) || <p className="text-slate-500 italic p-10 text-center">Nenhum item processado no catálogo.</p>}
          </div>
        );
      case 'prazos':
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
            {result.prazos?.map((p, i) => (
              <div key={i} className="bg-[#1e293b]/40 p-5 rounded-3xl border border-slate-800 flex items-start gap-4">
                <div className="p-3 bg-sky-500/10 rounded-2xl text-sky-400"><Clock className="w-5 h-5" /></div>
                <div>
                  <h4 className="text-white font-black text-sm uppercase tracking-tight">{p.titulo}</h4>
                  <p className="text-slate-400 text-xs mt-2 leading-relaxed">{p.descricao}</p>
                </div>
              </div>
            )) || <p className="text-slate-500 italic">Cronograma não detalhado no documento.</p>}
          </div>
        );
      case 'exigencias':
        return (
          <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-500">
            {result.exigencias?.map((e, i) => (
              <div key={i} className="bg-[#1e293b]/40 p-5 rounded-3xl border border-slate-800 flex items-start gap-4">
                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 mt-1"><ListChecks className="w-4 h-4" /></div>
                <div>
                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{e.categoria}</span>
                  <p className="text-slate-300 text-sm mt-1 font-medium">{e.requisito}</p>
                </div>
              </div>
            )) || <p className="text-slate-500 italic">Exigências de qualificação não encontradas.</p>}
          </div>
        );
      case 'documentação':
        return (
          <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-500">
            <h3 className="text-white font-bold text-lg mb-4">Checklist de Documentação Obrigatória</h3>
            {result.documentacao?.map((doc, i) => (
              <div key={i} className="bg-[#1e293b]/40 p-5 rounded-3xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${doc.obrigatorio ? 'bg-sky-500/10 text-sky-400 shadow-lg shadow-sky-500/5' : 'bg-slate-800 text-slate-500'}`}>
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{doc.tipo}</span>
                    <p className="text-sm font-bold text-slate-200 mt-1">{doc.doc}</p>
                  </div>
                </div>
                {doc.obrigatorio && (
                  <div className="flex items-center gap-2 bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1.5 rounded-xl">
                    <AlertTriangle className="w-3 h-3" />
                    <span className="text-[9px] font-black uppercase">Crítico</span>
                  </div>
                )}
              </div>
            )) || <p className="text-slate-500 italic">Nenhum documento listado na análise.</p>}
          </div>
        );
      case 'riscos / ia':
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
            <h3 className="text-white font-bold text-lg mb-4">Mapa de Riscos e Fragilidades</h3>
            {result.riscos?.map((r, i) => (
              <div key={i} className="bg-red-500/5 p-6 rounded-[2.5rem] border border-red-500/20 flex items-start gap-5">
                <div className={`p-4 rounded-2xl shrink-0 ${r.severidade === 'alta' ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500'}`}>
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h4 className="text-white font-black uppercase text-sm tracking-tight">{r.titulo}</h4>
                    <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${r.severidade === 'alta' ? 'bg-red-500 text-white' : 'bg-amber-500 text-black'}`}>
                      {r.severidade}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs mt-3 leading-relaxed italic">"{r.descricao}"</p>
                </div>
              </div>
            )) || <p className="text-slate-500 italic">Nenhum risco técnico mapeado automaticamente.</p>}
          </div>
        );
      default:
        return null;
    }
  };

  const Sidebar = () => (
    <div className="w-72 bg-[#111827] border-r border-slate-800 p-8 flex flex-col gap-8 shadow-2xl z-30">
      <div className="flex items-center gap-3 text-sky-400 font-black text-2xl tracking-tighter mb-4">
        <div className="bg-sky-500 p-2 rounded-xl text-[#111827] shadow-lg shadow-sky-500/20">
          <Layers className="w-6 h-6" />
        </div>
        <span>Analisa.ai</span>
      </div>
      <nav className="space-y-3">
        <button onClick={() => setView('dashboard')} className={`w-full flex items-center gap-4 p-4 rounded-2xl text-sm font-bold transition-all ${view === 'dashboard' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-lg shadow-sky-500/5' : 'text-slate-500 hover:bg-slate-800/50'}`}>
          <LayoutDashboard className="w-5 h-5" /> Dashboard
        </button>
        <button onClick={() => setView('history')} className={`w-full flex items-center gap-4 p-4 rounded-2xl text-sm font-bold transition-all ${view === 'history' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-lg shadow-sky-500/5' : 'text-slate-500 hover:bg-slate-800/50'}`}>
          <History className="w-5 h-5" /> Histórico
        </button>
      </nav>

      <div className="mt-auto p-6 bg-slate-900/50 rounded-3xl border border-slate-800">
        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Suporte e Dicas</div>
        <p className="text-[10px] text-slate-600 leading-relaxed italic">Para análises de TR, utilize PDFs com texto selecionável para melhor precisão técnica.</p>
      </div>
    </div>
  );

  const Dashboard = () => (
    <div className="flex-1 p-8 overflow-y-auto bg-[#0f172a] custom-scrollbar">
      <div className="mb-12">
        <h1 className="text-4xl font-black text-white flex items-center gap-4 tracking-tight">
          <Zap className="w-10 h-10 text-sky-400 fill-sky-400/20" /> Análise de Licitações com IA
        </h1>
        <p className="text-slate-400 mt-3 text-lg font-medium opacity-80">Extraia informações do edital completo ou gere caderno técnico exaustivo do TR.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 bg-[#1e293b]/40 rounded-[3rem] p-10 border border-slate-800/50 border-dashed relative overflow-hidden">
          <div className="relative z-10">
            <div className="mb-8">
              <label className="text-[11px] font-black text-slate-500 uppercase mb-4 block tracking-widest">Selecione o Modo Operacional</label>
              <div className="flex bg-[#0f172a] p-1.5 rounded-2xl border border-slate-800 shadow-inner">
                <button onClick={() => setModoAnalise('edital')} className={`flex-1 py-3 px-6 rounded-xl text-xs font-black uppercase tracking-tighter transition-all ${modoAnalise === 'edital' ? 'bg-sky-500 text-white shadow-xl shadow-sky-500/20' : 'text-slate-500 hover:text-slate-300'}`}>Edital Completo</button>
                <button onClick={() => setModoAnalise('tr')} className={`flex-1 py-3 px-6 rounded-xl text-xs font-black uppercase tracking-tighter transition-all ${modoAnalise === 'tr' ? 'bg-sky-500 text-white shadow-xl shadow-sky-500/20' : 'text-slate-500 hover:text-slate-300'}`}>Análise de TR</button>
              </div>
            </div>

            <div className="flex flex-col items-center text-center py-6">
              <div className="w-20 h-20 bg-sky-500/10 rounded-[2rem] flex items-center justify-center mb-6 text-sky-400 border border-sky-500/20 shadow-inner">
                {modoAnalise === 'edital' ? <Upload className="w-10 h-10" /> : <FileSearch className="w-10 h-10" />}
              </div>
              <h3 className="text-2xl font-black text-white mb-2">{modoAnalise === 'edital' ? 'Importar Edital' : 'Extrair Termo de Referência'}</h3>
              <p className="text-slate-500 text-xs mb-10 leading-relaxed font-medium">Suporta PDF até 20MB. O motor de IA prioriza o Gemini para análise de alta fidelidade técnica.</p>

              <input type="file" ref={editalFileRef} className="hidden" accept=".pdf" onChange={handleFileUpload} />

              <div className="w-full space-y-4">
                <button onClick={() => editalFileRef.current.click()} className="w-full bg-white text-[#0f172a] font-black py-4 px-8 rounded-2xl transition-all shadow-xl hover:scale-[1.02] active:scale-98">
                  {fileName ? `✓ ${fileName.slice(0, 20)}...` : 'SELECIONAR DOCUMENTO PDF'}
                </button>

                <button onClick={runAnalysis} disabled={loading || !editalText} className="w-full bg-sky-500 hover:bg-sky-600 disabled:bg-slate-800 text-white font-black py-4 px-8 rounded-2xl transition-all shadow-xl shadow-sky-500/20 flex items-center justify-center gap-3 disabled:shadow-none hover:scale-[1.02] active:scale-98">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
                  <span>{loading ? 'PROCESSANDO ANÁLISE...' : 'EXECUTAR AUDITORIA IA'}</span>
                </button>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 rounded-full blur-3xl -mr-32 -mt-32" />
        </div>

        <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-[#1e293b]/60 rounded-[2.5rem] p-10 border border-slate-800/50 shadow-xl flex items-center gap-6">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/20 shadow-inner"><CheckCircle className="w-8 h-8" /></div>
            <div>
              <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Analisados</p>
              <h4 className="text-5xl font-black text-white tracking-tighter">2</h4>
            </div>
          </div>
          <div className="bg-[#1e293b]/60 rounded-[2.5rem] p-10 border border-slate-800/50 shadow-xl flex items-center gap-6">
            <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-400 border border-amber-500/20 shadow-inner"><AlertTriangle className="w-8 h-8" /></div>
            <div>
              <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">Inconformidades</p>
              <h4 className="text-5xl font-black text-white tracking-tighter">0</h4>
            </div>
          </div>
          <div className="md:col-span-2 bg-[#0f172a] rounded-[2.5rem] p-8 border border-slate-800 h-72 overflow-y-auto font-mono text-[10px] custom-scrollbar shadow-inner relative">
            <div className="flex items-center gap-2 mb-6 text-sky-500 border-b border-slate-800 pb-4 sticky top-0 bg-[#0f172a] z-10">
              <Code className="w-4 h-4" /> <span className="font-bold uppercase tracking-widest">Fluxo de Contingência Multi-API</span>
            </div>
            <div className="space-y-3">
              {logs.length === 0 && <span className="opacity-20 italic">Aguardando entrada de dados...</span>}
              {logs.map((log, i) => (
                <div key={i} className={`flex gap-3 animate-in fade-in slide-in-from-left-2 ${log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-emerald-400' : 'text-slate-400'}`}>
                  <span className="opacity-30 shrink-0 font-bold">{log.time}</span>
                  <span className="leading-relaxed">{log.msg}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const DetailView = () => (
    <div className="flex-1 flex flex-col min-h-[76vh] overflow-hidden bg-[#0f172a] rounded-3xl border border-slate-800">
      <header className="bg-[#0f172a] border-b border-slate-800 p-8 flex items-center justify-between shadow-2xl z-20">
        <div className="flex items-center gap-8">
          <button onClick={() => setView('dashboard')} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-2xl text-white transition-all shadow-xl hover:scale-110 active:scale-95">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-black text-white tracking-tight">Análise Estratégica: {fileName || 'documento.pdf'}</h1>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-sky-500/10 text-sky-400 rounded-full text-[10px] font-black border border-sky-500/20 italic uppercase tracking-widest">
                  {result?._tipo === 'tr' ? 'Termo de Referência' : 'Edital'}
                </span>
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] font-black border border-emerald-500/20 italic uppercase tracking-widest">Auditado via IA</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-2 tracking-widest flex items-center gap-2">
              <Clock className="w-3 h-3" /> Processado em {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleSaveToResumos}
            disabled={savingToResumos || !result}
            className="flex items-center gap-3 bg-[#1e293b] text-slate-300 font-black py-3 px-6 rounded-2xl border border-slate-700 text-xs hover:bg-slate-800 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingToResumos ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            SALVAR EM RESUMOS
          </button>
          <button
            onClick={handleConvertToOpportunity}
            disabled={convertingToOpportunity || !result}
            className="flex items-center gap-3 bg-sky-500 text-white font-black py-3 px-8 rounded-2xl shadow-xl shadow-sky-500/20 text-xs hover:bg-sky-600 transition-all hover:scale-[1.02] active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {convertingToOpportunity ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-white" />}
            CONVERTER EM OPORTUNIDADE
          </button>
        </div>
      </header>

      {actionFeedback.message ? (
        <div className={`mx-8 mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${
          actionFeedback.type === 'success'
            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
            : 'border-red-500/40 bg-red-500/10 text-red-300'
        }`}>
          {actionFeedback.message}
        </div>
      ) : null}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden bg-[#0f172a]">
        <div className="p-10 border-r border-slate-800 overflow-y-auto bg-slate-950/20 flex flex-col items-center custom-scrollbar">
          <div className="w-full max-w-2xl mb-8 p-6 bg-slate-900/40 rounded-[3rem] border border-slate-800/50 shadow-inner">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-6 block text-center">Pré-visualização do Documento</label>
            <div className="aspect-[1/1.41] bg-slate-950 border border-slate-800 rounded-2xl flex flex-col items-center justify-center p-16 text-slate-600 shadow-2xl relative overflow-hidden group">
              <FileText className="w-24 h-24 opacity-5 mb-6 group-hover:scale-110 transition-transform duration-500" />
              <h4 className="font-black text-slate-500 text-xl tracking-tight">Visor PDF Desabilitado</h4>
              <p className="text-[11px] max-w-xs mt-3 opacity-30 text-center leading-relaxed font-medium">Ambiente de segurança: A renderização nativa de arquivos PDF externos está restrita neste módulo.</p>
              <div className="absolute inset-0 bg-sky-500/2 rounded-full blur-3xl" />
            </div>
          </div>
        </div>

        <div className="p-10 overflow-y-auto space-y-10 bg-[#0f172a] custom-scrollbar">
          <div className="flex items-center bg-[#1e293b]/50 p-1.5 rounded-2xl border border-slate-800 mb-10 overflow-x-auto scrollbar-hide sticky top-0 z-20 shadow-2xl backdrop-blur-md">
            {['GERAL', 'RESUMO ESPECIFICAÇÕES', 'PRAZOS', 'EXIGENCIAS', 'DOCUMENTAÇÃO', 'ITENS / TR', 'RISCOS / IA'].map((tab) => {
              if (tab === 'RESUMO ESPECIFICAÇÕES' && result?._tipo !== 'tr') return null;
              if ((tab === 'PRAZOS' || tab === 'DOCUMENTAÇÃO') && result?._tipo === 'tr') return null;

              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab.toLowerCase())}
                  className={`whitespace-nowrap flex-1 py-3 px-6 rounded-xl text-[9px] font-black uppercase transition-all tracking-tighter ${activeTab === tab.toLowerCase() ? 'bg-slate-800 text-sky-400 shadow-xl border border-slate-700' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          <div className="pb-10">{renderTabContent()}</div>

          <div className="bg-sky-600/5 p-8 rounded-[3rem] border border-sky-500/10 mt-12 shadow-inner relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-sky-500/20 rounded-2xl text-sky-400">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-black text-white uppercase tracking-tight">Avaliação de Aderência Técnica</h4>
              </div>
              <div className="flex items-end gap-3 mb-6">
                <span className="text-6xl font-black text-sky-400 tracking-tighter leading-none">{result?.pontuacao_viabilidade || 0}</span>
                <span className="text-sky-400/40 font-black text-2xl mb-1">/ 10</span>
              </div>
              <p className="text-xs text-slate-500 italic leading-relaxed font-medium">Este índice é calculado comparando as capacidades padrão do mercado contra as exigências críticas extraídas automaticamente deste documento pela inteligência artificial.</p>
            </div>
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-3xl" />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-[80vh] bg-[#0f172a] text-slate-200 overflow-hidden select-none font-sans rounded-3xl border border-slate-800">
      {view !== 'detail' && <Sidebar />}
      {view === 'dashboard' && <Dashboard />}
      {view === 'detail' && <DetailView />}
      <style dangerouslySetInnerHTML={{ __html: `
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; border: 2px solid #0f172a; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-in { animation: fade-in 0.5s ease-out forwards; }
      ` }} />
    </div>
  );
};

export default B2GAnaliseEditaisTR;
