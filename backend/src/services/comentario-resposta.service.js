const comentarioRespostaModel = require('../models/comentario-resposta.model');
const ErroApp = require('../utils/erro-app');

class ComentarioRespostaService {

  async criar(comentarioId, utilizadorId, texto) {
    if (!texto || texto.trim().length === 0) {
      throw new ErroApp('Texto da resposta é obrigatório.', 400);
    }
    if (texto.length > 1000) {
      throw new ErroApp('Resposta muito longa (máx. 1000 caracteres).', 400);
    }

    const id = await comentarioRespostaModel.criar({
      comentario_id: comentarioId,
      utilizador_id: utilizadorId,
      texto: texto.trim()
    });

    return await comentarioRespostaModel.procurarPorId(id);
  }

  async listarPorComentario(comentarioId, limite, offset) {
    return await comentarioRespostaModel.listarPorComentario(comentarioId, limite, offset);
  }

  async contarPorComentarios(comentarioIds) {
    return await comentarioRespostaModel.contarPorComentarios(comentarioIds);
  }

  async eliminar(id, utilizadorId) {
    const eliminado = await comentarioRespostaModel.eliminar(id, utilizadorId);
    if (!eliminado) {
      throw new ErroApp('Resposta não encontrada ou sem permissão.', 404);
    }
    return true;
  }
}

module.exports = new ComentarioRespostaService();
