import { useEffect, useState } from "react"
import { api, formatBRL } from "../lib/api"
import { toast } from "sonner"
import { Plus, Edit, Trash2, X, Search } from "lucide-react"
import { useAuth } from "../context/AuthContext"

const empty = {
  barcode: "",
  name: "",
  description: "",
  price: 0,
  cost: 0,
  stock: 0,
  min_stock: 0,
  unit: "un",
  category_id: "",
  supplier_id: "",
  image_url: "",
}

export default function Products() {
  const { user } = useAuth()
  const isAdmin = user?.role === "admin"
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty)

  const load = async () => {
    const [{ data: p }, { data: c }, { data: s }] = await Promise.all([
      api.get("/products", { params: { search } }),
      api.get("/categories"),
      api.get("/suppliers"),
    ])
    setProducts(p)
    setCategories(c)
    setSuppliers(s)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const openCreate = () => {
    setEditing(null)
    setForm(empty)
    setShowForm(true)
  }

  const openEdit = (product) => {
    setEditing(product)
    setForm({ ...empty, ...product })
    setShowForm(true)
  }

  const submit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        cost: Number(form.cost),
        stock: Number(form.stock),
        min_stock: Number(form.min_stock),
      }

      if (editing) {
        await api.put(`/products/${editing.id}`, payload)
        toast.success("Produto atualizado")
      } else {
        await api.post("/products", payload)
        toast.success("Produto criado")
      }

      setShowForm(false)
      load()
    } catch (err) {
      const detail = err?.response?.data?.detail
      toast.error(typeof detail === "string" ? detail : "Erro ao salvar")
    }
  }

  const remove = async (id) => {
    if (!window.confirm("Excluir produto?")) return
    await api.delete(`/products/${id}`)
    toast.success("Excluído")
    load()
  }

  return (
    <div className="p-10 max-w-[1600px]">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="text-[11px] tracking-[0.3em] uppercase text-zinc-500 font-bold">Catálogo</div>
          <h1 className="font-display text-4xl font-bold tracking-tight mt-1">Produtos</h1>
        </div>
        {isAdmin && (
          <button
            data-testid="inventory-add-product-btn"
            onClick={openCreate}
            className="bg-[#09090B] text-white font-bold px-5 py-2.5 rounded-sm hover:bg-[#27272A] flex items-center gap-2"
          >
            <Plus size={18} /> Novo produto
          </button>
        )}
      </div>

      <div className="bg-white border border-zinc-200 rounded-sm mb-4 p-4 flex items-center gap-3">
        <Search size={18} className="text-zinc-500" />
        <input
          data-testid="products-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou código de barras..."
          className="flex-1 outline-none"
        />
      </div>

      <div className="bg-white border border-zinc-200 rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Cód. Barras</th>
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Produto</th>
              <th className="text-right px-4 py-3 text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Preço</th>
              <th className="text-right px-4 py-3 text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Estoque</th>
              <th className="text-right px-4 py-3 text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Mín.</th>
              <th className="w-24"></th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-zinc-400 text-sm">Nenhum produto</td>
              </tr>
            )}
            {products.map((product) => (
              <tr key={product.id} className="border-b border-zinc-100 hover:bg-zinc-50" data-testid={`product-row-${product.id}`}>
                <td className="px-4 py-3 font-mono-tab text-xs text-zinc-600">{product.barcode}</td>
                <td className="px-4 py-3 font-medium">{product.name}</td>
                <td className="px-4 py-3 text-right font-mono-tab">{formatBRL(product.price)}</td>
                <td className={`px-4 py-3 text-right font-mono-tab font-bold ${product.stock <= product.min_stock ? "text-[#FF3B30]" : ""}`}>
                  {product.stock} {product.unit}
                </td>
                <td className="px-4 py-3 text-right font-mono-tab text-zinc-500">{product.min_stock}</td>
                <td className="px-4 py-3 text-right">
                  {isAdmin && (
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(product)}
                        className="text-zinc-500 hover:text-black"
                        data-testid={`edit-product-${product.id}`}
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(product.id)}
                        className="text-zinc-500 hover:text-[#FF3B30]"
                        data-testid={`delete-product-${product.id}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <form onSubmit={submit} className="bg-white border border-zinc-200 rounded-sm w-full max-w-2xl p-8 max-h-[90vh] overflow-auto">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="text-[11px] tracking-[0.3em] uppercase text-zinc-500 font-bold">Produto</div>
                <h2 className="font-display text-3xl font-bold tracking-tight">{editing ? "Editar" : "Novo produto"}</h2>
              </div>
              <button type="button" onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-black">
                <X />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Código de barras" required>
                <input
                  data-testid="form-product-barcode"
                  required
                  value={form.barcode}
                  onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-sm font-mono-tab outline-none focus:border-[#09090B]"
                />
              </Field>
              <Field label="Nome" required>
                <input
                  data-testid="form-product-name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-sm outline-none focus:border-[#09090B]"
                />
              </Field>
              <Field label="Preço de venda (R$)" required>
                <input
                  data-testid="form-product-price"
                  required
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-sm font-mono-tab outline-none focus:border-[#09090B]"
                />
              </Field>
              <Field label="Custo (R$)">
                <input
                  type="number"
                  step="0.01"
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-sm font-mono-tab outline-none focus:border-[#09090B]"
                />
              </Field>
              <Field label="Estoque atual">
                <input
                  data-testid="form-product-stock"
                  type="number"
                  step="0.001"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-sm font-mono-tab outline-none focus:border-[#09090B]"
                />
              </Field>
              <Field label="Estoque mínimo">
                <input
                  type="number"
                  step="0.001"
                  value={form.min_stock}
                  onChange={(e) => setForm({ ...form, min_stock: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-sm font-mono-tab outline-none focus:border-[#09090B]"
                />
              </Field>
              <Field label="Unidade">
                <input
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-sm outline-none focus:border-[#09090B]"
                />
              </Field>
              <Field label="Categoria">
                <select
                  value={form.category_id || ""}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-sm outline-none focus:border-[#09090B]"
                >
                  <option value="">Sem categoria</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Fornecedor" wide>
                <select
                  value={form.supplier_id || ""}
                  onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-sm outline-none focus:border-[#09090B]"
                >
                  <option value="">Sem fornecedor</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                data-testid="form-product-submit"
                type="submit"
                className="flex-1 bg-[#09090B] text-white font-bold py-3 rounded-sm hover:bg-[#27272A]"
              >
                {editing ? "Salvar alterações" : "Criar produto"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 border border-zinc-300 rounded-sm hover:bg-zinc-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function Field({ label, required, wide, children }) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold">
        {label}{required && <span className="text-[#FF3B30] ml-1">*</span>}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  )
}
