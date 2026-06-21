const subscricaoService = require('../services/subscricao.service');
const resposta = require('../utils/resposta');
const { asyncHandler } = require('../middlewares/erro.middleware');

class SubscricaoController {
  planos = asyncHandler(async (req, res) => {
    const planos = await subscricaoService.listarPlanos();
    return resposta.sucesso(res, planos);
  });

  minha = asyncHandler(async (req, res) => {
    const contexto = await subscricaoService.obterContextoVendedor(req.utilizador.id);
    return resposta.sucesso(res, contexto);
  });

  contratar = asyncHandler(async (req, res) => {
    const contexto = await subscricaoService.contratarPlano(req.utilizador, req.body || {});
    return resposta.sucesso(res, contexto, 'Plano actualizado com sucesso.');
  });
}

module.exports = new SubscricaoController();
