const db = require('../config/base-de-dados');

class SancaoModel {

  async criar(dados) {
    const [id] = await db('sancoes').insert(dados);
    return id;
  }

  async procurarPorId(id) {
    return await db('sancoes as s')
      .select('s.*', 'u.nome as utilizador_nome', 'a.nome as admin_nome')
      .join('utilizadores as u', 's.utilizador_id', 'u.id')
      .join('utilizadores as a', 's.admin_id', 'a.id')
      .where('s.id', id)
      .first();
  }

  async listarPorUtilizador(utilizadorId) {
    return await db('sancoes as s')
      .select('s.*', 'a.nome as admin_nome')
      .join('utilizadores as a', 's.admin_id', 'a.id')
      .where('s.utilizador_id', utilizadorId)
      .orderBy('s.criado_em', 'desc');
  }

  async listarActivas(utilizadorId) {
    return await db('sancoes')
      .where({ utilizador_id: utilizadorId, activa: 1 })
      .where(function() {
        this.whereNull('expira_em').orWhere('expira_em', '>', db.fn.now());
      })
      .orderBy('criado_em', 'desc');
  }

  async desactivar(id) {
    return await db('sancoes').where('id', id).update({ activa: 0, actualizado_em: db.fn.now() });
  }

  async verificarActivas(utilizadorId) {
    return await db('sancoes')
      .where({ utilizador_id: utilizadorId, activa: 1 })
      .where(function() {
        this.whereNull('expira_em').orWhere('expira_em', '>', db.fn.now());
      })
      .first();
  }

  async listarTodas() {
    return await db('sancoes as s')
      .select('s.*', 'u.nome as utilizador_nome', 'a.nome as admin_nome')
      .join('utilizadores as u', 's.utilizador_id', 'u.id')
      .join('utilizadores as a', 's.admin_id', 'a.id')
      .orderBy('s.criado_em', 'desc');
  }
}

module.exports = new SancaoModel();
