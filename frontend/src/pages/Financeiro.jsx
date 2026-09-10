import { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  Calendar,
  PieChart,
  FileText,
  Settings
} from 'lucide-react';

export default function Financeiro() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/gestao/financeiro/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDashboard(data);
      }
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Módulo Financeiro</h1>
        <p className="text-gray-600 mt-1">Gestão completa de receitas e despesas</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: PieChart },
            { id: 'receber', label: 'Contas a Receber', icon: TrendingUp },
            { id: 'pagar', label: 'Contas a Pagar', icon: TrendingDown },
            { id: 'relatorios', label: 'Relatórios', icon: FileText },
            { id: 'config', label: 'Configurações', icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <tab.icon className="w-5 h-5 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Dashboard Content */}
      {activeTab === 'dashboard' && dashboard && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total a Receber</p>
                  <p className="text-2xl font-bold text-green-600 mt-2">
                    {formatCurrency(dashboard.totalReceber)}
                  </p>
                </div>
                <div className="bg-green-100 rounded-full p-3">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total a Pagar</p>
                  <p className="text-2xl font-bold text-red-600 mt-2">
                    {formatCurrency(dashboard.totalPagar)}
                  </p>
                </div>
                <div className="bg-red-100 rounded-full p-3">
                  <TrendingDown className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Saldo Projetado</p>
                  <p className={`text-2xl font-bold mt-2 ${
                    dashboard.saldoProjetado >= 0 ? 'text-blue-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(dashboard.saldoProjetado)}
                  </p>
                </div>
                <div className="bg-blue-100 rounded-full p-3">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Contas Vencidas</p>
                  <p className="text-2xl font-bold text-orange-600 mt-2">
                    {(dashboard.contasVencidas?.receber || 0) + (dashboard.contasVencidas?.pagar || 0)}
                  </p>
                </div>
                <div className="bg-orange-100 rounded-full p-3">
                  <AlertCircle className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Receitas e Despesas do Mês */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Receitas do Mês</h3>
              <p className="text-3xl font-bold text-green-600">
                {formatCurrency(dashboard.receitasMes)}
              </p>
              <p className="text-sm text-gray-500 mt-2">Contas recebidas no mês atual</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Despesas do Mês</h3>
              <p className="text-3xl font-bold text-red-600">
                {formatCurrency(dashboard.despesasMes)}
              </p>
              <p className="text-sm text-gray-500 mt-2">Contas pagas no mês atual</p>
            </div>
          </div>

          {/* Alertas */}
          {dashboard.contasVencidas && (dashboard.contasVencidas.receber > 0 || dashboard.contasVencidas.pagar > 0) && (
            <div className="bg-orange-50 border-l-4 border-orange-400 p-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-orange-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-orange-800">
                    Atenção: Existem contas vencidas
                  </p>
                  <p className="text-sm text-orange-700 mt-1">
                    {dashboard.contasVencidas.receber} contas a receber e {dashboard.contasVencidas.pagar} contas a pagar vencidas
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Contas a Receber */}
      {activeTab === 'receber' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Contas a Receber</h2>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Nova Conta
            </button>
          </div>
          <div className="text-center py-12 text-gray-500">
            <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>Funcionalidade de listagem em desenvolvimento</p>
            <p className="text-sm mt-2">Use a API diretamente: GET /api/gestao/financeiro/contas-receber</p>
          </div>
        </div>
      )}

      {/* Contas a Pagar */}
      {activeTab === 'pagar' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Contas a Pagar</h2>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Nova Conta
            </button>
          </div>
          <div className="text-center py-12 text-gray-500">
            <TrendingDown className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>Funcionalidade de listagem em desenvolvimento</p>
            <p className="text-sm mt-2">Use a API diretamente: GET /api/gestao/financeiro/contas-pagar</p>
          </div>
        </div>
      )}

      {/* Relatórios */}
      {activeTab === 'relatorios' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Relatórios Financeiros</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer">
              <h3 className="font-semibold text-lg mb-2">DRE - Demonstração do Resultado</h3>
              <p className="text-sm text-gray-600 mb-4">Visualize receitas, custos e lucros do período</p>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                Gerar DRE →
              </button>
            </div>
            <div className="border rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer">
              <h3 className="font-semibold text-lg mb-2">Fluxo de Caixa</h3>
              <p className="text-sm text-gray-600 mb-4">Projeção de entradas e saídas futuras</p>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                Gerar Fluxo →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Configurações */}
      {activeTab === 'config' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Configurações</h2>
          <div className="space-y-4">
            <div className="border-b pb-4">
              <h3 className="font-semibold mb-2">Categorias Financeiras</h3>
              <p className="text-sm text-gray-600">Gerenciar categorias de receitas e despesas</p>
            </div>
            <div className="border-b pb-4">
              <h3 className="font-semibold mb-2">Centros de Custo</h3>
              <p className="text-sm text-gray-600">Configurar centros de custo para alocação</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
