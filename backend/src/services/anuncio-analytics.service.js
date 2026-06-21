const db = require('../config/base-de-dados');
const anuncioAnalyticsModel = require('../models/anuncio-analytics.model');

class AnuncioAnalyticsService {
  /**
   * Agregar dados do dia anterior (chamar via cron/manual)
   * Lê eventos_utilizador e pedidos para popular anuncio_analytics
   */
  async agregarDados(data = null) {
    const dataAlvo = data || this._obterDataAnterior();
    const dataStr = dataAlvo.toISOString().split('T')[0];

    console.log(`[Analytics] A agregar dados para ${dataStr}...`);

    // 1. Agregar eventos por produto
    const eventos = await db('eventos_utilizador as e')
      .select(
        'e.produto_id',
        db.raw(`SUM(CASE WHEN e.tipo_evento = 'view' THEN 1 ELSE 0 END) as views`),
        db.raw(`SUM(CASE WHEN e.tipo_evento = 'like' THEN 1 ELSE 0 END) as likes`),
        db.raw(`SUM(CASE WHEN e.tipo_evento = 'favorite' THEN 1 ELSE 0 END) as favoritos`),
        db.raw(`SUM(CASE WHEN e.tipo_evento = 'comment' THEN 1 ELSE 0 END) as comentarios`),
        db.raw(`SUM(CASE WHEN e.tipo_evento = 'share' THEN 1 ELSE 0 END) as partilhas`)
      )
      .whereRaw('DATE(e.criado_em) = ?', [dataStr])
      .groupBy('e.produto_id');

    // 2. Agregar visualizações únicas por produto
    const viewsUnicas = await db('visualizacoes_produto as v')
      .select(
        'v.produto_id',
        db.raw('COUNT(DISTINCT COALESCE(v.utilizador_id, v.session_id)) as unicos')
      )
      .whereRaw('DATE(v.criado_em) = ?', [dataStr])
      .groupBy('v.produto_id');

    const viewsMap = {};
    viewsUnicas.forEach(v => { viewsMap[v.produto_id] = v.unicos; });

    // 3. Agregar contactos de chat por produto
    const contactos = await db('conversas as c')
      .select(
        'c.produto_id',
        db.raw('COUNT(*) as total')
      )
      .whereRaw('DATE(c.criado_em) = ?', [dataStr])
      .whereNotNull('c.produto_id')
      .groupBy('c.produto_id');

    const contactosMap = {};
    contactos.forEach(c => { contactosMap[c.produto_id] = c.total; });

    // 4. Agregar pedidos por produto
    const pedidos = await db('itens_pedido as ip')
      .select(
        'ip.produto_id',
        db.raw('COUNT(*) as total'),
        db.raw('SUM(ip.preco_unitario * ip.quantidade) as receita')
      )
      .join('pedidos as p', 'ip.pedido_id', 'p.id')
      .whereRaw('DATE(p.criado_em) = ?', [dataStr])
      .whereNotIn('p.estado', ['cancelado'])
      .groupBy('ip.produto_id');

    const pedidosMap = {};
    pedidos.forEach(p => { pedidosMap[p.produto_id] = { total: p.total, receita: p.receita || 0 }; });

    // 5. Combinar e gravar
    const todosProdutos = new Set([
      ...eventos.map(e => e.produto_id),
      ...Object.keys(viewsMap).map(Number),
      ...Object.keys(contactosMap).map(Number),
      ...Object.keys(pedidosMap).map(Number),
    ]);

    let processados = 0;
    for (const produtoId of todosProdutos) {
      const ev = eventos.find(e => e.produto_id === produtoId) || {};
      await anuncioAnalyticsModel.upsert({
        produto_id: produtoId,
        data: dataStr,
        visualizacoes_unicas: viewsMap[produtoId] || 0,
        likes: ev.likes || 0,
        favoritos: ev.favoritos || 0,
        comentarios: ev.comentarios || 0,
        partilhas: ev.partilhas || 0,
        contactos_chat: contactosMap[produtoId] || 0,
        pedidos: pedidosMap[produtoId]?.total || 0,
        receita: pedidosMap[produtoId]?.receita || 0,
      });
      processados++;
    }

    console.log(`[Analytics] ${processados} produtos processados para ${dataStr}.`);
    return { data: dataStr, processados };
  }

  /**
   * Agregar últimos 7 dias (para quando o sistema inicia)
   */
  async agregarUltimosDias(dias = 7) {
    const resultados = [];
    for (let i = 1; i <= dias; i++) {
      const data = new Date();
      data.setDate(data.getDate() - i);
      const r = await this.agregarDados(data);
      resultados.push(r);
    }
    return resultados;
  }

  /**
   * Obter métricas do vendedor (resumo geral)
   */
  async metricasVendedor(vendedorId, dias = 30) {
    const [resultado] = await db('anuncio_analytics as aa')
      .join('produtos as p', 'aa.produto_id', 'p.id')
      .where('p.vendedor_id', vendedorId)
      .whereRaw('aa.data >= DATE_SUB(CURDATE(), INTERVAL ? DAY)', [dias])
      .select(
        db.raw('SUM(aa.visualizacoes_unicas) as total_views'),
        db.raw('SUM(aa.likes) as total_likes'),
        db.raw('SUM(aa.favoritos) as total_favoritos'),
        db.raw('SUM(aa.comentarios) as total_comentarios'),
        db.raw('SUM(aa.partilhas) as total_partilhas'),
        db.raw('SUM(aa.contactos_chat) as total_contactos'),
        db.raw('SUM(aa.pedidos) as total_pedidos'),
        db.raw('SUM(aa.receita) as total_receita')
      )
      .first();

    return resultado || this._metricasVazias();
  }

  /**
   * Obter evolução diária do vendedor
   */
  async evolucaoDiaria(vendedorId, dias = 30) {
    return await db('anuncio_analytics as aa')
      .join('produtos as p', 'aa.produto_id', 'p.id')
      .where('p.vendedor_id', vendedorId)
      .whereRaw('aa.data >= DATE_SUB(CURDATE(), INTERVAL ? DAY)', [dias])
      .select(
        'aa.data',
        db.raw('SUM(aa.visualizacoes_unicas) as views'),
        db.raw('SUM(aa.likes) as likes'),
        db.raw('SUM(aa.pedidos) as pedidos'),
        db.raw('SUM(aa.receita) as receita')
      )
      .groupBy('aa.data')
      .orderBy('aa.data', 'asc');
  }

  /**
   * Top produtos do vendedor
   */
  async topProdutos(vendedorId, dias = 30, limite = 10) {
    return await anuncioAnalyticsModel.topProdutos(vendedorId, dias, limite);
  }

  /**
   * Métricas de um produto específico
   */
  async metricasProduto(produtoId, dias = 30) {
    const agregados = await anuncioAnalyticsModel.agregadosPorProduto(produtoId, dias);
    const diarios = await anuncioAnalyticsModel.obterPorProduto(produtoId, dias);
    return { agregados, diarios };
  }

  /**
   * Comparar períodos de um produto
   */
  async compararPeriodos(produtoId, diasAtual = 7, diasAnterior = 7) {
    return await anuncioAnalyticsModel.compararPeriodos(produtoId, diasAtual, diasAnterior);
  }

  _obterDataAnterior() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d;
  }

  _metricasVazias() {
    return {
      total_views: 0, total_likes: 0, total_favoritos: 0,
      total_comentarios: 0, total_partilhas: 0, total_contactos: 0,
      total_pedidos: 0, total_receita: 0,
    };
  }
}

module.exports = new AnuncioAnalyticsService();
