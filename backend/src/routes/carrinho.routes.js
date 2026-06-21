const express = require('express');
const router = express.Router();
const carrinhoController = require('../controllers/carrinho.controller');
const { verificarAuth } = require('../middlewares/autenticacao.middleware');

// ============================================================
// LINKA — Rotas de Carrinho de Compras
// /api/carrinho/*
// ============================================================

/**
 * @swagger
 * tags:
 *   name: Carrinho
 *   description: Gestão do carrinho de compras
 */

router.use(verificarAuth);

/**
 * @swagger
 * /api/carrinho:
 *   post:
 *     tags: [Carrinho]
 *     summary: Adicionar produto ao carrinho
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [produto_id]
 *             properties:
 *               produto_id:
 *                 type: integer
 *               quantidade:
 *                 type: integer
 *                 default: 1
 *     responses:
 *       201:
 *         description: Produto adicionado
 */
router.post('/', carrinhoController.adicionar);

/**
 * @swagger
 * /api/carrinho:
 *   get:
 *     tags: [Carrinho]
 *     summary: Listar itens do carrinho
 *     responses:
 *       200:
 *         description: Lista de itens
 */
router.get('/', carrinhoController.listar);

/**
 * @swagger
 * /api/carrinho/resumo:
 *   get:
 *     tags: [Carrinho]
 *     summary: Resumo do carrinho (total, itens)
 *     responses:
 *       200:
 *         description: Resumo com total e total_itens
 */
router.get('/resumo', carrinhoController.resumo);

router.put('/:produto_id/quantidade', carrinhoController.actualizarQuantidade);
router.delete('/:produto_id', carrinhoController.remover);
router.delete('/item/:id', carrinhoController.removerItem);

/**
 * @swagger
 * /api/carrinho:
 *   delete:
 *     tags: [Carrinho]
 *     summary: Limpar carrinho
 *     responses:
 *       200:
 *         description: Carrinho limpo
 */
router.delete('/', carrinhoController.limpar);

module.exports = router;
