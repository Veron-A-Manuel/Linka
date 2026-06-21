const db = require('../config/base-de-dados');

class NotificacaoModel {
  async criar(dados) {
    const [id] = await db('notificacoes').insert(dados);
    return id;
  }

  async listarPorUtilizador(utilizadorId, { limite = 50, offset = 0, apenasNaoLidas = false } = {}) {
    let query = db('notificacoes')
      .where('utilizador_id', utilizadorId);

    if (apenasNaoLidas) query = query.where('lida', 0);

    return await query
      .orderBy('criado_em', 'desc')
      .limit(limite)
      .offset(offset);
  }

  async contarNaoLidas(utilizadorId) {
    const [resultado] = await db('notificacoes')
      .where('utilizador_id', utilizadorId)
      .where('lida', 0)
      .count('id as total');
    return Number(resultado?.total || 0);
  }

  async marcarComoLida(notificacaoId, utilizadorId) {
    return await db('notificacoes')
      .where({ id: notificacaoId, utilizador_id: utilizadorId })
      .update({ lida: 1 });
  }

  async marcarTodasComoLidas(utilizadorId) {
    return await db('notificacoes')
      .where({ utilizador_id: utilizadorId, lida: 0 })
      .update({ lida: 1 });
  }

  async eliminar(notificacaoId, utilizadorId) {
    return await db('notificacoes')
      .where({ id: notificacaoId, utilizador_id: utilizadorId })
      .del();
  }
}

module.exports = new NotificacaoModel();
