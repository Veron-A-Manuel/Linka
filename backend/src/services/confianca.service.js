const db = require('../config/base-de-dados');
const confiancaModel = require('../models/confianca.model');

class ConfiancaService {
  /**
   * Pesos para cálculo do score de confiança
   */
  static PESOS = {
    idade_conta: { // Dias desde o registo
      max_pontos: 15,
      dias_para_max: 90, // 90 dias para atingir o máximo
    },
    verificacao_email: 10,
    vendas_concluidas: { // Por venda
      pontos_por_unidade: 3,
      max_pontos: 20,
    },
    avaliacoes_recebidas: { // Por estrela média
      pontos_por_estrela: 3,
    },
    denuncias_recebidas: { // Por denúncia
      pontos_por_unidade: -5,
      max_penalty: -25,
    },
    produtos_activos: { // Anúncios publicados
      pontos_por_unidade: 1,
      max_pontos: 5,
    },
  };

  /**
   * Calcular score de confiança para um utilizador
   */
  async calcularScore(utilizadorId) {
    const factores = {};
    let scoreBase = 50; // Score inicial

    // 1. Idade da conta
    const utilizador = await db('utilizadores')
      .select('criado_em', 'verificado')
      .where('id', utilizadorId)
      .first();

    if (utilizador) {
      const diasDesdeRegisto = Math.floor(
        (Date.now() - new Date(utilizador.criado_em).getTime()) / (1000 * 60 * 60 * 24)
      );
      const pontosIdade = Math.min(
        ConfiancaService.PESOS.idade_conta.max_pontos,
        (diasDesdeRegisto / ConfiancaService.PESOS.idade_conta.dias_para_max) * ConfiancaService.PESOS.idade_conta.max_pontos
      );
      factores.idade_conta = { dias: diasDesdeRegisto, pontos: Math.round(pontosIdade * 10) / 10 };
      scoreBase += pontosIdade;

      // 2. Verificação de email
      if (utilizador.verificado) {
        factores.verificacao_email = { pontos: ConfiancaService.PESOS.verificacao_email };
        scoreBase += ConfiancaService.PESOS.verificacao_email;
      }
    }

    // 3. Vendas concluídas
    const [vendas] = await db('pedidos')
      .where('vendedor_id', function () {
        this.select('id').from('vendedores').where('utilizador_id', utilizadorId);
      })
      .whereIn('estado', ['entregue', 'confirmado'])
      .count('id as total');

    const totalVendas = Number(vendas?.total || 0);
    const pontosVendas = Math.min(
      ConfiancaService.PESOS.vendas_concluidas.max_pontos,
      totalVendas * ConfiancaService.PESOS.vendas_concluidas.pontos_por_unidade
    );
    factores.vendas_concluidas = { total: totalVendas, pontos: pontosVendas };
    scoreBase += pontosVendas;

    // 4. Avaliações recebidas
    const [avaliacoes] = await db('avaliacoes as a')
      .where('avaliado_id', utilizadorId)
      .where('tipo', 'vendedor')
      .avg('estrelas as media');

    const mediaAvaliacoes = Number(avaliacoes?.media || 0);
    const pontosAvaliacoes = mediaAvaliacoes * ConfiancaService.PESOS.avaliacoes_recebidas.pontos_por_estrela;
    factores.avaliacoes_recebidas = { media: Math.round(mediaAvaliacoes * 10) / 10, pontos: Math.round(pontosAvaliacoes * 10) / 10 };
    scoreBase += pontosAvaliacoes;

    // 5. Denúncias recebidas
    const [denuncias] = await db('denuncias')
      .where('denunciado_id', utilizadorId)
      .count('id as total');

    const totalDenuncias = Number(denuncias?.total || 0);
    const penaltyDenuncias = Math.max(
      ConfiancaService.PESOS.denuncias_recebidas.max_penalty,
      totalDenuncias * ConfiancaService.PESOS.denuncias_recebidas.pontos_por_unidade
    );
    factores.denuncias_recebidas = { total: totalDenuncias, pontos: penaltyDenuncias };
    scoreBase += penaltyDenuncias;

    // 6. Produtos activos
    const vendedor = await db('vendedores')
      .where('utilizador_id', utilizadorId)
      .first();

    if (vendedor) {
      const [produtos] = await db('produtos')
        .where('vendedor_id', vendedor.id)
        .where('aprovado', 1)
        .count('id as total');

      const totalProdutos = Number(produtos?.total || 0);
      const pontosProdutos = Math.min(
        ConfiancaService.PESOS.produtos_activos.max_pontos,
        totalProdutos * ConfiancaService.PESOS.produtos_activos.pontos_por_unidade
      );
      factores.produtos_activos = { total: totalProdutos, pontos: pontosProdutos };
      scoreBase += pontosProdutos;
    }

    // Limitar score entre 0 e 100
    const scoreFinal = Math.max(0, Math.min(100, Math.round(scoreBase * 10) / 10));

    // Guardar na BD
    await confiancaModel.upsert(utilizadorId, scoreFinal, factores);

    return { score: scoreFinal, factores };
  }

  /**
   * Calcular scores para todos os vendedores activos
   */
  async calcularTodos() {
    const vendedores = await db('vendedores')
      .select('utilizador_id')
      .where('aprovado', 1);

    let processados = 0;
    for (const v of vendedores) {
      await this.calcularScore(v.utilizador_id);
      processados++;
    }

    return { processados };
  }

  /**
   * Obter score de confiança de um utilizador
   */
  async obterScore(utilizadorId) {
    let registo = await confiancaModel.obterPorUtilizador(utilizadorId);

    // Se não existe ou tem mais de 24h, recalcular
    if (!registo || this._precisaRecalcular(registo.actualizado_em)) {
      const resultado = await this.calcularScore(utilizadorId);
      return resultado;
    }

    return {
      score: Number(registo.score),
      factores: registo.factores_json ? JSON.parse(registo.factores_json) : {},
    };
  }

  /**
   * Verificar se precisa de recálculo (> 24h desde a última actualização)
   */
  _precisaRecalcular(actualizadoEm) {
    if (!actualizadoEm) return true;
    const horasDesdeUltimo = (Date.now() - new Date(actualizadoEm).getTime()) / (1000 * 60 * 60);
    return horasDesdeUltimo > 24;
  }

  /**
   * Obter nível de confiança descritivo
   */
  obterNivel(score) {
    if (score >= 80) return { nivel: 'excelente', rotulo: 'Vendedor Top', cor: '#10b981', icone: 'verified' };
    if (score >= 60) return { nivel: 'bom', rotulo: 'Vendedor Fiável', cor: '#3b82f6', icone: 'thumb_up' };
    if (score >= 40) return { nivel: 'medio', rotulo: 'Vendedor Novo', cor: '#f59e0b', icone: 'person' };
    return { nivel: 'baixo', rotulo: 'Conta Nova', cor: '#9ca3af', icone: 'hourglass_empty' };
  }
}

module.exports = new ConfiancaService();
