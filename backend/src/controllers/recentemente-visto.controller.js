const recentementeVistoService = require('../services/recentemente-visto.service');
const resposta = require('../utils/resposta');
const { asyncHandler } = require('../middlewares/erro.middleware');

class RecentementeVistoController {

  registar = asyncHandler(async (req, res) => {
    const { produto_id } = req.params;
    await recentementeVistoService.registar(req.utilizador.id, parseInt(produto_id));
    return resposta.sucesso(res, null, 'Registado.');
  });

  listar = asyncHandler(async (req, res) => {
    const { limite = 20, offset = 0 } = req.query;
    const lista = await recentementeVistoService.listar(req.utilizador.id, parseInt(limite), parseInt(offset));
    return resposta.sucesso(res, lista);
  });

  eliminar = asyncHandler(async (req, res) => {
    const { produto_id } = req.params;
    await recentementeVistoService.eliminar(req.utilizador.id, parseInt(produto_id));
    return resposta.sucesso(res, null, 'Removido do histórico.');
  });

  limpar = asyncHandler(async (req, res) => {
    await recentementeVistoService.limpar(req.utilizador.id);
    return resposta.sucesso(res, null, 'Histórico limpo.');
  });
}

module.exports = new RecentementeVistoController();
