const { createClient } = require('redis');

let adapterInicializado = false;

const configurarRedisParaSockets = async (io) => {
  if (adapterInicializado) return true;

  const redisUrl = process.env.REDIS_URL;
  const redisHost = process.env.REDIS_HOST;

  if (!redisUrl && !redisHost) {
    console.warn('[Redis] REDIS_HOST/REDIS_URL não definido. Socket.IO sem adapter Redis.');
    return false;
  }

  let createAdapter;
  try {
    ({ createAdapter } = require('@socket.io/redis-adapter'));
  } catch (erro) {
    console.warn('[Redis] Pacote @socket.io/redis-adapter não instalado. Socket.IO sem adapter Redis.');
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

    const pubClient = createClient(opcoes);
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));

    adapterInicializado = true;
    console.log('[Redis] Socket.IO adapter activado com sucesso.');
    return true;
  } catch (err) {
    console.error('[Redis] Falha ao activar adapter Socket.IO:', err.message);
    return false;
  }
};

module.exports = {
  configurarRedisParaSockets,
};
