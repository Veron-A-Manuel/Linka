const db = require('../config/base-de-dados');
const { obter, guardar, invalidar } = require('../config/cache');

class CategoriaModel {
  
  async listarTodas() {
    const chaveCache = 'categorias:todas';
    const dadosCache = await obter(chaveCache);
    if (dadosCache) return dadosCache;

    const resultado = await db('categorias')
      .where('activa', 1)
      .orderBy('ordem', 'asc')
      .orderBy('nome', 'asc');

    // Categorias mudam raramente — cache por 30 minutos
    await guardar(chaveCache, resultado, 1800);
    return resultado;
  }

  async procurarPorId(id) {
    return await db('categorias').where({ id }).first();
  }

  async procurarPorPai(pai_id) {
    return await db('categorias')
      .where({ pai_id, activa: 1 })
      .orderBy('ordem', 'asc');
  }

  async procurarPorSlug(slug) {
    return await db('categorias').where({ slug, activa: 1 }).first();
  }

  async criar(dados) {
    const [id] = await db('categorias').insert(dados);
    await invalidar('categorias:todas');
    return id;
  }
}

module.exports = new CategoriaModel();
