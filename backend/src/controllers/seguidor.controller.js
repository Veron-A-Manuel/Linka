const seguidorService = require('../services/seguidor.service');
const resposta = require('../utils/resposta');
const { asyncHandler } = require('../middlewares/erro.middleware');

class SeguidorController {

  toggle = asyncHandler(async (req, res) => {
    const { vendedor_id } = req.params;
    const verificado = await seguidorService.verificar(req.utilizador.id, parseInt(vendedor_id));

    if (verificado) {
      const r = await seguidorService.deixarDeSeguir(req.utilizador.id, parseInt(vendedor_id));
      return resposta.sucesso(res, r, 'Deixou de seguir.');
    } else {
      const r = await seguidorService.seguir(req.utilizador.id, parseInt(vendedor_id));
      return resposta.criado(res, r, 'A seguir vendedor.');
    }
  });

  verificar = asyncHandler(async (req, res) => {
    const { vendedor_id } = req.params;
    const seguido = await seguidorService.verificar(req.utilizador.id, parseInt(vendedor_id));
    return resposta.sucesso(res, { seguido });
  });

  contarSeguidores = asyncHandler(async (req, res) => {
    const { vendedor_id } = req.params;
    const total = await seguidorService.contarSeguidores(parseInt(vendedor_id));
    return resposta.sucesso(res, { total_seguidores: total });
  });

  contarSeguindo = asyncHandler(async (req, res) => {
    const total = await seguidorService.contarSeguindo(req.utilizador.id);
    return resposta.sucesso(res, { total_seguindo: total });
  });

  listarSeguidores = asyncHandler(async (req, res) => {
    const { vendedor_id } = req.params;
    const { limite = 50, offset = 0 } = req.query;
    const lista = await seguidorService.listarSeguidores(parseInt(vendedor_id), parseInt(limite), parseInt(offset));
    return resposta.sucesso(res, lista);
  });

  listarSeguindo = asyncHandler(async (req, res) => {
    const { limite = 50, offset = 0 } = req.query;
    const lista = await seguidorService.listarSeguindo(req.utilizador.id, parseInt(limite), parseInt(offset));
    return resposta.sucesso(res, lista);
  });
}

module.exports = new SeguidorController();
