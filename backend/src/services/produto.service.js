const produtoModel = require('../models/produto.model');
const vendedorModel = require('../models/vendedor.model');

class ProdutoService {
  async listarProdutos(filtros) {
    // O modelo agora já aceita vendedor_id dentro do objecto filtros
    return await produtoModel.listar(filtros);
  }

  async obterDetalhes(id) {
    const produto = await produtoModel.procurarPorId(id);
    if (!produto) {
      return null;
    }

    produtoModel.incrementarVisualizacao(id).catch((err) => {
      console.error('[ERRO] Falha ao incrementar visualizacao:', err.message);
    });

    return produto;
  }

  async criarProduto(utilizador, dados) {
    if (!['vendedor', 'admin'].includes(utilizador.tipo)) {
      throw new Error('Apenas vendedores ou administradores podem anunciar produtos.');
    }

    const vendedor = utilizador.tipo === 'admin'
      ? (dados.vendedor_id ? await vendedorModel.procurarPorId(dados.vendedor_id) : null)
      : await vendedorModel.procurarPorUtilizadorId(utilizador.id);

    if (!vendedor) {
      throw new Error('Perfil de vendedor nao encontrado.');
    }

    const dadosProduto = {
      ...dados,
      vendedor_id: vendedor.id,
    };

    const produtoId = await produtoModel.criar(dadosProduto);
    return await produtoModel.procurarPorId(produtoId);
  }

  async actualizarProduto(id, utilizador, dados) {
    const produtoActual = await produtoModel.procurarPorId(id);
    if (!produtoActual) {
      throw new Error('Produto nao encontrado.');
    }

    const camposPermitidos = ['categoria_id', 'titulo', 'descricao', 'preco', 'preco_negociavel', 'stock', 'estado_produto', 'condicao', 'cidade', 'bairro'];
    const dadosActualizacao = {};
    for (const campo of camposPermitidos) {
      if (dados[campo] !== undefined) {
        dadosActualizacao[campo] = dados[campo];
      }
    }

    // Extrair imagens novas (marcadas com _novasImagens pelo controller)
    const novasImagens = dados._novasImagens || null;
    delete dadosActualizacao._novasImagens;

    if (utilizador.tipo !== 'admin') {
      const vendedor = await vendedorModel.procurarPorUtilizadorId(utilizador.id);
      if (!vendedor || produtoActual.vendedor_id !== vendedor.id) {
        throw new Error('Nao tem permissao para actualizar este produto.');
      }

      const resultado = await produtoModel.actualizar(id, vendedor.id, dadosActualizacao);
      if (!resultado) {
        throw new Error('Nao foi possivel actualizar o produto ou nao tem permissao.');
      }
    } else {
      await produtoModel.actualizarPorId(id, dadosActualizacao);
    }

    // Se houver imagens novas, substituir as existentes
    if (novasImagens && novasImagens.length > 0) {
      const db = require('../config/base-de-dados');
      await db.transaction(async (trx) => {
        // Remover imagens antigas
        await trx('imagens_produto').where({ produto_id: id }).del();
        // Inserir imagens novas
        const paraInserir = novasImagens.map((img, index) => ({
          produto_id: id,
          caminho: img.caminho,
          principal: index === 0 ? 1 : 0,
          ordem: index,
        }));
        await trx('imagens_produto').insert(paraInserir);
      });
    }

    return await produtoModel.procurarPorId(id);
  }

  async eliminarProduto(id, utilizador) {
    const produtoActual = await produtoModel.procurarPorId(id);
    if (!produtoActual) {
      throw new Error('Produto nao encontrado.');
    }

    if (utilizador.tipo !== 'admin') {
      const vendedor = await vendedorModel.procurarPorUtilizadorId(utilizador.id);
      if (!vendedor || produtoActual.vendedor_id !== vendedor.id) {
        throw new Error('Nao tem permissao para remover este produto.');
      }

      const resultado = await produtoModel.eliminar(id, vendedor.id);
      if (!resultado) {
        throw new Error('Nao foi possivel eliminar o produto ou nao tem permissao.');
      }
    } else {
      await produtoModel.eliminarPorId(id);
    }

    return true;
  }
}

module.exports = new ProdutoService();
