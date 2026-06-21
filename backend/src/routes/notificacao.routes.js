const express = require('express');
const router = express.Router();
const notificacaoController = require('../controllers/notificacao.controller');
const { verificarAuth } = require('../middlewares/autenticacao.middleware');

// Todas as rotas requerem autenticação
router.use(verificarAuth);

// Rotas fixas (ANTES das dinâmicas para evitar conflito)
router.get('/', notificacaoController.listar);
router.get('/nao-lidas', notificacaoController.contarNaoLidas);
router.put('/todas-lidas', notificacaoController.marcarTodasLidas);

// Rotas dinâmicas
router.put('/:id/lida', notificacaoController.marcarLida);
router.delete('/:id', notificacaoController.eliminar);

module.exports = router;
