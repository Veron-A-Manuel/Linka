const express = require('express');
const router = express.Router();
const anuncioService = require('../services/anuncio.service');
const { asyncHandler } = require('../middlewares/erro.middleware');

// ============================================================
// LINKA — Tracking de Anúncios (público)
// /api/anuncios/track/*
// ============================================================

/**
 * POST /api/anuncios/track/impressao
 * Registar impressão de anúncio
 */
router.post('/impressao', asyncHandler(async (req, res) => {
  const { anuncio_id } = req.body;
  if (!anuncio_id) return res.status(400).json({ sucesso: false, erro: 'anuncio_id obrigatório.' });

  const utilizadorId = req.utilizador?.id || null;
  const sessionId = req.headers['x-session-id'] || null;
  const ip = req.ip || req.connection?.remoteAddress || null;
  const userAgent = req.headers['user-agent']?.substring(0, 500) || null;

  await anuncioService.registarImpressao(anuncio_id, utilizadorId, sessionId, ip, userAgent);
  return res.json({ sucesso: true });
}));

/**
 * POST /api/anuncios/track/clique
 * Registar clique em anúncio
 */
router.post('/clique', asyncHandler(async (req, res) => {
  const { anuncio_id } = req.body;
  if (!anuncio_id) return res.status(400).json({ sucesso: false, erro: 'anuncio_id obrigatório.' });

  const utilizadorId = req.utilizador?.id || null;
  const sessionId = req.headers['x-session-id'] || null;
  const ip = req.ip || req.connection?.remoteAddress || null;
  const userAgent = req.headers['user-agent']?.substring(0, 500) || null;

  await anuncioService.registarClique(anuncio_id, utilizadorId, sessionId, ip, userAgent);
  return res.json({ sucesso: true });
}));

module.exports = router;
