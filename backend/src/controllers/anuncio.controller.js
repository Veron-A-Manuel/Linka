const anuncioService = require('../services/anuncio.service');
const vendedorModel = require('../models/vendedor.model');
const resposta = require('../utils/resposta');
const { asyncHandler } = require('../middlewares/erro.middleware');

class AnuncioController {
  /**
   * POST /api/anuncios
   * Criar novo anúncio patrocinado
   */
  criar = asyncHandler(async (req, res) => {
    const vendedor = await vendedorModel.procurarPorUtilizadorId(req.utilizador.id);
    if (!vendedor) {
      return resposta.semPermissao(res, 'O utilizador não tem perfil de vendedor.');
    }
    const dados = await anuncioService.criar(vendedor.id, req.body);
    return resposta.sucesso(res, dados, 'Anúncio criado com sucesso.', 201);
  });

  /**
   * GET /api/anuncios
   * Listar anúncios do vendedor
   */
  listar = asyncHandler(async (req, res) => {
    const vendedor = await vendedorModel.procurarPorUtilizadorId(req.utilizador.id);
    if (!vendedor) {
      return resposta.semPermissao(res, 'O utilizador não tem perfil de vendedor.');
    }
    const { estado } = req.query;
    const dados = await anuncioService.listarPorVendedor(vendedor.id, estado || null);
    return resposta.sucesso(res, dados);
  });

  /**
   * GET /api/anuncios/estatisticas
   * Estatísticas gerais do vendedor
   */
  estatisticas = asyncHandler(async (req, res) => {
    const vendedor = await vendedorModel.procurarPorUtilizadorId(req.utilizador.id);
    if (!vendedor) {
      return resposta.semPermissao(res, 'O utilizador não tem perfil de vendedor.');
    }
    const dados = await anuncioService.estatisticasVendedor(vendedor.id);
    return resposta.sucesso(res, dados);
  });

  /**
   * GET /api/anuncios/:id
   * Obter detalhes de um anúncio
   */
  obter = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const dados = await anuncioService.obter(parseInt(id));
    if (!dados) return resposta.erro(res, 'Anúncio não encontrado.', 404);
    return resposta.sucesso(res, dados);
  });

  /**
   * GET /api/anuncios/:id/stats
   * Estatísticas detalhadas de um anúncio
   */
  estatisticasAnuncio = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { dias = 30 } = req.query;
    const dados = await anuncioService.estatisticasAnuncio(parseInt(id), parseInt(dias));
    if (!dados) return resposta.erro(res, 'Anúncio não encontrado.', 404);
    return resposta.sucesso(res, dados);
  });

  /**
   * PUT /api/anuncios/:id
   * Actualizar um anúncio
   */
  actualizar = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const dados = await anuncioService.actualizar(parseInt(id), req.body);
    return resposta.sucesso(res, dados, 'Anúncio actualizado.');
  });

  /**
   * POST /api/anuncios/:id/pausar
   * Pausar um anúncio
   */
  pausar = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const dados = await anuncioService.pausar(parseInt(id));
    return resposta.sucesso(res, dados, 'Anúncio pausado.');
  });

  /**
   * POST /api/anuncios/:id/retomar
   * Retomar um anúncio pausado
   */
  retomar = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const dados = await anuncioService.retomar(parseInt(id));
    return resposta.sucesso(res, dados, 'Anúncio retomado.');
  });

  /**
   * DELETE /api/anuncios/:id
   * Eliminar um anúncio
   */
  eliminar = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await anuncioService.eliminar(parseInt(id));
    return resposta.sucesso(res, null, 'Anúncio eliminado.');
  });

  /**
   * POST /api/anuncios/actualizar-estados
   * Actualizar estados expirados/saldo (admin/cron)
   */
  actualizarEstados = asyncHandler(async (req, res) => {
    const dados = await anuncioService.actualizarEstados();
    return resposta.sucesso(res, dados, 'Estados actualizados.');
  });
}

module.exports = new AnuncioController();
