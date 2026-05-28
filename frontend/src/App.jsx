import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Toaster } from "sonner";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import Products from "./pages/Products";
import Categories from "./pages/Categories";
import Suppliers from "./pages/Suppliers";
import Stock from "./pages/Stock";
import Sales from "./pages/Sales";
import Reports from "./pages/Reports";

function Protected({ children }) {
  const { user, ready } = useAuth();

  if (!ready) {
    return (
      <div className="h-screen flex items-center justify-center text-sm text-zinc-500">
        Carregando...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <Protected>
                <Layout />
              </Protected>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="pdv" element={<POS />} />
            <Route path="produtos" element={<Products />} />
            <Route path="categorias" element={<Categories />} />
            <Route path="fornecedores" element={<Suppliers />} />
            <Route path="estoque" element={<Stock />} />
            <Route path="vendas" element={<Sales />} />
            <Route path="relatorios" element={<Reports />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
