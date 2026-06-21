const notificacaoModel = require('../models/notificacao.model');

class NotificacaoService {
  async criarNotificacao(dados) {
    return await notificacaoModel.criar(dados);
  }

  async listarPorUtilizador(utilizadorId, opcoes = {}) {
    return await notificacaoModel.listarPorUtilizador(utilizadorId, opcoes);
  }

  async contarNaoLidas(utilizadorId) {
    return await notificacaoModel.contarNaoLidas(utilizadorId);
  }

  async marcarComoLida(notificacaoId, utilizadorId) {
    return await notificacaoModel.marcarComoLida(notificacaoId, utilizadorId);
  }

  async marcarTodasComoLidas(utilizadorId) {
    return await notificacaoModel.marcarTodasComoLidas(utilizadorId);
  }

  async eliminar(notificacaoId, utilizadorId) {
    return await notificacaoModel.eliminar(notificacaoId, utilizadorId);
  }
}

module.exports = new NotificacaoService();
