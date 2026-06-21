const db = require('../config/base-de-dados');

class TendenciaModel {
  // ── Tendências ──

  async upsertTendencia(dados) {
    const existente = await db('tendencias')
      .where({ termo: dados.termo, tipo: dados.tipo, periodo: dados.periodo })
      .first();

    if (existente) {
      await db('tendencias').where({ id: existente.id }).update({
        contagem: dados.contagem || existente.contagem,
        tendencia_score: dados.tendencia_score || existente.tendencia_score,
        dados_extras: dados.dados_extras ? JSON.stringify(dados.dados_extras) : existente.dados_extras,
        categoria_id: dados.categoria_id || existente.categoria_id,
      });
      return existente.id;
    } else {
      const [id] = await db('tendencias').insert(dados);
      return id;
    }
  }

  async listarTendencias(periodo = '24h', tipo = null, limite = 20) {
    let query = db('tendencias')
      .where({ periodo, activo: 1 });

    if (tipo) query = query.where('tipo', tipo);

    return await query
      .orderBy('tendencia_score', 'desc')
      .limit(limite);
  }

  async obterTendencia(id) {
    return await db('tendencias').where('id', id).first();
  }

  async eliminarTendencia(id) {
    return await db('tendencias').where('id', id).update({ activo: 0 });
  }

  async limparTendencias(periodo, limiteManter = 50) {
    return await db('tendencias')
      .where({ periodo })
      .orderBy('tendencia_score', 'desc')
      .offset(limiteManter)
      .del();
  }

  // ── Conteúdo em Alta ──

  async upsertConteudoAlta(dados) {
    const existente = await db('conteudo_alta')
      .where({
        produto_id: dados.produto_id,
        metrica_principal: dados.metrica_principal,
        periodo: dados.periodo,
      })
      .first();

    if (existente) {
      await db('conteudo_alta').where({ id: existente.id }).update({
        pontuacao: dados.pontuacao || existente.pontuacao,
        posicao: dados.posicao || existente.posicao,
      });
      return existente.id;
    } else {
      const [id] = await db('conteudo_alta').insert(dados);
      return id;
    }
  }

  async listarConteudoAlta(periodo = '24h', metrica = null, limite = 20) {
    let query = db('conteudo_alta as ca')
      .join('produtos as p', 'ca.produto_id', 'p.id')
      .leftJoin('imagens_produto as ip', function () {
        this.on('p.id', '=', 'ip.produto_id').andOn('ip.principal', '=', 1);
      })
      .leftJoin('vendedores as v', 'p.vendedor_id', 'v.id')
      .leftJoin('utilizadores as u', 'v.utilizador_id', 'u.id')
      .select(
        'ca.*',
        'p.titulo',
        'p.preco',
        'p.condicao',
        'ip.caminho as imagem_url',
        'u.nome as vendedor_nome',
        'v.nome_loja'
      )
      .where('ca.periodo', periodo);

    if (metrica) query = query.where('ca.metrica_principal', metrica);

    return await query
      .orderBy('ca.pontuacao', 'desc')
      .limit(limite);
  }

  async obterConteudoAlta(id) {
    return await db('conteudo_alta as ca')
      .join('produtos as p', 'ca.produto_id', 'p.id')
      .select('ca.*', 'p.titulo', 'p.preco')
      .where('ca.id', id)
      .first();
  }

  async eliminarConteudoAlta(id) {
    return await db('conteudo_alta').where('id', id).del();
  }

  // ── Palavras-Chave ──

  async registarPalavraChave(palavra, produtoId) {
    const existente = await db('palavras_chave_tendencia')
      .where({ palavra, produto_id: produtoId })
      .first();
    if (!existente) {
      await db('palavras_chave_tendencia').insert({ palavra, produto_id: produtoId });
    }
  }

  async contarPalavraChave(palavra, janelaHoras = 24) {
    const [resultado] = await db('palavras_chave_tendencia')
      .where('palavra', palavra)
      .whereRaw('criado_em >= DATE_SUB(NOW(), INTERVAL ? HOUR)', [janelaHoras])
      .count('id as total');
    return resultado.total || 0;
  }

  async palavrasMaisUsadas(janelaHoras = 24, limite = 20) {
    return await db('palavras_chave_tendencia')
      .whereRaw('criado_em >= DATE_SUB(NOW(), INTERVAL ? HOUR)', [janelaHoras])
      .select('palavra')
      .count('id as contagem')
      .groupBy('palavra')
      .orderBy('contagem', 'desc')
      .limit(limite);
  }

  async extrairPalavrasDeTitulo(titulo) {
    if (!titulo) return [];
    const stopWords = new Set(['de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas', 'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'com', 'por', 'para', 'sem', 'sobre', 'entre', 'e', 'ou', 'mas', 'que', 'se', 'não', 'é', 'ao', 'aos', 'à', 'às', 'até', 'desde', 'muito', 'bom', 'boa', 'novo', 'nova', 'todo', 'toda', 'isso', 'este', 'esta', 'esse', 'essa', 'aquele', 'aquela', 'tal', 'como', 'mais', 'menos', 'bem', 'mesmo']);
    return titulo
      .toLowerCase()
      .replace(/[^a-záàâãéèêíïóôõúüç\s]/g, '')
      .split(/\s+/)
      .filter(p => p.length > 2 && !stopWords.has(p))
      .slice(0, 10);
  }
}

module.exports = new TendenciaModel();
