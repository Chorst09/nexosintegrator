import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, Filter, X, Plus, Tag, Cpu, HardDrive, 
  Settings, Server, Zap, ChevronDown, ChevronRight 
} from 'lucide-react';

/**
 * Componente de Filtros Avançados de TI
 * Integração com o sistema de busca existente do Portal B2G
 */
const FiltrosTIAvancados = ({ 
  onFiltrosChange, 
  filtrosAtivos = {}, 
  carregando = false 
}) => {
  // Estados
  const [categorias, setCategorias] = useState([]);
  const [categoriasExpandidas, setCategoriasExpandidas] = useState({});
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState([]);
  const [termosCustomizados, setTermosCustomizados] = useState([]);
  const [termoLivre, setTermoLivre] = useState('');
  const [mostrarCampoCustomizado, setMostrarCampoCustomizado] = useState(false);
  const [novoTermo, setNovoTermo] = useState('');

  // Mapa de ícones por categoria
  const iconesCategoria = {
    'termos_gerais': Cpu,
    'hardware': HardDrive,
    'software': Settings,
    'servicos': Zap,
    'infraestrutura': Server
  };

  // Carregar categorias disponíveis
  useEffect(() => {
    carregarCategorias();
  }, []);

  const carregarCategorias = async () => {
    try {
      const response = await fetch('/api/filtros-ti/categorias');
      const data = await response.json();
      
      if (data.success) {
        setCategorias(data.data.categorias);
        // Expandir primeira categoria por padrão
        if (data.data.categorias.length > 0) {
          setCategoriasExpandidas({ [data.data.categorias[0].codigo]: true });
        }
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  // Toggle expansão de categoria
  const toggleCategoria = (codigoCategoria) => {
    setCategoriasExpandidas(prev => ({
      ...prev,
      [codigoCategoria]: !prev[codigoCategoria]
    }));
  };

  // Selecionar/deselecionar categoria
  const toggleSelecaoCategoria = (codigoCategoria) => {
    setCategoriasSelecionadas(prev => {
      const novaSelecao = prev.includes(codigoCategoria)
        ? prev.filter(c => c !== codigoCategoria)
        : [...prev, codigoCategoria];
      
      // Notificar mudança
      notificarMudancaFiltros(novaSelecao, termosCustomizados, termoLivre);
      return novaSelecao;
    });
  };

  // Adicionar termo customizado
  const adicionarTermoCustomizado = useCallback(() => {
    if (novoTermo.trim() && !termosCustomizados.includes(novoTermo.trim())) {
      const novosTermos = [...termosCustomizados, novoTermo.trim()];
      setTermosCustomizados(novosTermos);
      setNovoTermo('');
      setMostrarCampoCustomizado(false);
      
      // Notificar mudança
      notificarMudancaFiltros(categoriasSelecionadas, novosTermos, termoLivre);
    }
  }, [novoTermo, termosCustomizados, categoriasSelecionadas, termoLivre]);

  // Remover termo customizado
  const removerTermoCustomizado = (termo) => {
    const novosTermos = termosCustomizados.filter(t => t !== termo);
    setTermosCustomizados(novosTermos);
    notificarMudancaFiltros(categoriasSelecionadas, novosTermos, termoLivre);
  };

  // Atualizar termo livre
  const handleTermoLivreChange = (valor) => {
    setTermoLivre(valor);
    notificarMudancaFiltros(categoriasSelecionadas, termosCustomizados, valor);
  };

  // Notificar componente pai sobre mudanças
  const notificarMudancaFiltros = (categorias, termos, termo) => {
    if (onFiltrosChange) {
      onFiltrosChange({
        categoriasSelecionadas: categorias,
        termosCustomizados: termos,
        termoLivre: termo.trim(),
        temFiltros: categorias.length > 0 || termos.length > 0 || termo.trim().length > 0
      });
    }
  };

  // Limpar todos os filtros
  const limparFiltros = () => {
    setCategoriasSelecionadas([]);
    setTermosCustomizados([]);
    setTermoLivre('');
    notificarMudancaFiltros([], [], '');
  };

  // Contadores de filtros ativos
  const totalFiltrosAtivos = categoriasSelecionadas.length + termosCustomizados.length + (termoLivre.trim() ? 1 : 0);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Filtros Avançados de TI
          </h3>
          {totalFiltrosAtivos > 0 && (
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
              {totalFiltrosAtivos} ativo{totalFiltrosAtivos !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {totalFiltrosAtivos > 0 && (
          <button
            onClick={limparFiltros}
            className="text-sm text-gray-500 hover:text-red-600 flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Limpar
          </button>
        )}
      </div>

      {/* Campo de busca livre */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Termo Livre
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={termoLivre}
            onChange={(e) => handleTermoLivreChange(e.target.value)}
            placeholder="Digite qualquer palavra-chave..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            disabled={carregando}
          />
        </div>
        <p className="text-xs text-gray-500">
          Ex: desenvolvimento, computador, impressora, etc.
        </p>
      </div>

      {/* Categorias de TI */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Categorias de TI
        </label>
        
        <div className="space-y-2">
          {categorias.map((categoria) => {
            const IconeCategoria = iconesCategoria[categoria.codigo] || Tag;
            const expandida = categoriasExpandidas[categoria.codigo];
            const selecionada = categoriasSelecionadas.includes(categoria.codigo);

            return (
              <div key={categoria.codigo} className="border border-gray-200 dark:border-slate-600 rounded-lg">
                {/* Header da categoria */}
                <div 
                  className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                    selecionada ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selecionada}
                      onChange={() => toggleSelecaoCategoria(categoria.codigo)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <IconeCategoria className="w-4 h-4" style={{ color: categoria.cor }} />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {categoria.nome}
                      </div>
                      <div className="text-xs text-gray-500">
                        {categoria.quantidadePalavras} palavras-chave
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleCategoria(categoria.codigo)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {expandida ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>

                {/* Detalhes da categoria */}
                {expandida && (
                  <div className="p-3 pt-0 border-t border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-750">
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                      {categoria.descricao}
                    </p>
                    {categoria.palavrasChave && categoria.palavrasChave.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Exemplos de termos incluídos:
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {categoria.palavrasChave.slice(0, 5).map((palavra, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded-md bg-white dark:bg-slate-600 text-xs text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-500"
                            >
                              {palavra.palavra}
                            </span>
                          ))}
                          {categoria.palavrasChave.length > 5 && (
                            <span className="text-xs text-gray-400">
                              +{categoria.palavrasChave.length - 5} mais
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Termos customizados */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Termos Personalizados
          </label>
          <button
            onClick={() => setMostrarCampoCustomizado(!mostrarCampoCustomizado)}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Adicionar
          </button>
        </div>

        {/* Campo para novo termo */}
        {mostrarCampoCustomizado && (
          <div className="flex gap-2">
            <input
              type="text"
              value={novoTermo}
              onChange={(e) => setNovoTermo(e.target.value)}
              placeholder="Ex: blockchain, inteligência artificial..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              onKeyPress={(e) => e.key === 'Enter' && adicionarTermoCustomizado()}
            />
            <button
              onClick={adicionarTermoCustomizado}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Adicionar
            </button>
          </div>
        )}

        {/* Lista de termos customizados */}
        {termosCustomizados.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {termosCustomizados.map((termo, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm"
              >
                {termo}
                <button
                  onClick={() => removerTermoCustomizado(termo)}
                  className="ml-2 text-green-600 hover:text-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Resumo dos filtros */}
      {totalFiltrosAtivos > 0 && (
        <div className="pt-3 border-t border-gray-200 dark:border-slate-600">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <strong>Filtros ativos:</strong>
            <ul className="mt-1 space-y-1">
              {categoriasSelecionadas.length > 0 && (
                <li>• {categoriasSelecionadas.length} categoria{categoriasSelecionadas.length !== 1 ? 's' : ''} selecionada{categoriasSelecionadas.length !== 1 ? 's' : ''}</li>
              )}
              {termosCustomizados.length > 0 && (
                <li>• {termosCustomizados.length} termo{termosCustomizados.length !== 1 ? 's' : ''} personalizado{termosCustomizados.length !== 1 ? 's' : ''}</li>
              )}
              {termoLivre.trim() && (
                <li>• Busca livre: "{termoLivre}"</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default FiltrosTIAvancados;