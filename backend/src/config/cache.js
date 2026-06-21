const redis = require('redis');

let clienteRedis = null;
let conectado = false;

const CACHE_PADRAO_TTL = 300; // 5 minutos

/**
 * Configura e liga o cliente Redis global.
 * Se REDIS_URL ou REDIS_HOST não estiver definido, Redis fica desactivado.
 */
const configurarRedis = async () => {
  const redisUrl = process.env.REDIS_URL;
  const redisHost = process.env.REDIS_HOST;

  if (!redisUrl && !redisHost) {
    console.warn('[Cache] Redis não configurado (REDIS_URL/REDIS_HOST ausente). Cache desactivado.');
    return false;
  }

  try {
    const opcoes = redisUrl
      ? { url: redisUrl }
      : {
          socket: {
            host: redisHost || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD || undefined,
          }
        };

    clienteRedis = redis.createClient(opcoes);

    let errosLogados = 0;
    clienteRedis.on('error', (err) => {
      if (errosLogados === 0) {
        console.warn('[Cache] Redis indisponível. Cache desactivado. (erros futuros serão silenciados)');
      }
      errosLogados++;
      conectado = false;
    });

    clienteRedis.on('connect', () => {
      console.log('[Cache] Redis conectado.');
      conectado = true;
    });

    clienteRedis.on('disconnect', () => {
      console.warn('[Cache] Redis desconectado.');
      conectado = false;
    });

    await clienteRedis.connect();
    return true;
  } catch (err) {
    console.warn('[Cache] Falha ao ligar Redis:', err.message);
    clienteRedis = null;
    conectado = false;
    return false;
  }
};

/**
 * Obter valor do cache
 */
const obter = async (chave) => {
  if (!conectado || !clienteRedis) return null;
  try {
    const dados = await clienteRedis.get(chave);
    return dados ? JSON.parse(dados) : null;
  } catch (err) {
    console.error('[Cache] Erro ao obter:', err.message);
    return null;
  }
};

/**
 * Guardar valor no cache com TTL
 */
const guardar = async (chave, dados, ttl = CACHE_PADRAO_TTL) => {
  if (!conectado || !clienteRedis) return;
  try {
    await clienteRedis.set(chave, JSON.stringify(dados), { EX: ttl });
  } catch (err) {
    console.error('[Cache] Erro ao guardar:', err.message);
  }
};

/**
 * Invalidar cache por padrão (ex: todos os produtos)
 */
const invalidar = async (padrao) => {
  if (!conectado || !clienteRedis) return;
  try {
    const chaves = await clienteRedis.keys(padrao);
    if (chaves.length > 0) {
      await clienteRedis.del(chaves);
      console.log(`[Cache] ${chaves.length} chave(s) invalidada(s): ${padrao}`);
    }
  } catch (err) {
    console.error('[Cache] Erro ao invalidar:', err.message);
  }
};

/**
 * Fechar ligação Redis
 */
const fechar = async () => {
  if (clienteRedis && conectado) {
    await clienteRedis.quit();
    conectado = false;
  }
};

/**
 * Middleware Express que faz cache da resposta
 * @param {string} prefixo - Prefixo da chave (ex: 'produtos')
 * @param {number} ttl - Tempo de vida em segundos
 */
const middlewareCache = (prefixo, ttl = CACHE_PADRAO_TTL) => {
  return async (req, res, next) => {
    if (!conectado || !clienteRedis) return next();

    // Só cache de GET requests
    if (req.method !== 'GET') return next();

    const chave = `${prefixo}:${req.originalUrl}`;
    const dadosCache = await obter(chave);

    if (dadosCache) {
      return res.json(dadosCache);
    }

    // Interceptar res.json para cache
    const jsonOriginal = res.json.bind(res);
    res.json = (dados) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        guardar(chave, dados, ttl).catch(() => {});
      }
      return jsonOriginal(dados);
    };

    next();
  };
};

const getRedisClient = () => clienteRedis;

module.exports = {
  configurarRedis,
  obter,
  guardar,
  invalidar,
  fechar,
  middlewareCache,
  getRedisClient,
  CACHE_PADRAO_TTL,
};
