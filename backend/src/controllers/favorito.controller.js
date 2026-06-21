const favoritoService = require('../services/favorito.service');
const resposta = require('../utils/resposta');
const { asyncHandler } = require('../middlewares/erro.middleware');

// ============================================================
// LINKA — Controlador de Favoritos
// ============================================================

class FavoritoController {
  
  /**
   * Endpoint: GET /api/favoritos
   */
  listar = asyncHandler(async (req, res) => {
    const favoritos = await favoritoService.listarFavoritos(req.utilizador.id);
    return resposta.sucesso(res, favoritos);
  });

  /**
   * Endpoint: POST /api/favoritos/:id
   */
  adicionar = asyncHandler(async (req, res) => {
    await favoritoService.adicionarFavorito(req.utilizador.id, req.params.produto_id);
    return resposta.sucesso(res, null, 'Produto adicionado aos favoritos.');
  });

  /**
   * Endpoint: DELETE /api/favoritos/:id
   */
  remover = asyncHandler(async (req, res) => {
    await favoritoService.removerFavorito(req.utilizador.id, req.params.produto_id);
    return resposta.sucesso(res, null, 'Produto removido dos favoritos.');
  });

  /**
   * Endpoint: POST /api/favoritos/verificar
   * Recebe { produto_ids: [...] } e retorna { favoritos: [...] }
   */
  verificar = asyncHandler(async (req, res) => {
    const { produto_ids } = req.body;
    const ids = Array.isArray(produto_ids) ? produto_ids.map(Number).filter(Boolean) : [];
    const favoritos = await favoritoService.verificarFavoritos(req.utilizador.id, ids);
    return resposta.sucesso(res, { favoritos });
  });
}

module.exports = new FavoritoController();
