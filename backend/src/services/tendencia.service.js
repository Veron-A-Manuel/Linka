const db = require('../config/base-de-dados');
const tendenciaModel = require('../models/tendencia.model');
const { logger } = require('../config/logger');

class TendenciaService {
  // ── Processamento de Tendências ──

  /**
   * Analisar e actualizar tendências (chamar via cron)
   * Extrai palavras de títulos recentes e calcula trending
   */
  async processarTendencias(janelaHoras = 24) {
    logger.info(`[Tendências] Processando tendências (${janelaHoras}h)...`);

    const palavras = await tendenciaModel.palavrasMaisUsadas(janelaHoras, 50);
    let processadas = 0;

    for (const p of palavras) {
      if (p.contagem < 2) continue; // Mínimo 2 ocorrências

      // Calcular score baseado na contagem e recência
      const score = this._calcularScoreTendencia(p.contagem, janelaHoras);

      await tendenciaModel.upsertTendencia({
        termo: p.palavra,
        tipo: 'hashtag',
        contagem: p.contagem,
        tendencia_score: score,
        periodo: janelaHoras <= 1 ? '1h' : janelaHoras <= 6 ? '6h' : janelaHoras <= 24 ? '24h' : '7d',
      });
      processadas++;
    }

    logger.info(`[Tendências] ${processadas} tendências processadas.`);
    return processadas;
  }

  /**
   * Processar tendências por categoria
   */
  async processarTendenciasPorCategoria(janelaHoras = 24) {
    const categorias = await db('categorias as c')
      .select('c.id', 'c.nome')
      .count('p.id as total_produtos')
      .leftJoin('produtos as p', function () {
        this.on('c.id', '=', 'p.categoria_id')
          .andOn('p.criado_em', '>=', db.raw(`DATE_SUB(NOW(), INTERVAL ${janelaHoras} HOUR)`));
      })
      .groupBy('c.id')
      .having('total_produtos', '>', 0);

    for (const cat of categorias) {
      const score = this._calcularScoreTendencia(cat.total_produtos, janelaHoras);
      await tendenciaModel.upsertTendencia({
        termo: cat.nome,
        tipo: 'categoria',
        categoria_id: cat.id,
        contagem: cat.total_produtos,
        tendencia_score: score,
        periodo: janelaHoras <= 6 ? '6h' : janelaHoras <= 24 ? '24h' : '7d',
      });
    }

    return categorias.length;
  }

  /**
   * Processar tendências por localização
   */
  async processarTendenciasPorLocalizacao(janelaHoras = 24) {
    const [result] = await db.raw(`
      SELECT cidade, COUNT(*) as contagem
      FROM produtos
      WHERE cidade IS NOT NULL
        AND cidade != ''
        AND criado_em >= DATE_SUB(NOW(), INTERVAL ? HOUR)
      GROUP BY cidade
      HAVING contagem >= 2
      ORDER BY contagem DESC
      LIMIT 20
    `, [janelaHoras]);

    if (!result || !Array.isArray(result)) return 0;

    for (const r of result) {
      const score = this._calcularScoreTendencia(r.contagem, janelaHoras);
      await tendenciaModel.upsertTendencia({
        termo: r.cidade,
        tipo: 'localizacao',
        contagem: r.contagem,
        tendencia_score: score,
        periodo: janelaHoras <= 6 ? '6h' : janelaHoras <= 24 ? '24h' : '7d',
      });
    }

    return result.length;
  }

  // ── Processamento de Conteúdo em Alta ──

  /**
   * Calcular conteúdo em alta baseado em métricas
   */
  async processarConteudoAlta(periodo = '24h') {
    logger.info(`[Tendências] Processando conteúdo em alta (${periodo})...`);

    const horasMap = { '1h': 1, '6h': 6, '24h': 24, '7d': 168 };
    const horas = horasMap[periodo] || 24;

    // Limpar registos antigos do período
    await db('conteudo_alta').where('periodo', periodo).del();

    // Calcular pontuação composta para cada produto
    const produtos = await db.raw(`
      SELECT 
        p.id as produto_id,
        (
          COALESCE(v.unicos, 0) * 1.0 +
          COALESCE(ev.likes, 0) * 2.0 +
          COALESCE(ev.favoritos, 0) * 3.0 +
          COALESCE(ev.comentarios, 0) * 4.0 +
          COALESCE(ev.partilhas, 0) * 5.0
        ) as pontuacao
      FROM produtos p
      LEFT JOIN (
        SELECT produto_id, COUNT(DISTINCT COALESCE(utilizador_id, session_id)) as unicos
        FROM visualizacoes_produto
        WHERE criado_em >= DATE_SUB(NOW(), INTERVAL ? HOUR)
        GROUP BY produto_id
      ) v ON p.id = v.produto_id
      LEFT JOIN (
        SELECT 
          produto_id,
          SUM(CASE WHEN tipo_evento = 'like' THEN 1 ELSE 0 END) as likes,
          SUM(CASE WHEN tipo_evento = 'favorite' THEN 1 ELSE 0 END) as favoritos,
          SUM(CASE WHEN tipo_evento = 'comment' THEN 1 ELSE 0 END) as comentarios,
          SUM(CASE WHEN tipo_evento = 'share' THEN 1 ELSE 0 END) as partilhas
        FROM eventos_utilizador
        WHERE criado_em >= DATE_SUB(NOW(), INTERVAL ? HOUR)
        GROUP BY produto_id
      ) ev ON p.id = ev.produto_id
      WHERE p.aprovado = 1
      HAVING pontuacao > 0
      ORDER BY pontuacao DESC
      LIMIT 50
    `, [horas, horas]);

    const lista = produtos[0] || [];
    let posicao = 1;

    for (const p of lista) {
      // Determinar métrica principal
      const metrica = this._determinarMetricaPrincipal(p);

      await tendenciaModel.upsertConteudoAlta({
        produto_id: p.produto_id,
        metrica_principal: metrica,
        pontuacao: p.pontuacao,
        periodo,
        posicao: posicao++,
      });
    }

    logger.info(`[Tendências] ${lista.length} produtos em alta (${periodo}).`);
    return lista.length;
  }

  /**
   * Extrair e registar palavras-chave de um produto
   */
  async extrairPalavrasProduto(produtoId, titulo, descricao = '') {
    const palavras = await tendenciaModel.extrairPalavrasDeTitulo(titulo);
    const palavrasDesc = await tendenciaModel.extrairPalavrasDeTitulo(descricao);
    const todasPalavras = [...new Set([...palavras, ...palavrasDesc])];

    for (const palavra of todasPalavras) {
      await tendenciaModel.registarPalavraChave(palavra, produtoId);
    }

    return todasPalavras.length;
  }

  // ── Consultas ──

  async listarTendencias(periodo = '24h', tipo = null, limite = 20) {
    return await tendenciaModel.listarTendencias(periodo, tipo, limite);
  }

  async listarConteudoAlta(periodo = '24h', metrica = null, limite = 20) {
    return await tendenciaModel.listarConteudoAlta(periodo, metrica, limite);
  }

  async obterTendencia(id) {
    return await tendenciaModel.obterTendencia(id);
  }

  async eliminarTendencia(id) {
    return await tendenciaModel.eliminarTendencia(id);
  }

  async eliminarConteudoAlta(id) {
    return await tendenciaModel.eliminarConteudoAlta(id);
  }

  async palavrasMaisUsadas(janelaHoras = 24, limite = 20) {
    return await tendenciaModel.palavrasMaisUsadas(janelaHoras, limite);
  }

  // ── Processamento Completo ──

  async processarTudo() {
    const resultados = {};

    // 1. Tendências por palavra-chave
    resultados.palavras = await this.processarTendencias(24);

    // 2. Tendências por categoria
    resultados.categorias = await this.processarTendenciasPorCategoria(24);

    // 3. Tendências por localização
    resultados.localizacoes = await this.processarTendenciasPorLocalizacao(24);

    // 4. Conteúdo em alta — 1h
    resultados.alta_1h = await this.processarConteudoAlta('1h');

    // 5. Conteúdo em alta — 24h
    resultados.alta_24h = await this.processarConteudoAlta('24h');

    // 6. Conteúdo em alta — 7d
    resultados.alta_7d = await this.processarConteudoAlta('7d');

    return resultados;
  }

  // ── Helpers ──

  _calcularScoreTendencia(contagem, janelaHoras) {
    // Score mais alto para tendências recentes com muitas ocorrências
    const fatorTempo = Math.max(1, janelaHoras <= 1 ? 10 : janelaHoras <= 6 ? 5 : janelaHoras <= 24 ? 2 : 1);
    return contagem * fatorTempo;
  }

  _determinarMetricaPrincipal(dados) {
    const metricas = {
      visualizacoes: dados.unicos || 0,
      likes: dados.likes || 0,
      favoritos: dados.favoritos || 0,
      comentarios: dados.comentarios || 0,
      partilhas: dados.partilhas || 0,
    };
    return Object.entries(metricas).sort((a, b) => b[1] - a[1])[0]?.[0] || 'visualizacoes';
  }
}

module.exports = new TendenciaService();
