const db = require('../config/base-de-dados');

class ConfiancaModel {
  /**
   * Obter score de confiança de um utilizador
   */
  async obterPorUtilizador(utilizadorId) {
    return await db('confianca_conta')
      .where('utilizador_id', utilizadorId)
      .first();
  }

  /**
   * Criar ou actualizar score de confiança
   */
  async upsert(utilizadorId, score, factores = {}) {
    const existente = await this.obterPorUtilizador(utilizadorId);

    const dados = {
      utilizador_id: utilizadorId,
      score: Math.max(0, Math.min(100, score)),
      factores_json: JSON.stringify(factores),
      actualizado_em: db.fn.now(),
    };

    if (existente) {
      await db('confianca_conta')
        .where('utilizador_id', utilizadorId)
        .update(dados);
    } else {
      await db('confianca_conta').insert(dados);
    }

    return dados;
  }

  /**
   * Obter top vendedores por score de confiança
   */
  async topPorConfianca(limite = 10) {
    return await db('confianca_conta as cc')
      .select(
        'cc.utilizador_id', 'cc.score', 'cc.actualizado_em',
        'u.nome as utilizador_nome', 'u.avatar',
        'v.id as vendedor_id', 'v.nome_loja'
      )
      .join('utilizadores as u', 'cc.utilizador_id', 'u.id')
      .join('vendedores as v', 'u.id', 'v.utilizador_id')
      .where('u.tipo', 'vendedor')
      .orderBy('cc.score', 'desc')
      .limit(limite);
  }

  /**
   * Contar utilizadores com score abaixo de um threshold
   */
  async contarBaixaConfianca(limite = 30) {
    const resultado = await db('confianca_conta')
      .where('score', '<', limite)
      .count('id as total');
    return Number(resultado[0]?.total || 0);
  }

  /**
   * Eliminar registo de confiança
   */
  async eliminar(utilizadorId) {
    return await db('confianca_conta')
      .where('utilizador_id', utilizadorId)
      .del();
  }
}

module.exports = new ConfiancaModel();
