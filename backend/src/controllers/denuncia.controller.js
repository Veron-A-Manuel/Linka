const denunciaService = require('../services/denuncia.service');
const resposta = require('../utils/resposta');
const { asyncHandler } = require('../middlewares/erro.middleware');

class DenunciaController {

  criar = asyncHandler(async (req, res) => {
    const denuncia = await denunciaService.criarDenuncia(req.utilizador.id, req.body);
    return resposta.criado(res, denuncia, 'Denúncia registada com sucesso.');
  });

  listar = asyncHandler(async (req, res) => {
    const { estado } = req.query;
    const denuncias = await denunciaService.listarTodas(estado);
    return resposta.sucesso(res, denuncias);
  });

  listarMinhas = asyncHandler(async (req, res) => {
    const denuncias = await denunciaService.listarPorDenunciante(req.utilizador.id);
    return resposta.sucesso(res, denuncias);
  });

  obterPorId = asyncHandler(async (req, res) => {
    const denuncia = await denunciaService.obterPorId(req.params.id);
    return resposta.sucesso(res, denuncia);
  });

  resolver = asyncHandler(async (req, res) => {
    const { estado, resposta_admin } = req.body;
    const denuncia = await denunciaService.resolverDenuncia(
      req.params.id,
      req.utilizador.id,
      estado,
      resposta_admin
    );
    return resposta.sucesso(res, denuncia, 'Denúncia processada com sucesso.');
  });

  contarPendentes = asyncHandler(async (req, res) => {
    const total = await denunciaService.contarPendentes();
    return resposta.sucesso(res, { total });
  });
}

module.exports = new DenunciaController();
