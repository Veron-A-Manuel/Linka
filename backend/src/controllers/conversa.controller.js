const conversaService = require('../services/conversa.service');
const resposta = require('../utils/resposta');
const { asyncHandler } = require('../middlewares/erro.middleware');

// ============================================================
// LINKA — Controlador de Conversas
// ============================================================

class ConversaController {
  
  /**
   * Endpoint: GET /api/conversas
   */
  listar = asyncHandler(async (req, res) => {
    const conversas = await conversaService.listarMinhasConversas(req.utilizador.id);
    return resposta.sucesso(res, conversas);
  });

  /**
   * Endpoint: POST /api/conversas/enviar
   */
  enviar = asyncHandler(async (req, res) => {
    const resultado = await conversaService.enviarMensagem(req.utilizador.id, req.body);
    return resposta.criado(res, resultado, 'Mensagem enviada com sucesso.');
  });

  /**
   * Endpoint: GET /api/conversas/:id/mensagens
   */
  obterMensagens = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const mensagens = await conversaService.obterHistorico(parseInt(id), req.utilizador.id, req.query);
    return resposta.sucesso(res, mensagens);
  });
}

module.exports = new ConversaController();
