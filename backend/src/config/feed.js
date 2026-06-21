// ============================================================
// LINKA — Configuração do Algoritmo de Feed
// Pesos para scoring de relevância dos produtos
// ============================================================

module.exports = {
  // Pesos do algoritmo de scoring
  pesos: {
    visualizacoes: parseFloat(process.env.FEED_PESO_VISUALIZACOES || '1'),
    favoritos: parseFloat(process.env.FEED_PESO_FAVORITOS || '2'),
    comentarios: parseFloat(process.env.FEED_PESO_COMENTARIOS || '3'),
    idade: parseFloat(process.env.FEED_PESO_IDADE || '1.5'),
    vendedor: parseFloat(process.env.FEED_PESO_VENDEDOR || '1'),
    destaque: parseFloat(process.env.FEED_PESO_DESTAQUE || '2'),
    stock: parseFloat(process.env.FEED_PESO_STOCK || '0.5'),
    confianca: parseFloat(process.env.FEED_PESO_CONFIANCA || '1.5'),
  },

  // Configuração de cache do feed
  cache: {
    ttlAlgoritmico: 180,   // 3 minutos para feed algorítmico
    ttlRecente: 60,        // 1 minuto para feed cronológico
    ttlLatest: 30,         // 30 segundos para pull-to-refresh
  },

  // Limites de paginação
  paginacao: {
    limitePadrao: 20,
    limiteMaximo: 50,
  },

  // Configuração de visualizações
  visualizacoes: {
    thresholdVisivel: 0.5,     // 50% do produto visível
    tempoMinimoMs: 2000,       // 2 segundos para registar view
    cooldownDias: 1,           // 1 view por utilizador/produto/dia
  },
};
