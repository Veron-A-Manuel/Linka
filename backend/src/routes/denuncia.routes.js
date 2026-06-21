const express = require('express');
const router = express.Router();
const denunciaController = require('../controllers/denuncia.controller');
const { verificarAuth } = require('../middlewares/autenticacao.middleware');
const { exigirAdmin } = require('../middlewares/autorizacao.middleware');
const { validarDenuncia } = require('../middlewares/validacao.middleware');

// ============================================================
// LINKA — Rotas de Denúncias
// /api/denuncias/*
// ============================================================

// Todas as rotas requerem autenticação
router.use(verificarAuth);

// Criar denúncia (qualquer utilizador autenticado)
router.post('/', validarDenuncia, denunciaController.criar);

// Listar minhas denúncias
router.get('/minhas', denunciaController.listarMinhas);

// --- Rotas admin (ANTES de /:id para evitar conflito de roteamento) ---
router.get('/admin/pendentes', exigirAdmin, denunciaController.contarPendentes);
router.get('/', exigirAdmin, denunciaController.listar);
router.put('/:id/resolver', exigirAdmin, denunciaController.resolver);

// Ver denúncia por ID (DEVE ser a última rota GET)
router.get('/:id', denunciaController.obterPorId);

module.exports = router;
