const morgan = require('morgan');
const { logger } = require('../config/logger');

// Stream para o Morgan escrever no Winston
const morganStream = {
  write: (mensagem) => {
    logger.http(mensagem.trim());
  },
};

// Morgan middleware para logging de HTTP requests
const httpLogger = morgan(
  (tokens, req, res) => {
    const partes = [
      tokens.method(req, res),
      tokens.url(req, res),
      tokens.status(req, res),
      tokens['response-time'](req, res) + 'ms',
    ];

    // Adicionar ID de utilizador se autenticado
    if (req.utilizador) {
      partes.push(`user:${req.utilizador.id}`);
    }

    // Adicionar IP real (atrás de proxy)
    const ip = req.headers['x-forwarded-for'] || req.ip;
    if (ip) partes.push(`ip:${ip}`);

    return partes.join(' ');
  },
  {
    stream: morganStream,
    skip: (req, res) => {
      // Não logar health check e assets estáticos
      if (req.url === '/api/saude') return true;
      if (req.url.startsWith('/uploads/')) return true;
      return false;
    },
  }
);

module.exports = httpLogger;
