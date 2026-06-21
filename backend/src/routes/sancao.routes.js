const express = require('express');
const router = express.Router();
const sancaoController = require('../controllers/sancao.controller');
const { verificarAuth } = require('../middlewares/autenticacao.middleware');
const { exigirAdmin } = require('../middlewares/autorizacao.middleware');
const { validarSancao } = require('../middlewares/validacao.middleware');

// ============================================================
// LINKA — Rotas de Sanções
// /api/sancoes/*
// ============================================================

// Todas as rotas requerem autenticação
router.use(verificarAuth);

// Verificar sanções activas (qualquer utilizador)
router.get('/activas/:utilizador_id', sancaoController.verificarActivas);

// Listar minhas sanções
router.get('/minhas', sancaoController.listarMinhas);

// Ver sanção por ID
router.get('/:id', sancaoController.obterPorId);

// --- Rotas admin ---
router.get('/', exigirAdmin, sancaoController.listarTodas);
router.post('/', exigirAdmin, validarSancao, sancaoController.criar);
router.put('/:id/desactivar', exigirAdmin, sancaoController.desactivar);

module.exports = router;
