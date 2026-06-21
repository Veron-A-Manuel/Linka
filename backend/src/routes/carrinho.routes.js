const express = require('express');
const router = express.Router();
const carrinhoController = require('../controllers/carrinho.controller');
const { verificarAuth } = require('../middlewares/autenticacao.middleware');

// ============================================================
// LINKA — Rotas de Carrinho de Compras
// /api/carrinho/*
// ============================================================

router.use(verificarAuth);

router.post('/', carrinhoController.adicionar);
router.get('/', carrinhoController.listar);
router.get('/resumo', carrinhoController.resumo);
router.put('/:produto_id/quantidade', carrinhoController.actualizarQuantidade);
router.delete('/:produto_id', carrinhoController.remover);
router.delete('/item/:id', carrinhoController.removerItem);
router.delete('/', carrinhoController.limpar);

module.exports = router;
