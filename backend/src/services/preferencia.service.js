const preferenciaModel = require('../models/preferencia.model');

class PreferenciaService {

  async obter(utilizadorId) {
    return await preferenciaModel.obterOuCriar(utilizadorId);
  }

  async actualizar(utilizadorId, dados) {
    const permitidos = [
      'notificacoes_push', 'notificacoes_chat', 'notificacoes_promo',
      'notificacoes_pedido', 'perfil_visivel', 'mostrar_email',
      'mostrar_telefone', 'idioma', 'moeda'
    ];

    const dadosFiltrados = {};
    for (const chave of permitidos) {
      if (dados[chave] !== undefined) {
        dadosFiltrados[chave] = dados[chave];
      }
    }

    if (Object.keys(dadosFiltrados).length === 0) {
      return await this.obter(utilizadorId);
    }

    return await preferenciaModel.actualizar(utilizadorId, dadosFiltrados);
  }
}

module.exports = new PreferenciaService();
