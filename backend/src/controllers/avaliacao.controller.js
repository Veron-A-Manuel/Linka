const avaliacaoService = require('../services/avaliacao.service');
const resposta = require('../utils/resposta');
const { asyncHandler } = require('../middlewares/erro.middleware');

class AvaliacaoController {

  criar = asyncHandler(async (req, res) => {
    const avaliacao = await avaliacaoService.criarAvaliacao(req.utilizador.id, req.body);
    return resposta.criado(res, avaliacao, 'Avaliação criada com sucesso.');
  });

  listarPorProduto = asyncHandler(async (req, res) => {
    const avaliacoes = await avaliacaoService.listarPorProduto(req.params.produto_id);
    return resposta.sucesso(res, avaliacoes);
  });

  listarPorUtilizador = asyncHandler(async (req, res) => {
    const { tipo } = req.query;
    const avaliacoes = await avaliacaoService.listarPorAvaliado(req.params.utilizador_id, tipo);
    return resposta.sucesso(res, avaliacoes);
  });

  obterMedia = asyncHandler(async (req, res) => {
    const { tipo } = req.query;
    const media = await avaliacaoService.obterMedia(req.params.utilizador_id, tipo || 'vendedor');
    return resposta.sucesso(res, media);
  });

  eliminar = asyncHandler(async (req, res) => {
    await avaliacaoService.eliminarAvaliacao(req.params.id, req.utilizador.id);
    return resposta.sucesso(res, null, 'Avaliação eliminada com sucesso.');
  });
}

module.exports = new AvaliacaoController();
