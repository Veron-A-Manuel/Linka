const db = require('../config/base-de-dados');

class AvaliacaoModel {

  async criar(dados) {
    const [id] = await db('avaliacoes').insert(dados);
    return id;
  }

  async procurarPorId(id) {
    return await db('avaliacoes as a')
      .select('a.*', 'u.nome as avaliador_nome', 'u.avatar as avaliador_avatar')
      .join('utilizadores as u', 'a.avaliador_id', 'u.id')
      .where('a.id', id)
      .first();
  }

  async listarPorAvaliado(avaliadoId, tipo = null) {
    let query = db('avaliacoes as a')
      .select('a.*', 'u.nome as avaliador_nome', 'u.avatar as avaliador_avatar')
      .join('utilizadores as u', 'a.avaliador_id', 'u.id')
      .where('a.avaliado_id', avaliadoId);

    if (tipo) query = query.where('a.tipo', tipo);

    return await query.orderBy('a.criado_em', 'desc');
  }

  async listarPorProduto(produtoId) {
    return await db('avaliacoes as a')
      .select('a.*', 'u.nome as avaliador_nome', 'u.avatar as avaliador_avatar')
      .join('utilizadores as u', 'a.avaliador_id', 'u.id')
      .where('a.produto_id', produtoId)
      .where('a.tipo', 'produto')
      .orderBy('a.criado_em', 'desc');
  }

  async listarPorPedido(pedidoId) {
    return await db('avaliacoes')
      .where('pedido_id', pedidoId);
  }

  async verificarSeJaAvaliou(avaliadorId, pedidoId, tipo) {
    return await db('avaliacoes')
      .where({ avaliador_id: avaliadorId, pedido_id: pedidoId, tipo })
      .first();
  }

  async mediaEstrelas(avaliadoId, tipo) {
    const resultado = await db('avaliacoes')
      .where({ avaliado_id: avaliadoId, tipo })
      .avg('estrelas as media')
      .count('id as total');
    return {
      media: parseFloat(resultado[0].media) || 0,
      total: parseInt(resultado[0].total) || 0,
    };
  }

  async eliminar(id) {
    return await db('avaliacoes').where('id', id).del();
  }
}

module.exports = new AvaliacaoModel();
