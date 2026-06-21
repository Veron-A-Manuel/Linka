const db = require('../config/base-de-dados');
const anuncioModel = require('../models/anuncio.model');
const { logger } = require('../config/logger');

class AnuncioService {
  // ── CRUD ──

  async criar(vendedorId, dados) {
    // Validar que o vendedor tem plano com direito a anúncios
    const vendedor = await db('vendedores').where('id', vendedorId).first();
    if (!vendedor) throw new Error('Vendedor não encontrado.');

    // Verificar se o produto pertence ao vendedor
    const produto = await db('produtos').where({ id: dados.produto_id, vendedor_id: vendedorId }).first();
    if (!produto) throw new Error('Produto não encontrado ou não pertence ao vendedor.');

    // Verificar se já tem anúncio activo para este produto
    const existente = await db('anuncios_patrocinados')
      .where({ produto_id: dados.produto_id, estado: 'activo' })
      .first();
    if (existente) throw new Error('Este produto já tem um anúncio activo.');

    // Validar datas
    const hoje = new Date().toISOString().split('T')[0];
    if (dados.data_inicio < hoje) throw new Error('A data de início não pode ser no passado.');
    if (dados.data_fim <= dados.data_inicio) throw new Error('A data de fim deve ser posterior à data de início.');

    // Validar orçamento
    if (dados.orcamento_diario < 1) throw new Error('O orçamento diário mínimo é MZN 1.00.');
    if (dados.custo_por_clique < 0.10) throw new Error('O custo por clique mínimo é MZN 0.10.');

    // Calcular duração máxima (30 dias)
    const inicio = new Date(dados.data_inicio);
    const fim = new Date(dados.data_fim);
    const dias = Math.ceil((fim - inicio) / (1000 * 60 * 60 * 24));
    if (dias > 30) throw new Error('A duração máxima de um anúncio é 30 dias.');

    return await anuncioModel.criar({
      vendedor_id: vendedorId,
      produto_id: dados.produto_id,
      titulo: dados.titulo || produto.titulo,
      orcamento_diario: dados.orcamento_diario,
      custo_por_clique: dados.custo_por_clique,
      data_inicio: dados.data_inicio,
      data_fim: dados.data_fim,
      estado: 'activo',
      destino: dados.destino || 'todos',
      tipo_anuncio: dados.tipo_anuncio || 'imagem',
      texto_oferta: dados.texto_oferta || null,
      link_externo: dados.link_externo || null,
      categorias_alvo: dados.categorias_alvo ? JSON.stringify(dados.categorias_alvo) : null,
      cidades_alvo: dados.cidades_alvo ? JSON.stringify(dados.cidades_alvo) : null,
      prioridade: dados.prioridade || 0,
    });
  }

  async obter(id) {
    return await anuncioModel.obter(id);
  }

  async listarPorVendedor(vendedorId, estado = null) {
    return await anuncioModel.listarPorVendedor(vendedorId, estado);
  }

  async actualizar(id, dados) {
    const anuncio = await anuncioModel.obter(id);
    if (!anuncio) throw new Error('Anúncio não encontrado.');

    // Só pode alterar se estiver activo ou pendente
    if (!['activo', 'pendente'].includes(anuncio.estado)) {
      throw new Error('Não é possível alterar um anúncio com este estado.');
    }

    return await anuncioModel.actualizar(id, dados);
  }

  async pausar(id) {
    const anuncio = await anuncioModel.obter(id);
    if (!anuncio) throw new Error('Anúncio não encontrado.');
    if (anuncio.estado !== 'activo') throw new Error('Só é possível pausar anúncios activos.');
    return await anuncioModel.actualizar(id, { estado: 'pausado' });
  }

  async retomar(id) {
    const anuncio = await anuncioModel.obter(id);
    if (!anuncio) throw new Error('Anúncio não encontrado.');
    if (anuncio.estado !== 'pausado') throw new Error('Só é possível retomar anúncios pausados.');
    return await anuncioModel.actualizar(id, { estado: 'activo' });
  }

  async eliminar(id) {
    return await anuncioModel.eliminar(id);
  }

  // ── Seleção para Feed ──

  async selecionarParaFeed(opcoes = {}) {
    return await anuncioModel.selecionarParaFeed(opcoes);
  }

  // ── Tracking ──

  async registarImpressao(anuncioId, utilizadorId, sessionId, ip, userAgent) {
    await anuncioModel.registarImpressao(anuncioId, utilizadorId, sessionId, ip, userAgent);
  }

  async registarClique(anuncioId, utilizadorId, sessionId, ip, userAgent) {
    await anuncioModel.registarClique(anuncioId, utilizadorId, sessionId, ip, userAgent);
  }

  // ── Estatísticas ──

  async estatisticasAnuncio(anuncioId, dias = 30) {
    return await anuncioModel.estatisticasAnuncio(anuncioId, dias);
  }

  async estatisticasVendedor(vendedorId) {
    return await anuncioModel.estatisticasVendedor(vendedorId);
  }

  // ── Manutenção ──

  async actualizarEstados() {
    const expirados = await anuncioModel.actualizarEstadosExpirados();
    const reactivados = await anuncioModel.reactivarSemSaldo();
    return { expirados, reactivados };
  }
}

module.exports = new AnuncioService();
