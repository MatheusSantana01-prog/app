import { api } from '../lib/api';

export const comandasService = {
  async listarAbertas() {
    const response = await api.get('/comandas');
    return response.data;
  },

  async abrir(customerName) {
    const response = await api.post('/comandas', {
      customer_name: customerName,
    });

    return response.data;
  },

  async adicionarItem(comandaId, produtoId, quantidade) {
    const response = await api.post(`/comandas/${comandaId}/itens`, {
      product_id: produtoId,
      quantity: quantidade,
    });

    return response.data;
  },

  async fecharEPagar(
    comandaId,
    metodoPagamento,
    valorPago,
    desconto = 0
  ) {
    const response = await api.post(`/comandas/${comandaId}/fechar`, {
      payment_method: metodoPagamento,
      amount_paid: valorPago,
      discount: desconto,
    });

    return response.data;
  },
};