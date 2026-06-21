const db = require('../config/base-de-dados');

class EntregaModel {
  async criar(dados) {
    const [id] = await db('entregas').insert({
      pedido_id: dados.pedido_id,
      endereco_origem: dados.endereco_origem,
      endereco_destino: dados.endereco_destino,
      latitude_origem: dados.latitude_origem || null,
      longitude_origem: dados.longitude_origem || null,
      latitude_destino: dados.latitude_destino || null,
      longitude_destino: dados.longitude_destino || null,
      preco_entrega: dados.preco_entrega || 0,
      distancia_km: dados.distancia_km || null,
      notas: dados.notas || null,
    });
    return this.procurarPorId(id);
  }

  async procurarPorId(id) {
    return db('entregas as e')
      .select(
      'e.*',
        'p.estado as pedido_estado',
        'p.total as pedido_total',
        'p.notas as pedido_notas',
        db.raw('CONCAT(uv.nome) as vendedor_nome'),
        'uv.avatar as vendedor_avatar',
        'uv.telefone as vendedor_telefone',
        'ue.nome as entregador_nome',
        'ue.avatar as entregador_avatar',
        'ue.telefone as entregador_telefone',
      'ub.nome as comprador_nome',
        'ub.avatar as comprador_avatar',
        'ub.telefone as comprador_telefone'
      )
      .leftJoin('pedidos as p', 'e.pedido_id', 'p.id')
      .leftJoin('utilizadores as uv', 'p.vendedor_id', 'uv.id')
      .leftJoin('utilizadores as ue', 'e.entregador_id', 'ue.id')
      .leftJoin('utilizadores as ub', 'p.cliente_id', 'ub.id')
      .where('e.id', id)
      .first();
  }

  async procurarPorPedidoId(pedidoId) {
    return db('entregas').where('pedido_id', pedidoId).first();
  }

  async listar({ estado, entregadorId, vendedorId, compradorId, limite = 20, offset = 0 }) {
    const query = db('entregas as e')
      .select(
        'e.*',
        'p.estado as pedido_estado',
        'p.total as pedido_total',
        db.raw('CONCAT(uv.nome) as vendedor_nome'),
        'ue.nome as entregador_nome',
        'ub.nome as comprador_nome'
      )
      .leftJoin('pedidos as p', 'e.pedido_id', 'p.id')
      .leftJoin('utilizadores as uv', 'p.vendedor_id', 'uv.id')
      .leftJoin('utilizadores as ue', 'e.entregador_id', 'ue.id')
      .leftJoin('utilizadores as ub', 'p.cliente_id', 'ub.id');

    if (estado) query.where('e.estado', estado);
    if (entregadorId) query.where('e.entregador_id', entregadorId);
    if (vendedorId) query.where('p.vendedor_id', vendedorId);
    if (compradorId) query.where('p.cliente_id', compradorId);

    return query.orderBy('e.criado_em', 'desc').limit(limite).offset(offset);
  }

  async listarDisponiveis({ cidade, limite = 20, offset = 0 }) {
    return db('entregas as e')
      .select(
        'e.*',
        'p.total as pedido_total',
        'p.notas as pedido_notas',
        db.raw('CONCAT(uv.nome) as vendedor_nome'),
        'ub.nome as comprador_nome'
      )
      .leftJoin('pedidos as p', 'e.pedido_id', 'p.id')
      .leftJoin('utilizadores as uv', 'p.vendedor_id', 'uv.id')
      .leftJoin('utilizadores as ub', 'p.cliente_id', 'ub.id')
      .where('e.estado', 'aguardando')
      .whereNull('e.entregador_id')
      .orderBy('e.criado_em', 'desc')
      .limit(limite)
      .offset(offset);
  }

  async actualizarEstado(id, estado, camposExtras = {}) {
    const dados = { estado, ...camposExtras };
    if (estado === 'aceite') dados.aceite_em = db.fn.now();
    if (estado === 'entregue') dados.entregue_em = db.fn.now();
    await db('entregas').where('id', id).update(dados);
    return this.procurarPorId(id);
  }

  async aceitar(id, entregadorId) {
    await db('entregas').where('id', id).update({
      entregador_id: entregadorId,
      estado: 'aceite',
      aceite_em: db.fn.now(),
    });
    return this.procurarPorId(id);
  }

  async actualizarLocalizacao(id, latitude, longitude) {
    await db('entregas').where('id', id).update({
      latitude_actual: latitude,
      longitude_actual: longitude,
    });
  }

  async eliminar(id) {
    return db('entregas').where('id', id).del();
  }

  async contarEntregas(filtros = {}) {
    const query = db('entregas');
    if (filtros.estado) query.where('estado', filtros.estado);
    if (filtros.entregadorId) query.where('entregador_id', filtros.entregadorId);
    const resultado = await query.count('id as total').first();
    return parseInt(resultado.total) || 0;
  }
}

module.exports = new EntregaModel();
