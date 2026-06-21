const db = require('../config/base-de-dados');

class AntiSpamModel {
  // ── Rate Limiting ──

  async registarAcao(utilizadorId, tipo, ip = null) {
    return await db('anti_spam_registos').insert({
      utilizador_id: utilizadorId,
      tipo_accao: tipo,
      ip_address: ip,
    });
  }

  async contarAccoes(utilizadorId, tipo, janelaMinutos = 60) {
    const [resultado] = await db('anti_spam_registos')
      .where('utilizador_id', utilizadorId)
      .where('tipo_accao', tipo)
      .whereRaw('criado_em >= DATE_SUB(NOW(), INTERVAL ? MINUTE)', [janelaMinutos])
      .count('id as total');
    return resultado.total || 0;
  }

  async contarAccoesIP(ip, tipo, janelaMinutos = 60) {
    if (!ip) return 0;
    const [resultado] = await db('anti_spam_registos')
      .where('ip_address', ip)
      .where('tipo_accao', tipo)
      .whereRaw('criado_em >= DATE_SUB(NOW(), INTERVAL ? MINUTE)', [janelaMinutos])
      .count('id as total');
    return resultado.total || 0;
  }

  async limparRegistosAntigos(dias = 30) {
    return await db('anti_spam_registos')
      .whereRaw('criado_em < DATE_SUB(NOW(), INTERVAL ? DAY)', [dias])
      .del();
  }

  // ── Bloqueios ──

  async bloquear(utilizadorId, motivo, tipo = 'temporario', expiraEm = null) {
    // Desactivar bloqueios anteriores do mesmo tipo
    await db('anti_spam_bloqueios')
      .where({ utilizador_id: utilizadorId, ativo: 1 })
      .update({ ativo: 0 });

    return await db('anti_spam_bloqueios').insert({
      utilizador_id: utilizadorId,
      motivo,
      tipo_bloqueio: tipo,
      expira_em: expiraEm,
    });
  }

  async estaBloqueado(utilizadorId) {
    const bloqueio = await db('anti_spam_bloqueios')
      .where({ utilizador_id: utilizadorId, ativo: 1 })
      .where(function () {
        this.whereNull('expira_em').orWhere('expira_em', '>', new Date());
      })
      .first();

    if (!bloqueio) return null;

    // Se bloqueio temporário expirou, desactivar
    if (bloqueio.tipo_bloqueio === 'temporario' && bloqueio.expira_em && new Date(bloqueio.expira_em) <= new Date()) {
      await db('anti_spam_bloqueios').where({ id: bloqueio.id }).update({ ativo: 0 });
      return null;
    }

    return bloqueio;
  }

  async desbloquear(utilizadorId) {
    return await db('anti_spam_bloqueios')
      .where({ utilizador_id: utilizadorId, ativo: 1 })
      .update({ ativo: 0 });
  }

  async listarBloqueios(estado = 'ativos') {
    let query = db('anti_spam_bloqueios as b')
      .join('utilizadores as u', 'b.utilizador_id', 'u.id')
      .select('b.*', 'u.nome', 'u.email');

    if (estado === 'ativos') {
      query = query.where('b.ativo', 1)
        .where(function () {
          this.whereNull('b.expira_em').orWhere('b.expira_em', '>', new Date());
        });
    }

    return await query.orderBy('b.criado_em', 'desc');
  }

  // ── Padrões de Detecção ──

  async listarPadroes(ativos = true) {
    let query = db('padroes_deteccao');
    if (ativos) query = query.where('ativo', 1);
    return await query.orderBy('nome');
  }

  async obterPadrao(id) {
    return await db('padroes_deteccao').where('id', id).first();
  }

  async criarPadrao(dados) {
    const [id] = await db('padroes_deteccao').insert(dados);
    return { id, ...dados };
  }

  async actualizarPadrao(id, dados) {
    await db('padroes_deteccao').where('id', id).update(dados);
    return await this.obterPadrao(id);
  }

  // ── Alertas ──

  async criarAlerta(dados) {
    const [id] = await db('alertas_moderacao').insert(dados);
    return { id, ...dados };
  }

  async listarAlertas(estado = 'pendente', limite = 50, offset = 0) {
    let query = db('alertas_moderacao as a')
      .join('utilizadores as u', 'a.utilizador_id', 'u.id')
      .leftJoin('padroes_deteccao as p', 'a.padrao_id', 'p.id')
      .select(
        'a.*',
        'u.nome as utilzador_nome',
        'u.email as utilizador_email',
        'p.nome as padrao_nome'
      );

    if (estado && estado !== 'todos') {
      query = query.where('a.estado', estado);
    }

    return await query
      .orderBy('a.criado_em', 'desc')
      .limit(limite)
      .offset(offset);
  }

  async contarAlertasPendentes() {
    const [resultado] = await db('alertas_moderacao')
      .where('estado', 'pendente')
      .count('id as total');
    return resultado.total || 0;
  }

  async resolverAlerta(id, estado, notas = null, revisadoPor = null) {
    await db('alertas_moderacao').where('id', id).update({
      estado,
      notas_revisao: notas,
      revisado_por: revisadoPor,
    });
    return await db('alertas_moderacao').where('id', id).first();
  }

  async estatisticas() {
    const [total] = await db('alertas_moderacao').count('id as t');
    const [pendentes] = await db('alertas_moderacao').where('estado', 'pendente').count('id as t');
    const [bloqueios] = await db('anti_spam_bloqueios').where('ativo', 1).count('id as t');
    const [registosHoje] = await db('anti_spam_registos')
      .whereRaw('DATE(criado_em) = CURDATE()')
      .count('id as t');

    return {
      total_alertas: total.t || 0,
      alertas_pendentes: pendentes.t || 0,
      bloqueios_activos: bloqueios.t || 0,
      accoes_hoje: registosHoje.t || 0,
    };
  }
}

module.exports = new AntiSpamModel();
