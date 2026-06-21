const utilizadorService = require('../services/utilizador.service');
const utilizadorModel = require('../models/utilizador.model');
const vendedorModel = require('../models/vendedor.model');
const sancaoService = require('../services/sancao.service');
const denunciaService = require('../services/denuncia.service');
const resposta = require('../utils/resposta');
const { asyncHandler } = require('../middlewares/erro.middleware');
const { emitirParaUtilizador } = require('../config/realtime');

// ============================================================
// LINKA — Controlador de Utilizador
// ============================================================

class UtilizadorController {
  
  /**
   * Endpoint: GET /api/utilizadores/perfil
   */
  obterPerfil = asyncHandler(async (req, res) => {
    const perfil = await utilizadorService.obterPerfil(req.utilizador.id);
    return resposta.sucesso(res, perfil);
  });

  /**
   * Endpoint: PUT /api/utilizadores/perfil
   */
  actualizarPerfil = asyncHandler(async (req, res) => {
    const perfilActualizado = await utilizadorService.actualizarPerfil(req.utilizador.id, req.body);
    return resposta.sucesso(res, perfilActualizado, 'Perfil actualizado com sucesso.');
  });

  // --- Rotas Admin ---

  /**
   * Endpoint: GET /api/utilizadores/admin/todos
   * Lista todos os utilizadores (admin)
   */
  listarTodos = asyncHandler(async (req, res) => {
    const { tipo, estado, busca } = req.query;
    const utilizadores = await utilizadorModel.listarTodos({ tipo, estado, busca });
    return resposta.sucesso(res, utilizadores);
  });

  /**
   * Endpoint: GET /api/utilizadores/admin/:id
   * Detalhes completos de um utilizador (admin)
   */
  obterDetalhesAdmin = asyncHandler(async (req, res) => {
    const utilizador = await utilizadorModel.obterDetalhesAdmin(req.params.id);
    if (!utilizador) return resposta.naoEncontrado(res, 'Utilizador não encontrado.');
    return resposta.sucesso(res, utilizador);
  });

  /**
   * Endpoint: PUT /api/utilizadores/admin/:id/estado
   * Altera o estado de um utilizador (banir/suspender/activar)
   */
  alterarEstado = asyncHandler(async (req, res) => {
    const { estado } = req.body;
    const estadosPermitidos = ['activo', 'suspenso', 'banido'];
    if (!estadosPermitidos.includes(estado)) {
      return resposta.erro(res, `Estado inválido. Use: ${estadosPermitidos.join(', ')}`, 400);
    }
    await utilizadorModel.alterarEstado(req.params.id, estado);

    // Notificar o utilizador em tempo real
    emitirParaUtilizador(parseInt(req.params.id), 'notificacao:nova', {
      tipo: 'sistema',
      titulo: 'Estado da conta alterado',
      corpo: `O estado da sua conta foi alterado para "${estado}".`,
    });

    return resposta.sucesso(res, null, `Utilizador ${estado} com sucesso.`);
  });

  /**
   * Endpoint: PUT /api/utilizadores/admin/:id/aprovar-vendedor
   * Aprova ou rejeita um vendedor
   */
  aprovarVendedor = asyncHandler(async (req, res) => {
    const { aprovado } = req.body;
    if (aprovado === undefined) {
      return resposta.erro(res, 'Campo "aprovado" é obrigatório (true/false).', 400);
    }

    const vendedor = await vendedorModel.procurarPorUtilizadorId(req.params.id);
    if (!vendedor) {
      return resposta.naoEncontrado(res, 'Perfil de vendedor não encontrado para este utilizador.');
    }

    await vendedorModel.actualizar(vendedor.id, { aprovado: aprovado ? 1 : 0 });

    // Notificar o vendedor
    const titulo = aprovado ? 'Loja aprovada' : 'Loja rejeitada';
    const corpo = aprovado
      ? 'Parabéns! A sua loja foi aprovada e já pode começar a vender.'
      : 'A sua loja não foi aprovada. Contacte o suporte para mais informações.';

    emitirParaUtilizador(parseInt(req.params.id), 'notificacao:nova', {
      tipo: 'vendedor',
      titulo,
      corpo,
    });

    return resposta.sucesso(res, null, titulo);
  });

  /**
   * Endpoint: GET /api/utilizadores/admin/vendedores
   * Lista todos os vendedores (admin)
   */
  listarVendedores = asyncHandler(async (req, res) => {
    const { aprovado, busca } = req.query;
    const filtros = {};
    if (aprovado !== undefined && aprovado !== '') {
      filtros.aprovado = parseInt(aprovado);
    }
    if (busca) filtros.busca = busca;
    const vendedores = await vendedorModel.listarTodos(filtros);
    return resposta.sucesso(res, vendedores);
  });

  /**
   * Endpoint: GET /api/utilizadores/admin/denuncias-pendentes
   * Contagem de denúncias pendentes (alias para admin)
   */
  contarDenunciasPendentes = asyncHandler(async (req, res) => {
    const total = await denunciaService.contarPendentes();
    return resposta.sucesso(res, { total });
  });

  /**
   * Endpoint: GET /api/utilizadores/admin/estatisticas-detalhadas
   * Estatísticas detalhadas para o dashboard admin
   */
  obterEstatisticasDetalhadas = asyncHandler(async (req, res) => {
    const db = require('../config/base-de-dados');

    const [
      totalUtilizadores,
      totalVendedores,
      vendedoresPendentes,
      totalProdutos,
      produtosPendentes,
      totalPedidos,
      pedidosPorEstado,
      receitaPlataforma,
      denunciasPendentes,
      totalSancoesActivas,
      utilizadoresPorTipo,
      registosRecentes,
    ] = await Promise.all([
      db('utilizadores').count('id as total').first(),
      db('vendedores').count('id as total').first(),
      db('vendedores').where('aprovado', 0).count('id as total').first(),
      db('produtos').count('id as total').first(),
      db('produtos').where('aprovado', 0).count('id as total').first(),
      db('pedidos').count('id as total').first(),
      db('pedidos')
        .select('estado')
        .count('id as total')
        .groupBy('estado'),
      db('pedidos')
        .whereIn('estado', ['entregue', 'confirmado'])
        .sum('total as soma')
        .first(),
      db('denuncias').where('estado', 'pendente').count('id as total').first(),
      db('sancoes').where('activa', 1).count('id as total').first(),
      db('utilizadores')
        .select('tipo')
        .count('id as total')
        .groupBy('tipo'),
      db('utilizadores')
        .select('id', 'nome', 'email', 'tipo', 'criado_em')
        .orderBy('criado_em', 'desc')
        .limit(10),
    ]);

    // Converter pedidos por estado para objecto
    const pedidosEstado = {};
    pedidosPorEstado.forEach(e => { pedidosEstado[e.estado] = Number(e.total); });

    // Converter utilizadores por tipo para objecto
    const tiposUtilizador = {};
    utilizadoresPorTipo.forEach(t => { tiposUtilizador[t.tipo] = Number(t.total); });

    return resposta.sucesso(res, {
      total_utilizadores: Number(totalUtilizadores?.total || 0),
      total_vendedores: Number(totalVendedores?.total || 0),
      vendedores_pendentes: Number(vendedoresPendentes?.total || 0),
      total_produtos: Number(totalProdutos?.total || 0),
      produtos_pendentes: Number(produtosPendentes?.total || 0),
      total_pedidos: Number(totalPedidos?.total || 0),
      pedidos_por_estado: pedidosEstado,
      receita_plataforma: Number(receitaPlataforma?.soma || 0),
      denuncias_pendentes: Number(denunciasPendentes?.total || 0),
      total_sancoes_activas: Number(totalSancoesActivas?.total || 0),
      utilizadores_por_tipo: tiposUtilizador,
      registos_recentes: registosRecentes,
    });
  });
}

module.exports = new UtilizadorController();
