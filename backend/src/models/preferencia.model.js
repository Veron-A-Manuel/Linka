const db = require('../config/base-de-dados');

class PreferenciaModel {

  async obterOuCriar(utilizadorId) {
    let pref = await db('preferencias_utilizador')
      .where('utilizador_id', utilizadorId)
      .first();

    if (!pref) {
      const [id] = await db('preferencias_utilizador').insert({
        utilizador_id: utilizadorId
      });
      pref = await db('preferencias_utilizador').where('id', id).first();
    }

    return pref;
  }

  async actualizar(utilizadorId, dados) {
    const existente = await db('preferencias_utilizador')
      .where('utilizador_id', utilizadorId)
      .first();

    if (existente) {
      await db('preferencias_utilizador')
        .where('utilizador_id', utilizadorId)
        .update(dados);
    } else {
      await db('preferencias_utilizador').insert({
        utilizador_id: utilizadorId,
        ...dados
      });
    }

    return await this.obterOuCriar(utilizadorId);
  }
}

module.exports = new PreferenciaModel();
