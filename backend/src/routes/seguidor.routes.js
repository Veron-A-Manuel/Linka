const express = require('express');
const router = express.Router();
const seguidorController = require('../controllers/seguidor.controller');
const { verificarAuth } = require('../middlewares/autenticacao.middleware');

// ============================================================
// LINKA — Rotas de Seguidores
// /api/seguidores/*
// ============================================================

// Rotas autenticadas
router.use(verificarAuth);

router.post('/:vendedor_id/toggle', seguidorController.toggle);
router.get('/:vendedor_id/verificar', seguidorController.verificar);
router.get('/:vendedor_id/contar', seguidorController.contarSeguidores);
router.get('/seguindo/contar', seguidorController.contarSeguindo);
router.get('/:vendedor_id/lista', seguidorController.listarSeguidores);
router.get('/seguindo', seguidorController.listarSeguindo);

module.exports = router;
