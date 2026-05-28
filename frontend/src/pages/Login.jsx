import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { toast } from "sonner"
import { ScanBarcode } from "lucide-react"

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState("admin@mercado.com")
  const [password, setPassword] = useState("admin123")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await login(email, password)
      toast.success("Bem-vindo de volta!")
      navigate("/dashboard")
    } catch (err) {
      const detail = err?.response?.data?.detail
      const msg = typeof detail === "string" ? detail : "Falha ao entrar"
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div
        className="hidden lg:flex flex-col justify-between p-12 text-white relative"
        style={{
          backgroundImage:
            "linear-gradient(rgba(9,9,11,0.85), rgba(9,9,11,0.95)), url('https://images.unsplash.com/photo-1578916171728-46686eac8d58?crop=entropy&cs=srgb&fm=jpg&w=1600&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div>
          <div className="text-[11px] tracking-[0.3em] uppercase text-zinc-400 font-bold">
            Sistema PDV + Estoque
          </div>
          <div className="font-display text-5xl font-bold mt-2">
            Mercado<span className="text-[#00A650]">.</span>
          </div>
        </div>
        <div>
          <p className="font-display text-3xl leading-tight max-w-md">
            Operação rápida.<br />
            Estoque sob controle.<br />
            <span className="text-[#00A650]">Vendas sem fricção.</span>
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4 text-xs uppercase tracking-wider text-zinc-400">
            <div>
              <div className="text-2xl font-mono-tab text-white">PDV</div>
              Frente de caixa
            </div>
            <div>
              <div className="text-2xl font-mono-tab text-white">SKU</div>
              Catálogo
            </div>
            <div>
              <div className="text-2xl font-mono-tab text-white">BI</div>
              Relatórios
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-8 bg-white">
        <form onSubmit={handleSubmit} className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <ScanBarcode className="text-[#09090B]" />
            <span className="font-display text-2xl font-bold">Mercado.</span>
          </div>

          <div className="text-[11px] tracking-[0.3em] uppercase text-zinc-500 font-bold">
            Entrar no sistema
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight mt-2 mb-8">
            Acesse sua conta
          </h1>

          <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold">
            E-mail
          </label>
          <input
            data-testid="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full mt-1 mb-5 px-4 py-3 border border-zinc-200 rounded-sm focus:border-[#09090B] focus:ring-2 focus:ring-zinc-100 outline-none transition-all"
          />

          <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold">
            Senha
          </label>
          <input
            data-testid="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full mt-1 mb-2 px-4 py-3 border border-zinc-200 rounded-sm focus:border-[#09090B] focus:ring-2 focus:ring-zinc-100 outline-none transition-all"
          />

          {error && (
            <div data-testid="login-error" className="text-sm text-red-600 mt-2 mb-2">
              {error}
            </div>
          )}

          <button
            data-testid="login-submit-button"
            type="submit"
            disabled={loading}
            className="w-full mt-6 px-6 py-3.5 bg-[#09090B] text-white font-bold rounded-sm hover:bg-[#27272A] transition-colors disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <div className="mt-8 p-4 bg-zinc-50 border border-zinc-200 rounded-sm text-xs text-zinc-600">
            <div className="font-bold mb-1 text-zinc-700">Credenciais de demonstração:</div>
            <div className="font-mono-tab">admin@mercado.com / admin123</div>
            <div className="font-mono-tab">operador@mercado.com / operador123</div>
          </div>
        </form>
      </div>
    </div>
  )
}
