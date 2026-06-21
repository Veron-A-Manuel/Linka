const db = require('../config/base-de-dados');

class AnuncioModel {
  // ── CRUD ──

  async criar(dados) {
    const [id] = await db('anuncios_patrocinados').insert(dados);
    return { id, ...dados };
  }

  async obter(id) {
    return await db('anuncios_patrocinados as a')
      .join('produtos as p', 'a.produto_id', 'p.id')
      .select('a.*', 'p.titulo as produto_titulo', 'p.preco as produto_preco')
      .where('a.id', id)
      .first();
  }

  async listarPorVendedor(vendedorId, estado = null) {
    let query = db('anuncios_patrocinados as a')
      .join('produtos as p', 'a.produto_id', 'p.id')
      .select(
        'a.*',
        'p.titulo as produto_titulo',
        'p.preco as produto_preco',
        db.raw('(SELECT caminho FROM imagens_produto WHERE produto_id = p.id AND principal = 1 LIMIT 1) as imagem_url')
      )
      .where('a.vendedor_id', vendedorId);

    if (estado) query = query.where('a.estado', estado);

    return await query.orderBy('a.criado_em', 'desc');
  }

  async actualizar(id, dados) {
    await db('anuncios_patrocinados').where('id', id).update(dados);
    return await this.obter(id);
  }

  async eliminar(id) {
    return await db('anuncios_patrocinados').where('id', id).del();
  }

  // ── Seleção de Anúncios para Feed (v2: targeting + dedup + scoring) ──

  /**
   * Selecionar anúncios elegíveis para inject no feed
   * @param {Object} opcoes
   * @param {string} opcoes.destino - 'feed', 'reels', 'explore', 'pesquisa', 'todos'
   * @param {number} opcoes.limite - máx anúncios (default 4)
   * @param {number} opcoes.utilizadorId - ID do utilizador (para dedup)
   * @param {number[]} opcoes.interessesIds - IDs de categorias de interesse
   * @param {string} opcoes.cidade - Cidade do utilizador
   */
  async selecionarParaFeed(opcoes = {}) {
    const {
      destino = 'todos',
      limite = 4,
      utilizadorId = null,
      interessesIds = [],
      cidade = null,
    } = opcoes;

    const hoje = new Date().toISOString().split('T')[0];
    const maxVezesVisto = 3;

    let query = db('anuncios_patrocinados as a')
      .join('produtos as p', 'a.produto_id', 'p.id')
      .leftJoin('imagens_produto as ip', function () {
        this.on('p.id', '=', 'ip.produto_id').andOn('ip.principal', '=', 1);
      })
      .leftJoin('vendedores as v', 'a.vendedor_id', 'v.id')
      .leftJoin('utilizadores as u', 'v.utilizador_id', 'u.id')
      .leftJoin('confianca_conta as cc', 'v.utilizador_id', 'cc.utilizador_id')
      .leftJoin('anuncios_gasto_diario as gd', function () {
        this.on('a.id', '=', 'gd.anuncio_id').andOn('gd.data', '=', db.raw('?'));
      });

    // Dedup: excluir anúncios já vistos N vezes pelo utilizador
    if (utilizadorId) {
      query = query.leftJoin('anuncios_vistos_utilizador as av', function () {
        this.on('a.id', '=', 'av.anuncio_id').andOn('av.utilizador_id', '=', db.raw('?'));
      });
      query = query.where(function () {
        this.whereNull('av.vezes_visto').orWhere('av.vezes_visto', '<', maxVezesVisto);
      });
    }

    // Filtros obrigatórios
    query = query
      .where('a.estado', 'activo')
      .whereRaw('a.data_inicio <= CURDATE()')
      .whereRaw('a.data_fim >= CURDATE()')
      .whereRaw('(a.gasto_total < a.orcamento_diario * (DATEDIFF(a.data_fim, a.data_inicio) + 1))')
      .where(function () {
        this.where('a.destino', 'todos').orWhere('a.destino', destino);
      })
      .where(function () {
        this.whereNull('gd.gasto').orWhere('gd.gasto', '<', db.raw('a.orcamento_diario'));
      });

    // Select com campos + scoring
    const temInteresses = interessesIds.length > 0;
    const idsParaCase = temInteresses ? interessesIds.join(',') : '0';

    query = query.select(
      'a.id as _anuncio_id',
      'a.titulo as anuncio_titulo',
      'a.tipo_anuncio',
      'a.texto_oferta',
      'a.link_externo',
      'a.custo_por_clique',
      'a.prioridade',
      'p.id as produto_id',
      'p.titulo',
      'p.preco',
      'p.cidade',
      'p.descricao',
      'p.condicao',
      'p.video_url',
      'p.categoria_id',
      'ip.caminho as imagem_url',
      'v.nome_loja',
      'u.nome as vendedor_nome',
      db.raw('COALESCE(cc.score, 50) as confianca_score'),
      db.raw('COALESCE(gd.gasto, 0) as gasto_hoje'),
      db.raw('(a.orcamento_diario - a.gasto_total) as saldo_restante'),
      db.raw(`
        a.prioridade * 2
        + IF(p.categoria_id IN (${idsParaCase}), 10, 0)
        + IF(p.cidade = ?, 5, 0)
        + a.custo_por_clique * 2
        + IF(COALESCE(av.cliou, 0) = 1, 3, 0)
        + RAND() * 2
      `, [cidade || ''])
    );

    const resultado = await query
      .orderByRaw(`
        a.prioridade * 2
        + IF(p.categoria_id IN (${idsParaCase}), 10, 0)
        + IF(p.cidade = ?, 5, 0)
        + a.custo_por_clique * 2
        + IF(COALESCE(av.cliou, 0) = 1, 3, 0)
        + RAND() * 2
      DESC`, [cidade || ''])
      .limit(limite);

    return resultado;
  }

  // ── Tracking ──

  async registarImpressao(anuncioId, utilizadorId = null, sessionId = null, ip = null, userAgent = null) {
    // Registar no log de impressões
    await db('anuncios_impressoes').insert({
      anuncio_id: anuncioId,
      utilizador_id: utilizadorId,
      session_id: sessionId,
      tipo_evento: 'impressao',
      ip_address: ip,
      user_agent: userAgent,
    });

    // Actualizar contadores do anúncio
    await db('anuncios_patrocinados')
      .where('id', anuncioId)
      .increment('impressoes_total', 1);

    // Actualizar gasto diário
    const hoje = new Date().toISOString().split('T')[0];
    await db.raw(`
      INSERT INTO anuncios_gasto_diario (anuncio_id, data, impressoes, cliques, gasto)
      VALUES (?, ?, 1, 0, 0)
      ON DUPLICATE KEY UPDATE impressoes = impressoes + 1
    `, [anuncioId, hoje]);

    // Actualizar frequência por utilizador
    if (utilizadorId) {
      await db.raw(`
        INSERT INTO anuncios_vistos_utilizador (utilizador_id, anuncio_id, vezes_visto, cliou, ultimo_visto_em)
        VALUES (?, ?, 1, 0, NOW())
        ON DUPLICATE KEY UPDATE vezes_visto = vezes_visto + 1, ultimo_visto_em = NOW()
      `, [utilizadorId, anuncioId]);
    }
  }

  async registarClique(anuncioId, utilizadorId = null, sessionId = null, ip = null, userAgent = null) {
    const anuncio = await db('anuncios_patrocinados').where('id', anuncioId).first();
    if (!anuncio) return;

    const custo = anuncio.custo_por_clique;

    // Registar no log de cliques
    await db('anuncios_impressoes').insert({
      anuncio_id: anuncioId,
      utilizador_id: utilizadorId,
      session_id: sessionId,
      tipo_evento: 'clique',
      ip_address: ip,
      user_agent: userAgent,
    });

    // Actualizar contadores e gasto
    await db('anuncios_patrocinados').where('id', anuncioId).update({
      cliques_total: db.raw('cliques_total + 1'),
      gasto_total: db.raw('gasto_total + ?', [custo]),
    });

    // Actualizar gasto diário
    const hoje = new Date().toISOString().split('T')[0];
    await db.raw(`
      INSERT INTO anuncios_gasto_diario (anuncio_id, data, impressoes, cliques, gasto)
      VALUES (?, ?, 0, 1, ?)
      ON DUPLICATE KEY UPDATE cliques = cliques + 1, gasto = gasto + ?
    `, [anuncioId, hoje, custo, custo]);

    // Marcar clique no perfil do utilizador
    if (utilizadorId) {
      await db.raw(`
        INSERT INTO anuncios_vistos_utilizador (utilizador_id, anuncio_id, vezes_visto, cliou, ultimo_visto_em)
        VALUES (?, ?, 1, 1, NOW())
        ON DUPLICATE KEY UPDATE cliou = 1, ultimo_visto_em = NOW()
      `, [utilizadorId, anuncioId]);
    }

    // Verificar se atingiu limite diário
    const [gastoHoje] = await db('anuncios_gasto_diario')
      .where({ anuncio_id: anuncioId, data: hoje })
      .select('gasto');

    if (gastoHoje && gastoHoje.gasto >= anuncio.orcamento_diario) {
      await db('anuncios_patrocinados')
        .where('id', anuncioId)
        .update({ estado: 'sem_saldo' });
    }
  }

  // ── Estatísticas ──

  async estatisticasAnuncio(anuncioId, dias = 30) {
    const [resumo] = await db('anuncios_patrocinados').where('id', anuncioId);
    if (!resumo) return null;

    const evolucao = await db('anuncios_gasto_diario')
      .where('anuncio_id', anuncioId)
      .whereRaw('data >= DATE_SUB(CURDATE(), INTERVAL ? DAY)', [dias])
      .orderBy('data', 'asc');

    const taxaConversao = resumo.impressoes_total > 0
      ? ((resumo.cliques_total / resumo.impressoes_total) * 100).toFixed(2)
      : '0.00';

    return {
      resumo: { ...resumo, taxa_conversao: taxaConversao },
      evolucao,
    };
  }

  async estatisticasVendedor(vendedorId) {
    const [resumo] = await db('anuncios_patrocinados')
      .where('vendedor_id', vendedorId)
      .select(
        db.raw('COUNT(*) as total_anuncios'),
        db.raw('SUM(CASE WHEN estado = "activo" THEN 1 ELSE 0 END) as activos'),
        db.raw('SUM(gasto_total) as gasto_total'),
        db.raw('SUM(impressoes_total) as impressoes_total'),
        db.raw('SUM(cliques_total) as cliques_total')
      );

    return resumo || {
      total_anuncios: 0, activos: 0, gasto_total: 0,
      impressoes_total: 0, cliques_total: 0,
    };
  }

  // ── Actualização de Estados ──

  async actualizarEstadosExpirados() {
    return await db('anuncios_patrocinados')
      .where('estado', 'activo')
      .whereRaw('data_fim < CURDATE()')
      .update({ estado: 'expirado' });
  }

  async reactivarSemSaldo() {
    return await db('anuncios_patrocinados')
      .where('estado', 'sem_saldo')
      .whereRaw('data_fim >= CURDATE()')
      .update({ estado: 'activo' });
  }
}

module.exports = new AnuncioModel();
