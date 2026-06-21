const db = require('../config/base-de-dados');

class UtilizadorInteresseModel {
  /**
   * Obter interesses de um utilizador (ordenados por peso)
   */
  async obterPorUtilizador(utilizadorId) {
    return await db('utilizador_interesses as ui')
      .select(
        'ui.id', 'ui.utilizador_id', 'ui.categoria_id', 'ui.peso',
        'ui.total_accoes', 'ui.ultima_accao_em',
        'c.nome as categoria_nome', 'c.slug as categoria_slug'
      )
      .join('categorias as c', 'ui.categoria_id', 'c.id')
      .where('ui.utilizador_id', utilizadorId)
      .orderBy('ui.peso', 'desc');
  }

  /**
   * Actualizar ou criar interesse
   * Se já existe, incrementa o peso; senão, cria novo
   */
  async actualizarOuCriar(utilizadorId, categoriaId, pesoIncremento = 1) {
    const existente = await db('utilizador_interesses')
      .where({ utilizador_id: utilizadorId, categoria_id: categoriaId })
      .first();

    if (existente) {
      const novoPeso = Math.min(100, existente.peso + pesoIncremento);
      await db('utilizador_interesses')
        .where({ id: existente.id })
        .update({
          peso: novoPeso,
          total_accoes: existente.total_accoes + 1,
          ultima_accao_em: db.fn.now(),
          actualizado_em: db.fn.now(),
        });
      return { actualizado: true, peso: novoPeso };
    } else {
      const [id] = await db('utilizador_interesses').insert({
        utilizador_id: utilizadorId,
        categoria_id: categoriaId,
        peso: pesoIncremento,
        total_accoes: 1,
        ultima_accao_em: db.fn.now(),
      });
      return { actualizado: false, id, peso: pesoIncremento };
    }
  }

  /**
   * Decair pesos gradualmente (chamar periodicamente)
   * Reduz todos os pesos em 10% para manter o perfil actualizado
   */
  async decairPesos(utilizadorId = null) {
    let query = db('utilizador_interesses');
    if (utilizadorId) query = query.where('utilizador_id', utilizadorId);

    await query.update({
      peso: db.raw('GREATEST(0.1, peso * 0.9)'),
      actualizado_em: db.fn.now(),
    });
  }

  /**
   * Obter IDs das categorias de interesse (para feed personalizado)
   */
  async obterCategoriasIds(utilizadorId, limite = 5) {
    const interesses = await db('utilizador_interesses')
      .select('categoria_id')
      .where('utilizador_id', utilizadorId)
      .where('peso', '>', 1)
      .orderBy('peso', 'desc')
      .limit(limite);

    return interesses.map(i => i.categoria_id);
  }

  /**
   * Remover interesse
   */
  async remover(utilizadorId, categoriaId) {
    return await db('utilizador_interesses')
      .where({ utilizador_id: utilizadorId, categoria_id: categoriaId })
      .del();
  }

  /**
   * Limpar interesses com peso muito baixo (< 0.5)
   */
  async limparFracos(utilizadorId) {
    return await db('utilizador_interesses')
      .where('utilizador_id', utilizadorId)
      .where('peso', '<', 0.5)
      .del();
  }
}

module.exports = new UtilizadorInteresseModel();
