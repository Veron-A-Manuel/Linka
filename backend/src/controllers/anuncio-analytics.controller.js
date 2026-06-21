const anuncioAnalyticsService = require('../services/anuncio-analytics.service');
const vendedorModel = require('../models/vendedor.model');
const resposta = require('../utils/resposta');
const { asyncHandler } = require('../middlewares/erro.middleware');

class AnuncioAnalyticsController {
  /**
   * GET /api/analytics/vendedor
   * Métricas gerais do vendedor autenticado
   */
  metricasVendedor = asyncHandler(async (req, res) => {
    const vendedor = await vendedorModel.procurarPorUtilizadorId(req.utilizador.id);
    if (!vendedor) {
      return resposta.semPermissao(res, 'O utilizador não tem perfil de vendedor.');
    }
    const { dias = 30 } = req.query;
    const metricas = await anuncioAnalyticsService.metricasVendedor(vendedor.id, parseInt(dias));
    return resposta.sucesso(res, metricas);
  });

  /**
   * GET /api/analytics/vendedor/evolucao
   * Evolução diária do vendedor
   */
  evolucaoDiaria = asyncHandler(async (req, res) => {
    const vendedor = await vendedorModel.procurarPorUtilizadorId(req.utilizador.id);
    if (!vendedor) {
      return resposta.semPermissao(res, 'O utilizador não tem perfil de vendedor.');
    }
    const { dias = 30 } = req.query;
    const dados = await anuncioAnalyticsService.evolucaoDiaria(vendedor.id, parseInt(dias));
    return resposta.sucesso(res, dados);
  });

  /**
   * GET /api/analytics/vendedor/top
   * Top produtos do vendedor
   */
  topProdutos = asyncHandler(async (req, res) => {
    const vendedor = await vendedorModel.procurarPorUtilizadorId(req.utilizador.id);
    if (!vendedor) {
      return resposta.semPermissao(res, 'O utilizador não tem perfil de vendedor.');
    }
    const { dias = 30, limite = 10 } = req.query;
    const dados = await anuncioAnalyticsService.topProdutos(vendedor.id, parseInt(dias), parseInt(limite));
    return resposta.sucesso(res, dados);
  });

  /**
   * GET /api/analytics/produto/:id
   * Métricas de um produto específico
   */
  metricasProduto = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { dias = 30 } = req.query;
    const dados = await anuncioAnalyticsService.metricasProduto(parseInt(id), parseInt(dias));
    return resposta.sucesso(res, dados);
  });

  /**
   * GET /api/analytics/produto/:id/comparar
   * Comparar períodos de um produto
   */
  compararPeriodos = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { dias_actual = 7, dias_anterior = 7 } = req.query;
    const dados = await anuncioAnalyticsService.compararPeriodos(
      parseInt(id), parseInt(dias_actual), parseInt(dias_anterior)
    );
    return resposta.sucesso(res, dados);
  });

  /**
   * POST /api/analytics/agregar
   * Executar agregação manual (admin ou cron)
   */
  agregar = asyncHandler(async (req, res) => {
    const { data, dias } = req.body;
    if (dias) {
      const resultados = await anuncioAnalyticsService.agregarUltimosDias(parseInt(dias));
      return resposta.sucesso(res, resultados, 'Agregação concluída.');
    }
    const resultado = await anuncioAnalyticsService.agregarDados(data ? new Date(data) : null);
    return resposta.sucesso(res, resultado, 'Agregação concluída.');
  });
}

module.exports = new AnuncioAnalyticsController();
