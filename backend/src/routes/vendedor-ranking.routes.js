const express = require('express');
const router = express.Router();
const vendedorRankingController = require('../controllers/vendedor-ranking.controller');
const { verificarAuth } = require('../middlewares/autenticacao.middleware');
const { exigirAdmin } = require('../middlewares/autorizacao.middleware');

// ============================================================
// LINKA — Rotas de Ranking de Vendedores
// /api/ranking/*
// ============================================================

// Ranking geral (público)
router.get('/vendedores', vendedorRankingController.listar);

// Períodos disponíveis (público)
router.get('/periodos', vendedorRankingController.periodos);

// Posição do vendedor autenticado
router.get('/posicao', verificarAuth, vendedorRankingController.minhaPosicao);

// Evolução do vendedor autenticado
router.get('/evolucao', verificarAuth, vendedorRankingController.minhaEvolucao);

// Ranking de um vendedor específico (público)
router.get('/vendedor/:id', vendedorRankingController.obterVendedor);

// Perfil público do vendedor para clientes (público)
router.get('/vendedor/:id/perfil', vendedorRankingController.perfilVendedor);

// Recalcular ranking (admin)
router.post('/recalcular', verificarAuth, exigirAdmin, vendedorRankingController.recalcular);

module.exports = router;
