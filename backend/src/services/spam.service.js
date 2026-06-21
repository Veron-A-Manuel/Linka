const db = require('../config/base-de-dados');
const spamModel = require('../models/spam.model');
const { logger } = require('../config/logger');

const LIMITES = {
  mensagem: { max: 15, janelaMin: 1 },
  like: { max: 30, janelaMin: 1 },
  favorito: { max: 20, janelaMin: 5 },
  comentario: { max: 10, janelaMin: 5 },
  partager: { max: 20, janelaMin: 5 },
  view: { max: 60, janelaMin: 1 },
};

class SpamService {
  async verificarERegistar(utilizadorId, tipoEvento, contexto = {}) {
    if (!utilizadorId) return { permitido: true };

    const limite = LIMITES[tipoEvento] || { max: 50, janelaMin: 1 };

    // 1. Verificar flood (eventos demais na mesma janela)
    const totalEventos = await spamModel.verificarFlood(
      utilizadorId, tipoEvento, limite.max + 5, limite.janelaMin
    );

    if (totalEventos >= limite.max) {
      await spamModel.registar({
        utilizador_id: utilizadorId,
        tipo: 'mensagem_flood',
        detalhes_json: JSON.stringify({
          evento: tipoEvento,
          total: totalEventos,
          limite: limite.max,
          janela: limite.janelaMin,
        }),
        accao_tomada: totalEventos >= limite.max * 2 ? 'bloqueado' : 'limitado',
      });

      logger.warn(`[SPAM] Flood detectado: user ${utilizadorId}, evento ${tipoEvento}, ${totalEventos}/${limite.max}`);

      return {
        permitido: false,
        accao: totalEventos >= limite.max * 2 ? 'bloqueado' : 'limitado',
        retryAfter: limite.janelaMin * 60,
      };
    }

    // 2. Verificar duplicados (mesmo evento em curto espaço)
    const isDuplicado = await spamModel.verificarDuplicado(
      utilizadorId, contexto.produtoId || 0, tipoEvento, 30
    );

    if (isDuplicado && tipoEvento !== 'view') {
      await spamModel.registar({
        utilizador_id: utilizadorId,
        tipo: 'mensagem_duplicada',
        detalhes_json: JSON.stringify({
          evento: tipoEvento,
          produto_id: contexto.produtoId,
        }),
        accao_tomada: 'alertado',
      });

      return { permitido: true, alerta: 'Evento duplicado detectado.' };
    }

    // 3. Rate limit por accão
    const contador = await spamModel.incrementarRateLimit(
      utilizadorId, tipoEvento, limite.janelaMin
    );

    return { permitido: true, contador, limite: limite.max };
  }

  async obterEstatisticas() {
    const totalAlertas = await spamModel.contarPorTipo('mensagem_flood', 24);
    const totalDuplicados = await spamModel.contarPorTipo('mensagem_duplicada', 24);
    const totalBloqueados = await db('spam_reports')
      .where('accao_tomada', 'bloqueado')
      .whereRaw('criado_em >= DATE_SUB(NOW(), INTERVAL 24 HOUR)')
      .count('id as total')
      .first();

    return {
      alertas_24h: totalAlertas,
      duplicados_24h: totalDuplicados,
      bloqueados_24h: Number(totalBloqueados?.total || 0),
    };
  }

  async limparDadosAntigos(dias = 90) {
    return await spamModel.limparAntigos(dias);
  }
}

module.exports = new SpamService();
