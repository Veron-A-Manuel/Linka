const express = require('express');
const router = express.Router();
const planoController = require('../controllers/plano.controller');

router.get('/', planoController.listar);

module.exports = router;
