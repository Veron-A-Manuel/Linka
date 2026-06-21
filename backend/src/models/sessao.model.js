const db = require('../config/base-de-dados');

// ============================================================
// LINKA — Modelo de Sessões de Utilizador
// Gestão de dispositivos conectados e multi-device
// ============================================================

class SessaoModel {

  async criar(dados) {
    const [id] = await db('user_sessions').insert(dados);
    return id;
  }

  async procurarPorTokenHash(refreshTokenHash) {
    return await db('user_sessions')
      .where({ refresh_token_hash: refreshTokenHash, revoked: 0 })
      .first();
  }

  async listarPorUtilizador(utilizadorId) {
    return await db('user_sessions')
      .where({ utilizador_id: utilizadorId, revoked: 0 })
      .orderBy('last_activity', 'desc');
  }

  async actualizarActividade(id) {
    return await db('user_sessions')
      .where({ id })
      .update({ last_activity: db.fn.now() });
  }

  async revogar(id, utilizadorId) {
    return await db('user_sessions')
      .where({ id, utilizador_id: utilizadorId })
      .update({ revoked: 1 });
  }

  async revogarTodasExceto(utilizadorId, sessaoActualId) {
    return await db('user_sessions')
      .where({ utilizador_id: utilizadorId, revoked: 0 })
      .whereNot({ id: sessaoActualId })
      .update({ revoked: 1 });
  }

  async limparExpiradas() {
    return await db('user_sessions')
      .where('expires_at', '<', db.fn.now())
      .del();
  }
}

module.exports = new SessaoModel();
