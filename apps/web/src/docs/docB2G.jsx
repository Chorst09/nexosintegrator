// Conteúdo de documentação do Módulo B2G

export const docB2GContent = [
  {
    title: '📋 O que é este módulo?',
    content: `O módulo B2G gerencia o relacionamento com órgãos governamentais e o acompanhamento de licitações públicas. Possui pipeline próprio com etapas específicas do processo licitatório e integração com IA para análise de editais e Termos de Referência.`
  },
  {
    title: '🏛️ Cadastro de Órgãos',
    content: `Acesse: B2G Governo → Órgãos.

Como cadastrar:
1. Clique em "Novo Órgão".
2. Preencha: Nome do Órgão (obrigatório), CNPJ/Código, Esfera/Área (Federal, Estadual, Municipal, Saúde, Educação, etc.).
3. Selecione Porte e Status (Lead / Prospect / Ativo / Inativo).
4. Informe o Contato do órgão: Nome, Email, Telefone, Cargo.
5. Informe o Contato Administrativo (responsável por processos/contratos).
6. Clique em Salvar.`
  },
  {
    title: '🔍 Portal de Busca de Editais',
    content: `Acesse: B2G Governo → Portal de Busca.

Use para encontrar licitações no PNCP (Portal Nacional de Contratações Públicas) e outras fontes públicas.

Como usar:
1. Digite palavras-chave do seu produto ou serviço.
2. Filtre por UF, período e modalidade.
3. Clique em um edital para ver os detalhes.
4. Clique em "Adicionar ao Pipeline" para criar uma oportunidade B2G.`
  },
  {
    title: '🤖 Análise de Editais/TR com IA',
    content: `Acesse: B2G Governo → Análise Editais/TR.

Esta ferramenta analisa PDFs de editais e Termos de Referência usando Inteligência Artificial.

Modos disponíveis:
• Edital — analisa o edital completo.
• Termo de Referência (TR) — análise técnica profunda de especificações.

Como usar:
1. Selecione o modo: Edital ou TR.
2. Clique em "Selecionar PDF" e escolha o arquivo.
3. Clique em "Analisar".
4. Aguarde 10–30 segundos enquanto a IA processa.
5. Navegue pelas abas para ver o resultado.`
  },
  {
    title: '📑 Abas do resultado — Edital',
    content: `• Geral — órgão, data da sessão, modalidade, portal eletrônico, objeto.
• Prazos — cronograma completo: publicação, impugnação, proposta, abertura.
• Exigências — requisitos jurídicos, técnicos, econômicos e fiscais.
• Documentação — checklist automático de documentos obrigatórios.
• Itens/TR — catálogo de todos os itens com quantidade e especificações técnicas.
• Riscos/IA — pontos de atenção identificados pela IA com severidade.`
  },
  {
    title: '📊 Score de Aderência (GO / NO GO)',
    content: `Após a análise, o sistema calcula automaticamente a viabilidade de participação:

• ≥ 75 pontos → GO — recomendado participar.
• 55–74 pontos → GO COM RESSALVAS — participar com atenção aos pontos críticos identificados.
• < 55 pontos → NO GO — não recomendado participar.

O score é baseado na avaliação da IA sobre requisitos técnicos, prazos, exigências e riscos identificados no documento.`
  },
  {
    title: '🔄 Convertendo análise em Oportunidade',
    content: `Após analisar um edital/TR:
1. Clique em "Converter em Oportunidade".
2. O sistema cria automaticamente o edital no banco de dados.
3. Uma oportunidade B2G é gerada no pipeline.
4. Você é redirecionado para a oportunidade para revisar e editar.

Para salvar a análise sem converter:
1. Clique em "Salvar em Resumos".
2. A análise fica disponível em B2G → Resumos de Edital.`
  },
  {
    title: '📋 Pipeline de Oportunidades B2G',
    content: `Etapas do funil licitatório:
ANÁLISE → PROPOSTA ENVIADA → HABILITAÇÃO → RECURSO → SUSPENSO → HOMOLOGADO → CONCLUÍDO → GANHO / NO GO / PERDIDO

Status dos editais:
• Monitorando — em observação.
• Análise em Andamento — sendo avaliado.
• Análise Concluída — GO/NO GO definido.
• Proposta em Preparação — equipe preparando proposta.
• Enviada — proposta enviada ao órgão.
• Suspensa — licitação suspensa pelo órgão.
• Encerrada — processo encerrado.`
  },
  {
    title: '📁 Documentação B2G',
    content: `Acesse: B2G Governo → Documentação.

Controla a validade dos documentos de habilitação:

Categorias:
• Jurídico — Contrato Social, atos constitutivos.
• Fiscal — Certidões negativas (Federal, Estadual, Municipal, FGTS, Trabalhista).
• Técnico — Atestados de capacidade, certificações.
• Habilitação — documentos específicos do edital.
• Financeiro — Balanço patrimonial, demonstrações contábeis.

Status de validade:
• ✅ Válido — dentro do prazo.
• ⚠️ Vencendo — vence em até 30 dias (alerta automático).
• ❌ Expirado — fora do prazo, precisa renovar.`
  },
  {
    title: '⚡ Provedores de IA (Fallback Automático)',
    content: `A análise tenta os provedores em sequência, usando o próximo se o anterior falhar:

1. Gemini (Google — gemini-2.5-flash)
2. Groq (llama-3.3-70b-versatile)
3. Mistral (mistral-large-latest)

Isso garante que a análise seja concluída mesmo que um provedor esteja indisponível.`
  }
];
