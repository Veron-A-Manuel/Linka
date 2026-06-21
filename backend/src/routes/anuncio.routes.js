const express = require('express');
const router = express.Router();
const anuncioController = require('../controllers/anuncio.controller');
const { verificarAuth } = require('../middlewares/autenticacao.middleware');

// ============================================================
// LINKA — Rotas de Anúncios Patrocinados
// /api/anuncios/*
// ============================================================

// Estatísticas gerais do vendedor (antes de /:id)
router.get('/estatisticas', verificarAuth, anuncioController.estatisticas);

// Actualizar estados expirados (admin/cron)
router.post('/actualizar-estados', verificarAuth, anuncioController.actualizarEstados);

// Criar anúncio
router.post('/', verificarAuth, anuncioController.criar);

// Listar anúncios do vendedor
router.get('/', verificarAuth, anuncioController.listar);

// Obter anúncio por ID
router.get('/:id', verificarAuth, anuncioController.obter);

// Estatísticas de um anúncio
router.get('/:id/stats', verificarAuth, anuncioController.estatisticasAnuncio);

// Actualizar anúncio
router.put('/:id', verificarAuth, anuncioController.actualizar);

// Pausar anúncio
router.post('/:id/pausar', verificarAuth, anuncioController.pausar);

// Retomar anúncio
router.post('/:id/retomar', verificarAuth, anuncioController.retomar);

// Eliminar anúncio
router.delete('/:id', verificarAuth, anuncioController.eliminar);

module.exports = router;
