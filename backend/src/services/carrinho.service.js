const carrinhoModel = require('../models/carrinho.model');
const ErroApp = require('../utils/erro-app');
const db = require('../config/base-de-dados');

class CarrinhoService {

  async adicionar(utilizadorId, produtoId, quantidade = 1) {
    // Verificar stock
    const produto = await db('produtos').where('id', produtoId).first();
    if (!produto) throw new ErroApp('Produto não encontrado.', 404);
    if (!produto.aprovado) throw new ErroApp('Produto não está disponível.', 400);

    // Verificar quantidade actual no carrinho
    const existente = await db('carrinho')
      .where({ utilizador_id: utilizadorId, produto_id: produtoId })
      .first();

    const qtdActual = existente ? existente.quantidade : 0;
    const novaQtd = qtdActual + quantidade;

    if (novaQtd > produto.quantidade) {
      throw new ErroApp(`Stock insuficiente. Disponível: ${produto.quantidade}`, 400);
    }

    await carrinhoModel.adicionar(utilizadorId, produtoId, quantidade);
    return await this.resumo(utilizadorId);
  }

  async actualizarQuantidade(utilizadorId, produtoId, quantidade) {
    if (quantidade > 0) {
      const produto = await db('produtos').where('id', produtoId).first();
      if (produto && quantidade > produto.quantidade) {
        throw new ErroApp(`Stock insuficiente. Disponível: ${produto.quantidade}`, 400);
      }
    }

    await carrinhoModel.actualizarQuantidade(utilizadorId, produtoId, quantidade);
    return await this.resumo(utilizadorId);
  }

  async remover(utilizadorId, produtoId) {
    await carrinhoModel.remover(utilizadorId, produtoId);
    return await this.resumo(utilizadorId);
  }

  async removerItem(utilizadorId, itemId) {
    await carrinhoModel.removerItem(utilizadorId, itemId);
    return await this.resumo(utilizadorId);
  }

  async listar(utilizadorId) {
    return await carrinhoModel.listar(utilizadorId);
  }

  async contar(utilizadorId) {
    return await carrinhoModel.contar(utilizadorId);
  }

  async limpar(utilizadorId) {
    await carrinhoModel.limpar(utilizadorId);
    return { itens: 0, total: 0 };
  }

  async resumo(utilizadorId) {
    const itens = await carrinhoModel.listar(utilizadorId);
    let total = 0;
    let totalItens = 0;

    itens.forEach(item => {
      total += parseFloat(item.preco) * item.quantidade;
      totalItens += item.quantidade;
    });

    return {
      itens,
      total: parseFloat(total.toFixed(2)),
      total_itens: totalItens,
      moeda: itens.length > 0 ? itens[0].moeda : 'MZN'
    };
  }
}

module.exports = new CarrinhoService();
