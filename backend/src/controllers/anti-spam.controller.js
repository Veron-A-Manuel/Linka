const antiSpamService = require('../services/anti-spam.service');
const vendedorModel = require('../models/vendedor.model');
const resposta = require('../utils/resposta');
const { asyncHandler } = require('../middlewares/erro.middleware');

class AntiSpamController {
  /**
   * POST /api/anti-spam/verificar
   * Verificar se uma acção é permitida
   */
  verificar = asyncHandler(async (req, res) => {
    const { tipo } = req.body;
    const ip = req.ip || req.connection?.remoteAddress;
    const resultado = await antiSpamService.verificar(req.utilizador.id, tipo, ip);
    return resposta.sucesso(res, resultado);
  });

  /**
   * GET /api/anti-spam/estatisticas
   * Estatísticas gerais de anti-spam
   */
  estatisticas = asyncHandler(async (req, res) => {
    const dados = await antiSpamService.estatisticas();
    return resposta.sucesso(res, dados);
  });

  /**
   * GET /api/anti-spam/bloqueios
   * Listar bloqueios activos
   */
  listarBloqueios = asyncHandler(async (req, res) => {
    const { estado = 'ativos' } = req.query;
    const dados = await antiSpamService.listarBloqueios(estado);
    return resposta.sucesso(res, dados);
  });

  /**
   * POST /api/anti-spam/bloquear
   * Bloquear um utilizador manualmente
   */
  bloquear = asyncHandler(async (req, res) => {
    const { utilizador_id, motivo, horas = 24 } = req.body;
    if (!utilizador_id || !motivo) {
      return resposta.erro(res, 'utilizador_id e motivo são obrigatórios.', 400);
    }
    await antiSpamService.bloquearUtilizador(utilizador_id, motivo, horas);
    return resposta.sucesso(res, null, 'Utilizador bloqueado com sucesso.');
  });

  /**
   * POST /api/anti-spam/desbloquear
   * Desbloquear um utilizador
   */
  desbloquear = asyncHandler(async (req, res) => {
    const { utilizador_id } = req.body;
    if (!utilizador_id) {
      return resposta.erro(res, 'utilizador_id é obrigatório.', 400);
    }
    await antiSpamService.desbloquearUtilizador(utilizador_id);
    return resposta.sucesso(res, null, 'Utilizador desbloqueado com sucesso.');
  });

  /**
   * GET /api/anti-spam/alertas
   * Listar alertas de moderação
   */
  listarAlertas = asyncHandler(async (req, res) => {
    const { estado = 'pendente', limite = 50, offset = 0 } = req.query;
    const dados = await antiSpamService.listarAlertas(estado, parseInt(limite), parseInt(offset));
    const pendentes = await antiSpamService.contarPendentes();
    return resposta.sucesso(res, { dados, pendentes });
  });

  /**
   * PUT /api/anti-spam/alertas/:id/resolver
   * Resolver um alerta
   */
  resolverAlerta = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { estado, notas } = req.body;
    if (!estado) {
      return resposta.erro(res, 'estado é obrigatório.', 400);
    }
    const dados = await antiSpamService.resolverAlerta(
      parseInt(id), estado, notas, req.utilizador.id
    );
    return resposta.sucesso(res, dados, 'Alerta actualizado.');
  });

  /**
   * GET /api/anti-spam/padroes
   * Listar padrões de detecção
   */
  listarPadroes = asyncHandler(async (req, res) => {
    const dados = await antiSpamService.listarPadroes();
    return resposta.sucesso(res, dados);
  });

  /**
   * POST /api/anti-spam/padroes
   * Criar novo padrão de detecção
   */
  criarPadrao = asyncHandler(async (req, res) => {
    const { nome, descricao, tipo_padrao, janela_minutos, limite_accoes, accao } = req.body;
    if (!nome || !tipo_padrao || !limite_accoes) {
      return resposta.erro(res, 'nome, tipo_padrao e limite_accoes são obrigatórios.', 400);
    }
    const dados = await antiSpamService.criarPadrao({
      nome, descricao, tipo_padrao,
      janela_minutos: janela_minutos || 60,
      limite_accoes,
      accao: accao || 'alerta',
    });
    return resposta.sucesso(res, dados, 'Padrão criado.', 201);
  });

  /**
   * PUT /api/anti-spam/padroes/:id
   * Actualizar padrão de detecção
   */
  actualizarPadrao = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const dados = await antiSpamService.actualizarPadrao(parseInt(id), req.body);
    return resposta.sucesso(res, dados, 'Padrão actualizado.');
  });

  /**
   * POST /api/anti-spam/limpar
   * Limpar registos antigos
   */
  limpar = asyncHandler(async (req, res) => {
    const { dias = 30 } = req.body;
    const eliminados = await antiSpamService.limparRegistosAntigos(parseInt(dias));
    return resposta.sucesso(res, { eliminados }, `${eliminados} registos antigos eliminados.`);
  });
}

module.exports = new AntiSpamController();
