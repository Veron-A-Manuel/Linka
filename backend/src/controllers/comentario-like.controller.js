const comentarioLikeService = require('../services/comentario-like.service');
const resposta = require('../utils/resposta');
const { asyncHandler } = require('../middlewares/erro.middleware');

class ComentarioLikeController {

  toggle = asyncHandler(async (req, res) => {
    const { comentario_id } = req.params;
    const resultado = await comentarioLikeService.toggle(parseInt(comentario_id), req.utilizador.id);
    return resposta.sucesso(res, resultado);
  });

  verificar = asyncHandler(async (req, res) => {
    const { comentario_id } = req.params;
    const liked = await comentarioLikeService.verificar(parseInt(comentario_id), req.utilizador.id);
    return resposta.sucesso(res, { liked });
  });

  contar = asyncHandler(async (req, res) => {
    const { comentario_id } = req.params;
    const total = await comentarioLikeService.contar(parseInt(comentario_id));
    return resposta.sucesso(res, { total_likes: total });
  });
}

module.exports = new ComentarioLikeController();
