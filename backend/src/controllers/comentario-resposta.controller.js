const comentarioRespostaService = require('../services/comentario-resposta.service');
const resposta = require('../utils/resposta');
const { asyncHandler } = require('../middlewares/erro.middleware');

class ComentarioRespostaController {

  criar = asyncHandler(async (req, res) => {
    const { comentario_id } = req.params;
    const { texto } = req.body;
    const resp = await comentarioRespostaService.criar(parseInt(comentario_id), req.utilizador.id, texto);
    return resposta.criado(res, resp, 'Resposta criada com sucesso.');
  });

  listar = asyncHandler(async (req, res) => {
    const { comentario_id } = req.params;
    const { limite = 50, offset = 0 } = req.query;
    const lista = await comentarioRespostaService.listarPorComentario(parseInt(comentario_id), parseInt(limite), parseInt(offset));
    return resposta.sucesso(res, lista);
  });

  eliminar = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await comentarioRespostaService.eliminar(parseInt(id), req.utilizador.id);
    return resposta.sucesso(res, null, 'Resposta eliminada.');
  });
}

module.exports = new ComentarioRespostaController();
