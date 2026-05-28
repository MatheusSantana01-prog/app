import { useEffect, useState } from "react"
import { api, formatBRL } from "../lib/api"
import { AlertTriangle } from "lucide-react"

export default function Reports() {
  const [lowStock, setLowStock] = useState([])
  const [dashboard, setDashboard] = useState(null)

  useEffect(() => {
    ;(async () => {
      const [{ data: lowStockData }, { data: dashboardData }] = await Promise.all([
        api.get("/products", { params: { low_stock: true } }),
        api.get("/reports/dashboard"),
      ])
      setLowStock(lowStockData)
      setDashboard(dashboardData)
    })()
  }, [])

  return (
    <div className="p-10 max-w-[1400px]">
      <div className="mb-8">
        <div className="text-[11px] tracking-[0.3em] uppercase text-zinc-500 font-bold">Business Intelligence</div>
        <h1 className="font-display text-4xl font-bold tracking-tight mt-1">Relatórios</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-zinc-200 rounded-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-[#FF3B30]" />
            <div className="text-[11px] tracking-[0.2em] uppercase text-zinc-500 font-bold">Estoque crítico</div>
          </div>
          {lowStock.length === 0 ? (
            <div className="text-sm text-zinc-400 py-8 text-center">Nenhum produto com estoque baixo</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200">
                <tr>
                  <th className="text-left py-2 text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Produto</th>
                  <th className="text-right py-2 text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Atual</th>
                  <th className="text-right py-2 text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Mín.</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((product) => (
                  <tr key={product.id} className="border-b border-zinc-100">
                    <td className="py-2">{product.name}</td>
                    <td className="py-2 text-right font-mono-tab font-bold text-[#FF3B30]">{product.stock}</td>
                    <td className="py-2 text-right font-mono-tab text-zinc-500">{product.min_stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white border border-zinc-200 rounded-sm p-6">
          <div className="text-[11px] tracking-[0.2em] uppercase text-zinc-500 font-bold mb-4">Produtos mais vendidos · 7 dias</div>
          {!dashboard || dashboard.top_products_7d.length === 0 ? (
            <div className="text-sm text-zinc-400 py-8 text-center">Sem dados</div>
          ) : (
            <div className="space-y-3">
              {dashboard.top_products_7d.map((item, index) => (
                <div key={item.id || index} className="flex items-center justify-between gap-3 border-b border-zinc-100 pb-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 bg-[#09090B] text-white text-xs font-bold rounded-sm flex items-center justify-center font-mono-tab">
                      {index + 1}
                    </div>
                    <div className="truncate text-sm font-medium">{item.name}</div>
                  </div>
                  <div className="font-mono-tab text-sm">{item.qty} un</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {dashboard && (
          <div className="bg-white border border-zinc-200 rounded-sm p-6 lg:col-span-2">
            <div className="text-[11px] tracking-[0.2em] uppercase text-zinc-500 font-bold mb-4">Resumo · hoje</div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <div className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Faturamento</div>
                <div className="font-mono-tab text-2xl font-bold mt-1">{formatBRL(dashboard.today_revenue)}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Vendas</div>
                <div className="font-mono-tab text-2xl font-bold mt-1">{dashboard.today_count}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Ticket médio</div>
                <div className="font-mono-tab text-2xl font-bold mt-1">{formatBRL(dashboard.avg_ticket)}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Produtos cadastrados</div>
                <div className="font-mono-tab text-2xl font-bold mt-1">{dashboard.total_products}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
