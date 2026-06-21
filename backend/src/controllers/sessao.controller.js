const sessaoModel = require('../models/sessao.model');
const resposta = require('../utils/resposta');
const { asyncHandler } = require('../middlewares/erro.middleware');

class SessaoController {

  listar = asyncHandler(async (req, res) => {
    const sessoes = await sessaoModel.listarPorUtilizador(req.utilizador.id);

    const dados = sessoes.map(s => ({
      id: s.id,
      device_name: s.device_name || 'Dispositivo desconhecido',
      ip_address: s.ip_address,
      last_activity: s.last_activity,
      criado_em: s.criado_em,
      expires_at: s.expires_at,
    }));

    return resposta.sucesso(res, dados);
  });

  revogar = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const linhas = await sessaoModel.revogar(Number(id), req.utilizador.id);
    if (linhas === 0) {
      return resposta.naoEncontrado(res, 'Sessao nao encontrada.');
    }

    return resposta.sucesso(res, null, 'Sessao terminada com sucesso.');
  });

  revogarTodas = asyncHandler(async (req, res) => {
    // Encontrar sessão actual (do cookie)
    const refreshToken = req.cookies.refresh_token;
    let sessaoActualId = null;
    if (refreshToken) {
      const crypto = require('crypto');
      const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const sessaoActual = await sessaoModel.procurarPorTokenHash(hash);
      if (sessaoActual) sessaoActualId = sessaoActual.id;
    }

    if (sessaoActualId) {
      await sessaoModel.revogarTodasExceto(req.utilizador.id, sessaoActualId);
    } else {
      // Sem sessão identificável, revogar todas
      const db = require('../config/base-de-dados');
      await db('user_sessions')
        .where({ utilizador_id: req.utilizador.id, revoked: 0 })
        .update({ revoked: 1 });
    }

    return resposta.sucesso(res, null, 'Todas as outras sessoes foram terminadas.');
  });
}

module.exports = new SessaoController();
