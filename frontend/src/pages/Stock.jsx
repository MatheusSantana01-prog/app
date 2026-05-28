import { useEffect, useState } from "react"
import { api, formatDate } from "../lib/api"
import { toast } from "sonner"
import { Plus, X, ArrowUp, ArrowDown, RefreshCw } from "lucide-react"

const TYPE_LABEL = {
  entrada: { label: "Entrada", color: "text-[#00A650]", icon: ArrowUp },
  saida: { label: "Saída", color: "text-[#FF3B30]", icon: ArrowDown },
  ajuste: { label: "Ajuste", color: "text-[#0055FF]", icon: RefreshCw },
}

export default function Stock() {
  const [moves, setMoves] = useState([])
  const [products, setProducts] = useState([])
  const [show, setShow] = useState(false)
  const [form, setForm] = useState({ product_id: "", type: "entrada", quantity: 0, reason: "" })

  const load = async () => {
    const [{ data: m }, { data: p }] = await Promise.all([
      api.get("/stock/movements"),
      api.get("/products"),
    ])

    setMoves(m)
    setProducts(p)
  }

  useEffect(() => {
    load()
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    if (!form.product_id) return toast.error("Selecione um produto")

    try {
      await api.post("/stock/movements", {
        product_id: form.product_id,
        type: form.type,
        quantity: Number(form.quantity),
        reason: form.reason,
      })
      toast.success("Movimentação registrada")
      setShow(false)
      setForm({ product_id: "", type: "entrada", quantity: 0, reason: "" })
      load()
    } catch (err) {
      const detail = err?.response?.data?.detail
      toast.error(typeof detail === "string" ? detail : "Erro ao registrar")
    }
  }

  return (
    <div className="p-10 max-w-[1400px]">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="text-[11px] tracking-[0.3em] uppercase text-zinc-500 font-bold">Movimentações</div>
          <h1 className="font-display text-4xl font-bold tracking-tight mt-1">Estoque</h1>
        </div>
        <button
          data-testid="add-movement-btn"
          onClick={() => setShow(true)}
          className="bg-[#09090B] text-white font-bold px-5 py-2.5 rounded-sm hover:bg-[#27272A] flex items-center gap-2"
        >
          <Plus size={18} /> Nova movimentação
        </button>
      </div>

      <div className="bg-white border border-zinc-200 rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Data/Hora</th>
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Tipo</th>
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Produto</th>
              <th className="text-right px-4 py-3 text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Qtd</th>
              <th className="text-right px-4 py-3 text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Antes</th>
              <th className="text-right px-4 py-3 text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Depois</th>
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Motivo</th>
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Operador</th>
            </tr>
          </thead>
          <tbody>
            {moves.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-zinc-400">Nenhuma movimentação</td>
              </tr>
            ) : (
              moves.map((move) => {
                const type = TYPE_LABEL[move.type] || { label: move.type, color: "text-zinc-500", icon: RefreshCw }
                const Icon = type.icon
                return (
                  <tr key={move.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                    <td className="px-4 py-3 font-mono-tab text-xs text-zinc-600">{formatDate(move.created_at)}</td>
                    <td className={`px-4 py-3 font-medium ${type.color}`}>
                      <span className="inline-flex items-center gap-1"><Icon size={14} /> {type.label}</span>
                    </td>
                    <td className="px-4 py-3">{move.product_name}</td>
                    <td className="px-4 py-3 text-right font-mono-tab font-bold">{move.quantity}</td>
                    <td className="px-4 py-3 text-right font-mono-tab text-zinc-500">{move.stock_before}</td>
                    <td className="px-4 py-3 text-right font-mono-tab">{move.stock_after}</td>
                    <td className="px-4 py-3 text-zinc-600 text-xs">{move.reason}</td>
                    <td className="px-4 py-3 text-zinc-600">{move.operator_name}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <form onSubmit={submit} className="bg-white border border-zinc-200 rounded-sm w-full max-w-md p-8">
            <div className="flex justify-between items-start mb-6">
              <h2 className="font-display text-3xl font-bold">Movimentação</h2>
              <button type="button" onClick={() => setShow(false)}>
                <X size={18} />
              </button>
            </div>

            <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold">Produto</label>
            <select
              data-testid="mov-product"
              required
              value={form.product_id}
              onChange={(e) => setForm({ ...form, product_id: e.target.value })}
              className="w-full mt-1 mb-4 px-3 py-2 border border-zinc-300 rounded-sm outline-none focus:border-[#09090B]"
            >
              <option value="">Selecione...</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} (estoque: {product.stock})
                </option>
              ))}
            </select>

            <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold">Tipo</label>
            <div className="grid grid-cols-3 gap-2 mt-1 mb-4">
              {["entrada", "saida", "ajuste"].map((type) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => setForm({ ...form, type })}
                  className={`py-2 border rounded-sm text-sm font-medium ${form.type === type ? "bg-[#09090B] text-white border-[#09090B]" : "bg-white border-zinc-300 hover:border-[#09090B]"}`}
                >
                  {TYPE_LABEL[type].label}
                </button>
              ))}
            </div>

            <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold">
              {form.type === "ajuste" ? "Estoque correto (absoluto)" : "Quantidade"}
            </label>
            <input
              data-testid="mov-qty"
              required
              type="number"
              step="0.001"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              className="w-full mt-1 mb-4 px-3 py-2 border border-zinc-300 rounded-sm font-mono-tab outline-none focus:border-[#09090B]"
            />

            <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold">Motivo</label>
            <input
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Ex: Compra fornecedor X, quebra, ajuste..."
              className="w-full mt-1 mb-6 px-3 py-2 border border-zinc-300 rounded-sm outline-none focus:border-[#09090B]"
            />

            <button
              data-testid="mov-submit"
              type="submit"
              className="w-full bg-[#09090B] text-white font-bold py-3 rounded-sm hover:bg-[#27272A]"
            >
              Registrar
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
