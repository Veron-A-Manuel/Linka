const express = require('express');
const router = express.Router();
const autenticacaoController = require('../controllers/autenticacao.controller');
const { verificarAuth } = require('../middlewares/autenticacao.middleware');
const { validarRegisto, validarLogin } = require('../middlewares/validacao.middleware');

const { limitadorLogin } = require('../middlewares/seguranca.middleware');

// ============================================================
// LINKA — Rotas de Autenticação
// /api/auth/*
// ============================================================

// Público
router.post('/registar', limitadorLogin, validarRegisto, autenticacaoController.registar);
router.post('/login',    limitadorLogin, validarLogin,    autenticacaoController.login);
router.post('/refresh',  autenticacaoController.refresh);

// Privado
router.post('/logout', verificarAuth, autenticacaoController.logout);

module.exports = router;
