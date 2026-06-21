const db = require('../config/base-de-dados');

class EventoModel {
  /**
   * Registar um evento de comportamento
   */
  async criar(dados) {
    const [id] = await db('eventos_utilizador').insert(dados);
    return id;
  }

  /**
   * Registar múltiplos eventos de uma vez (batch)
   */
  async criarLote(eventos) {
    if (!eventos || eventos.length === 0) return [];
    return await db('eventos_utilizador').insert(eventos);
  }

  /**
   * Obter eventos de um utilizador (paginado)
   */
  async listarPorUtilizador(utilizadorId, { limite = 50, offset = 0, tipo } = {}) {
    let query = db('eventos_utilizador')
      .where('utilizador_id', utilizadorId);

    if (tipo) query = query.where('tipo_evento', tipo);

    return await query
      .orderBy('criado_em', 'desc')
      .limit(limite)
      .offset(offset);
  }

  /**
   * Contar eventos por tipo para um utilizador (últimas N horas)
   */
  async contarPorTipo(utilizadorId, horas = 24) {
    const resultado = await db('eventos_utilizador')
      .select('tipo_evento')
      .count('id as total')
      .where('utilizador_id', utilizadorId)
      .whereRaw('criado_em >= DATE_SUB(NOW(), INTERVAL ? HOUR)', [horas])
      .groupBy('tipo_evento');

    const contagens = {};
    resultado.forEach(r => { contagens[r.tipo_evento] = r.total; });
    return contagens;
  }

  /**
   * Obter categorias mais interagidas por um utilizador
   * Agrega eventos das últimas N horas por categoria
   */
  async categoriasInteragidas(utilizadorId, horas = 168) {
    return await db('eventos_utilizador as e')
      .select(
        'p.categoria_id',
        db.raw('COUNT(e.id) as total_accoes'),
        db.raw(`SUM(CASE WHEN e.tipo_evento = 'purchase' THEN 5
                         WHEN e.tipo_evento = 'favorite' THEN 4
                         WHEN e.tipo_evento = 'like' THEN 3
                         WHEN e.tipo_evento = 'comment' THEN 3
                         WHEN e.tipo_evento = 'share' THEN 2
                         WHEN e.tipo_evento = 'view' THEN 1
                         ELSE 0 END) as peso_total`)
      )
      .join('produtos as p', 'e.produto_id', 'p.id')
      .where('e.utilizador_id', utilizadorId)
      .whereRaw('e.criado_em >= DATE_SUB(NOW(), INTERVAL ? HOUR)', [horas])
      .whereNotNull('p.categoria_id')
      .groupBy('p.categoria_id')
      .orderBy('peso_total', 'desc');
  }

  /**
   * Obter distribuição temporal de eventos (para analytics)
   */
  async distribuicaoTemporal(utilizadorId, dias = 30) {
    return await db('eventos_utilizador')
      .select(
        db.raw('DATE(criado_em) as data'),
        'tipo_evento',
        db.raw('COUNT(id) as total')
      )
      .where('utilizador_id', utilizadorId)
      .whereRaw('criado_em >= DATE_SUB(NOW(), INTERVAL ? DAY)', [dias])
      .groupBy(db.raw('DATE(criado_em)'), 'tipo_evento')
      .orderBy('data', 'asc');
  }

  /**
   * Resumo de analytics do utilizador
   */
  async resumoAnalytics(utilizadorId) {
    const [totalEventos] = await db('eventos_utilizador')
      .where('utilizador_id', utilizadorId)
      .count('id as total');

    const porTipo = await db('eventos_utilizador')
      .select('tipo_evento')
      .count('id as total')
      .where('utilizador_id', utilizadorId)
      .groupBy('tipo_evento');

    const ultimaSemana = await db('eventos_utilizador')
      .where('utilizador_id', utilizadorId)
      .whereRaw('criado_em >= DATE_SUB(NOW(), INTERVAL 7 DAY)')
      .count('id as total')
      .first();

    const categoriasTop = await this.categoriasInteragidas(utilizadorId, 168);

    return {
      total_eventos: Number(totalEventos?.total || 0),
      por_tipo: porTipo.reduce((acc, r) => { acc[r.tipo_evento] = r.total; return acc; }, {}),
      eventos_ultima_semana: Number(ultimaSemana?.total || 0),
      categorias_preferidas: categoriasTop.slice(0, 5),
    };
  }
}

module.exports = new EventoModel();
