const preferenciaService = require('../services/preferencia.service');
const resposta = require('../utils/resposta');
const { asyncHandler } = require('../middlewares/erro.middleware');

class PreferenciaController {

  obter = asyncHandler(async (req, res) => {
    const pref = await preferenciaService.obter(req.utilizador.id);
    return resposta.sucesso(res, pref);
  });

  actualizar = asyncHandler(async (req, res) => {
    const pref = await preferenciaService.actualizar(req.utilizador.id, req.body);
    return resposta.sucesso(res, pref, 'Preferências actualizadas.');
  });
}

module.exports = new PreferenciaController();
