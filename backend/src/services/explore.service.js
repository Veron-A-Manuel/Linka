const ExploreModel = require('../models/explore.model');

class ExploreService {
  async listar(filtros) {
    return await ExploreModel.listar(filtros);
  }

  async trending(limite) {
    return await ExploreModel.trending(limite);
  }

  async categoriasComContagem() {
    return await ExploreModel.categoriasComContagem();
  }

  async sugestoesBusca(termo, limite) {
    return await ExploreModel.sugestoesBusca(termo, limite);
  }

  async produtosPorCategoria(categoriaId, limite) {
    return await ExploreModel.produtosPorCategoria(categoriaId, limite);
  }
}

module.exports = new ExploreService();
