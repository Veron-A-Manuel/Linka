const db = require('../config/base-de-dados');
const antiSpamModel = require('../models/anti-spam.model');
const { logger } = require('../config/logger');

class AntiSpamService {
  // ── Rate Limiting ──

  /**
   * Verificar se utilizador pode efectuar acção
   * Retorna { permitido, bloqueio } 
   */
  async verificar(utilizadorId, tipo, ip = null) {
    // 1. Verificar se está bloqueado
    const bloqueio = await antiSpamModel.estaBloqueado(utilizadorId);
    if (bloqueio) {
      return {
        permitido: false,
        bloqueio,
        mensagem: `Conta temporariamente suspensa: ${bloqueio.motivo}`,
      };
    }

    // 2. Verificar padrões de detecção
    const padroes = await antiSpamModel.listarPadroes(true);
    for (const padrao of padroes) {
      if (padrao.tipo_padrao === tipo) {
        const total = await antiSpamModel.contarAccoes(utilizadorId, tipo, padrao.janela_minutos);
        if (total >= padrao.limite_accoes) {
          await this._executarAccao(utilizadorId, padrao, total);
          return {
            permitido: false,
            bloqueio: null,
            mensagem: `Limite atingido: ${padrao.descricao}`,
          };
        }
      }
    }

    // 3. Registar a acção
    await antiSpamModel.registarAcao(utilizadorId, tipo, ip);

    return { permitido: true, bloqueio: null };
  }

  /**
   * Executar acção quando padrão é detectado
   */
  async _executarAccao(utilizadorId, padrao, total) {
    const dadosContexto = JSON.stringify({
      padrao: padrao.nome,
      total_accoes: total,
      limite: padrao.limite_accoes,
      janela: padrao.janela_minutos,
    });

    // Criar alerta
    await antiSpamModel.criarAlerta({
      utilizador_id: utilizadorId,
      padrao_id: padrao.id,
      tipo_alerta: padrao.nome,
      descricao: `${padrao.descricao} (${total} acções em ${padrao.janela_minutos} min)`,
      dados_contexto: dadosContexto,
    });

    // Executar acção
    switch (padrao.accao) {
      case 'bloquear_temp':
        const expira = new Date();
        expira.setMinutes(expira.getMinutes() + Math.min(padrao.janela_minutos * 2, 1440)); // máx 24h
        await antiSpamModel.bloquear(utilizadorId, padrao.descricao, 'temporario', expira);
        logger.warn(`[Anti-Spam] Utilizador ${utilizadorId} bloqueado temporariamente: ${padrao.nome}`);
        break;

      case 'bloquear_perm':
        await antiSpamModel.bloquear(utilizadorId, padrao.descricao, 'permanente');
        logger.warn(`[Anti-Spam] Utilizador ${utilizadorId} bloqueado permanentemente: ${padrao.nome}`);
        break;

      case 'notificar_admin':
        logger.warn(`[Anti-Spam] Alerta para admin: ${padrao.nome} — utilizador ${utilizadorId}`);
        break;

      default:
        logger.info(`[Anti-Spam] Alerta registado: ${padrao.nome} — utilizador ${utilizadorId}`);
    }
  }

  /**
   * Registar acção manual (sem verificação)
   */
  async registarManual(utilizadorId, tipo, ip = null) {
    return await antiSpamModel.registarAcao(utilizadorId, tipo, ip);
  }

  // ── Bloqueios ──

  async bloquearUtilizador(utilizadorId, motivo, horas = 24) {
    const expira = new Date();
    expira.setHours(expira.getHours() + horas);
    return await antiSpamModel.bloquear(utilizadorId, motivo, 'temporario', expira);
  }

  async desbloquearUtilizador(utilizadorId) {
    return await antiSpamModel.desbloquear(utilizadorId);
  }

  async listarBloqueios(estado) {
    return await antiSpamModel.listarBloqueios(estado);
  }

  // ── Padrões ──

  async listarPadroes() {
    return await antiSpamModel.listarPadroes(false);
  }

  async criarPadrao(dados) {
    return await antiSpamModel.criarPadrao(dados);
  }

  async actualizarPadrao(id, dados) {
    return await antiSpamModel.actualizarPadrao(id, dados);
  }

  // ── Alertas ──

  async listarAlertas(estado, limite, offset) {
    return await antiSpamModel.listarAlertas(estado, limite, offset);
  }

  async contarPendentes() {
    return await antiSpamModel.contarAlertasPendentes();
  }

  async resolverAlerta(id, estado, notas, revisadoPor) {
    return await antiSpamModel.resolverAlerta(id, estado, notas, revisadoPor);
  }

  // ── Estatísticas ──

  async estatisticas() {
    return await antiSpamModel.estatisticas();
  }

  // ── Manutenção ──

  async limparRegistosAntigos(dias = 30) {
    return await antiSpamModel.limparRegistosAntigos(dias);
  }
}

module.exports = new AntiSpamService();
