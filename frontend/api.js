import axios from "axios";

export const api = axios.create({
  // ✅ Corrigido para ler a variável de ambiente do Vite de forma segura
  baseURL: import.meta.env.VITE_BACKEND_URL || "http://localhost:8000",
});

// Configuração opcional para injetar o token do localStorage se ele existir
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
