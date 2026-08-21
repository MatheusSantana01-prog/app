import axios from 'axios';

// Cria a instância do Axios para se conectar ao backend FastAPI adicionando o prefixo /api
export const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api', 
});

// Adiciona o token de autenticação em cada requisição automaticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Função utilitária para formatar valores em Real (R$)
export const formatBRL = (value) => {
  if (value === undefined || value === null) return 'R$ 0,00';
  return Number(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

// Função utilitária para formatar datas no padrão brasileiro
export const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};