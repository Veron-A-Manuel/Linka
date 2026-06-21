const carrinhoService = require('../services/carrinho.service');
const resposta = require('../utils/resposta');
const { asyncHandler } = require('../middlewares/erro.middleware');

class CarrinhoController {

  adicionar = asyncHandler(async (req, res) => {
    const { produto_id, quantidade = 1 } = req.body;
    const resultado = await carrinhoService.adicionar(req.utilizador.id, produto_id, quantidade);
    return resposta.criado(res, resultado, 'Produto adicionado ao carrinho.');
  });

  actualizarQuantidade = asyncHandler(async (req, res) => {
    const { produto_id } = req.params;
    const { quantidade } = req.body;
    const resultado = await carrinhoService.actualizarQuantidade(req.utilizador.id, parseInt(produto_id), quantidade);
    return resposta.sucesso(res, resultado, 'Quantidade actualizada.');
  });

  remover = asyncHandler(async (req, res) => {
    const { produto_id } = req.params;
    const resultado = await carrinhoService.remover(req.utilizador.id, parseInt(produto_id));
    return resposta.sucesso(res, resultado, 'Produto removido do carrinho.');
  });

  removerItem = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const resultado = await carrinhoService.removerItem(req.utilizador.id, parseInt(id));
    return resposta.sucesso(res, resultado, 'Item removido.');
  });

  listar = asyncHandler(async (req, res) => {
    const itens = await carrinhoService.listar(req.utilizador.id);
    return resposta.sucesso(res, itens);
  });

  resumo = asyncHandler(async (req, res) => {
    const resultado = await carrinhoService.resumo(req.utilizador.id);
    return resposta.sucesso(res, resultado);
  });

  limpar = asyncHandler(async (req, res) => {
    const resultado = await carrinhoService.limpar(req.utilizador.id);
    return resposta.sucesso(res, resultado, 'Carrinho limpo.');
  });
}

module.exports = new CarrinhoController();
