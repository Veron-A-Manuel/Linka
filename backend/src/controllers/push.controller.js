const pushService = require('../services/push.service');
const resposta = require('../utils/resposta');
const { asyncHandler } = require('../middlewares/erro.middleware');

class PushController {

  obterChavePublica = asyncHandler(async (req, res) => {
    const chave = pushService.getVapidPublicKey();
    return resposta.sucesso(res, { chave });
  });

  subscrever = asyncHandler(async (req, res) => {
    const { subscription } = req.body;
    const ua = req.headers['user-agent'] || '';
    await pushService.subscrever(req.utilizador.id, subscription, ua);
    return resposta.sucesso(res, null, 'Subscrição push registada.');
  });

  cancelar = asyncHandler(async (req, res) => {
    const { endpoint } = req.body;
    await pushService.cancelarSubscricao(req.utilizador.id, endpoint);
    return resposta.sucesso(res, null, 'Subscrição cancelada.');
  });
}

module.exports = new PushController();
