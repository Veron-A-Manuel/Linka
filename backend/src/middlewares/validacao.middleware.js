const Joi = require('joi');
const resposta = require('../utils/resposta');

// ============================================================
// LINKA - Middleware de Validacao (Joi)
// Garante que os dados de entrada estao correctos.
// ============================================================

const validarRegisto = (req, res, next) => {
  const schema = Joi.object({
    nome: Joi.string().trim().min(3).max(100).required().messages({
      'string.empty': 'O nome e obrigatorio.',
      'string.min': 'O nome deve ter pelo menos 3 caracteres.',
    }),
    email: Joi.string().trim().lowercase().email().required().messages({
      'string.email': 'Introduza um email valido.',
      'string.empty': 'O email e obrigatorio.',
    }),
    telefone: Joi.string().replace(/\D/g, '').pattern(/^[0-9]{9,13}$/).required().messages({
      'string.pattern.base': 'Telefone invalido (9 a 13 digitos).',
      'string.empty': 'O telefone e obrigatorio.',
    }),
    senha: Joi.string().min(6).required().messages({
      'string.min': 'A senha deve ter pelo menos 6 caracteres.',
      'string.empty': 'A senha e obrigatoria.',
    }),
    tipo: Joi.string().valid('cliente', 'vendedor').default('cliente').messages({
      'any.only': 'Tipo de conta invalido.',
    }),
  });

  const { error, value } = schema.validate(req.body, { stripUnknown: true });
  if (error) {
    return resposta.validacao(res, error.details[0].message);
  }

  req.body = value;
  next();
};

const validarLogin = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.alternatives().try(
      Joi.string().trim().lowercase().email(),
      Joi.string().replace(/\D/g, '').pattern(/^[0-9]{9,13}$/)
    ).required().messages({
      'alternatives.match': 'Introduza um email ou telefone valido.',
      'any.required': 'O email ou telefone e obrigatorio.',
    }),
    senha: Joi.string().required().messages({
      'string.empty': 'A senha e obrigatoria.',
    }),
  });

  const { error, value } = schema.validate(req.body, { stripUnknown: true });
  if (error) {
    return resposta.validacao(res, error.details[0].message);
  }

  req.body = value;
  next();
};

const validarProduto = (req, res, next) => {
  const schema = Joi.object({
    categoria_id: Joi.number().integer().required(),
    titulo: Joi.string().min(5).max(200).required(),
    descricao: Joi.string().min(20).required(),
    preco: Joi.number().precision(2).positive().required(),
    preco_negociavel: Joi.boolean(),
    stock: Joi.number().integer().min(1),
    estado_produto: Joi.string().valid('novo', 'usado', 'recondicionado'),
    condicao: Joi.string().valid('disponivel', 'indisponivel', 'pausado', 'vendido'),
    cidade: Joi.string().required(),
    bairro: Joi.string(),
    vendedor_id: Joi.number().integer(),
    imagens: Joi.array().items(Joi.object({
      caminho: Joi.string().required(),
    })),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return resposta.validacao(res, error.details[0].message);
  }
  next();
};

const validarActualizacaoProduto = (req, res, next) => {
  const schema = Joi.object({
    categoria_id: Joi.number().integer(),
    titulo: Joi.string().min(5).max(200),
    descricao: Joi.string().min(20),
    preco: Joi.number().precision(2).positive(),
    preco_negociavel: Joi.boolean(),
    stock: Joi.number().integer().min(1),
    estado_produto: Joi.string().valid('novo', 'usado', 'recondicionado'),
    condicao: Joi.string().valid('disponivel', 'indisponivel', 'pausado', 'vendido'),
    cidade: Joi.string(),
    bairro: Joi.string(),
    vendedor_id: Joi.number().integer(),
    imagens: Joi.array().items(Joi.object({
      caminho: Joi.string().required(),
    })),
  }).min(1);

  const { error } = schema.validate(req.body);
  if (error) {
    return resposta.validacao(res, error.details[0].message);
  }
  next();
};

const validarPedido = (req, res, next) => {
  const schema = Joi.object({
    itens: Joi.array().min(1).items(Joi.object({
      produto_id: Joi.number().integer().required(),
      quantidade: Joi.number().integer().min(1).required(),
    })).required(),
    metodo_pagamento: Joi.string().valid('mpesa', 'emola', 'dinheiro', 'transferencia'),
    endereco_entrega: Joi.string().required(),
    notas: Joi.string().allow('', null),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return resposta.validacao(res, error.details[0].message);
  }
  next();
};

const validarAvaliacao = (req, res, next) => {
  const schema = Joi.object({
    avaliado_id: Joi.number().integer().required().messages({
      'any.required': 'O utilizador avaliado é obrigatório.',
    }),
    produto_id: Joi.number().integer().allow(null),
    pedido_id: Joi.number().integer().allow(null),
    estrelas: Joi.number().integer().min(1).max(5).allow(null).optional().messages({
      'number.min': 'Mínimo 1 estrela.',
      'number.max': 'Máximo 5 estrelas.',
    }),
    comentario: Joi.string().allow('', null).max(1000),
    tipo: Joi.string().valid('produto', 'vendedor', 'entregador').required().messages({
      'any.only': 'Tipo de avaliação inválido.',
      'any.required': 'O tipo de avaliação é obrigatório.',
    }),
  });

  const { error, value } = schema.validate(req.body, { stripUnknown: true });
  if (error) {
    return resposta.validacao(res, error.details[0].message);
  }
  req.body = value;
  next();
};

const validarDenuncia = (req, res, next) => {
  const schema = Joi.object({
    denunciado_id: Joi.number().integer().allow(null),
    produto_id: Joi.number().integer().allow(null),
    motivo: Joi.string().valid(
      'fraude', 'conteudo_inapropriado', 'spam',
      'produto_falso', 'preco_abusivo', 'outro'
    ).required().messages({
      'any.only': 'Motivo de denúncia inválido.',
      'any.required': 'O motivo é obrigatório.',
    }),
    descricao: Joi.string().min(10).max(2000).required().messages({
      'string.min': 'A descrição deve ter pelo menos 10 caracteres.',
      'any.required': 'A descrição é obrigatória.',
    }),
  });

  const { error, value } = schema.validate(req.body, { stripUnknown: true });
  if (error) {
    return resposta.validacao(res, error.details[0].message);
  }
  req.body = value;
  next();
};

const validarSancao = (req, res, next) => {
  const schema = Joi.object({
    utilizador_id: Joi.number().integer().required().messages({
      'any.required': 'O utilizador é obrigatório.',
    }),
    tipo: Joi.string().valid('aviso', 'suspensao', 'banimento').required().messages({
      'any.only': 'Tipo de sanção inválido.',
      'any.required': 'O tipo de sanção é obrigatório.',
    }),
    motivo: Joi.string().min(5).max(1000).required().messages({
      'string.min': 'O motivo deve ter pelo menos 5 caracteres.',
      'any.required': 'O motivo é obrigatório.',
    }),
    expira_em: Joi.date().iso().greater('now').allow(null),
  });

  const { error, value } = schema.validate(req.body, { stripUnknown: true });
  if (error) {
    return resposta.validacao(res, error.details[0].message);
  }
  req.body = value;
  next();
};

const validarActualizarEstadoPedido = (req, res, next) => {
  const schema = Joi.object({
    estado: Joi.string().valid(
      'pendente', 'confirmado', 'preparando', 'pronto',
      'entregue', 'cancelado'
    ).required().messages({
      'any.only': 'Estado do pedido inválido.',
      'any.required': 'O novo estado é obrigatório.',
    }),
  });

  const { error, value } = schema.validate(req.body, { stripUnknown: true });
  if (error) {
    return resposta.validacao(res, error.details[0].message);
  }
  req.body = value;
  next();
};

module.exports = {
  validarRegisto,
  validarLogin,
  validarProduto,
  validarActualizacaoProduto,
  validarPedido,
  validarAvaliacao,
  validarDenuncia,
  validarSancao,
  validarActualizarEstadoPedido,
};
