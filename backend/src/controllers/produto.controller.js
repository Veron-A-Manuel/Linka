const produtoService = require('../services/produto.service');
const produtoModel = require('../models/produto.model');
const UtilizadorInteresseModel = require('../models/utilizador-interesse.model');
const tendenciaService = require('../services/tendencia.service');
const resposta = require('../utils/resposta');
const { asyncHandler } = require('../middlewares/erro.middleware');
const { emitirParaUtilizador } = require('../config/realtime');
const feedConfig = require('../config/feed');

class ProdutoController {
  listar = asyncHandler(async (req, res) => {
    const filtros = { ...req.query };

    if (filtros.categoria && !filtros.categoria_id) {
      filtros.categoria_id = filtros.categoria;
    }

    if (filtros.pesquisa && !filtros.busca) {
      filtros.busca = filtros.pesquisa;
    }
    
    // Se o utilizador quiser ver apenas os seus anúncios
    if (filtros.meus === 'true' && req.utilizador) {
      const vendedorModel = require('../models/vendedor.model');
      const vendedor = await vendedorModel.procurarPorUtilizadorId(req.utilizador.id);
      if (vendedor) {
        filtros.vendedor_id = vendedor.id;
        // Quando o vendedor vê os seus próprios anúncios, mostramos todos (mesmo não aprovados)
        filtros.incluir_nao_aprovados = true; 
      }
    }

    const produtos = await produtoService.listarProdutos(filtros);
    return resposta.sucesso(res, produtos);
  });

  obter = asyncHandler(async (req, res) => {
    const produto = await produtoService.obterDetalhes(req.params.id);
    if (!produto) return resposta.naoEncontrado(res, 'Produto nao encontrado.');
    return resposta.sucesso(res, produto);
  });

  obterPorId = this.obter;

  criar = asyncHandler(async (req, res) => {
    const dados = { ...req.body };

    // Processar imagens e vídeos enviadas
    if (req.files && req.files.length > 0) {
      const imagens = [];
      let videoUrl = null;

      for (const file of req.files) {
        if (file.mimetype.startsWith('video/')) {
          videoUrl = `/uploads/produtos/${file.filename}`;
        } else {
          imagens.push({ caminho: `/uploads/produtos/${file.filename}` });
        }
      }

      dados.imagens = imagens;
      if (videoUrl) dados.video_url = videoUrl;
    }

    const produto = await produtoService.criarProduto(req.utilizador, dados);

    // Fire-and-forget: extrair palavras-chave para tendências
    if (produto && produto.id) {
      tendenciaService.extrairPalavrasProduto(produto.id, dados.titulo || '', dados.descricao || '').catch(() => {});
    }

    return resposta.criado(res, produto, 'Produto anunciado com sucesso.');
  });

  /**
   * GET /api/produtos/feed
   * Feed com paginação por cursor e algoritmo de relevância
   * Query params: cursor, limite, modo (algoritmico|recente|personalizado), categoria_id, busca
   */
  feed = asyncHandler(async (req, res) => {
    const { cursor, limite, modo, categoria_id, busca } = req.query;

    let interessesIds = [];

    // Se modo é personalizado e utilizador está autenticado, buscar interesses
    if (modo === 'personalizado' && req.utilizador) {
      interessesIds = await UtilizadorInteresseModel.obterCategoriasIds(req.utilizador.id, 5);
    }

    const resultado = await produtoModel.feedComCursor({
      cursor,
      limite,
      modo: modo || (req.utilizador && interessesIds.length > 0 ? 'personalizado' : 'algoritmico'),
      categoria_id,
      busca,
      interessesIds,
    });
    return resposta.sucesso(res, resultado);
  });

  /**
   * GET /api/produtos/feed/latest
   * Produtos mais recentes desde um cursor (para pull-to-refresh)
   * Query params: ultimo_id, limite
   */
  feedLatest = asyncHandler(async (req, res) => {
    const { ultimo_id, limite } = req.query;
    if (!ultimo_id) {
      return resposta.erro(res, 'Parâmetro "ultimo_id" é obrigatório.', 400);
    }
    const produtos = await produtoModel.feedLatest(ultimo_id, limite);
    return resposta.sucesso(res, { newPosts: produtos });
  });

  /**
   * POST /api/produtos/:id/visualizar
   * Registar visualização de um produto
   */
  registrarVisualizacao = asyncHandler(async (req, res) => {
    const produtoId = req.params.id;
    const utilizadorId = req.utilizador ? req.utilizador.id : null;
    const sessionId = req.headers['x-session-id'] || null;

    const registou = await produtoModel.registrarVisualizacao(produtoId, utilizadorId, sessionId);
    return resposta.sucesso(res, { registou }, registou ? 'Visualização registada.' : 'Já visualizou hoje.');
  });

  /**
   * POST /api/produtos/:id/like
   * Toggle like num produto (optimistic update)
   */
  toggleLike = asyncHandler(async (req, res) => {
    if (!req.utilizador) {
      return resposta.naoAutorizado(res, 'Inicie sessão para curtir.');
    }
    const produtoId = req.params.id;
    const utilizadorId = req.utilizador.id;

    const resultado = await produtoModel.registarLike(produtoId, utilizadorId);
    return resposta.sucesso(res, resultado);
  });

  /**
   * GET /api/produtos/:id/like
   * Verificar se utilizador curtiu um produto
   */
  verificarLike = asyncHandler(async (req, res) => {
    if (!req.utilizador) {
      return resposta.sucesso(res, { liked: false });
    }
    const liked = await produtoModel.verificarLike(req.params.id, req.utilizador.id);
    return resposta.sucesso(res, { liked });
  });

  /**
   * GET /api/produtos/:id/comentarios
   * Comentários de um produto (lazy load com cursor)
   */
  comentarios = asyncHandler(async (req, res) => {
    const { cursor, limite } = req.query;
    const resultado = await produtoModel.obterComentarios(req.params.id, { cursor, limite });
    return resposta.sucesso(res, resultado);
  });

  actualizar = asyncHandler(async (req, res) => {
    const dados = { ...req.body };

    // Processar imagens novas enviadas (se houver)
    if (req.files && req.files.length > 0) {
      const imagens = [];
      for (const file of req.files) {
        if (file.mimetype.startsWith('image/')) {
          imagens.push({ caminho: `/uploads/produtos/${file.filename}` });
        }
      }
      if (imagens.length > 0) dados._novasImagens = imagens;
    }

    await produtoService.actualizarProduto(req.params.id, req.utilizador, dados);
    return resposta.sucesso(res, null, 'Produto actualizado com sucesso.');
  });

  remover = asyncHandler(async (req, res) => {
    await produtoService.eliminarProduto(req.params.id, req.utilizador);
    return resposta.sucesso(res, null, 'Produto removido com sucesso.');
  });

  eliminar = this.remover;

  // --- Rotas Admin ---

  /**
   * GET /api/produtos/admin/todos
   * Lista todos os produtos para moderação (admin)
   */
  listarAdmin = asyncHandler(async (req, res) => {
    const { aprovado, busca } = req.query;
    const filtros = {};
    if (aprovado !== undefined && aprovado !== '') {
      filtros.aprovado = parseInt(aprovado);
    }
    if (busca) filtros.busca = busca;
    const produtos = await produtoModel.listarAdmin(filtros);
    return resposta.sucesso(res, produtos);
  });

  /**
   * PUT /api/produtos/:id/aprovado
   * Aprova ou rejeita um produto (admin)
   */
  moderar = asyncHandler(async (req, res) => {
    const { aprovado } = req.body;
    if (aprovado === undefined) {
      return resposta.erro(res, 'Campo "aprovado" é obrigatório (true/false).', 400);
    }

    const produto = await produtoModel.procurarPorId(req.params.id);
    if (!produto) return resposta.naoEncontrado(res, 'Produto não encontrado.');

    await produtoModel.actualizarPorId(req.params.id, { aprovado: aprovado ? 1 : 0 });

    // Notificar o vendedor
    if (produto.vendedor_utilizador_id) {
      const titulo = aprovado ? 'Produto aprovado' : 'Produto rejeitado';
      const corpo = aprovado
        ? `O seu anúncio "${produto.titulo}" foi aprovado e está visível na plataforma.`
        : `O seu anúncio "${produto.titulo}" não foi aprovado. Verifique as diretrizes da plataforma.`;

      emitirParaUtilizador(produto.vendedor_utilizador_id, 'notificacao:nova', {
        tipo: 'produto',
        titulo,
        corpo,
        produto_id: produto.id,
      });
    }

    return resposta.sucesso(res, null, aprovado ? 'Produto aprovado.' : 'Produto rejeitado.');
  });
}

module.exports = new ProdutoController();
