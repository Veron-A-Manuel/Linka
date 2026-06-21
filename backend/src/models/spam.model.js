const db = require('../config/base-de-dados');

class SpamModel {
  async registar(dados) {
    const [id] = await db('spam_reports').insert(dados);
    return id;
  }

  async listarPorUtilizador(utilizadorId, limite = 50) {
    return await db('spam_reports')
      .where('utilizador_id', utilizadorId)
      .orderBy('criado_em', 'desc')
      .limit(limite);
  }

  async contarPorTipo(tipo, horas = 24) {
    const [resultado] = await db('spam_reports')
      .where('tipo', tipo)
      .whereRaw('criado_em >= DATE_SUB(NOW(), INTERVAL ? HOUR)', [horas])
      .count('id as total');
    return Number(resultado?.total || 0);
  }

  async obterRateLimit(utilizadorId, accao) {
    return await db('rate_limits')
      .where({ utilizador_id: utilizadorId, accao })
      .first();
  }

  async incrementarRateLimit(utilizadorId, accao, janelaMinutos = 1) {
    const existente = await this.obterRateLimit(utilizadorId, accao);

    if (existente) {
      const diffMs = Date.now() - new Date(existente.janela_inicio).getTime();
      const diffMin = diffMs / 60000;

      if (diffMin < janelaMinutos) {
        await db('rate_limits')
          .where({ id: existente.id })
          .increment('contador', 1);
        return existente.contador + 1;
      }

      await db('rate_limits')
        .where({ id: existente.id })
        .update({ contador: 1, janela_inicio: db.fn.now() });
      return 1;
    }

    await db('rate_limits').insert({
      utilizador_id: utilizadorId,
      accao,
      contador: 1,
    });
    return 1;
  }

  async verificarFlood(utilizadorId, tipoEvento, limite = 10, janelaMinutos = 1) {
    const [resultado] = await db('eventos_utilizador')
      .where({ utilizador_id: utilizadorId, tipo_evento: tipoEvento })
      .whereRaw('criado_em >= DATE_SUB(NOW(), INTERVAL ? MINUTE)', [janelaMinutos])
      .count('id as total');
    return Number(resultado?.total || 0);
  }

  async verificarDuplicado(utilizadorId, produtoId, tipoEvento, segundos = 30) {
    const existente = await db('eventos_utilizador')
      .where({
        utilizador_id: utilizadorId,
        produto_id: produtoId,
        tipo_evento: tipoEvento,
      })
      .whereRaw('criado_em >= DATE_SUB(NOW(), INTERVAL ? SECOND)', [segundos])
      .first();
    return !!existente;
  }

  async limparAntigos(dias = 90) {
    const removidos = await db('spam_reports')
      .whereRaw('criado_em < DATE_SUB(NOW(), INTERVAL ? DAY)', [dias])
      .del();
    const limitsRemovidos = await db('rate_limits')
      .whereRaw('janela_inicio < DATE_SUB(NOW(), INTERVAL ? DAY)', [dias])
      .del();
    return { spam_removidos: removidos, limits_removidos: limitsRemovidos };
  }
}

module.exports = new SpamModel();
