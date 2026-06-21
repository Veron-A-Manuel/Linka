const pedidoService = require('../services/pedido.service');
const resposta = require('../utils/resposta');
const { asyncHandler } = require('../middlewares/erro.middleware');

class PedidoController {
  criar = asyncHandler(async (req, res) => {
    const pedido = await pedidoService.criarPedido(req.utilizador, req.body);
    return resposta.criado(res, pedido, 'Pedido realizado com sucesso.');
  });

  listar = asyncHandler(async (req, res) => {
    const pedidos = await pedidoService.listarMeusPedidos(req.utilizador);
    return resposta.sucesso(res, pedidos);
  });

  listarMeus = this.listar;

  obter = asyncHandler(async (req, res) => {
    const pedido = await pedidoService.obterDetalhes(req.params.id, req.utilizador);
    if (!pedido) return resposta.naoEncontrado(res, 'Pedido nao encontrado.');
    return resposta.sucesso(res, pedido);
  });

  obterPorId = this.obter;

  actualizarEstado = asyncHandler(async (req, res) => {
    const { estado } = req.body;
    const pedido = await pedidoService.actualizarEstado(req.params.id, req.utilizador, estado);
    return resposta.sucesso(res, pedido, `Pedido actualizado para: ${estado}`);
  });

  cancelar = asyncHandler(async (req, res) => {
    await pedidoService.cancelarPedido(req.params.id, req.utilizador, req.body?.motivo);
    return resposta.sucesso(res, null, 'Pedido cancelado com sucesso.');
  });
}

module.exports = new PedidoController();
