const express = require('express');
const router = express.Router();
const produtoController = require('../controllers/produto.controller');
const { verificarAuth, verificarAuthOpcional } = require('../middlewares/autenticacao.middleware');
const { exigirAdmin } = require('../middlewares/autorizacao.middleware');
const { validarProduto, validarActualizacaoProduto } = require('../middlewares/validacao.middleware');

// ============================================================
// LINKA — Rotas de Produtos
// /api/produtos/*
// ============================================================

const upload = require('../middlewares/upload.middleware');

// Feed (ANTES de /:id para evitar conflito)
router.get('/feed', verificarAuthOpcional, produtoController.feed);
router.get('/feed/latest', verificarAuthOpcional, produtoController.feedLatest);

// Públicas
router.get('/', verificarAuthOpcional, produtoController.listar);

// Admin - moderação (ANTES de /:id para evitar conflito)
router.get('/admin/todos', verificarAuth, exigirAdmin, produtoController.listarAdmin);

// Dinâmicas (DEPOIS de rotas fixas)
router.get('/:id', produtoController.obterPorId);
router.put('/:id/aprovado', verificarAuth, exigirAdmin, produtoController.moderar);

// Visualizações e Likes
router.post('/:id/visualizar', verificarAuthOpcional, produtoController.registrarVisualizacao);
router.post('/:id/like', verificarAuth, produtoController.toggleLike);
router.get('/:id/like', verificarAuthOpcional, produtoController.verificarLike);

// Comentários (lazy load)
router.get('/:id/comentarios', verificarAuthOpcional, produtoController.comentarios);

// Privadas (Requerem Login)
router.post('/', verificarAuth, upload.array('imagens', 5), validarProduto, produtoController.criar);
router.put('/:id', verificarAuth, upload.array('imagens', 5), validarActualizacaoProduto, produtoController.actualizar);
router.delete('/:id', verificarAuth, produtoController.eliminar);

module.exports = router;
