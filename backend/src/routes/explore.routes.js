const express = require('express');
const router = express.Router();
const exploreController = require('../controllers/explore.controller');
const { verificarAuthOpcional } = require('../middlewares/autenticacao.middleware');

// ============================================================
// LINKA — Rotas de Exploração
// /api/explore/*
// ============================================================

// Listar produtos com filtros avançados
router.get('/', verificarAuthOpcional, exploreController.listar);

// Produtos em destaque (trending)
router.get('/trending', verificarAuthOpcional, exploreController.trending);

// Categorias com contagem de produtos
router.get('/categorias', exploreController.categorias);

// Sugestões de busca (autocomplete)
router.get('/busca', exploreController.buscar);

// Produtos por categoría (rota dinâmica DEPOIS das rotas fixas)
router.get('/categoria/:id', verificarAuthOpcional, exploreController.porCategoria);

module.exports = router;
