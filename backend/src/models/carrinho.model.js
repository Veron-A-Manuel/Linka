const db = require('../config/base-de-dados');

class CarrinhoModel {

  async adicionar(utilizadorId, produtoId, quantidade = 1) {
    const existente = await db('carrinho')
      .where({ utilizador_id: utilizadorId, produto_id: produtoId })
      .first();

    if (existente) {
      await db('carrinho')
        .where('id', existente.id)
        .update({ quantidade: db.raw('quantidade + ?', [quantidade]) });
      return existente.id;
    }

    const [id] = await db('carrinho').insert({
      utilizador_id: utilizadorId,
      produto_id: produtoId,
      quantidade
    });
    return id;
  }

  async actualizarQuantidade(utilizadorId, produtoId, quantidade) {
    if (quantidade <= 0) {
      return await this.remover(utilizadorId, produtoId);
    }
    return await db('carrinho')
      .where({ utilizador_id: utilizadorId, produto_id: produtoId })
      .update({ quantidade });
  }

  async remover(utilizadorId, produtoId) {
    return await db('carrinho')
      .where({ utilizador_id: utilizadorId, produto_id: produtoId })
      .del();
  }

  async removerItem(utilizadorId, itemId) {
    return await db('carrinho')
      .where({ id: itemId, utilizador_id: utilizadorId })
      .del();
  }

  async listar(utilizadorId) {
    return await db('carrinho as c')
      .select('c.id', 'c.quantidade', 'c.criado_em',
              'p.id as produto_id', 'p.titulo', 'p.preco', 'p.moeda',
              'p.quantidade as stock', 'p.vendedor_id',
              'ip.caminho as imagem_url',
              'u.nome as vendedor_nome')
      .join('produtos as p', 'c.produto_id', 'p.id')
      .join('utilizadores as u', 'p.vendedor_id', 'u.id')
      .leftJoin('imagens_produto as ip', function() {
        this.on('p.id', '=', 'ip.produto_id').andOn('ip.principal', '=', 1);
      })
      .where('c.utilizador_id', utilizadorId)
      .where('p.aprovado', 1)
      .orderBy('c.criado_em', 'desc');
  }

  async contar(utilizadorId) {
    const r = await db('carrinho')
      .where('utilizador_id', utilizadorId)
      .count('id as total');
    return parseInt(r[0].total) || 0;
  }

  async limpar(utilizadorId) {
    return await db('carrinho')
      .where('utilizador_id', utilizadorId)
      .del();
  }
}

module.exports = new CarrinhoModel();
