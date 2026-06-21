const express = require('express');
const router = express.Router();
const pedidoController = require('../controllers/pedido.controller');
const { verificarAuth } = require('../middlewares/autenticacao.middleware');
const { validarPedido, validarActualizarEstadoPedido } = require('../middlewares/validacao.middleware');

// ============================================================
// LINKA — Rotas de Pedidos
// /api/pedidos/*
// ============================================================

// Todas as rotas de pedidos requerem autenticação
router.use(verificarAuth);

router.post('/', validarPedido, pedidoController.criar);
router.get('/', pedidoController.listarMeus);
router.get('/:id', pedidoController.obterPorId);
router.put('/:id/estado', validarActualizarEstadoPedido, pedidoController.actualizarEstado);
router.post('/:id/cancelar', pedidoController.cancelar);

module.exports = router;
