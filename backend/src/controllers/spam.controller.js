const spamService = require('../services/spam.service');
const resposta = require('../utils/resposta');
const { asyncHandler } = require('../middlewares/erro.middleware');

class SpamController {
  estatisticas = asyncHandler(async (req, res) => {
    const stats = await spamService.obterEstatisticas();
    return resposta.sucesso(res, stats);
  });

  historico = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { limite = 50 } = req.query;
    const spamModel = require('../models/spam.model');
    const dados = await spamModel.listarPorUtilizador(parseInt(id), parseInt(limite));
    return resposta.sucesso(res, dados);
  });

  limpar = asyncHandler(async (req, res) => {
    const { dias = 90 } = req.query;
    const resultado = await spamService.limparDadosAntigos(parseInt(dias));
    return resposta.sucesso(res, resultado, 'Dados de spam limpos.');
  });
}

module.exports = new SpamController();
