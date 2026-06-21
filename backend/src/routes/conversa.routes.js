const express = require('express');
const router = express.Router();
const conversaController = require('../controllers/conversa.controller');
const { verificarAuth } = require('../middlewares/autenticacao.middleware');

// ============================================================
// LINKA — Rotas de Chat/Conversas
// /api/conversas/*
// ============================================================

router.use(verificarAuth);

router.get('/', conversaController.listar);
router.post('/enviar', conversaController.enviar);
router.get('/:id/mensagens', conversaController.obterMensagens);

module.exports = router;
