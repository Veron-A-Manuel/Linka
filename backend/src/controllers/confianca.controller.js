const confiancaService = require('../services/confianca.service');
const confiancaModel = require('../models/confianca.model');
const resposta = require('../utils/resposta');
const { asyncHandler } = require('../middlewares/erro.middleware');

class ConfiancaController {
  /**
   * GET /api/confianca/perfil
   * Obter score de confiança do utilizador autenticado
   */
  obterMinhaConfianca = asyncHandler(async (req, res) => {
    const resultado = await confiancaService.obterScore(req.utilizador.id);
    const nivel = confiancaService.obterNivel(resultado.score);
    return resposta.sucesso(res, { ...resultado, ...nivel });
  });

  /**
   * GET /api/confianca/utilizador/:id
   * Obter score de confiança de um vendedor específico
   */
  obterConfiancaVendedor = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const resultado = await confiancaService.obterScore(parseInt(id));
    const nivel = confiancaService.obterNivel(resultado.score);
    return resposta.sucesso(res, { ...resultado, ...nivel });
  });

  /**
   * GET /api/confianca/top
   * Top vendedores por confiança
   */
  topVendedores = asyncHandler(async (req, res) => {
    const limite = parseInt(req.query.limite) || 10;
    const dados = await confiancaModel.topPorConfianca(limite);
    return resposta.sucesso(res, dados);
  });

  /**
   * POST /api/confianca/recalcular
   * Recalcular score do utilizador autenticado
   */
  recalcular = asyncHandler(async (req, res) => {
    const resultado = await confiancaService.calcularScore(req.utilizador.id);
    const nivel = confiancaService.obterNivel(resultado.score);
    return resposta.sucesso(res, { ...resultado, ...nivel }, 'Score de confiança recalculado.');
  });

  /**
   * POST /api/confianca/recalcular-todos
   * Recalcular scores de todos os vendedores (admin)
   */
  recalcularTodos = asyncHandler(async (req, res) => {
    if (req.utilizador.tipo !== 'admin') {
      return resposta.semPermissao(res, 'Acesso restrito a administradores.');
    }
    const resultado = await confiancaService.calcularTodos();
    return resposta.sucesso(res, resultado, `${resultado.processados} scores recalculados.`);
  });
}

module.exports = new ConfiancaController();
