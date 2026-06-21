const pedidoModel = require('../models/pedido.model');
const produtoModel = require('../models/produto.model');
const vendedorModel = require('../models/vendedor.model');
const { emitirParaUtilizador } = require('../config/realtime');

class PedidoService {
  async criarPedido(utilizador, dados) {
    if (!['cliente', 'admin'].includes(utilizador.tipo)) {
      throw new Error('Apenas clientes podem realizar pedidos.');
    }

    const { itens, metodo_pagamento, endereco_entrega, notas } = dados;
    if (!Array.isArray(itens) || itens.length === 0) {
      throw new Error('O pedido precisa de pelo menos um item.');
    }

    let subtotal = 0;
    const itensProcessados = [];
    let vendedorId = null;

    for (const item of itens) {
      if (!Number.isInteger(Number(item.quantidade)) || Number(item.quantidade) < 1) {
        throw new Error(`Quantidade invalida para o produto ${item.produto_id}.`);
      }

      const produto = await produtoModel.procurarPorId(item.produto_id);
      if (!produto) {
        throw new Error(`Produto ${item.produto_id} nao encontrado.`);
      }

      if (produto.condicao !== 'disponivel' || produto.aprovado !== 1) {
        throw new Error(`Produto ${item.produto_id} nao esta disponivel para compra.`);
      }

      if (!vendedorId) {
        vendedorId = produto.vendedor_id;
      } else if (vendedorId !== produto.vendedor_id) {
        throw new Error('Todos os itens do pedido devem pertencer ao mesmo vendedor.');
      }

      if (Number(item.quantidade) > Number(produto.stock)) {
        throw new Error(`Stock insuficiente para o produto ${item.produto_id}.`);
      }

      const itemSubtotal = produto.preco * item.quantidade;
      subtotal += itemSubtotal;

      itensProcessados.push({
        produto_id: produto.id,
        titulo_produto: produto.titulo,
        preco_unitario: produto.preco,
        quantidade: item.quantidade,
        subtotal: itemSubtotal,
      });
    }

    const taxa_entrega = 150.0;
    const total = subtotal + taxa_entrega;

    const dadosPedido = {
      cliente_id: utilizador.id,
      vendedor_id: vendedorId,
      estado: 'pendente',
      subtotal,
      taxa_entrega,
      total,
      metodo_pagamento: metodo_pagamento || 'dinheiro',
      estado_pagamento: 'pendente',
      endereco_entrega,
      notas,
    };

    const pedidoId = await pedidoModel.criar(dadosPedido, itensProcessados);
    const pedido = await pedidoModel.procurarPorId(pedidoId);
    const vendedor = await vendedorModel.procurarPorId(vendedorId);

    if (vendedor?.utilizador_id) {
      emitirParaUtilizador(vendedor.utilizador_id, 'notificacao:nova', {
        tipo: 'pedido',
        titulo: 'Novo pedido recebido',
        corpo: `Recebeu um novo pedido #${pedidoId}.`,
        pedido_id: pedidoId,
      });
    }

    return pedido;
  }

  async listarMeusPedidos(utilizador) {
    if (utilizador.tipo === 'admin') {
      return await pedidoModel.listarTodos();
    }

    if (utilizador.tipo === 'vendedor') {
      const vendedor = await vendedorModel.procurarPorUtilizadorId(utilizador.id);
      if (!vendedor) {
        throw new Error('Perfil de vendedor nao encontrado.');
      }
      return await pedidoModel.listarPorUtilizador(vendedor.id, 'vendedor');
    }

    return await pedidoModel.listarPorUtilizador(utilizador.id, 'cliente');
  }

  async obterDetalhes(id, utilizador) {
    const pedido = await pedidoModel.procurarPorId(id);
    if (!pedido) {
      return null;
    }

    if (utilizador.tipo !== 'admin') {
      if (utilizador.tipo === 'vendedor') {
        const vendedor = await vendedorModel.procurarPorUtilizadorId(utilizador.id);
        if (!vendedor || pedido.vendedor_id !== vendedor.id) {
          throw new Error('Sem permissao para ver este pedido.');
        }
      } else if (pedido.cliente_id !== utilizador.id) {
        throw new Error('Sem permissao para ver este pedido.');
      }
    }

    return pedido;
  }

  async _obterVendedorDoUtilizador(utilizador) {
    if (utilizador.tipo === 'admin') {
      return null;
    }

    const vendedor = await vendedorModel.procurarPorUtilizadorId(utilizador.id);
    if (!vendedor) {
      throw new Error('Perfil de vendedor nao encontrado.');
    }

    return vendedor;
  }

  async actualizarEstado(id, utilizador, novoEstado) {
    const pedido = await pedidoModel.procurarPorId(id);
    if (!pedido) {
      throw new Error('Pedido nao encontrado.');
    }

    const estadosValidos = ['pendente', 'confirmado', 'preparando', 'pronto', 'enviado', 'entregue', 'cancelado', 'reembolsado'];
    if (!estadosValidos.includes(novoEstado)) {
      throw new Error('Estado de pedido invalido.');
    }

    if (utilizador.tipo !== 'admin') {
      const vendedor = await this._obterVendedorDoUtilizador(utilizador);
      if (!vendedor || pedido.vendedor_id !== vendedor.id) {
        throw new Error('Apenas o vendedor dono do pedido pode actualizar o estado.');
      }
    }

    await pedidoModel.actualizarEstado(id, novoEstado);

    emitirParaUtilizador(pedido.cliente_id, 'notificacao:nova', {
      tipo: 'pedido',
      titulo: 'Actualizacao de Pedido',
      corpo: `O seu pedido #${id} esta agora: ${novoEstado}`,
      pedido_id: id,
    });

    return await pedidoModel.procurarPorId(id);
  }

  async cancelarPedido(id, utilizador, motivo) {
    const pedido = await pedidoModel.procurarPorId(id);
    if (!pedido) {
      throw new Error('Pedido nao encontrado.');
    }

    if (pedido.estado === 'entregue' || pedido.estado === 'cancelado') {
      throw new Error('Este pedido ja nao pode ser cancelado.');
    }

    if (utilizador.tipo !== 'admin') {
      const vendedor = utilizador.tipo === 'vendedor'
        ? await vendedorModel.procurarPorUtilizadorId(utilizador.id)
        : null;

      const ehCliente = pedido.cliente_id === utilizador.id;
      const ehVendedor = vendedor && pedido.vendedor_id === vendedor.id;

      if (!ehCliente && !ehVendedor) {
        throw new Error('Sem permissao para cancelar este pedido.');
      }
    }

    await pedidoModel.actualizarEstado(id, 'cancelado', { cancelado_motivo: motivo });
    return true;
  }
}

module.exports = new PedidoService();
