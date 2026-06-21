const express = require('express');
const router = express.Router();
const favoritoController = require('../controllers/favorito.controller');
const { verificarAuth } = require('../middlewares/autenticacao.middleware');

// ============================================================
// LINKA — Rotas de Favoritos
// /api/favoritos/*
// ============================================================

router.use(verificarAuth);

router.get('/', favoritoController.listar);
router.post('/verificar', favoritoController.verificar);
router.post('/:produto_id', favoritoController.adicionar);
router.delete('/:produto_id', favoritoController.remover);

module.exports = router;
