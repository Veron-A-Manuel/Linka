const express = require('express');
const router = express.Router();
const antiSpamController = require('../controllers/anti-spam.controller');
const { verificarAuth } = require('../middlewares/autenticacao.middleware');

// ============================================================
// LINKA — Rotas de Anti-Spam + Detecção de Padrões
// /api/anti-spam/*
// ============================================================

// Verificar acção (rate limit check)
router.post('/verificar', verificarAuth, antiSpamController.verificar);

// Estatísticas gerais
router.get('/estatisticas', verificarAuth, antiSpamController.estatisticas);

// Gestão de bloqueios
router.get('/bloqueios', verificarAuth, antiSpamController.listarBloqueios);
router.post('/bloquear', verificarAuth, antiSpamController.bloquear);
router.post('/desbloquear', verificarAuth, antiSpamController.desbloquear);

// Gestão de alertas
router.get('/alertas', verificarAuth, antiSpamController.listarAlertas);
router.put('/alertas/:id/resolver', verificarAuth, antiSpamController.resolverAlerta);

// Gestão de padrões
router.get('/padroes', verificarAuth, antiSpamController.listarPadroes);
router.post('/padroes', verificarAuth, antiSpamController.criarPadrao);
router.put('/padroes/:id', verificarAuth, antiSpamController.actualizarPadrao);

// Manutenção
router.post('/limpar', verificarAuth, antiSpamController.limpar);

module.exports = router;
