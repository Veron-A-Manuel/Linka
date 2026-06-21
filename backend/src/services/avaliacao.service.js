const avaliacaoModel = require('../models/avaliacao.model');
const ErroApp = require('../utils/erro-app');

class AvaliacaoService {

  async criarAvaliacao(avaliadorId, dados) {
    const { avaliado_id, produto_id, pedido_id, estrelas, comentario, tipo } = dados;

    // Validar que não avalia a si mesmo
    if (avaliadorId === avaliado_id) {
      throw new ErroApp('Não pode avaliar a si mesmo.', 400);
    }

    // Validar tipo
    if (!['produto', 'vendedor', 'entregador'].includes(tipo)) {
      throw new ErroApp('Tipo de avaliação inválido.', 400);
    }

    // Se tem pedido_id, verificar se já avaliou
    if (pedido_id) {
      const jaAvaliou = await avaliacaoModel.verificarSeJaAvaliou(avaliadorId, pedido_id, tipo);
      if (jaAvaliou) {
        throw new ErroApp('Já avaliou este pedido para este tipo.', 400);
      }
    }

    const id = await avaliacaoModel.criar({
      avaliador_id: avaliadorId,
      avaliado_id,
      produto_id: produto_id || null,
      pedido_id: pedido_id || null,
      estrelas: estrelas || null,
      comentario: comentario || null,
      tipo,
    });

    // Actualizar pontos de reputação do avaliado (apenas se tiver estrelas)
    if (estrelas) {
      const pontos = estrelas >= 4 ? estrelas : (estrelas === 3 ? 0 : -estrelas);
      const db = require('../config/base-de-dados');
      await db('utilizadores').where('id', avaliado_id).increment('pontos_reputacao', pontos);
    }

    return await avaliacaoModel.procurarPorId(id);
  }

  async listarPorAvaliado(avaliadoId, tipo = null) {
    return await avaliacaoModel.listarPorAvaliado(avaliadoId, tipo);
  }

  async listarPorProduto(produtoId) {
    return await avaliacaoModel.listarPorProduto(produtoId);
  }

  async obterMedia(avaliadoId, tipo) {
    return await avaliacaoModel.mediaEstrelas(avaliadoId, tipo);
  }

  async eliminarAvaliacao(id, utilizadorId) {
    const avaliacao = await avaliacaoModel.procurarPorId(id);
    if (!avaliacao) throw new ErroApp('Avaliação não encontrada.', 404);
    if (avaliacao.avaliador_id !== utilizadorId) {
      throw new ErroApp('Sem permissão para eliminar esta avaliação.', 403);
    }
    return await avaliacaoModel.eliminar(id);
  }
}

module.exports = new AvaliacaoService();
