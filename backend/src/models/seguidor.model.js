const db = require('../config/base-de-dados');

class SeguidorModel {

  async seguir(seguidorId, vendedorId) {
    const existente = await db('seguidores')
      .where({ seguidor_id: seguidorId, vendedor_id: vendedorId })
      .first();

    if (existente) return existente.id;

    const [id] = await db('seguidores').insert({
      seguidor_id: seguidorId,
      vendedor_id: vendedorId
    });
    return id;
  }

  async deixarDeSeguir(seguidorId, vendedorId) {
    return await db('seguidores')
      .where({ seguidor_id: seguidorId, vendedor_id: vendedorId })
      .del();
  }

  async verificar(seguidorId, vendedorId) {
    const r = await db('seguidores')
      .where({ seguidor_id: seguidorId, vendedor_id: vendedorId })
      .first();
    return !!r;
  }

  async contarSeguidores(vendedorId) {
    const r = await db('seguidores')
      .where('vendedor_id', vendedorId)
      .count('id as total');
    return parseInt(r[0].total) || 0;
  }

  async contarSeguindo(utilizadorId) {
    const r = await db('seguidores')
      .where('seguidor_id', utilizadorId)
      .count('id as total');
    return parseInt(r[0].total) || 0;
  }

  async listarSeguidores(vendedorId, limite = 50, offset = 0) {
    return await db('seguidores as s')
      .select('s.id', 's.criado_em', 'u.id as utilizador_id', 'u.nome', 'u.avatar')
      .join('utilizadores as u', 's.seguidor_id', 'u.id')
      .where('s.vendedor_id', vendedorId)
      .orderBy('s.criado_em', 'desc')
      .limit(limite).offset(offset);
  }

  async listarSeguindo(utilizadorId, limite = 50, offset = 0) {
    return await db('seguidores as s')
      .select('s.id', 's.criado_em', 'u.id as utilizador_id', 'u.nome', 'u.avatar')
      .join('utilizadores as u', 's.vendedor_id', 'u.id')
      .where('s.seguidor_id', utilizadorId)
      .orderBy('s.criado_em', 'desc')
      .limit(limite).offset(offset);
  }
}

module.exports = new SeguidorModel();
