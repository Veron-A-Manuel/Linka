const db = require('../config/base-de-dados');

class ComentarioLikeModel {

  async toggle(comentarioId, utilizadorId) {
    const existente = await db('comentario_likes')
      .where({ comentario_id: comentarioId, utilizador_id: utilizadorId })
      .first();

    if (existente) {
      await db('comentario_likes').where('id', existente.id).del();
      return false;
    }

    await db('comentario_likes').insert({
      comentario_id: comentarioId,
      utilizador_id: utilizadorId
    });
    return true;
  }

  async verificar(comentarioId, utilizadorId) {
    const r = await db('comentario_likes')
      .where({ comentario_id: comentarioId, utilizador_id: utilizadorId })
      .first();
    return !!r;
  }

  async contar(comentarioId) {
    const r = await db('comentario_likes')
      .where('comentario_id', comentarioId)
      .count('id as total');
    return parseInt(r[0].total) || 0;
  }

  async listarPorComentarios(comentarioIds, utilizadorId = null) {
    if (!comentarioIds || comentarioIds.length === 0) return {};

    const r = await db('comentario_likes')
      .select('comentario_id')
      .count('id as total')
      .whereIn('comentario_id', comentarioIds)
      .groupBy('comentario_id');

    const mapa = {};
    r.forEach(row => { mapa[row.comentario_id] = parseInt(row.total); });

    if (utilizadorId) {
      const meus = await db('comentario_likes')
        .select('comentario_id')
        .whereIn('comentario_id', comentarioIds)
        .where('utilizador_id', utilizadorId);
      meus.forEach(row => {
        mapa[`_${row.comentario_id}`] = true;
      });
    }

    return mapa;
  }
}

module.exports = new ComentarioLikeModel();
