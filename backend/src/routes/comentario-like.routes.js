const express = require('express');
const router = express.Router();
const comentarioLikeController = require('../controllers/comentario-like.controller');
const { verificarAuth } = require('../middlewares/autenticacao.middleware');

// ============================================================
// LINKA — Rotas de Likes em Comentários
// /api/comentario-likes/*
// ============================================================

router.use(verificarAuth);

router.post('/:comentario_id/toggle', comentarioLikeController.toggle);
router.get('/:comentario_id/verificar', comentarioLikeController.verificar);
router.get('/:comentario_id/contar', comentarioLikeController.contar);

module.exports = router;
