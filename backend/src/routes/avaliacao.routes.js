const express = require('express');
const router = express.Router();
const avaliacaoController = require('../controllers/avaliacao.controller');
const { verificarAuth } = require('../middlewares/autenticacao.middleware');
const { validarAvaliacao } = require('../middlewares/validacao.middleware');

// ============================================================
// LINKA — Rotas de Avaliações
// /api/avaliacoes/*
// ============================================================

// Rotas públicas
router.get('/produto/:produto_id', avaliacaoController.listarPorProduto);
router.get('/utilizador/:utilizador_id', avaliacaoController.listarPorUtilizador);
router.get('/utilizador/:utilizador_id/media', avaliacaoController.obterMedia);

// Rotas autenticadas
router.use(verificarAuth);

router.post('/', validarAvaliacao, avaliacaoController.criar);
router.delete('/:id', avaliacaoController.eliminar);

module.exports = router;
