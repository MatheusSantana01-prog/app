import { useEffect, useState } from "react"
import { api } from "../lib/api"
import { toast } from "sonner"
import { Plus, Edit, Trash2, X } from "lucide-react"
import { useAuth } from "../context/AuthContext"

const empty = { name: "", contact: "", phone: "", email: "" }

export default function Suppliers() {
  const { user } = useAuth()
  const isAdmin = user?.role === "admin"
  const [items, setItems] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty)
  const [show, setShow] = useState(false)

  const load = async () => {
    const { data } = await api.get("/suppliers")
    setItems(data)
  }

  useEffect(() => {
    load()
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    try {
      if (editing) {
        await api.put(`/suppliers/${editing.id}`, form)
      } else {
        await api.post("/suppliers", form)
      }
      toast.success("Salvo")
      setShow(false)
      setEditing(null)
      setForm(empty)
      load()
    } catch (err) {
      const detail = err?.response?.data?.detail
      toast.error(typeof detail === "string" ? detail : "Erro ao salvar")
    }
  }

  const remove = async (id) => {
    if (!window.confirm("Excluir?")) return
    await api.delete(`/suppliers/${id}`)
    load()
  }

  return (
    <div className="p-10 max-w-5xl">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="text-[11px] tracking-[0.3em] uppercase text-zinc-500 font-bold">Cadeia de suprimentos</div>
          <h1 className="font-display text-4xl font-bold tracking-tight mt-1">Fornecedores</h1>
        </div>
        {isAdmin && (
          <button
            data-testid="add-supplier-btn"
            onClick={() => {
              setEditing(null)
              setForm(empty)
              setShow(true)
            }}
            className="bg-[#09090B] text-white font-bold px-5 py-2.5 rounded-sm hover:bg-[#27272A] flex items-center gap-2"
          >
            <Plus size={18} /> Novo fornecedor
          </button>
        )}
      </div>

      <div className="bg-white border border-zinc-200 rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Nome</th>
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Contato</th>
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Telefone</th>
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-zinc-500 font-bold">E-mail</th>
              <th className="w-24"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-zinc-400">Nenhum fornecedor</td>
              </tr>
            ) : (
              items.map((supplier) => (
                <tr key={supplier.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                  <td className="px-4 py-3 font-medium">{supplier.name}</td>
                  <td className="px-4 py-3 text-zinc-600">{supplier.contact}</td>
                  <td className="px-4 py-3 font-mono-tab text-zinc-600">{supplier.phone}</td>
                  <td className="px-4 py-3 text-zinc-600">{supplier.email}</td>
                  <td className="px-4 py-3 text-right">
                    {isAdmin && (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(supplier)
                            setForm(supplier)
                            setShow(true)
                          }}
                          className="text-zinc-500 hover:text-black"
                          data-testid={`edit-supplier-${supplier.id}`}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(supplier.id)}
                          className="text-zinc-500 hover:text-[#FF3B30]"
                          data-testid={`delete-supplier-${supplier.id}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <form onSubmit={submit} className="bg-white border border-zinc-200 rounded-sm w-full max-w-md p-8">
            <div className="flex justify-between items-start mb-6">
              <h2 className="font-display text-3xl font-bold">{editing ? "Editar" : "Novo"} fornecedor</h2>
              <button type="button" onClick={() => setShow(false)}>
                <X />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold">Nome</label>
                <input
                  data-testid="sup-form-name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-zinc-300 rounded-sm outline-none focus:border-[#09090B]"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold">Contato</label>
                <input
                  data-testid="sup-form-contact"
                  value={form.contact}
                  onChange={(e) => setForm({ ...form, contact: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-zinc-300 rounded-sm outline-none focus:border-[#09090B]"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold">Telefone</label>
                <input
                  data-testid="sup-form-phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-zinc-300 rounded-sm outline-none focus:border-[#09090B]"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold">E-mail</label>
                <input
                  data-testid="sup-form-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-zinc-300 rounded-sm outline-none focus:border-[#09090B]"
                />
              </div>
            </div>

            <button
              data-testid="sup-form-submit"
              type="submit"
              className="w-full mt-6 bg-[#09090B] text-white font-bold py-3 rounded-sm hover:bg-[#27272A]"
            >
              Salvar
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
