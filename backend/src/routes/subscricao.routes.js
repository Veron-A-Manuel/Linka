const express = require('express');
const router = express.Router();
const subscricaoController = require('../controllers/subscricao.controller');
const { verificarAuth } = require('../middlewares/autenticacao.middleware');
const { exigirVendedor } = require('../middlewares/autorizacao.middleware');

router.get('/planos', subscricaoController.planos);

router.use(verificarAuth, exigirVendedor);

router.get('/minha', subscricaoController.minha);
router.post('/contratar', subscricaoController.contratar);

module.exports = router;
