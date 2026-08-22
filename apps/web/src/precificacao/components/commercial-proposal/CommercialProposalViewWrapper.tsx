import React, { useEffect, useRef } from 'react';
import CommercialProposalPresentationView from './CommercialProposalPresentationView';

const STORAGE_LIST_KEY = 'proposta-comercial-double-drafts-v1';
const STORAGE_KEY = 'proposta-comercial-double-draft-v4';

interface CommercialProposalViewWrapperProps {
  proposal?: any;
  partners?: any[];
}

/**
 * Wrapper que pré-popula o localStorage com os dados de uma proposta salva
 * antes de renderizar o CommercialProposalPresentationView.
 */
const CommercialProposalViewWrapper: React.FC<CommercialProposalViewWrapperProps> = ({ proposal, partners }) => {
  const injected = useRef(false);

  useEffect(() => {
    if (!proposal || injected.current) return;
    injected.current = true;

    try {
      // Extrair dados do cliente
      const meta = proposal.metadata || {};
      const clientData = meta.clientData || {};
      const products = meta.products || proposal.products || proposal.items || [];
      const accountManager = (() => {
        const am = proposal.accountManager || meta.accountManager;
        if (!am) return {};
        if (typeof am === 'string') { try { return JSON.parse(am); } catch { return { name: am }; } }
        return am;
      })();

      // Montar linhas de investimento a partir dos produtos
      const investmentRows = products.map((p: any) => ({
        service: p.description || '',
        description: p.description || '',
        monthly: String(p.monthly || 0),
        contract: String((p.monthly || 0) * (p.details?.contractTerm || 12)),
      }));

      // Calcular totais
      const totalMonthly = products.reduce((s: number, p: any) => s + (p.monthly || 0), 0);
      const contractTerm = products[0]?.details?.contractTerm || 12;
      const totalContract = totalMonthly * contractTerm;
      const installationFee = products.reduce((s: number, p: any) => s + (p.setup || 0), 0);

      // Construir draft no formato do CommercialProposalPresentationView
      const draft = {
        savedAt: proposal.createdAt || new Date().toISOString(),
        cover: {
          clientName: clientData.name || (typeof proposal.client === 'string' ? proposal.client : ''),
          date: new Date(proposal.createdAt || Date.now()).toLocaleDateString('pt-BR'),
          product: products[0]?.description || proposal.type || '',
        },
        slides: {},
        contract: {
          vigencia: `${contractTerm} meses`,
          prazo: `${contractTerm} meses`,
          termos: '',
        },
        investment: {
          rows: investmentRows,
          installationFee: String(installationFee),
        },
      };

      // Criar entrada com título e versão v1
      const entry = {
        id: proposal.id || String(Date.now()),
        title: `${proposal.title || clientData.name || 'Proposta'} - v1`,
        savedAt: draft.savedAt,
        draft,
      };

      // Salvar nas chaves que o componente usa
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      window.localStorage.setItem(STORAGE_LIST_KEY, JSON.stringify([entry]));
    } catch (e) {
      console.error('Erro ao pré-popular proposta:', e);
    }
  }, [proposal]);

  return <CommercialProposalPresentationView />;
};

export default CommercialProposalViewWrapper;
