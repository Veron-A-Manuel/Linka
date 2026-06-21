const db = require('../config/base-de-dados');

class ComentarioRespostaModel {

  async criar(dados) {
    const [id] = await db('comentario_respostas').insert(dados);
    return id;
  }

  async procurarPorId(id) {
    return await db('comentario_respostas as cr')
      .select('cr.*', 'u.nome as autor_nome', 'u.avatar as autor_avatar')
      .join('utilizadores as u', 'cr.utilizador_id', 'u.id')
      .where('cr.id', id)
      .first();
  }

  async listarPorComentario(comentarioId, limite = 50, offset = 0) {
    return await db('comentario_respostas as cr')
      .select('cr.*', 'u.nome as autor_nome', 'u.avatar as autor_avatar')
      .join('utilizadores as u', 'cr.utilizador_id', 'u.id')
      .where('cr.comentario_id', comentarioId)
      .orderBy('cr.criado_em', 'asc')
      .limit(limite).offset(offset);
  }

  async contarPorComentarios(comentarioIds) {
    if (!comentarioIds || comentarioIds.length === 0) return {};

    const r = await db('comentario_respostas')
      .select('comentario_id')
      .count('id as total')
      .whereIn('comentario_id', comentarioIds)
      .groupBy('comentario_id');

    const mapa = {};
    r.forEach(row => { mapa[row.comentario_id] = parseInt(row.total); });
    return mapa;
  }

  async eliminar(id, utilizadorId) {
    const resp = await this.procurarPorId(id);
    if (!resp) return false;
    if (resp.utilizador_id !== utilizadorId) return false;
    await db('comentario_respostas').where('id', id).del();
    return true;
  }
}

module.exports = new ComentarioRespostaModel();
