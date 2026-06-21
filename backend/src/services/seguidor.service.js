const seguidorModel = require('../models/seguidor.model');
const ErroApp = require('../utils/erro-app');

class SeguidorService {

  async seguir(seguidorId, vendedorId) {
    if (seguidorId === vendedorId) {
      throw new ErroApp('Não pode seguir a si mesmo.', 400);
    }

    const id = await seguidorModel.seguir(seguidorId, vendedorId);
    const total = await seguidorModel.contarSeguidores(vendedorId);
    return { seguido: true, total_seguidores: total };
  }

  async deixarDeSeguir(seguidorId, vendedorId) {
    await seguidorModel.deixarDeSeguir(seguidorId, vendedorId);
    const total = await seguidorModel.contarSeguidores(vendedorId);
    return { seguido: false, total_seguidores: total };
  }

  async verificar(seguidorId, vendedorId) {
    return await seguidorModel.verificar(seguidorId, vendedorId);
  }

  async contarSeguidores(vendedorId) {
    return await seguidorModel.contarSeguidores(vendedorId);
  }

  async contarSeguindo(utilizadorId) {
    return await seguidorModel.contarSeguindo(utilizadorId);
  }

  async listarSeguidores(vendedorId, limite, offset) {
    return await seguidorModel.listarSeguidores(vendedorId, limite, offset);
  }

  async listarSeguindo(utilizadorId, limite, offset) {
    return await seguidorModel.listarSeguindo(utilizadorId, limite, offset);
  }
}

module.exports = new SeguidorService();
