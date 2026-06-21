const recentementeVistoModel = require('../models/recentemente-visto.model');

class RecentementeVistoService {

  async registar(utilizadorId, produtoId) {
    return await recentementeVistoModel.registar(utilizadorId, produtoId);
  }

  async listar(utilizadorId, limite, offset) {
    return await recentementeVistoModel.listar(utilizadorId, limite, offset);
  }

  async eliminar(utilizadorId, produtoId) {
    return await recentementeVistoModel.eliminar(utilizadorId, produtoId);
  }

  async limpar(utilizadorId) {
    return await recentementeVistoModel.limpar(utilizadorId);
  }
}

module.exports = new RecentementeVistoService();
