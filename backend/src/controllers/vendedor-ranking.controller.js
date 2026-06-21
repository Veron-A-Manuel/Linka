const vendedorRankingService = require('../services/vendedor-ranking.service');
const resposta = require('../utils/resposta');
const { asyncHandler } = require('../middlewares/erro.middleware');

class VendedorRankingController {
  /**
   * GET /api/ranking/vendedores
   * Ranking dos vendedores para um período
   */
  listar = asyncHandler(async (req, res) => {
    const { periodo, limite } = req.query;
    const dados = await vendedorRankingService.obterRanking(periodo, parseInt(limite) || 50);
    return resposta.sucesso(res, dados);
  });

  /**
   * GET /api/ranking/periodos
   * Períodos disponíveis
   */
  periodos = asyncHandler(async (req, res) => {
    const dados = await vendedorRankingService.obterPeriodos();
    return resposta.sucesso(res, dados);
  });

  /**
   * GET /api/ranking/posicao
   * Posição do vendedor autenticado no ranking
   */
  minhaPosicao = asyncHandler(async (req, res) => {
    const vendedorModel = require('../models/vendedor.model');
    const vendedor = await vendedorModel.procurarPorUtilizadorId(req.utilizador.id);
    if (!vendedor) {
      return resposta.semPermissao(res, 'O utilizador não tem perfil de vendedor.');
    }

    const posicao = await vendedorRankingService.obterPosicaoVendedor(vendedor.id);
    const ranking = await vendedorRankingService.obterRanking(null, 50);
    const meuRanking = ranking.find(r => r.vendedor_id === vendedor.id);

    return resposta.sucesso(res, {
      posicao,
      dados: meuRanking || null,
    });
  });

  /**
   * GET /api/ranking/evolucao
   * Evolução do vendedor autenticado
   */
  minhaEvolucao = asyncHandler(async (req, res) => {
    const vendedorModel = require('../models/vendedor.model');
    const vendedor = await vendedorModel.procurarPorUtilizadorId(req.utilizador.id);
    if (!vendedor) {
      return resposta.semPermissao(res, 'O utilizador não tem perfil de vendedor.');
    }

    const evolucao = await vendedorRankingService.obterEvolucao(vendedor.id);
    return resposta.sucesso(res, evolucao);
  });

  /**
   * GET /api/ranking/vendedor/:id
   * Ranking de um vendedor específico
   */
  obterVendedor = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const posicao = await vendedorRankingService.obterPosicaoVendedor(parseInt(id));
    const ranking = await vendedorRankingService.obterRanking(null, 50);
    const dados = ranking.find(r => r.vendedor_id === parseInt(id));

    return resposta.sucesso(res, {
      posicao,
      dados: dados || null,
    });
  });

  /**
   * GET /api/ranking/vendedor/:id/perfil
   * Perfil público do vendedor para clientes
   */
  perfilVendedor = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const db = require('../config/base-de-dados');
    const seguidorModel = require('../models/seguidor.model');

    // Obter dados do vendedor
    // Aceitar tanto vendedor_id como utilizador_id
    let vendedor = await db('vendedores as v')
      .select('v.id', 'v.nome_loja', 'v.descricao', 'v.foto_loja', 'v.criado_em', 'v.utilizador_id',
              'u.nome', 'u.avatar', 'u.criado_em as membro_desde')
      .join('utilizadores as u', 'v.utilizador_id', 'u.id')
      .where('v.id', parseInt(id))
      .first();

    // Se não encontrou por vendedor.id, tentar por utilizador.id
    if (!vendedor) {
      vendedor = await db('vendedores as v')
        .select('v.id', 'v.nome_loja', 'v.descricao', 'v.foto_loja', 'v.criado_em', 'v.utilizador_id',
                'u.nome', 'u.avatar', 'u.criado_em as membro_desde')
        .join('utilizadores as u', 'v.utilizador_id', 'u.id')
        .where('u.id', parseInt(id))
        .first();
    }

    if (!vendedor) {
      return resposta.naoEncontrado(res, 'Vendedor não encontrado.');
    }

    // Produtos do vendedor (aprovados)
    const produtos = await db('produtos as p')
      .select('p.id', 'p.titulo', 'p.preco', 'p.moeda', 'p.total_favoritos',
              'p.total_likes', 'p.criado_em', 'ip.caminho as imagem_url')
      .leftJoin('imagens_produto as ip', function() {
        this.on('p.id', '=', 'ip.produto_id').andOn('ip.principal', '=', 1);
      })
      .where('p.vendedor_id', vendedor.id)
      .where('p.aprovado', 1)
      .orderBy('p.criado_em', 'desc')
      .limit(20);

    // Estatísticas
    const totalProdutos = await db('produtos')
      .where('vendedor_id', vendedor.id)
      .where('aprovado', 1)
      .count('id as total')
      .first();

    const totalVendas = await db('pedidos')
      .where('vendedor_id', vendedor.id)
      .where('estado', 'concluido')
      .count('id as total')
      .first();

    // Avaliação média
    const avaliacao = await db('avaliacoes')
      .where('avaliado_id', vendedor.id)
      .where('tipo', 'vendedor')
      .avg('estrelas as media')
      .count('id as total')
      .first();

    // Confiança (usa utilizador_id, não vendedor_id)
    const confianca = await db('confianca_conta')
      .where('utilizador_id', vendedor.utilizador_id || vendedor.id)
      .select('score')
      .first();

    // Seguidores
    const totalSeguidores = await seguidorModel.contarSeguidores(vendedor.id);

    return resposta.sucesso(res, {
      vendedor,
      produtos,
      estatisticas: {
        total_produtos: parseInt(totalProdutos.total) || 0,
        total_vendas: parseInt(totalVendas.total) || 0,
        avaliacao_media: parseFloat(avaliacao.media) || 0,
        total_avaliacoes: parseInt(avaliacao.total) || 0,
        score_confianca: confianca ? confianca.score : null,
        total_seguidores: totalSeguidores,
      }
    });
  });

  /**
   * POST /api/ranking/recalcular
   * Recalcular ranking (admin)
   */
  recalcular = asyncHandler(async (req, res) => {
    if (req.utilizador.tipo !== 'admin') {
      return resposta.semPermissao(res, 'Acesso restrito a administradores.');
    }
    const resultado = await vendedorRankingService.calcularRanking();
    return resposta.sucesso(res, resultado, 'Ranking recalculado com sucesso.');
  });
}

module.exports = new VendedorRankingController();
