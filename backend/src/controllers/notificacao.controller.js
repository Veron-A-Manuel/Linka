const notificacaoService = require('../services/notificacao.service');
const resposta = require('../utils/resposta');
const { asyncHandler } = require('../middlewares/erro.middleware');

class NotificacaoController {
  listar = asyncHandler(async (req, res) => {
    const { limite = 50, offset = 0, nao_lidas } = req.query;
    const opcoes = {
      limite: parseInt(limite),
      offset: parseInt(offset),
      apenasNaoLidas: nao_lidas === '1' || nao_lidas === 'true',
    };
    const dados = await notificacaoService.listarPorUtilizador(req.utilizador.id, opcoes);
    const totalNaoLidas = await notificacaoService.contarNaoLidas(req.utilizador.id);
    return resposta.sucesso(res, { dados, total_nao_lidas: totalNaoLidas });
  });

  contarNaoLidas = asyncHandler(async (req, res) => {
    const total = await notificacaoService.contarNaoLidas(req.utilizador.id);
    return resposta.sucesso(res, { total });
  });

  marcarLida = asyncHandler(async (req, res) => {
    await notificacaoService.marcarComoLida(req.params.id, req.utilizador.id);
    return resposta.sucesso(res, null, 'Notificação marcada como lida.');
  });

  marcarTodasLidas = asyncHandler(async (req, res) => {
    await notificacaoService.marcarTodasComoLidas(req.utilizador.id);
    return resposta.sucesso(res, null, 'Todas as notificações marcadas como lidas.');
  });

  eliminar = asyncHandler(async (req, res) => {
    await notificacaoService.eliminar(req.params.id, req.utilizador.id);
    return resposta.sucesso(res, null, 'Notificação eliminada.');
  });
}

module.exports = new NotificacaoController();
