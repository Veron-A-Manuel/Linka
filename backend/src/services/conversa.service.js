const conversaModel = require('../models/conversa.model');
const spamService = require('./spam.service');
const { emitirParaUtilizador, emitirParaSala } = require('../config/realtime');

class ConversaService {
  async listarMinhasConversas(utilizadorId) {
    return await conversaModel.listarPorUtilizador(utilizadorId);
  }

  async enviarMensagem(remetenteId, dados) {
    const { destinatario_id, produto_id, conteudo, tipo = 'texto' } = dados;

    if (remetenteId === parseInt(destinatario_id, 10)) {
      throw new Error('Nao pode enviar mensagens para si mesmo.');
    }

    // Anti-spam: verificar flood de mensagens
    const verificacao = await spamService.verificarERegistar(remetenteId, 'mensagem', { produtoId: produto_id });
    if (!verificacao.permitido) {
      throw new Error(verificacao.accao === 'bloqueado'
        ? 'Demasiadas mensagens. Aguarde alguns minutos.'
        : 'Limite de mensagens atingido. Aguarde um momento.');
    }

    const conversa = await conversaModel.obterOuCriar(remetenteId, destinatario_id, produto_id);
    const mensagemId = await conversaModel.adicionarMensagem({
      conversa_id: conversa.id,
      remetente_id: remetenteId,
      conteudo,
      tipo,
    });

    const payloadMensagem = {
      id: mensagemId,
      conversa_id: conversa.id,
      remetente_id: remetenteId,
      conteudo,
      tipo,
      criado_em: new Date().toISOString(),
    };

    emitirParaSala(`conversa_${conversa.id}`, 'chat:mensagem', payloadMensagem);
    emitirParaUtilizador(destinatario_id, 'notificacao:nova', {
      tipo: 'mensagem',
      titulo: 'Nova mensagem',
      corpo: conteudo.substring(0, 50),
      conversa_id: conversa.id,
    });

    return {
      mensagem_id: mensagemId,
      conversa_id: conversa.id,
    };
  }

  async obterHistorico(conversaId, utilizadorId, query) {
    const { limite, offset } = query;

    const pertence = await conversaModel.pertenceAConversa(conversaId, utilizadorId);
    if (!pertence) {
      throw new Error('Sem permissao para aceder a esta conversa.');
    }

    await conversaModel.marcarComoLidas(conversaId, utilizadorId);
    return await conversaModel.listarMensagens(conversaId, limite, offset);
  }
}

module.exports = new ConversaService();
