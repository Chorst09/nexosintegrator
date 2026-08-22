import { useState } from 'react';
import { Trophy, XCircle, AlertTriangle } from 'lucide-react';
import Modal from './Modal';

const LOSS_REASONS = [
  'Preço acima do esperado',
  'Concorrência venceu',
  'Prazo de entrega inviável',
  'Cliente optou por não investir',
  'Problemas com suporte/pós-venda',
  'Produto não atende aos requisitos',
  'Orçamento insuficiente do cliente',
  'Relacionamento com concorrente',
  'Decisão interna do cliente',
  'Outro'
];

const CloseOpportunityModal = ({
  isOpen,
  onClose,
  onConfirm,
  type = 'WON',
  opportunityTitle = '',
}) => {
  const isWon = type === 'WON' || type === 'GANHO';

  const [form, setForm] = useState({
    competitorName: '',
    competitorPrice: '',
    ourPrice: '',
    priceDifference: '',
    productsInvolved: '',
    lossReason: '',
    customLossReason: '',
    history: '',
  });

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const resetForm = () => setForm({
    competitorName: '',
    competitorPrice: '',
    ourPrice: '',
    priceDifference: '',
    productsInvolved: '',
    lossReason: '',
    customLossReason: '',
    history: '',
  });

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleConfirm = () => {
    const result = {
      type,
      competitorName: form.competitorName.trim(),
      competitorPrice: form.competitorPrice ? parseFloat(form.competitorPrice.replace(/\./g, '').replace(',', '.')) || 0 : 0,
      ourPrice: form.ourPrice ? parseFloat(form.ourPrice.replace(/\./g, '').replace(',', '.')) || 0 : 0,
      priceDifference: form.priceDifference ? parseFloat(form.priceDifference.replace(/\./g, '').replace(',', '.')) || 0 : 0,
      productsInvolved: form.productsInvolved.trim(),
      lossReason: isWon ? '' : (form.lossReason === 'Outro' ? form.customLossReason.trim() : form.lossReason),
      history: form.history.trim(),
      closedAt: new Date().toISOString(),
    };
    onConfirm(result);
    resetForm();
  };

  const inputCls = 'w-full rounded-lg border border-[color:var(--crm-border)] bg-[color:var(--crm-surface)] text-[color:var(--crm-text)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-[color:var(--crm-muted)]/50';
  const labelCls = 'text-xs font-medium text-[color:var(--crm-muted)] mb-1 block';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isWon ? 'Registrar Ganho' : 'Registrar Perda'}
      size="default"
    >
      <div className="space-y-5 p-2">
        {/* Header */}
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${
          isWon
            ? 'border-emerald-400/40 bg-emerald-500/10'
            : 'border-red-400/40 bg-red-500/10'
        }`}>
          {isWon ? (
            <Trophy className="h-6 w-6 text-emerald-400 flex-shrink-0" />
          ) : (
            <XCircle className="h-6 w-6 text-red-400 flex-shrink-0" />
          )}
          <div>
            <p className="text-sm font-semibold text-[color:var(--crm-text)]">
              {isWon ? 'Parabéns! Oportunidade Ganha!' : 'Informe os dados da perda'}
            </p>
            {opportunityTitle && (
              <p className="text-xs text-[color:var(--crm-muted)] mt-0.5 truncate max-w-[300px]">{opportunityTitle}</p>
            )}
          </div>
        </div>

        {/* Competitor Name */}
        <div>
          <label className={labelCls}>{isWon ? 'Concorrente derrotado' : 'Concorrente que venceu'}</label>
          <input
            type="text"
            className={inputCls}
            placeholder={isWon ? 'Ex: Empresa ABC Ltda' : 'Ex: Concorrente XYZ S.A'}
            value={form.competitorName}
            onChange={e => set('competitorName', e.target.value)}
          />
        </div>

        {/* Price Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>{isWon ? 'Nosso valor (R$)' : 'Valor do concorrente (R$)'}</label>
            <input
              type="text"
              inputMode="decimal"
              className={inputCls}
              placeholder="0,00"
              value={isWon ? form.ourPrice : form.competitorPrice}
              onChange={e => set(isWon ? 'ourPrice' : 'competitorPrice', e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>{isWon ? 'Valor do concorrente (R$)' : 'Nosso valor (R$)'}</label>
            <input
              type="text"
              inputMode="decimal"
              className={inputCls}
              placeholder="0,00"
              value={isWon ? form.competitorPrice : form.ourPrice}
              onChange={e => set(isWon ? 'competitorPrice' : 'ourPrice', e.target.value)}
            />
          </div>
        </div>

        {/* Price Difference */}
        <div>
          <label className={labelCls}>Diferença de valor (R$)</label>
          <input
            type="text"
            inputMode="decimal"
            className={inputCls}
            placeholder="0,00"
            value={form.priceDifference}
            onChange={e => set('priceDifference', e.target.value)}
          />
        </div>

        {/* Products */}
        <div>
          <label className={labelCls}>Produtos envolvidos</label>
          <input
            type="text"
            className={inputCls}
            placeholder={isWon ? 'Ex: Internet Fibra 500MB, Firewall' : 'Ex: Switch Gerenciável, Access Point'}
            value={form.productsInvolved}
            onChange={e => set('productsInvolved', e.target.value)}
          />
        </div>

        {/* Loss Reason (only for LOST) */}
        {!isWon && (
          <div>
            <label className={labelCls}>Motivo da perda</label>
            <div className="space-y-2">
              {LOSS_REASONS.map(reason => (
                <label
                  key={reason}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    form.lossReason === reason
                      ? 'border-red-400/60 bg-red-500/10'
                      : 'border-[color:var(--crm-border)] hover:border-red-300/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="closeLossReason"
                    value={reason}
                    checked={form.lossReason === reason}
                    onChange={e => set('lossReason', e.target.value)}
                    className="accent-red-500"
                  />
                  <span className="text-sm font-medium text-[color:var(--crm-ink)]">{reason}</span>
                </label>
              ))}
            </div>
            {form.lossReason === 'Outro' && (
              <textarea
                value={form.customLossReason}
                onChange={e => set('customLossReason', e.target.value)}
                placeholder="Descreva o motivo da perda..."
                className={inputCls + ' mt-2 min-h-[60px] resize-none'}
                rows={2}
              />
            )}
          </div>
        )}

        {/* History / Notes */}
        <div>
          <label className={labelCls}>
            {isWon ? 'Histórico do ganho' : 'Histórico da perda'}
          </label>
          <textarea
            className={inputCls + ' min-h-[100px] resize-none'}
            rows={4}
            placeholder={isWon
              ? 'Descreva os detalhes: como ganhou, pontos fortes, diferenciais, histórico do processo...'
              : 'Descreva os detalhes: por que perdeu, pontos fracos, o que poderia ter sido diferente, histórico do processo...'
            }
            value={form.history}
            onChange={e => set('history', e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[color:var(--crm-border)]">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-xl border border-[color:var(--crm-border)] text-sm font-semibold text-[color:var(--crm-muted)] hover:bg-[color:var(--crm-surface)] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className={`px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all ${
              isWon
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-[0_8px_20px_rgba(16,185,129,0.3)]'
                : 'bg-red-600 hover:bg-red-500 shadow-[0_8px_20px_rgba(220,38,38,0.3)]'
            }`}
          >
            {isWon ? 'Confirmar Ganho' : 'Confirmar Perda'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CloseOpportunityModal;
