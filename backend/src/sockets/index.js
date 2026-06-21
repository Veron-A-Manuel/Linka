const { verificarAccessToken } = require('../utils/token');

// ============================================================
// LINKA — Socket Hub Principal
// Gere ligações, autenticação e delega para namespaces/eventos
// ============================================================

const inicializarSockets = (io) => {
  
  // Middleware de Autenticação para Sockets
  io.use((socket, next) => {
    // 1. Tentar ler do handshake auth ou query
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      return next(new Error('Autenticação necessária.'));
    }

    const payload = verificarAccessToken(token);
    if (!payload) {
      return next(new Error('Token inválido ou expirado.'));
    }

    // Guardar dados do utilizador no socket
    socket.utilizador = payload;
    next();
  });

  // Evento de Ligação
  io.on('connection', (socket) => {
    const userId = socket.utilizador.id;
    console.log(`🔌 Utilizador conectado via Socket: ${userId} (Socket ID: ${socket.id})`);

    // Juntar o utilizador a uma sala privada baseada no seu ID
    // Isto permite enviar notificações directas para este utilizador
    socket.join(`utilizador_${userId}`);

    // Carregar módulos de socket específicos
    require('./chat.socket')(io, socket);
    require('./notificacoes.socket')(io, socket);

    socket.on('disconnect', () => {
      console.log(`❌ Utilizador desconectado: ${userId}`);
    });
  });

  return io;
};

module.exports = inicializarSockets;
