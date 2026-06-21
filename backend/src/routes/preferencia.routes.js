const express = require('express');
const router = express.Router();
const preferenciaController = require('../controllers/preferencia.controller');
const { verificarAuth } = require('../middlewares/autenticacao.middleware');

// ============================================================
// LINKA — Rotas de Preferências do Utilizador
// /api/preferencias/*
// ============================================================

router.use(verificarAuth);

router.get('/', preferenciaController.obter);
router.put('/', preferenciaController.actualizar);

module.exports = router;
