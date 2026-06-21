const db = require('../config/base-de-dados');
const vendedorModel = require('../models/vendedor.model');
const ErroApp = require('../utils/erro-app');

const PLANO_GRATUITO = {
  id: null,
  codigo: 'gratuito',
  nome: 'Gratuito',
  descricao: 'Plano inicial para comecar a vender.',
  preco_mensal: 0,
  max_produtos: 5,
  destaque_anuncios: 0,
  loja_personalizada: 0,
  analytics_avancado: 0,
  activo: 1,
};

function normalizarCodigoPlano(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function serializarPlano(plano) {
  if (!plano) return null;
  return {
    id: plano.id || null,
    codigo: plano.codigo || normalizarCodigoPlano(plano.nome),
    nome: plano.nome,
    descricao: plano.descricao || '',
    preco_mensal: Number(plano.preco_mensal || 0),
    max_produtos: Number(plano.max_produtos || 0),
    destaque_anuncios: Number(plano.destaque_anuncios || 0),
    loja_personalizada: Number(plano.loja_personalizada || 0),
    analytics_avancado: Number(plano.analytics_avancado || 0),
    activo: Number(plano.activo ?? 1),
  };
}

class SubscricaoService {
  async listarPlanos() {
    const pagos = await db('planos_premium')
      .where('activo', 1)
      .orderBy('preco_mensal', 'asc');

    const planos = [PLANO_GRATUITO, ...pagos.map(serializarPlano)];
    return planos.map((plano) => ({
      ...plano,
      max_produtos: plano.codigo === 'premium' && plano.max_produtos >= 999 ? -1 : plano.max_produtos,
    }));
  }

  async obterPlanoPorCodigo(codigo) {
    const codigoNormalizado = normalizarCodigoPlano(codigo);
    if (codigoNormalizado === 'gratuito') return { ...PLANO_GRATUITO };

    const planos = await this.listarPlanos();
    return planos.find((plano) => plano.codigo === codigoNormalizado) || null;
  }

  async obterContextoVendedor(utilizadorId) {
    const vendedor = await vendedorModel.procurarPorUtilizadorId(utilizadorId);
    if (!vendedor) {
      throw new ErroApp('Perfil de vendedor nao encontrado.', 403);
    }

    const planoAtual = await this.obterPlanoPorCodigo(vendedor.plano || 'gratuito');
    const produtosPublicados = await db('produtos')
      .where('vendedor_id', vendedor.id)
      .count('id as total')
      .first();

    const subscricaoActiva = await db('subscricoes as s')
      .select('s.*', 'p.nome as plano_nome', 'p.max_produtos')
      .leftJoin('planos_premium as p', 's.plano_id', 'p.id')
      .where('s.vendedor_id', vendedor.id)
      .where('s.estado', 'activa')
      .orderBy('s.criado_em', 'desc')
      .first();

    const historico = await db('subscricoes as s')
      .select('s.*', 'p.nome as plano_nome')
      .leftJoin('planos_premium as p', 's.plano_id', 'p.id')
      .where('s.vendedor_id', vendedor.id)
      .orderBy('s.criado_em', 'desc')
      .limit(12);

    return {
      vendedor,
      plano_actual: planoAtual || PLANO_GRATUITO,
      produtos_publicados: Number(produtosPublicados?.total || 0),
      subscricao_activa: subscricaoActiva || null,
      historico,
      planos: await this.listarPlanos(),
    };
  }

  async podeCriarProduto(vendedorId) {
    const vendedor = await vendedorModel.procurarPorId(vendedorId);
    if (!vendedor) {
      throw new ErroApp('Perfil de vendedor nao encontrado.', 403);
    }

    if (Number(vendedor.aprovado) !== 1) {
      throw new ErroApp('A loja ainda precisa de aprovacao administrativa antes de publicar produtos.', 403);
    }

    const plano = await this.obterPlanoPorCodigo(vendedor.plano || 'gratuito');
    const limite = Number(plano?.max_produtos ?? PLANO_GRATUITO.max_produtos);
    if (limite === -1 || limite >= 999) return true;

    const total = await db('produtos')
      .where('vendedor_id', vendedor.id)
      .count('id as total')
      .first();

    if (Number(total?.total || 0) >= limite) {
      throw new ErroApp(`Limite do plano ${plano.nome} atingido (${limite} produtos). Actualize o plano para continuar.`, 403);
    }

    return true;
  }

  async contratarPlano(utilizador, dados) {
    if (utilizador.tipo !== 'vendedor' && utilizador.tipo !== 'admin') {
      throw new ErroApp('Apenas vendedores podem contratar planos.', 403);
    }

    const vendedor = utilizador.tipo === 'admin' && dados.vendedor_id
      ? await vendedorModel.procurarPorId(dados.vendedor_id)
      : await vendedorModel.procurarPorUtilizadorId(utilizador.id);

    if (!vendedor) {
      throw new ErroApp('Perfil de vendedor nao encontrado.', 403);
    }

    const plano = await this.obterPlanoPorCodigo(dados.plano_codigo);
    if (!plano) {
      throw new ErroApp('Plano invalido.', 422);
    }

    if (plano.codigo === 'gratuito') {
      await db.transaction(async (trx) => {
        await trx('subscricoes')
          .where({ vendedor_id: vendedor.id, estado: 'activa' })
          .update({ estado: 'cancelada', actualizado_em: db.fn.now() });
        await trx('vendedores')
          .where('id', vendedor.id)
          .update({ plano: 'gratuito', plano_expira_em: null, actualizado_em: db.fn.now() });
      });
      return await this.obterContextoVendedor(vendedor.utilizador_id);
    }

    const fim = new Date();
    fim.setMonth(fim.getMonth() + Number(dados.meses || 1));

    await db.transaction(async (trx) => {
      await trx('subscricoes')
        .where({ vendedor_id: vendedor.id, estado: 'activa' })
        .update({ estado: 'cancelada', actualizado_em: db.fn.now() });

      await trx('subscricoes').insert({
        vendedor_id: vendedor.id,
        plano_id: plano.id,
        estado: 'activa',
        valor_pago: Number(plano.preco_mensal || 0) * Number(dados.meses || 1),
        fim_em: fim,
        referencia_pagamento: dados.referencia_pagamento || `LINKA-${Date.now()}`,
      });

      await trx('vendedores')
        .where('id', vendedor.id)
        .update({
          plano: plano.codigo,
          plano_expira_em: fim,
          actualizado_em: db.fn.now(),
        });
    });

    return await this.obterContextoVendedor(vendedor.utilizador_id);
  }
}

module.exports = new SubscricaoService();
