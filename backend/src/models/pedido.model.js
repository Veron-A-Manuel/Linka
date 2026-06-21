const db = require('../config/base-de-dados');

class PedidoModel {
  async listarPorUtilizador(utilizadorId, tipo = 'cliente') {
    if (tipo === 'vendedor') {
      return await db('pedidos as p')
        .select('p.*', 'c.nome as nome_outro', 'c.telefone as telefone_outro', 'c.email as email_outro')
        .leftJoin('utilizadores as c', 'p.cliente_id', 'c.id')
        .where('p.vendedor_id', utilizadorId)
        .orderBy('p.criado_em', 'desc');
    }

    return await db('pedidos as p')
      .select('p.*', 'u.nome as nome_outro', 'v.nome_loja')
      .leftJoin('vendedores as v', 'p.vendedor_id', 'v.id')
      .leftJoin('utilizadores as u', 'v.utilizador_id', 'u.id')
      .where('p.cliente_id', utilizadorId)
      .orderBy('p.criado_em', 'desc');
  }

  async listarTodos() {
    return await db('pedidos as p')
      .select('p.*', 'c.nome as cliente_nome', 'v.nome_loja')
      .leftJoin('utilizadores as c', 'p.cliente_id', 'c.id')
      .leftJoin('vendedores as v', 'p.vendedor_id', 'v.id')
      .orderBy('p.criado_em', 'desc');
  }

  async procurarPorId(id) {
    const pedido = await db('pedidos as p')
      .select('p.*', 'c.nome as cliente_nome', 'v.nome_loja', 'v.utilizador_id as vendedor_utilizador_id')
      .leftJoin('utilizadores as c', 'p.cliente_id', 'c.id')
      .leftJoin('vendedores as v', 'p.vendedor_id', 'v.id')
      .where('p.id', id)
      .first();

    if (pedido) {
      pedido.itens = await db('itens_pedido').where('pedido_id', id);
    }

    return pedido;
  }

  async criar(dadosPedido, itens) {
    return await db.transaction(async (trx) => {
      const [pedido_id] = await trx('pedidos').insert(dadosPedido);

      const itensComId = itens.map((item) => ({
        ...item,
        pedido_id,
      }));

      for (const item of itensComId) {
        const actualizado = await trx('produtos')
          .where({ id: item.produto_id })
          .andWhere('stock', '>=', item.quantidade)
          .decrement('stock', item.quantidade);

        if (!actualizado) {
          throw new Error(`Stock insuficiente para o produto ${item.produto_id}.`);
        }
      }

      await trx('itens_pedido').insert(itensComId);
      return pedido_id;
    });
  }

  async actualizarEstado(id, estado, extras = {}) {
    return await db('pedidos')
      .where('id', id)
      .update({
        estado,
        ...extras,
        actualizado_em: db.fn.now(),
      });
  }
}

module.exports = new PedidoModel();
