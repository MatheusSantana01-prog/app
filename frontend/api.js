import axios from "axios";

// Deixando o nome padrão igual em tudo: BACKEND_URL
export const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Agora sim ela vai existir aqui embaixo!
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

// ... resto do seu código (interceptors, formatBRL, formatDate) permanecem iguais!