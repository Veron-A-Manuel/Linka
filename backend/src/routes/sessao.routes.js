const express = require('express');
const router = express.Router();
const sessaoController = require('../controllers/sessao.controller');
const { verificarAuth } = require('../middlewares/autenticacao.middleware');

// ============================================================
// LINKA — Rotas de Sessões (Dispositivos Conectados)
// /api/sessoes
// ============================================================

router.use(verificarAuth);

router.get('/',          sessaoController.listar);
router.delete('/:id',   sessaoController.revogar);
router.delete('/',      sessaoController.revogarTodas);

module.exports = router;
