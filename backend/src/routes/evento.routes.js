const express = require('express');
const router = express.Router();
const eventoController = require('../controllers/evento.controller');
const { verificarAuth, verificarAuthOpcional } = require('../middlewares/autenticacao.middleware');

// ============================================================
// LINKA — Rotas de Eventos de Comportamento
// /api/eventos/*
// ============================================================

// Registar evento (autenticado ou anónimo com session_id)
router.post('/', verificarAuthOpcional, eventoController.registar);

// Registar lote de eventos
router.post('/lote', verificarAuthOpcional, eventoController.registarLote);

// Interesses do utilizador (requer login)
router.get('/interesses', verificarAuth, eventoController.obterInteresses);

// Analytics do utilizador (requer login)
router.get('/analytics', verificarAuth, eventoController.obterAnalytics);

// Histórico de eventos (requer login)
router.get('/historico', verificarAuth, eventoController.obterHistorico);

module.exports = router;
