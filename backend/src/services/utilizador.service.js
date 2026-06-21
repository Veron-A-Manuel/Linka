const utilizadorModel = require('../models/utilizador.model');

// ============================================================
// LINKA — Serviço de Utilizadores (Lógica de Negócio)
// ============================================================

class UtilizadorService {
  
  /**
   * Obtém o perfil completo do utilizador
   */
  async obterPerfil(id) {
    const utilizador = await utilizadorModel.procurarPorId(id);
    
    if (!utilizador) {
      throw new Error('Utilizador não encontrado.');
    }

    if (utilizador.tipo === 'vendedor') {
      const vendedorModel = require('../models/vendedor.model');
      const vendedor = await vendedorModel.procurarPorUtilizadorId(id);
      if (vendedor) {
        utilizador.nome_loja = vendedor.nome_loja;
        utilizador.descricao_loja = vendedor.descricao_loja;
        utilizador.endereco_fisico = vendedor.endereco_fisico;
        utilizador.metodo_recebimento = vendedor.metodo_recebimento;
      }
    }

    // Remover dados sensíveis antes de devolver ao controller
    delete utilizador.senha_hash;
    delete utilizador.refresh_token;

    return utilizador;
  }

  /**
   * Actualiza dados do perfil
   */
  async actualizarPerfil(id, dados) {
    const { email, telefone } = dados;

    // 1. Validar se email/telefone já existem em outra conta
    if (telefone || email) {
      const existente = await utilizadorModel.verificarExistencia(email, telefone);
      if (existente && existente.id !== id) {
        if (existente.email === email) throw new Error('Este email já está em uso por outra conta.');
        if (existente.telefone === telefone) throw new Error('Este telefone já está em uso por outra conta.');
      }
    }

    // 2. Filtrar apenas campos permitidos para actualização directa
    const camposPermitidos = ['nome', 'telefone', 'avatar', 'cidade', 'bairro', 'latitude', 'longitude'];
    const dadosParaActualizar = {};
    
    Object.keys(dados).forEach(key => {
      if (camposPermitidos.includes(key) && dados[key] !== undefined) {
        dadosParaActualizar[key] = dados[key];
      }
    });

    // 3. Executar actualização do Utilizador
    if (Object.keys(dadosParaActualizar).length > 0) {
      await utilizadorModel.actualizar(id, dadosParaActualizar);
    }

    // 4. Se for Vendedor, actualizar também os dados da loja
    const utilizadorAtual = await utilizadorModel.procurarPorId(id);
    if (utilizadorAtual && utilizadorAtual.tipo === 'vendedor') {
      const camposLoja = ['nome_loja', 'descricao_loja', 'endereco_fisico', 'metodo_recebimento'];
      const dadosLoja = {};
      Object.keys(dados).forEach(key => {
        if (camposLoja.includes(key) && dados[key] !== undefined) {
          dadosLoja[key] = dados[key];
        }
      });
      
      if (Object.keys(dadosLoja).length > 0) {
        const vendedorModel = require('../models/vendedor.model');
        const vendedor = await vendedorModel.procurarPorUtilizadorId(id);
        if (vendedor) {
          await vendedorModel.actualizar(vendedor.id, dadosLoja);
        }
      }
    }

    // 4. Retornar perfil actualizado
    return await this.obterPerfil(id);
  }
}

module.exports = new UtilizadorService();
