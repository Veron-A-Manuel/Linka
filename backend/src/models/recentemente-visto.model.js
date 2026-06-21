const db = require('../config/base-de-dados');

class RecentementeVistoModel {

  async registar(utilizadorId, produtoId) {
    const existente = await db('recentemente_vistos')
      .where({ utilizador_id: utilizadorId, produto_id: produtoId })
      .first();

    if (existente) {
      await db('recentemente_vistos')
        .where('id', existente.id)
        .update({ criado_em: db.fn.now() });
      return existente.id;
    }

    // Manter apenas os últimos 100 itens por utilizador
    const total = await db('recentemente_vistos')
      .where('utilizador_id', utilizadorId)
      .count('id as t');
    const cnt = parseInt(total[0].t) || 0;

    if (cnt >= 100) {
      const maisAntigo = await db('recentemente_vistos')
        .where('utilizador_id', utilizadorId)
        .orderBy('criado_em', 'asc')
        .first();
      if (maisAntigo) {
        await db('recentemente_vistos').where('id', maisAntigo.id).del();
      }
    }

    const [id] = await db('recentemente_vistos').insert({
      utilizador_id: utilizadorId,
      produto_id: produtoId
    });
    return id;
  }

  async listar(utilizadorId, limite = 20, offset = 0) {
    return await db('recentemente_vistos as rv')
      .select('rv.id', 'rv.criado_em', 'p.*', 'c.nome as categoria_nome', 'ip.caminho as imagem_url')
      .join('produtos as p', 'rv.produto_id', 'p.id')
      .leftJoin('categorias as c', 'p.categoria_id', 'c.id')
      .leftJoin('imagens_produto as ip', function() {
        this.on('p.id', '=', 'ip.produto_id').andOn('ip.principal', '=', 1);
      })
      .where('rv.utilizador_id', utilizadorId)
      .where('p.aprovado', 1)
      .orderBy('rv.criado_em', 'desc')
      .limit(limite).offset(offset);
  }

  async eliminar(utilizadorId, produtoId) {
    return await db('recentemente_vistos')
      .where({ utilizador_id: utilizadorId, produto_id: produtoId })
      .del();
  }

  async limpar(utilizadorId) {
    return await db('recentemente_vistos')
      .where('utilizador_id', utilizadorId)
      .del();
  }
}

module.exports = new RecentementeVistoModel();
