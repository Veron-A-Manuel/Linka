// ============================================================
// LINKA — Controlador de Estatísticas do Dashboard
// Agrega métricas reais para o painel do Vendedor e Admin
// ============================================================

const db = require('../config/base-de-dados');
const resposta = require('../utils/resposta');
const { asyncHandler } = require('../middlewares/erro.middleware');
const vendedorModel = require('../models/vendedor.model');

class EstatisticasController {

  /**
   * GET /api/estatisticas/vendedor
   * Retorna métricas do dashboard do vendedor autenticado
   */
  obterVendedor = asyncHandler(async (req, res) => {
    const utilizadorId = req.utilizador.id;

    // Obter o registo de vendedor associado ao utilizador
    const vendedor = await vendedorModel.procurarPorUtilizadorId(utilizadorId);
    if (!vendedor) {
      return resposta.semPermissao(res, 'O utilizador não tem perfil de vendedor.');
    }

    const vendedorId = vendedor.id;

    // Executar todas as queries em paralelo para maior eficiência
    const [
      totalAnuncios,
      totalVendas,
      receitaTotal,
      pedidosPendentes,
      mensagensNaoLidas,
      ultimosPedidos,
    ] = await Promise.all([
      // 1. Total de anúncios publicados pelo vendedor
      db('produtos').where({ vendedor_id: vendedorId }).count('id as total').first(),

      // 2. Total de vendas (pedidos com estado != cancelado)
      db('pedidos')
        .where({ vendedor_id: vendedorId })
        .whereNotIn('estado', ['cancelado'])
        .count('id as total')
        .first(),

      // 3. Receita total (pedidos entregues ou confirmados)
      db('pedidos')
        .where({ vendedor_id: vendedorId })
        .whereIn('estado', ['entregue', 'confirmado', 'preparando', 'pronto', 'enviado'])
        .sum('total as soma')
        .first(),

      // 4. Pedidos pendentes de ação
      db('pedidos')
        .where({ vendedor_id: vendedorId, estado: 'pendente' })
        .count('id as total')
        .first(),

      // 5. Mensagens não lidas nas conversas do vendedor
      db('mensagens as m')
        .join('conversas as c', 'm.conversa_id', 'c.id')
        .where('m.lida', 0)
        .andWhereNot('m.remetente_id', utilizadorId)
        .andWhere(function () {
          this.where('c.utilizador1_id', utilizadorId).orWhere('c.utilizador2_id', utilizadorId);
        })
        .count('m.id as total')
        .first(),

      // 6. Últimos 5 pedidos recebidos
      db('pedidos as p')
        .select('p.id', 'p.estado', 'p.total', 'p.criado_em', 'u.nome as cliente_nome')
        .leftJoin('utilizadores as u', 'p.cliente_id', 'u.id')
        .where('p.vendedor_id', vendedorId)
        .orderBy('p.criado_em', 'desc')
        .limit(5),
    ]);

    return resposta.sucesso(res, {
      anuncios: Number(totalAnuncios?.total || 0),
      vendas: Number(totalVendas?.total || 0),
      receita: Number(receitaTotal?.soma || 0),
      pedidos_pendentes: Number(pedidosPendentes?.total || 0),
      mensagens_nao_lidas: Number(mensagensNaoLidas?.total || 0),
      ultimos_pedidos: ultimosPedidos || [],
    });
  });

  /**
   * GET /api/estatisticas/plataforma
   * Retorna métricas globais (apenas para Admin)
   */
  obterPlataforma = asyncHandler(async (req, res) => {
    if (req.utilizador.tipo !== 'admin') {
      return resposta.semPermissao(res, 'Acesso restrito a administradores.');
    }

    const [
      totalUtilizadores,
      totalVendedores,
      totalProdutos,
      totalPedidos,
      receitaPlataforma,
    ] = await Promise.all([
      db('utilizadores').count('id as total').first(),
      db('vendedores').count('id as total').first(),
      db('produtos').where('aprovado', 1).count('id as total').first(),
      db('pedidos').count('id as total').first(),
      db('pedidos')
        .whereIn('estado', ['entregue', 'confirmado'])
        .sum('total as soma')
        .first(),
    ]);

    return resposta.sucesso(res, {
      utilizadores: Number(totalUtilizadores?.total || 0),
      vendedores: Number(totalVendedores?.total || 0),
      produtos: Number(totalProdutos?.total || 0),
      pedidos: Number(totalPedidos?.total || 0),
      receita_plataforma: Number(receitaPlataforma?.soma || 0),
    });
  });
}

module.exports = new EstatisticasController();
