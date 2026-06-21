const categoriaService = require('../services/categoria.service');
const resposta = require('../utils/resposta');
const { asyncHandler } = require('../middlewares/erro.middleware');

// ============================================================
// LINKA — Controlador de Categorias
// ============================================================

class CategoriaController {
  
  /**
   * Endpoint: GET /api/categorias
   */
  listar = asyncHandler(async (req, res) => {
    const categorias = await categoriaService.listarArvore();
    return resposta.sucesso(res, categorias);
  });

  /**
   * Endpoint: GET /api/categorias/:slug
   */
  obterPorSlug = asyncHandler(async (req, res) => {
    const categoria = await categoriaService.obterPorSlug(req.params.slug);
    return resposta.sucesso(res, categoria);
  });
}

module.exports = new CategoriaController();
