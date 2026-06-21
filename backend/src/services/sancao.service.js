const sancaoModel = require('../models/sancao.model');
const ErroApp = require('../utils/erro-app');
const db = require('../config/base-de-dados');
const { emitirParaUtilizador } = require('../config/realtime');

class SancaoService {

  async criarSancao(adminId, dados) {
    const { utilizador_id, tipo, motivo, expira_em } = dados;

    if (!['aviso', 'suspensao', 'banimento'].includes(tipo)) {
      throw new ErroApp('Tipo de sanção inválido.', 400);
    }

    if (!motivo || motivo.trim().length < 5) {
      throw new ErroApp('O motivo deve ter pelo menos 5 caracteres.', 400);
    }

    // Admin não pode sancionar a si mesmo
    if (adminId === utilizador_id) {
      throw new ErroApp('Não pode sancionar a si mesmo.', 400);
    }

    const id = await sancaoModel.criar({
      utilizador_id,
      admin_id: adminId,
      tipo,
      motivo: motivo.trim(),
      expira_em: expira_em || null,
    });

    // Se for suspensão ou banimento, actualizar estado do utilizador
    if (tipo === 'suspensao' || tipo === 'banimento') {
      const estado = tipo === 'banimento' ? 'banido' : 'suspenso';
      await db('utilizadores').where('id', utilizador_id).update({ estado });
    }

    // Notificar o utilizador sancionado
    const tipoLabels = { aviso: 'Aviso', suspensao: 'Suspensão', banimento: 'Banimento' };
    emitirParaUtilizador(parseInt(utilizador_id), 'notificacao:nova', {
      tipo: 'sistema',
      titulo: `Sanção aplicada: ${tipoLabels[tipo]}`,
      corpo: `Foi-lhe aplicado um(a) ${tipoLabels[tipo].toLowerCase()} motivo: ${motivo.trim()}`,
      sancao_id: id,
    });

    // Persistir notificação na BD
    await db('notificacoes').insert({
      utilizador_id,
      tipo: 'sistema',
      titulo: `Sanção aplicada: ${tipoLabels[tipo]}`,
      corpo: `Foi-lhe aplicado um(a) ${tipoLabels[tipo].toLowerCase()} motivo: ${motivo.trim()}`,
      dados_json: JSON.stringify({ sancao_id: id }),
    });

    return await sancaoModel.procurarPorId(id);
  }

  async listarPorUtilizador(utilizadorId) {
    return await sancaoModel.listarPorUtilizador(utilizadorId);
  }

  async listarActivas(utilizadorId) {
    return await sancaoModel.listarActivas(utilizadorId);
  }

  async obterPorId(id) {
    const sancao = await sancaoModel.procurarPorId(id);
    if (!sancao) throw new ErroApp('Sanção não encontrada.', 404);
    return sancao;
  }

  async desactivarSancao(id, adminId) {
    const sancao = await sancaoModel.procurarPorId(id);
    if (!sancao) throw new ErroApp('Sanção não encontrada.', 404);
    if (!sancao.activa) throw new ErroApp('Esta sanção já está desactivada.', 400);

    await sancaoModel.desactivar(id);

    // Se era suspensão ou banimento, reactivar utilizador
    if (sancao.tipo === 'suspensao' || sancao.tipo === 'banimento') {
      await db('utilizadores').where('id', sancao.utilizador_id).update({ estado: 'activo' });
    }

    // Notificar o utilizador
    emitirParaUtilizador(parseInt(sancao.utilizador_id), 'notificacao:nova', {
      tipo: 'sistema',
      titulo: 'Sanção desactivada',
      corpo: 'A sua sanção foi desactivada. A sua conta foi reactivada.',
      sancao_id: id,
    });

    return await sancaoModel.procurarPorId(id);
  }

  async verificarActivas(utilizadorId) {
    return await sancaoModel.verificarActivas(utilizadorId);
  }

  async listarTodas() {
    return await sancaoModel.listarTodas();
  }
}

module.exports = new SancaoService();

