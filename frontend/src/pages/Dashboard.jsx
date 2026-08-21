import { useEffect, useState } from "react"
import { api, formatBRL } from "../lib/api"
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts"
import { TrendingUp, ShoppingCart, Package, AlertTriangle } from "lucide-react"

const PageHeader = ({ subtitle, title, children }) => (
  <div className="flex items-end justify-between mb-8">
    <div>
      <div className="text-[11px] tracking-[0.3em] uppercase text-zinc-500 font-bold">
        {subtitle}
      </div>
      <h1 className="font-display text-4xl font-bold tracking-tight mt-1">{title}</h1>
    </div>
    {children}
  </div>
)

const StatCard = ({ label, value, icon: Icon, accent, testid }) => (
  <div
    data-testid={testid}
    className="bg-white border border-zinc-200 p-6 rounded-sm hover:border-zinc-400 transition-colors"
  >
    <div className="flex items-start justify-between">
      <div className="text-[11px] tracking-[0.2em] uppercase text-zinc-500 font-bold">
        {label}
      </div>
      <Icon size={18} className={accent} />
    </div>
    <div className="font-mono-tab text-3xl font-bold mt-3 tracking-tight">{value}</div>
  </div>
)

export default function Dashboard() {
  const [data, setData] = useState(null)

  useEffect(() => {
    ;(async () => {
      const { data } = await api.get("/reports/dashboard")
      setData(data)
    })()
  }, [])

  if (!data) {
    return <div className="p-12 text-sm text-zinc-500">Carregando dashboard...</div>
  }

  return (
    <div className="p-10 max-w-[1600px]">
      <PageHeader subtitle="Operação · Hoje" title="Dashboard" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          testid="stat-revenue"
          label="Faturamento de hoje"
          value={formatBRL(data.today_revenue)}
          icon={TrendingUp}
          accent="text-[#00A650]"
        />
        <StatCard
          testid="stat-sales-count"
          label="Vendas hoje"
          value={data.today_count}
          icon={ShoppingCart}
          accent="text-[#0055FF]"
        />
        <StatCard
          testid="stat-avg-ticket"
          label="Ticket médio"
          value={formatBRL(data.avg_ticket)}
          icon={TrendingUp}
          accent="text-[#09090B]"
        />
        <StatCard
          testid="stat-low-stock"
          label="Estoque crítico"
          value={`${data.low_stock_count}/${data.total_products}`}
          icon={AlertTriangle}
          accent="text-[#FF3B30]"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-sm p-6">
          <div className="text-[11px] tracking-[0.2em] uppercase text-zinc-500 font-bold mb-4">
            Faturamento · últimos 7 dias
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.series_7d}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#71717A" tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} stroke="#71717A" tickFormatter={(v) => `R$${v}`} />
              <Tooltip formatter={(v) => formatBRL(v)} />
              <Line type="monotone" dataKey="total" stroke="#09090B" strokeWidth={2.5} dot={{ r: 4, fill: "#00A650" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-zinc-200 rounded-sm p-6">
          <div className="text-[11px] tracking-[0.2em] uppercase text-zinc-500 font-bold mb-4">
            Top produtos · 7 dias
          </div>
          {data.top_products_7d.length === 0 ? (
            <div className="text-sm text-zinc-400 py-8 text-center">Sem dados ainda</div>
          ) : (
            <div className="space-y-3">
              {data.top_products_7d.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 bg-[#09090B] text-white text-xs font-bold rounded-sm flex items-center justify-center font-mono-tab">
                      {idx + 1}
                    </div>
                    <div className="truncate text-sm font-medium">{p.name}</div>
                  </div>
                  <div className="font-mono-tab text-sm">{p.qty}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-3 bg-white border border-zinc-200 rounded-sm p-6">
          <div className="text-[11px] tracking-[0.2em] uppercase text-zinc-500 font-bold mb-4">
            Formas de pagamento · hoje
          </div>
          {data.payment_methods_today.length === 0 ? (
            <div className="text-sm text-zinc-400 py-8 text-center">Sem vendas hoje</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.payment_methods_today}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
                <XAxis dataKey="method" tick={{ fontSize: 11 }} stroke="#71717A" />
                <YAxis tick={{ fontSize: 11 }} stroke="#71717A" tickFormatter={(v) => `R$${v}`} />
                <Tooltip formatter={(v) => formatBRL(v)} />
                <Bar dataKey="total" fill="#0055FF" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
