import React, { useState, useEffect } from 'react';
import { api } from '../lib/api'; // Caso precise fazer alguma busca direta
import { comandasService } from '../services/comandas.js'; // <-- EXTENSÃO ADICIONADA AQUI
import { toast } from 'sonner';

export default function Comandas() {
  const [comandas, setComandas] = useState([]);
  const [comandaSelecionada, setComandaSelecionada] = useState(null);
  const [novoCliente, setNovoCliente] = useState('');
  const [buscaProduto, setBuscaProduto] = useState('');
  const [produtosFiltrados, setProdutosFiltrados] = useState([]);
  const [quantidadeItem, setQuantidadeItem] = useState(1);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  
  // Estados de Fechamento de Comanda
  const [modalFechamento, setModalFechamento] = useState(false);
  const [metodoPagamento, setMetodoPagamento] = useState('dinheiro');
  const [valorPago, setValorPago] = useState(0);
  const [desconto, setDesconto] = useState(0);

  useEffect(() => {
    carregarComandas();
  }, []);

  const carregarComandas = async () => {
    try {
      const data = await comandasService.listarAbertas();
      setComandas(data);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao carregar comandas');
    }
  };

  const abrirNovaComanda = async (e) => {
    e.preventDefault();
    if (!novoCliente.trim()) return;
    try {
      await comandasService.abrir(novoCliente);
      toast.success(`Comanda de "${novoCliente}" aberta com sucesso!`);
      setNovoCliente('');
      carregarComandas();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao abrir comanda');
    }
  };

  const pesquisarProduto = async (texto) => {
    setBuscaProduto(texto);
    if (texto.length < 2) {
      setProdutosFiltrados([]);
      return;
    }
    try {
      const res = await api.get(`/products?search=${texto}`);
      setProdutosFiltrados(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const adicionarItem = async () => {
    if (!comandaSelecionada || !produtoSelecionado) return;
    try {
      await comandasService.adicionarItem(
        comandaSelecionada.id,
        produtoSelecionado.id,
        parseFloat(quantidadeItem)
      );
      
      toast.success(`${quantidadeItem}x ${produtoSelecionado.name} lançado!`);

      // Atualiza os dados da comanda na tela
      const atuais = await comandasService.listarAbertas();
      setComandas(atuais);
      const mAtualizada = atuais.find(c => c.id === comandaSelecionada.id);
      setComandaSelecionada(mAtualizada);

      // Limpa a busca de produtos
      setProdutoSelecionado(null);
      setBuscaProduto('');
      setProdutosFiltrados([]);
      setQuantidadeItem(1);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao adicionar item');
    }
  };

  const confirmarFechamento = async () => {
    try {
      await comandasService.fecharEPagar(
        comandaSelecionada.id,
        metodoPagamento,
        parseFloat(valorPago),
        parseFloat(desconto)
      );
      
      toast.success('Comanda fechada e registrada no caixa!');
      setModalFechamento(false);
      setComandaSelecionada(null);
      carregarComandas();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao fechar comanda');
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen flex flex-col gap-6 font-sans">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div>
          <span className="text-xs uppercase tracking-wider font-bold text-slate-400">Ambiente de Bar / Mesas</span>
          <h1 className="text-2xl font-black text-slate-800">Gerenciador de Comandas</h1>
        </div>

        <form onSubmit={abrirNovaComanda} className="flex gap-2">
          <input 
            type="text" 
            placeholder="Nome do cliente ou Mesa..."
            value={novoCliente}
            onChange={e => setNovoCliente(e.target.value)}
            className="border border-slate-300 rounded-lg px-4 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-slate-800"
          />
          <button type="submit" className="bg-slate-900 text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors">
            + Abrir Comanda
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 items-start">
        {/* LISTAGEM DE COMANDAS ABERTAS */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 lg:col-span-1">
          <h2 className="font-bold text-slate-700 mb-4 text-sm uppercase tracking-wider">Comandas Ativas ({comandas.length})</h2>
          <div className="space-y-2 max-h-[650px] overflow-y-auto">
            {comandas.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">Nenhuma comanda aberta no momento.</p>
            ) : (
              comandas.map(c => (
                <div 
                  key={c.id}
                  onClick={() => {
                    setComandaSelecionada(c);
                    setValorPago(c.total_parcial);
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex justify-between items-center ${
                    comandaSelecionada?.id === c.id 
                      ? 'border-slate-900 bg-slate-50 shadow-sm' 
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <h3 className="font-bold text-slate-800">{c.customer_name}</h3>
                    <p className="text-xs text-slate-400">{c.items.length} itens consumidos</p>
                  </div>
                  <span className="font-black text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-sm">
                    R$ {c.total_parcial.toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* DETALHES DA COMANDA SELECIONADA */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl shadow-sm border border-slate-200 min-h-[500px] flex flex-col justify-between">
          {comandaSelecionada ? (
            <>
              <div>
                <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-4">
                  <div>
                    <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full uppercase">Status: Aberta</span>
                    <h2 className="text-xl font-black text-slate-800 mt-1">Comanda de: {comandaSelecionada.customer_name}</h2>
                  </div>
                  <button 
                    onClick={() => setModalFechamento(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors shadow-sm"
                  >
                    $ Fechar Conta / Receber
                  </button>
                </div>

                {/* LANÇADOR DE ITENS */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 flex flex-col md:flex-row gap-3 items-end">
                  <div className="flex-1 relative w-full">
                    <label className="text-xs font-bold text-slate-500 block mb-1">Buscar Produto (Nome ou Código)</label>
                    <input 
                      type="text"
                      placeholder="Bipe ou digite o nome..."
                      value={buscaProduto}
                      onChange={e => pesquisarProduto(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-800"
                    />
                    
                    {/* Dropdown de autocomplete */}
                    {produtosFiltrados.length > 0 && (
                      <div className="absolute left-0 right-0 bg-white border border-slate-200 mt-1 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
                        {produtosFiltrados.map(p => (
                          <div 
                            key={p.id}
                            onClick={() => {
                              setProdutoSelecionado(p);
                              setBuscaProduto(p.name);
                              setProdutosFiltrados([]);
                            }}
                            className="p-2 hover:bg-slate-100 text-sm cursor-pointer flex justify-between"
                          >
                            <span>{p.name}</span>
                            <span className="font-bold">R$ {p.price.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="w-24">
                    <label className="text-xs font-bold text-slate-500 block mb-1">Quant.</label>
                    <input 
                      type="number"
                      min="1"
                      value={quantidadeItem}
                      onChange={e => setQuantidadeItem(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-800 text-center"
                    />
                  </div>

                  <button 
                    onClick={adicionarItem}
                    disabled={!produtoSelecionado}
                    className="bg-slate-900 text-white font-bold text-sm h-9 px-4 rounded-lg hover:bg-slate-800 transition-colors disabled:bg-slate-300 w-full md:w-auto"
                  >
                    Lançar
                  </button>
                </div>

                {/* TABELA DE CONSUMO */}
                <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-2">Produtos Consumidos</h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-xs">
                        <th className="p-3">Item</th>
                        <th className="p-3 text-center">Qtd.</th>
                        <th className="p-3 text-right">Unitário</th>
                        <th className="p-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {comandaSelecionada.items.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="text-center p-6 text-slate-400 italic">Nenhum produto consumido ainda.</td>
                        </tr>
                      ) : (
                        comandaSelecionada.items.map((it, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-3 font-medium text-slate-900">{it.product_name}</td>
                            <td className="p-3 text-center font-bold">{it.quantity}</td>
                            <td className="p-3 text-right">R$ {it.unit_price.toFixed(2)}</td>
                            <td className="p-3 text-right font-bold text-slate-900">R$ {it.total.toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end mt-6 border-t border-slate-100 pt-4">
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-400 block uppercase">Subtotal Consumido</span>
                  <span className="text-3xl font-black text-slate-900">R$ {comandaSelecionada.total_parcial.toFixed(2)}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-slate-400">
              <p className="text-base font-medium">Selecione uma comanda lateral para gerenciar ou lançar itens.</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE FECHAMENTO FINANCEIRO */}
      {modalFechamento && comandaSelecionada && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-xl font-black text-slate-900 mb-2">Fechar Comanda</h2>
            <p className="text-sm text-slate-500 mb-4">Selecione a forma de pagamento para encerrar o atendimento de <strong>{comandaSelecionada.customer_name}</strong>.</p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Forma de Recebimento</label>
                <select 
                  value={metodoPagamento} 
                  onChange={e => setMetodoPagamento(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-slate-800"
                >
                  <option value="dinheiro">Dinheiro 💵</option>
                  <option value="pix">PIX ⚡</option>
                  <option value="cartao_debito">Cartão de Débito 💳</option>
                  <option value="cartao_credito">Cartão de Crédito 💳</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Desconto (R$)</label>
                  <input 
                    type="number" 
                    value={desconto} 
                    onChange={e => setDesconto(e.target.value)} 
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-sm font-bold text-right"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Valor Pago pelo Cliente (R$)</label>
                  <input 
                    type="number" 
                    value={valorPago} 
                    onChange={e => setValorPago(e.target.value)} 
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-sm font-bold text-right"
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5 text-sm font-medium">
                <div className="flex justify-between">
                  <span className="text-slate-500">Consumo Original:</span>
                  <span className="font-bold">R$ {comandaSelecionada.total_parcial.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>Desconto Aplicado:</span>
                  <span className="font-bold">- R$ {parseFloat(desconto || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-black text-slate-900 border-t border-slate-200 pt-1.5 mt-1.5">
                  <span>Total a Pagar:</span>
                  <span>R$ {(comandaSelecionada.total_parcial - parseFloat(desconto || 0)).toFixed(2)}</span>
                </div>
                {metodoPagamento === 'dinheiro' && (
                  <div className="flex justify-between text-emerald-600 font-bold border-t border-dashed border-slate-200 pt-1.5">
                    <span>Troco a devolver:</span>
                    <span>R$ {Math.max(0, parseFloat(valorPago || 0) - (comandaSelecionada.total_parcial - parseFloat(desconto || 0))).toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button 
                  onClick={() => setModalFechamento(false)} 
                  className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Voltar
                </button>
                <button 
                  onClick={confirmarFechamento}
                  className="px-5 py-2 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors shadow-sm"
                >
                  Confirmar e Finalizar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}