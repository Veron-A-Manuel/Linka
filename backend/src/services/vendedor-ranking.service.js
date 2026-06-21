const db = require('../config/base-de-dados');
const vendedorRankingModel = require('../models/vendedor-ranking.model');

class VendedorRankingService {
  /**
   * Pesos para o score composto do ranking
   */
  static PESOS = {
    avaliacao_media: 0.30,    // 30% — Média de avaliações
    vendas_concluidas: 0.25,  // 25% — Total de vendas
    taxa_resposta: 0.20,      // 20% — Taxa de resposta no chat
    taxa_entrega: 0.15,       // 15% — Taxa de entrega a tempo
    visualizacoes: 0.10,      // 10% — Volume de visualizações
  };

  /**
   * Gerar período actual (ex: "2026-W24" ou "2026-06")
   */
  obterPeriodoActual() {
    const agora = new Date();
    const semana = Math.ceil((agora.getDate() + new Date(agora.getFullYear(), agora.getMonth(), 1).getDay()) / 7);
    return `${agora.getFullYear()}-W${String(semana).padStart(2, '0')}`;
  }

  /**
   * Calcular ranking para o período actual
   */
  async calcularRanking() {
    const periodo = this.obterPeriodoActual();

    // Buscar todos os vendedores activos
    const vendedores = await db('vendedores as v')
      .select(
        'v.id as vendedor_id',
        'v.utilizador_id',
        'v.nome_loja',
        'u.nome as vendedor_nome'
      )
      .join('utilizadores as u', 'v.utilizador_id', 'u.id')
      .where('v.aprovado', 1);

    const rankings = [];

    for (const vendedor of vendedores) {
      const metricas = await this._calcularMetricas(vendedor.vendedor_id);
      const scoreComposto = this._calcularScoreComposto(metricas);

      rankings.push({
        vendedor_id: vendedor.vendedor_id,
        periodo,
        score_composto: Math.round(scoreComposto * 100) / 100,
        avaliacao_media: metricas.avaliacao_media,
        total_vendas: metricas.total_vendas,
        taxa_resposta: metricas.taxa_resposta,
        taxa_entrega: metricas.taxa_entrega,
        total_visualizacoes: metricas.total_visualizacoes,
      });
    }

    // Ordenar por score e atribuir posições
    rankings.sort((a, b) => b.score_composto - a.score_composto);
    rankings.forEach((r, i) => { r.posicao = i + 1; });

    // Guardar na BD
    await vendedorRankingModel.guardarLote(rankings);

    return { periodo, total: rankings.length, rankings };
  }

  /**
   * Calcular métricas individuais de um vendedor
   */
  async _calcularMetricas(vendedorId) {
    // 1. Avaliação média
    const [avaliacoes] = await db('avaliacoes as a')
      .where('avaliado_id', function () {
        this.select('utilizador_id').from('vendedores').where('id', vendedorId);
      })
      .where('tipo', 'vendedor')
      .avg('estrelas as media');

    const avaliacaoMedia = Number(avaliacoes?.media || 0);

    // 2. Vendas concluídas (último mês)
    const [vendas] = await db('pedidos')
      .where('vendedor_id', vendedorId)
      .whereIn('estado', ['entregue', 'confirmado'])
      .whereRaw('criado_em >= DATE_SUB(NOW(), INTERVAL 30 DAY)')
      .count('id as total');

    const totalVendas = Number(vendas?.total || 0);

    // 3. Taxa de resposta (conversas onde o vendedor enviou pelo menos 1 mensagem)
    const [conversas] = await db('conversas as c')
      .where(function () {
        this.where('c.utilizador1_id', function () {
          this.select('utilizador_id').from('vendedores').where('id', vendedorId);
        }).orWhere('c.utilizador2_id', function () {
          this.select('utilizador_id').from('vendedores').where('id', vendedorId);
        });
      })
      .count('id as total');

    const totalConversas = Number(conversas?.total || 0);

    const [respostas] = await db('conversas as c')
      .where(function () {
        this.where('c.utilizador1_id', function () {
          this.select('utilizador_id').from('vendedores').where('id', vendedorId);
        }).orWhere('c.utilizador2_id', function () {
          this.select('utilizador_id').from('vendedores').where('id', vendedorId);
        });
      })
      .whereIn('c.id', function () {
        this.select('conversa_id').from('mensagens').where('remetente_id', function () {
          this.select('utilizador_id').from('vendedores').where('id', vendedorId);
        });
      })
      .count('id as total');

    const taxaResposta = totalConversas > 0
      ? (Number(respostas?.total || 0) / totalConversas) * 100
      : 50; // Default 50% se não tiver dados

    // 4. Taxa de pedidos concluídos (entregues vs total)
    const [pedidosTotais] = await db('pedidos')
      .where('vendedor_id', vendedorId)
      .whereNotIn('estado', ['cancelado'])
      .count('id as total');

    const [pedidosEntregues] = await db('pedidos')
      .where('vendedor_id', vendedorId)
      .where('estado', 'entregue')
      .count('id as total');

    const totalPedidos = Number(pedidosTotais?.total || 0);
    const taxaEntrega = totalPedidos > 0
      ? (Number(pedidosEntregues?.total || 0) / totalPedidos) * 100
      : 50; // Default 50% se não tiver dados

    // 5. Total de visualizações nos anúncios
    const [views] = await db('produtos')
      .where('vendedor_id', vendedorId)
      .where('aprovado', 1)
      .sum('total_visualizacoes as total');

    const totalVisualizacoes = Number(views?.total || 0);

    return {
      avaliacao_media: avaliacaoMedia,
      total_vendas: totalVendas,
      taxa_resposta: Math.round(taxaResposta * 100) / 100,
      taxa_entrega: Math.round(taxaEntrega * 100) / 100,
      total_visualizacoes: totalVisualizacoes,
    };
  }

  /**
   * Calcular score composto a partir das métricas
   */
  _calcularScoreComposto(metricas) {
    const { PESOS } = VendedorRankingService;

    // Normalizar cada métrica para 0-100
    const normAvaliacao = (metricas.avaliacao_media / 5) * 100;
    const normVendas = Math.min(100, (metricas.total_vendas / 20) * 100); // 20 vendas = 100%
    const normResposta = metricas.taxa_resposta;
    const normEntrega = metricas.taxa_entrega;
    const normViews = Math.min(100, (metricas.total_visualizacoes / 1000) * 100); // 1000 views = 100%

    const score =
      (normAvaliacao * PESOS.avaliacao_media) +
      (normVendas * PESOS.vendas_concluidas) +
      (normResposta * PESOS.taxa_resposta) +
      (normEntrega * PESOS.taxa_entrega) +
      (normViews * PESOS.visualizacoes);

    return Math.round(score * 100) / 100;
  }

  /**
   * Obter ranking de um período
   */
  async obterRanking(periodo = null, limite = 50) {
    const periodoFinal = periodo || this.obterPeriodoActual();
    return await vendedorRankingModel.obterPorPeriodo(periodoFinal, limite);
  }

  /**
   * Obter posição de um vendedor
   */
  async obterPosicaoVendedor(vendedorId, periodo = null) {
    const periodoFinal = periodo || this.obterPeriodoActual();
    return await vendedorRankingModel.obterPosicao(vendedorId, periodoFinal);
  }

  /**
   * Obter períodos disponíveis
   */
  async obterPeriodos() {
    return await vendedorRankingModel.obterPeriodos();
  }

  /**
   * Obter evolução de um vendedor
   */
  async obterEvolucao(vendedorId) {
    return await vendedorRankingModel.obterEvolucao(vendedorId);
  }
}

module.exports = new VendedorRankingService();
