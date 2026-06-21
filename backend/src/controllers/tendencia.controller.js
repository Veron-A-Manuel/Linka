const tendenciaService = require('../services/tendencia.service');
const resposta = require('../utils/resposta');
const { asyncHandler } = require('../middlewares/erro.middleware');

class TendenciaController {
  /**
   * GET /api/tendencias
   * Listar tendências
   */
  listarTendencias = asyncHandler(async (req, res) => {
    const { periodo = '24h', tipo, limite = 20 } = req.query;
    const dados = await tendenciaService.listarTendencias(periodo, tipo || null, parseInt(limite));
    return resposta.sucesso(res, dados);
  });

  /**
   * GET /api/tendencias/:id
   * Obter tendência por ID
   */
  obterTendencia = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const dados = await tendenciaService.obterTendencia(parseInt(id));
    if (!dados) return resposta.erro(res, 'Tendência não encontrada.', 404);
    return resposta.sucesso(res, dados);
  });

  /**
   * DELETE /api/tendencias/:id
   * Eliminar tendência
   */
  eliminarTendencia = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await tendenciaService.eliminarTendencia(parseInt(id));
    return resposta.sucesso(res, null, 'Tendência eliminada.');
  });

  /**
   * GET /api/tendencias/alta/conteudo
   * Listar conteúdo em alta
   */
  listarConteudoAlta = asyncHandler(async (req, res) => {
    const { periodo = '24h', metrica, limite = 20 } = req.query;
    const dados = await tendenciaService.listarConteudoAlta(periodo, metrica || null, parseInt(limite));
    return resposta.sucesso(res, dados);
  });

  /**
   * DELETE /api/tendencias/alta/:id
   * Eliminar conteúdo em alta
   */
  eliminarConteudoAlta = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await tendenciaService.eliminarConteudoAlta(parseInt(id));
    return resposta.sucesso(res, null, 'Conteúdo em alta eliminado.');
  });

  /**
   * GET /api/tendencias/palavras
   * Palavras mais usadas
   */
  palavrasMaisUsadas = asyncHandler(async (req, res) => {
    const { horas = 24, limite = 20 } = req.query;
    const dados = await tendenciaService.palavrasMaisUsadas(parseInt(horas), parseInt(limite));
    return resposta.sucesso(res, dados);
  });

  /**
   * POST /api/tendencias/processar
   * Processar tendências (admin/cron)
   */
  processar = asyncHandler(async (req, res) => {
    const resultados = await tendenciaService.processarTudo();
    return resposta.sucesso(res, resultados, 'Tendências processadas com sucesso.');
  });

  /**
   * POST /api/tendencias/processar-produto
   * Extrair palavras-chave de um produto
   */
  processarProduto = asyncHandler(async (req, res) => {
    const { produto_id, titulo, descricao } = req.body;
    if (!produto_id || !titulo) {
      return resposta.erro(res, 'produto_id e titulo são obrigatórios.', 400);
    }
    const total = await tendenciaService.extrairPalavrasProduto(produto_id, titulo, descricao);
    return resposta.sucesso(res, { palavras_extraidas: total }, 'Palavras-chave extraídas.');
  });
}

module.exports = new TendenciaController();
