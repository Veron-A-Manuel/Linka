const express = require('express');
const router = express.Router();
const pedidoController = require('../controllers/pedido.controller');
const { verificarAuth } = require('../middlewares/autenticacao.middleware');
const { validarPedido, validarActualizarEstadoPedido } = require('../middlewares/validacao.middleware');

// ============================================================
// LINKA — Rotas de Pedidos
// /api/pedidos/*
// ============================================================

/**
 * @swagger
 * tags:
 *   name: Pedidos
 *   description: Gestão de pedidos de compra
 */

router.use(verificarAuth);

/**
 * @swagger
 * /api/pedidos:
 *   post:
 *     tags: [Pedidos]
 *     summary: Criar novo pedido
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [itens, endereco_entrega]
 *             properties:
 *               itens:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     produto_id:
 *                       type: integer
 *                     quantidade:
 *                       type: integer
 *               metodo_pagamento:
 *                 type: string
 *                 enum: [mpesa, emola, dinheiro, transferencia]
 *               endereco_entrega:
 *                 type: string
 *               notas:
 *                 type: string
 *     responses:
 *       201:
 *         description: Pedido criado
 */
router.post('/', validarPedido, pedidoController.criar);

/**
 * @swagger
 * /api/pedidos:
 *   get:
 *     tags: [Pedidos]
 *     summary: Listar meus pedidos
 *     responses:
 *       200:
 *         description: Lista de pedidos
 */
router.get('/', pedidoController.listarMeus);

/**
 * @swagger
 * /api/pedidos/{id}:
 *   get:
 *     tags: [Pedidos]
 *     summary: Obter detalhes de um pedido
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Detalhes do pedido
 *       404:
 *         description: Pedido não encontrado
 */
router.get('/:id', pedidoController.obterPorId);

router.put('/:id/estado', validarActualizarEstadoPedido, pedidoController.actualizarEstado);

/**
 * @swagger
 * /api/pedidos/{id}/cancelar:
 *   post:
 *     tags: [Pedidos]
 *     summary: Cancelar pedido
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               motivo:
 *                 type: string
 *     responses:
 *       200:
 *         description: Pedido cancelado
 */
router.post('/:id/cancelar', pedidoController.cancelar);

module.exports = router;
