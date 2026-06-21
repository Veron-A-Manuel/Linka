const db = require('../config/base-de-dados');

class VendedorRankingModel {
  /**
   * Guardar ranking de um vendedor para um período
   */
  async guardar(dados) {
    const existente = await db('vendedor_ranking')
      .where({ vendedor_id: dados.vendedor_id, periodo: dados.periodo })
      .first();

    if (existente) {
      await db('vendedor_ranking')
        .where({ id: existente.id })
        .update({
          score_composto: dados.score_composto,
          posicao: dados.posicao,
          avaliacao_media: dados.avaliacao_media,
          total_vendas: dados.total_vendas,
          taxa_resposta: dados.taxa_resposta,
          taxa_entrega: dados.taxa_entrega,
          total_visualizacoes: dados.total_visualizacoes,
        });
    } else {
      await db('vendedor_ranking').insert(dados);
    }
  }

  /**
   * Guardar múltiplos rankings de uma vez
   */
  async guardarLote(rankings) {
    for (const r of rankings) {
      await this.guardar(r);
    }
  }

  /**
   * Obter ranking de um período
   */
  async obterPorPeriodo(periodo, limite = 50) {
    return await db('vendedor_ranking as vr')
      .select(
        'vr.*',
        'v.nome_loja',
        'u.nome as vendedor_nome',
        'u.avatar',
        'cc.score as confianca_score'
      )
      .join('vendedores as v', 'vr.vendedor_id', 'v.id')
      .join('utilizadores as u', 'v.utilizador_id', 'u.id')
      .leftJoin('confianca_conta as cc', 'u.id', 'cc.utilizador_id')
      .where('vr.periodo', periodo)
      .orderBy('vr.score_composto', 'desc')
      .limit(limite);
  }

  /**
   * Obter posição de um vendedor no ranking
   */
  async obterPosicao(vendedorId, periodo) {
    const registo = await db('vendedor_ranking')
      .where({ vendedor_id: vendedorId, periodo })
      .first();

    return registo ? registo.posicao : null;
  }

  /**
   * Obter períodos disponíveis
   */
  async obterPeriodos() {
    return await db('vendedor_ranking')
      .select('periodo')
      .distinct()
      .orderBy('periodo', 'desc')
      .limit(12);
  }

  /**
   * Obter evolução de um vendedor (últimos períodos)
   */
  async obterEvolucao(vendedorId, limite = 8) {
    return await db('vendedor_ranking')
      .where('vendedor_id', vendedorId)
      .orderBy('periodo', 'desc')
      .limit(limite);
  }

  /**
   * Eliminar rankings de um período
   */
  async eliminarPorPeriodo(periodo) {
    return await db('vendedor_ranking')
      .where('periodo', periodo)
      .del();
  }
}

module.exports = new VendedorRankingModel();
