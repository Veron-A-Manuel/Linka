const comentarioLikeModel = require('../models/comentario-like.model');

class ComentarioLikeService {

  async toggle(comentarioId, utilizadorId) {
    const adicionado = await comentarioLikeModel.toggle(comentarioId, utilizadorId);
    const total = await comentarioLikeModel.contar(comentarioId);
    return { liked: adicionado, total_likes: total };
  }

  async verificar(comentarioId, utilizadorId) {
    return await comentarioLikeModel.verificar(comentarioId, utilizadorId);
  }

  async contar(comentarioId) {
    return await comentarioLikeModel.contar(comentarioId);
  }

  async listarPorComentarios(comentarioIds, utilizadorId) {
    return await comentarioLikeModel.listarPorComentarios(comentarioIds, utilizadorId);
  }
}

module.exports = new ComentarioLikeService();
