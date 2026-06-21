const express = require('express');
const router = express.Router();
const comentarioRespostaController = require('../controllers/comentario-resposta.controller');
const { verificarAuth } = require('../middlewares/autenticacao.middleware');

// ============================================================
// LINKA — Rotas de Respostas a Comentários
// /api/comentario-respostas/*
// ============================================================

router.use(verificarAuth);

router.post('/:comentario_id', comentarioRespostaController.criar);
router.get('/:comentario_id/listar', comentarioRespostaController.listar);
router.delete('/:id', comentarioRespostaController.eliminar);

module.exports = router;
