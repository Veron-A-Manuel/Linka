// ============================================================
// LINKA — Eventos de Notificações (Tempo Real)
// ============================================================

module.exports = (io, socket) => {
  
  /**
   * Notificar o utilizador sobre algo novo
   * Geralmente chamado internamente pelo servidor
   */
  
  // Eventos emitidos pelo servidor para o cliente:
  // - 'notificacao:nova' -> Quando há um novo alerta, pedido ou mensagem
  // - 'pedido:actualizado' -> Quando o estado de um pedido muda
  
  console.log(`🔔 Sistema de notificações activado para o socket ${socket.id}`);
};
