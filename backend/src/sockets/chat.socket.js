// ============================================================
// LINKA — Eventos de Chat (Tempo Real)
// ============================================================

const conversaModel = require('../models/conversa.model');

module.exports = (io, socket) => {
  
  /**
   * Entrar numa sala de conversa específica
   * Valida se o utilizador pertence à conversa
   */
  socket.on('chat:entrar', async (conversaId) => {
    try {
      const pertence = await conversaModel.pertenceAConversa(conversaId, socket.utilizador.id);
      if (!pertence) {
        socket.emit('chat:erro', { mensagem: 'Não tem acesso a esta conversa.' });
        return;
      }
      socket.join(`conversa_${conversaId}`);
      console.log(`💬 Utilizador ${socket.utilizador.id} entrou na sala da conversa ${conversaId}`);
    } catch (err) {
      console.error('[Chat] Erro ao validar conversa:', err.message);
      socket.emit('chat:erro', { mensagem: 'Erro ao entrar na conversa.' });
    }
  });

  /**
   * Sair de uma sala de conversa
   */
  socket.on('chat:sair', (conversaId) => {
    socket.leave(`conversa_${conversaId}`);
    console.log(`💬 Utilizador ${socket.utilizador.id} saiu da sala da conversa ${conversaId}`);
  });

  /**
   * Indicar que o utilizador está a escrever
   */
  socket.on('chat:escrevendo', (dados) => {
    const { conversaId, escrevendo } = dados;
    socket.to(`conversa_${conversaId}`).emit('chat:escrevendo', {
      utilizadorId: socket.utilizador.id,
      escrevendo
    });
  });

  /**
   * Enviar mensagem (opcional via socket, normalmente via REST com emissão aqui)
   */
  // Nota: Preferimos enviar a mensagem via POST /api/conversas/enviar 
  // e o serviço dispara o evento para o socket. Mas deixamos suporte aqui.
};
