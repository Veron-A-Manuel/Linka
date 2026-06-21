require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const compression = require('compression');

const { limitadorGeral } = require('./src/middlewares/seguranca.middleware');
const { manipuladorErros } = require('./src/middlewares/erro.middleware');
const { setIo } = require('./src/config/realtime');
const { configurarRedisParaSockets } = require('./src/config/redis');
const { configurarRedis: configurarCacheRedis } = require('./src/config/cache');
const { logger } = require('./src/config/logger');
const httpLogger = require('./src/middlewares/http-logger.middleware');
const inicializarSockets = require('./src/sockets');
const swaggerSpec = require('./src/config/swagger');
const swaggerUi = require('swagger-ui-express');

// Configuração de CORS Dinâmica
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || origin === 'null') return callback(null, true);
    
    const origensPermitidas = [
      'http://localhost:5500',
      'http://127.0.0.1:5500',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5173',
      'http://127.0.0.1:5173'
    ];

    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    const eValido = origensPermitidas.includes(origin) || 
                    (origin && (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')));

    if (eValido) {
      callback(null, true);
    } else {
      logger.warn(`CORS bloqueado: ${origin}`);
      callback(new Error('Não permitido pela política de CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['set-cookie']
};

const app = express();
app.use(cors(corsOptions));

const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions
});

// ─── MIDDLEWARES GLOBAIS ────────────────────────────────────
app.use(limitadorGeral);

// Compressão gzip (reduz tamanho das respostas ~70%)
app.use(compression({
  level: 6,
  threshold: 1024, // Só comprimir respostas > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
}));

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false,
}));

// Logging HTTP (morgan → winston)
app.use(httpLogger);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Forçar charset UTF-8 em todas as respostas da API JSON
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// ─── FICHEIROS ESTÁTICOS ───────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '7d', // Cache do browser por 7 dias
}));

// ─── ROTAS DA API ──────────────────────────────────────────
app.use('/api/auth', require('./src/routes/autenticacao.routes'));
app.use('/api/sessoes', require('./src/routes/sessao.routes'));
app.use('/api/utilizadores', require('./src/routes/utilizador.routes'));
app.use('/api/produtos', require('./src/routes/produto.routes'));
app.use('/api/categorias', require('./src/routes/categoria.routes'));
app.use('/api/favoritos', require('./src/routes/favorito.routes'));
app.use('/api/pedidos', require('./src/routes/pedido.routes'));
app.use('/api/conversas', require('./src/routes/conversa.routes'));
app.use('/api/estatisticas', require('./src/routes/estatisticas.routes'));
app.use('/api/planos', require('./src/routes/plano.routes'));
app.use('/api/subscricoes', require('./src/routes/subscricao.routes'));
app.use('/api/avaliacoes', require('./src/routes/avaliacao.routes'));
app.use('/api/denuncias', require('./src/routes/denuncia.routes'));
app.use('/api/sancoes', require('./src/routes/sancao.routes'));
app.use('/api/explore', require('./src/routes/explore.routes'));
app.use('/api/eventos', require('./src/routes/evento.routes'));
app.use('/api/confianca', require('./src/routes/confianca.routes'));
app.use('/api/ranking', require('./src/routes/vendedor-ranking.routes'));
app.use('/api/notificacoes', require('./src/routes/notificacao.routes'));
app.use('/api/analytics', require('./src/routes/anuncio-analytics.routes'));
app.use('/api/spam', require('./src/routes/spam.routes'));
app.use('/api/anti-spam', require('./src/routes/anti-spam.routes'));
app.use('/api/tendencias', require('./src/routes/tendencia.routes'));
app.use('/api/anuncios', require('./src/routes/anuncio.routes'));
app.use('/api/anuncios/track', require('./src/routes/anuncio-track.routes'));

// Funcionalidades de interação entre clientes
app.use('/api/seguidores', require('./src/routes/seguidor.routes'));
app.use('/api/comentario-likes', require('./src/routes/comentario-like.routes'));
app.use('/api/comentario-respostas', require('./src/routes/comentario-resposta.routes'));
app.use('/api/recentemente-vistos', require('./src/routes/recentemente-visto.routes'));
app.use('/api/carrinho', require('./src/routes/carrinho.routes'));
app.use('/api/preferencias', require('./src/routes/preferencia.routes'));
app.use('/api/entregas', require('./src/routes/entrega.routes'));
app.use('/api/push', require('./src/routes/push.routes'));

// Swagger API Docs
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Linka API Docs',
  customCss: '.swagger-ui .topbar { display: none }'
}));
app.get('/api/docs/json', (req, res) => { res.json(swaggerSpec); });

// Health check
app.get('/api/saude', (req, res) => {
  res.json({
    sucesso: true,
    mensagem: 'Linka API esta a funcionar!',
    versao: '1.0.0',
    ambiente: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// Frontend estático
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    sucesso: false,
    erro: 'Rota nao encontrada',
    codigo: 404,
  });
});

// Error handler
app.use(manipuladorErros);

// ─── SOCKETS ───────────────────────────────────────────────
setIo(io);
inicializarSockets(io);

// ─── ARRANQUE DO SERVIDOR ──────────────────────────────────
async function startServer() {
  // Ligar Redis (cache + sockets)
  await configurarCacheRedis();
  await configurarRedisParaSockets(io);

  const PORTA = process.env.PORT || 3000;
  server.listen(PORTA, () => {
    logger.info(`Linka Backend iniciado!`);
    logger.info(`Servidor: http://localhost:${PORTA}`);
    logger.info(`Saúde: http://localhost:${PORTA}/api/saude`);
    logger.info(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Cache Redis: ${process.env.REDIS_HOST ? 'activado' : 'desactivado'}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { app, io, server, startServer };
