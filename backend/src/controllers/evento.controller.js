const eventoService = require('../services/evento.service');
const spamService = require('../services/spam.service');
const resposta = require('../utils/resposta');
const { asyncHandler } = require('../middlewares/erro.middleware');

class EventoController {
  /**
   * POST /api/eventos
   * Registar um evento de comportamento
   */
  registar = asyncHandler(async (req, res) => {
    const { produto_id, tipo_evento, duracao_ms, metadata_json } = req.body;

    if (!produto_id || !tipo_evento) {
      return resposta.validacao(res, 'produto_id e tipo_evento são obrigatórios.');
    }

    const tiposValidos = ['view', 'like', 'unlike', 'favorite', 'unfavorite', 'comment', 'share', 'purchase', 'search'];
    if (!tiposValidos.includes(tipo_evento)) {
      return resposta.validacao(res, `tipo_evento inválido. Valores aceites: ${tiposValidos.join(', ')}`);
    }

    // Anti-spam: verificar flood e duplicados
    if (req.utilizador) {
      const verificacao = await spamService.verificarERegistar(req.utilizador.id, tipo_evento, { produtoId: produto_id });
      if (!verificacao.permitido) {
        return resposta.erro(res, verificacao.accao === 'bloqueado'
          ? 'Demasiados pedidos. Tente novamente mais tarde.'
          : 'Limite de acções atingido. Aguarde um momento.', 429);
      }
    }

    const eventoId = await eventoService.registarEvento({
      utilizador_id: req.utilizador ? req.utilizador.id : null,
      session_id: req.body.session_id || null,
      produto_id,
      tipo_evento,
      duracao_ms: duracao_ms || null,
      metadata_json: metadata_json || null,
    });

    return resposta.criado(res, { evento_id: eventoId }, 'Evento registado com sucesso.');
  });

  /**
   * POST /api/eventos/lote
   * Registar múltiplos eventos de uma vez
   */
  registarLote = asyncHandler(async (req, res) => {
    const { eventos } = req.body;

    if (!eventos || !Array.isArray(eventos) || eventos.length === 0) {
      return resposta.validacao(res, 'O array "eventos" é obrigatório e não pode estar vazio.');
    }

    if (eventos.length > 50) {
      return resposta.validacao(res, 'Máximo de 50 eventos por lote.');
    }

    // Adicionar utilizador_id a cada evento se autenticado
    const eventosComUser = eventos.map(e => ({
      ...e,
      utilizador_id: e.utilizador_id || (req.utilizador ? req.utilizador.id : null),
    }));

    const resultado = await eventoService.registarLote(eventosComUser);

    return resposta.criado(res, { processados: resultado.length }, 'Lote processado com sucesso.');
  });

  /**
   * GET /api/eventos/interesses
   * Obter interesses do utilizador autenticado
   */
  obterInteresses = asyncHandler(async (req, res) => {
    const interesses = await eventoService.obterInteresses(req.utilizador.id);
    return resposta.sucesso(res, interesses);
  });

  /**
   * GET /api/eventos/analytics
   * Obter analytics do utilizador autenticado
   */
  obterAnalytics = asyncHandler(async (req, res) => {
    const analytics = await eventoService.obterAnalytics(req.utilizador.id);
    return resposta.sucesso(res, analytics);
  });

  /**
   * GET /api/eventos/historico
   * Obter eventos recentes do utilizador
   */
  obterHistorico = asyncHandler(async (req, res) => {
    const { limite = 50, offset = 0, tipo } = req.query;
    const eventos = await eventoService.obterEventos(req.utilizador.id, {
      limite: parseInt(limite),
      offset: parseInt(offset),
      tipo,
    });
    return resposta.sucesso(res, eventos);
  });
}

module.exports = new EventoController();
