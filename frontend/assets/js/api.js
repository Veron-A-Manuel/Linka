// ============================================================
// LINKA — Serviço de Comunicação com a API
// ============================================================

const API_HOST = window.location.hostname === '127.0.0.1' ? '127.0.0.1' : (window.location.hostname || 'localhost');
const API_BASE_URL = `http://${API_HOST}:3005/api`;
const limparTokenLocal = () => localStorage.removeItem('linka_token');

let estaARefrescar = false;
let filaDePedidos = [];

// Expor variáveis globais para o app.js
window.API_HOST = API_HOST;
window.API_BASE_URL = API_BASE_URL;

console.log(`[LINKA API] Ligado a: ${API_BASE_URL}`);

const api = {
    /**
     * Realiza um pedido à API com tratamento de erros integrado
     */
    async pedido(endpoint, metodo = 'GET', dados = null) {
        const config = {
            method: metodo,
            headers: {},
            credentials: 'include' // Mantido caso haja cookies residuais ou sessões de backend
        };

        // Adicionar o Token via Cabeçalho (Evita bloqueios SameSite de cookies)
        const token = localStorage.getItem('linka_token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        // Se for FormData (Uploads), o browser define o Content-Type e Boundary automaticamente
        if (dados instanceof FormData) {
            config.body = dados;
        } else if (dados) {
            config.headers['Content-Type'] = 'application/json';
            config.body = JSON.stringify(dados);
        }

        try {
            const resposta = await fetch(`${API_BASE_URL}${endpoint}`, config);
            const resultado = await resposta.json();

            if (!resposta.ok) {
                // Se 401 e não é endpoint de auth, tentar refresh token
                if (resposta.status === 401 && !endpoint.startsWith('/auth/')) {
                    if (estaARefrescar) {
                        // Aguardar refresh em curso
                        return new Promise((resolve, reject) => {
                            filaDePedidos.push({ resolve, reject, endpoint, metodo, dados });
                        });
                    }

                    estaARefrescar = true;
                    try {
                        const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
                            method: 'POST',
                            credentials: 'include'
                        });

                        if (refreshRes.ok) {
                            const refreshData = await refreshRes.json();
                            if (refreshData.dados && refreshData.dados.accessToken) {
                                localStorage.setItem('linka_token', refreshData.dados.accessToken);
                                // Repetir pedido original
                                config.headers['Authorization'] = `Bearer ${refreshData.dados.accessToken}`;
                                const novaResposta = await fetch(`${API_BASE_URL}${endpoint}`, config);
                                const novoResultado = await novaResposta.json();
                                if (!novaResposta.ok) {
                                    const erro = new Error(novoResultado.erro || 'Ocorreu um erro inesperado.');
                                    erro.status = novaResposta.status;
                                    throw erro;
                                }
                                return novoResultado;
                            }
                        }
                        // Refresh falhou
                        limparTokenLocal();
                        const erro = new Error('Sessão expirada. Faça login novamente.');
                        erro.status = 401;
                        throw erro;
                    } catch (refreshErro) {
                        limparTokenLocal();
                        const erro = new Error('Sessão expirada. Faça login novamente.');
                        erro.status = 401;
                        throw erro;
                    } finally {
                        estaARefrescar = false;
                        // Processar fila
                        for (const item of filaDePedidos) {
                            try {
                                const res = await api.pedido(item.endpoint, item.metodo, item.dados);
                                item.resolve(res);
                            } catch (e) {
                                item.reject(e);
                            }
                        }
                        filaDePedidos = [];
                    }
                }

                // Criar um objeto de erro que contenha o status HTTP
                const erro = new Error(resultado.erro || 'Ocorreu um erro inesperado.');
                erro.status = resposta.status;
                if (erro.status === 401) {
                    limparTokenLocal();
                }
                throw erro;
            }

            return resultado;
        } catch (erro) {
            const ehAbort = erro instanceof DOMException && erro.name === 'AbortError';
            // Erros de abort (Firefox cancela fetch ao navegar) não são erros reais
            if (ehAbort) {
                const abortErro = new Error('Pedido cancelado');
                abortErro._abortado = true;
                throw abortErro;
            }
            // Não logar erro 401 para o perfil (é um comportamento esperado quando não logado)
            if (erro.status === 401 && endpoint === '/utilizadores/perfil') {
                // Silencioso
            } else {
                console.error(`[API ERROR] ${endpoint}:`, erro.message);
            }
            throw erro;
        }
    },

    async get(endpoint) {
        return await api.pedido(endpoint, 'GET');
    },

    async post(endpoint, dados = null) {
        return await api.pedido(endpoint, 'POST', dados);
    },

    async put(endpoint, dados = null) {
        return await api.pedido(endpoint, 'PUT', dados);
    },

    async delete(endpoint) {
        return await api.pedido(endpoint, 'DELETE');
    },

    // --- Módulo de Autenticação ---
    auth: {
        async login(credenciais) {
            return await api.pedido('/auth/login', 'POST', credenciais);
        },
        async registar(dados) {
            return await api.pedido('/auth/registar', 'POST', dados);
        },
        async logout() {
            return await api.pedido('/auth/logout', 'POST');
        },
        async refresh() {
            return await api.pedido('/auth/refresh', 'POST');
        }
    },

    // --- Módulo de Categorias ---
    categorias: {
        async listar() {
            return await api.pedido('/categorias');
        },
        async obterPorSlug(slug) {
            return await api.pedido(`/categorias/${slug}`);
        }
    },

    // --- Módulo de Exploração ---
    explore: {
        async listar(filtros = {}) {
            const params = new URLSearchParams();
            Object.entries(filtros).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') params.set(k, v); });
            const qs = params.toString();
            return await api.pedido(`/explore${qs ? '?' + qs : ''}`);
        },
        async trending(limite = 20) {
            return await api.pedido(`/explore/trending?limite=${limite}`);
        },
        async categorias() {
            return await api.pedido('/explore/categorias');
        },
        async buscar(termo, limite = 8) {
            return await api.pedido(`/explore/busca?termo=${encodeURIComponent(termo)}&limite=${limite}`);
        },
        async porCategoria(categoriaId, limite = 10) {
            return await api.pedido(`/explore/categoria/${categoriaId}?limite=${limite}`);
        }
    },

    // --- Módulo de Produtos ---
    produtos: {
        async listar(params = '') {
            return await api.pedido(`/produtos${params}`);
        },
        async feed(pagina = 1, limite = 20) {
            return await api.pedido(`/produtos/feed?pagina=${pagina}&limite=${limite}`);
        },
        async feedCursor(cursor = null, limite = 20, modo = 'algoritmico', extras = {}) {
            const params = new URLSearchParams({ limite, modo });
            if (cursor) params.set('cursor', cursor);
            if (extras.categoria_id) params.set('categoria_id', extras.categoria_id);
            if (extras.busca) params.set('busca', extras.busca);
            return await api.pedido(`/produtos/feed?${params.toString()}`);
        },
        async feedLatest(ultimoId, limite = 20) {
            return await api.pedido(`/produtos/feed/latest?ultimo_id=${ultimoId}&limite=${limite}`);
        },
        async obter(id) {
            return await api.pedido(`/produtos/${id}`);
        },
        async obterPorId(id) {
            return await api.produtos.obter(id);
        },
        async criar(formData) {
            return await api.pedido('/produtos', 'POST', formData);
        },
        async actualizar(id, dados) {
            return await api.pedido(`/produtos/${id}`, 'PUT', dados);
        },
        async eliminar(id) {
            return await api.pedido(`/produtos/${id}`, 'DELETE');
        },
        async registrarVisualizacao(id, sessionId = null) {
            const headers = {};
            if (sessionId) headers['X-Session-Id'] = sessionId;
            return await api.pedido(`/produtos/${id}/visualizar`, 'POST');
        },
        async toggleLike(id) {
            return await api.pedido(`/produtos/${id}/like`, 'POST');
        },
        async verificarLike(id) {
            return await api.pedido(`/produtos/${id}/like`);
        },
        async comentarios(id, cursor = null, limite = 20) {
            const params = new URLSearchParams({ limite });
            if (cursor) params.set('cursor', cursor);
            return await api.pedido(`/produtos/${id}/comentarios?${params.toString()}`);
        }
    },

    // --- Módulo de Utilizadores ---
    pedidos: {
        async criar(dados) {
            return await api.pedido('/pedidos', 'POST', dados);
        },
        async listar() {
            return await api.pedido('/pedidos');
        },
        async obter(id) {
            return await api.pedido(`/pedidos/${id}`);
        },
        async atualizarEstado(id, estado) {
            return await api.pedido(`/pedidos/${id}/estado`, 'PUT', { estado });
        },
        async cancelar(id, motivo = '') {
            return await api.pedido(`/pedidos/${id}/cancelar`, 'POST', { motivo });
        }
    },

    favoritos: {
        async listar() {
            return await api.pedido('/favoritos');
        },
        async adicionar(produtoId) {
            return await api.pedido(`/favoritos/${produtoId}`, 'POST');
        },
        async remover(produtoId) {
            return await api.pedido(`/favoritos/${produtoId}`, 'DELETE');
        },
        async verificar(produtoIds) {
            return await api.pedido('/favoritos/verificar', 'POST', { produto_ids: produtoIds });
        }
    },

    utilizadores: {
        async perfil() {
            return await api.pedido('/utilizadores/perfil');
        },
        async atualizar(dados) {
            return await api.pedido('/utilizadores/perfil', 'PUT', dados);
        }
    },

    // --- Módulo de Planos ---
    planos: {
        async listar() {
            return await api.pedido('/planos');
        }
    },

    // --- Módulo de Estatísticas ---
    estatisticas: {
        async vendedor() {
            return await api.pedido('/estatisticas/vendedor');
        },
        async plataforma() {
            return await api.pedido('/estatisticas/plataforma');
        }
    },

    // --- Módulo de Conversas (Chat) ---
    conversas: {
        async listar() {
            return await api.pedido('/conversas');
        },
        async enviar(dados) {
            return await api.pedido('/conversas/enviar', 'POST', dados);
        },
        async obterMensagens(id, params = '') {
            return await api.pedido(`/conversas/${id}/mensagens${params}`);
        }
    },

    // --- Módulo de Avaliações ---
    avaliacoes: {
        async criar(dados) {
            return await api.pedido('/avaliacoes', 'POST', dados);
        },
        async listarPorProduto(produtoId) {
            return await api.pedido(`/avaliacoes/produto/${produtoId}`);
        },
        async listarPorUtilizador(utilizadorId, tipo = '') {
            const params = tipo ? `?tipo=${tipo}` : '';
            return await api.pedido(`/avaliacoes/utilizador/${utilizadorId}${params}`);
        },
        async obterMedia(utilizadorId, tipo = 'vendedor') {
            return await api.pedido(`/avaliacoes/utilizador/${utilizadorId}/media?tipo=${tipo}`);
        },
        async eliminar(id) {
            return await api.pedido(`/avaliacoes/${id}`, 'DELETE');
        }
    },

    // --- Módulo de Denúncias ---
    denuncias: {
        async criar(dados) {
            return await api.pedido('/denuncias', 'POST', dados);
        },
        async listarMinhas() {
            return await api.pedido('/denuncias/minhas');
        },
        async obter(id) {
            return await api.pedido(`/denuncias/${id}`);
        },
        async listar(estado = '') {
            const params = estado ? `?estado=${estado}` : '';
            return await api.pedido(`/denuncias${params}`);
        },
        async contarPendentes() {
            return await api.pedido('/denuncias/admin/pendentes');
        },
        async resolver(id, estado, respostaAdmin = '') {
            return await api.pedido(`/denuncias/${id}/resolver`, 'PUT', { estado, resposta_admin: respostaAdmin });
        }
    },

    // --- Módulo Sessões (Dispositivos Conectados) ---
    sessoes: {
        async listar() {
            return await api.pedido('/sessoes');
        },
        async revogar(sessaoId) {
            return await api.pedido(`/sessoes/${sessaoId}`, 'DELETE');
        },
        async revogarTodas() {
            return await api.pedido('/sessoes', 'DELETE');
        }
    },

    // --- Módulo Admin ---
    admin: {
        async listarUtilizadores(filtros = {}) {
            const params = new URLSearchParams(filtros).toString();
            return await api.pedido(`/utilizadores/admin/todos${params ? '?' + params : ''}`);
        },
        async obterDetalhesUtilizador(id) {
            return await api.pedido(`/utilizadores/admin/${id}`);
        },
        async alterarEstadoUtilizador(id, estado) {
            return await api.pedido(`/utilizadores/admin/${id}/estado`, 'PUT', { estado });
        },
        async aprovarVendedor(id, aprovado) {
            return await api.pedido(`/utilizadores/admin/${id}/aprovar-vendedor`, 'PUT', { aprovado });
        },
        async listarVendedores(filtros = {}) {
            const params = new URLSearchParams(filtros).toString();
            return await api.pedido(`/utilizadores/admin/vendedores${params ? '?' + params : ''}`);
        },
        async estatisticasDetalhadas() {
            return await api.pedido('/utilizadores/admin/estatisticas-detalhadas');
        },
        async listarProdutosAdmin(filtros = {}) {
            const params = new URLSearchParams(filtros).toString();
            return await api.pedido(`/produtos/admin/todos${params ? '?' + params : ''}`);
        },
        async moderarProduto(id, aprovado) {
            return await api.pedido(`/produtos/${id}/aprovado`, 'PUT', { aprovado });
        }
    },

    // --- Módulo de Subscrições ---
    subscricoes: {
        async planos() {
            return await api.pedido('/subscricoes/planos');
        },
        async minha() {
            return await api.pedido('/subscricoes/minha');
        },
        async contratar(dados) {
            return await api.pedido('/subscricoes/contratar', 'POST', dados);
        }
    },

    // --- Módulo de Sanções ---
    sancoes: {
        async criar(dados) {
            return await api.pedido('/sancoes', 'POST', dados);
        },
        async listarTodas() {
            return await api.pedido('/sancoes');
        },
        async obter(id) {
            return await api.pedido(`/sancoes/${id}`);
        },
        async listarPorUtilizador(utilizadorId) {
            return await api.pedido(`/sancoes/activas/${utilizadorId}`);
        },
        async desactivar(id) {
            return await api.pedido(`/sancoes/${id}/desactivar`, 'PUT');
        },
        async minhas() {
            return await api.pedido('/sancoes/minhas');
        }
    },

    // --- Módulo de Eventos (Comportamento do Utilizador) ---
    eventos: {
        async registar(dados) {
            return await api.pedido('/eventos', 'POST', dados);
        },
        async registarLote(eventos) {
            return await api.pedido('/eventos/lote', 'POST', { eventos });
        },
        async interesses() {
            return await api.pedido('/eventos/interesses');
        },
        async analytics() {
            return await api.pedido('/eventos/analytics');
        },
        async historico(limite = 50, offset = 0, tipo = '') {
            const params = new URLSearchParams({ limite, offset });
            if (tipo) params.set('tipo', tipo);
            return await api.pedido(`/eventos/historico?${params.toString()}`);
        }
    },

    // --- Módulo de Confiança ---
    confianca: {
        async perfil() {
            return await api.pedido('/confianca/perfil');
        },
        async vendedor(id) {
            return await api.pedido(`/confianca/utilizador/${id}`);
        },
        async top(limite = 10) {
            return await api.pedido(`/confianca/top?limite=${limite}`);
        },
        async recalcular() {
            return await api.pedido('/confianca/recalcular', 'POST');
        }
    },

    // --- Módulo de Ranking ---
    ranking: {
        async listar(periodo = '', limite = 50) {
            const params = new URLSearchParams({ limite });
            if (periodo) params.set('periodo', periodo);
            return await api.pedido(`/ranking/vendedores?${params.toString()}`);
        },
        async periodos() {
            return await api.pedido('/ranking/periodos');
        },
        async posicao() {
            return await api.pedido('/ranking/posicao');
        },
        async evolucao() {
            return await api.pedido('/ranking/evolucao');
        },
        async vendedor(id) {
            return await api.pedido(`/ranking/vendedor/${id}`);
        },
        async perfilVendedor(id) {
            return await api.pedido(`/ranking/vendedor/${id}/perfil`);
        },
        async recalcular() {
            return await api.pedido('/ranking/recalcular', 'POST');
        }
    },

    // --- Módulo de Analytics do Vendedor ---
    analytics: {
        async metricasVendedor(dias = 30) {
            return await api.pedido(`/analytics/vendedor?dias=${dias}`);
        },
        async evolucaoDiaria(dias = 30) {
            return await api.pedido(`/analytics/vendedor/evolucao?dias=${dias}`);
        },
        async topProdutos(dias = 30, limite = 10) {
            return await api.pedido(`/analytics/vendedor/top?dias=${dias}&limite=${limite}`);
        },
        async metricasProduto(produtoId, dias = 30) {
            return await api.pedido(`/analytics/produto/${produtoId}?dias=${dias}`);
        },
        async compararPeriodos(produtoId, diasActual = 7, diasAnterior = 7) {
            return await api.pedido(`/analytics/produto/${produtoId}/comparar?dias_actual=${diasActual}&dias_anterior=${diasAnterior}`);
        }
    },

    // --- Módulo de Anti-Spam ---
    antiSpam: {
        async estatisticas() {
            return await api.pedido('/spam/estatisticas');
        },
        async historico(utilizadorId, limite = 50) {
            return await api.pedido(`/spam/historico/${utilizadorId}?limite=${limite}`);
        },
        async limpar(dias = 90) {
            return await api.pedido(`/spam/limpar?dias=${dias}`, 'POST');
        }
    },

    // --- Módulo de Anúncios Patrocinados ---
    anuncios: {
        async criar(dados) {
            return await api.pedido('/anuncios', 'POST', dados);
        },
        async listar(estado = '') {
            const params = estado ? `?estado=${estado}` : '';
            return await api.pedido(`/anuncios${params}`);
        },
        async estatisticas() {
            return await api.pedido('/anuncios/estatisticas');
        },
        async obter(id) {
            return await api.pedido(`/anuncios/${id}`);
        },
        async estatisticasAnuncio(id, dias = 30) {
            return await api.pedido(`/anuncios/${id}/stats?dias=${dias}`);
        },
        async actualizar(id, dados) {
            return await api.pedido(`/anuncios/${id}`, 'PUT', dados);
        },
        async pausar(id) {
            return await api.pedido(`/anuncios/${id}/pausar`, 'POST');
        },
        async retomar(id) {
            return await api.pedido(`/anuncios/${id}/retomar`, 'POST');
        },
        async eliminar(id) {
            return await api.pedido(`/anuncios/${id}`, 'DELETE');
        },
        async trackImpressao(anuncioId) {
            return await api.pedido('/anuncios/track/impressao', 'POST', { anuncio_id: anuncioId });
        },
        async trackClique(anuncioId) {
            return await api.pedido('/anuncios/track/clique', 'POST', { anuncio_id: anuncioId });
        }
    },

    // --- Módulo de Tendências ---
    tendencias: {
        async listar(periodo = '24h', tipo = '', limite = 20) {
            const params = new URLSearchParams({ periodo, limite });
            if (tipo) params.set('tipo', tipo);
            return await api.pedido(`/tendencias?${params.toString()}`);
        },
        async obter(id) {
            return await api.pedido(`/tendencias/${id}`);
        },
        async eliminar(id) {
            return await api.pedido(`/tendencias/${id}`, 'DELETE');
        },
        async conteudoAlta(periodo = '24h', metrica = '', limite = 20) {
            const params = new URLSearchParams({ periodo, limite });
            if (metrica) params.set('metrica', metrica);
            return await api.pedido(`/tendencias/alta/conteudo?${params.toString()}`);
        },
        async eliminarAlta(id) {
            return await api.pedido(`/tendencias/alta/${id}`, 'DELETE');
        },
        async palavras(horas = 24, limite = 20) {
            return await api.pedido(`/tendencias/palavras?horas=${horas}&limite=${limite}`);
        },
        async processar() {
            return await api.pedido('/tendencias/processar', 'POST');
        },
        async processarProduto(produtoId, titulo, descricao = '') {
            return await api.pedido('/tendencias/processar-produto', 'POST', { produto_id: produtoId, titulo, descricao });
        }
    },

    // --- Módulo de Notificações ---
    notificacoes: {
        async listar(limite = 50, offset = 0, naoLidas = false) {
            const params = new URLSearchParams({ limite, offset });
            if (naoLidas) params.set('nao_lidas', '1');
            return await api.pedido(`/notificacoes?${params.toString()}`);
        },
        async naoLidas() {
            return await api.pedido('/notificacoes/nao-lidas');
        },
        async marcarLida(id) {
            return await api.pedido(`/notificacoes/${id}/lida`, 'PUT');
        },
        async marcarTodasLidas() {
            return await api.pedido('/notificacoes/todas-lidas', 'PUT');
        },
        async eliminar(id) {
            return await api.pedido(`/notificacoes/${id}`, 'DELETE');
        }
    },

    // --- Módulo de Seguidores (Seguir Vendedores) ---
    seguidores: {
        async toggle(vendedorId) {
            return await api.pedido(`/seguidores/${vendedorId}/toggle`, 'POST');
        },
        async verificar(vendedorId) {
            return await api.pedido(`/seguidores/${vendedorId}/verificar`);
        },
        async contarSeguidores(vendedorId) {
            return await api.pedido(`/seguidores/${vendedorId}/contar`);
        },
        async contarSeguindo() {
            return await api.pedido('/seguidores/seguindo/contar');
        },
        async listarSeguidores(vendedorId, limite = 50, offset = 0) {
            return await api.pedido(`/seguidores/${vendedorId}/lista?limite=${limite}&offset=${offset}`);
        },
        async listarSeguindo(limite = 50, offset = 0) {
            return await api.pedido(`/seguidores/seguindo?limite=${limite}&offset=${offset}`);
        }
    },

    // --- Módulo de Likes em Comentários ---
    comentarioLikes: {
        async toggle(comentarioId) {
            return await api.pedido(`/comentario-likes/${comentarioId}/toggle`, 'POST');
        },
        async verificar(comentarioId) {
            return await api.pedido(`/comentario-likes/${comentarioId}/verificar`);
        },
        async contar(comentarioId) {
            return await api.pedido(`/comentario-likes/${comentarioId}/contar`);
        }
    },

    // --- Módulo de Respostas a Comentários ---
    comentarioRespostas: {
        async criar(comentarioId, texto) {
            return await api.pedido(`/comentario-respostas/${comentarioId}`, 'POST', { texto });
        },
        async listar(comentarioId, limite = 50, offset = 0) {
            return await api.pedido(`/comentario-respostas/${comentarioId}/listar?limite=${limite}&offset=${offset}`);
        },
        async eliminar(id) {
            return await api.pedido(`/comentario-respostas/${id}`, 'DELETE');
        }
    },

    // --- Módulo de Produtos Vistos Recentemente ---
    recentementeVistos: {
        async registar(produtoId) {
            return await api.pedido(`/recentemente-vistos/${produtoId}`, 'POST');
        },
        async listar(limite = 20, offset = 0) {
            return await api.pedido(`/recentemente-vistos?limite=${limite}&offset=${offset}`);
        },
        async eliminar(produtoId) {
            return await api.pedido(`/recentemente-vistos/${produtoId}`, 'DELETE');
        },
        async limpar() {
            return await api.pedido('/recentemente-vistos', 'DELETE');
        }
    },

    // --- Módulo de Carrinho de Compras ---
    carrinho: {
        async adicionar(produtoId, quantidade = 1) {
            return await api.pedido('/carrinho', 'POST', { produto_id: produtoId, quantidade });
        },
        async listar() {
            return await api.pedido('/carrinho');
        },
        async resumo() {
            return await api.pedido('/carrinho/resumo');
        },
        async actualizarQuantidade(produtoId, quantidade) {
            return await api.pedido(`/carrinho/${produtoId}/quantidade`, 'PUT', { quantidade });
        },
        async remover(produtoId) {
            return await api.pedido(`/carrinho/${produtoId}`, 'DELETE');
        },
        async removerItem(itemId) {
            return await api.pedido(`/carrinho/item/${itemId}`, 'DELETE');
        },
        async limpar() {
            return await api.pedido('/carrinho', 'DELETE');
        }
    },

    // --- Módulo de Preferências do Utilizador ---
    preferencias: {
        async obter() {
            return await api.pedido('/preferencias');
        },
        async actualizar(dados) {
            return await api.pedido('/preferencias', 'PUT', dados);
        }
    },

    entregas: {
        async criar(pedidoId, dados) {
            return await api.pedido(`/entregas/${pedidoId}`, 'POST', dados);
        },
        async listar(filtros = {}) {
            const params = new URLSearchParams(filtros).toString();
            return await api.pedido(`/entregas?${params}`);
        },
        async disponiveis(filtros = {}) {
            const params = new URLSearchParams(filtros).toString();
            return await api.pedido(`/entregas/disponiveis?${params}`);
        },
        async obter(id) {
            return await api.pedido(`/entregas/${id}`);
        },
        async aceitar(id) {
            return await api.pedido(`/entregas/${id}/aceitar`, 'PUT');
        },
        async rejeitar(id) {
            return await api.pedido(`/entregas/${id}/rejeitar`, 'PUT');
        },
        async marcarACaminho(id) {
            return await api.pedido(`/entregas/${id}/a-caminho`, 'PUT');
        },
        async marcarEntregue(id) {
            return await api.pedido(`/entregas/${id}/entregue`, 'PUT');
        },
        async marcarFalhou(id) {
            return await api.pedido(`/entregas/${id}/falhou`, 'PUT');
        },
        async cancelar(id) {
            return await api.pedido(`/entregas/${id}/cancelar`, 'PUT');
        },
        async actualizarLocalizacao(id, latitude, longitude) {
            return await api.pedido(`/entregas/${id}/localizacao`, 'PUT', { latitude, longitude });
        }
    }
};

window.api = api; // Tornar global para acesso nos outros scripts
