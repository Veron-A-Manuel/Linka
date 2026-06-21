const db = require('../config/base-de-dados');
const { obter, guardar, invalidar } = require('../config/cache');
const feedConfig = require('../config/feed');

class ProdutoModel {
  async listar(filtros = {}) {
    const {
      categoria_id,
      vendedor_id,
      min_preco,
      max_preco,
      cidade,
      busca,
      ordem = 'recente',
      limite = 20,
      offset = 0,
      pagina,
    } = filtros;

    // Suporte a paginação por página
    const limiteFinal = parseInt(limite);
    const offsetFinal = pagina ? (parseInt(pagina) - 1) * limiteFinal : parseInt(offset);

    // Gerar chave de cache baseada nos filtros
    const chaveCache = `produtos:listar:${JSON.stringify({ ...filtros, offset: offsetFinal })}`;
    const dadosCache = await obter(chaveCache);
    if (dadosCache) return dadosCache;

    let query = db('produtos as p')
      .select('p.*', 'c.nome as categoria_nome', 'v.nome_loja', 'u.nome as vendedor_nome', 'ip.caminho as imagem_url',
        db.raw('(SELECT COUNT(*) FROM avaliacoes WHERE avaliacoes.produto_id = p.id) as total_comentarios')
      )
      .leftJoin('categorias as c', 'p.categoria_id', 'c.id')
      .leftJoin('vendedores as v', 'p.vendedor_id', 'v.id')
      .leftJoin('utilizadores as u', 'v.utilizador_id', 'u.id')
      .leftJoin('imagens_produto as ip', function() {
        this.on('p.id', '=', 'ip.produto_id').andOn('ip.principal', '=', 1);
      })
      .where('p.condicao', 'disponivel');

    if (!filtros.incluir_nao_aprovados) {
        query.where('p.aprovado', 1);
    }

    if (categoria_id) query.where('p.categoria_id', categoria_id);
    if (vendedor_id) query.where('p.vendedor_id', vendedor_id);
    if (min_preco) query.where('p.preco', '>=', min_preco);
    if (max_preco) query.where('p.preco', '<=', max_preco);
    if (cidade) query.where('p.cidade', 'like', `%${cidade}%`);

    // FULLTEXT SEARCH — usar MATCH ... AGAINST em vez de LIKE
    if (busca) {
      const termosLimpos = busca.replace(/[^\w\s\u00C0-\u00FF]/g, '').trim();
      if (termosLimpos.length > 0) {
        // Usar FULLTEXT com MODE自然语言 (mais rápido que LIKE)
        query.whereRaw(
          `MATCH(p.titulo, p.descricao) AGAINST(? IN BOOLEAN MODE)`,
          [termosLimpos.split(/\s+/).map(t => `+${t}*`).join(' ')]
        );
      }
    }

    switch (ordem) {
      case 'barato':
        query.orderBy('p.preco', 'asc');
        break;
      case 'caro':
        query.orderBy('p.preco', 'desc');
        break;
      case 'popular':
        query.orderBy('p.total_visualizacoes', 'desc');
        break;
      case 'relevancia':
        if (busca) {
          // Ordenar por relevância FULLTEXT
          query.clearOrder();
          query.orderByRaw(
            `MATCH(p.titulo, p.descricao) AGAINST(? IN BOOLEAN MODE) DESC`,
            [busca.split(/\s+/).map(t => `+${t}*`).join(' ')]
          );
        } else {
          query.orderBy('p.criado_em', 'desc');
        }
        break;
      default:
        query.orderBy('p.criado_em', 'desc');
    }

    query.limit(limiteFinal).offset(offsetFinal);
    const resultado = await query;

    // Guardar no cache por 3 minutos (listagens mudam frequentemente)
    await guardar(chaveCache, resultado, 180);
    return resultado;
  }

  /**
   * Feed misto: 60% vídeos, 25% imagens, 15% anúncios patrocinados
   */
  async feedMisto(filtros = {}) {
    const { limite = 20, offset = 0, pagina } = filtros;
    const limiteFinal = parseInt(limite);
    const offsetFinal = pagina ? (parseInt(pagina) - 1) * limiteFinal : parseInt(offset);

    const chaveCache = `produtos:feed:${JSON.stringify({ limite: limiteFinal, offset: offsetFinal })}`;
    const dadosCache = await obter(chaveCache);
    if (dadosCache) return dadosCache;

    // Buscar produtos aprovados com imagens
    const produtos = await db('produtos as p')
      .select('p.*', 'c.nome as categoria_nome', 'v.nome_loja', 'ip.caminho as imagem_url')
      .leftJoin('categorias as c', 'p.categoria_id', 'c.id')
      .leftJoin('vendedores as v', 'p.vendedor_id', 'v.id')
      .leftJoin('imagens_produto as ip', function() {
        this.on('p.id', '=', 'ip.produto_id').andOn('ip.principal', '=', 1);
      })
      .where('p.condicao', 'disponivel')
      .where('p.aprovado', 1)
      .orderByRaw('RAND()')
      .limit(limiteFinal)
      .offset(offsetFinal);

    // Separar vídeos e imagens
    const comVideo = produtos.filter(p => p.video_url);
    const semVideo = produtos.filter(p => !p.video_url);

    // Misturar: 60% vídeos, 40% imagens
    const resultado = [];
    let vi = 0, ii = 0;
    const total = produtos.length;
    const ratioVideo = 0.6;

    for (let i = 0; i < total; i++) {
      if (vi < comVideo.length && (ii >= semVideo.length || Math.random() < ratioVideo)) {
        resultado.push(comVideo[vi++]);
      } else if (ii < semVideo.length) {
        resultado.push(semVideo[ii++]);
      } else if (vi < comVideo.length) {
        resultado.push(comVideo[vi++]);
      }
    }

    // Inserir anúncios patrocinados a cada 8-10 produtos
    const comAnuncios = [];
    let desdeUltimoAnuncio = 0;
    for (const p of resultado) {
      comAnuncios.push(p);
      desdeUltimoAnuncio++;
      if (desdeUltimoAnuncio >= 8 + Math.floor(Math.random() * 3)) {
        // Inserir um produto aleatório como "anúncio"
        const randomAd = resultado[Math.floor(Math.random() * resultado.length)];
        if (randomAd && !randomAd._isAd) {
          comAnuncios.push({ ...randomAd, _isAd: true });
        }
        desdeUltimoAnuncio = 0;
      }
    }

    await guardar(chaveCache, comAnuncios, 120); // Cache 2 min
    return comAnuncios;
  }

  /**
   * Feed com paginação por cursor (estável, sem duplicatas)
   * @param {Object} filtros - { cursor, limite, modo }
   * @returns {Object} { dados, nextCursor, hasMore }
   */
  async feedComCursor(filtros = {}) {
    const {
      cursor,
      limite = feedConfig.paginacao.limitePadrao,
      modo = 'algoritmico', // 'algoritmico' | 'recente' | 'personalizado'
      categoria_id,
      busca,
      interessesIds = [], // categorias de interesse do utilizador
      utilizadorId = null,
      cidade = null,
    } = filtros;

    const limiteFinal = Math.min(parseInt(limite), feedConfig.paginacao.limiteMaximo);

    // Buscar do cache se não tiver cursor (primeira página)
    if (!cursor) {
      const chaveCache = `feed:cursor:${modo}:${categoria_id || 'all'}:${busca || ''}:${interessesIds.join(',') || 'none'}`;
      const dadosCache = await obter(chaveCache);
      if (dadosCache) return dadosCache;
    }

    let query = db('produtos as p')
      .select(
        'p.id', 'p.titulo', 'p.descricao', 'p.preco', 'p.preco_negociavel',
        'p.condicao', 'p.cidade', 'p.bairro',
        'p.total_visualizacoes', 'p.total_favoritos', 'p.total_likes',
        'p.criado_em', 'p.actualizado_em', 'p.video_url', 'p.destacado',
        'p.stock', 'p.vendedor_id', 'p.categoria_id',
        'c.nome as categoria_nome', 'c.slug as categoria_slug',
        'v.nome_loja', 'v.avaliacao_media as vendedor_avaliacao',
        'u.nome as vendedor_nome', 'u.id as vendedor_utilizador_id',
        'ip.caminho as imagem_url',
        'cc.score as vendedor_confianca',
        db.raw('(SELECT COUNT(*) FROM avaliacoes WHERE avaliacoes.produto_id = p.id) as total_comentarios')
      )
      .leftJoin('categorias as c', 'p.categoria_id', 'c.id')
      .leftJoin('vendedores as v', 'p.vendedor_id', 'v.id')
      .leftJoin('utilizadores as u', 'v.utilizador_id', 'u.id')
      .leftJoin('confianca_conta as cc', 'u.id', 'cc.utilizador_id')
      .leftJoin('imagens_produto as ip', function () {
        this.on('p.id', '=', 'ip.produto_id').andOn('ip.principal', '=', 1);
      })
      .where('p.condicao', 'disponivel')
      .where('p.aprovado', 1);

    // Filtro por cursor
    if (cursor) {
      query.where('p.id', '<', parseInt(cursor));
    }

    // Filtros opcionais
    if (categoria_id) query.where('p.categoria_id', categoria_id);
    if (busca) {
      const termosLimpos = busca.replace(/[^\w\s\u00C0-\u00FF]/g, '').trim();
      if (termosLimpos.length > 0) {
        query.whereRaw(
          `MATCH(p.titulo, p.descricao) AGAINST(? IN BOOLEAN MODE)`,
          [termosLimpos.split(/\s+/).map(t => `+${t}*`).join(' ')]
        );
      }
    }

    // Ordenação
    if (modo === 'recente') {
      query.orderBy('p.criado_em', 'desc').orderBy('p.id', 'desc');
    } else if (modo === 'personalizado' && interessesIds.length > 0) {
      // Personalizado: algoritmo base + boost para categorias de interesse
      const { pesos } = feedConfig;
      const idsParaCase = interessesIds.join(',');
      query.orderByRaw(`
        (? * LOG(1 + p.total_visualizacoes)) +
        (? * LOG(1 + p.total_favoritos)) +
        (? * LOG(1 + (SELECT COUNT(*) FROM avaliacoes WHERE avaliacoes.produto_id = p.id))) +
        (? * (1 / (1 + TIMESTAMPDIFF(HOUR, p.criado_em, NOW())))) +
        (? * COALESCE(v.avaliacao_media, 0)) +
        (? * IF(p.destacado, 10, 0)) +
        (? * COALESCE(cc.score, 50) / 10) +
        (CASE WHEN p.categoria_id IN (${idsParaCase}) THEN 15 ELSE 0 END) +
        (RAND() * 2) DESC
      `, [
        pesos.visualizacoes,
        pesos.favoritos,
        pesos.comentarios,
        pesos.idade,
        pesos.vendedor,
        pesos.destaque,
        pesos.confianca,
      ]);
      query.orderBy('p.id', 'desc');
    } else {
      // Algorítmico: ordenar por score calculado
      const { pesos } = feedConfig;
      query.orderByRaw(`
        (? * LOG(1 + p.total_visualizacoes)) +
        (? * LOG(1 + p.total_favoritos)) +
        (? * LOG(1 + (SELECT COUNT(*) FROM avaliacoes WHERE avaliacoes.produto_id = p.id))) +
        (? * (1 / (1 + TIMESTAMPDIFF(HOUR, p.criado_em, NOW())))) +
        (? * COALESCE(v.avaliacao_media, 0)) +
        (? * IF(p.destacado, 10, 0)) +
        (? * COALESCE(cc.score, 50) / 10) +
        (RAND() * 2) DESC
      `, [
        pesos.visualizacoes,
        pesos.favoritos,
        pesos.comentarios,
        pesos.idade,
        pesos.vendedor,
        pesos.destaque,
        pesos.confianca,
      ]);
      query.orderBy('p.id', 'desc');
    }

    // Buscar N+1 para determinar se há mais
    const produtos = await query.limit(limiteFinal + 1);

    const hasMore = produtos.length > limiteFinal;
    const dados = hasMore ? produtos.slice(0, limiteFinal) : produtos;
    const nextCursor = hasMore ? dados[dados.length - 1].id : null;

    const resultado = { dados, nextCursor, hasMore };

    // ── Injeção de Anúncios Patrocinados (1 a cada 5 itens) ──
    try {
      const anuncioModel = require('./anuncio.model');
      // Mapear modo para destino
      const destinoMap = { recente: 'feed', personalizado: 'feed', algoritmico: 'feed' };
      const destino = destinoMap[modo] || 'feed';

      const anuncios = await anuncioModel.selecionarParaFeed({
        destino,
        limite: 4, // máx 4 anúncios por página de 20
        utilizadorId,
        interessesIds,
        cidade,
      });

      if (anuncios.length > 0) {
        // Inserir 1 anúncio a cada 5 itens orgânicos (posições 4, 9, 14, 19)
        let inseridos = 0;
        const passo = 5;
        for (let i = 0; i < resultado.dados.length && inseridos < anuncios.length; i++) {
          if ((i + 1) % passo === 0) {
            const ad = {
              ...anuncios[inseridos],
              _isAd: true,
              _anuncio_id: anuncios[inseridos]._anuncio_id,
            };
            delete ad._anuncio_id;
            resultado.dados.splice(i, 0, ad);
            inseridos++;
          }
        }
        // Se sobraram anúncios e ainda não inseriu todos, adicionar no final
        while (inseridos < anuncios.length && resultado.dados.length < limite) {
          const ad = {
            ...anuncios[inseridos],
            _isAd: true,
            _anuncio_id: anuncios[inseridos]._anuncio_id,
          };
          delete ad._anuncio_id;
          resultado.dados.push(ad);
          inseridos++;
        }
      }
    } catch (e) {
      // Silencioso — falha na injeção de ads não deve quebrar o feed
    }

    // Guardar na cache (apenas primeira página)
    if (!cursor) {
      const ttl = modo === 'recente' ? feedConfig.cache.ttlRecente : feedConfig.cache.ttlAlgoritmico;
      const chaveCache = `feed:cursor:${modo}:${categoria_id || 'all'}:${busca || ''}:${interessesIds.join(',') || 'none'}`;
      await guardar(chaveCache, resultado, ttl);
    }

    return resultado;
  }

  /**
   * Feed algorítmico com scoring de relevância
   */
  async feedAlgoritmico(filtros = {}) {
    return this.feedComCursor({ ...filtros, modo: 'algoritmico' });
  }

  /**
   * Feed cronológico (mais recentes primeiro)
   */
  async feedRecente(filtros = {}) {
    return this.feedComCursor({ ...filtros, modo: 'recente' });
  }

  /**
   * Buscar produtos mais recentes que um cursor (para pull-to-refresh)
   */
  async feedLatest(ultimoId, limite = 20) {
    const limiteFinal = Math.min(parseInt(limite), feedConfig.paginacao.limiteMaximo);

    const produtos = await db('produtos as p')
      .select(
        'p.id', 'p.titulo', 'p.descricao', 'p.preco', 'p.preco_negociavel',
        'p.condicao', 'p.cidade', 'p.bairro',
        'p.total_visualizacoes', 'p.total_favoritos', 'p.total_likes',
        'p.criado_em', 'p.video_url', 'p.destacado',
        'p.stock', 'p.vendedor_id', 'p.categoria_id',
        'c.nome as categoria_nome', 'c.slug as categoria_slug',
        'v.nome_loja', 'v.avaliacao_media as vendedor_avaliacao',
        'u.nome as vendedor_nome', 'u.id as vendedor_utilizador_id',
        'ip.caminho as imagem_url',
        db.raw('(SELECT COUNT(*) FROM avaliacoes WHERE avaliacoes.produto_id = p.id) as total_comentarios')
      )
      .leftJoin('categorias as c', 'p.categoria_id', 'c.id')
      .leftJoin('vendedores as v', 'p.vendedor_id', 'v.id')
      .leftJoin('utilizadores as u', 'v.utilizador_id', 'u.id')
      .leftJoin('imagens_produto as ip', function () {
        this.on('p.id', '=', 'ip.produto_id').andOn('ip.principal', '=', 1);
      })
      .where('p.condicao', 'disponivel')
      .where('p.aprovado', 1)
      .where('p.id', '>', parseInt(ultimoId))
      .orderBy('p.id', 'desc')
      .limit(limiteFinal);

    return produtos;
  }

  /**
   * Registar visualização de um produto (com dedup por dia)
   */
  async registrarVisualizacao(produtoId, utilizadorId = null, sessionId = null) {
    try {
      // Verificar se já visualizou hoje
      let query = db('visualizacoes_produto')
        .where({ produto_id: produtoId })
        .whereRaw('DATE(criado_em) = CURDATE()');

      if (utilizadorId) {
        query = query.where('utilizador_id', utilizadorId);
      } else if (sessionId) {
        query = query.where('session_id', sessionId);
      } else {
        return false;
      }

      const existente = await query.first();
      if (existente) return false;

      // Registar nova visualização
      await db('visualizacoes_produto').insert({
        produto_id: produtoId,
        utilizador_id: utilizadorId,
        session_id: sessionId,
      });

      // Incrementar contador no produto
      await db('produtos')
        .where({ id: produtoId })
        .increment('total_visualizacoes', 1);

      return true;
    } catch (err) {
      // Se a tabela não existe, apenas incrementar o contador
      if (err.message && err.message.includes('visualizacoes_produto')) {
        await db('produtos')
          .where({ id: produtoId })
          .increment('total_visualizacoes', 1);
        return true;
      }
      throw err;
    }
  }

  /**
   * Registar "like" num produto (optimistic)
   */
  async registarLike(produtoId, utilizadorId) {
    try {
      // Verificar se já curtiu
      const existente = await db('produto_likes')
        .where({ produto_id: produtoId, utilizador_id: utilizadorId })
        .first();

      if (existente) {
        // Remover like
        await db('produto_likes')
          .where({ produto_id: produtoId, utilizador_id: utilizadorId })
          .del();
        await db('produtos')
          .where({ id: produtoId })
          .decrement('total_likes', 1);
        return { liked: false };
      } else {
        // Adicionar like
        await db('produto_likes').insert({
          produto_id: produtoId,
          utilizador_id: utilizadorId,
        });
        await db('produtos')
          .where({ id: produtoId })
          .increment('total_likes', 1);
        return { liked: true };
      }
    } catch (err) {
      // Se a tabela não existe, usar favoritos como fallback
      if (err.message && err.message.includes('produto_likes')) {
        const favorito = await db('favoritos')
          .where({ produto_id: produtoId, utilizador_id: utilizadorId })
          .first();
        if (favorito) {
          await db('favoritos')
            .where({ produto_id: produtoId, utilizador_id: utilizadorId })
            .del();
          await db('produtos')
            .where({ id: produtoId })
            .decrement('total_favoritos', 1);
          return { liked: false };
        } else {
          await db('favoritos').insert({
            produto_id: produtoId,
            utilizador_id: utilizadorId,
          });
          await db('produtos')
            .where({ id: produtoId })
            .increment('total_favoritos', 1);
          return { liked: true };
        }
      }
      throw err;
    }
  }

  /**
   * Verificar se utilizador curtiu um produto
   */
  async verificarLike(produtoId, utilizadorId) {
    try {
      const like = await db('produto_likes')
        .where({ produto_id: produtoId, utilizador_id: utilizadorId })
        .first();
      return !!like;
    } catch (err) {
      // Se a tabela não existe, verificar favoritos
      if (err.message && err.message.includes('produto_likes')) {
        const favorito = await db('favoritos')
          .where({ produto_id: produtoId, utilizador_id: utilizadorId })
          .first();
        return !!favorito;
      }
      throw err;
    }
  }

  /**
   * Obter comentários de um produto (lazy load com cursor)
   */
  async obterComentarios(produtoId, filtros = {}) {
    const { cursor, limite = 20 } = filtros;
    const limiteFinal = Math.min(parseInt(limite), 50);

    let query = db('avaliacoes as a')
      .select(
        'a.id', 'a.estrelas', 'a.comentario', 'a.criado_em',
        'a.avaliador_id',
        'u.nome as autor_nome', 'u.avatar as autor_avatar'
      )
      .leftJoin('utilizadores as u', 'a.avaliador_id', 'u.id')
      .where('a.produto_id', produtoId)
      .where('a.tipo', 'produto');

    if (cursor) {
      query.where('a.id', '<', parseInt(cursor));
    }

    query.orderBy('a.id', 'desc').limit(limiteFinal + 1);

    const comentarios = await query;
    const hasMore = comentarios.length > limiteFinal;
    const dados = hasMore ? comentarios.slice(0, limiteFinal) : comentarios;
    const nextCursor = hasMore ? dados[dados.length - 1].id : null;

    return { dados, nextCursor, hasMore };
  }

  async procurarPorId(id) {
    const chaveCache = `produtos:${id}`;
    const dadosCache = await obter(chaveCache);
    if (dadosCache) return dadosCache;

    const produto = await db('produtos as p')
      .select('p.*', 'c.nome as categoria_nome', 'v.nome_loja', 'u.nome as vendedor_nome', 'u.avatar as vendedor_avatar', 'u.id as vendedor_utilizador_id')
      .leftJoin('categorias as c', 'p.categoria_id', 'c.id')
      .leftJoin('vendedores as v', 'p.vendedor_id', 'v.id')
      .leftJoin('utilizadores as u', 'v.utilizador_id', 'u.id')
      .where('p.id', id)
      .first();

    if (produto) {
      produto.imagens = await db('imagens_produto')
        .where('produto_id', id)
        .orderBy('ordem', 'asc');
    }

    // Cache por 5 minutos
    if (produto) {
      await guardar(chaveCache, produto, 300);
    }

    return produto;
  }

  async criar(dados) {
    return await db.transaction(async (trx) => {
      const { imagens, video_url, ...dadosProduto } = dados;
      if (video_url) dadosProduto.video_url = video_url;

      const [produto_id] = await trx('produtos').insert(dadosProduto);

      if (imagens && imagens.length > 0) {
        const imagensParaInserir = imagens.map((img, index) => ({
          produto_id,
          caminho: img.caminho,
          principal: index === 0 ? 1 : 0,
          ordem: index,
        }));
        await trx('imagens_produto').insert(imagensParaInserir);
      }

      // Invalidar cache de listagens
      await invalidar('produtos:listar:*');

      return produto_id;
    });
  }

  async actualizar(id, vendedor_id, dados) {
    const resultado = await db('produtos')
      .where({ id, vendedor_id })
      .update({
        ...dados,
        actualizado_em: db.fn.now(),
      });

    // Invalidar cache
    if (resultado) {
      await invalidar(`produtos:${id}`);
      await invalidar('produtos:listar:*');
    }

    return resultado;
  }

  async actualizarPorId(id, dados) {
    const resultado = await db('produtos')
      .where({ id })
      .update({
        ...dados,
        actualizado_em: db.fn.now(),
      });

    // Invalidar cache
    if (resultado) {
      await invalidar(`produtos:${id}`);
      await invalidar('produtos:listar:*');
    }

    return resultado;
  }

  async eliminar(id, vendedor_id) {
    const resultado = await db('produtos')
      .where({ id, vendedor_id })
      .del();

    if (resultado) {
      await invalidar(`produtos:${id}`);
      await invalidar('produtos:listar:*');
    }

    return resultado;
  }

  async eliminarPorId(id) {
    const resultado = await db('produtos')
      .where({ id })
      .del();

    if (resultado) {
      await invalidar(`produtos:${id}`);
      await invalidar('produtos:listar:*');
    }

    return resultado;
  }

  async incrementarVisualizacao(id) {
    return await db('produtos')
      .where({ id })
      .increment('total_visualizacoes', 1);
  }

  async listarAdmin(filtros = {}) {
    const query = db('produtos as p')
      .select(
        'p.*',
        'c.nome as categoria_nome',
        'v.nome_loja',
        'u.nome as vendedor_nome',
        'ip.caminho as imagem_url'
      )
      .leftJoin('categorias as c', 'p.categoria_id', 'c.id')
      .leftJoin('vendedores as v', 'p.vendedor_id', 'v.id')
      .leftJoin('utilizadores as u', 'v.utilizador_id', 'u.id')
      .leftJoin('imagens_produto as ip', function() {
        this.on('p.id', '=', 'ip.produto_id').andOn('ip.principal', '=', 1);
      });

    if (filtros.aprovado !== undefined) {
      query.where('p.aprovado', filtros.aprovado);
    }
    if (filtros.vendedor_id) {
      query.where('p.vendedor_id', filtros.vendedor_id);
    }
    if (filtros.busca) {
      const termosLimpos = filtros.busca.replace(/[^\w\s\u00C0-\u00FF]/g, '').trim();
      if (termosLimpos.length > 0) {
        query.whereRaw(
          `MATCH(p.titulo, p.descricao) AGAINST(? IN BOOLEAN MODE)`,
          [termosLimpos.split(/\s+/).map(t => `+${t}*`).join(' ')]
        );
      }
    }

    return await query.orderBy('p.criado_em', 'desc');
  }
}

module.exports = new ProdutoModel();
