import { useEffect, useState } from "react"
import { api, formatBRL, formatDate } from "../lib/api"
import { Receipt, X } from "lucide-react"

const PAY = {
  dinheiro: "Dinheiro",
  cartao_debito: "Débito",
  cartao_credito: "Crédito",
  pix: "PIX",
}

export default function Sales() {
  const [sales, setSales] = useState([])
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    ;(async () => {
      const { data } = await api.get("/sales")
      setSales(data)
    })()
  }, [])

  return (
    <div className="p-10 max-w-[1400px]">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="text-[11px] tracking-[0.3em] uppercase text-zinc-500 font-bold">Histórico</div>
          <h1 className="font-display text-4xl font-bold tracking-tight mt-1">Vendas</h1>
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-zinc-500 font-bold">#</th>
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Data</th>
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Operador</th>
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Pagamento</th>
              <th className="text-right px-4 py-3 text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Itens</th>
              <th className="text-right px-4 py-3 text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Total</th>
              <th className="w-16"></th>
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-zinc-400">Nenhuma venda registrada</td>
              </tr>
            )}
            {sales.map((sale) => (
              <tr key={sale.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                <td className="px-4 py-3 font-mono-tab text-xs">{sale.id.slice(0, 8).toUpperCase()}</td>
                <td className="px-4 py-3 font-mono-tab text-xs text-zinc-600">{formatDate(sale.created_at)}</td>
                <td className="px-4 py-3">{sale.operator_name}</td>
                <td className="px-4 py-3">{PAY[sale.payment_method] || sale.payment_method}</td>
                <td className="px-4 py-3 text-right font-mono-tab">{sale.items.length}</td>
                <td className="px-4 py-3 text-right font-mono-tab font-bold">{formatBRL(sale.total)}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    className="text-zinc-500 hover:text-black"
                    onClick={() => setSelected(sale)}
                    data-testid={`view-sale-${sale.id}`}
                  >
                    <Receipt size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 rounded-sm w-full max-w-md">
            <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
              <div className="text-xs uppercase tracking-wider text-zinc-500 font-bold">Detalhes da venda</div>
              <button type="button" onClick={() => setSelected(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="p-6 receipt-paper font-mono-tab text-xs max-h-[70vh] overflow-auto">
              <div className="text-center mb-3">
                <div className="font-bold">Venda #{selected.id.slice(0, 8).toUpperCase()}</div>
                <div className="text-zinc-600">{formatDate(selected.created_at)}</div>
                <div className="text-zinc-600">Operador: {selected.operator_name}</div>
              </div>

              <div className="border-t border-dashed border-zinc-400 py-2">
                {selected.items.map((item, index) => (
                  <div key={index} className="mb-1">
                    <div className="truncate">{item.product_name}</div>
                    <div className="flex justify-between text-zinc-600">
                      <span>{item.quantity} × {formatBRL(item.unit_price)}</span>
                      <span>{formatBRL(item.total)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-zinc-400 pt-2 space-y-1">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatBRL(selected.subtotal)}</span></div>
                {selected.discount > 0 && (
                  <div className="flex justify-between"><span>Desconto</span><span>-{formatBRL(selected.discount)}</span></div>
                )}
                <div className="flex justify-between font-bold text-sm"><span>TOTAL</span><span>{formatBRL(selected.total)}</span></div>
                <div className="flex justify-between"><span>{PAY[selected.payment_method] || selected.payment_method}</span><span>{formatBRL(selected.amount_paid)}</span></div>
                {selected.change > 0 && (
                  <div className="flex justify-between"><span>Troco</span><span>{formatBRL(selected.change)}</span></div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
