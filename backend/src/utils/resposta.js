// ============================================================
// LINKA — Utilitário de Resposta Padronizada
// Todas as respostas da API seguem este formato:
// Sucesso: { sucesso: true, dados: {}, mensagem: "" }
// Erro:    { sucesso: false, erro: "", codigo: 400 }
// ============================================================

/**
 * Resposta de sucesso
 */
const sucesso = (res, dados = null, mensagem = 'Operação realizada com sucesso', status = 200) => {
  return res.status(status).json({
    sucesso: true,
    dados,
    mensagem,
  });
};

/**
 * Resposta de criação (201)
 */
const criado = (res, dados = null, mensagem = 'Recurso criado com sucesso') => {
  return sucesso(res, dados, mensagem, 201);
};

/**
 * Resposta de erro
 */
const erro = (res, mensagem = 'Erro interno do servidor', codigo = 500) => {
  return res.status(codigo).json({
    sucesso: false,
    erro: mensagem,
    codigo,
  });
};

/**
 * Erro de validação (422)
 */
const validacao = (res, mensagem = 'Dados inválidos') => {
  return erro(res, mensagem, 422);
};

/**
 * Não autorizado (401)
 */
const naoAutorizado = (res, mensagem = 'Autenticação necessária') => {
  return erro(res, mensagem, 401);
};

/**
 * Sem permissão (403)
 */
const semPermissao = (res, mensagem = 'Sem permissão para esta acção') => {
  return erro(res, mensagem, 403);
};

/**
 * Não encontrado (404)
 */
const naoEncontrado = (res, mensagem = 'Recurso não encontrado') => {
  return erro(res, mensagem, 404);
};

module.exports = {
  sucesso,
  criado,
  erro,
  validacao,
  naoAutorizado,
  semPermissao,
  naoEncontrado,
};
