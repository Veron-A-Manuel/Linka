const denunciaModel = require('../models/denuncia.model');
const ErroApp = require('../utils/erro-app');
const db = require('../config/base-de-dados');
const { emitirParaUtilizador } = require('../config/realtime');

class DenunciaService {

  async criarDenuncia(denuncianteId, dados) {
    const { denunciado_id, produto_id, motivo, descricao } = dados;

    if (!['fraude', 'conteudo_inapropriado', 'spam', 'produto_falso', 'preco_abusivo', 'outro'].includes(motivo)) {
      throw new ErroApp('Motivo de denúncia inválido.', 400);
    }

    if (!descricao || descricao.trim().length < 10) {
      throw new ErroApp('A descrição deve ter pelo menos 10 caracteres.', 400);
    }

    // Não pode denunciar a si mesmo
    if (denuncianteId === denunciado_id) {
      throw new ErroApp('Não pode denunciar a si mesmo.', 400);
    }

    const id = await denunciaModel.criar({
      denunciante_id: denuncianteId,
      denunciado_id: denunciado_id || null,
      produto_id: produto_id || null,
      motivo,
      descricao: descricao.trim(),
    });

    // Notificar todos os admin sobre nova denúncia
    const admins = await db('utilizadores').where('tipo', 'admin').select('id');
    for (const admin of admins) {
      emitirParaUtilizador(admin.id, 'notificacao:nova', {
        tipo: 'denuncia',
        titulo: 'Nova denúncia recebida',
        corpo: `Uma nova denúncia foi registada e precisa de análise.`,
        denuncia_id: id,
      });
    }

    return await denunciaModel.procurarPorId(id);
  }

  async listarTodas(estado = null) {
    return await denunciaModel.listar(estado);
  }

  async listarPorDenunciante(denuncianteId) {
    return await denunciaModel.listarPorDenunciante(denuncianteId);
  }

  async obterPorId(id) {
    const denuncia = await denunciaModel.procurarPorId(id);
    if (!denuncia) throw new ErroApp('Denúncia não encontrada.', 404);
    return denuncia;
  }

  async resolverDenuncia(id, adminId, estado, respostaAdmin = null) {
    if (!['resolvida', 'rejeitada'].includes(estado)) {
      throw new ErroApp('Estado inválido. Use "resolvida" ou "rejeitada".', 400);
    }

    const denuncia = await denunciaModel.procurarPorId(id);
    if (!denuncia) throw new ErroApp('Denúncia não encontrada.', 404);
    if (denuncia.estado !== 'pendente' && denuncia.estado !== 'em_analise') {
      throw new ErroApp('Esta denúncia já foi processada.', 400);
    }

    await denunciaModel.actualizarEstado(id, estado, adminId, respostaAdmin);

    // Notificar o denunciante sobre o resultado
    const corpo = estado === 'resolvida'
      ? `A sua denúncia #${id} foi analisada e tomámos acção. Obrigado pela sua contribuição.`
      : `A sua denúncia #${id} foi analisada e não foram encontradas violações das nossas diretrizes.`;

    emitirParaUtilizador(denuncia.denunciante_id, 'notificacao:nova', {
      tipo: 'denuncia',
      titulo: estado === 'resolvida' ? 'Denúncia resolvida' : 'Denúncia rejeitada',
      corpo,
      denuncia_id: id,
    });

    // Persistir notificação na BD
    await db('notificacoes').insert({
      utilizador_id: denuncia.denunciante_id,
      tipo: 'denuncia',
      titulo: estado === 'resolvida' ? 'Denúncia resolvida' : 'Denúncia rejeitada',
      corpo,
      dados_json: JSON.stringify({ denuncia_id: id }),
    });

    return await denunciaModel.procurarPorId(id);
  }

  async contarPendentes() {
    return await denunciaModel.contarPendentes();
  }
}

module.exports = new DenunciaService();

