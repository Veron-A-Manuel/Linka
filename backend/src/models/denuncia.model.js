const db = require('../config/base-de-dados');

class DenunciaModel {

  async criar(dados) {
    const [id] = await db('denuncias').insert(dados);
    return id;
  }

  async procurarPorId(id) {
    return await db('denuncias as d')
      .select(
        'd.*',
        'den.nome as denunciante_nome',
        'den.avatar as denunciante_avatar',
        'den2.nome as denunciado_nome',
        'p.titulo as produto_titulo'
      )
      .join('utilizadores as den', 'd.denunciante_id', 'den.id')
      .leftJoin('utilizadores as den2', 'd.denunciado_id', 'den2.id')
      .leftJoin('produtos as p', 'd.produto_id', 'p.id')
      .where('d.id', id)
      .first();
  }

  async listar(estado = null) {
    let query = db('denuncias as d')
      .select(
        'd.*',
        'den.nome as denunciante_nome',
        'den2.nome as denunciado_nome',
        'p.titulo as produto_titulo',
        'admin.nome as admin_nome'
      )
      .join('utilizadores as den', 'd.denunciante_id', 'den.id')
      .leftJoin('utilizadores as den2', 'd.denunciado_id', 'den2.id')
      .leftJoin('produtos as p', 'd.produto_id', 'p.id')
      .leftJoin('utilizadores as admin', 'd.admin_id', 'admin.id');

    if (estado) query = query.where('d.estado', estado);

    return await query.orderBy('d.criado_em', 'desc');
  }

  async listarPorDenunciante(denuncianteId) {
    return await db('denuncias as d')
      .select('d.*', 'p.titulo as produto_titulo')
      .leftJoin('produtos as p', 'd.produto_id', 'p.id')
      .where('d.denunciante_id', denuncianteId)
      .orderBy('d.criado_em', 'desc');
  }

  async actualizarEstado(id, estado, adminId = null, respostaAdmin = null) {
    const dados = { estado, actualizado_em: db.fn.now() };
    if (adminId) dados.admin_id = adminId;
    if (respostaAdmin) dados.resposta_admin = respostaAdmin;
    if (estado === 'resolvida') dados.resolvida_em = db.fn.now();

    return await db('denuncias').where('id', id).update(dados);
  }

  async contarPendentes() {
    const resultado = await db('denuncias').where('estado', 'pendente').count('id as total');
    return parseInt(resultado[0].total) || 0;
  }
}

module.exports = new DenunciaModel();
