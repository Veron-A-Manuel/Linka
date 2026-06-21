const resposta = require('../utils/resposta');

// ============================================================
// LINKA — Middleware Centralizado de Erros
// Gerencia todas as falhas da aplicação num único local
// ============================================================

/**
 * Wrapper para funções assíncronas (elimina a necessidade de try/catch manual)
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

/**
 * Middleware Global de Erros
 */
const manipuladorErros = (err, req, res, next) => {
  err.codigoStatus = err.codigoStatus || 500;

  // Log detalhado para o servidor (interno)
  console.error(`[ERRO] ${req.method} ${req.originalUrl} - ${err.message}`);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Tratamento de Erros Específicos do Knex/DB
  if (err.code === 'ER_DUP_ENTRY') {
    return resposta.erro(res, 'Já existe um registo com estes dados.', 409);
  }

  // Resposta para o Cliente
  const mensagem = (process.env.NODE_ENV === 'production' && !err.isOperacional)
    ? 'Ocorreu um erro interno no servidor.'
    : err.message;

  return resposta.erro(res, mensagem, err.codigoStatus);
};

module.exports = {
  asyncHandler,
  manipuladorErros
};
