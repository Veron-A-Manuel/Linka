// ============================================================
// LINKA — Model de Conversa e Mensagens
// Queries para as tabelas 'conversas' e 'mensagens'
// ============================================================

const db = require('../config/base-de-dados');

class ConversaModel {
  
  /**
   * Lista todas as conversas de um utilizador
   */
  async listarPorUtilizador(utilizadorId) {
    return await db('conversas as c')
      .select(
        'c.*', 
        'u.nome as outro_nome', 
        'u.avatar as outro_avatar',
        'p.titulo as produto_titulo',
        'p.preco as produto_preco',
        db.raw('(SELECT conteudo FROM mensagens WHERE conversa_id = c.id ORDER BY criado_em DESC LIMIT 1) as ultima_mensagem'),
        db.raw('(SELECT COUNT(*) FROM mensagens WHERE conversa_id = c.id AND lida = 0 AND remetente_id != ?) as nao_lidas', [utilizadorId])
      )
      .leftJoin('utilizadores as u', function() {
        this.on(db.raw('CASE WHEN c.utilizador1_id = ? THEN c.utilizador2_id ELSE c.utilizador1_id END = u.id', [utilizadorId]));
      })
      .leftJoin('produtos as p', 'c.produto_id', 'p.id')
      .where('c.utilizador1_id', utilizadorId)
      .orWhere('c.utilizador2_id', utilizadorId)
      .orderBy('c.ultima_mensagem_em', 'desc');
  }

  /**
   * Procura ou cria uma conversa entre dois utilizadores sobre um produto
   */
  async obterOuCriar(utilizador1_id, utilizador2_id, produto_id = null) {
    // 1. Tentar encontrar conversa existente
    let conversa = await db('conversas')
      .where(function() {
        this.where({ utilizador1_id, utilizador2_id })
            .orWhere({ utilizador1_id: utilizador2_id, utilizador2_id: utilizador1_id });
      })
      .andWhere('produto_id', produto_id)
      .first();

    // 2. Se não existir, criar
    if (!conversa) {
      const [id] = await db('conversas').insert({
        utilizador1_id,
        utilizador2_id,
        produto_id,
        ultima_mensagem_em: db.fn.now()
      });
      conversa = { id, utilizador1_id, utilizador2_id, produto_id };
    }

    return conversa;
  }

  /**
   * Lista mensagens de uma conversa
   */
  async listarMensagens(conversaId, limite = 50, offset = 0) {
    return await db('mensagens')
      .where('conversa_id', conversaId)
      .orderBy('criado_em', 'desc')
      .limit(limite)
      .offset(offset);
  }

  /**
   * Adiciona uma nova mensagem
   */
  async adicionarMensagem(dados) {
    return await db.transaction(async trx => {
      // 1. Inserir mensagem
      const [id] = await trx('mensagens').insert(dados);

      // 2. Actualizar timestamp da conversa
      await trx('conversas')
        .where('id', dados.conversa_id)
        .update({ ultima_mensagem_em: db.fn.now() });

      return id;
    });
  }

  /**
   * Marca mensagens como lidas
   */
  async marcarComoLidas(conversaId, utilizadorId) {
    return await db('mensagens')
      .where({ conversa_id: conversaId, lida: 0 })
      .andWhereNot('remetente_id', utilizadorId)
      .update({ lida: 1 });
  }

  /**
   * Verifica se o utilizador pertence à conversa
   */
  async pertenceAConversa(conversaId, utilizadorId) {
    const conversa = await db('conversas')
      .where('id', conversaId)
      .andWhere(function() {
        this.where('utilizador1_id', utilizadorId).orWhere('utilizador2_id', utilizadorId);
      })
      .first();
    return !!conversa;
  }
}

module.exports = new ConversaModel();
