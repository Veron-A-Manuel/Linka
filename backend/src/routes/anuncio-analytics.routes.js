const express = require('express');
const router = express.Router();
const anuncioAnalyticsController = require('../controllers/anuncio-analytics.controller');
const { verificarAuth } = require('../middlewares/autenticacao.middleware');

// ============================================================
// LINKA — Rotas de Analytics para Vendedores
// /api/analytics/*
// ============================================================

// Métricas gerais do vendedor
router.get('/vendedor', verificarAuth, anuncioAnalyticsController.metricasVendedor);

// Evolução diária do vendedor
router.get('/vendedor/evolucao', verificarAuth, anuncioAnalyticsController.evolucaoDiaria);

// Top produtos do vendedor
router.get('/vendedor/top', verificarAuth, anuncioAnalyticsController.topProdutos);

// Métricas de um produto específico
router.get('/produto/:id', verificarAuth, anuncioAnalyticsController.metricasProduto);

// Comparar períodos de um produto
router.get('/produto/:id/comparar', verificarAuth, anuncioAnalyticsController.compararPeriodos);

// Executar agregação (pode ser chamado por cron ou admin)
router.post('/agregar', verificarAuth, anuncioAnalyticsController.agregar);

module.exports = router;
