const categoriaModel = require('../models/categoria.model');

// ============================================================
// LINKA — Serviço de Categorias (Lógica de Negócio)
// ============================================================

class CategoriaService {
  
  /**
   * Obtém a lista de categorias organizada em árvore
   */
  async listarArvore() {
    const categorias = await categoriaModel.listarTodas();
    
    const raizes = categorias.filter(c => !c.pai_id);
    const subcategorias = categorias.filter(c => c.pai_id);

    return raizes.map(pai => ({
      ...pai,
      subcategorias: subcategorias.filter(sub => sub.pai_id === pai.id)
    }));
  }

  /**
   * Obtém detalhes de uma categoria pelo slug
   */
  async obterPorSlug(slug) {
    const categoria = await categoriaModel.procurarPorSlug(slug);
    
    if (!categoria) {
      throw new Error('Categoria não encontrada.');
    }

    const subcategorias = await categoriaModel.procurarPorPai(categoria.id);
    return { ...categoria, subcategorias };
  }
}

module.exports = new CategoriaService();
