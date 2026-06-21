const jwt = require('jsonwebtoken');

// ============================================================
// LINKA — Utilitário de Tokens (JWT)
// ============================================================

/**
 * Gera um novo access token (curta duração)
 */
const gerarAccessToken = (utilizador) => {
  return jwt.sign(
    { 
      id: utilizador.id, 
      tipo: utilizador.tipo,
      email: utilizador.email 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRA_EM || '15m' }
  );
};

/**
 * Gera um novo refresh token (longa duração)
 * @param {number} utilizadorId
 * @param {number|null} sessaoId - ID da sessão em user_sessions (opcional)
 */
const gerarRefreshToken = (utilizadorId, sessaoId = null) => {
  const payload = { id: utilizadorId };
  if (sessaoId) payload.sid = sessaoId;
  return jwt.sign(
    payload,
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRA_EM || '7d' }
  );
};

/**
 * Verifica um access token
 */
const verificarAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return null;
  }
};

/**
 * Verifica um refresh token
 */
const verificarRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    return null;
  }
};

module.exports = {
  gerarAccessToken,
  gerarRefreshToken,
  verificarAccessToken,
  verificarRefreshToken
};
