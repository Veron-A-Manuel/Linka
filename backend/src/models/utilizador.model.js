// ============================================================
// LINKA — Model de Utilizador
// Queries directas à base de dados para a tabela 'utilizadores'
// ============================================================

const db = require('../config/base-de-dados');

class UtilizadorModel {
  
  /**
   * Procura um utilizador por ID
   */
  async procurarPorId(id) {
    return await db('utilizadores').where({ id }).first();
  }

  /**
   * Procura um utilizador por email
   */
  async procurarPorEmail(email) {
    return await db('utilizadores').where({ email }).first();
  }

  /**
   * Procura um utilizador por telefone
   */
  async procurarPorTelefone(telefone) {
    return await db('utilizadores').where({ telefone }).first();
  }

  /**
   * Procura um utilizador por email ou telefone.
   */
  async procurarPorEmailOuTelefone(identificador) {
    return await db('utilizadores')
      .where('email', identificador)
      .orWhere('telefone', identificador)
      .first();
  }

  /**
   * Cria um novo utilizador
   */
  async criar(dados, executor = db) {
    const [id] = await executor('utilizadores').insert(dados);
    return id;
  }

  /**
   * Actualiza dados de um utilizador
   */
  async actualizar(id, dados) {
    return await db('utilizadores')
      .where({ id })
      .update({
        ...dados,
        actualizado_em: db.fn.now()
      });
  }

  /**
   * Lista todos os utilizadores (admin)
   */
  async listarTodos(filtros = {}) {
    const query = db('utilizadores').select('id', 'nome', 'email', 'telefone', 'tipo', 'estado', 'verificado', 'criado_em');

    if (filtros.tipo) {
      query.where('tipo', filtros.tipo);
    }
    if (filtros.estado) {
      query.where('estado', filtros.estado);
    }
    if (filtros.busca) {
      query.where(function () {
        this.where('nome', 'like', `%${filtros.busca}%`)
          .orWhere('email', 'like', `%${filtros.busca}%`)
          .orWhere('telefone', 'like', `%${filtros.busca}%`);
      });
    }

    return await query.orderBy('criado_em', 'desc');
  }

  /**
   * Obtém detalhes completos de um utilizador (admin)
   */
  async obterDetalhesAdmin(id) {
    const utilizador = await db('utilizadores')
      .select('id', 'nome', 'email', 'telefone', 'tipo', 'estado', 'avatar', 'cidade', 'bairro', 'verificado', 'pontos_reputacao', 'criado_em', 'actualizado_em', 'ultimo_acesso_em')
      .where({ id })
      .first();

    if (!utilizador) return null;

    // Se for vendedor, buscar dados da loja
    if (utilizador.tipo === 'vendedor') {
      const vendedor = await db('vendedores')
        .where({ utilizador_id: id })
        .first();
      if (vendedor) {
        utilizador.vendedor = vendedor;

        // Contagem de produtos
        const [produtosCount] = await db('produtos').where({ vendedor_id: vendedor.id }).count('id as total');
        utilizador.total_produtos = Number(produtosCount?.total || 0);

        // Contagem de vendas (pedidos efectuados)
        const [vendasCount] = await db('pedidos')
          .where({ vendedor_id: vendedor.id })
          .whereNotIn('estado', ['cancelado'])
          .count('id as total');
        utilizador.total_vendas = Number(vendasCount?.total || 0);

        // Receita total
        const [receita] = await db('pedidos')
          .where({ vendedor_id: vendedor.id })
          .whereIn('estado', ['entregue', 'confirmado', 'preparando', 'pronto', 'enviado'])
          .sum('total as soma');
        utilizador.receita_total = Number(receita?.soma || 0);
      }
    }

    // Se for cliente, contar pedidos
    if (utilizador.tipo === 'cliente') {
      const [pedidosCount] = await db('pedidos').where({ cliente_id: id }).count('id as total');
      utilizador.total_pedidos = Number(pedidosCount?.total || 0);

      const [gastoTotal] = await db('pedidos')
        .where({ cliente_id: id })
        .whereIn('estado', ['entregue', 'confirmado', 'preparando', 'pronto', 'enviado'])
        .sum('total as soma');
      utilizador.gasto_total = Number(gastoTotal?.soma || 0);
    }

    // Sanções activas
    const [sancoesActivas] = await db('sancoes')
      .where({ utilizador_id: id, activa: 1 })
      .count('id as total');
    utilizador.sancoes_activas = Number(sancoesActivas?.total || 0);

    // Denúncias recebidas
    const [denunciasRecebidas] = await db('denuncias')
      .where({ denunciado_id: id })
      .count('id as total');
    utilizador.denuncias_recebidas = Number(denunciasRecebidas?.total || 0);

    return utilizador;
  }

  /**
   * Altera o estado de um utilizador (admin)
   */
  async alterarEstado(id, novoEstado) {
    return await db('utilizadores')
      .where({ id })
      .update({ estado: novoEstado, actualizado_em: db.fn.now() });
  }

  /**
   * Verifica se já existe email ou telefone
   */
  async verificarExistencia(email, telefone) {
    const query = db('utilizadores');

    if (email && telefone) {
      query.where(function () {
        this.where('email', email).orWhere('telefone', telefone);
      });
    } else if (email) {
      query.where('email', email);
    } else if (telefone) {
      query.where('telefone', telefone);
    } else {
      return null;
    }

    return await query.first();
  }
}

module.exports = new UtilizadorModel();
