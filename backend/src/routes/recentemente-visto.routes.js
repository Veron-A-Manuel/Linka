const express = require('express');
const router = express.Router();
const recentementeVistoController = require('../controllers/recentemente-visto.controller');
const { verificarAuth } = require('../middlewares/autenticacao.middleware');

// ============================================================
// LINKA — Rotas de Produtos Vistos Recentemente
// /api/recentemente-vistos/*
// ============================================================

router.use(verificarAuth);

router.post('/:produto_id', recentementeVistoController.registar);
router.get('/', recentementeVistoController.listar);
router.delete('/:produto_id', recentementeVistoController.eliminar);
router.delete('/', recentementeVistoController.limpar);

module.exports = router;
