const express = require('express');
const router = express.Router();
const spamController = require('../controllers/spam.controller');
const { verificarAuth } = require('../middlewares/autenticacao.middleware');

router.get('/estatisticas', verificarAuth, spamController.estatisticas);
router.get('/historico/:id', verificarAuth, spamController.historico);
router.post('/limpar', verificarAuth, spamController.limpar);

module.exports = router;
