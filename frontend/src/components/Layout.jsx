import { useAuth } from "../context/AuthContext";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ScanBarcode,
  Package,
  Layers,
  Truck,
  Boxes,
  Receipt,
  BarChart3,
  LogOut,
} from "lucide-react";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard" },
  { to: "/pdv", label: "Frente de Caixa", icon: ScanBarcode, testid: "nav-pdv" },
  { to: "/produtos", label: "Produtos", icon: Package, testid: "nav-produtos" },
  { to: "/categorias", label: "Categorias", icon: Layers, testid: "nav-categorias" },
  { to: "/fornecedores", label: "Fornecedores", icon: Truck, testid: "nav-fornecedores" },
  { to: "/estoque", label: "Estoque", icon: Boxes, testid: "nav-estoque" },
  { to: "/vendas", label: "Vendas", icon: Receipt, testid: "nav-vendas" },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3, testid: "nav-relatorios" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-[#F4F4F5]">
      <aside className="w-64 bg-[#09090B] text-white flex flex-col border-r border-black">
        <div className="px-6 py-6 border-b border-zinc-800">
          <div className="text-[11px] tracking-[0.3em] uppercase text-zinc-500 font-bold">
            Sistema PDV
          </div>
          <div className="font-display text-2xl font-bold mt-1">
            Mercado<span className="text-[#00A650]">.</span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              data-testid={it.testid}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-sm transition-colors ${
                  isActive
                    ? "bg-white text-[#09090B]"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`
              }
            >
              <it.icon size={18} strokeWidth={2} />
              {it.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-zinc-800 p-4">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Operador</div>
          <div className="text-sm font-medium" data-testid="layout-user-name">{user?.name}</div>
          <div className="text-xs text-zinc-500 mb-3">{user?.role === "admin" ? "Administrador" : "Operador"}</div>
          <button
            data-testid="logout-btn"
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            <LogOut size={16} /> Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}