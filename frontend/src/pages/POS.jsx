import { useEffect, useMemo, useRef, useState } from "react"
import { ScanBarcode, Search, ShoppingCart, X, CreditCard, DollarSign, Lock } from "lucide-react"
import { api } from "../lib/api"

function formatBRL(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value) || 0)
}

export default function POS() {
  const scanRef = useRef(null)
  const [scanInput, setScanInput] = useState("")
  const [search, setSearch] = useState("")
  const [cart, setCart] = useState([])
  
  // Substituindo o mock fixo por um estado dinâmico
  const [dbProducts, setDbProducts] = useState([]) 

  // Estados de controle do fechamento da venda
  const [formaPagamento, setFormaPagamento] = useState("dinheiro")
  const [valorPago, setValorPago] = useState("")
  const [carregando, setCarregando] = useState(false)

  // ESTADOS DO CONTROLE DE CAIXA MULTI-SESSÃO
  const [caixaAtivo, setCaixaAtivo] = useState(false)
  const [dadosCaixa, setDadosCaixa] = useState(null)
  const [verificandoCaixa, setVerificandoCaixa] = useState(true)

  // Campos do formulário de abertura
  const [numCaixaInput, setNumCaixaInput] = useState("")
  const [trocoInicialInput, setTrocoInicialInput] = useState("")

  // Checar se o caixa está aberto e carregar produtos reais do banco
  useEffect(() => {
    checarStatusCaixa()
    carregarProdutosDoBanco()
  }, [])

  const carregarProdutosDoBanco = async () => {
    try {
      const response = await api.get("/products") // Ajuste para a sua rota real de listagem de produtos
      setDbProducts(response.data)
    } catch (error) {
      console.error("Erro ao carregar produtos do banco:", error)
    }
  }

  const checarStatusCaixa = async () => {
    try {
      setVerificandoCaixa(true)
      const response = await api.get("/cash/status")
      if (response.data.active) {
        setCaixaAtivo(true)
        setDadosCaixa(response.data.session)
        setTimeout(() => scanRef.current?.focus(), 100)
      } else {
        setCaixaAtivo(false)
        setDadosCaixa(null)
      }
    } catch (error) {
      console.error("Erro ao checar status do caixa:", error)
    } finally {
      setVerificandoCaixa(false)
    }
  }

  const handleAbrirCaixa = async (e) => {
    e.preventDefault()
    if (!numCaixaInput || !trocoInicialInput) {
      alert("Por favor, preencha o número do caixa e o valor de troco inicial.")
      return
    }

    try {
      setCarregando(true)
      const response = await api.post("/cash/open", {
        caixa_numero: Number(numCaixaInput),
        initial_balance: Number(trocoInicialInput) || 0
      })
      alert(`Caixa ${numCaixaInput} aberto com sucesso!`)
      setCaixaAtivo(true)
      setDadosCaixa(response.data)
      setTimeout(() => scanRef.current?.focus(), 100)
    } catch (error) {
      alert(error.response?.data?.detail || "Erro ao abrir o caixa.")
    } finally {
      setCarregando(false)
    }
  }

  const handleFecharCaixa = async () => {
    const totalNaGavetaEstimado = 
      dadosCaixa.initial_balance + 
      dadosCaixa.total_dinheiro

    const confirmar = window.confirm(
      `Deseja realmente FECHAR o Caixa ${dadosCaixa.caixa_numero}?\n` +
      `Dinheiro estimado na gaveta: ${formatBRL(totalNaGavetaEstimado)}`
    )
    if (!confirmar) return

    const valorContado = prompt("Digite o valor TOTAL em DINHEIRO que você contou fisicamente na gaveta:")
    if (valorContado === null) return 

    try {
      setCarregando(true)
      const response = await api.post("/cash/close", {
        final_balance_reported: Number(valorContado) || 0
      })
      
      const resumo = response.data.summary
      alert(
        `Caixa Fechado com Sucesso!\n\n` +
        `💸 Dinheiro em Vendas: ${formatBRL(resumo.total_dinheiro)}\n` +
        `💳 Cartão de Crédito: ${formatBRL(resumo.total_cartao_credito)}\n` +
        `💳 Cartão de Débito: ${formatBRL(resumo.total_cartao_debito)}\n` +
        `📱 PIX: ${formatBRL(resumo.total_pix)}\n\n` +
        `Valor que você informou na gaveta: ${formatBRL(resumo.final_balance_reported)}`
      )
      
      setCaixaAtivo(false)
      setDadosCaixa(null)
      setCart([])
      setNumCaixaInput("")
      setTrocoInicialInput("")
    } catch (error) {
      alert(error.response?.data?.detail || "Erro ao fechar o caixa.")
    } finally {
      setCarregando(false)
    }
  }

  // Filtro atualizado para ler o estado dbProducts
  const products = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return dbProducts
    return dbProducts.filter((product) => {
      return (
        product.name.toLowerCase().includes(query) ||
        product.barcode?.includes(query)
      )
    })
  }, [search, dbProducts])

  // Busca corrigida para ler do estado dbProducts
  const handleScan = (e) => {
    e.preventDefault()
    const barcode = scanInput.trim()
    if (!barcode) return

    const product = dbProducts.find((item) => item.barcode === barcode)
    if (!product) {
      alert("Produto com este código de barras não cadastrado!")
      return
    }

    setCart((prev) => {
      const exists = prev.find((item) => item.id === product.id)
      if (exists) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prev, { ...product, quantity: 1 }]
    })
    setScanInput("")
  }

  const handleAdd = (product) => {
    setCart((prev) => {
      const exists = prev.find((item) => item.id === product.id)
      if (exists) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prev, { ...product, quantity: 1 }]
    })
  }

  const handleRemove = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id))
  }

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const handleFinalizarVenda = async () => {
    if (cart.length === 0) {
      alert("O carrinho está vazio!")
      return
    }

    if (formaPagamento === "dinheiro" && (!valorPago || Number(valorPago) < total)) {
      alert(`Valor pago em dinheiro é insuficiente! O total é ${formatBRL(total)}`)
      return
    }

    setCarregando(true)
    try {
      const dadosVenda = {
        items: cart.map(item => ({
          product_id: String(item.id), // Agora vai enviar o UUID correto do MongoDB
          quantity: item.quantity,
          unit_price: item.price
        })),
        payment_method: formaPagamento,
        amount_paid: formaPagamento === "dinheiro" ? Number(valorPago) : total,
        discount: 0,
        customer_name: ""
      }

      // IMPORTANTE: Certifique-se de que no backend a rota é @router.post("/sales") 
      // ou se necessita do prefixo completo caso a instância não use baseURL
      const response = await api.post("/sales", dadosVenda)
      alert("🎉 Venda realizada com sucesso!")
      
      if (response.data.change > 0) {
        alert(`Troco do cliente: ${formatBRL(response.data.change)}`)
      }

      setCart([])
      setValorPago("")
      setFormaPagamento("dinheiro")
      
      checarStatusCaixa()
    } catch (error) {
      console.error(error)
      alert(error.response?.data?.detail || "Erro ao finalizar a venda.")
    } finally {
      setCarregando(false)
    }
  }

  if (verificandoCaixa) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] text-zinc-500 font-medium">
        Verificando permissões e caixas ativos...
      </div>
    )
  }

  if (!caixaAtivo) {
    return (
      <div className="flex items-center justify-center min-h-[85vh] p-4">
        <div className="bg-white border border-zinc-200 rounded-sm p-8 shadow-md max-w-md w-full">
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-900 mb-3">
              <Lock size={22} />
            </div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-zinc-900">Abertura de Caixa</h2>
            <p className="text-sm text-zinc-500 text-center mt-1">Identificamos que você não possui um turno aberto neste terminal.</p>
          </div>

          <form onSubmit={handleAbrirCaixa} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-zinc-500 font-bold mb-2">
                Número do Caixa (Terminal)
              </label>
              <input
                type="number"
                placeholder="Ex: 1"
                value={numCaixaInput}
                onChange={(e) => setNumCaixaInput(e.target.value)}
                className="w-full border border-zinc-300 rounded-sm px-4 py-2.5 text-sm outline-none focus:border-[#09090B]"
                required
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-zinc-500 font-bold mb-2">
                Fundo de Troco Inicial (Dinheiro)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="R$ 0,00"
                value={trocoInicialInput}
                onChange={(e) => setTrocoInicialInput(e.target.value)}
                className="w-full border border-zinc-300 rounded-sm px-4 py-2.5 text-sm outline-none focus:border-[#09090B] font-mono-tab"
                required
              />
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="w-full text-center py-3 bg-[#09090B] text-white text-sm font-bold uppercase tracking-wider rounded-sm hover:bg-[#27272A] transition-colors disabled:bg-zinc-400 mt-2"
            >
              {carregando ? "Abrindo..." : "🔓 Abrir Turno de Caixa"}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="p-10 max-w-[1600px]">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase text-zinc-500 font-bold">
            Ponto de venda <span>•</span> <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Caixa {dadosCaixa?.caixa_numero} Aberto</span>
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight mt-1">PDV</h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 text-sm text-zinc-500">
            <ShoppingCart size={18} /> {cart.length} item(s)
          </div>
          <button
            onClick={handleFecharCaixa}
            className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 border border-[#FF3B30] text-[#FF3B30] rounded-sm hover:bg-red-50 transition-colors"
          >
            🔒 Fechar Caixa
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_0.6fr] gap-6">
        <div className="bg-white border border-zinc-200 rounded-sm p-6 shadow-sm">
          <div className="text-sm uppercase tracking-[0.3em] text-zinc-500 font-bold mb-4">Scanner e busca</div>
          <div className="mt-5 flex gap-3">
            <form onSubmit={handleScan} className="flex-1 flex items-center gap-3 border border-zinc-300 rounded-sm bg-white px-4 py-3 focus-within:border-[#09090B]">
              <ScanBarcode size={20} className="text-zinc-500" />
              <input
                ref={scanRef}
                data-testid="pos-barcode-input"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder="Bipe ou digite o código de barras"
                className="flex-1 outline-none font-mono-tab text-base"
              />
              <button type="submit" className="sr-only" aria-hidden="true" tabIndex={-1}>Adicionar</button>
            </form>

            <div className="w-64 relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                data-testid="pos-search-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar produtos..."
                className="w-full pl-11 pr-4 py-3 border border-zinc-300 rounded-sm bg-white outline-none focus:border-[#09090B]"
              />
            </div>
          </div>

          <div className="mt-8 space-y-3">
            {products.map((product) => (
              <div key={product.id} className="flex items-center justify-between gap-3 rounded-sm border border-zinc-200 p-4 hover:bg-zinc-50">
                <div>
                  <div className="text-sm font-semibold">{product.name}</div>
                  <div className="text-xs text-zinc-500">{product.barcode}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="font-mono-tab font-semibold">{formatBRL(product.price)}</div>
                  <button
                    type="button"
                    onClick={() => handleAdd(product)}
                    className="px-3 py-1 rounded-sm bg-[#09090B] text-white text-sm hover:bg-[#27272A]"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-sm p-6 shadow-sm flex flex-col justify-between min-h-[400px]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm uppercase tracking-[0.3em] text-zinc-500 font-bold">Carrinho</div>
              <span className="text-sm text-zinc-500 font-bold">Total {formatBRL(total)}</span>
            </div>
            
            {cart.length === 0 ? (
              <div className="text-center py-16 text-zinc-400">Carrinho vazio</div>
            ) : (
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 rounded-sm border border-zinc-200 p-3">
                    <div>
                      <div className="font-medium text-sm">{item.name}</div>
                      <div className="text-xs text-zinc-500">{item.quantity} x {formatBRL(item.price)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="font-mono-tab text-sm font-semibold">{formatBRL(item.price * item.quantity)}</div>
                      <button
                        type="button"
                        onClick={() => handleRemove(item.id)}
                        className="text-zinc-500 hover:text-[#FF3B30]"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {cart.length > 0 && (
            <div className="mt-6 pt-6 border-t border-zinc-200 space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-bold mb-2">
                  Forma de Pagamento
                </label>
                <select
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value)}
                  className="w-full bg-white border border-zinc-300 rounded-sm px-3 py-2 text-sm outline-none focus:border-[#09090B] font-medium"
                >
                  <option value="dinheiro">💸 Dinheiro</option>
                  <option value="cartao_debito">💳 Cartão de Débito</option>
                  <option value="cartao_credito">💳 Cartão de Crédito</option>
                  <option value="pix">📱 PIX</option>
                </select>
              </div>

              {formaPagamento === "dinheiro" && (
                <div className="animate-in fade-in duration-200">
                  <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-bold mb-2">
                    Valor Recebido
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="R$ 0,00"
                    value={valorPago}
                    onChange={(e) => setValorPago(e.target.value)}
                    className="w-full border border-zinc-300 rounded-sm px-3 py-2 text-sm outline-none focus:border-[#09090B] font-mono-tab"
                  />
                  {Number(valorPago) > total && (
                    <div className="mt-2 text-xs text-emerald-600 font-medium">
                      Troco estimado: {formatBRL(Number(valorPago) - total)}
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={handleFinalizarVenda}
                disabled={carregando}
                className="w-full text-center py-3 bg-[#09090B] text-white text-sm font-bold uppercase tracking-wider rounded-sm hover:bg-[#27272A] active:bg-zinc-800 transition-colors disabled:bg-zinc-400"
              >
                {carregando ? "Processando Venda..." : "🔒 Finalizar Compra"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}