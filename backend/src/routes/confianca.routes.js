const express = require('express');
const router = express.Router();
const confiancaController = require('../controllers/confianca.controller');
const { verificarAuth } = require('../middlewares/autenticacao.middleware');
const { exigirAdmin } = require('../middlewares/autorizacao.middleware');

// ============================================================
// LINKA — Rotas de Confiança
// /api/confianca/*
// ============================================================

// Score do utilizador autenticado
router.get('/perfil', verificarAuth, confiancaController.obterMinhaConfianca);

// Top vendedores por confiança (público)
router.get('/top', confiancaController.topVendedores);

// Score de um vendedor específico (público)
router.get('/utilizador/:id', confiancaController.obterConfiancaVendedor);

// Recalcular o próprio score
router.post('/recalcular', verificarAuth, confiancaController.recalcular);

// Recalcular todos (admin)
router.post('/recalcular-todos', verificarAuth, exigirAdmin, confiancaController.recalcularTodos);

module.exports = router;
