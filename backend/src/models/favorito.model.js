// ============================================================
// LINKA — Model de Favorito
// Gestão de produtos favoritados pelos utilizadores
// ============================================================

const db = require('../config/base-de-dados');

class FavoritoModel {
  
  /**
   * Lista favoritos de um utilizador
   */
  async listarPorUtilizador(utilizador_id) {
    return await db('favoritos as f')
      .select('f.id as favorito_id', 'f.criado_em as favoritado_em', 'p.*', 'c.nome as categoria_nome', 'ip.caminho as imagem_url')
      .join('produtos as p', 'f.produto_id', 'p.id')
      .leftJoin('categorias as c', 'p.categoria_id', 'c.id')
      .leftJoin('imagens_produto as ip', function() {
        this.on('p.id', '=', 'ip.produto_id').andOn('ip.principal', '=', 1);
      })
      .where('f.utilizador_id', utilizador_id)
      .where('p.aprovado', 1)
      .orderBy('f.criado_em', 'desc');
  }

  /**
   * Adiciona um produto aos favoritos
   */
  async adicionar(utilizador_id, produto_id) {
    // 1. Verificar se já é favorito
    const existente = await db('favoritos')
      .where({ utilizador_id, produto_id })
      .first();

    if (existente) return existente.id;

    // 2. Inserir e incrementar contador no produto
    return await db.transaction(async trx => {
      const [id] = await trx('favoritos').insert({ utilizador_id, produto_id });
      await trx('produtos').where('id', produto_id).increment('total_favoritos', 1);
      return id;
    });
  }

  /**
   * Remove um produto dos favoritos
   */
  async remover(utilizador_id, produto_id) {
    return await db.transaction(async trx => {
      const deletado = await trx('favoritos')
        .where({ utilizador_id, produto_id })
        .del();

      if (deletado) {
        await trx('produtos').where('id', produto_id).decrement('total_favoritos', 1);
      }
      
      return deletado;
    });
  }

  /**
   * Verifica quais produtos de uma lista já são favoritos do utilizador
   */
  async verificar(utilizador_id, produto_ids) {
    if (!produto_ids || produto_ids.length === 0) return [];
    const rows = await db('favoritos')
      .select('produto_id')
      .where('utilizador_id', utilizador_id)
      .whereIn('produto_id', produto_ids);
    return rows.map(r => r.produto_id);
  }
}

module.exports = new FavoritoModel();
