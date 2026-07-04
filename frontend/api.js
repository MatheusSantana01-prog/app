import axios from "axios";

export const URL_BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Criamos a rota com o prefixo /api que o seu FastAPI espera
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API, // <-- Aqui estava o segredo! Usando a variável com /api integrado
  withCredentials: true,
});

// Mantém os seus interceptors idênticos
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Mantém a sua função de formatar Moeda (R$)
export function formatBRL(n) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(n) || 0);
}

// Mantém a sua função de formatar Data
export function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR");
}
