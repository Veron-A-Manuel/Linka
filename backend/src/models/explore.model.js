const db = require('../config/base-de-dados');
const { obter, guardar, invalidar } = require('../config/cache');

class ExploreModel {
  /**
   * Listar produtos para exploração com filtros avançados
   */
  async listar(filtros = {}) {
    const {
      categoria_id,
      categoria_slug,
      busca,
      ordem = 'recente',
      preco_min,
      preco_max,
      cidade,
      limite = 20,
      pagina = 1,
    } = filtros;

    const limiteFinal = parseInt(limite);
    const offsetFinal = (parseInt(pagina) - 1) * limiteFinal;

    const chaveCache = `explore:listar:${JSON.stringify({ ...filtros, offset: offsetFinal })}`;
    const dadosCache = await obter(chaveCache);
    if (dadosCache) return dadosCache;

    let query = db('produtos as p')
      .select(
        'p.id', 'p.titulo', 'p.descricao', 'p.preco', 'p.preco_negociavel',
        'p.condicao', 'p.cidade', 'p.total_visualizacoes', 'p.criado_em',
        'p.video_url',
        'c.nome as categoria_nome', 'c.slug as categoria_slug',
        'v.nome_loja',
        'u.nome as vendedor_nome',
        'ip.caminho as imagem_url'
      )
      .leftJoin('categorias as c', 'p.categoria_id', 'c.id')
      .leftJoin('vendedores as v', 'p.vendedor_id', 'v.id')
      .leftJoin('utilizadores as u', 'v.utilizador_id', 'u.id')
      .leftJoin('imagens_produto as ip', function () {
        this.on('p.id', '=', 'ip.produto_id').andOn('ip.principal', '=', 1);
      })
      .where('p.condicao', 'disponivel')
      .where('p.aprovado', 1);

    if (categoria_id) query.where('p.categoria_id', categoria_id);
    if (categoria_slug) query.where('c.slug', categoria_slug);
    if (preco_min) query.where('p.preco', '>=', preco_min);
    if (preco_max) query.where('p.preco', '<=', preco_max);
    if (cidade) query.where('p.cidade', 'like', `%${cidade}%`);

    if (busca) {
      const termosLimpos = busca.replace(/[^\w\s\u00C0-\u00FF]/g, '').trim();
      if (termosLimpos.length > 0) {
        query.whereRaw(
          `MATCH(p.titulo, p.descricao) AGAINST(? IN BOOLEAN MODE)`,
          [termosLimpos.split(/\s+/).map(t => `+${t}*`).join(' ')]
        );
      }
    }

    switch (ordem) {
      case 'barato': query.orderBy('p.preco', 'asc'); break;
      case 'caro': query.orderBy('p.preco', 'desc'); break;
      case 'popular': query.orderBy('p.total_visualizacoes', 'desc'); break;
      case 'recente': default: query.orderBy('p.criado_em', 'desc');
    }

    const countQuery = db('produtos as p')
      .count('* as total')
      .leftJoin('categorias as c', 'p.categoria_id', 'c.id')
      .where('p.condicao', 'disponivel')
      .where('p.aprovado', 1);
    if (categoria_id) countQuery.where('p.categoria_id', categoria_id);
    if (categoria_slug) countQuery.where('c.slug', categoria_slug);
    if (preco_min) countQuery.where('p.preco', '>=', preco_min);
    if (preco_max) countQuery.where('p.preco', '<=', preco_max);
    if (cidade) countQuery.where('p.cidade', 'like', `%${cidade}%`);
    if (busca) {
      const termosLimpos = busca.replace(/[^\w\s\u00C0-\u00FF]/g, '').trim();
      if (termosLimpos.length > 0) {
        countQuery.whereRaw(
          `MATCH(p.titulo, p.descricao) AGAINST(? IN BOOLEAN MODE)`,
          [termosLimpos.split(/\s+/).map(t => `+${t}*`).join(' ')]
        );
      }
    }
    const totalRow = await countQuery.first();
    const total = totalRow ? totalRow.total : 0;
    const dados = await query.limit(limiteFinal).offset(offsetFinal);

    const resultado = { dados, total, pagina: parseInt(pagina), limite: limiteFinal };
    await guardar(chaveCache, resultado, 180);
    return resultado;
  }

  /**
   * Produtos em destaque (trending): mais visualizações nos últimos 7 dias
   */
  async trending(limite = 20) {
    const chaveCache = `explore:trending:${limite}`;
    const dadosCache = await obter(chaveCache);
    if (dadosCache) return dadosCache;

    const dados = await db('produtos as p')
      .select(
        'p.id', 'p.titulo', 'p.descricao', 'p.preco', 'p.preco_negociavel',
        'p.condicao', 'p.cidade', 'p.total_visualizacoes', 'p.criado_em',
        'p.video_url',
        'c.nome as categoria_nome', 'c.slug as categoria_slug',
        'v.nome_loja',
        'u.nome as vendedor_nome',
        'ip.caminho as imagem_url'
      )
      .leftJoin('categorias as c', 'p.categoria_id', 'c.id')
      .leftJoin('vendedores as v', 'p.vendedor_id', 'v.id')
      .leftJoin('utilizadores as u', 'v.utilizador_id', 'u.id')
      .leftJoin('imagens_produto as ip', function () {
        this.on('p.id', '=', 'ip.produto_id').andOn('ip.principal', '=', 1);
      })
      .where('p.condicao', 'disponivel')
      .where('p.aprovado', 1)
      .orderBy('p.total_visualizacoes', 'desc')
      .limit(limite);

    await guardar(chaveCache, dados, 300);
    return dados;
  }

  /**
   * Categorias com contagem de produtos activos
   */
  async categoriasComContagem() {
    const chaveCache = 'explore:categorias';
    const dadosCache = await obter(chaveCache);
    if (dadosCache) return dadosCache;

    const dados = await db('categorias as c')
      .select(
        'c.id', 'c.nome', 'c.slug', 'c.icone', 'c.imagem',
        db.raw('(SELECT COUNT(*) FROM produtos p WHERE p.categoria_id = c.id AND p.condicao = ? AND p.aprovado = 1) as total_produtos', ['disponivel'])
      )
      .where('c.activa', 1)
      .orderBy('c.ordem', 'asc');

    await guardar(chaveCache, dados, 300);
    return dados;
  }

  /**
   * Sugestões de busca (autocomplete)
   */
  async sugestoesBusca(termo, limite = 8) {
    if (!termo || termo.trim().length < 2) return [];

    const dados = await db('produtos as p')
      .select('p.id', 'p.titulo', 'p.preco', 'ip.caminho as imagem_url')
      .leftJoin('imagens_produto as ip', function () {
        this.on('p.id', '=', 'ip.produto_id').andOn('ip.principal', '=', 1);
      })
      .where('p.condicao', 'disponivel')
      .where('p.aprovado', 1)
      .where('p.titulo', 'like', `%${termo}%`)
      .orderBy('p.total_visualizacoes', 'desc')
      .limit(limite);

    return dados;
  }

  /**
   * Produtos por categoría (para grid de categorias)
   */
  async produtosPorCategoria(categoriaId, limite = 10) {
    return await db('produtos as p')
      .select(
        'p.id', 'p.titulo', 'p.preco', 'p.cidade', 'p.criado_em',
        'ip.caminho as imagem_url'
      )
      .leftJoin('imagens_produto as ip', function () {
        this.on('p.id', '=', 'ip.produto_id').andOn('ip.principal', '=', 1);
      })
      .where('p.categoria_id', categoriaId)
      .where('p.condicao', 'disponivel')
      .where('p.aprovado', 1)
      .orderBy('p.criado_em', 'desc')
      .limit(limite);
  }
}

module.exports = new ExploreModel();
