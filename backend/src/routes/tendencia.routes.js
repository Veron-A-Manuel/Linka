const express = require('express');
const router = express.Router();
const tendenciaController = require('../controllers/tendencia.controller');
const { verificarAuth } = require('../middlewares/autenticacao.middleware');

// ============================================================
// LINKA — Rotas de Tendências + Conteúdo em Alta
// /api/tendencias/*
// ============================================================

// Listar tendências
router.get('/', tendenciaController.listarTendencias);

// Conteúdo em alta
router.get('/alta/conteudo', tendenciaController.listarConteudoAlta);

// Palavras mais usadas
router.get('/palavras', tendenciaController.palavrasMaisUsadas);

// Obter tendência por ID
router.get('/:id', tendenciaController.obterTendencia);

// Eliminar tendência
router.delete('/:id', verificarAuth, tendenciaController.eliminarTendencia);

// Eliminar conteúdo em alta
router.delete('/alta/:id', verificarAuth, tendenciaController.eliminarConteudoAlta);

// Processar tendências (admin)
router.post('/processar', verificarAuth, tendenciaController.processar);

// Processar palavras-chave de um produto
router.post('/processar-produto', verificarAuth, tendenciaController.processarProduto);

module.exports = router;
