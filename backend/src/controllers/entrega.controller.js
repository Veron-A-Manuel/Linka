const entregaService = require('../services/entrega.service');
const resposta = require('../utils/resposta');
const { asyncHandler } = require('../middlewares/erro.middleware');

class EntregaController {
  /**
   * POST /api/entregas/:pedidoId
   * Criar pedido de entrega para um pedido
   */
  criar = asyncHandler(async (req, res) => {
    const { pedidoId } = req.params;
    const dados = req.body;

    const entrega = await entregaService.criarEntrega(parseInt(pedidoId), dados);
    return resposta.criado(res, entrega, 'Pedido de entrega criado com sucesso.');
  });

  /**
   * GET /api/entregas
   * Listar entregas do utilizador autenticado
   */
  listar = asyncHandler(async (req, res) => {
    const { estado, limite, offset } = req.query;
    const tipo = req.utilizador.tipo === 'admin' ? 'admin' : req.utilizador.tipo;
    const dados = await entregaService.listarEntregas(
      req.utilizador.id,
      tipo,
      { estado, limite: parseInt(limite) || 20, offset: parseInt(offset) || 0 }
    );
    return resposta.sucesso(res, dados);
  });

  /**
   * GET /api/entregas/disponiveis
   * Listar entregas disponíveis para entregadores
   */
  disponiveis = asyncHandler(async (req, res) => {
    const { limite, offset } = req.query;
    const dados = await entregaService.listarDisponiveis({
      limite: parseInt(limite) || 20,
      offset: parseInt(offset) || 0,
    });
    return resposta.sucesso(res, dados);
  });

  /**
   * GET /api/entregas/:id
   * Obter detalhes de uma entrega
   */
  obter = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const entrega = await require('../models/entrega.model').procurarPorId(parseInt(id));
    if (!entrega) return resposta.naoEncontrado(res, 'Entrega não encontrada.');
    return resposta.sucesso(res, entrega);
  });

  /**
   * PUT /api/entregas/:id/aceitar
   * Entregador aceita uma entrega
   */
  aceitar = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const entrega = await entregaService.aceitarEntrega(parseInt(id), req.utilizador.id);
    return resposta.sucesso(res, entrega, 'Entrega aceite com sucesso.');
  });

  /**
   * PUT /api/entregas/:id/rejeitar
   * Entregador rejeita (desvincula de) uma entrega
   */
  rejeitar = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { actualizarEstado } = require('../models/entrega.model');
    await actualizarEstado(parseInt(id), 'aguardando', { entregador_id: null });
    const entrega = await require('../models/entrega.model').procurarPorId(parseInt(id));
    return resposta.sucesso(res, entrega, 'Entrega rejeitada.');
  });

  /**
   * PUT /api/entregas/:id/a-caminho
   * Marcar entrega como "a caminho"
   */
  ACaminho = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const entrega = await entregaService.actualizarEstado(parseInt(id), 'a_caminho', req.utilizador.id, 'entregador');
    return resposta.sucesso(res, entrega, 'Entrega marcada como "a caminho".');
  });

  /**
   * PUT /api/entregas/:id/entregue
   * Marcar entrega como entregue
   */
  marcarEntregue = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const entrega = await entregaService.actualizarEstado(parseInt(id), 'entregue', req.utilizador.id, 'entregador');
    return resposta.sucesso(res, entrega, 'Entrega marcada como entregue.');
  });

  /**
   * PUT /api/entregas/:id/falhou
   * Marcar entrega como falhada
   */
  marcarFalhou = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const entrega = await entregaService.actualizarEstado(parseInt(id), 'falhou', req.utilizador.id, 'entregador');
    return resposta.sucesso(res, entrega, 'Entrega marcada como falhada.');
  });

  /**
   * PUT /api/entregas/:id/cancelar
   * Cancelar entrega
   */
  cancelar = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const tipo = req.utilizador.tipo;
    const entrega = await entregaService.actualizarEstado(parseInt(id), 'cancelado', req.utilizador.id, tipo);
    return resposta.sucesso(res, entrega, 'Entrega cancelada.');
  });

  /**
   * PUT /api/entregas/:id/localizacao
   * Actualizar posição GPS do entregador
   */
  localizacao = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { latitude, longitude } = req.body;
    await entregaService.actualizarLocalizacao(parseInt(id), req.utilizador.id, latitude, longitude);
    return resposta.sucesso(res, null, 'Localização actualizada.');
  });
}

module.exports = new EntregaController();
