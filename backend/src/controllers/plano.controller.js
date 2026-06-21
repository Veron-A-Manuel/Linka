const { asyncHandler } = require('../middlewares/erro.middleware');
const resposta = require('../utils/resposta');
const { listarTiposConta } = require('../config/planos');
const subscricaoService = require('../services/subscricao.service');

class PlanoController {
  listar = asyncHandler(async (req, res) => {
    const planosVendedor = await subscricaoService.listarPlanos();
    return resposta.sucesso(res, {
      tipos_conta: listarTiposConta(),
      planos_vendedor: planosVendedor,
    }, 'Planos carregados com sucesso.');
  });
}

module.exports = new PlanoController();
