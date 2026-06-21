const entregaModel = require('../models/entrega.model');
const pedidoModel = require('../models/pedido.model');
const { calcularDistancia } = require('../utils/geo');

class EntregaService {
  async criarEntrega(pedidoId, dadosEntrega) {
    const pedido = await pedidoModel.procurarPorId(pedidoId);
    if (!pedido) throw new Error('Pedido não encontrado.');
    if (pedido.estado === 'cancelado' || pedido.estado === 'entregue' || pedido.estado === 'reembolsado') {
      throw new Error('O pedido não está em estado válido para entrega.');
    }

    const existente = await entregaModel.procurarPorPedidoId(pedidoId);
    if (existente) throw new Error('Já existe um pedido de entrega para este pedido.');

    let distancia = null;
    if (dadosEntrega.latitude_origem && dadosEntrega.latitude_destino) {
      distancia = calcularDistancia(
        dadosEntrega.latitude_origem, dadosEntrega.longitude_origem,
        dadosEntrega.latitude_destino, dadosEntrega.longitude_destino
      );
    }

    const entrega = await entregaModel.criar({
      pedido_id: pedidoId,
      endereco_origem: dadosEntrega.endereco_origem,
      endereco_destino: dadosEntrega.endereco_destino,
      latitude_origem: dadosEntrega.latitude_origem,
      longitude_origem: dadosEntrega.longitude_origem,
      latitude_destino: dadosEntrega.latitude_destino,
      longitude_destino: dadosEntrega.longitude_destino,
      preco_entrega: dadosEntrega.preco_entrega || this._calcularPreco(distancia),
      distancia_km: distancia,
      notas: dadosEntrega.notas,
    });

    return entrega;
  }

  async aceitarEntrega(entregaId, entregadorId) {
    const entrega = await entregaModel.procurarPorId(entregaId);
    if (!entrega) throw new Error('Entrega não encontrada.');
    if (entrega.estado !== 'aguardando') throw new Error('Esta entrega já foi aceite por outro entregador.');
    if (entrega.entregador_id) throw new Error('Esta entrega já tem um entregador atribuído.');

    return entregaModel.aceitar(entregaId, entregadorId);
  }

  async actualizarEstado(entregaId, novoEstado, utilizadorId, tipo) {
    const entrega = await entregaModel.procurarPorId(entregaId);
    if (!entrega) throw new Error('Entrega não encontrada.');

    const transicoesValidas = {
      aceite: ['a_caminho', 'cancelado'],
      a_caminho: ['entregue', 'falhou', 'cancelado'],
      aguardando: ['cancelado'],
    };

    const transicoes = transicoesValidas[entrega.estado] || [];
    if (!transicoes.includes(novoEstado)) {
      throw new Error(`Transição inválida: ${entrega.estado} → ${novoEstado}`);
    }

    if (novoEstado === 'cancelado' && tipo !== 'admin') {
      const isDono = tipo === 'vendedor' && entrega.vendedor_nome;
      const isComprador = tipo === 'comprador';
      const isEntregador = tipo === 'entregador' && entrega.entregador_id === utilizadorId;
      if (!isDono && !isComprador && !isEntregador) {
        throw new Error('Sem permissão para cancelar esta entrega.');
      }
    }

    const camposExtras = {};
    if (novoEstado === 'a_caminho') camposExtras.notas = entrega.notas;

    return entregaModel.actualizarEstado(entregaId, novoEstado, camposExtras);
  }

  async actualizarLocalizacao(entregaId, entregadorId, latitude, longitude) {
    const entrega = await entregaModel.procurarPorId(entregaId);
    if (!entrega) throw new Error('Entrega não encontrada.');
    if (entrega.entregador_id !== entregadorId) throw new Error('Sem permissão para actualizar esta entrega.');
    if (!['aceite', 'a_caminho'].includes(entrega.estado)) {
      throw new Error('Só é possível actualizar localização em entregas activas.');
    }
    await entregaModel.actualizarLocalizacao(entregaId, latitude, longitude);
  }

  async listarEntregas(utilizadorId, tipo, filtros) {
    const opcoes = { limite: filtros.limite, offset: filtros.offset };

    if (tipo === 'entregador') {
      opcoes.entregadorId = utilizadorId;
    } else if (tipo === 'vendedor') {
      opcoes.vendedorId = utilizadorId;
    } else if (tipo === 'comprador') {
      opcoes.compradorId = utilizadorId;
    }
    if (filtros.estado) opcoes.estado = filtros.estado;

    return entregaModel.listar(opcoes);
  }

  async listarDisponiveis(filtros) {
    return entregaModel.listarDisponiveis(filtros);
  }

  _calcularPreco(distanciaKm) {
    if (!distanciaKm) return 50;
    const base = 50;
    const porKm = 15;
    return Math.round(base + distanciaKm * porKm);
  }
}

module.exports = new EntregaService();
