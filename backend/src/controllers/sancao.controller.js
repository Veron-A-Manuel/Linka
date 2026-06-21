const sancaoService = require('../services/sancao.service');
const resposta = require('../utils/resposta');
const { asyncHandler } = require('../middlewares/erro.middleware');

class SancaoController {

  criar = asyncHandler(async (req, res) => {
    const sancao = await sancaoService.criarSancao(req.utilizador.id, req.body);
    return resposta.criado(res, sancao, 'Sanção aplicada com sucesso.');
  });

  listarPorUtilizador = asyncHandler(async (req, res) => {
    const sancoes = await sancaoService.listarPorUtilizador(req.params.utilizador_id);
    return resposta.sucesso(res, sancoes);
  });

  listarMinhas = asyncHandler(async (req, res) => {
    const sancoes = await sancaoService.listarPorUtilizador(req.utilizador.id);
    return resposta.sucesso(res, sancoes);
  });

  obterPorId = asyncHandler(async (req, res) => {
    const sancao = await sancaoService.obterPorId(req.params.id);
    return resposta.sucesso(res, sancao);
  });

  desactivar = asyncHandler(async (req, res) => {
    const sancao = await sancaoService.desactivarSancao(req.params.id, req.utilizador.id);
    return resposta.sucesso(res, sancao, 'Sanção desactivada com sucesso.');
  });

  verificarActivas = asyncHandler(async (req, res) => {
    const sancoes = await sancaoService.listarActivas(req.params.utilizador_id);
    return resposta.sucesso(res, sancoes);
  });

  listarTodas = asyncHandler(async (req, res) => {
    const sancoes = await sancaoService.listarTodas();
    return resposta.sucesso(res, sancoes);
  });
}

module.exports = new SancaoController();
