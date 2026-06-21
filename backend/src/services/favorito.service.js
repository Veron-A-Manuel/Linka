const favoritoModel = require('../models/favorito.model');

// ============================================================
// LINKA — Serviço de Favoritos (Lógica de Negócio)
// ============================================================

class FavoritoService {
  
  /**
   * Lista produtos favoritos de um utilizador
   */
  async listarFavoritos(utilizadorId) {
    return await favoritoModel.listarPorUtilizador(utilizadorId);
  }

  /**
   * Adiciona um produto aos favoritos
   */
  async adicionarFavorito(utilizadorId, produtoId) {
    // Nota: A BD tem uma Unique Key para evitar duplicados
    try {
      await favoritoModel.adicionar(utilizadorId, produtoId);
      return true;
    } catch (erro) {
      if (erro.code === 'ER_DUP_ENTRY') {
        return true; // Já é favorito, não fazemos nada
      }
      throw erro;
    }
  }

  /**
   * Remove um produto dos favoritos
   */
  async removerFavorito(utilizadorId, produtoId) {
    return await favoritoModel.remover(utilizadorId, produtoId);
  }

  /**
   * Verifica quais produtos já são favoritos do utilizador
   */
  async verificarFavoritos(utilizadorId, produtoIds) {
    return await favoritoModel.verificar(utilizadorId, produtoIds);
  }
}

module.exports = new FavoritoService();
