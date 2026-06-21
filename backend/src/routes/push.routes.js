const express = require('express');
const router = express.Router();
const pushController = require('../controllers/push.controller');
const { verificarAuth } = require('../middlewares/autenticacao.middleware');

router.get('/vapid-public-key', pushController.obterChavePublica);

router.use(verificarAuth);

router.post('/subscrever', pushController.subscrever);
router.post('/cancelar', pushController.cancelar);

module.exports = router;
