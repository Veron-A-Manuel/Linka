let ioInstance = null;

const setIo = (io) => {
  ioInstance = io;
  return ioInstance;
};

const getIo = () => ioInstance;

const emitirParaUtilizador = (utilizadorId, evento, dados) => {
  if (!ioInstance) return false;
  ioInstance.to(`utilizador_${utilizadorId}`).emit(evento, dados);
  return true;
};

const emitirParaSala = (sala, evento, dados) => {
  if (!ioInstance) return false;
  ioInstance.to(sala).emit(evento, dados);
  return true;
};

module.exports = {
  setIo,
  getIo,
  emitirParaUtilizador,
  emitirParaSala,
};
