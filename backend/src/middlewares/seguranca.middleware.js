const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { getRedisClient } = require('../config/cache');
const resposta = require('../utils/resposta');

// ============================================================
// LINKA — Middleware de Segurança e Controlo de Acesso
// ============================================================

function criarStoreRedis() {
  try {
    const redisClient = getRedisClient();
    if (redisClient && redisClient.isReady) {
      return new RedisStore({
        sendCommand: (...args) => redisClient.sendCommand(args),
        prefix: 'linka:rl:',
      });
    }
  } catch (e) {
    // Redis não disponível — usar store em memória
  }
  return undefined;
}

/**
 * Limitador de tentativas de login/registo para evitar Brute Force
 */
const limitadorLogin = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: Number(process.env.RATE_LIMIT_LOGIN_MAX || 100),
  message: {
    sucesso: false,
    erro: 'Demasiadas tentativas. Por favor, tente novamente após 15 minutos.',
    codigo: 429
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: criarStoreRedis(),
  skipSuccessfulRequests: true,
});

/**
 * Limitador geral para a API (Protecção contra DoS)
 */
const limitadorGeral = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: Number(process.env.RATE_LIMIT_GERAL_MAX || 1000),
  message: {
    sucesso: false,
    erro: 'Limite de pedidos excedido.',
    codigo: 429
  },
  store: criarStoreRedis(),
});

/**
 * Middleware para verificar o papel (role) do utilizador (RBAC)
 * @param {Array} papeisPermitidos - Lista de tipos de utilizador (ex: ['admin', 'vendedor'])
 */
const verificarPapel = (papeisPermitidos) => {
  return (req, res, next) => {
    if (!req.utilizador) {
      return resposta.naoAutorizado(res, 'Não autenticado.');
    }

    if (!papeisPermitidos.includes(req.utilizador.tipo)) {
      return resposta.semPermissao(res, 'Não tem permissão para realizar esta acção.');
    }

    next();
  };
};

module.exports = {
  limitadorLogin,
  limitadorGeral,
  verificarPapel
};
