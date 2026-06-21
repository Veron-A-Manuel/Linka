const { verificarAccessToken } = require('../utils/token');
const resposta = require('../utils/resposta');

// ============================================================
// LINKA — Middleware de Autenticação
// Verifica se o utilizador está autenticado via cookie (JWT)
//
// Nota: A verificação de sessão revogada é feita no refresh
// (autenticacao.service.js), não em cada request, por performance.
// O access token expira em 15 min, máximo.
// ============================================================

const verificarAuth = (req, res, next) => {
  // 1. Tentar ler do cookie primeiro (mais seguro)
  let token = req.cookies.access_token;

  // 2. Fallback para cabeçalho Authorization (Bearer token)
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // 3. Se não haver token, rejeita
  if (!token) {
    return resposta.naoAutorizado(res, 'Acesso negado. Por favor, faça login.');
  }

  // 4. Verificar token
  const payload = verificarAccessToken(token);
  
  if (!payload) {
    return resposta.naoAutorizado(res, 'Sessão expirada ou inválida. Por favor, faça login novamente.');
  }

  // 5. Injectar dados do utilizador no request para os próximos passos
  req.utilizador = payload;
  
  next();
};

const verificarAuthOpcional = (req, res, next) => {
  let token = req.cookies?.access_token;

  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    const payload = verificarAccessToken(token);
    if (payload) {
      req.utilizador = payload;
    }
  }

  next();
};

module.exports = { verificarAuth, verificarAuthOpcional };
