const elements = {
  apiBaseUrl: document.getElementById("apiBaseUrl"),
  companyId: document.getElementById("companyId"),
  userId: document.getElementById("userId"),
  userRole: document.getElementById("userRole"),
  analysisMode: document.getElementById("analysisMode"),
  mainPdf: document.getElementById("mainPdf"),
  modelName: document.getElementById("modelName"),
  modelManufacturer: document.getElementById("modelManufacturer"),
  modelSpecs: document.getElementById("modelSpecs"),
  datasheetPdf: document.getElementById("datasheetPdf"),
  trFields: document.getElementById("trFields"),
  runAnalysisBtn: document.getElementById("runAnalysisBtn"),
  saveAnalysisBtn: document.getElementById("saveAnalysisBtn"),
  loadSavedBtn: document.getElementById("loadSavedBtn"),
  analysisOutput: document.getElementById("analysisOutput"),
  savedOutput: document.getElementById("savedOutput")
};

let latestAnalysis = null;

function getApiBaseUrl() {
  return elements.apiBaseUrl.value.trim().replace(/\/+$/, "");
}

function getScopeHeaders() {
  return {
    "x-company-id": elements.companyId.value.trim(),
    "x-user-id": elements.userId.value.trim(),
    "x-user-role": elements.userRole.value.trim() || "user"
  };
}

function setLoading(button, loading, originalLabel) {
  button.disabled = loading;
  button.textContent = loading ? "Processando..." : originalLabel;
}

function randomId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function fileToDataUri(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler arquivo."));
    reader.onload = () => {
      if (typeof reader.result === "string" && reader.result.startsWith("data:")) {
        resolve(reader.result);
        return;
      }
      reject(new Error("Arquivo nao convertido para Data URI."));
    };
    reader.readAsDataURL(file);
  });
}

function outputJson(el, value) {
  el.textContent = JSON.stringify(value, null, 2);
}

function ensurePdf(file, label) {
  if (!file) throw new Error(`${label} obrigatorio.`);
  if (file.type !== "application/pdf") throw new Error(`${label} deve ser PDF.`);
}

async function runAnalysis() {
  const mode = elements.analysisMode.value;
  const mainFile = elements.mainPdf.files?.[0];

  ensurePdf(mainFile, mode === "tr" ? "TR" : "Edital");

  const fileDataUri = await fileToDataUri(mainFile);
  const apiBaseUrl = getApiBaseUrl();

  let endpoint = `${apiBaseUrl}/api/ai-analysis/edital`;
  let payload = { fileDataUri };

  if (mode === "tr") {
    const modelName = elements.modelName.value.trim();
    const modelSpecs = elements.modelSpecs.value.trim();
    const datasheet = elements.datasheetPdf.files?.[0];

    if (!modelName) throw new Error("Modelo analisado obrigatorio para TR.");
    if (!modelSpecs && !datasheet) {
      throw new Error("Informe especificacoes do modelo ou anexe datasheet.");
    }

    let datasheetFileDataUri;
    if (datasheet) {
      ensurePdf(datasheet, "Datasheet");
      datasheetFileDataUri = await fileToDataUri(datasheet);
    }

    endpoint = `${apiBaseUrl}/api/ai-analysis/tr`;
    payload = {
      fileDataUri,
      analyzedModelName: modelName,
      analyzedModelManufacturer: elements.modelManufacturer.value.trim() || undefined,
      analyzedModelSpecs: modelSpecs || `Especificacoes enviadas por datasheet: ${datasheet?.name ?? "arquivo"}`,
      datasheetFileDataUri,
      datasheetFileName: datasheet?.name
    };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || "Falha na analise.");
  }

  latestAnalysis = {
    analysisId: randomId(),
    fileName: mainFile.name,
    processedAt: new Date().toISOString(),
    extractedData: data,
    originalFileDataUri: fileDataUri,
    summaryPdfDataUri: null
  };

  outputJson(elements.analysisOutput, data);
}

async function saveLatestAnalysis() {
  if (!latestAnalysis) {
    throw new Error("Execute uma analise antes de salvar.");
  }

  const headers = getScopeHeaders();
  if (!headers["x-company-id"] || !headers["x-user-id"]) {
    throw new Error("Preencha Company ID e User ID.");
  }

  const response = await fetch(`${getApiBaseUrl()}/api/analyses/saved`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers
    },
    body: JSON.stringify(latestAnalysis)
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || "Falha ao salvar.");
  }

  outputJson(elements.savedOutput, data);
}

async function loadSavedAnalyses() {
  const headers = getScopeHeaders();
  if (!headers["x-company-id"] || !headers["x-user-id"]) {
    throw new Error("Preencha Company ID e User ID.");
  }

  const response = await fetch(`${getApiBaseUrl()}/api/analyses/saved`, {
    headers
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || "Falha ao carregar salvos.");
  }
  outputJson(elements.savedOutput, data);
}

elements.analysisMode.addEventListener("change", () => {
  const isTr = elements.analysisMode.value === "tr";
  elements.trFields.classList.toggle("hidden", !isTr);
});

elements.runAnalysisBtn.addEventListener("click", async () => {
  const label = elements.runAnalysisBtn.textContent;
  setLoading(elements.runAnalysisBtn, true, label);
  try {
    await runAnalysis();
  } catch (error) {
    elements.analysisOutput.textContent = `Erro: ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    setLoading(elements.runAnalysisBtn, false, label);
  }
});

elements.saveAnalysisBtn.addEventListener("click", async () => {
  const label = elements.saveAnalysisBtn.textContent;
  setLoading(elements.saveAnalysisBtn, true, label);
  try {
    await saveLatestAnalysis();
  } catch (error) {
    elements.savedOutput.textContent = `Erro: ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    setLoading(elements.saveAnalysisBtn, false, label);
  }
});

elements.loadSavedBtn.addEventListener("click", async () => {
  const label = elements.loadSavedBtn.textContent;
  setLoading(elements.loadSavedBtn, true, label);
  try {
    await loadSavedAnalyses();
  } catch (error) {
    elements.savedOutput.textContent = `Erro: ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    setLoading(elements.loadSavedBtn, false, label);
  }
});
