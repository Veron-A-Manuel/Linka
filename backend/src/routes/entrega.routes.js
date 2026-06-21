const express = require('express');
const router = express.Router();
const { verificarAuth } = require('../middlewares/autenticacao.middleware');
const entregaController = require('../controllers/entrega.controller');

// Listar entregas do utilizador (requer auth)
router.get('/', verificarAuth, entregaController.listar);

// Entregas disponíveis (requer auth - entregadores)
router.get('/disponiveis', verificarAuth, entregaController.disponiveis);

// Criar entrega para um pedido (requer auth)
router.post('/:pedidoId', verificarAuth, entregaController.criar);

// Detalhes de uma entrega (requer auth)
router.get('/:id', verificarAuth, entregaController.obter);

// Entregador aceita entrega
router.put('/:id/aceitar', verificarAuth, entregaController.aceitar);

// Entregador rejeita entrega
router.put('/:id/rejeitar', verificarAuth, entregaController.rejeitar);

// Marcar como a caminho
router.put('/:id/a-caminho', verificarAuth, entregaController.ACaminho);

// Marcar como entregue
router.put('/:id/entregue', verificarAuth, entregaController.marcarEntregue);

// Marcar como falhada
router.put('/:id/falhou', verificarAuth, entregaController.marcarFalhou);

// Cancelar entrega
router.put('/:id/cancelar', verificarAuth, entregaController.cancelar);

// Actualizar localização GPS
router.put('/:id/localizacao', verificarAuth, entregaController.localizacao);

module.exports = router;
