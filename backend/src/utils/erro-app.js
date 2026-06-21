// ============================================================
// LINKA — Classe de Erro Customizada
// Permite distinguir erros operacionais de erros do sistema
// ============================================================

class ErroApp extends Error {
  constructor(mensagem, codigoStatus) {
    super(mensagem);

    this.codigoStatus = codigoStatus;
    this.status = `${codigoStatus}`.startsWith('4') ? 'falha' : 'erro';
    this.isOperacional = true; // Indica que é um erro esperado (ex: validação)

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ErroApp;
