import { api } from "../lib/api"
import { toast } from "sonner"
import { Plus, Edit, Trash2, X } from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { useEffect, useState } from "react"

export default function Categories() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [show, setShow] = useState(false);

  const load = async () => {
    const { data } = await api.get("/categories");
    setItems(data);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editing) await api.put(`/categories/${editing.id}`, form);
      else await api.post("/categories", form);
      toast.success("Salvo");
      setShow(false); setEditing(null); setForm({ name: "", description: "" });
      load();
    } catch (err) {
      toast.error("Erro ao salvar");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Excluir?")) return;
    await api.delete(`/categories/${id}`);
    load();
  };

  return (
    <div className="p-10 max-w-4xl">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="text-[11px] tracking-[0.3em] uppercase text-zinc-500 font-bold">Organização</div>
          <h1 className="font-display text-4xl font-bold tracking-tight mt-1">Categorias</h1>
        </div>
        {isAdmin && (
          <button data-testid="add-category-btn" onClick={() => { setEditing(null); setForm({ name: "", description: "" }); setShow(true); }}
            className="bg-[#09090B] text-white font-bold px-5 py-2.5 rounded-sm hover:bg-[#27272A] flex items-center gap-2">
            <Plus size={18} /> Nova categoria
          </button>
        )}
      </div>

      <div className="bg-white border border-zinc-200 rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Nome</th>
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Descrição</th>
              <th className="w-24"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={3} className="text-center py-12 text-zinc-400">Nenhuma categoria</td></tr>}
            {items.map((c) => (
              <tr key={c.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-zinc-600">{c.description}</td>
                <td className="px-4 py-3 text-right">
                  {isAdmin && (
                    <div className="flex justify-end gap-2">
                      <button onClick={() => { setEditing(c); setForm(c); setShow(true); }}><Edit size={16} className="text-zinc-500 hover:text-black" /></button>
                      <button onClick={() => remove(c.id)}><Trash2 size={16} className="text-zinc-500 hover:text-[#FF3B30]" /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <form onSubmit={submit} className="bg-white border border-zinc-200 rounded-sm w-full max-w-md p-8">
            <div className="flex justify-between items-start mb-6">
              <h2 className="font-display text-3xl font-bold">{editing ? "Editar" : "Nova"} categoria</h2>
              <button type="button" onClick={() => setShow(false)}><X /></button>
            </div>
            <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold">Nome</label>
            <input data-testid="cat-form-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full mt-1 mb-4 px-3 py-2 border border-zinc-300 rounded-sm outline-none focus:border-[#09090B]" />
            <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold">Descrição</label>
            <textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full mt-1 mb-6 px-3 py-2 border border-zinc-300 rounded-sm outline-none focus:border-[#09090B]" rows={3} />
            <button data-testid="cat-form-submit" type="submit" className="w-full bg-[#09090B] text-white font-bold py-3 rounded-sm hover:bg-[#27272A]">
              Salvar
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
