const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Linka API',
      version: '1.0.0',
      description: 'API REST do Marketplace Local Linka — Moçambique',
      contact: { name: 'Veron Arcanjo' }
    },
    servers: [
      { url: 'http://localhost:3005/api', description: 'Desenvolvimento' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Erro: {
          type: 'object',
          properties: {
            sucesso: { type: 'boolean', example: false },
            mensagem: { type: 'string' }
          }
        },
        Produto: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            titulo: { type: 'string' },
            descricao: { type: 'string' },
            preco: { type: 'number' },
            moeda: { type: 'string', example: 'MZN' },
            condicao: { type: 'string', enum: ['novo', 'usado', 'recondicionado'] },
            categoria_id: { type: 'integer' },
            vendedor_id: { type: 'integer' },
            aprovado: { type: 'integer', enum: [0, 1] }
          }
        },
        Pedido: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            cliente_id: { type: 'integer' },
            vendedor_id: { type: 'integer' },
            estado: { type: 'string', enum: ['pendente', 'confirmado', 'preparando', 'pronto', 'enviado', 'entregue', 'cancelado'] },
            subtotal: { type: 'number' },
            taxa_entrega: { type: 'number' },
            total: { type: 'number' },
            metodo_pagamento: { type: 'string', enum: ['mpesa', 'emola', 'dinheiro', 'transferencia'] },
            estado_pagamento: { type: 'string' },
            endereco_entrega: { type: 'string' }
          }
        },
        CarrinhoItem: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            produto_id: { type: 'integer' },
            titulo: { type: 'string' },
            preco: { type: 'number' },
            quantidade: { type: 'integer' },
            imagem_url: { type: 'string' }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: ['./src/routes/*.js']
};

module.exports = swaggerJsdoc(options);
