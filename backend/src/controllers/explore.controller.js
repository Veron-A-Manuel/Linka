const ExploreService = require('../services/explore.service');
const resposta = require('../utils/resposta');
const { asyncHandler } = require('../middlewares/erro.middleware');

class ExploreController {
  /**
   * GET /api/explore
   * Listar produtos com filtros avançados
   */
  listar = asyncHandler(async (req, res) => {
    const filtros = {
      categoria_id: req.query.categoria_id,
      categoria_slug: req.query.categoria_slug,
      busca: req.query.busca || req.query.pesquisa,
      ordem: req.query.ordem || req.query.sort || 'recente',
      preco_min: req.query.preco_min,
      preco_max: req.query.preco_max,
      cidade: req.query.cidade,
      limite: req.query.limite || 20,
      pagina: req.query.pagina || 1,
    };
    const resultado = await ExploreService.listar(filtros);
    resposta.sucesso(res, resultado);
  });

  /**
   * GET /api/explore/trending
   * Produtos mais populares
   */
  trending = asyncHandler(async (req, res) => {
    const limite = req.query.limite || 20;
    const dados = await ExploreService.trending(limite);
    resposta.sucesso(res, dados);
  });

  /**
   * GET /api/explore/categorias
   * Categorias com contagem de produtos
   */
  categorias = asyncHandler(async (req, res) => {
    const dados = await ExploreService.categoriasComContagem();
    resposta.sucesso(res, dados);
  });

  /**
   * GET /api/explore/busca?termo=xyz
   * Sugestões de busca (autocomplete)
   */
  buscar = asyncHandler(async (req, res) => {
    const { termo, q } = req.query;
    const termoFinal = termo || q || '';
    const limite = req.query.limite || 8;
    const dados = await ExploreService.sugestoesBusca(termoFinal, limite);
    resposta.sucesso(res, dados);
  });

  /**
   * GET /api/explore/categoria/:id
   * Produtos de uma categoria específica
   */
  porCategoria = asyncHandler(async (req, res) => {
    const limite = req.query.limite || 10;
    const dados = await ExploreService.produtosPorCategoria(req.params.id, limite);
    resposta.sucesso(res, dados);
  });
}

module.exports = new ExploreController();
