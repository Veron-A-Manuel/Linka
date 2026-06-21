const knex = require('knex');
const { performance } = require('./logger');
require('dotenv').config();

// ============================================================
// LINKA - Conexao a Base de Dados (MySQL via Knex.js)
// ============================================================

const SLOW_QUERY_MS = Number(process.env.SLOW_QUERY_MS || 500);

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_UTILIZADOR || 'root',
    password: process.env.DB_PASSWORD || 'simindila',
    database: process.env.DB_NOME || 'linka_db',
    timezone: '+02:00',
    charset: 'utf8mb4',
  },
  pool: {
    min: Number(process.env.DB_POOL_MIN || 2),
    max: Number(process.env.DB_POOL_MAX || 20),
  },
  log: {
    warn: (msg) => console.warn('[Knex WARN]', msg),
    error: (msg) => console.error('[Knex ERROR]', msg),
    debug: (msg) => console.debug('[Knex DEBUG]', msg),
    deprecations: (msg) => console.warn('[Knex DEPRECATION]', msg),
  },
});

// Log de queries lentas (> 500ms por padrão)
db.on('query-response', (response, obj) => {
  const duracao = obj.__knexQueryUid ? obj.__duration : 0;
  if (duracao > SLOW_QUERY_MS) {
    performance.warn('Query lenta detectada', {
      duracao_ms: duracao,
      query: obj.sql ? obj.sql.substring(0, 200) : 'N/A',
      bindings: obj.bindings,
    });
  }
});

const devePularTeste = process.env.NODE_ENV === 'test' || process.env.LINKA_SKIP_DB_CHECK === '1';

if (!devePularTeste) {
  db.raw('SELECT 1 as teste')
    .then(() => {
      console.log('Conectado a base de dados MySQL (linka_db)');
    })
    .catch((err) => {
      console.error('Erro ao conectar a base de dados:', err.message);
      process.exit(1);
    });
}

module.exports = db;
