// ============================================================
// LINKA — Rotas de Estatísticas do Dashboard
// ============================================================

const express = require('express');
const router = express.Router();
const estatisticasController = require('../controllers/estatisticas.controller');
const { verificarAuth } = require('../middlewares/autenticacao.middleware');

// GET /api/estatisticas/vendedor — métricas do painel do vendedor (privado)
router.get('/vendedor', verificarAuth, estatisticasController.obterVendedor);

// GET /api/estatisticas/plataforma — métricas globais (apenas admin)
router.get('/plataforma', verificarAuth, estatisticasController.obterPlataforma);

module.exports = router;
