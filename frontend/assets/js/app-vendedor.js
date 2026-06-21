/* ============================================================
   LINKA — Vendedor App (Padrão linka2)
   SPA com carregarConteudoDashboard() + drawer + bottom nav
   ============================================================ */

(function () {
    'use strict';

    const get = (id) => document.getElementById(id);

    // ── Estado Global ──
    let utilizadorLogado = null;
    let socket = null;
    let conversaAtiva = null;
    let conversasCarregadas = [];
    let statusEscrevendoTimeout = null;
    let isTyping = false;

    const apiOrigin = window.linkaUtils.apiOrigin;
    const imagemProdutoPadrao = window.linkaUtils.imagemProdutoPadrao;
    const escaparHtml = window.linkaUtils.escaparHtml;
    const formatarMoeda = window.linkaUtils.formatarMoeda;
    const formatarDinheiro = window.linkaUtils.formatarDinheiro;
    const formatarData = window.linkaUtils.formatarData;
    const formatarHora = window.linkaUtils.formatarHora;
    const resolverUrlImagem = window.linkaUtils.resolverUrlImagem;
    const cssUrlImagem = window.linkaUtils.cssUrlImagem;
    const desativarBotao = window.linkaUtils.desativarBotao;
    const ativarBotao = window.linkaUtils.ativarBotao;
    window.gerarSkeletonProdutos = window.linkaUtils.gerarSkeletonProdutos;

    // Helpers importados de utils.js (window.linkaUtils)

    // ── Socket ──
    function conectarSocket() {
        const token = localStorage.getItem('linka_token');
        if (!token || (socket && socket.connected)) return;
        const socketUrl = window.API_BASE_URL.replace('/api', '');
        socket = io(socketUrl, { auth: { token } });
        socket.on('connect', () => console.log('[Socket] Conectado'));
        socket.on('chat:mensagem', (msg) => {
            if (conversaAtiva && conversaAtiva.id === msg.conversa_id) {
                adicionarMensagemAoEcra(msg);
            }
            recarregarListaConversas();
        });
        socket.on('chat:escrevendo', (dados) => {
            if (conversaAtiva && conversaAtiva.id === dados.conversaId) mostrarIndicadorEscrita(dados.escrevendo);
        });
    }

    function desconectarSocket() { if (socket) { socket.disconnect(); socket = null; } }
    function limparSessaoLocal() { localStorage.removeItem('linka_token'); desconectarSocket(); }

    // ── Notificações (Bell) ──
    window.carregarNotificacoes = async function () {
        try {
            const r = await window.api.conversas.listar();
            const convs = r.dados || [];
            const total = convs.reduce((s, c) => s + (c.nao_lidas || 0), 0);
            const badge = document.getElementById('notifBadge');
            if (total > 0) { if (badge) { badge.textContent = total; badge.style.display = 'flex'; } }
            else { if (badge) badge.style.display = 'none'; }
            notificar(total > 0 ? `Tem ${total} mensagem${total > 1 ? 's' : ''} não lida${total > 1 ? 's' : ''}.` : 'Sem notificações novas.', total > 0 ? 'info' : 'sucesso');
        } catch { notificar('Erro ao verificar notificações.', 'erro'); }
    };

    // ── Auth ──
    async function verificarSessao() {
        const token = localStorage.getItem('linka_token');
        if (!token) { window.location.href = '../index.html'; return; }
        try {
            const res = await window.api.utilizadores.perfil();
            if (res.sucesso && (res.dados.tipo === 'vendedor' || res.dados.tipo === 'admin')) {
                utilizadorLogado = res.dados;
                conectarSocket();
                atualizarInterfaceAutenticada();
            } else {
                window.location.href = '../index.html';
            }
        } catch (erro) {
            if (erro.status === 401) { limparSessaoLocal(); window.location.href = '../index.html'; }
            else { console.error('Erro sessão:', erro); window.location.href = '../index.html'; }
        }
    }

    function atualizarInterfaceAutenticada() {
        const iniciais = utilizadorLogado.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        const navAuth = get('navAuth');
        if (navAuth) {
            navAuth.innerHTML = `<span class="user-avatar-initials">${iniciais}</span>`;
        }
        const elDrawerNome = get('drawer-nome');
        if (elDrawerNome) elDrawerNome.textContent = utilizadorLogado.nome;
        const elDrawerTag = get('drawer-tag');
        if (elDrawerTag) elDrawerTag.textContent = 'Vendedor';
        const drawerAv = get('drawer-avatar');
        if (drawerAv) drawerAv.innerHTML = `<span class="material-symbols-outlined">store</span>`;
        const bottomNav = get('bottomNavGlobal');
        if (bottomNav) bottomNav.classList.remove('escondido');
        window.carregarConteudoDashboard('vendedor-inicio');
        setTimeout(window.carregarNotificacoes, 1000);
    }

    async function fazerLogout() {
        window.confirmarAcao('Terminar Sessão', 'Tem a certeza de que deseja sair da sua conta?', async () => {
            try { await window.api.auth.logout(); } catch (e) { console.warn('Logout API error:', e.message); }
            limparSessaoLocal();
            window.location.href = '../index.html';
        });
    }

    // Logout via drawer
    document.querySelectorAll('[data-logout]').forEach(el => el.addEventListener('click', fazerLogout));

    // ── Carregar Conteúdo Dashboard ──
    function carregarConteudoDashboard(vista) {
        const alias = { perfil: 'meu-perfil', 'novo-anuncio': 'criar-anuncio', anuncios: 'meus-anuncios', analytics: 'analytics', 'anuncios-patrocinados': 'anuncios-patrocinados', ranking: 'ranking' };
        vista = alias[vista] || vista;
        let conteudo = '';
        const dashboardConteudo = get('dashboardConteudo');

        switch (vista) {
            case 'vendedor-inicio':
                conteudo = `<div id="dashboardStats"><div class="spinner-linka" style="margin:40px auto;"></div></div><div id="dashboardUltimosPedidos"></div>`;
                setTimeout(carregarEstatisticasVendedor, 100);
                break;
            case 'vendas':
                conteudo = `<div class="kh-section-header"><span class="kh-section-title">Minhas Vendas</span></div><div id="listaPedidos"><div class="spinner-linka" style="margin:40px auto;"></div></div>`;
                setTimeout(() => carregarPedidosDashboard('vendedor'), 100);
                break;
            case 'meus-anuncios':
                conteudo = `
                    <div class="kh-section-header" style="margin-bottom:16px;"><span class="kh-section-title">Os Meus Anúncios</span><span class="kh-section-action" onclick="carregarConteudoDashboard('criar-anuncio')"><span class="material-symbols-outlined">add</span> Novo</span></div>
                    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
                        <select id="filtroStatusAnuncio" class="kh-select" style="flex:1;" onchange="window.carregarMeusAnuncios()"><option value="">Todos os Estados</option><option value="ativo">Ativos</option><option value="inativo">Inativos</option><option value="vendido">Vendidos</option></select>
                        <select id="ordemAnuncio" class="kh-select" style="flex:1;" onchange="window.carregarMeusAnuncios()"><option value="recentes">Mais recentes</option><option value="antigos">Mais antigos</option><option value="preco_maior">Maior preço</option><option value="preco_menor">Menor preço</option></select>
                    </div>
                    <div id="listaMeusAnuncios"><div class="spinner-linka" style="margin:40px auto;"></div></div>`;
                setTimeout(window.carregarMeusAnuncios, 100);
                break;
            case 'criar-anuncio':
                conteudo = `
                    <div class="kh-section-header" style="margin-bottom:20px;"><span class="kh-section-title">Novo Anúncio</span></div>
                    <form id="formNovoAnuncio">
                        <div class="kh-form-section"><div class="kh-form-section-title"><span class="material-symbols-outlined">photo_camera</span> Fotografias</div>
                            <div class="kh-upload-area" onclick="document.getElementById('inputImagens').click()"><input type="file" id="inputImagens" name="imagens" multiple accept="image/*" hidden><div class="kh-upload-icon"><span class="material-symbols-outlined">photo_camera</span></div><p class="kh-upload-title">Adicionar Fotos</p><p class="kh-upload-sub">Até 5 fotos · JPG, PNG (Máx. 5MB)</p></div>
                            <div id="previsualizacaoImagens" class="kh-preview-grid"></div>
                        </div>
                        <div class="kh-form-section"><div class="kh-form-section-title"><span class="material-symbols-outlined">info</span> Informações Básicas</div>
                            <div class="kh-input-group"><label class="kh-label">Título do Anúncio</label><input type="text" name="titulo" class="kh-input" placeholder="Ex: iPhone 13 Pro Max – 256GB" required></div>
                            <div class="kh-input-group"><label class="kh-label">Categoria</label><select name="categoria_id" id="selectCategorias" class="kh-select" required><option value="">A carregar categorias...</option></select></div>
                            <div class="kh-input-group"><label class="kh-label">Condição</label><div class="kh-chip-row"><button type="button" class="kh-chip selected" data-valor="novo" onclick="window.selecionarCondicao(this)"><span class="material-symbols-outlined">star</span> Novo</button><button type="button" class="kh-chip" data-valor="usado" onclick="window.selecionarCondicao(this)"><span class="material-symbols-outlined">schedule</span> Usado</button></div><input type="hidden" name="condicao" id="hiddenCondicao" value="novo"></div>
                            <div class="kh-input-group"><label class="kh-label">Descrição Detalhada</label><textarea name="descricao" class="kh-textarea" rows="4" placeholder="Descreva as condições, funcionalidades e o que está incluído..."></textarea></div>
                        </div>
                        <div class="kh-form-section"><div class="kh-form-section-title"><span class="material-symbols-outlined">payments</span> Preço</div>
                            <div class="kh-input-group"><label class="kh-label">Preço (MZN)</label><input type="number" name="preco" class="kh-input" placeholder="0.00" min="0" step="0.01" required></div>
                            <div class="kh-input-group"><div class="kh-toggle-row"><div class="kh-toggle-info"><div class="kh-toggle-label">Negociável</div><div class="kh-toggle-sub">Aceito propostas de compradores</div></div><label class="kh-toggle-switch"><input type="checkbox" name="preco_negociavel"><span class="kh-toggle-slider"></span></label></div></div>
                        </div>
                        <div class="kh-form-section"><div class="kh-form-section-title"><span class="material-symbols-outlined">location_on</span> Localização</div>
                            <div class="kh-input-group"><label class="kh-label">Cidade / Localização</label><input type="text" name="cidade" class="kh-input" placeholder="Ex: Maputo, Matola, Beira..." required></div>
                        </div>
                        <div style="height:90px;"></div>
                    </form>
                    <div class="kh-sticky-bottom"><button type="submit" form="formNovoAnuncio" class="kh-btn-primary"><span class="material-symbols-outlined">send</span> Publicar Anúncio</button></div>`;
                setTimeout(popularCategoriasSelect, 100);
                break;
            case 'mensagens':
                conteudo = `
                    <div class="stitch-chat-layout">
                        <div class="stitch-chat-sidebar" id="chatSidebarLista">
                            <div class="stitch-chat-sidebar-header"><h2>Mensagens</h2></div>
                            <div id="listaConversas" class="stitch-chat-lista">
                                <div class="stitch-empty-state" style="padding:30px 16px;"><div class="stitch-empty-icon-wrap"><span class="material-symbols-outlined">chat_bubble_outline</span></div><h3>Sem conversas ainda</h3><p>Clique num produto e inicie uma negociação!</p></div>
                            </div>
                        </div>
                        <div class="stitch-chat-janela" id="janelaChat">
                            <div class="stitch-chat-janela-vazia"><span class="material-symbols-outlined">forum</span><p>Selecione uma conversa para começar a negociar.</p></div>
                        </div>
                    </div>`;
                setTimeout(inicializarModuloChat, 100);
                break;
            case 'meu-perfil':
                conteudo = `<div id="perfilContainer"><div class="spinner-linka" style="margin:40px auto;"></div></div>`;
                setTimeout(carregarPerfilCompleto, 100);
                break;
            case 'minha-subscricao':
                conteudo = '<div id="subscricaoContainer"><div class="spinner-linka" style="margin:40px auto;"></div></div>';
                setTimeout(carregarMinhaSubscricao, 100);
                break;
            case 'minhas-sancoes':
                conteudo = '<div id="sancoesContainer"><div class="spinner-linka" style="margin:40px auto;"></div></div>';
                setTimeout(carregarMinhasSancoesVendedor, 100);
                break;
            case 'analytics':
                conteudo = `
                    <div class="kh-section-header" style="margin-bottom:20px;">
                        <span class="kh-section-title"><span class="material-symbols-outlined" style="vertical-align:middle;margin-right:6px;">analytics</span> Os Meus Analytics</span>
                        <select id="analyticsPeriodo" class="kh-select" style="width:auto;padding:6px 12px;" onchange="window.carregarAnalytics()">
                            <option value="7">Últimos 7 dias</option>
                            <option value="30" selected>Últimos 30 dias</option>
                            <option value="90">Últimos 90 dias</option>
                        </select>
                    </div>
                    <div id="analyticsResumo"><div class="spinner-linka" style="margin:40px auto;"></div></div>
                    <div id="analyticsGrafico" style="margin-top:16px;"></div>
                    <div id="analyticsTopProdutos" style="margin-top:16px;"></div>`;
                setTimeout(window.carregarAnalytics, 100);
                break;
            case 'anuncios-patrocinados':
                conteudo = `
                    <div class="kh-section-header" style="margin-bottom:16px;">
                        <span class="kh-section-title"><span class="material-symbols-outlined" style="vertical-align:middle;margin-right:6px;">campaign</span> Anúncios Patrocinados</span>
                        <span class="kh-section-action" onclick="window.criarAnuncioForm()"><span class="material-symbols-outlined">add</span> Novo</span>
                    </div>
                    <div id="anunciosResumo"><div class="spinner-linka" style="margin:40px auto;"></div></div>
                    <div id="listaAnuncios"><div class="spinner-linka" style="margin:40px auto;"></div></div>`;
                setTimeout(window.carregarMeusAnunciosPatrocinados, 100);
                break;
            case 'ranking':
                conteudo = `
                    <div class="kh-section-header" style="margin-bottom:16px;">
                        <span class="kh-section-title"><span class="material-symbols-outlined" style="vertical-align:middle;margin-right:6px;">leaderboard</span> Ranking de Vendedores</span>
                        <select id="rankingPeriodo" class="kh-select" style="width:auto;padding:6px 12px;" onchange="window.carregarRanking()">
                            <option value="">Geral</option>
                            <option value="semanal">Semanal</option>
                            <option value="mensal">Mensal</option>
                        </select>
                    </div>
                    <div id="minhaPosicaoRanking"><div class="spinner-linka" style="margin:40px auto;"></div></div>
                    <div id="leaderboardLista"><div class="spinner-linka" style="margin:40px auto;"></div></div>`;
                setTimeout(window.carregarRanking, 100);
                break;
            case 'entregas':
                conteudo = `
                    <div class="kh-section-header" style="margin-bottom:16px;">
                        <span class="kh-section-title"><span class="material-symbols-outlined" style="vertical-align:middle;margin-right:6px;">local_shipping</span> Entregas</span>
                        <select id="entregasVendedorFiltro" class="kh-select" style="width:auto;padding:6px 12px;" onchange="window.carregarEntregasVendedor()">
                            <option value="">Todas</option>
                            <option value="aguardando">Aguardando</option>
                            <option value="aceite">Aceite</option>
                            <option value="a_caminho">A Caminho</option>
                            <option value="entregue">Entregues</option>
                        </select>
                    </div>
                    <div id="listaEntregasVendedor"><div class="spinner-linka" style="margin:40px auto;"></div></div>`;
                setTimeout(window.carregarEntregasVendedor, 100);
                break;
            default:
                conteudo = `<div class="stitch-em-desenvolvimento"><div class="stitch-dev-icon"><span class="material-symbols-outlined">construction</span></div><h2>Em Breve!</h2><p>A secção de <strong>${vista}</strong> está a ser desenvolvida.</p><button class="btn btn-primario" onclick="carregarConteudoDashboard('vendedor-inicio')">Voltar ao Início</button></div>`;
                break;
        }

        if (dashboardConteudo) dashboardConteudo.innerHTML = conteudo;
    }

    window.carregarConteudoDashboard = carregarConteudoDashboard;

    // ── Analytics ──
    window.carregarAnalytics = async function () {
        const resumo = get('analyticsResumo');
        const grafico = get('analyticsGrafico');
        const topProdutos = get('analyticsTopProdutos');
        const dias = parseInt(document.getElementById('analyticsPeriodo')?.value || '30');

        if (resumo) resumo.innerHTML = '<div class="spinner-linka" style="margin:40px auto;"></div>';

        try {
            const [metricasRes, evolucaoRes, topRes] = await Promise.all([
                window.api.analytics.metricasVendedor(dias),
                window.api.analytics.evolucaoDiaria(dias),
                window.api.analytics.topProdutos(dias, 5)
            ]);

            const m = metricasRes.dados || {};
            const taxaConversao = m.total_views > 0 ? ((m.total_pedidos / m.total_views) * 100).toFixed(1) : '0.0';
            const ticketMedio = m.total_pedidos > 0 ? (m.total_receita / m.total_pedidos).toFixed(0) : '0';

            if (resumo) {
                resumo.innerHTML = `
                    <div class="dashboard-kpi-grid">
                        <div class="kpi-card"><span class="kpi-label">Visualizações</span><div class="kpi-value">${m.total_views || 0}</div></div>
                        <div class="kpi-card"><span class="kpi-label">Likes</span><div class="kpi-value">${m.total_likes || 0}</div></div>
                        <div class="kpi-card"><span class="kpi-label">Favoritos</span><div class="kpi-value">${m.total_favoritos || 0}</div></div>
                        <div class="kpi-card"><span class="kpi-label">Contactos Chat</span><div class="kpi-value">${m.total_contactos || 0}</div></div>
                        <div class="kpi-card"><span class="kpi-label">Pedidos</span><div class="kpi-value text-primario">${m.total_pedidos || 0}</div></div>
                        <div class="kpi-card"><span class="kpi-label">Receita</span><div class="kpi-value text-primario">MZN ${formatarDinheiro(m.total_receita || 0)}</div></div>
                        <div class="kpi-card"><span class="kpi-label">Taxa de Conversão</span><div class="kpi-value">${taxaConversao}%</div></div>
                        <div class="kpi-card"><span class="kpi-label">Ticket Médio</span><div class="kpi-value">MZN ${formatarDinheiro(ticketMedio)}</div></div>
                    </div>`;
            }

            const dadosEvolucao = evolucaoRes.dados || [];
            if (grafico && dadosEvolucao.length > 0) {
                const maxViews = Math.max(...dadosEvolucao.map(d => d.views || 0), 1);
                const barWidth = Math.max(100 / dadosEvolucao.length - 1, 4);
                grafico.innerHTML = `
                    <h3 style="margin-bottom:12px;font-size:0.95rem;">Evolução Diária</h3>
                    <div style="display:flex;align-items:flex-end;gap:2px;height:120px;padding:0 4px;">
                        ${dadosEvolucao.map(d => {
                            const h = Math.max((d.views / maxViews) * 100, 4);
                            return `<div style="flex:1;min-width:${barWidth}%;height:${h}%;background:var(--cor-cyprus);border-radius:4px 4px 0 0;position:relative;cursor:pointer;" title="${d.data}: ${d.views} views, ${d.pedidos} pedidos, MZN ${formatarDinheiro(d.receita)}">
                                <div style="position:absolute;top:-20px;left:50%;transform:translateX(-50%);font-size:0.65rem;white-space:nowrap;display:none;" class="bar-label">${d.views}</div>
                            </div>`;
                        }).join('')}
                    </div>
                    <div style="display:flex;justify-content:space-between;font-size:0.7rem;color:var(--cor-texto-mutado);margin-top:4px;padding:0 4px;">
                        <span>${dadosEvolucao[0]?.data ? new Date(dadosEvolucao[0].data).toLocaleDateString('pt-MZ', { day: '2-digit', month: 'short' }) : ''}</span>
                        <span>${dadosEvolucao[dadosEvolucao.length - 1]?.data ? new Date(dadosEvolucao[dadosEvolucao.length - 1].data).toLocaleDateString('pt-MZ', { day: '2-digit', month: 'short' }) : ''}</span>
                    </div>
                    <div style="display:flex;gap:16px;font-size:0.75rem;color:var(--cor-texto-mutado);margin-top:8px;justify-content:center;">
                        <span><span style="display:inline-block;width:10px;height:10px;background:var(--cor-cyprus);border-radius:2px;margin-right:4px;"></span>Visualizações</span>
                    </div>`;
            } else if (grafico) {
                grafico.innerHTML = '<p class="text-muted text-center p-10">Sem dados para o período selecionado.</p>';
            }

            const topDados = topRes.dados || [];
            if (topProdutos && topDados.length > 0) {
                topProdutos.innerHTML = `
                    <h3 style="margin-bottom:12px;font-size:0.95rem;">Top Produtos</h3>
                    ${topDados.map((p, i) => `
                        <div style="display:flex;align-items:center;gap:12px;padding:12px;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:8px;">
                            <span style="font-size:1.1rem;font-weight:700;color:var(--cor-cyprus);width:28px;text-align:center;">#${i + 1}</span>
                            <div style="flex:1;">
                                <div style="font-weight:600;font-size:0.9rem;">${escaparHtml(p.titulo || 'Produto')}</div>
                                <div style="font-size:0.8rem;color:var(--cor-texto-mutado);">${p.total_views || 0} views · ${p.total_likes || 0} likes · ${p.total_pedidos || 0} vendas</div>
                            </div>
                            <div style="text-align:right;">
                                <div style="font-weight:600;color:var(--cor-cyprus);">MZN ${formatarDinheiro(p.total_receita || 0)}</div>
                            </div>
                        </div>
                    `).join('')}`;
            } else if (topProdutos) {
                topProdutos.innerHTML = '<p class="text-muted text-center p-10">Sem produtos para mostrar.</p>';
            }

        } catch (erro) {
            console.error('[Analytics] Erro:', erro);
            if (resumo) resumo.innerHTML = `<p class="text-center text-erro p-20">${escaparHtml(erro.message)}</p>`;
        }
    };

    // ── Anúncios Patrocinados ──
    window.carregarMeusAnunciosPatrocinados = async function () {
        const resumoContainer = get('anunciosResumo');
        const listaContainer = get('listaAnuncios');
        if (!listaContainer) return;

        try {
            const [statsRes, anunciosRes] = await Promise.all([
                window.api.anuncios.estatisticas(),
                window.api.anuncios.listar()
            ]);

            const stats = statsRes.dados || {};
            if (resumoContainer) {
                resumoContainer.innerHTML = `
                    <div class="dashboard-kpi-grid" style="grid-template-columns: repeat(4, 1fr);">
                        <div class="kpi-card"><span class="kpi-label">Total Anúncios</span><div class="kpi-value">${stats.total_anuncios || 0}</div></div>
                        <div class="kpi-card"><span class="kpi-label">Activos</span><div class="kpi-value text-primario">${stats.activos || 0}</div></div>
                        <div class="kpi-card"><span class="kpi-label">Impressões</span><div class="kpi-value">${stats.impressoes_total || 0}</div></div>
                        <div class="kpi-card"><span class="kpi-label">Cliques</span><div class="kpi-value">${stats.cliques_total || 0}</div></div>
                    </div>`;
            }

            const anuncios = anunciosRes.dados || [];
            if (anuncios.length === 0) {
                listaContainer.innerHTML = '<p class="text-center p-20 text-muted">Nenhum anúncio patrocinado ainda. Clique em "Novo" para criar.</p>';
                return;
            }

            listaContainer.innerHTML = anuncios.map(a => {
                const img = resolverUrlImagem(a.imagem_url);
                const estadoClass = a.estado === 'activo' ? 'text-sucesso' : a.estado === 'pausado' ? 'text-aviso' : 'text-muted';
                const taxa = a.impressoes_total > 0 ? ((a.cliques_total / a.impressoes_total) * 100).toFixed(1) : '0.0';
                return `
                    <div class="meus-anuncios-card" style="margin-bottom:12px;">
                        <div style="display:flex;gap:12px;padding:12px;">
                            <div style="width:60px;height:60px;border-radius:8px;background:${cssUrlImagem(img)} center/cover;flex-shrink:0;"></div>
                            <div style="flex:1;min-width:0;">
                                <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                                    <div>
                                        <div style="font-weight:600;font-size:0.9rem;">${escaparHtml(a.titulo || a.produto_titulo)}</div>
                                        <div style="font-size:0.8rem;color:var(--cor-texto-mutado);">${escaparHtml(a.produto_titulo)}</div>
                                    </div>
                                    <span style="font-size:0.75rem;font-weight:600;" class="${estadoClass}">${a.estado.toUpperCase()}</span>
                                </div>
                                <div style="display:flex;gap:12px;margin-top:8px;font-size:0.8rem;color:var(--cor-texto-mutado);">
                                    <span>${a.impressoes_total} views</span>
                                    <span>${a.cliques_total} cliques</span>
                                    <span>${taxa}% CTR</span>
                                    <span>MZN ${formatarDinheiro(a.gasto_total)}</span>
                                </div>
                                <div style="display:flex;gap:6px;margin-top:8px;">
                                    ${a.estado === 'activo' ? `<button class="mac-btn" onclick="window.pausarAnuncio(${a.id})"><span class="material-symbols-outlined text-aviso" style="font-size:16px;">pause</span> Pausar</button>` : ''}
                                    ${a.estado === 'pausado' ? `<button class="mac-btn" onclick="window.retomarAnuncio(${a.id})"><span class="material-symbols-outlined text-sucesso" style="font-size:16px;">play_arrow</span> Retomar</button>` : ''}
                                    <button class="mac-btn" onclick="window.eliminarAnuncioPatrocinado(${a.id})"><span class="material-symbols-outlined text-erro" style="font-size:16px;">delete</span> Eliminar</button>
                                </div>
                            </div>
                        </div>
                    </div>`;
            }).join('');
        } catch (erro) {
            listaContainer.innerHTML = `<p class="text-center text-erro p-20">${escaparHtml(erro.message)}</p>`;
        }
    };

    window.criarAnuncioForm = async function () {
        const dc = get('dashboardConteudo');
        if (!dc) return;

        // Carregar produtos do vendedor
        let produtos = [];
        try {
            const res = await window.api.produtos.listar('?meus=true');
            produtos = (res.dados || []).filter(p => p.status !== 'vendido');
        } catch (e) { console.warn('Erro ao carregar produtos:', e.message); }

        const hoje = new Date().toISOString().split('T')[0];
        const maxFim = new Date();
        maxFim.setDate(maxFim.getDate() + 30);
        const maxFimStr = maxFim.toISOString().split('T')[0];

        dc.innerHTML = `
            <div class="kh-section-header" style="margin-bottom:20px;">
                <span class="kh-section-title">Novo Anúncio Patrocinado</span>
            </div>
            <form id="formNovoAnuncioPatrocinado">
                <div class="kh-form-section">
                    <div class="kh-form-section-title"><span class="material-symbols-outlined">inventory_2</span> Produto</div>
                    <div class="kh-input-group">
                        <label class="kh-label">Selecione o Produto</label>
                        <select name="produto_id" class="kh-select" required>
                            <option value="">Selecione um produto...</option>
                            ${produtos.map(p => `<option value="${p.id}">${escaparHtml(p.titulo)} — MZN ${formatarDinheiro(p.preco)}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="kh-form-section">
                    <div class="kh-form-section-title"><span class="material-symbols-outlined">campaign</span> Configuração do Anúncio</div>
                    <div class="kh-input-group">
                        <label class="kh-label">Título do Anúncio</label>
                        <input type="text" name="titulo" class="kh-input" placeholder="Ex: Oferta especial no iPhone..." maxlength="150">
                    </div>
                    <div class="kh-input-group">
                        <label class="kh-label">Tipo de Anúncio</label>
                        <select name="tipo_anuncio" class="kh-select">
                            <option value="imagem">Imagem Estática</option>
                            <option value="video">Vídeo Curt</option>
                            <option value="oferta">Oferta Promocional</option>
                            <option value="animated">Imagem Animada</option>
                        </select>
                    </div>
                    <div class="kh-input-group" id="campoTextoOferta" style="display:none;">
                        <label class="kh-label">Texto da Oferta</label>
                        <input type="text" name="texto_oferta" class="kh-input" placeholder="Ex: 30% OFF, Leve 2 Pague 1..." maxlength="255">
                    </div>
                    <div class="kh-input-group">
                        <label class="kh-label">Prioridade</label>
                        <select name="prioridade" class="kh-select">
                            <option value="0">Básica</option>
                            <option value="5">Média</option>
                            <option value="10">Alta (Premium)</option>
                        </select>
                    </div>
                    <div class="kh-input-group">
                        <label class="kh-label">Orcamento Diário (MZN)</label>
                        <input type="number" name="orcamento_diario" class="kh-input" min="1" step="0.50" value="5" required>
                        <small style="color:var(--cor-texto-mutado);">Mínimo MZN 1.00/dia</small>
                    </div>
                    <div class="kh-input-group">
                        <label class="kh-label">Custo por Clique (MZN)</label>
                        <input type="number" name="custo_por_clique" class="kh-input" min="0.10" step="0.10" value="0.50" required>
                        <small style="color:var(--cor-texto-mutado);">Mínimo MZN 0.10 por clique</small>
                    </div>
                    <div class="kh-input-group">
                        <label class="kh-label">Data de Início</label>
                        <input type="date" name="data_inicio" class="kh-input" min="${hoje}" value="${hoje}" required>
                    </div>
                    <div class="kh-input-group">
                        <label class="kh-label">Data de Fim</label>
                        <input type="date" name="data_fim" class="kh-input" min="${hoje}" max="${maxFimStr}" required>
                    </div>
                    <div class="kh-input-group">
                        <label class="kh-label">Destino</label>
                        <select name="destino" class="kh-select">
                            <option value="todos">Todos (Feed + Reels + Explore)</option>
                            <option value="feed">Apenas Feed</option>
                            <option value="reels">Apenas Reels</option>
                            <option value="explore">Apenas Explore</option>
                        </select>
                    </div>
                </div>
                <div style="height:90px;"></div>
            </form>
            <div class="kh-sticky-bottom">
                <button type="submit" form="formNovoAnuncioPatrocinado" class="kh-btn-primary">
                    <span class="material-symbols-outlined">rocket_launch</span> Criar Anúncio
                </button>
            </div>`;

        // Toggle campo de oferta
        const tipoSelect = form?.querySelector('[name="tipo_anuncio"]');
        const campoOferta = get('campoTextoOferta');
        if (tipoSelect && campoOferta) {
            tipoSelect.addEventListener('change', () => {
                campoOferta.style.display = tipoSelect.value === 'oferta' ? 'block' : 'none';
            });
        }

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = form.querySelector('button[type="submit"]');
                try {
                    btn.disabled = true;
                    btn.innerText = 'A criar...';
                    const fd = new FormData(form);
                    const dados = {};
                    fd.forEach((v, k) => dados[k] = v);
                    dados.produto_id = parseInt(dados.produto_id);
                    dados.orcamento_diario = parseFloat(dados.orcamento_diario);
                    dados.custo_por_clique = parseFloat(dados.custo_por_clique);
                    dados.prioridade = parseInt(dados.prioridade) || 0;
                    if (!dados.texto_oferta) delete dados.texto_oferta;
                    await window.api.anuncios.criar(dados);
                    notificar('Anúncio patrocinado criado com sucesso!', 'sucesso');
                    carregarConteudoDashboard('anuncios-patrocinados');
                } catch (erro) {
                    notificar(erro.message, 'erro');
                } finally {
                    btn.disabled = false;
                    btn.innerText = 'Criar Anúncio';
                }
            });
        }
    };

    window.pausarAnuncio = async function (id) {
        window.confirmarAcao('Pausar Anúncio', 'O anúncio deixará de ser exibido. Continuar?', async () => {
            try {
                await window.api.anuncios.pausar(id);
                notificar('Anúncio pausado.', 'sucesso');
                window.carregarMeusAnunciosPatrocinados();
            } catch (erro) { notificar(erro.message, 'erro'); }
        });
    };

    window.retomarAnuncio = async function (id) {
        try {
            await window.api.anuncios.retomar(id);
            notificar('Anúncio retomado.', 'sucesso');
            window.carregarMeusAnunciosPatrocinados();
        } catch (erro) { notificar(erro.message, 'erro'); }
    };

    window.eliminarAnuncioPatrocinado = async function (id) {
        window.confirmarAcao('Eliminar Anúncio', 'Esta acção não pode ser desfeita. Continuar?', async () => {
            try {
                await window.api.anuncios.eliminar(id);
                notificar('Anúncio eliminado.', 'sucesso');
                window.carregarMeusAnunciosPatrocinados();
            } catch (erro) { notificar(erro.message, 'erro'); }
        });
    };

    // ── Ranking de Vendedores ──
    window.carregarRanking = async function () {
        const posicaoContainer = get('minhaPosicaoRanking');
        const listaContainer = get('leaderboardLista');
        const periodo = document.getElementById('rankingPeriodo')?.value || '';

        try {
            const [posRes, rankRes, evolRes] = await Promise.all([
                window.api.ranking.posicao(),
                window.api.ranking.listar(periodo, 50),
                window.api.ranking.evolucao()
            ]);

            const minhaPos = posRes.dados?.posicao || 0;
            const meusDados = posRes.dados?.dados || null;
            const ranking = rankRes.dados || [];
            const evolucao = evolRes.dados || [];

            if (posicaoContainer) {
                const score = meusDados?.score_composto || 0;
                const medalha = minhaPos === 1 ? '🥇' : minhaPos === 2 ? '🥈' : minhaPos === 3 ? '🥉' : '';
                posicaoContainer.innerHTML = `
                    <div style="background:linear-gradient(135deg,var(--cor-cyprus),#006b66);color:white;border-radius:16px;padding:24px;margin-bottom:20px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <div>
                                <div style="font-size:0.85rem;opacity:0.8;">A Sua Posição</div>
                                <div style="font-size:2rem;font-weight:800;">${medalha} #${minhaPos || 'N/D'}</div>
                            </div>
                            <div style="text-align:right;">
                                <div style="font-size:0.85rem;opacity:0.8;">Score</div>
                                <div style="font-size:1.5rem;font-weight:700;">${score.toFixed(1)}</div>
                            </div>
                        </div>
                        ${evolucao.length > 0 ? `
                            <div style="margin-top:16px;display:flex;gap:8px;font-size:0.8rem;opacity:0.9;">
                                <span>📊 ${evolucao.length} períodos registados</span>
                                <span>📈 Tendência: ${evolucao[evolucao.length - 1]?.score_composto > (evolucao[0]?.score_composto || 0) ? 'Subida' : 'Estável'}</span>
                            </div>` : ''}
                    </div>`;
            }

            if (listaContainer) {
                if (ranking.length === 0) {
                    listaContainer.innerHTML = '<p class="text-center p-20 text-muted">Sem dados de ranking ainda.</p>';
                    return;
                }

                listaContainer.innerHTML = ranking.map((r, i) => {
                    const pos = i + 1;
                    const medalha = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : `<span style="color:var(--cor-texto-mutado);font-weight:600;">#${pos}</span>`;
                    const isMe = r.vendedor_id === meusDados?.vendedor_id;
                    return `
                        <div style="display:flex;align-items:center;gap:12px;padding:14px;border-radius:12px;margin-bottom:8px;${isMe ? 'background:rgba(0,70,67,0.08);border:2px solid var(--cor-cyprus);' : 'border:1px solid #e5e7eb;'}">
                            <div style="font-size:1.3rem;width:40px;text-align:center;">${medalha}</div>
                            <div style="width:40px;height:40px;border-radius:50%;background:var(--cor-cyprus);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.9rem;flex-shrink:0;">
                                ${(r.nome_loja || r.nome || 'V').charAt(0).toUpperCase()}
                            </div>
                            <div style="flex:1;min-width:0;">
                                <div style="font-weight:600;font-size:0.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escaparHtml(r.nome_loja || r.nome || 'Vendedor')}</div>
                                <div style="font-size:0.75rem;color:var(--cor-texto-mutado);">
                                    ${r.total_vendas || 0} vendas · ${r.avaliacao_media ? r.avaliacao_media.toFixed(1) + '★' : 'S/A'} · ${r.total_produtos || 0} produtos
                                </div>
                            </div>
                            <div style="text-align:right;">
                                <div style="font-weight:700;color:var(--cor-cyprus);">${(r.score_composto || 0).toFixed(1)}</div>
                                <div style="font-size:0.7rem;color:var(--cor-texto-mutado);">score</div>
                            </div>
                        </div>`;
                }).join('');
            }
        } catch (erro) {
            if (listaContainer) listaContainer.innerHTML = `<p class="text-center text-erro p-20">${escaparHtml(erro.message)}</p>`;
        }
    };

    // ── Entregas (Vendedor) ──
    window.carregarEntregasVendedor = async function () {
        const listaContainer = get('listaEntregasVendedor');
        if (!listaContainer) return;
        const filtro = document.getElementById('entregasVendedorFiltro')?.value || '';

        try {
            const r = await window.api.entregas.listar(filtro ? { estado: filtro } : {});
            const entregas = r.dados || [];

            if (entregas.length === 0) {
                listaContainer.innerHTML = '<div class="stitch-empty-state"><div class="stitch-dev-icon"><span class="material-symbols-outlined">local_shipping</span></div><h3>Sem entregas</h3><p>As entregas dos seus pedidos aparecerão aqui.</p></div>';
                return;
            }

            const estadoCores = {
                aguardando: { bg: '#fef3c7', color: '#92400e', label: 'Aguardando', icon: 'hourglass_empty' },
                aceite: { bg: '#dbeafe', color: '#1e40af', label: 'Aceite', icon: 'check_circle' },
                a_caminho: { bg: '#d1fae5', color: '#065f46', label: 'A Caminho', icon: 'directions_bike' },
                entregue: { bg: '#d1fae5', color: '#065f46', label: 'Entregue', icon: 'task_alt' },
                falhou: { bg: '#fee2e2', color: '#991b1b', label: 'Falhou', icon: 'error' },
                cancelado: { bg: '#f3f4f6', color: '#374151', label: 'Cancelado', icon: 'cancel' }
            };

            listaContainer.innerHTML = entregas.map(e => {
                const estado = estadoCores[e.estado] || estadoCores.aguardando;
                return `<div class="lk-ent-card">
                    <div class="lk-ent-card-header">
                        <div class="lk-ent-card-id">#${e.id}</div>
                        <span class="lk-ent-estado" style="background:${estado.bg};color:${estado.color};"><span class="material-symbols-outlined" style="font-size:14px;">${estado.icon}</span> ${estado.label}</span>
                    </div>
                    <div class="lk-ent-card-body">
                        <div class="lk-ent-route">
                            <div class="lk-ent-route-point"><span class="material-symbols-outlined" style="color:#059669;">location_on</span><span>${escaparHtml(e.endereco_origem || 'Origem')}</span></div>
                            <div class="lk-ent-route-line"></div>
                            <div class="lk-ent-route-point"><span class="material-symbols-outlined" style="color:#dc2626;">flag</span><span>${escaparHtml(e.endereco_destino || 'Destino')}</span></div>
                        </div>
                        <div style="display:flex;gap:16px;font-size:0.8rem;color:var(--cor-texto-mutado);margin-top:8px;">
                            <span>👤 ${escaparHtml(e.comprador_nome || 'Comprador')}</span>
                            ${e.entregador_nome ? `<span>🚚 ${escaparHtml(e.entregador_nome)}</span>` : ''}
                        </div>
                    </div>
                    <div class="lk-ent-card-footer">
                        <span style="font-size:0.8rem;color:var(--cor-texto-mutado);">${e.criado_em ? new Date(e.criado_em).toLocaleDateString('pt-MZ') : ''}</span>
                        ${e.preco_entrega ? `<span style="font-weight:600;color:var(--cor-cyprus);">${parseFloat(e.preco_entrega).toFixed(0)} MT</span>` : ''}
                    </div>
                </div>`;
            }).join('');
        } catch (erro) {
            if (listaContainer) listaContainer.innerHTML = `<p class="text-center text-erro p-20">${escaparHtml(erro.message)}</p>`;
        }
    };

    // ── Estatísticas ──
    async function carregarEstatisticasVendedor() {
        const statsContainer = get('dashboardStats');
        const pedidosContainer = get('dashboardUltimosPedidos');
        if (!statsContainer) return;

        try {
            const res = await window.api.estatisticas.vendedor();
            const dados = res.dados || {};

            // Buscar posição no ranking
            let rankingHtml = '';
            try {
                const resRank = await window.api.ranking.posicao();
                if (resRank.sucesso && resRank.dados && resRank.dados.posicao) {
                    const rk = resRank.dados;
                    rankingHtml = `<div class="kpi-card" style="background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #fbbf24;"><span class="kpi-label" style="color:#92400e;">Ranking</span><div class="kpi-value" style="color:#b45309;display:flex;align-items:center;gap:6px;"><span class="material-symbols-outlined" style="font-size:20px;">leaderboard</span>#${rk.posicao}</div><span style="font-size:0.7rem;color:#92400e;">${rk.score_composto || 0} pontos</span></div>`;
                }
            } catch(e) { /* silent */ }

            statsContainer.innerHTML = `
                <div class="dashboard-kpi-grid">
                    <div class="kpi-card"><span class="kpi-label">Receita Total</span><div class="kpi-value text-primario">MZN ${formatarDinheiro(dados.receita_total || dados.total_receitas || 0)}</div></div>
                    <div class="kpi-card"><span class="kpi-label">Vendas</span><div class="kpi-value">${dados.total_vendas || 0}</div></div>
                    <div class="kpi-card"><span class="kpi-label">Anúncios Ativos</span><div class="kpi-value">${dados.anuncios_ativos || 0}</div></div>
                    ${rankingHtml}
                    <div class="kpi-card kpi-alert"><span class="kpi-label">Pedidos Pendentes</span><div class="kpi-value text-erro">${dados.pedidos_pendentes || 0}</div></div>
                </div>`;

            if (pedidosContainer) {
                const resPedidos = await window.api.pedidos.listar();
                const pedidos = resPedidos.dados || [];
                if (pedidos.length > 0) {
                    let html = '<div class="recent-orders-list">';
                    pedidos.slice(0, 5).forEach(p => {
                        const dataF = new Date(p.criado_em).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
                        let badgeClass = 'bg-pendente';
                        if (p.estado === 'entregue') badgeClass = 'bg-entregue';
                        if (p.estado === 'cancelado') badgeClass = 'bg-cancelado';
                        html += `<div class="recent-order-card" onclick="switchTab('vendas', event)"><div class="roc-top"><div class="roc-info"><span class="roc-id">#${String(p.id).padStart(4, '0')}</span><span class="roc-nome">${escaparHtml(p.cliente_nome || 'Cliente')}</span></div><span class="roc-badge ${badgeClass}">${p.estado}</span></div><div class="roc-bottom"><span class="roc-data">${dataF}</span><span class="roc-total">MZN ${formatarDinheiro(p.total)}</span></div></div>`;
                    });
                    html += '</div>';
                    pedidosContainer.innerHTML = html;
                } else {
                    pedidosContainer.innerHTML = '<p class="text-muted p-10">Ainda não tem pedidos recentes.</p>';
                }
            }
        } catch (erro) {
            statsContainer.innerHTML = `<p class="text-erro">Erro: ${escaparHtml(erro.message)}</p>`;
        }
    }

    // ── Meus Anúncios ──
    window.carregarMeusAnuncios = async function () {
        const container = get('listaMeusAnuncios');
        if (!container) return;
        const status = get('filtroStatusAnuncio')?.value || '';
        const ordem = get('ordemAnuncio')?.value || 'recentes';
        container.innerHTML = window.gerarSkeletonProdutos(3);

        try {
            const res = await window.api.produtos.listar('?meus=true');
            let produtos = res.dados || [];
            if (status) produtos = produtos.filter(p => p.status === status);
            if (ordem === 'recentes') produtos.sort((a, b) => new Date(b.criado_em || 0) - new Date(a.criado_em || 0));
            if (ordem === 'antigos') produtos.sort((a, b) => new Date(a.criado_em || 0) - new Date(b.criado_em || 0));
            if (ordem === 'preco_maior') produtos.sort((a, b) => b.preco - a.preco);
            if (ordem === 'preco_menor') produtos.sort((a, b) => a.preco - b.preco);
            renderizarMeusAnuncios(produtos, container);
        } catch (erro) {
            container.innerHTML = '<p class="text-center text-erro">Erro ao carregar os seus anúncios.</p>';
        }
    };

    function renderizarMeusAnuncios(produtos, container) {
        if (!produtos || produtos.length === 0) {
            container.innerHTML = '<p class="text-center w-100 p-20 text-muted">Nenhum anúncio encontrado.</p>';
            return;
        }
        container.innerHTML = produtos.map(p => `
            <div class="meus-anuncios-card" style="position:relative;">
                <div class="mac-img-box" style="background-image:${cssUrlImagem(p.imagem_url)}">${p.status === 'vendido' ? '<div class="mac-badge-vendido">VENDIDO</div>' : ''}</div>
                <div class="mac-info"><div style="display:flex;justify-content:space-between;align-items:flex-start;"><h3 class="mac-titulo">${escaparHtml(p.titulo)}</h3><span class="mac-cat">${p.categoria_nome || 'Geral'}</span></div><div class="mac-preco">MZN ${formatarDinheiro(p.preco)}</div></div>
                <div class="mac-actions">
                    <button class="mac-btn" onclick="window.editarAnuncio(${p.id})"><span class="material-symbols-outlined text-muted">edit</span><span>Editar</span></button>
                    ${p.status !== 'vendido' ? `<button class="mac-btn" onclick="window.marcarVendido(${p.id})"><span class="material-symbols-outlined text-sucesso">check</span><span class="text-sucesso">Vendido</span></button>` : `<button class="mac-btn disabled" disabled><span class="material-symbols-outlined text-muted">check</span><span class="text-muted">Vendido</span></button>`}
                    <button class="mac-btn" onclick="window.eliminarAnuncio(${p.id})"><span class="material-symbols-outlined text-erro">delete</span><span class="text-erro">Eliminar</span></button>
                </div>
            </div>
        `).join('');
    }

    window.editarAnuncio = async function (id) {
        const dc = get('dashboardConteudo');
        if (!dc) return;
        dc.innerHTML = '<div class="spinner-linka" style="margin:40px auto;"></div>';
        try {
            const res = await window.api.produtos.obter(id);
            const p = res.dados;
            dc.innerHTML = `
                <div class="kh-section-header" style="margin-bottom:20px;"><span class="kh-section-title">Editar Anúncio</span></div>
                <form id="formEditarAnuncio">
                    <div class="kh-form-section"><div class="kh-form-section-title"><span class="material-symbols-outlined">photo_camera</span> Fotografias</div>
                    <div class="kh-upload-area" onclick="document.getElementById('inputImagensEdit').click()"><input type="file" id="inputImagensEdit" name="imagens" multiple accept="image/*" hidden><div class="kh-upload-icon"><span class="material-symbols-outlined">photo_camera</span></div><p class="kh-upload-title">Alterar Fotos</p><p class="kh-upload-sub">Até 5 fotos</p></div>
                    ${p.imagens && p.imagens.length > 0 ? `<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">${p.imagens.map(im => `<div style="width:60px;height:60px;border-radius:8px;background:${cssUrlImagem(im.caminho)} center/cover;border:2px solid #e5e7eb;"></div>`).join('')}</div>` : ''}
                </div>
                <div class="kh-form-section"><div class="kh-form-section-title"><span class="material-symbols-outlined">info</span> Informações</div>
                        <div class="kh-input-group"><label class="kh-label">Título</label><input type="text" name="titulo" class="kh-input" value="${escaparHtml(p.titulo)}" required></div>
                        <div class="kh-input-group"><label class="kh-label">Categoria</label><select name="categoria_id" id="selectCategoriasEdit" class="kh-select" required></select></div>
                        <div class="kh-input-group"><label class="kh-label">Condição</label><div class="kh-chip-row"><button type="button" class="kh-chip ${p.condicao === 'novo' ? 'selected' : ''}" data-valor="novo" onclick="window.selecionarCondicao(this)"><span class="material-symbols-outlined">star</span> Novo</button><button type="button" class="kh-chip ${p.condicao === 'usado' ? 'selected' : ''}" data-valor="usado" onclick="window.selecionarCondicao(this)"><span class="material-symbols-outlined">schedule</span> Usado</button></div><input type="hidden" name="condicao" id="hiddenCondicao" value="${p.condicao || 'novo'}"></div>
                        <div class="kh-input-group"><label class="kh-label">Descrição</label><textarea name="descricao" class="kh-textarea" rows="4">${escaparHtml(p.descricao || '')}</textarea></div>
                    </div>
                    <div class="kh-form-section"><div class="kh-form-section-title"><span class="material-symbols-outlined">payments</span> Preço</div>
                        <div class="kh-input-group"><label class="kh-label">Preço (MZN)</label><input type="number" name="preco" class="kh-input" value="${p.preco}" min="0" step="0.01" required></div>
                        <div class="kh-input-group"><div class="kh-toggle-row"><div class="kh-toggle-info"><div class="kh-toggle-label">Negociável</div></div><label class="kh-toggle-switch"><input type="checkbox" name="preco_negociavel" ${p.preco_negociavel ? 'checked' : ''}><span class="kh-toggle-slider"></span></label></div></div>
                    </div>
                    <div class="kh-form-section"><div class="kh-form-section-title"><span class="material-symbols-outlined">location_on</span> Localização</div>
                        <div class="kh-input-group"><label class="kh-label">Cidade</label><input type="text" name="cidade" class="kh-input" value="${escaparHtml(p.cidade || '')}" required></div>
                        <div class="kh-input-group"><label class="kh-label">Stock</label><input type="number" name="quantidade" class="kh-input" value="${p.quantidade || 1}" min="1" required></div>
                    </div>
                    <div style="height:90px;"></div>
                </form>
                <div class="kh-sticky-bottom"><button type="submit" form="formEditarAnuncio" class="kh-btn-primary"><span class="material-symbols-outlined">save</span> Guardar Alterações</button></div>`;
            
            try {
                const resCat = await window.api.categorias.listar();
                const sel = get('selectCategoriasEdit');
                if (sel) {
                    sel.innerHTML = '<option value="">Seleccione</option>' + (resCat.dados || []).map(c => `<option value="${c.id}" ${c.id === p.categoria_id ? 'selected' : ''}>${c.nome}</option>`).join('');
                }
            } catch (e) { console.warn('Erro ao carregar categorias:', e.message); }

            const form = get('formEditarAnuncio');
            if (form) {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const btn = form.querySelector('button[type="submit"]');
                    try {
                        btn.disabled = true; btn.innerText = 'A guardar...';
                        const fd = new FormData(form);
                        // Se não há fotos novas, enviar como JSON puro
                        const temFotosNovas = fd.getAll('imagens').some(v => v instanceof File && v.size > 0);
                        if (temFotosNovas) {
                            // Remover campos não necessários do FormData
                            fd.delete('preco_negociavel');
                            fd.append('preco_negociavel', form.querySelector('[name="preco_negociavel"]').checked);
                            await window.api.produtos.actualizar(id, fd);
                        } else {
                            // Enviar como JSON (sem imagens)
                            fd.delete('imagens');
                            const dados = {};
                            fd.forEach((v, k) => dados[k] = v);
                            dados.preco_negociavel = form.querySelector('[name="preco_negociavel"]').checked;
                            await window.api.produtos.actualizar(id, dados);
                        }
                        notificar('Anúncio actualizado!', 'sucesso');
                        carregarConteudoDashboard('meus-anuncios');
                    } catch(erro) { notificar(erro.message, 'erro'); }
                    finally { btn.disabled = false; btn.innerText = 'Guardar Alterações'; }
                });
            }
        } catch(e) { notificar(e.message, 'erro'); carregarConteudoDashboard('meus-anuncios'); }
    };

    window.marcarVendido = async function (id) {
        window.confirmarAcao('Marcar como Vendido', 'Tem a certeza que este produto foi vendido?', async () => {
            try {
                await window.api.produtos.actualizar(id, { condicao: 'vendido' });
                notificar('Produto marcado como vendido.', 'sucesso');
                window.carregarMeusAnuncios();
            } catch (erro) { notificar(erro.message, 'erro'); }
        });
    };

    window.eliminarAnuncio = async function (id) {
        window.confirmarAcao('Eliminar Anúncio', 'Tem a certeza? Esta acção não pode ser desfeita.', async () => {
            try {
                await window.api.produtos.eliminar(id);
                notificar('Anúncio eliminado.', 'sucesso');
                window.carregarMeusAnuncios();
            } catch (erro) { notificar(erro.message, 'erro'); }
        });
    };

    // ── Criar Anúncio ──
    async function popularCategoriasSelect() {
        const select = get('selectCategorias');
        if (!select) return;
        try {
            const res = await window.api.categorias.listar();
            select.innerHTML = '<option value="">Seleccione uma categoria</option>' + res.dados.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
        } catch { select.innerHTML = '<option value="">Erro ao carregar</option>'; }
    }

    window.selecionarCondicao = function (btn) {
        btn.closest('.kh-chip-row').querySelectorAll('.kh-chip').forEach(c => c.classList.remove('selected'));
        btn.classList.add('selected');
        const hidden = get('hiddenCondicao');
        if (hidden) hidden.value = btn.dataset.valor;
    };

    document.addEventListener('change', (e) => {
        if (e.target.id === 'inputImagens') {
            const container = get('previsualizacaoImagens');
            if (!container) return;
            container.innerHTML = '';
            const tiposPermitidos = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            const maxTamanho = 50 * 1024 * 1024;
            const ficheiros = Array.from(e.target.files).slice(0, 5);
            const validos = [];
            for (const file of ficheiros) {
                if (!tiposPermitidos.includes(file.type)) { notificar(`"${file.name}" não é uma imagem válida.`, 'aviso'); continue; }
                if (file.size > maxTamanho) { notificar(`"${file.name}" excede 50MB.`, 'aviso'); continue; }
                validos.push(file);
            }
            if (validos.length < ficheiros.length) {
                const dt = new DataTransfer(); validos.forEach(f => dt.items.add(f)); e.target.files = dt.files;
            }
            validos.forEach(file => {
                const reader = new FileReader();
                reader.onload = (ev) => { const div = document.createElement('div'); div.className = 'preview-item'; div.innerHTML = `<img src="${ev.target.result}">`; container.appendChild(div); };
                reader.readAsDataURL(file);
            });
        }
    });

    document.addEventListener('submit', async (e) => {
        if (e.target.id === 'formNovoAnuncio') {
            e.preventDefault();
            const form = e.target;
            const btn = form.querySelector('button[type="submit"]');
            try {
                desativarBotao(form);
                btn.innerText = 'A publicar...';
                const formData = new FormData(form);
                const data = await window.api.produtos.criar(formData);
                if (data.sucesso) {
                    notificar('Anúncio publicado com sucesso!', 'sucesso');
                    carregarConteudoDashboard('vendedor-inicio');
                } else { throw new Error(data.erro || 'Falha ao publicar'); }
            } catch (erro) { notificar(erro.message, 'erro'); }
            finally { ativarBotao(form); btn.innerText = 'Publicar Anúncio'; }
        } else if (e.target.id === 'formPerfil') {
            e.preventDefault();
            const form = e.target;
            const btn = form.querySelector('button[type="submit"]');
            try {
                desativarBotao(form);
                const fotoInput = document.getElementById('editFoto');
                let dados;
                if (fotoInput && fotoInput.files.length > 0) {
                    dados = new FormData();
                    dados.append('nome', document.getElementById('editNome')?.value || '');
                    dados.append('telefone', document.getElementById('editTelefone')?.value || '');
                    dados.append('nome_loja', document.getElementById('editNomeLoja')?.value || '');
                    dados.append('descricao_loja', document.getElementById('editDescricaoLoja')?.value || '');
                    dados.append('endereco_fisico', document.getElementById('editEnderecoFisico')?.value || '');
                    dados.append('metodo_recebimento', document.getElementById('editMetodoRecebimento')?.value || '');
                    dados.append('fotografia', fotoInput.files[0]);
                } else {
                    dados = {
                        nome: document.getElementById('editNome')?.value,
                        telefone: document.getElementById('editTelefone')?.value,
                        nome_loja: document.getElementById('editNomeLoja')?.value,
                        descricao_loja: document.getElementById('editDescricaoLoja')?.value,
                        endereco_fisico: document.getElementById('editEnderecoFisico')?.value,
                        metodo_recebimento: document.getElementById('editMetodoRecebimento')?.value
                    };
                }
                const res = await window.api.utilizadores.atualizar(dados);
                if (res.sucesso) {
                    notificar('Perfil atualizado com sucesso!', 'sucesso');
                    if (res.dados?.utilizador) { utilizadorLogado = res.dados.utilizador; }
                } else { throw new Error(res.erro || 'Falha ao atualizar'); }
            } catch (erro) { notificar(erro.message, 'erro'); }
            finally { ativarBotao(form); btn.innerText = 'Guardar Alterações'; }
        }
    });

    // ── Pedidos ──
    async function carregarPedidosDashboard(modo) {
        const container = get('listaPedidos');
        if (!container) return;
        try {
            const res = await window.api.pedidos.listar();
            renderizarPedidos(res.dados || [], container, modo);
        } catch (erro) { container.innerHTML = `<p class="text-center text-erro">${escaparHtml(erro.message)}</p>`; }
    }

    function renderizarPedidos(pedidos, container, modo) {
        if (!pedidos || pedidos.length === 0) {
            container.innerHTML = `<p class="text-center">Nenhum ${modo === 'vendedor' ? 'pedido recebido' : 'pedido feito'} ainda.</p>`;
            return;
        }
        const estados = ['pendente', 'confirmado', 'preparando', 'pronto', 'enviado', 'entregue', 'cancelado'];
        container.innerHTML = pedidos.map(pedido => {
            const nomeOutro = modo === 'vendedor' ? (pedido.cliente_nome || 'Cliente') : (pedido.nome_loja || 'Vendedor');
            if (modo === 'vendedor') {
                return `
                    <div class="venda-card-mobile">
                        <div class="vcm-top"><span class="vcm-id">#ORD-${String(pedido.id).padStart(4, '0')}</span><span class="vcm-data">${formatarData(pedido.criado_em)}</span></div>
                        <div class="vcm-cliente"><div class="vcm-avatar">${nomeOutro.charAt(0).toUpperCase()}</div><div class="vcm-cl-info"><span class="vcm-nome">${escaparHtml(nomeOutro)}</span></div></div>
                        <div class="vcm-summary"><div class="vcm-summ-row"><span class="vcm-summ-label">Total</span><span class="vcm-summ-val">MZN ${formatarDinheiro(pedido.total || 0)}</span></div><div class="vcm-summ-row text-muted"><span class="vcm-summ-label">Pagamento</span><span class="vcm-summ-val text-sm">${escaparHtml(pedido.metodo_pagamento || 'dinheiro')}</span></div>${pedido.endereco_entrega ? `<p class="vcm-endereco mt-5"><span class="material-symbols-outlined">location_on</span> ${escaparHtml(pedido.endereco_entrega)}</p>` : ''}</div>
                        <div class="vcm-bottom"><select class="vcm-select pedido-estado-select" data-pedido-id="${pedido.id}">${estados.map(estado => `<option value="${estado}" ${estado === pedido.estado ? 'selected' : ''}>${estado.charAt(0).toUpperCase() + estado.slice(1)}</option>`).join('')}</select><button class="vcm-btn-atualizar btn-atualizar-pedido" data-pedido-id="${pedido.id}">Atualizar</button></div>
                    </div>`;
            }
            return `<article class="pedido-card"><div class="pedido-topo"><div><h3>Pedido #${pedido.id}</h3><p>${escaparHtml(nomeOutro)}</p></div><span class="pedido-estado estado-${pedido.estado}">${escaparHtml(pedido.estado)}</span></div><div class="pedido-detalhes"><span>Total: <strong>MZN ${formatarDinheiro(pedido.total || 0)}</strong></span><span>Data: ${formatarData(pedido.criado_em)}</span></div></article>`;
        }).join('');

        container.querySelectorAll('.btn-atualizar-pedido').forEach(btn => {
            btn.addEventListener('click', async () => {
                const select = container.querySelector(`.pedido-estado-select[data-pedido-id="${btn.dataset.pedidoId}"]`);
                if (!select) return;
                try {
                    btn.disabled = true;
                    await window.api.pedidos.atualizarEstado(btn.dataset.pedidoId, select.value);
                    notificar('Estado do pedido actualizado.', 'sucesso');
                    carregarPedidosDashboard(modo);
                } catch (erro) { notificar(erro.message, 'erro'); }
                finally { btn.disabled = false; }
            });
        });
    }

    // ── Chat / Mensagens ──
    async function inicializarModuloChat() {
        conversaAtiva = null;
        await recarregarListaConversas();
    }

    async function recarregarListaConversas() {
        const lista = get('listaConversas');
        if (!lista) return;
        try {
            const res = await window.api.conversas.listar();
            if (res.sucesso) { conversasCarregadas = res.dados; renderizarListaConversas(); }
            else { lista.innerHTML = '<p class="text-center p-20">Nenhuma conversa encontrada.</p>'; }
        } catch (erro) { lista.innerHTML = '<p class="text-center p-20 text-erro">Erro ao carregar conversas.</p>'; }
    }

    function renderizarListaConversas() {
        const lista = get('listaConversas');
        if (!lista) return;
        if (conversasCarregadas.length === 0) {
            lista.innerHTML = '<div class="stitch-empty-state" style="padding:30px 16px;"><div class="stitch-empty-icon-wrap"><span class="material-symbols-outlined">chat_bubble_outline</span></div><h3>Sem conversas ainda</h3><p>Clique num produto e inicie uma negociação!</p></div>';
            return;
        }
        lista.innerHTML = conversasCarregadas.map(conv => {
            const nome = conv.outro_nome || 'Utilizador';
            const ativo = (conversaAtiva && conversaAtiva.id === conv.id) ? 'active' : '';
            const badge = conv.nao_lidas > 0 ? `<span class="chat-badge">${conv.nao_lidas}</span>` : '';
            return `<div class="chat-item ${ativo}" onclick="window.abrirConversa(${conv.id})"><div class="chat-item-avatar">${nome.charAt(0).toUpperCase()}</div><div class="chat-item-info"><div class="chat-item-topo"><span class="chat-item-nome">${nome}</span><span class="chat-item-tempo">${conv.ultima_mensagem_em ? formatarData(conv.ultima_mensagem_em) : ''}</span></div><div class="chat-item-produto">${escaparHtml(conv.produto_titulo || 'Produto')}</div><div class="chat-item-preview">${escaparHtml(conv.ultima_mensagem || 'Sem mensagens...')}</div></div>${badge}</div>`;
        }).join('');
    }

    window.abrirConversa = async function (conversaId) {
        const conversa = conversasCarregadas.find(c => c.id === conversaId);
        if (!conversa) return;
        if (conversaAtiva && socket) socket.emit('chat:sair', conversaAtiva.id);
        conversaAtiva = conversa;
        renderizarListaConversas();
        if (socket) socket.emit('chat:entrar', conversaId);

        const janela = get('janelaChat');
        if (!janela) return;
        const nome = conversa.outro_nome || 'Utilizador';
        const produto = conversa.produto_titulo || 'Produto';
        const preco = conversa.produto_preco ? formatarMoeda(conversa.produto_preco) : '';
        const destinatarioId = (conversa.utilizador1_id === utilizadorLogado.id) ? conversa.utilizador2_id : conversa.utilizador1_id;

        janela.innerHTML = `
            <div class="chat-header"><div class="chat-header-info"><div class="chat-header-avatar">${nome.charAt(0).toUpperCase()}</div><div><div class="chat-header-nome">${nome}</div><div class="chat-header-status">Negociando: ${produto}</div></div></div><div class="chat-header-produto"><div class="chat-header-produto-info"><span class="chat-header-produto-preco">${preco}</span></div></div></div>
            <div class="chat-mensagens" id="mensagensContainer"><p class="text-center p-20">A carregar histórico...</p></div>
            <div class="chat-escrevendo-container escondido" id="typingIndicator"><div class="typing-bubble"><span></span><span></span><span></span></div><span class="typing-text">${nome} está a escrever...</span></div>
            <form class="chat-input-area" id="formEnviarMensagem"><input type="text" id="inputMensagem" placeholder="Escreva uma mensagem..." autocomplete="off" required><button type="submit" class="btn btn-primario chat-btn-enviar"><span class="material-symbols-outlined">send</span></button></form>`;

        try {
            const res = await window.api.conversas.obterMensagens(conversaId);
            if (res.sucesso) renderizarMensagens(res.dados);
        } catch { const c = get('mensagensContainer'); if (c) c.innerHTML = '<p class="text-center p-20 text-erro">Erro ao carregar mensagens.</p>'; }

        const formEnviar = get('formEnviarMensagem');
        const inputMsg = get('inputMensagem');
        if (formEnviar) {
            formEnviar.addEventListener('submit', (e) => {
                e.preventDefault();
                enviarMensagemChat(destinatarioId, conversa.produto_id, inputMsg.value);
                inputMsg.value = '';
                emitirEscrita(false);
            });
        }
        if (inputMsg) {
            inputMsg.addEventListener('input', () => {
                emitirEscrita(true);
                clearTimeout(statusEscrevendoTimeout);
                statusEscrevendoTimeout = setTimeout(() => emitirEscrita(false), 2000);
            });
        }
    };

    function renderizarMensagens(mensagens) {
        const container = get('mensagensContainer');
        if (!container) return;
        const msgs = [...mensagens].reverse();
        if (msgs.length === 0) { container.innerHTML = '<p class="text-center p-20 text-muted">Nenhuma mensagem.</p>'; return; }
        container.innerHTML = msgs.map(msg => {
            const souEu = msg.remetente_id === utilizadorLogado.id;
            return `<div class="mensagem-linha ${souEu ? 'enviada' : 'recebida'}"><div class="mensagem-balao"><div class="mensagem-conteudo">${escaparHtml(msg.conteudo)}</div><div class="mensagem-hora">${formatarHora(msg.criado_em)}</div></div></div>`;
        }).join('');
        scrollMensagensAoFundo();
    }

    function adicionarMensagemAoEcra(msg) {
        const container = get('mensagensContainer');
        if (!container) return;
        const placeholder = container.querySelector('.text-muted, .text-center');
        if (placeholder && container.children.length <= 2) placeholder.remove();
        const souEu = msg.remetente_id === utilizadorLogado.id;
        const div = document.createElement('div');
        div.className = `mensagem-linha ${souEu ? 'enviada' : 'recebida'}`;
        div.innerHTML = `<div class="mensagem-balao"><div class="mensagem-conteudo">${escaparHtml(msg.conteudo)}</div><div class="mensagem-hora">${formatarHora(msg.criado_em)}</div></div>`;
        container.appendChild(div);
        scrollMensagensAoFundo();
    }

    async function enviarMensagemChat(destinatarioId, produtoId, conteudo) {
        if (!conteudo.trim()) return;
        try { await window.api.conversas.enviar({ destinatario_id: destinatarioId, produto_id: produtoId, conteudo: conteudo.trim() }); }
        catch (erro) { notificar('Erro ao enviar mensagem.', 'erro'); }
    }

    function emitirEscrita(escrevendo) {
        if (!socket || !conversaAtiva || isTyping === escrevendo) return;
        isTyping = escrevendo;
        socket.emit('chat:escrevendo', { conversaId: conversaAtiva.id, escrevendo });
    }

    function mostrarIndicadorEscrita(escrevendo) {
        const ind = get('typingIndicator');
        if (!ind) return;
        if (escrevendo) { ind.classList.remove('escondido'); scrollMensagensAoFundo(); }
        else { ind.classList.add('escondido'); }
    }

    function scrollMensagensAoFundo() {
        const c = get('mensagensContainer');
        if (c) c.scrollTop = c.scrollHeight;
    }

    // ── Perfil ──
    async function carregarPerfilCompleto() {
        const container = get('perfilContainer');
        if (!container) return;
        try {
            const res = await window.api.utilizadores.perfil();
            const p = res.dados;
            
            let avaliacoesHtml = '';
            try {
                const resAv = await window.api.avaliacoes.listarPorUtilizador(p.id, 'vendedor');
                const avs = resAv.dados || [];
                const media = avs.length > 0 ? (avs.reduce((s, a) => s + a.estrelas, 0) / avs.length).toFixed(1) : 0;
                avaliacoesHtml = `<div style="margin-top:24px;padding-top:16px;border-top:1px solid #eee;">
                    <h3 style="margin-bottom:12px;"><span class="material-symbols-outlined" style="color:#f59e0b;">star</span> Avaliações (${avs.length}) — ${media} ★</h3>
                    ${avs.length === 0 ? '<p class="text-muted">Sem avaliações ainda.</p>' : avs.slice(0, 5).map(a => `<div style="padding:10px 0;border-bottom:1px solid #f3f4f6;"><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;"><div style="width:28px;height:28px;border-radius:50%;background:var(--cor-cyprus);color:white;display:flex;align-items:center;justify-content:center;font-size:0.75rem;">${(a.autor_nome || 'U').charAt(0)}</div><span style="font-weight:500;">${escaparHtml(a.autor_nome || 'U')}</span><span style="color:#f59e0b;font-size:0.8rem;">${'★'.repeat(a.estrelas)}${'☆'.repeat(5 - a.estrelas)}</span></div>${a.comentario ? `<p style="font-size:0.85rem;color:var(--cor-texto-mutado);margin-left:36px;">${escaparHtml(a.comentario)}</p>` : ''}</div>`).join('')}
                </div>`;
            } catch (e) { console.warn('Erro ao carregar avaliações:', e.message); }

            container.innerHTML = `
                <form id="formPerfil" class="perfil-form" data-tipo="${p.tipo}">
                    <h3 class="mb-10" style="border-bottom:1px solid #eee;padding-bottom:10px;">Dados Pessoais</h3>
                    <div class="campo-grupo"><label>Nome Completo</label><input type="text" value="${escaparHtml(p.nome || '')}" id="editNome" required></div>
                    <div class="campo-grupo"><label>Email</label><input type="email" value="${escaparHtml(p.email || '')}" disabled></div>
                    <div class="campo-grupo"><label>Telefone</label><input type="tel" value="${escaparHtml(p.telefone || '')}" id="editTelefone"></div>
                    <div class="campo-grupo"><label>Fotografia de Perfil</label><input type="file" id="editFoto" accept="image/*" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;"></div>
                    ${p.fotografia_perfil ? `<div style="margin-top:8px;"><img src="${resolverUrlImagem(p.fotografia_perfil)}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;border:2px solid #e5e7eb;"></div>` : ''}
                    <h3 class="mt-20 mb-10" style="border-bottom:1px solid #eee;padding-bottom:10px;">Dados da Loja</h3>
                    <div class="campo-grupo"><label>Nome da Loja / Marca</label><input type="text" id="editNomeLoja" value="${escaparHtml(p.nome_loja || '')}"></div>
                    <div class="campo-grupo"><label>Descrição da Loja</label><textarea id="editDescricaoLoja" rows="3" placeholder="Descreva os produtos ou serviços oferecidos...">${escaparHtml(p.descricao_loja || '')}</textarea></div>
                    <div class="campo-grupo"><label>Endereço Físico (Opcional)</label><input type="text" id="editEnderecoFisico" value="${escaparHtml(p.endereco_fisico || '')}"></div>
                    <div class="campo-grupo"><label>Métodos de Recebimento</label><input type="text" id="editMetodoRecebimento" placeholder="Ex: M-Pesa, e-Mola, Millennium BIM" value="${escaparHtml(p.metodo_recebimento || '')}"></div>
                    <button type="submit" class="btn btn-primario mt-10">Guardar Alterações</button>
                </form>
                ${avaliacoesHtml}`;
        } catch (erro) { container.innerHTML = `<p class="text-erro text-center p-20">Erro ao carregar perfil.</p>`; }
    }

    // ── Minha Subscrição ──
    async function carregarMinhaSubscricao() {
        const ct = get('subscricaoContainer'); if (!ct) return;
        try {
            const r = await window.api.subscricoes.minha();
            const ctx = r.dados || {};
            const sub = ctx.subscricao_actual || null;
            const planos = ctx.planos || [];
            
            let subHtml = '';
            if (sub && sub.activa) {
                subHtml = `<div style="background:linear-gradient(135deg,var(--cor-cyprus),#006b66);color:white;border-radius:16px;padding:24px;margin-bottom:24px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                        <span style="font-size:0.85rem;opacity:0.8;">Plano Actual</span>
                        <span style="background:rgba(255,255,255,0.2);padding:4px 12px;border-radius:20px;font-size:0.8rem;">Activo</span>
                    </div>
                    <h2 style="margin-bottom:4px;">${escaparHtml(sub.plano_nome || 'Plano')}</h2>
                    <p style="opacity:0.8;font-size:0.9rem;">Expira: ${sub.expira_em ? new Date(sub.expira_em).toLocaleDateString('pt-MZ') : 'Sem expiração'}</p>
                    <div style="margin-top:16px;display:flex;gap:16px;font-size:0.85rem;">
                        <span><span class="material-symbols-outlined">inventory_2</span> ${sub.limite_anuncios || '∞'} anúncios</span>
                        <span><span class="material-symbols-outlined">image</span> ${sub.limite_fotos || '∞'} fotos/produto</span>
                    </div>
                </div>`;
            } else {
                subHtml = '<div style="background:#fef3c7;border-radius:12px;padding:16px;margin-bottom:24px;"><p style="color:#92400e;"><span class="material-symbols-outlined">warning</span> Não tem um plano activo. Escolha um plano abaixo.</p></div>';
            }
            
            const planosHtml = planos.map(pl => `
                <div style="background:var(--cor-fundo);border:2px solid ${(sub && sub.plano_id === pl.id) ? 'var(--cor-cyprus)' : '#e5e7eb'};border-radius:12px;padding:20px;margin-bottom:12px;position:relative;">
                    ${(sub && sub.plano_id === pl.id) ? '<span style="position:absolute;top:12px;right:12px;background:var(--cor-cyprus);color:white;padding:2px 10px;border-radius:12px;font-size:0.75rem;">Actual</span>' : ''}
                    <h3 style="margin-bottom:4px;">${escaparHtml(pl.nome)}</h3>
                    <div style="font-size:1.5rem;font-weight:700;color:var(--cor-cyprus);margin-bottom:8px;">MZN ${formatarDinheiro(pl.preco)}/mês</div>
                    <p style="font-size:0.85rem;color:var(--cor-texto-mutado);margin-bottom:12px;">${escaparHtml(pl.descricao || '')}</p>
                    <div style="font-size:0.85rem;margin-bottom:12px;">
                        <p><span class="material-symbols-outlined" style="color:#10b981;">check</span> ${pl.limite_anuncios || '∞'} anúncios</p>
                        <p><span class="material-symbols-outlined" style="color:#10b981;">check</span> ${pl.limite_fotos || '∞'} fotos por produto</p>
                        ${pl.destaque ? '<p><span class="material-symbols-outlined" style="color:#10b981;">check</span> Destaque nas buscas</p>' : ''}
                    </div>
                    ${(!sub || sub.plano_id !== pl.id) ? `<button class="btn btn-primario btn-bloco" style="width:100%;" onclick="window.contratarPlano(${pl.id})">Escolher Plano</button>` : ''}
                </div>
            `).join('');
            
            ct.innerHTML = `<div style="padding:20px;"><h2 style="margin-bottom:20px;">Minha Subscrição</h2>${subHtml}<h3 style="margin-bottom:12px;">Planos Disponíveis</h3>${planosHtml}</div>`;
        } catch(e) {
            const msg = e.message.includes('vendedor') || e.message.includes('404')
                ? 'Precisa de ter uma loja aprovada para gerir subscrições.'
                : e.message;
            ct.innerHTML = `<div style="text-align:center;padding:40px;"><p class="text-erro">${escaparHtml(msg)}</p><button class="btn btn-primario mt-10" onclick="window.location.reload()">Tentar Novamente</button></div>`;
        }
    }

    window.contratarPlano = async function(planoId) {
        window.confirmarAcao('Contratar Plano', 'Deseja activar este plano?', async () => {
            try {
                await window.api.subscricoes.contratar({ plano_id: planoId });
                notificar('Plano activado com sucesso!', 'sucesso');
                carregarMinhaSubscricao();
            } catch(e) { notificar(e.message, 'erro'); }
        });
    };

    // ── Minhas Sanções (Vendedor) ──
    async function carregarMinhasSancoesVendedor() {
        const ct = get('sancoesContainer'); if (!ct) return;
        try {
            const r = await window.api.sancoes.minhas();
            const sancoes = r.dados || [];
            if (sancoes.length === 0) { ct.innerHTML = '<p class="text-center" style="padding:40px;color:var(--cor-texto-mutado);">Nenhuma sanção. Está tudo bem!</p>'; return; }
            ct.innerHTML = sancoes.map(s => {
                const tipoIcon = s.tipo === 'banimento' ? 'block' : s.tipo === 'suspensao' ? 'pause_circle' : 'warning';
                const tipoCor = s.tipo === 'banimento' ? '#dc2626' : s.tipo === 'suspensao' ? '#d97706' : '#3b82f6';
                return `<article class="pedido-card" style="border-left:4px solid ${tipoCor};"><div class="pedido-topo"><div style="display:flex;align-items:center;gap:8px;"><span class="material-symbols-outlined" style="color:${tipoCor};">${tipoIcon}</span><div><h3>${s.tipo.charAt(0).toUpperCase() + s.tipo.slice(1)}</h3><p>${escaparHtml(s.motivo)}</p></div></div><span class="pedido-estado ${s.activa ? 'bg-cancelado' : 'bg-entregue'}">${s.activa ? 'Activa' : 'Inactiva'}</span></div><div class="pedido-detalhes"><span>Data: ${formatarData(s.criado_em)}</span>${s.expira_em ? `<span>Expira: ${formatarData(s.expira_em)}</span>` : ''}</div></article>`;
            }).join('');
        } catch(e) { ct.innerHTML = `<p class="text-center text-erro">${escaparHtml(e.message)}</p>`; }
    }

    // ── Pesquisa no Header ──
    const inputBusca = document.querySelector('.input-busca-global');
    if (inputBusca) {
        let searchTimeout;
        inputBusca.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const termo = e.target.value.trim();
            searchTimeout = setTimeout(async () => {
                if (!termo) { carregarConteudoDashboard('meus-anuncios'); return; }
                try {
                    const container = get('vendedorContent') || get('adminContent');
                    if (!container) return;
                    container.innerHTML = '<div class="spinner-linka" style="margin:40px auto;"></div>';
                    const res = await window.api.produtos.listar(`?pesquisa=${encodeURIComponent(termo)}`);
                    const produtos = (res.dados || []).filter(p => p.vendedor_utilizador_id === utilizadorLogado.id);
                    if (produtos.length === 0) {
                        container.innerHTML = `<div class="admin-empty-state"><span class="material-symbols-outlined">search</span><h3>Sem resultados</h3><p>Nenhum anúncio encontrado para "${escaparHtml(termo)}".</p></div>`;
                    } else {
                        renderizarMeusAnuncios(produtos, container);
                    }
                } catch (err) { notificar('Erro na pesquisa.', 'erro'); }
            }, 400);
        });
    }

    // ── Inicialização ──
    verificarSessao();

})();
