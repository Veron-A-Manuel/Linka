const db = require('../config/base-de-dados');

class VendedorModel {
  async procurarPorId(id) {
    return await db('vendedores').where({ id }).first();
  }

  async procurarPorUtilizadorId(utilizadorId) {
    return await db('vendedores').where({ utilizador_id: utilizadorId }).first();
  }

  async listarTodos(filtros = {}) {
    const query = db('vendedores as v')
      .select(
        'v.*',
        'u.nome as nome_utilizador',
        'u.email',
        'u.telefone',
        'u.estado as estado_utilizador',
        'u.criado_em as utilizador_criado_em'
      )
      .join('utilizadores as u', 'v.utilizador_id', 'u.id');

    if (filtros.aprovado !== undefined) {
      query.where('v.aprovado', filtros.aprovado);
    }
    if (filtros.busca) {
      query.where(function () {
        this.where('u.nome', 'like', `%${filtros.busca}%`)
          .orWhere('u.email', 'like', `%${filtros.busca}%`)
          .orWhere('v.nome_loja', 'like', `%${filtros.busca}%`);
      });
    }

    return await query.orderBy('v.criado_em', 'desc');
  }

  async actualizar(id, dados) {
    return await db('vendedores')
      .where({ id })
      .update({
        ...dados,
        actualizado_em: db.fn.now()
      });
  }

  async criar(dados, executor = db) {
    const [id] = await executor('vendedores').insert(dados);
    return id;
  }
}

module.exports = new VendedorModel();
