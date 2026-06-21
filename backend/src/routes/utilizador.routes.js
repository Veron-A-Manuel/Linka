const express = require('express');
const router = express.Router();
const utilizadorController = require('../controllers/utilizador.controller');
const { verificarAuth } = require('../middlewares/autenticacao.middleware');
const { exigirAdmin } = require('../middlewares/autorizacao.middleware');

// ============================================================
// LINKA — Rotas de Utilizadores
// /api/utilizadores/*
// ============================================================

// Todas as rotas de utilizador requerem autenticação
router.use(verificarAuth);

// Rotas normais
router.get('/perfil', utilizadorController.obterPerfil);
router.put('/perfil', utilizadorController.actualizarPerfil);

// --- Rotas admin ---
router.get('/admin/todos', exigirAdmin, utilizadorController.listarTodos);
router.get('/admin/vendedores', exigirAdmin, utilizadorController.listarVendedores);
router.get('/admin/estatisticas-detalhadas', exigirAdmin, utilizadorController.obterEstatisticasDetalhadas);
router.get('/admin/:id', exigirAdmin, utilizadorController.obterDetalhesAdmin);
router.put('/admin/:id/estado', exigirAdmin, utilizadorController.alterarEstado);
router.put('/admin/:id/aprovar-vendedor', exigirAdmin, utilizadorController.aprovarVendedor);

module.exports = router;
