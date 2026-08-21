import axios from 'axios';

// 1. Cria a validação para identificar onde o frontend está rodando
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// 2. Substitua o bloco antigo por este:
export const api = axios.create({
  baseURL: isLocalhost 
    ? 'http://127.0.0' 
    : 'https://onrender.com',
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
