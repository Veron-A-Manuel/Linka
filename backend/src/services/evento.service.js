const EventoModel = require('../models/evento.model');
const UtilizadorInteresseModel = require('../models/utilizador-interesse.model');
const db = require('../config/base-de-dados');

class EventoService {
  /**
   * Pesos por tipo de evento (quanto mais "forte", maior o peso)
   */
  static PESOS_EVENTO = {
    view: 1,
    like: 3,
    unlike: -2,
    favorite: 4,
    favorite_removido: -3,
    comment: 3,
    share: 2,
    purchase: 5,
    search: 0.5,
  };

  /**
   * Registar um evento e actualizar interesses automaticamente
   */
  async registarEvento(dados) {
    const { utilizador_id, session_id, produto_id, tipo_evento, duracao_ms, metadata_json } = dados;

    // 1. Registar o evento
    const eventoId = await EventoModel.criar({
      utilizador_id: utilizador_id || null,
      session_id: session_id || null,
      produto_id,
      tipo_evento,
      duracao_ms: duracao_ms || null,
      metadata_json: metadata_json ? JSON.stringify(metadata_json) : null,
    });

    // 2. Se tem utilizador, actualizar interesses
    if (utilizador_id) {
      await this.actualizarInteressesComEvento(utilizador_id, produto_id, tipo_evento, duracao_ms);
    }

    return eventoId;
  }

  /**
   * Actualizar pesos de interesses com base no evento
   */
  async actualizarInteressesComEvento(utilizadorId, produtoId, tipoEvento, duracaoMs) {
    // Buscar categoria do produto
    const produto = await db('produtos').select('categoria_id').where('id', produtoId).first();
    if (!produto || !produto.categoria_id) return;

    let pesoIncremento = EventoService.PESOS_EVENTO[tipoEvento] || 1;

    // Bonus de peso se visualização durou mais de 5 segundos
    if (tipoEvento === 'view' && duracaoMs && duracaoMs > 5000) {
      pesoIncremento = 2;
    }

    // Bonus se visualização durou mais de 10 segundos
    if (tipoEvento === 'view' && duracaoMs && duracaoMs > 10000) {
      pesoIncremento = 3;
    }

    // Actualizar interesse na categoria
    await UtilizadorInteresseModel.actualizarOuCriar(
      utilizadorId,
      produto.categoria_id,
      pesoIncremento
    );
  }

  /**
   * Registar múltiplos eventos de uma vez
   */
  async registarLote(eventos) {
    if (!eventos || eventos.length === 0) return [];

    const eventosFormatados = eventos.map(e => ({
      utilizador_id: e.utilizador_id || null,
      session_id: e.session_id || null,
      produto_id: e.produto_id,
      tipo_evento: e.tipo_evento,
      duracao_ms: e.duracao_ms || null,
      metadata_json: e.metadata_json ? JSON.stringify(e.metadata_json) : null,
    }));

    const resultado = await EventoModel.criarLote(eventosFormatados);

    // Actualizar interesses para cada evento com utilizador
    for (const e of eventos) {
      if (e.utilizador_id) {
        await this.actualizarInteressesComEvento(e.utilizador_id, e.produto_id, e.tipo_evento, e.duracao_ms);
      }
    }

    return resultado;
  }

  /**
   * Obter interesses actuais do utilizador
   */
  async obterInteresses(utilizadorId) {
    return await UtilizadorInteresseModel.obterPorUtilizador(utilizadorId);
  }

  /**
   * Obter analytics do utilizador
   */
  async obterAnalytics(utilizadorId) {
    return await EventoModel.resumoAnalytics(utilizadorId);
  }

  /**
   * Obter eventos recentes do utilizador
   */
  async obterEventos(utilizadorId, opcoes = {}) {
    return await EventoModel.listarPorUtilizador(utilizadorId, opcoes);
  }

  /**
   * Manutenção: decair pesos e limpar interesses fracos
   */
  async executarManutencao() {
    await UtilizadorInteresseModel.decairPesos();

    // Limpar interesses com peso < 0.5 de todos os utilizadores
    const todos = await db('utilizador_interesses')
      .select('utilizador_id')
      .distinct();

    for (const u of todos) {
      await UtilizadorInteresseModel.limparFracos(u.utilizador_id);
    }
  }
}

module.exports = new EventoService();
