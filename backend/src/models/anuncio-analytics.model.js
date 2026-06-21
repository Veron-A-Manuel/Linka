const db = require('../config/base-de-dados');

class AnuncioAnalyticsModel {
  /**
   * Guardar ou actualizar analytics diário de um produto
   */
  async upsert(dados) {
    const existente = await db('anuncio_analytics')
      .where({ produto_id: dados.produto_id, data: dados.data })
      .first();

    if (existente) {
      await db('anuncio_analytics')
        .where({ id: existente.id })
        .update({
          visualizacoes_unicas: dados.visualizacoes_unicas || existente.visualizacoes_unicas,
          likes: dados.likes || existente.likes,
          favoritos: dados.favoritos || existente.favoritos,
          comentarios: dados.comentarios || existente.comentarios,
          partilhas: dados.partilhas || existente.partilhas,
          contactos_chat: dados.contactos_chat || existente.contactos_chat,
          pedidos: dados.pedidos || existente.pedidos,
          receita: dados.receita || existente.receita,
        });
    } else {
      await db('anuncio_analytics').insert(dados);
    }
  }

  /**
   * Guardar múltiplos registos de uma vez
   */
  async upsertLote(registos) {
    for (const r of registos) {
      await this.upsert(r);
    }
  }

  /**
   * Obter analytics de um produto (últimos N dias)
   */
  async obterPorProduto(produtoId, dias = 30) {
    return await db('anuncio_analytics')
      .where('produto_id', produtoId)
      .whereRaw('data >= DATE_SUB(CURDATE(), INTERVAL ? DAY)', [dias])
      .orderBy('data', 'asc');
  }

  /**
   * Obter analytics agregados de um produto (totais no período)
   */
  async agregadosPorProduto(produtoId, dias = 30) {
    const [resultado] = await db('anuncio_analytics')
      .where('produto_id', produtoId)
      .whereRaw('data >= DATE_SUB(CURDATE(), INTERVAL ? DAY)', [dias])
      .select(
        db.raw('SUM(visualizacoes_unicas) as total_visualizacoes'),
        db.raw('SUM(likes) as total_likes'),
        db.raw('SUM(favoritos) as total_favoritos'),
        db.raw('SUM(comentarios) as total_comentarios'),
        db.raw('SUM(partilhas) as total_partilhas'),
        db.raw('SUM(contactos_chat) as total_contactos'),
        db.raw('SUM(pedidos) as total_pedidos'),
        db.raw('SUM(receita) as total_receita')
      )
      .first();

    return resultado || {
      total_visualizacoes: 0, total_likes: 0, total_favoritos: 0,
      total_comentarios: 0, total_partilhas: 0, total_contactos: 0,
      total_pedidos: 0, total_receita: 0,
    };
  }

  /**
   * Obter top produtos por visualizações (últimos N dias)
   */
  async topProdutos(vendedorId, dias = 30, limite = 10) {
    return await db('anuncio_analytics as aa')
      .select(
        'aa.produto_id',
        db.raw('SUM(aa.visualizacoes_unicas) as total_views'),
        db.raw('SUM(aa.likes) as total_likes'),
        db.raw('SUM(aa.favoritos) as total_favoritos'),
        db.raw('SUM(aa.pedidos) as total_pedidos'),
        db.raw('SUM(aa.receita) as total_receita'),
        'p.titulo',
        'p.preco',
        'ip.caminho as imagem_url'
      )
      .join('produtos as p', 'aa.produto_id', 'p.id')
      .leftJoin('imagens_produto as ip', function () {
        this.on('p.id', '=', 'ip.produto_id').andOn('ip.principal', '=', 1);
      })
      .where('p.vendedor_id', vendedorId)
      .whereRaw('aa.data >= DATE_SUB(CURDATE(), INTERVAL ? DAY)', [dias])
      .groupBy('aa.produto_id')
      .orderBy('total_views', 'desc')
      .limit(limite);
  }

  /**
   * Comparar dois períodos
   */
  async compararPeriodos(produtoId, diasAtual = 7, diasAnterior = 7) {
    const actual = await this.agregadosPorProduto(produtoId, diasAtual);

    const [anterior] = await db('anuncio_analytics')
      .where('produto_id', produtoId)
      .whereRaw('data >= DATE_SUB(CURDATE(), INTERVAL ? DAY)', [diasAtual + diasAnterior])
      .whereRaw('data < DATE_SUB(CURDATE(), INTERVAL ? DAY)', [diasAtual])
      .select(
        db.raw('SUM(visualizacoes_unicas) as total_visualizacoes'),
        db.raw('SUM(likes) as total_likes'),
        db.raw('SUM(favoritos) as total_favoritos'),
        db.raw('SUM(comentarios) as total_comentarios'),
        db.raw('SUM(pedidos) as total_pedidos'),
        db.raw('SUM(receita) as total_receita')
      )
      .first();

    return { actual, anterior: anterior || actual };
  }
}

module.exports = new AnuncioAnalyticsModel();
