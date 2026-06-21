const express = require('express');
const router = express.Router();
const categoriaController = require('../controllers/categoria.controller');

// ============================================================
// LINKA — Rotas de Categorias
// /api/categorias/*
// ============================================================

router.get('/', categoriaController.listar);
router.get('/:slug', categoriaController.obterPorSlug);

module.exports = router;
