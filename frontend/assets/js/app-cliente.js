/* ============================================================
   LINKA — Cliente App (Padrão linka2)
   SPA com carregarConteudoDashboard() + drawer + bottom nav
   ============================================================ */

(function () {
    'use strict';

    const get = (id) => document.getElementById(id);

    // ── Scroll Container (natural body scroll) ──
    function getScrollContainer() {
        return document.documentElement;
    }
    function getScrollTop() {
        return window.scrollY || document.documentElement.scrollTop;
    }
    function setScrollTop(val, behavior) {
        window.scrollTo({ top: val, behavior: behavior || 'auto' });
    }

    // ── Estado Global ──
    let utilizadorLogado = null;
    let socket = null;
    let conversaAtiva = null;
    let conversasCarregadas = [];
    let statusEscrevendoTimeout = null;
    let isTyping = false;
    let scrollEstavaNoFundo = true;

    // ── Chat Pagination State ──
    const CHAT_PAGE_SIZE = 30;
    let chatOffset = 0;
    let chatHaMais = true;
    let chatCarregandoMais = false;

    let paginaAtual = 1;
    let carregandoMais = false;
    let haMaisProdutos = true;
    const favoritosIds = new Set();

    // ── Feed Cursor State ──
    let feedNextCursor = null;
    let feedHasMore = true;
    let feedModo = 'algoritmico'; // Será actualizado para 'personalizado' se utilizador logado
    let feedSentinel = null;
    let feedObserver = null;
    let feedCache = [];
    let feedSentinelExplorar = null;
    let feedObserverExplorar = null;

    // ── View Tracking State ──
    let viewObserver = null;
    const viewTimers = new Map();
    const VIEW_THRESHOLD = 0.5;
    const VIEW_DELAY_MS = 2000;

    // ── Event Tracking Helper ──
    function registarEvento(produtoId, tipoEvento, duracaoMs = null) {
        if (!utilizadorLogado) return;
        try {
            window.api.eventos.registar({
                produto_id: produtoId,
                tipo_evento: tipoEvento,
                duracao_ms: duracaoMs,
            }).catch(() => {}); // silencioso
        } catch (e) { /* silencioso */ }
    }

    // ── Ad Tracking ──
    const _adsRastreados = new Set();
    function _trackAdImpressions(container) {
        const cards = container.querySelectorAll('.lk-product-card-ad[data-ad-id]');
        cards.forEach(card => {
            const adId = parseInt(card.dataset.adId);
            if (adId && !_adsRastreados.has(adId)) {
                _adsRastreados.add(adId);
                window.api.anuncios.trackImpressao(adId).catch(() => {});
            }
        });
    }
    window.trackAdClick = function(anuncioId) {
        if (anuncioId) window.api.anuncios.trackClique(anuncioId).catch(() => {});
    };

    // ── Navigation Stack ──
    const pilhaNavegacao = [];
    const scrollPositions = {};
    const MODAL_BASE_Z = 1000;
    let modalStack = [];
    let modalZIndex = MODAL_BASE_Z;

    const apiOrigin = window.linkaUtils.apiOrigin;
    const imagemProdutoPadrao = window.linkaUtils.imagemProdutoPadrao;
    const escaparHtml = window.linkaUtils.escaparHtml;
    const formatarMoeda = window.linkaUtils.formatarMoeda;
    const formatarDinheiro = window.linkaUtils.formatarDinheiro;
    const formatarData = window.linkaUtils.formatarData;
    const formatarHora = window.linkaUtils.formatarHora;
    const resolverUrlImagem = window.linkaUtils.resolverUrlImagem;
    const cssUrlImagem = window.linkaUtils.cssUrlImagem;
    const formatarDataRelativa = window.linkaUtils.formatarDataRelativa;
    const debounce = window.linkaUtils.debounce;
    const desativarBotao = window.linkaUtils.desativarBotao;
    const ativarBotao = window.linkaUtils.ativarBotao;
    window.gerarSkeletonProdutos = window.linkaUtils.gerarSkeletonProdutos;

    // ── Navigation Stack Helpers ──
    function guardarScrollPos(chave) {
        scrollPositions[chave] = getScrollTop();
    }

    function restaurarScrollPos(chave) {
        const pos = scrollPositions[chave] || 0;
        requestAnimationFrame(() => setScrollTop(pos, 'auto'));
    }

    function empurrarNavegacao(estado) {
        if (pilhaNavegacao.length > 0) {
            const actual = pilhaNavegacao[pilhaNavegacao.length - 1];
            actual.scrollY = getScrollTop();
        }
        pilhaNavegacao.push(estado);
    }

    function popNavegacao() {
        if (pilhaNavegacao.length <= 1) return null;
        return pilhaNavegacao.pop();
    }

    function obterAnterior() {
        if (pilhaNavegacao.length < 2) return null;
        return pilhaNavegacao[pilhaNavegacao.length - 2];
    }

    function empilharModal(modalEl) {
        modalZIndex += 10;
        modalStack.push({ el: modalEl, zIndex: modalZIndex });
        document.body.style.overflow = 'hidden';
    }

    function desempilharModal(modalEl) {
        modalStack = modalStack.filter(m => m.el !== modalEl);
        modalZIndex = MODAL_BASE_Z + (modalStack.length * 10);
        if (modalStack.length === 0) {
            document.body.style.overflow = '';
        }
    }

    window.voltarPagina = function () {
        const anterior = popNavegacao();
        if (!anterior) {
            mostrarSecaoCliente('inicio');
            definirTabClienteAtiva('inicio');
            restaurarScrollPos('inicio');
            return;
        }
        mostrarSecaoCliente(anterior.secao);
        definirTabClienteAtiva(anterior.tab);
        if (anterior.secao === 'dashboard' && anterior.vista) {
            window.carregarConteudoDashboard(anterior.vista);
        }
        if (anterior.secao === 'inicio') {
            carregarCategoriasFeed();
            carregarProdutosFeed(false);
        }
        if (anterior.secao === 'explorar') {
            carregarExploreFeed(false);
        }
        if (anterior.secao === 'mensagens') {
            inicializarModuloChat();
        }
        setTimeout(() => {
            setScrollTop(anterior.scrollY || 0, 'auto');
        }, 50);
        fecharDrawerCliente();
    };

    window.fecharModalDetalhes = function () {
        const md = get('modalDetalhes');
        if (md) {
            md.classList.remove('active');
            desempilharModal(md);
        }
    };

    window.fecharModalFilho = function (modalId) {
        const m = get(modalId);
        if (m) {
            m.classList.remove('active');
            desempilharModal(m);
        }
    };

    // Helpers importados de utils.js (window.linkaUtils)

    // ── Socket ──
    function conectarSocket() {
        const token = localStorage.getItem('linka_token');
        if (!token || (socket && socket.connected)) return;
        socket = io(window.API_BASE_URL.replace('/api', ''), { auth: { token } });
        socket.on('connect', () => console.log('[Socket] Conectado'));
        socket.on('chat:mensagem', (msg) => { if (conversaAtiva && conversaAtiva.id === msg.conversa_id) adicionarMensagemAoEcra(msg); recarregarListaConversas(); });
        socket.on('chat:escrevendo', (d) => { if (conversaAtiva && conversaAtiva.id === d.conversaId) mostrarIndicadorEscrita(d.escrevendo); });
    }
    function desconectarSocket() { if (socket) { socket.disconnect(); socket = null; } }
    function limparSessaoLocal() { localStorage.removeItem('linka_token'); desconectarSocket(); }

    // ── Push Notifications ──
    async function subscreverPush() {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
        try {
            const reg = await navigator.serviceWorker.register('/frontend/sw.js');
            const permissao = await Notification.requestPermission();
            if (permissao !== 'granted') return;

            const res = await window.api.push.obterChavePublica();
            const chave = res.dados?.chave;
            if (!chave) return;

            const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(chave)
            });

            await window.api.push.subscrever(sub.toJSON());
            console.log('[Push] Subscrito com sucesso');
        } catch (e) {
            console.warn('[Push] Erro ao subscrever:', e.message);
        }
    }

    function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; i++) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    // ── Notificações (Bell) ──
    window.carregarNotificacoes = async function () {
        try {
            // Buscar notificações reais da API
            const res = await window.api.notificacoes.listar(50, 0, true);
            const total = res.dados?.total_nao_lidas || 0;
            const badge = document.getElementById('notifBadge');
            if (total > 0) { if (badge) { badge.textContent = total; badge.style.display = 'flex'; } }
            else { if (badge) badge.style.display = 'none'; }
        } catch { /* silencioso */ }
    };

    // ── Auth ──
    async function verificarSessao() {
        const token = localStorage.getItem('linka_token');
        if (!token) { window.location.href = '../index.html'; return; }
        try {
            const res = await window.api.utilizadores.perfil();
            if (res.sucesso && res.dados.tipo === 'cliente') {
                utilizadorLogado = res.dados; conectarSocket(); atualizarInterfaceAutenticada(); subscreverPush();
            } else { window.location.href = '../index.html'; }
        } catch (e) {
            if (e._abortado) return;
            window.location.href = '../index.html';
        }
    }

    function atualizarInterfaceAutenticada() {
        const dn = get('drawer-nome'); if (dn) dn.textContent = utilizadorLogado.nome;
        const dt = get('drawer-tag'); if (dt) dt.textContent = 'Cliente';
        const da = get('drawer-avatar'); if (da) {
            const ini = utilizadorLogado.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            da.innerHTML = ini;
        }
        const ha = get('headerAvatar'); if (ha) {
            const ini = utilizadorLogado.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            ha.innerHTML = `<span class="user-avatar-initials">${ini}</span>`;
        }
        const bn = get('bottomNavGlobal'); if (bn) bn.classList.remove('escondido');
        carregarFavoritosIds();
        irParaHomeCliente();
        setTimeout(window.carregarNotificacoes, 1000);
    }

    async function fazerLogout() {
        window.confirmarAcao('Terminar Sessão', 'Tem a certeza?', async () => {
            try { await window.api.auth.logout(); } catch (e) { console.warn('Logout API error:', e.message); } limparSessaoLocal(); window.location.href = '../index.html';
        });
    }

    document.querySelectorAll('[data-logout]').forEach(el => el.addEventListener('click', fazerLogout));

    // ── Navegação ──
    function mostrarSecaoCliente(secao) {
        const mapa = [
            { id: 'homeCliente', key: 'inicio' },
            { id: 'dashboard', key: 'dashboard' },
            { id: 'feedSection', key: 'feed' },
            { id: 'galeriaSection', key: 'explorar' },
            { id: 'chatSection', key: 'mensagens' }
        ];
        mapa.forEach(({ id, key }) => {
            const el = get(id);
            if (!el) return;
            const activo = (key === secao);
            el.classList.toggle('escondido', !activo);
            el.classList.toggle('ativo', activo);
        });
        // Toggle body classes for full-screen sections
        document.body.classList.toggle('chat-active', secao === 'mensagens');
        document.body.classList.toggle('feed-active', secao === 'feed');
    }

    function definirTabClienteAtiva(tabId) {
        const t = tabId === 'feed' ? 'feed' : tabId;
        document.querySelectorAll('.lk-nav-item, .nav-item-app, .nav-item-post, .sidebar-drawer .menu-item').forEach(i => i.classList.remove('ativo'));
        document.querySelectorAll(`[data-tab="${t}"]`).forEach(i => i.classList.add('ativo'));
    }

    function fecharDrawerCliente() {
        if (window.innerWidth > 768) return;
        const dr = get('mobileDrawer'), ov = get('drawerOverlay');
        if (dr) { dr.style.display = 'none'; dr.classList.remove('open'); }
        if (ov) ov.style.display = 'none';
    }
    window.fecharDrawerCliente = fecharDrawerCliente;

    function trocarTabCliente(tabId, el) {
        const mapa = { post: 'feed', pesquisa: 'compras', perfil: 'meu-perfil', carrinho: 'compras' };
        const destino = mapa[tabId] || tabId;

        let secaoAlvo = 'dashboard';
        let vistaAlvo = destino;
        if (destino === 'inicio') { secaoAlvo = 'inicio'; vistaAlvo = null; }
        else if (destino === 'feed') { secaoAlvo = 'feed'; vistaAlvo = null; }
        else if (destino === 'explorar') { secaoAlvo = 'explorar'; vistaAlvo = null; }
        else if (destino === 'mensagens') { secaoAlvo = 'mensagens'; vistaAlvo = null; }

        empurrarNavegacao({ secao: secaoAlvo, tab: tabId, vista: vistaAlvo, scrollY: getScrollTop() });

        if (destino === 'inicio') { mostrarSecaoCliente('inicio'); carregarCategoriasFeed(); carregarProdutosFeed(true); }
        else if (destino === 'feed') { abrirFeedSocial(); }
        else if (destino === 'explorar') { mostrarSecaoCliente('explorar'); carregarExploreFeed(); }
        else if (destino === 'mensagens') { mostrarSecaoCliente('mensagens'); inicializarModuloChat(); }
        else { mostrarSecaoCliente('dashboard'); window.carregarConteudoDashboard(destino); }

        definirTabClienteAtiva(tabId);
        fecharDrawerCliente();
    }

    window.switchTabCliente = trocarTabCliente;

    // ── Home: Categorias (Pills) ──
    async function carregarCategoriasFeed() {
        const pills = get('lkCategoryPills'); if (!pills) return;
        try {
            const res = await window.api.categorias.listar();
            const cats = res.dados || [];
            pills.innerHTML = `<button class="lk-pill ativo" data-cat="all">All Items</button>` +
                cats.map(c => `<button class="lk-pill" data-cat="${c.id}">${escaparHtml(c.nome)}</button>`).join('');
            pills.querySelectorAll('.lk-pill').forEach(btn => {
                btn.addEventListener('click', () => {
                    pills.querySelectorAll('.lk-pill').forEach(b => b.classList.remove('ativo'));
                    btn.classList.add('ativo');
                    const catId = btn.dataset.cat;
                    if (catId === 'all') carregarProdutosFeed(true);
                    else window.filtrarPorCategoria(catId);
                });
            });
        } catch { /* silent */ }
    }

    window.filtrarPorCategoria = async (catId) => {
        const grid = get('gridProdutosCliente'); if (!grid) return;
        try { grid.innerHTML = gerarSkeletonLk(4); const res = await window.api.produtos.listar(`?categoria=${catId}`); renderizarProdutosLk(res.dados, grid); } catch { notificar('Erro ao filtrar', 'erro'); }
    };

    // ── Pesquisa ──
    window.executarPesquisa = async () => {
        const input = get('appSearchInput');
        const termo = input ? input.value.trim() : '';
        if (!termo) return;
        const grid = get('gridProdutosCliente'); if (!grid) return;
        try {
            grid.innerHTML = gerarSkeletonLk(4);
            mostrarSecaoCliente('inicio');
            definirTabClienteAtiva('inicio');
            const res = await window.api.produtos.listar(`?busca=${encodeURIComponent(termo)}&pagina=1&limite=20`);
            renderizarProdutosLk(res.dados, grid);
        } catch { notificar('Erro ao pesquisar', 'erro'); }
    };
    window.executarBusca = window.executarPesquisa;

    const appSearchInput = get('appSearchInput');
    if (appSearchInput) {
        appSearchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') window.executarPesquisa(); });
    }

    // ── Home: Produtos (Novo Layout) ──
    function gerarSkeletonLk(q = 4) {
        return Array(q).fill('').map(() => `<div class="lk-product-card"><div class="lk-product-img skeleton"></div><div class="lk-product-info"><div class="skeleton" style="width:60%;height:12px;border-radius:4px;"></div><div class="skeleton" style="width:80%;height:14px;border-radius:4px;margin-top:6px;"></div><div class="skeleton" style="width:40%;height:16px;border-radius:4px;margin-top:6px;"></div></div></div>`).join('');
    }

    function renderizarProdutosLk(produtos, container) {
        if (!produtos || produtos.length === 0) {
            const html = '<p class="text-center" style="grid-column:1/-1;padding:40px;color:#9ca3af;">Nenhum produto encontrado.</p>';
            if (container) container.innerHTML = html;
            return html;
        }
        const html = produtos.map(p => {
            const imgPath = (p.imagens && p.imagens[0]) ? (typeof p.imagens[0] === 'string' ? p.imagens[0] : p.imagens[0].caminho) : p.imagem_url;
            const preco = p.preco ? `MZN ${formatarDinheiro(p.preco)}` : '';
            const nomeLoja = p.nome_loja || p.vendedor_nome || '';
            const isFav = favoritosIds.has(p.id);
            const isAd = p._isAd;

            if (isAd) {
                return _renderizarAnuncio(p, imgPath, preco, nomeLoja, isFav);
            }

            return `
            <div class="lk-product-card" onclick="window.abrirDetalhes(${p.id})">
                <div class="lk-product-card-img" style="background-image:${cssUrlImagem(imgPath)}">
                    <button class="lk-product-card-fav${isFav ? ' fav' : ''}" onclick="event.stopPropagation();window.toggleFavorito(${p.id}, this)" title="Favoritar">
                        <span class="material-symbols-outlined"${isFav ? ' style="color:var(--error,#ef4444)"' : ''}>favorite</span>
                    </button>
                    ${preco ? `<span class="lk-product-card-price">${preco}</span>` : ''}
                </div>
                <div class="lk-product-card-body">
                    <div class="lk-product-card-cat">${escaparHtml(p.categoria_nome || 'Geral')}</div>
                    <div class="lk-product-card-name">${escaparHtml(p.titulo)}</div>
                    <div class="lk-product-card-seller">
                        <div class="lk-product-card-avatar">${nomeLoja ? nomeLoja.charAt(0).toUpperCase() : 'L'}</div>
                        <span>${escaparHtml(nomeLoja || 'Linka')}</span>
                    </div>
                </div>
            </div>`;
        }).join('');
        if (container) container.innerHTML = html;
        // Tracking de impressões de anúncios
        if (container) setTimeout(() => _trackAdImpressions(container), 500);
        return html;
    }

    function _renderizarAnuncio(p, imgPath, preco, nomeLoja, isFav) {
        const adId = p._anuncio_id;
        const tipo = p.tipo_anuncio || 'imagem';
        const offerText = p.texto_oferta || '';
        const onclick = `window.abrirDetalhes(${p.produto_id})`;
        const trackClick = `event.stopPropagation();window.trackAdClick(${adId});${onclick}`;

        let mediaHtml = '';
        let badgeHtml = '';
        let extraClass = '';

        switch (tipo) {
            case 'video':
                extraClass = ' lk-ad-video';
                const videoUrl = p.video_url || '';
                if (videoUrl) {
                    mediaHtml = `<video src="${escaparHtml(videoUrl)}" muted loop playsinline class="lk-ad-media" onmouseenter="this.play()" onmouseleave="this.pause();this.currentTime=0;"></video>`;
                } else {
                    mediaHtml = `<div class="lk-ad-media" style="background-image:${cssUrlImagem(imgPath)}"></div>`;
                }
                badgeHtml = '<div class="lk-ad-type-badge lk-ad-type-video"><span class="material-symbols-outlined">play_circle</span></div>';
                break;

            case 'oferta':
                extraClass = ' lk-ad-offer';
                mediaHtml = `<div class="lk-ad-media" style="background-image:${cssUrlImagem(imgPath)}"></div>`;
                badgeHtml = offerText
                    ? `<div class="lk-ad-offer-badge">${escaparHtml(offerText)}</div>`
                    : '<div class="lk-ad-offer-badge">OFERTA</div>';
                break;

            case 'animated':
                extraClass = ' lk-ad-animated';
                mediaHtml = `<div class="lk-ad-media lk-ad-animated-img" style="background-image:${cssUrlImagem(imgPath)}"></div>`;
                badgeHtml = '<div class="lk-ad-type-badge lk-ad-type-animated"><span class="material-symbols-outlined">animation</span></div>';
                break;

            default: // imagem
                mediaHtml = `<div class="lk-ad-media" style="background-image:${cssUrlImagem(imgPath)}"></div>`;
                break;
        }

        const adBadge = `<div class="lk-ad-badge" onclick="${trackClick}">Patrocinado</div>`;

        return `
        <div class="lk-product-card lk-product-card-ad${extraClass}" onclick="${onclick}" data-ad-id="${adId}">
            <div class="lk-product-card-img">
                ${mediaHtml}
                ${adBadge}
                ${badgeHtml}
                <button class="lk-product-card-fav${isFav ? ' fav' : ''}" onclick="event.stopPropagation();window.toggleFavorito(${p.produto_id}, this)" title="Favoritar">
                    <span class="material-symbols-outlined"${isFav ? ' style="color:var(--error,#ef4444)"' : ''}>favorite</span>
                </button>
                ${preco ? `<span class="lk-product-card-price">${preco}</span>` : ''}
            </div>
            <div class="lk-product-card-body">
                <div class="lk-product-card-cat">${escaparHtml(p.categoria_nome || 'Geral')}</div>
                <div class="lk-product-card-name">${escaparHtml(p.titulo)}</div>
                <div class="lk-product-card-seller">
                    <div class="lk-product-card-avatar">${nomeLoja ? nomeLoja.charAt(0).toUpperCase() : 'L'}</div>
                    <span>${escaparHtml(nomeLoja || 'Linka')}</span>
                </div>
            </div>
        </div>`;
    }

    window.toggleFavorito = async function(produtoId, btn) {
        try {
            const eraFav = favoritosIds.has(produtoId);
            if (eraFav) {
                await window.api.favoritos.remover(produtoId);
                favoritosIds.delete(produtoId);
                if (btn) {
                    btn.classList.remove('fav');
                    const ico = btn.querySelector('.material-symbols-outlined');
                    if (ico) ico.style.color = '';
                }
                // Registar evento de comportamento
                registarEvento(produtoId, 'unfavorite');
                notificar('Removido dos favoritos.', 'info');
            } else {
                await window.api.favoritos.adicionar(produtoId);
                favoritosIds.add(produtoId);
                if (btn) {
                    btn.classList.add('fav');
                    const ico = btn.querySelector('.material-symbols-outlined');
                    if (ico) ico.style.color = 'var(--error, #ef4444)';
                }
                // Registar evento de comportamento
                registarEvento(produtoId, 'favorite');
                notificar('Adicionado aos favoritos.', 'sucesso');
            }
        } catch (e) { notificar(e.message, 'erro'); }
    };

    async function carregarFavoritosIds() {
        if (!utilizadorLogado) return;
        try {
            const res = await window.api.favoritos.listar();
            const favs = res.dados || [];
            favoritosIds.clear();
            favs.forEach(f => {
                const pid = f.produto_id || f.id;
                if (pid) favoritosIds.add(pid);
            });
        } catch (e) { /* silencioso */ }
    }

    function formatarCount(n) {
        if (!n && n !== 0) return '0';
        n = parseInt(n) || 0;
        return n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n);
    }

    async function carregarProdutosFeed(reset = true) {
        const grid = get('gridProdutosCliente'); if (!grid) return;
        if (reset) {
            paginaAtual = 1;
            feedNextCursor = null;
            feedHasMore = true;
            carregandoMais = false;
            feedCache = [];
            // Usar modo personalizado se utilizador está logado
            feedModo = utilizadorLogado ? 'personalizado' : 'algoritmico';
            // Tentar carregar do cache local
            const cached = window.linkaFeedCache?.obter('home');
            if (cached && cached.length > 0) {
                feedCache = cached;
                renderizarProdutosLk(cached, grid);
            } else {
                grid.innerHTML = gerarSkeletonLk(4);
            }
        }
        if (carregandoMais || !feedHasMore) return;
        carregandoMais = true;

        try {
            if (reset) grid.innerHTML = gerarSkeletonLk(4);
            const res = await window.api.produtos.feedCursor(
                feedNextCursor,
                20,
                feedModo
            );
            const resultado = res.dados || {};
            const produtos = resultado.dados || [];
            feedNextCursor = resultado.nextCursor;
            feedHasMore = resultado.hasMore;

            if (produtos.length === 0 && feedCache.length === 0) {
                grid.innerHTML = '<p class="text-center" style="grid-column:1/-1;padding:40px;color:#9ca3af;">Nenhum produto encontrado.</p>';
                return;
            }

            if (reset) grid.innerHTML = '';

            // Adicionar ao cache local
            feedCache = [...feedCache, ...produtos];
            if (window.linkaFeedCache) {
                window.linkaFeedCache.guardar('home', feedCache);
            }

            const tmp = document.createElement('div');
            grid.insertAdjacentHTML('beforeend', renderizarProdutosLk(produtos, tmp));

            // Inserir sentinel para infinite scroll
            if (feedSentinel) feedSentinel.remove();
            if (feedHasMore) {
                feedSentinel = document.createElement('div');
                feedSentinel.id = 'feed-sentinel';
                feedSentinel.style.height = '1px';
                grid.appendChild(feedSentinel);
                if (feedObserver) feedObserver.observe(feedSentinel);
            }

            // Banner
            if (reset) {
                const banner = get('bannerOfertaSemana');
                if (banner && feedCache.length > 0) {
                    const destaque = feedCache[0];
                    const imgPath = (destaque.imagens && destaque.imagens[0]) ? (typeof destaque.imagens[0] === 'string' ? destaque.imagens[0] : destaque.imagens[0].caminho) : destaque.imagem_url;
                    banner.innerHTML = `<div class="oferta-badge">OFERTA DA SEMANA</div><h2>${destaque.titulo}</h2><button class="btn btn-branco-app" onclick="window.abrirDetalhes(${destaque.id})">Ver Oferta</button>`;
                    if (imgPath) { banner.style.backgroundImage = `linear-gradient(to right, rgba(0,70,67,0.9) 0%, rgba(0,70,67,0.4) 100%), ${cssUrlImagem(imgPath)}`; banner.style.backgroundSize = 'cover'; banner.style.backgroundPosition = 'center'; }
                }
            }

            // Renderizar Reels (TikTok-style) apenas no reset
            if (reset) {
                const feedContainer = get('lkFeedContainer');
                if (feedContainer && feedCache.length > 0) {
                    feedContainer.innerHTML = feedCache.map((p, i) => {
                        const imgPath = (p.imagens && p.imagens[0]) ? (typeof p.imagens[0] === 'string' ? p.imagens[0] : p.imagens[0].caminho) : p.imagem_url;
                        const img = resolverUrlImagem(imgPath);
                        const nome = p.nome_loja || p.vendedor_nome || 'Vendedor';
                        const ini = nome.charAt(0).toUpperCase();
                        const preco = p.preco ? `MZN ${formatarDinheiro(p.preco)}` : '';
                        const isFav = favoritosIds.has(p.id);
                        const likesStr = formatarCount(p.total_favoritos || 0);
                        const comments = p.total_comentarios || 0;
                        const desc = p.descricao ? escaparHtml(p.descricao).substring(0, 120) : escaparHtml(p.titulo);
                        const confScore = p.vendedor_confianca ? Math.round(p.vendedor_confianca) : null;
                        const confBadge = confScore >= 80 ? ' verified-badge' : confScore >= 60 ? ' trusted-badge' : '';
                        return `<section class="lk-reel-item" data-produto-id="${p.id}">
                            <div class="lk-reel-bg">
                                <img src="${img}" alt="${escaparHtml(p.titulo)}" loading="${i < 2 ? 'eager' : 'lazy'}">
                            </div>
                            <!-- Right Interaction Stack -->
                            <div class="lk-reel-actions">
                                <button class="lk-reel-action-btn${isFav ? ' fav' : ''}" onclick="event.stopPropagation();window.toggleFavorito(${p.id}, this)">
                                    <span class="material-symbols-outlined text-shadow font-variation-fill"${isFav ? ' style="color:var(--error,#ef4444)"' : ''}>favorite</span>
                                    <span class="lk-reel-action-count text-shadow">${likesStr}</span>
                                </button>
                                <button class="lk-reel-action-btn" onclick="event.stopPropagation();window.abrirComentarios(${p.id}, ${p.vendedor_utilizador_id || 0})">
                                    <span class="material-symbols-outlined text-shadow">chat_bubble</span>
                                    <span class="lk-reel-action-count text-shadow">${formatarCount(comments)}</span>
                                </button>
                                <button class="lk-reel-action-btn" onclick="event.stopPropagation();window.notificar('Opções: denunciar, bloquear...', 'info')">
                                    <span class="material-symbols-outlined text-shadow">more_horiz</span>
                                </button>
                            </div>
                            <!-- Bottom Info Overlay -->
                            <div class="lk-reel-info gradient-overlay-bottom">
                                <div class="lk-reel-info-header">
                                    <span class="lk-reel-info-name text-shadow">${escaparHtml(nome)}${confBadge}</span>
                                    <button class="lk-reel-follow-btn" onclick="event.stopPropagation();window.seguirVendedor(${p.vendedor_utilizador_id || 0}, this)">Seguir</button>
                                </div>
                                <h2 class="lk-reel-info-desc text-shadow" style="font-weight:800;font-size:1rem;margin-bottom:6px;-webkit-line-clamp:1;">${escaparHtml(p.titulo)}</h2>
                                <p class="lk-reel-info-desc text-shadow">${desc}</p>
                                ${preco ? `<div class="lk-reel-info-price"><span class="material-symbols-outlined">shopping_bag</span> ${preco}</div>` : ''}
                            </div>
                        </section>`;
                    }).join('');
                } else if (feedContainer) { feedContainer.innerHTML = '<div class="lk-reels-loading"><p style="color:#9ca3af;">Nenhuma novidade no feed.</p></div>'; }
            }

            // Iniciar view tracking para novos produtos
            iniciarViewTracking();

        } catch (e) { if (reset) grid.innerHTML = `<p class="text-center erro">${e.message}</p>`; }
        finally { carregandoMais = false; }
    }

    // ── Banner Destaque ──
    async function carregarBannerDestaque() {
        const banner = get('lkBanner'); if (!banner) return;
        try {
            const res = await window.api.produtos.listar('?pagina=1&limite=3');
            const produtos = res.dados || [];
            if (produtos.length === 0) return;
            const p = produtos[Math.floor(Math.random() * Math.min(produtos.length, 3))];
            const imgPath = (p.imagens && p.imagens[0]) ? (typeof p.imagens[0] === 'string' ? p.imagens[0] : p.imagens[0].caminho) : p.imagem_url;
            const preco = p.preco ? `MZN ${formatarDinheiro(p.preco)}` : '';
            banner.innerHTML = `
                <div class="lk-banner-bg"${imgPath ? ` style="background-image:${cssUrlImagem(imgPath)}"` : ''}></div>
                <div class="lk-banner-content">
                    <span class="lk-banner-tag">${escaparHtml(p.categoria_nome || 'Destaque')}</span>
                    <h2 class="lk-banner-title">${escaparHtml(p.titulo)}</h2>
                    <div class="lk-banner-price">${preco}</div>
                    <button class="lk-banner-btn" onclick="window.abrirDetalhes(${p.id})">Ver Oferta</button>
                </div>`;
        } catch { /* silent */ }
    }

    // ── Explore Feed (Pinterest/Instagram Grid) ──
    let lkFeedCache = [];
    let lkFeedFiltro = 'all';
    let lkFeedTermoBusca = '';
    let lkExplorePagina = 1;
    let lkExploreCarregando = false;
    let lkExploreHaMais = true;
    let lkTendenciasHeader = [];

    async function carregarExploreFeed(reset = true) {
        const grid = get('lkMasonryGrid');
        if (!grid) return;
        if (reset) {
            lkExplorePagina = 1;
            lkExploreHaMais = true;
            lkExploreCarregando = false;
            grid.innerHTML = '<div class="lk-bento-item large skeleton"></div><div class="lk-bento-item square skeleton"></div><div class="lk-bento-item square skeleton"></div><div class="lk-bento-item square skeleton"></div><div class="lk-bento-item square skeleton"></div><div class="lk-bento-item square skeleton"></div><div class="lk-bento-item square skeleton"></div>';
        }
        if (lkExploreCarregando || !lkExploreHaMais) return;
        lkExploreCarregando = true;

        try {
            const params = new URLSearchParams({ pagina: lkExplorePagina, limite: 12 });

            if (lkFeedTermoBusca) {
                params.set('busca', lkFeedTermoBusca);
            } else if (lkFeedFiltro && lkFeedFiltro !== 'all') {
                const slugMap = { trending: null, fashion: 'moda', electronics: 'eletronicos', decoracao: 'decoracao', esportes: 'esportes', videos: 'videos' };
                if (lkFeedFiltro === 'trending') {
                    try {
                        const r = await window.api.tendencias.listar('24h', null, 20);
                        lkTendenciasHeader = r.dados || [];
                    } catch(e) {
                        lkTendenciasHeader = [];
                    }
                    try {
                        const altaRes = await window.api.tendencias.conteudoAlta('24h', null, 20);
                        lkFeedCache = reset ? (altaRes.dados || []) : [...lkFeedCache, ...(altaRes.dados || [])];
                    } catch(e) {
                        lkFeedCache = [];
                    }
                    if (reset) renderizarExploreFeed(lkFeedCache, grid);
                    lkExploreCarregando = false;
                    return;
                } else if (lkFeedFiltro === 'alta') {
                    lkTendenciasHeader = [];
                    try {
                        const r = await window.api.tendencias.conteudoAlta('24h', null, 30);
                        lkFeedCache = reset ? (r.dados || []) : [...lkFeedCache, ...(r.dados || [])];
                    } catch(e) {
                        lkFeedCache = [];
                    }
                    if (reset) renderizarExploreFeed(lkFeedCache, grid);
                    lkExploreCarregando = false;
                    return;
                } else if (slugMap[lkFeedFiltro]) {
                    params.set('categoria_slug', slugMap[lkFeedFiltro]);
                }
            }

            const qs = params.toString();
            const r = await window.api.explore.listar(qs);
            const novos = r.dados?.dados || r.dados || [];
            if (reset) {
                lkFeedCache = novos;
            } else {
                lkFeedCache = [...lkFeedCache, ...novos];
            }
            if (novos.length < 12) lkExploreHaMais = false;
            renderizarExploreFeed(lkFeedCache, grid);
            // Actualizar sentinel para explore
            if (feedSentinelExplorar) feedSentinelExplorar.remove();
            if (lkExploreHaMais) {
                feedSentinelExplorar = document.createElement('div');
                feedSentinelExplorar.id = 'explore-sentinel';
                feedSentinelExplorar.style.height = '1px';
                grid.appendChild(feedSentinelExplorar);
                if (feedObserverExplorar) feedObserverExplorar.observe(feedSentinelExplorar);
            }
            lkExplorePagina++;
        } catch (e) {
            if (reset) grid.innerHTML = '<p class="text-center" style="padding:40px;color:#9ca3af;">Não foi possível carregar o feed.</p>';
        } finally {
            lkExploreCarregando = false;
        }
    }

    function renderizarExploreFeed(produtos, grid) {
        if (!grid) return;
        if (!produtos.length && !lkTendenciasHeader.length) { grid.innerHTML = '<p class="text-center" style="padding:40px;color:#9ca3af;">Nenhum produto encontrado.</p>'; return; }
        const bentoTypes = ['large', 'square', 'square', 'square', 'square', 'square', 'square'];
        let headerHtml = '';
        if (lkTendenciasHeader.length > 0) {
            headerHtml = `<div style="grid-column: 1 / -1; padding: 8px 0 12px;">
                <h3 style="font-size: 0.95rem; font-weight: 600; margin-bottom: 10px;">Em Tendência Agora</h3>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${lkTendenciasHeader.map(t => `<div class="lk-explore-chip" style="pointer-events:none;background:var(--cor-cyprus);color:white;"><span class="material-symbols-outlined" style="font-size:16px;">${t.tipo === 'hashtag' ? 'tag' : t.tipo === 'categoria' ? 'category' : 'location_on'}</span>${escaparHtml(t.termo)}<span style="opacity:0.7;font-size:0.75rem;margin-left:4px;">${t.contagem}</span></div>`).join('')}
                </div>
            </div>`;
            lkTendenciasHeader = [];
        }
        if (!produtos.length) { grid.innerHTML = headerHtml; return; }
        grid.innerHTML = headerHtml + produtos.map((p, i) => {
            const bt = bentoTypes[i % bentoTypes.length];
            const imgPath = (p.imagens && p.imagens[0]) ? (typeof p.imagens[0] === 'string' ? p.imagens[0] : p.imagens[0].caminho) : p.imagem_url;
            const img = resolverUrlImagem(imgPath);
            const cat = p.categoria_nome || p.categoria || '';
            const delay = Math.min(i * 0.06, 0.4);
            const preco = p.preco ? `MZN ${formatarDinheiro(p.preco)}` : '';
            let inner = `<img src="${img}" alt="${escaparHtml(p.titulo)}" loading="lazy">`;
            if (bt === 'large') {
                inner += `<div class="lk-bento-badge">SPONSORED</div>`;
                inner += `<div class="lk-bento-price">${preco}</div>`;
            } else {
                if (preco) inner += `<div class="lk-bento-price">${preco}</div>`;
            }
            return `<div class="lk-bento-item ${bt}" onclick="window.abrirDetalhes(${p.id})" style="animation-delay:${delay}s;">${inner}</div>`;
        }).join('');
    }

    function filtrarExploreFeed(filtro) {
        lkFeedFiltro = filtro;
        lkFeedTermoBusca = '';
        const searchInput = get('lkExploreSearch');
        if (searchInput) searchInput.value = '';
        carregarExploreFeed(true);
    }
    window.filtrarExploreFeed = filtrarExploreFeed;

    function irParaHomeCliente() {
        empurrarNavegacao({ secao: 'inicio', tab: 'inicio', scrollY: 0 });
        mostrarSecaoCliente('inicio');
        carregarCategoriasFeed();
        carregarProdutosFeed(true);
        carregarBannerDestaque();

        // Intersection Observer para infinite scroll (substitui scroll listener)
        if (feedObserver) feedObserver.disconnect();
        if (!feedObserver) {
            const rootEl = getScrollContainer();
            feedObserver = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && !carregandoMais && feedHasMore) {
                    carregarProdutosFeed(false);
                }
            }, { root: rootEl === document.documentElement ? null : rootEl, rootMargin: '200px' });
        }

        // Pull-to-refresh
        configurarPullToRefresh();

        setScrollTop(0, 'smooth');
    }

    // ── View Tracking (Intersection Observer) ──
    function iniciarViewTracking() {
        if (viewObserver) viewObserver.disconnect();
        viewTimers.clear();

        viewObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const produtoId = entry.target.dataset?.produtoId;
                if (!produtoId) return;

                if (entry.isIntersecting) {
                    // Iniciar timer para registar view
                    const timer = setTimeout(() => {
                        registrarVisualizacao(produtoId);
                        viewTimers.delete(produtoId);
                    }, VIEW_DELAY_MS);
                    viewTimers.set(produtoId, timer);
                } else {
                    // Cancelar timer se sair da tela
                    const timer = viewTimers.get(produtoId);
                    if (timer) {
                        clearTimeout(timer);
                        viewTimers.delete(produtoId);
                    }
                }
            });
        }, { threshold: VIEW_THRESHOLD });

        // Observar todos os itens do feed
        document.querySelectorAll('[data-produto-id]').forEach(el => {
            viewObserver.observe(el);
        });
    }

    async function registrarVisualizacao(produtoId) {
        try {
            let sessionId = localStorage.getItem('linka_session_id');
            if (!sessionId) {
                sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                localStorage.setItem('linka_session_id', sessionId);
            }
            await window.api.produtos.registrarVisualizacao(produtoId, sessionId);
            // Registar evento de comportamento para recomendação
            registarEvento(produtoId, 'view');
            // Registar como visto recentemente (se logado)
            if (utilizadorLogado) {
                window.api.recentementeVistos.registar(produtoId).catch(() => {});
            }
        } catch (e) {
            // Silencioso — views não são críticas
        }
    }

    // ── Pull-to-Refresh ──
    function configurarPullToRefresh() {
        let startY = 0;
        let pulling = false;
        let indicator = null;

        const home = get('homeCliente');
        if (!home) return;

        home.addEventListener('touchstart', (e) => {
            if (getScrollTop() === 0 && e.touches.length === 1) {
                startY = e.touches[0].clientY;
                pulling = true;
            }
        }, { passive: true });

        home.addEventListener('touchmove', (e) => {
            if (!pulling) return;
            const delta = e.touches[0].clientY - startY;
            if (delta > 60 && getScrollTop() === 0) {
                if (!indicator) {
                    indicator = document.createElement('div');
                    indicator.style.cssText = 'position:fixed;top:60px;left:50%;transform:translateX(-50%);z-index:9999;background:var(--primary,#004643);color:#fff;padding:8px 20px;border-radius:20px;font-size:0.85rem;font-weight:600;display:flex;align-items:center;gap:8px;box-shadow:0 2px 12px rgba(0,0,0,0.15);';
                    indicator.innerHTML = '<div class="spinner-linka" style="width:16px;height:16px;border-width:2px;"></div> A actualizar...';
                    document.body.appendChild(indicator);
                }
            }
        }, { passive: true });

        home.addEventListener('touchend', async () => {
            if (!pulling) return;
            pulling = false;
            if (indicator) {
                indicator.remove();
                indicator = null;
                // Buscar produtos mais recentes
                if (feedCache.length > 0) {
                    try {
                        const primeiroId = feedCache[0].id;
                        const res = await window.api.produtos.feedLatest(primeiroId, 20);
                        const novos = res.dados?.newPosts || [];
                        if (novos.length > 0) {
                            feedCache = [...novos, ...feedCache];
                            if (window.linkaFeedCache) {
                                window.linkaFeedCache.guardar('home', feedCache);
                            }
                            const grid = get('gridProdutosCliente');
                            if (grid) {
                                const tmp = document.createElement('div');
                                grid.insertAdjacentHTML('afterbegin', renderizarProdutosLk(novos, tmp));
                            }
                            notificar(`${novos.length} produto${novos.length > 1 ? 's' : ''} novo${novos.length > 1 ? 's' : ''}!`, 'sucesso');
                        } else {
                            notificar('Feed actualizado.', 'sucesso');
                        }
                    } catch (e) {
                        notificar('Erro ao actualizar feed.', 'erro');
                    }
                }
            }
        }, { passive: true });
    }

    // ── Optimistic Like Toggle ──
    window.toggleLikeOptimistic = async function (produtoId, btn) {
        if (!utilizadorLogado) {
            notificar('Inicie sessão para curtir.', 'info');
            return;
        }

        const isLiked = btn?.classList.contains('liked');
        const countEl = btn?.querySelector('.lk-reel-action-count');

        // Optimistic update
        if (btn) {
            btn.classList.toggle('liked');
            if (countEl) {
                let c = parseInt(countEl.textContent) || 0;
                c = isLiked ? c - 1 : c + 1;
                countEl.textContent = formatarCount(c);
            }
        }

        try {
            const res = await window.api.produtos.toggleLike(produtoId);
            // Registar evento de comportamento
            registarEvento(produtoId, isLiked ? 'unlike' : 'like');
        } catch (e) {
            // Reverter em caso de erro
            if (btn) {
                btn.classList.toggle('liked');
                if (countEl) {
                    let c = parseInt(countEl.textContent) || 0;
                    c = isLiked ? c + 1 : c - 1;
                    countEl.textContent = formatarCount(c);
                }
            }
            notificar('Erro ao curtir.', 'erro');
        }
    };

    // ── Feed Social ──
    function abrirFeedSocial() {
        mostrarSecaoCliente('feed');
        definirTabClienteAtiva('feed');
        const fc = get('lkFeedContainer');
        if (fc && !fc._loaded) {
            fc._loaded = true;
            carregarProdutosFeed(true);
        }
    }
    window.abrirFeedSocial = abrirFeedSocial;

    // ── Partilhar Produto ──
    window.partilharProduto = async function (id, titulo) {
        const url = `${window.location.origin}${window.location.pathname}#produto-${id}`;
        // Registar evento de comportamento
        registarEvento(id, 'share');
        if (navigator.share) {
            try {
                await navigator.share({ title: titulo || 'LINKA', text: `Confira: ${titulo}`, url: url });
            } catch (e) { if (e.name !== 'AbortError') window.notificar('Não foi possível partilhar.', 'erro'); }
        } else {
            try {
                await navigator.clipboard.writeText(url);
                window.notificar('Link copiado!', 'sucesso');
            } catch { window.notificar('Não foi possível copiar o link.', 'erro'); }
        }
    };

    // ── Seguir Vendedor ──
    const seguidosSet = new Set();
    window.seguirVendedor = async function (vendedorId, el) {
        if (!vendedorId) return;
        try {
            const r = await window.api.seguidores.toggle(vendedorId);
            const dados = r.dados || r;
            const seguido = dados.seguido;

            if (seguido) {
                seguidosSet.add(vendedorId);
                if (el) {
                    if (el.classList.contains('lk-reel-follow-btn')) { el.textContent = 'A seguir'; el.style.background = 'rgba(255,255,255,0.3)'; }
                    else { el.style.background = '#10b981'; const ico = el.querySelector('.material-symbols-outlined'); if (ico) ico.textContent = 'check'; }
                }
                window.notificar('A seguir vendedor!', 'sucesso');
            } else {
                seguidosSet.delete(vendedorId);
                if (el) {
                    if (el.classList.contains('lk-reel-follow-btn')) { el.textContent = 'Seguir'; el.style.background = ''; }
                    else { el.style.background = '#ba1a1a'; const ico = el.querySelector('.material-symbols-outlined'); if (ico) ico.textContent = 'add'; }
                }
                window.notificar('Deixou de seguir.', 'info');
            }
        } catch (e) {
            window.notificar('Erro ao processar.', 'erro');
        }
    };

    // ── Perfil: Segurança ──
    window.mostrarSegurancaPerfil = function () {
        const perfilSec = document.getElementById('perfilSec');
        if (!perfilSec) return;
        const conteudo = perfilSec.querySelector('.lk-perfil-v2-content');
        if (!conteudo) return;
        conteudo.innerHTML = `
            <div style="padding:16px;">
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
                    <span class="material-symbols-outlined" style="cursor:pointer;font-size:28px;" onclick="window.voltarPagina()">arrow_back</span>
                    <h2 style="font-size:1.1rem;font-weight:700;color:var(--on-surface,#1c1b1f);">Segurança</h2>
                </div>
                <div class="perfil-menu-item-v2" onclick="window.notificar('Alterar senha: funcionalidade em breve!', 'info')">
                    <div class="perfil-menu-icon-v2 blue"><span class="material-symbols-outlined">key</span></div>
                    <div class="perfil-menu-text-v2">
                        <div class="perfil-menu-label-v2">Alterar Senha</div>
                        <div class="perfil-menu-desc-v2">Actualizar a sua palavra-passe</div>
                    </div>
                    <span class="material-symbols-outlined perfil-menu-arrow-v2">chevron_right</span>
                </div>
                <div class="perfil-menu-item-v2" onclick="window.notificar('Verificação em duas etapas: funcionalidade em breve!', 'info')">
                    <div class="perfil-menu-icon-v2 green"><span class="material-symbols-outlined">verified_user</span></div>
                    <div class="perfil-menu-text-v2">
                        <div class="perfil-menu-label-v2">Dupla Verificação</div>
                        <div class="perfil-menu-desc-v2">Activar via SMS ou aplicação</div>
                    </div>
                    <span class="material-symbols-outlined perfil-menu-arrow-v2">chevron_right</span>
                </div>
                <div class="perfil-menu-item-v2" onclick="window.mostrarDispositivosPerfil()">
                    <div class="perfil-menu-icon-v2 orange"><span class="material-symbols-outlined">devices</span></div>
                    <div class="perfil-menu-text-v2">
                        <div class="perfil-menu-label-v2">Dispositivos</div>
                        <div class="perfil-menu-desc-v2">Gerir sessões e dispositivos conectados</div>
                    </div>
                    <span class="material-symbols-outlined perfil-menu-arrow-v2">chevron_right</span>
                </div>
            </div>`;
    };

    // ── Perfil: Dispositivos Conectados ──
    window.mostrarDispositivosPerfil = function () {
        const perfilSec = document.getElementById('perfilSec');
        if (!perfilSec) return;
        const conteudo = perfilSec.querySelector('.lk-perfil-v2-content');
        if (!conteudo) return;

        conteudo.innerHTML = `
            <div style="padding:16px;">
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
                    <span class="material-symbols-outlined" style="cursor:pointer;font-size:28px;" onclick="window.voltarPagina()">arrow_back</span>
                    <h2 style="font-size:1.1rem;font-weight:700;color:var(--on-surface,#1c1b1f);">Dispositivos</h2>
                </div>
                <div id="listaDispositivos"><div class="spinner-linka" style="margin:40px auto;"></div></div>
            </div>`;

        carregarDispositivos();
    };

    async function carregarDispositivos() {
        const ct = get('listaDispositivos'); if (!ct) return;
        try {
            const r = await window.api.sessoes.listar();
            const sessoes = r.dados || [];

            if (sessoes.length === 0) {
                ct.innerHTML = '<div class="stitch-empty-state"><div class="stitch-empty-icon-wrap"><span class="material-symbols-outlined">devices</span></div><h3>Nenhuma sessão activa</h3></div>';
                return;
            }

            const formatarTempoRelativo = (s) => {
                if (!s) return 'Desconhecido';
                const diff = Date.now() - new Date(s).getTime();
                const mins = Math.floor(diff / 60000);
                if (mins < 1) return 'Agora';
                if (mins < 60) return `Há ${mins} min`;
                const hrs = Math.floor(mins / 60);
                if (hrs < 24) return `Há ${hrs}h`;
                const dias = Math.floor(hrs / 24);
                return `Há ${dias}d`;
            };

            const iconMap = {
                'android': 'phone_android',
                'ios': 'phone_iphone',
                'windows': 'computer',
                'macos': 'laptop_mac',
                'linux': 'computer',
            };

            const getDeviceIcon = (name) => {
                const lower = (name || '').toLowerCase();
                for (const [key, icon] of Object.entries(iconMap)) {
                    if (lower.includes(key)) return icon;
                }
                return 'devices';
            };

            // Detectar sessão actual (última atividade < 2 min e mesmo IP)
            const atualIdx = sessoes.findIndex(s => {
                const diff = Date.now() - new Date(s.last_activity).getTime();
                return diff < 120000; // menos de 2 minutos
            });

            const cards = sessoes.map((s, i) => {
                const isAtual = i === atualIdx;
                const icon = getDeviceIcon(s.device_name);
                const statusCor = isAtual ? '#10b981' : '#6b7280';
                const statusLabel = isAtual ? 'Este dispositivo' : formatarTempoRelativo(s.last_activity);
                const btnHtml = isAtual
                    ? `<span style="font-size:0.75rem;font-weight:600;color:#10b981;">Activo</span>`
                    : `<button class="denuncia-card-acao-btn" onclick="window.revogarSessao(${s.id}, '${escaparHtml(s.device_name || '')}')">Terminar</button>`;

                return `
                <div class="denuncia-card" style="margin-bottom:12px;">
                    <div style="padding:16px;display:flex;align-items:flex-start;gap:12px;">
                        <div style="width:40px;height:40px;border-radius:12px;background:${statusCor}15;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                            <span class="material-symbols-outlined" style="font-size:22px;color:${statusCor};">${icon}</span>
                        </div>
                        <div style="flex:1;min-width:0;">
                            <div style="display:flex;align-items:center;gap:8px;margin-bottom:2px;">
                                <span style="font-weight:700;font-size:0.9rem;color:var(--on-surface,#1c1b1f);">${escaparHtml(s.device_name || 'Dispositivo')}</span>
                                ${isAtual ? `<span style="width:8px;height:8px;border-radius:50%;background:#10b981;display:inline-block;"></span>` : ''}
                            </div>
                            <div style="font-size:0.78rem;color:var(--on-surface-variant,#49454f);margin-bottom:4px;">
                                ${s.ip_address ? `IP: ${escaparHtml(s.ip_address)}` : 'IP desconhecido'}
                            </div>
                            <div style="font-size:0.75rem;color:var(--on-surface-variant,#49454f);">
                                Último acesso: ${statusLabel}
                            </div>
                        </div>
                        <div style="flex-shrink:0;">${btnHtml}</div>
                    </div>
                </div>`;
            }).join('');

            ct.innerHTML = `
                <div>${cards}</div>
                ${sessoes.length > 1 ? `
                <button onclick="window.revogarTodasSessoes()" style="width:100%;margin-top:20px;padding:14px;border:1.5px solid var(--error,#ba1a1a);border-radius:12px;background:none;color:var(--error,#ba1a1a);font-weight:700;font-size:0.875rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">
                    <span class="material-symbols-outlined" style="font-size:20px;">logout</span>
                    Terminar Todas as Outras Sessões
                </button>` : ''}`;
        } catch (e) {
            ct.innerHTML = `<p class="text-center" style="color:var(--error,#ba1a1a);">${escaparHtml(e.message)}</p>`;
        }
    }

    window.revogarSessao = function (id, nome) {
        window.confirmarAcao('Terminar Sessão', `Terminar sessão de "${nome || 'dispositivo'}"?`, async () => {
            try {
                await window.api.sessoes.revogar(id);
                window.notificar('Sessão terminada.', 'sucesso');
                carregarDispositivos();
            } catch (e) {
                window.notificar(e.message, 'erro');
            }
        });
    };

    window.revogarTodasSessoes = function () {
        window.confirmarAcao('Terminar Sessões', 'Terminar todas as outras sessões activas?', async () => {
            try {
                await window.api.sessoes.revogarTodas();
                window.notificar('Todas as outras sessões foram terminadas.', 'sucesso');
                carregarDispositivos();
            } catch (e) {
                window.notificar(e.message, 'erro');
            }
        });
    };

    // ── Perfil: Notificações ──
    window.mostrarNotificacoesPerfil = function () {
        const perfilSec = document.getElementById('perfilSec');
        if (!perfilSec) return;
        const conteudo = perfilSec.querySelector('.lk-perfil-v2-content');
        if (!conteudo) return;
        const toggles = [
            { id: 'notif_msgs', label: 'Novas Mensagens', desc: 'Alertas de chat', on: true },
            { id: 'notif_pedidos', label: 'Pedidos e Vendas', desc: 'Alertas de encomendas', on: true },
            { id: 'notif_promos', label: 'Promoções', desc: 'Ofertas e descontos', on: false },
            { id: 'notif_som', label: 'Sons', desc: 'Som das notificações', on: true },
        ];
        conteudo.innerHTML = `
            <div style="padding:16px;">
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
                    <span class="material-symbols-outlined" style="cursor:pointer;font-size:28px;" onclick="window.mostrarSecaoCliente('perfil'); definirTabClienteAtiva('perfil');">arrow_back</span>
                    <h2 style="font-size:1.1rem;font-weight:700;color:var(--on-surface,#1c1b1f);">Notificações</h2>
                </div>
                ${toggles.map(t => `
                    <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid var(--outline-variant,#e0e0e0);">
                        <div>
                            <div style="font-weight:600;font-size:0.9rem;color:var(--on-surface,#1c1b1f);">${t.label}</div>
                            <div style="font-size:0.78rem;color:var(--on-surface-variant,#49454f);margin-top:2px;">${t.desc}</div>
                        </div>
                        <label style="position:relative;display:inline-block;width:48px;height:26px;">
                            <input type="checkbox" id="${t.id}" ${t.on ? 'checked' : ''} onchange="window.notificar('Preferência actualizada!', 'sucesso');" style="opacity:0;width:0;height:0;">
                            <span style="position:absolute;cursor:pointer;inset:0;background:${t.on ? 'var(--primary,#00342b)' : '#ccc'};border-radius:13px;transition:0.3s;">
                                <span style="position:absolute;content:'';height:20px;width:20px;left:${t.on ? '24px' : '3px'};bottom:3px;background:#fff;border-radius:50%;transition:0.3s;"></span>
                            </span>
                        </label>
                    </div>
                `).join('')}
            </div>`;
    };

    // ── Perfil: Ajuda ──
    window.mostrarAjudaPerfil = function () {
        const perfilSec = document.getElementById('perfilSec');
        if (!perfilSec) return;
        const conteudo = perfilSec.querySelector('.lk-perfil-v2-content');
        if (!conteudo) return;
        const itens = [
            { icone: 'help', titulo: 'Como Comprar', desc: 'Guia passo-a-passo para fazer a sua primeira compra' },
            { icone: 'storefront', titulo: 'Como Vender', desc: 'Publique o seu primeiro anúncio em minutos' },
            { icone: 'local_shipping', titulo: 'Entrega e Logística', desc: 'Prazos, custos e acompanhar encomendas' },
            { icone: 'payments', titulo: 'Pagamentos', desc: 'Métodos aceites e segurança nas transacções' },
            { icone: 'gavel', titulo: 'Termos e Políticas', desc: 'Termos de uso e política de privacidade' },
        ];
        conteudo.innerHTML = `
            <div style="padding:16px;">
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
                    <span class="material-symbols-outlined" style="cursor:pointer;font-size:28px;" onclick="window.mostrarSecaoCliente('perfil'); definirTabClienteAtiva('perfil');">arrow_back</span>
                    <h2 style="font-size:1.1rem;font-weight:700;color:var(--on-surface,#1c1b1f);">Ajuda e Suporte</h2>
                </div>
                ${itens.map(it => `
                    <div class="perfil-menu-item-v2" onclick="window.notificar('${it.titulo}: artigo em breve!', 'info')">
                        <div class="perfil-menu-icon-v2" style="background:var(--primary-container,#dce5e0);color:var(--primary,#00342b);border-radius:12px;width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
                            <span class="material-symbols-outlined">${it.icone}</span>
                        </div>
                        <div class="perfil-menu-text-v2">
                            <div class="perfil-menu-label-v2">${it.titulo}</div>
                            <div class="perfil-menu-desc-v2">${it.desc}</div>
                        </div>
                        <span class="material-symbols-outlined perfil-menu-arrow-v2">chevron_right</span>
                    </div>
                `).join('')}
                <div style="margin-top:24px;text-align:center;">
                    <button onclick="window.notificar('Chat de suporte: funcionalidade em breve!', 'info')" style="background:var(--primary,#00342b);color:#fff;border:none;padding:12px 28px;border-radius:24px;font-weight:600;font-size:0.9rem;cursor:pointer;">
                        Falar com Suporte
                    </button>
                </div>
            </div>`;
    };

    // ── Detalhes do Produto ──
    window.abrirDetalhes = async (id) => {
        const cd = get('conteudoDetalhes'); const md = get('modalDetalhes');
        if (!cd) return;
        cd.innerHTML = '<div class="detalhes-loading"><div class="spinner-linka"></div><p>A carregar...</p></div>';
        if (md) {
            md.classList.add('active');
            empilharModal(md);
        }
        try {
            const res = await window.api.produtos.obter(id); const p = res.dados;
            const imgPath = (p.imagens && p.imagens.length > 0) ? p.imagens[0].caminho : p.imagem_url;
            const imagens = p.imagens && p.imagens.length > 0 ? p.imagens : (imgPath ? [{ caminho: imgPath }] : []);
            const ehMeu = utilizadorLogado && utilizadorLogado.id === p.vendedor_utilizador_id;
            const ehLogado = !!utilizadorLogado;
            const iniciais = (p.vendedor_nome || 'L').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

            // Galeria de imagens
            const totalFotos = imagens.length;
            let galeriaHtml = imagens.map(im => `
                <div class="dm-gallery-slide">
                    <img src="${resolverUrlImagem(im.caminho)}" alt="${escaparHtml(p.titulo)}">
                </div>
            `).join('');

            // Barra de topo (seta + ações)
            const favClass = '';
            const topbarHtml = `
                <div class="dm-topbar">
                    <div class="dm-topbar-left">
                        <button class="dm-icon-btn" data-tooltip="Voltar" onclick="window.fecharModalDetalhes()">
                            <i class="fa-solid fa-arrow-left"></i>
                        </button>
                    </div>
                    <div class="dm-topbar-right">
                        ${!ehMeu && ehLogado ? `
                        <button class="dm-icon-btn" id="btnFavTop" data-tooltip="Favoritar" onclick="window.abrirDetalhes._toggleFav('${p.id}')">
                            <i class="fa-regular fa-heart"></i>
                        </button>` : ''}
                        <button class="dm-icon-btn" data-tooltip="Partilhar" onclick="window.partilharProduto(${p.id}, '${escaparHtml(p.titulo).replace(/'/g, "\\'")}')">
                            <i class="fa-solid fa-share-nodes"></i>
                        </button>
                    </div>
                </div>
            `;

            // Contador de imagens
            const counterHtml = totalFotos > 0 ? `
                <div class="dm-gallery-counter">
                    <span class="dm-counter-pill"><i class="fa-regular fa-image"></i> ${totalFotos}</span>
                </div>
            ` : '';

            // Galeria completa
            const galleryHtml = `
                <div class="dm-gallery">
                    ${topbarHtml}
                    <div class="dm-gallery-scroll" id="dmGalleryScroll">
                        ${galeriaHtml}
                    </div>
                    ${counterHtml}
                </div>
            `;

            // Info do produto
            const productInfoHtml = `
                <div class="dm-product-info">
                    <div class="dm-product-meta">
                        <span class="dm-category-badge">${escaparHtml(p.categoria_nome || 'Geral')}</span>
                        <span class="dm-stock-badge"><span class="dm-stock-dot"></span> Em Stock</span>
                    </div>
                    <h1 class="dm-title">${escaparHtml(p.titulo)}</h1>
                    <div class="dm-price-row">
                        <span class="dm-price">${formatarMoeda(p.preco)}</span>
                        ${p.preco_antigo ? `<span class="dm-price-old">${formatarMoeda(p.preco_antigo)}</span>` : ''}
                        ${p.preco_negociavel ? '<span class="dm-category-badge" style="color:#16a34a;border-color:#bbf7d0;background:#f0fdf4;">Negociável</span>' : ''}
                    </div>
                </div>
            `;

            // Vendedor — buscar score de confiança
            let confiancaBadge = '';
            let rankingBadge = '';
            try {
                if (p.vendedor_utilizador_id) {
                    const resConf = await window.api.confianca.vendedor(p.vendedor_utilizador_id);
                    if (resConf.sucesso && resConf.dados) {
                        const { score, nivel, rotulo, cor } = resConf.dados;
                        confiancaBadge = `<span style="display:inline-flex;align-items:center;gap:4px;font-size:0.7rem;font-weight:600;color:${cor};background:${cor}18;padding:2px 8px;border-radius:10px;"><span class="material-symbols-outlined" style="font-size:14px;">${nivel === 'excelente' ? 'verified' : nivel === 'bom' ? 'thumb_up' : 'person'}</span>${rotulo} ${Math.round(score)}</span>`;
                    }
                    try {
                        const resRank = await window.api.ranking.vendedor(p.vendedor_utilizador_id);
                        if (resRank.sucesso && resRank.dados && resRank.dados.posicao) {
                            const rk = resRank.dados;
                            rankingBadge = `<span style="display:inline-flex;align-items:center;gap:4px;font-size:0.7rem;font-weight:700;color:#d97706;background:#fef3c7;padding:2px 8px;border-radius:10px;"><span class="material-symbols-outlined" style="font-size:14px;">leaderboard</span>#${rk.posicao} no Ranking</span>`;
                        }
                    } catch(e) { /* silent */ }
                }
            } catch (e) { /* silencioso */ }

            const sellerHtml = `
                <div class="dm-seller">
                    <div class="dm-seller-left" ${!ehMeu ? `onclick="event.stopPropagation(); window._abrirPerfilVendedor(${p.vendedor_id || 0})" style="cursor:pointer;"` : ''}>
                        <div class="dm-seller-avatar">${iniciais}</div>
                        <div>
                            <p class="dm-seller-name">${escaparHtml(p.vendedor_nome || 'Vendedor Linka')}</p>
                            <p class="dm-seller-badge">${p.nome_loja ? escaparHtml(p.nome_loja) : (ehMeu ? 'A sua loja' : 'Vendedor Verificado')} ${confiancaBadge} ${rankingBadge}</p>
                        </div>
                    </div>
                    ${!ehMeu && ehLogado ? `<button class="dm-follow-btn" id="btnSeguirVendedor">Seguir</button>` : ''}
                </div>
            `;

            // Descrição
            const descHtml = p.descricao ? `
                <section>
                    <h2 class="dm-desc-title">Descrição Detalhada</h2>
                    <p class="dm-desc-text">${escaparHtml(p.descricao)}</p>
                </section>
            ` : '';

            // Avaliações
            let reviewsHtml = '';
            try {
                const resAv = await window.api.avaliacoes.listarPorProduto(p.id);
                const avs = resAv.dados || [];
                const mediaEstrelas = avs.length > 0 ? (avs.reduce((s, a) => s + a.estrelas, 0) / avs.length).toFixed(1) : 0;
                const estrelasCheias = Math.round(mediaEstrelas);
                if (avs.length > 0) {
                    reviewsHtml = `
                        <section>
                            <div class="dm-reviews-header">
                                <h2 class="dm-reviews-title">Avaliações (${avs.length})</h2>
                                <div class="dm-reviews-rating">
                                    <i class="fa-solid fa-star" style="color:var(--secondary-container)"></i>
                                    <span>${mediaEstrelas}</span>
                                </div>
                            </div>
                            ${avs.slice(0, 3).map(a => `
                                <div class="dm-review-card">
                                    <div class="dm-review-top">
                                        <span class="dm-review-name">${escaparHtml(a.autor_nome || 'Utilizador')}</span>
                                        <span class="dm-review-date">${_tempoRelativo(a.criado_em || a.data_criacao)}</span>
                                    </div>
                                    <div class="dm-review-stars">
                                        ${Array.from({length: 5}, (_, i) => `<i class="fa-${i < a.estrelas ? 'solid' : 'regular'} fa-star"></i>`).join('')}
                                    </div>
                                    ${a.comentario ? `<p class="dm-review-text">${escaparHtml(a.comentario)}</p>` : ''}
                                </div>
                            `).join('')}
                            ${avs.length > 3 ? '<button class="dm-reviews-more">Ver Todas as Avaliações</button>' : ''}
                            ${!ehMeu && ehLogado ? `<button class="dm-reviews-more" id="btnAvaliarProduto" style="margin-top:8px;"><i class="fa-regular fa-star"></i> Avaliar Produto</button>` : ''}
                        </section>
                    `;
                }
            } catch (e) { console.warn('Erro ao carregar avaliações:', e.message); }

            // Denunciar (ícone discreto)
            const denunciarHtml = !ehMeu && ehLogado ? `
                <button class="dm-icon-btn" id="btnDenunciarProduto" data-tooltip="Denunciar" style="margin:0 auto; width:36px; height:36px; background:transparent; border:none; color:var(--on-surface-variant);">
                    <i class="fa-solid fa-flag"></i>
                </button>
            ` : '';

            // Botão "Este é o seu anúncio"
            const avisoHtml = ehMeu ? '<div class="info-aviso"><i class="fa-solid fa-circle-info"></i> Este é o seu anúncio.</div>' : '';

            // Barra de ação inferior
            const bottomBarHtml = `
                <div class="dm-bottom-bar">
                    <div class="dm-bottom-actions">
                        ${!ehMeu ? `<button class="dm-btn-chat" id="btnContactarVendedorModal" data-tooltip="Chat"><i class="fa-regular fa-comment"></i></button>` : ''}
                        <div style="flex:1; display:flex; gap:8px;">
                            ${!ehMeu && ehLogado && utilizadorLogado.tipo === 'cliente' ? `
                            <button class="dm-btn-cart" id="btnCriarPedidoModal">Carrinho</button>
                            <button class="dm-btn-buy" id="btnComprarAgora">Comprar Agora</button>
                            ` : ehMeu ? `
                            <button class="dm-btn-buy" style="flex:1;" onclick="window.fecharModalDetalhes()">Gerir Anúncio</button>
                            ` : `
                            <button class="dm-btn-buy" style="flex:1;" onclick="window.fecharModalDetalhes(); window.notificar('Inicie sessão para comprar.', 'info');">Entrar para Comprar</button>
                            `}
                        </div>
                    </div>
                </div>
            `;

            // Montar modal completo
            cd.innerHTML = `
                ${galleryHtml}
                <div class="dm-body">
                    ${productInfoHtml}
                    <hr class="dm-divider">
                    ${sellerHtml}
                    <hr class="dm-divider">
                    ${descHtml}
                    ${descHtml ? '<hr class="dm-divider">' : ''}
                    ${reviewsHtml}
                    ${reviewsHtml ? '<hr class="dm-divider">' : ''}
                    ${avisoHtml}
                    ${denunciarHtml}
                </div>
                ${bottomBarHtml}
            `;

            // Scroll da galeria — atualizar contador
            const scrollEl = document.getElementById('dmGalleryScroll');
            const counterEl = cd.querySelector('.dm-counter-pill');
            if (scrollEl && counterEl && totalFotos > 1) {
                scrollEl.addEventListener('scroll', () => {
                    const idx = Math.round(scrollEl.scrollLeft / scrollEl.clientWidth) + 1;
                    counterEl.innerHTML = `<i class="fa-regular fa-image"></i> ${idx}/${totalFotos}`;
                });
            }

            // Eventos
            const bc = get('btnContactarVendedorModal');
            if (bc) bc.addEventListener('click', async () => {
                if (!utilizadorLogado) { window.fecharModalDetalhes(); window.notificar('Inicie sessão.', 'info'); return; }
                bc.disabled = true;
                bc.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
                await window.contactarVendedor(p.vendedor_utilizador_id, p.id, p.titulo);
            });

            const bp = get('btnCriarPedidoModal');
            if (bp) bp.addEventListener('click', async () => {
                try {
                    bp.disabled = true; bp.innerText = 'A processar...';
                    await window.api.pedidos.criar({ itens: [{ produto_id: p.id, quantidade: 1 }], endereco_entrega: p.cidade || 'Maputo', metodo_pagamento: 'dinheiro' });
                    // Registar evento de compra
                    registarEvento(p.id, 'purchase');
                    window.notificar('Pedido criado com sucesso!', 'sucesso');
                    window.fecharModalDetalhes();
                    empurrarNavegacao({ secao: 'dashboard', tab: 'compras', vista: 'compras', scrollY: 0 });
                    mostrarSecaoCliente('dashboard');
                    window.carregarConteudoDashboard('compras');
                } catch (e) { window.notificar(e.message, 'erro'); }
                finally { bp.disabled = false; bp.innerText = 'Carrinho'; }
            });

            const ba = get('btnComprarAgora');
            if (ba) ba.addEventListener('click', async () => {
                try {
                    ba.disabled = true; ba.innerText = 'A processar...';
                    await window.api.pedidos.criar({ itens: [{ produto_id: p.id, quantidade: 1 }], endereco_entrega: p.cidade || 'Maputo', metodo_pagamento: 'dinheiro' });
                    // Registar evento de compra
                    registarEvento(p.id, 'purchase');
                    window.notificar('Pedido criado com sucesso!', 'sucesso');
                    window.fecharModalDetalhes();
                    empurrarNavegacao({ secao: 'dashboard', tab: 'compras', vista: 'compras', scrollY: 0 });
                    mostrarSecaoCliente('dashboard');
                    window.carregarConteudoDashboard('compras');
                } catch (e) { window.notificar(e.message, 'erro'); }
                finally { ba.disabled = false; ba.innerText = 'Comprar Agora'; }
            });

            const bfs = get('btnSeguirVendedor');
            if (bfs) bfs.addEventListener('click', async () => {
                try {
                    bfs.disabled = true;
                    await window.api.utilizadores.seguir(p.vendedor_utilizador_id);
                    bfs.innerText = 'A seguir'; bfs.style.background = 'var(--primary-container)'; bfs.style.color = 'var(--on-primary)';
                    window.notificar('A seguir vendedor.', 'sucesso');
                } catch (e) { window.notificar(e.message, 'erro'); }
                finally { bfs.disabled = false; }
            });

            const bav = get('btnAvaliarProduto');
            if (bav) bav.addEventListener('click', () => {
                let modal = get('modalAvaliacao');
                if (!modal) {
                    modal = document.createElement('div');
                    modal.id = 'modalAvaliacao';
                    modal.className = 'modal-overlay active';
                    modal.innerHTML = `<div class="modal-container" style="max-width:400px;"><button class="btn-fechar-modal" onclick="window.fecharModalFilho('modalAvaliacao')"><span class="material-symbols-outlined">close</span></button>
                    <h3 style="margin-bottom:16px;">Avaliar Produto</h3>
                    <div id="avaliacaoEstrelas" style="display:flex;gap:8px;font-size:2rem;margin-bottom:16px;cursor:pointer;">
                        <span data-estrela="1" style="color:#d1d5db;">★</span><span data-estrela="2" style="color:#d1d5db;">★</span><span data-estrela="3" style="color:#d1d5db;">★</span><span data-estrela="4" style="color:#d1d5db;">★</span><span data-estrela="5" style="color:#d1d5db;">★</span>
                    </div>
                    <textarea id="avaliacaoComentario" class="kh-textarea" rows="3" placeholder="Escreva o seu comentário (opcional)..." style="width:100%;margin-bottom:16px;"></textarea>
                    <input type="hidden" id="avaliacaoEstrelasValor" value="0">
                    <button class="btn btn-primario btn-bloco" id="btnSubmeterAvaliacao" style="width:100%;">Submeter Avaliação</button></div>`;
                    document.body.appendChild(modal);
                    empilharModal(modal);
                    modal.querySelectorAll('#avaliacaoEstrelas span').forEach(s => {
                        s.addEventListener('click', () => {
                            const v = parseInt(s.dataset.estrela);
                            document.getElementById('avaliacaoEstrelasValor').value = v;
                            modal.querySelectorAll('#avaliacaoEstrelas span').forEach((x, i) => x.style.color = i < v ? '#f59e0b' : '#d1d5db');
                        });
                    });
                }
                get('btnSubmeterAvaliacao').onclick = async () => {
                    const estrelas = parseInt(document.getElementById('avaliacaoEstrelasValor').value);
                    if (!estrelas) { notificar('Selecione estrelas.', 'aviso'); return; }
                    try {
                        await window.api.avaliacoes.criar({ avaliado_id: p.vendedor_utilizador_id, produto_id: p.id, estrelas, comentario: document.getElementById('avaliacaoComentario').value, tipo: 'produto' });
                        // Registar evento de comentário/avaliação
                        registarEvento(p.id, 'comment');
                        notificar('Avaliação submetida!', 'sucesso');
                        window.fecharModalFilho('modalAvaliacao');
                        window.abrirDetalhes(id);
                    } catch(e) { notificar(e.message, 'erro'); }
                };
            });

            const bden = get('btnDenunciarProduto');
            if (bden) bden.addEventListener('click', () => {
                let modal = get('modalDenuncia');
                if (!modal) {
                    modal = document.createElement('div');
                    modal.id = 'modalDenuncia';
                    modal.className = 'modal-overlay active';
                    modal.innerHTML = `<div class="modal-container" style="max-width:400px;"><button class="btn-fechar-modal" onclick="window.fecharModalFilho('modalDenuncia')"><span class="material-symbols-outlined">close</span></button>
                    <h3 style="margin-bottom:16px;">Denunciar Produto</h3>
                    <div class="campo-grupo"><label>Motivo</label><select id="denunciaMotivo" class="kh-select" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;">
                        <option value="fraude">Fraude</option><option value="conteudo_inapropriado">Conteúdo Inapropriado</option><option value="spam">Spam</option><option value="produto_falso">Produto Falso</option><option value="preco_abusivo">Preço Abusivo</option><option value="outro">Outro</option>
                    </select></div>
                    <div class="campo-grupo" style="margin-top:12px;"><label>Descrição</label><textarea id="denunciaDescricao" class="kh-textarea" rows="3" placeholder="Descreva o problema (mín. 10 caracteres)..." style="width:100%;"></textarea></div>
                    <button class="btn btn-perigo btn-bloco mt-10" id="btnSubmeterDenuncia" style="width:100%;">Enviar Denúncia</button></div>`;
                    document.body.appendChild(modal);
                    empilharModal(modal);
                }
                get('btnSubmeterDenuncia').onclick = async () => {
                    const motivo = document.getElementById('denunciaMotivo').value;
                    const descricao = document.getElementById('denunciaDescricao').value.trim();
                    if (descricao.length < 10) { notificar('Mínimo 10 caracteres na descrição.', 'aviso'); return; }
                    try {
                        await window.api.denuncias.criar({ denunciado_id: p.vendedor_utilizador_id, produto_id: p.id, motivo, descricao });
                        notificar('Denúncia enviada.', 'sucesso');
                        window.fecharModalFilho('modalDenuncia');
                    } catch(e) { notificar(e.message, 'erro'); }
                };
            });

            // Toggle favorito global
            const isFavAtual = favoritosIds.has(parseInt(p.id));
            if (isFavAtual) {
                const btnFav = get('btnFavTop');
                if (btnFav) { btnFav.classList.add('ativo'); btnFav.innerHTML = '<i class="fa-solid fa-heart"></i>'; }
            }
            window.abrirDetalhes._toggleFav = async (prodId) => {
                const btnFav = get('btnFavTop');
                if (!btnFav) return;
                try {
                    const eraFav = favoritosIds.has(parseInt(prodId));
                    if (eraFav) {
                        await window.api.favoritos.remover(prodId);
                        favoritosIds.delete(parseInt(prodId));
                        btnFav.classList.remove('ativo');
                        btnFav.innerHTML = '<i class="fa-regular fa-heart"></i>';
                        window.notificar('Removido dos favoritos.', 'info');
                    } else {
                        await window.api.favoritos.adicionar(prodId);
                        favoritosIds.add(parseInt(prodId));
                        btnFav.classList.add('ativo');
                        btnFav.innerHTML = '<i class="fa-solid fa-heart"></i>';
                        window.notificar('Guardado nos favoritos.', 'sucesso');
                    }
                } catch (e) { window.notificar(e.message, 'erro'); }
            };

        } catch (e) { cd.innerHTML = `<p class="text-center" style="padding:40px;color:#c0392b">${e.message}</p>`; }
    };

    // ── Dashboard: carregarConteudoDashboard ──
    function carregarConteudoDashboard(vista) {
        const alias = { perfil: 'meu-perfil', pesquisas: 'compras' };
        vista = alias[vista] || vista;
        let c = ''; const dc = get('dashboardConteudo');

        switch (vista) {
            case 'compras':
                c = '<div class="secao-cabecalho"><h2>Minhas Compras</h2></div><div id="listaPedidos" class="lista-pedidos"><p class="text-center">A carregar...</p></div>';
                setTimeout(() => carregarPedidosDashboard('cliente'), 100);
                break;
            case 'favoritos':
                c = `<main class="fav-main"><header class="fav-header"><h2>Meus Favoritos</h2><p>Produtos que você amou e salvou para depois.</p></header><div id="listaFavoritos" class="fav-grid">${Array(4).fill('').map(() => '<div class="fav-skeleton"><div class="fav-skeleton-img"></div><div class="fav-skeleton-body"><div class="fav-skeleton-line" style="width:40%;height:10px;"></div><div class="fav-skeleton-line" style="width:80%;height:14px;margin-top:6px;"></div><div class="fav-skeleton-line" style="width:35%;height:16px;margin-top:6px;"></div></div></div>').join('')}</div><div class="fav-empty" id="favoritoVazio"><div class="fav-empty-icon"><span class="material-symbols-outlined">heart_broken</span></div><h3>Sua lista está vazia</h3><p>Você ainda não salvou nenhum produto. Comece a explorar e favorite o que mais gostar!</p><button class="fav-empty-btn" onclick="window.switchTabCliente('explorar')">Explorar Marketplace</button></div></main>`;
                setTimeout(carregarFavoritosDashboard, 100);
                break;
            case 'meu-perfil':
                c = '<div id="perfilContainer"><div class="spinner-linka" style="margin:40px auto;"></div></div>';
                setTimeout(carregarPerfilCompleto, 100);
                break;
            case 'minhas-denuncias':
                c = '<div class="denuncias-cabecalho"><h2>Minhas Denúncias</h2><button class="denuncias-filtro-btn"><span class="material-symbols-outlined">filter_list</span><span>Filtrar</span></button></div><div id="listaDenuncias"><div class="spinner-linka" style="margin:40px auto;"></div></div>';
                setTimeout(carregarMinhasDenuncias, 100);
                break;
            case 'minhas-sancoes':
                c = '<div class="secao-cabecalho"><h2>Minhas Sanções</h2></div><div id="listaSancoes"><div class="spinner-linka" style="margin:40px auto;"></div></div>';
                setTimeout(carregarMinhasSancoes, 100);
                break;
            case 'ranking':
                c = '<div class="lk-ranking-page"><div class="lk-ranking-header"><span class="material-symbols-outlined lk-ranking-header-icon">leaderboard</span><div><h2>Ranking de Vendedores</h2><p>Os vendedores mais bem avaliados da LINKA</p></div></div><div class="lk-ranking-periodo-bar" id="lkRankingPeriodo"></div><div class="lk-ranking-top3" id="lkRankingTop3"></div><div class="lk-ranking-lista" id="lkRankingLista"><div class="spinner-linka" style="margin:40px auto;"></div></div></div>';
                setTimeout(carregarRanking, 100);
                break;
            case 'pedido-detalhe':
                c = '<div id="pedidoDetalheContainer"><div class="spinner-linka" style="margin:40px auto;"></div></div>';
                setTimeout(() => carregarPedidoDetalhe(window._pedidoDetalheId), 100);
                break;
            case 'perfil-vendedor':
                c = '<div id="perfilVendedorContainer"><div class="spinner-linka" style="margin:40px auto;"></div></div>';
                setTimeout(() => carregarPerfilVendedor(window._perfilVendedorId), 100);
                break;
            case 'vistos-recentemente':
                c = '<div class="lk-recent-header"><h2>Vistos Recentemente</h2><button class="lk-recent-clear" onclick="window._limparVistosRecentemente()"><span class="material-symbols-outlined">delete_sweep</span> Limpar</button></div><div id="listaVistosRecentemente" class="lk-recent-grid"><div class="spinner-linka" style="margin:40px auto;"></div></div>';
                setTimeout(carregarVistosRecentemente, 100);
                break;
            case 'carrinho':
                c = '<div class="lk-cart-header"><h2>Meu Carrinho</h2><button class="lk-cart-clear" onclick="window._limparCarrinho()"><span class="material-symbols-outlined">delete_sweep</span> Limpar</button></div><div id="listaCarrinho" class="lk-cart-list"><div class="spinner-linka" style="margin:40px auto;"></div></div><div id="carrinhoResumo" class="lk-cart-resumo"></div>';
                setTimeout(carregarCarrinho, 100);
                break;
            case 'preferencias':
                c = '<div class="lk-pref-page"><div class="lk-pref-header"><span class="material-symbols-outlined lk-pref-header-icon">settings</span><div><h2>Preferências</h2><p>Configure sua experiência na LINKA</p></div></div><div id="lkPrefForm" class="lk-pref-form"><div class="spinner-linka" style="margin:40px auto;"></div></div></div>';
                setTimeout(carregarPreferencias, 100);
                break;
            case 'entregas':
                c = `<div class="lk-ent-page">
                    <div class="lk-ent-header"><span class="material-symbols-outlined lk-ent-header-icon">local_shipping</span><div><h2>Entregas</h2><p>Acompanhe as suas entregas</p></div></div>
                    <div class="lk-ent-tabs">
                        <button class="lk-ent-tab ativo" onclick="window._mudarTabEntregas('ativas', this)">Ativas</button>
                        <button class="lk-ent-tab" onclick="window._mudarTabEntregas('historico', this)">Histórico</button>
                    </div>
                    <div id="lkEntLista" class="lk-ent-lista"><div class="spinner-linka" style="margin:40px auto;"></div></div>
                </div>`;
                setTimeout(() => window._carregarEntregasCliente('ativas'), 100);
                break;
            default:
                c = `<div class="stitch-em-desenvolvimento"><div class="stitch-dev-icon"><span class="material-symbols-outlined">construction</span></div><h2>Em Breve!</h2><p>Secção <strong>${vista}</strong> em desenvolvimento.</p><button class="btn btn-primario" onclick="window.carregarConteudoDashboard('compras')">Voltar</button></div>`;
                break;
        }
        if (dc) dc.innerHTML = c;
    }

    window.carregarConteudoDashboard = carregarConteudoDashboard;

    // ── Ranking de Vendedores ──
    let rankingPeriodoActual = null;

    async function carregarRanking() {
        const periodoBar = get('lkRankingPeriodo');
        const top3El = get('lkRankingTop3');
        const listaEl = get('lkRankingLista');
        if (!listaEl) return;

        try {
            // Carregar periodos disponíveis
            let periodos = [];
            try {
                const pr = await window.api.ranking.periodos();
                periodos = pr.dados || [];
            } catch(e) { /* silent */ }

            if (!rankingPeriodoActual && periodos.length > 0) {
                rankingPeriodoActual = periodos[0].periodo;
            }

            // Renderizar seletor de periodo
            if (periodoBar && periodos.length > 0) {
                periodoBar.innerHTML = periodos.map(p =>
                    `<button class="lk-ranking-periodo-btn ${p.periodo === rankingPeriodoActual ? 'ativo' : ''}" onclick="window._mudarRankingPeriodo('${p.periodo}')">${p.periodo}</button>`
                ).join('');
            }

            // Buscar ranking
            const r = await window.api.ranking.listar(rankingPeriodoActual, 50);
            const ranking = r.dados || [];

            if (ranking.length === 0) {
                listaEl.innerHTML = '<div class="stitch-empty-state"><div class="stitch-empty-icon-wrap"><span class="material-symbols-outlined">leaderboard</span></div><h3>Sem dados de ranking</h3><p>O ranking será calculado automaticamente.</p></div>';
                if (top3El) top3El.innerHTML = '';
                return;
            }

            // Top 3 (podium)
            const top3 = ranking.slice(0, 3);
            const medals = ['&#129351;', '&#129352;', '&#129353;']; // gold, silver, bronze
            const sizes = ['lk-rank-podium-first', 'lk-rank-podium-second', 'lk-rank-podium-third'];

            if (top3El) {
                top3El.innerHTML = top3.map((v, i) => {
                    const nome = v.nome_vendedor || v.nome || 'Vendedor';
                    const foto = v.foto_url || v.foto_perfil || '';
                    const score = v.score_composto || 0;
                    const vendas = v.total_vendas || 0;
                    const avaliacao = v.avaliacao_media || 0;
                    const initials = nome.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
                    const fotoHtml = foto
                        ? `<img src="${resolverUrlImagem(foto)}" alt="${escaparHtml(nome)}" class="lk-rank-avatar-img">`
                        : `<span class="lk-rank-avatar-initials">${initials}</span>`;
                    return `<div class="lk-rank-podium-card ${sizes[i]}">
                        <div class="lk-rank-medal">${medals[i]}</div>
                        <div class="lk-rank-avatar">${fotoHtml}</div>
                        <div class="lk-rank-nome">${escaparHtml(nome)}</div>
                        <div class="lk-rank-score">${score} pts</div>
                        <div class="lk-rank-stats">${vendas} venda${vendas !== 1 ? 's' : ''} &bull; ${avaliacao.toFixed(1)}&#9733;</div>
                    </div>`;
                }).join('');
            }

            // Resto da lista (4º em diante)
            const resto = ranking.slice(3);
            if (listaEl) {
                if (resto.length === 0) {
                    listaEl.innerHTML = '';
                } else {
                    listaEl.innerHTML = '<h3 class="lk-ranking-subtitulo">Outros Vendedores</h3>' + resto.map((v, i) => {
                        const nome = v.nome_vendedor || v.nome || 'Vendedor';
                        const foto = v.foto_url || v.foto_perfil || '';
                        const score = v.score_composto || 0;
                        const posicao = i + 4;
                        const initials = nome.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
                        const fotoHtml = foto
                            ? `<img src="${resolverUrlImagem(foto)}" alt="${escaparHtml(nome)}" class="lk-rank-list-avatar-img">`
                            : `<span class="lk-rank-list-initials">${initials}</span>`;
                        return `<div class="lk-rank-list-item">
                            <span class="lk-rank-pos">${posicao}</span>
                            <div class="lk-rank-list-avatar">${fotoHtml}</div>
                            <div class="lk-rank-list-info">
                                <div class="lk-rank-list-nome">${escaparHtml(nome)}</div>
                                <div class="lk-rank-list-stats">${v.total_vendas || 0} venda${(v.total_vendas || 0) !== 1 ? 's' : ''} &bull; ${(v.avaliacao_media || 0).toFixed(1)}&#9733;</div>
                            </div>
                            <span class="lk-rank-list-score">${score} pts</span>
                        </div>`;
                    }).join('');
                }
            }

        } catch(e) {
            listaEl.innerHTML = `<p class="text-center erro">${escaparHtml(e.message)}</p>`;
        }
    }

    window._mudarRankingPeriodo = function(periodo) {
        rankingPeriodoActual = periodo;
        carregarRanking();
    };

    // ── Entregas (Cliente) ──
    let entregasTabActual = 'ativas';

    window._mudarTabEntregas = function(tab, btn) {
        entregasTabActual = tab;
        document.querySelectorAll('.lk-ent-tab').forEach(b => b.classList.remove('ativo'));
        if (btn) btn.classList.add('ativo');
        window._carregarEntregasCliente(tab);
    };

    window._carregarEntregasCliente = async function(tab) {
        const listaEl = get('lkEntLista');
        if (!listaEl) return;
        listaEl.innerHTML = '<div class="spinner-linka" style="margin:40px auto;"></div>';

        try {
            const filtros = tab === 'ativas' ? { estado: 'aguardando' } : {};
            const r = await window.api.entregas.listar(filtros);
            const entregas = r.dados || [];

            if (entregas.length === 0) {
                listaEl.innerHTML = `<div class="stitch-empty-state">
                    <div class="stitch-dev-icon"><span class="material-symbols-outlined">${tab === 'ativas' ? 'local_shipping' : 'history'}</span></div>
                    <h3>${tab === 'ativas' ? 'Sem entregas ativas' : 'Sem histórico'}</h3>
                    <p>${tab === 'ativas' ? 'As suas entregas activas aparecerão aqui.' : 'O histórico de entregas aparecerá aqui.'}</p>
                </div>`;
                return;
            }

            const estadoCores = {
                aguardando: { bg: '#fef3c7', color: '#92400e', label: 'Aguardando' },
                aceite: { bg: '#dbeafe', color: '#1e40af', label: 'Aceite' },
                a_caminho: { bg: '#d1fae5', color: '#065f46', label: 'A Caminho' },
                entregue: { bg: '#d1fae5', color: '#065f46', label: 'Entregue' },
                falhou: { bg: '#fee2e2', color: '#991b1b', label: 'Falhou' },
                cancelado: { bg: '#f3f4f6', color: '#374151', label: 'Cancelado' }
            };

            listaEl.innerHTML = entregas.map(e => {
                const estado = estadoCores[e.estado] || estadoCores.aguardando;
                const origem = e.endereco_origem || 'Origem não definida';
                const destino = e.endereco_destino || 'Destino não definido';
                const data = e.criado_em ? new Date(e.criado_em).toLocaleDateString('pt-MZ') : '';
                return `<div class="lk-ent-card">
                    <div class="lk-ent-card-header">
                        <div class="lk-ent-card-id">#${e.id}</div>
                        <span class="lk-ent-estado" style="background:${estado.bg};color:${estado.color};">${estado.label}</span>
                    </div>
                    <div class="lk-ent-card-body">
                        <div class="lk-ent-route">
                            <div class="lk-ent-route-point"><span class="material-symbols-outlined" style="color:#059669;">location_on</span><span>${escaparHtml(origem)}</span></div>
                            <div class="lk-ent-route-line"></div>
                            <div class="lk-ent-route-point"><span class="material-symbols-outlined" style="color:#dc2626;">flag</span><span>${escaparHtml(destino)}</span></div>
                        </div>
                        ${e.entregador_nome ? `<div class="lk-ent-driver"><span class="material-symbols-outlined">person</span> ${escaparHtml(e.entregador_nome)}</div>` : ''}
                        ${e.notas ? `<div class="lk-ent-notas"><span class="material-symbols-outlined">notes</span> ${escaparHtml(e.notas)}</div>` : ''}
                    </div>
                    <div class="lk-ent-card-footer">
                        <span class="lk-ent-data">${data}</span>
                        ${e.preco_entrega ? `<span class="lk-ent-preco">${parseFloat(e.preco_entrega).toFixed(0)} MT</span>` : ''}
                    </div>
                </div>`;
            }).join('');
        } catch (erro) {
            listaEl.innerHTML = `<p class="text-center text-erro p-20">${escaparHtml(erro.message)}</p>`;
        }
    };

    // ── Perfil do Vendedor (para clientes) ──
    window._abrirPerfilVendedor = function(vendedorId) {
        window._perfilVendedorId = vendedorId;
        window.carregarConteudoDashboard('perfil-vendedor');
    };

    async function carregarPerfilVendedor(vendedorId) {
        const container = get('perfilVendedorContainer');
        if (!container || !vendedorId) return;

        try {
            const r = await window.api.ranking.perfilVendedor(vendedorId);
            const d = r.dados || r;
            const v = d.vendedor;
            const est = d.estatisticas || {};
            const produtos = d.produtos || [];

            const iniciais = (v.nome || 'V').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            const fotoHtml = v.avatar
                ? `<img src="${resolverUrlImagem(v.avatar)}" alt="${escaparHtml(v.nome)}" class="lk-seller-avatar-img">`
                : `<span class="lk-seller-avatar-initials">${iniciais}</span>`;

            const produtosHtml = produtos.length > 0
                ? `<div class="lk-seller-products">${produtos.map(p => {
                    const img = p.imagem_url ? `<img src="${resolverUrlImagem(p.imagem_url)}" alt="">` : `<div class="lk-seller-product-placeholder"><span class="material-symbols-outlined">image</span></div>`;
                    return `<div class="lk-seller-product-card" onclick="window.abrirDetalhes(${p.id})">
                        <div class="lk-seller-product-img">${img}</div>
                        <div class="lk-seller-product-info">
                            <div class="lk-seller-product-title">${escaparHtml(p.titulo)}</div>
                            <div class="lk-seller-product-price">${formatarMoeda(p.preco)}</div>
                        </div>
                    </div>`;
                }).join('')}</div>`
                : '<div class="lk-seller-empty"><p>Nenhum produto disponível.</p></div>';

            container.innerHTML = `
            <div class="lk-seller-profile">
                <div class="lk-seller-header">
                    <div class="lk-seller-avatar">${fotoHtml}</div>
                    <div class="lk-seller-info">
                        <h2>${escaparHtml(v.nome_loja || v.nome)}</h2>
                        <p class="lk-seller-since">Membro desde ${new Date(v.membro_desde).getFullYear()}</p>
                        <div class="lk-seller-stats-row">
                            <span><strong>${est.total_produtos || 0}</strong> produtos</span>
                            <span><strong>${est.total_vendas || 0}</strong> vendas</span>
                            <span><strong>${est.total_seguidores || 0}</strong> seguidores</span>
                        </div>
                        ${est.avaliacao_media > 0 ? `<div class="lk-seller-rating"><span class="material-symbols-outlined">star</span> ${est.avaliacao_media.toFixed(1)} (${est.total_avaliacoes} avaliações)</div>` : ''}
                        ${est.score_confianca != null ? `<div class="lk-seller-trust">Confiança: ${est.score_confianca}/100</div>` : ''}
                    </div>
                </div>
                <div class="lk-seller-actions">
                    <button class="btn btn-primario" onclick="window.seguirVendedor(${v.id}, this)">
                        <span class="material-symbols-outlined">person_add</span> Seguir
                    </button>
                    <button class="btn btn-secundario" onclick="window.contactarVendedor(${v.id}, 0, '${escaparHtml(v.nome_loja || v.nome)}')">
                        <span class="material-symbols-outlined">chat</span> Mensagem
                    </button>
                </div>
                ${v.descricao ? `<div class="lk-seller-desc"><p>${escaparHtml(v.descricao)}</p></div>` : ''}
                <h3 class="lk-seller-section-title">Produtos</h3>
                ${produtosHtml}
            </div>`;
        } catch (e) {
            container.innerHTML = `<p class="text-center erro">${escaparHtml(e.message)}</p>`;
        }
    }

    // ── Produtos Vistos Recentemente ──
    async function carregarVistosRecentemente() {
        const lista = get('listaVistosRecentemente');
        if (!lista) return;

        try {
            const r = await window.api.recentementeVistos.listar(30);
            const itens = r.dados || r || [];

            if (!itens || itens.length === 0) {
                lista.innerHTML = '<div class="lk-recent-empty"><span class="material-symbols-outlined">history</span><p>Nenhum produto visto recentemente.</p></div>';
                return;
            }

            lista.innerHTML = itens.map(p => {
                const img = p.imagem_url ? `<img src="${resolverUrlImagem(p.imagem_url)}" alt="">` : `<div class="lk-recent-placeholder"><span class="material-symbols-outlined">image</span></div>`;
                return `<div class="lk-recent-card" onclick="window.abrirDetalhes(${p.id})">
                    <div class="lk-recent-img">${img}</div>
                    <div class="lk-recent-info">
                        <div class="lk-recent-title">${escaparHtml(p.titulo)}</div>
                        <div class="lk-recent-price">${formatarMoeda(p.preco)}</div>
                    </div>
                    <button class="lk-recent-remove" onclick="event.stopPropagation(); window._removerVistoRecente(${p.id})"><span class="material-symbols-outlined">close</span></button>
                </div>`;
            }).join('');
        } catch (e) {
            lista.innerHTML = `<p class="text-center erro">${escaparHtml(e.message)}</p>`;
        }
    }

    window._removerVistoRecente = async function(produtoId) {
        try {
            await window.api.recentementeVistos.eliminar(produtoId);
            carregarVistosRecentemente();
        } catch (e) { /* silent */ }
    };

    window._limparVistosRecentemente = async function() {
        try {
            await window.api.recentementeVistos.limpar();
            carregarVistosRecentemente();
            window.notificar('Histórico limpo.', 'sucesso');
        } catch (e) { window.notificar('Erro ao limpar.', 'erro'); }
    };

    // ── Carrinho de Compras ──
    async function carregarCarrinho() {
        const lista = get('listaCarrinho');
        const resumoEl = get('carrinhoResumo');
        if (!lista) return;

        try {
            const r = await window.api.carrinho.listar();
            const itens = r.dados || r || [];

            if (!itens || itens.length === 0) {
                lista.innerHTML = '<div class="lk-cart-empty"><span class="material-symbols-outlined">shopping_cart</span><p>Seu carrinho está vazio.</p><button class="btn btn-primario" onclick="window.switchTabCliente(\'explorar\')">Explorar Produtos</button></div>';
                if (resumoEl) resumoEl.innerHTML = '';
                return;
            }

            lista.innerHTML = itens.map(item => {
                const img = item.imagem_url ? `<img src="${resolverUrlImagem(item.imagem_url)}" alt="">` : `<div class="lk-cart-placeholder"><span class="material-symbols-outlined">image</span></div>`;
                return `<div class="lk-cart-item">
                    <div class="lk-cart-item-img" onclick="window.abrirDetalhes(${item.produto_id})">${img}</div>
                    <div class="lk-cart-item-info">
                        <div class="lk-cart-item-title" onclick="window.abrirDetalhes(${item.produto_id})">${escaparHtml(item.titulo)}</div>
                        <div class="lk-cart-item-price">${formatarMoeda(item.preco)}</div>
                        <div class="lk-cart-item-qty">
                            <button onclick="window._actualizarQtyCarrinho(${item.produto_id}, ${item.quantidade - 1})"><span class="material-symbols-outlined">remove</span></button>
                            <span>${item.quantidade}</span>
                            <button onclick="window._actualizarQtyCarrinho(${item.produto_id}, ${item.quantidade + 1})"><span class="material-symbols-outlined">add</span></button>
                        </div>
                    </div>
                    <button class="lk-cart-item-remove" onclick="window._removerDoCarrinho(${item.produto_id})"><span class="material-symbols-outlined">delete</span></button>
                </div>`;
            }).join('');

            // Resumo
            let total = 0;
            itens.forEach(i => { total += parseFloat(i.preco) * i.quantidade; });
            if (resumoEl) {
                resumoEl.innerHTML = `
                <div class="lk-cart-total-row"><span>Total</span><strong>${formatarMoeda(total)}</strong></div>
                <button class="btn btn-primario lk-cart-checkout" onclick="window._finalizarCarrinho()">Finalizar Compra</button>`;
            }
        } catch (e) {
            lista.innerHTML = `<p class="text-center erro">${escaparHtml(e.message)}</p>`;
        }
    }

    window._actualizarQtyCarrinho = async function(produtoId, qty) {
        try {
            if (qty <= 0) {
                await window.api.carrinho.remover(produtoId);
            } else {
                await window.api.carrinho.actualizarQuantidade(produtoId, qty);
            }
            carregarCarrinho();
        } catch (e) { window.notificar(e.message || 'Erro', 'erro'); }
    };

    window._removerDoCarrinho = async function(produtoId) {
        try {
            await window.api.carrinho.remover(produtoId);
            carregarCarrinho();
            window.notificar('Produto removido.', 'info');
        } catch (e) { window.notificar('Erro', 'erro'); }
    };

    window._limparCarrinho = async function() {
        try {
            await window.api.carrinho.limpar();
            carregarCarrinho();
            window.notificar('Carrinho limpo.', 'sucesso');
        } catch (e) { window.notificar('Erro', 'erro'); }
    };

    window._finalizarCarrinho = async function() {
        try {
            const itens = (await window.api.carrinho.listar()).dados || [];
            if (itens.length === 0) { window.notificar('Carrinho vazio.', 'info'); return; }

            const porVendedor = {};
            itens.forEach(i => {
                if (!porVendedor[i.vendedor_id]) porVendedor[i.vendedor_id] = [];
                porVendedor[i.vendedor_id].push(i);
            });

            let subtotal = 0;
            itens.forEach(i => { subtotal += parseFloat(i.preco) * i.quantidade; });
            const taxaEntrega = 150;
            const total = subtotal + taxaEntrega;

            const itensHtml = itens.map(i => `
                <div class="lk-co-item">
                    <div class="lk-co-item-img">${i.imagem_url ? `<img src="${resolverUrlImagem(i.imagem_url)}" alt="">` : `<span class="material-symbols-outlined">image</span>`}</div>
                    <div class="lk-co-item-info">
                        <span class="lk-co-item-title">${escaparHtml(i.titulo)}</span>
                        <span class="lk-co-item-meta">${i.quantidade}x ${formatarMoeda(i.preco)}</span>
                    </div>
                    <span class="lk-co-item-sub">${formatarMoeda(i.preco * i.quantidade)}</span>
                </div>`).join('');

            const vendedoresCount = Object.keys(porVendedor).length;

            const modal = criarModal({
                id: 'modalCheckout',
                titulo: 'Finalizar Compra',
                tamanho: 'medium',
                conteudo: `
                    <div class="lk-co-resumo">
                        <div class="lk-co-items">${itensHtml}</div>
                        <div class="lk-co-totals">
                            <div class="lk-co-row"><span>Subtotal (${itens.length} itens)</span><span>${formatarMoeda(subtotal)}</span></div>
                            <div class="lk-co-row"><span>Taxa de entrega</span><span>${formatarMoeda(taxaEntrega)}</span></div>
                            ${vendedoresCount > 1 ? `<div class="lk-co-row lk-co-info"><span class="material-symbols-outlined" style="font-size:14px">info</span><span>${vendedoresCount} vendedores — pedidos separados</span></div>` : ''}
                            <div class="lk-co-row lk-co-total"><span>Total</span><span>${formatarMoeda(total)}</span></div>
                        </div>
                    </div>
                    <div class="lk-co-form">
                        <div class="lk-co-field">
                            <label>Endereço de entrega *</label>
                            <input type="text" id="lkCoEndereco" placeholder="Ex: Rua 1, Bairro, Cidade" value="">
                        </div>
                        <div class="lk-co-field">
                            <label>Método de pagamento</label>
                            <div class="lk-co-pagamento">
                                <label class="lk-co-pag-opt ativo" data-pag="dinheiro">
                                    <span class="material-symbols-outlined">payments</span>
                                    <span>Dinheiro</span>
                                </label>
                                <label class="lk-co-pag-opt" data-pag="mpesa">
                                    <span class="material-symbols-outlined">phone_iphone</span>
                                    <span>M-Pesa</span>
                                </label>
                                <label class="lk-co-pag-opt" data-pag="emola">
                                    <span class="material-symbols-outlined">smartphone</span>
                                    <span>e-Mola</span>
                                </label>
                                <label class="lk-co-pag-opt" data-pag="transferencia">
                                    <span class="material-symbols-outlined">account_balance</span>
                                    <span>Transferência</span>
                                </label>
                            </div>
                        </div>
                        <div class="lk-co-field">
                            <label>Notas (opcional)</label>
                            <textarea id="lkCoNotas" placeholder="Instruções especiais de entrega..." rows="2"></textarea>
                        </div>
                    </div>`,
                rodape: `
                    <button class="btn btn-outline" data-modal-close>Cancelar</button>
                    <button class="btn btn-primario" id="lkCoConfirmar" style="display:flex;align-items:center;gap:8px;">
                        <span class="material-symbols-outlined" style="font-size:18px">check_circle</span>
                        Confirmar Pedido
                    </button>`
            });

            const modalEl = modal.overlay;

            modalEl.querySelectorAll('.lk-co-pag-opt').forEach(opt => {
                opt.addEventListener('click', () => {
                    modalEl.querySelectorAll('.lk-co-pag-opt').forEach(o => o.classList.remove('ativo'));
                    opt.classList.add('ativo');
                });
            });

            const btnConfirmar = modalEl.querySelector('#lkCoConfirmar');
            btnConfirmar.addEventListener('click', async () => {
                const endereco = modalEl.querySelector('#lkCoEndereco').value.trim();
                if (!endereco) {
                    window.notificar('Informe o endereço de entrega.', 'aviso');
                    modalEl.querySelector('#lkCoEndereco').focus();
                    return;
                }

                const metodo = modalEl.querySelector('.lk-co-pag-opt.ativo')?.dataset.pag || 'dinheiro';
                const notas = modalEl.querySelector('#lkCoNotas').value.trim();

                btnConfirmar.disabled = true;
                btnConfirmar.innerHTML = '<span class="spinner-linka" style="width:18px;height:18px;border-width:2px;"></span> A processar...';

                try {
                    let criados = 0;
                    for (const [vendedorId, items] of Object.entries(porVendedor)) {
                        await window.api.pedidos.criar({
                            itens: items.map(i => ({ produto_id: i.produto_id, quantidade: i.quantidade })),
                            metodo_pagamento: metodo,
                            endereco_entrega: endereco,
                            notas: notas || undefined
                        });
                        criados++;
                    }

                    await window.api.carrinho.limpar();
                    modal.fechar();
                    window.notificar(`${criados} pedido(s) criado(s) com sucesso!`, 'sucesso');
                    window.carregarConteudoDashboard('compras');
                } catch (e) {
                    btnConfirmar.disabled = false;
                    btnConfirmar.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px">check_circle</span> Confirmar Pedido';
                    window.notificar(e.message || 'Erro ao finalizar', 'erro');
                }
            });

        } catch (e) { window.notificar(e.message || 'Erro ao carregar carrinho', 'erro'); }
    };

    // ── Preferências do Utilizador ──
    async function carregarPreferencias() {
        const form = get('lkPrefForm');
        if (!form) return;

        try {
            const r = await window.api.preferencias.obter();
            const p = r.dados || r;

            const toggle = (nome, label, valor) => `
                <label class="lk-pref-toggle">
                    <span>${label}</span>
                    <input type="checkbox" ${valor ? 'checked' : ''} onchange="window._guardarPreferencia('${nome}', this.checked)">
                    <span class="lk-pref-slider"></span>
                </label>`;

            form.innerHTML = `
                <div class="lk-pref-section">
                    <h3>Notificações</h3>
                    ${toggle('notificacoes_push', 'Notificações push', p.notificacoes_push)}
                    ${toggle('notificacoes_chat', 'Notificações de chat', p.notificacoes_chat)}
                    ${toggle('notificacoes_promo', 'Promoções e ofertas', p.notificacoes_promo)}
                    ${toggle('notificacoes_pedido', 'Actualizações de pedidos', p.notificacoes_pedido)}
                </div>
                <div class="lk-pref-section">
                    <h3>Privacidade</h3>
                    ${toggle('perfil_visivel', 'Perfil visível', p.perfil_visivel)}
                    ${toggle('mostrar_email', 'Mostrar email', p.mostrar_email)}
                    ${toggle('mostrar_telefone', 'Mostrar telefone', p.mostrar_telefone)}
                </div>
                <div class="lk-pref-section">
                    <h3>Regional</h3>
                    <div class="lk-pref-select-row">
                        <label>Idioma</label>
                        <select onchange="window._guardarPreferencia('idioma', this.value)">
                            <option value="pt" ${p.idioma === 'pt' ? 'selected' : ''}>Português</option>
                            <option value="en" ${p.idioma === 'en' ? 'selected' : ''}>English</option>
                        </select>
                    </div>
                    <div class="lk-pref-select-row">
                        <label>Moeda</label>
                        <select onchange="window._guardarPreferencia('moeda', this.value)">
                            <option value="MZN" ${p.moeda === 'MZN' ? 'selected' : ''}>MZN (Metical)</option>
                            <option value="USD" ${p.moeda === 'USD' ? 'selected' : ''}>USD (Dólar)</option>
                            <option value="ZAR" ${p.moeda === 'ZAR' ? 'selected' : ''}>ZAR (Rand)</option>
                        </select>
                    </div>
                </div>`;
        } catch (e) {
            form.innerHTML = `<p class="text-center erro">${escaparHtml(e.message)}</p>`;
        }
    }

    window._guardarPreferencia = async function(chave, valor) {
        try {
            await window.api.preferencias.actualizar({ [chave]: valor });
            window.notificar('Preferência guardada.', 'sucesso');
        } catch (e) { window.notificar('Erro ao guardar.', 'erro'); }
    };

    // ── Pedidos ──
    async function carregarPedidosDashboard(modo) {
        const ct = get('listaPedidos'); if (!ct) return;
        try { const r = await window.api.pedidos.listar(); renderizarPedidos(r.dados || [], ct, modo); }
        catch (e) { ct.innerHTML = `<p class="text-center erro">${escaparHtml(e.message)}</p>`; }
    }

    function renderizarPedidos(pedidos, ct, modo) {
        if (!pedidos || pedidos.length === 0) {
            ct.innerHTML = `<div class="stitch-empty-state"><div class="stitch-empty-icon-wrap"><span class="material-symbols-outlined">receipt_long</span></div><h3>Nenhum pedido ainda</h3><p>Os seus pedidos aparecerão aqui.</p></div>`;
            return;
        }
        const estadoBadge = (estado) => {
            const mapa = { pendente: 'bg-pendente', confirmado: 'bg-confirmado', processando: 'bg-processando', enviado: 'bg-enviado', entregue: 'bg-entregue', cancelado: 'bg-cancelado' };
            return `<span class="pedido-estado ${mapa[estado] || 'bg-pendente'}">${escaparHtml(estado)}</span>`;
        };

        ct.innerHTML = '';
        const tabela = criarTabela({
            id: 'tabelaPedidos',
            dados: pedidos,
            buscaPlaceholder: 'Pesquisar pedidos...',
            vazio: 'Nenhum pedido encontrado.',
            colunas: [
                { header: 'ID', accessor: 'id', render: (v) => `#${v}` },
                { header: modo === 'vendedor' ? 'Cliente' : 'Vendedor', accessor: modo === 'vendedor' ? 'cliente_nome' : 'vendedor_nome', render: (v, p) => escaparHtml(p.nome_loja || p.vendedor_nome || p.cliente_nome || '—') },
                { header: 'Total', accessor: 'total', render: (v) => `<strong>MZN ${formatarDinheiro(v || 0)}</strong>` },
                { header: 'Estado', accessor: 'estado', render: (v) => estadoBadge(v) },
                { header: 'Data', accessor: 'criado_em', render: (v) => formatarDataCompleta(v) }
            ],
            acoes: [
                { key: 'ver', label: 'Ver Detalhe', icon: 'visibility', onClick: (id) => { window._pedidoDetalheId = id; window.carregarConteudoDashboard('pedido-detalhe'); } },
                { key: 'cancelar', label: 'Cancelar', icon: 'close', onClick: (id) => {
                    const pode = !['entregue', 'cancelado'].includes(pedidos.find(p => p.id === id)?.estado);
                    if (!pode) { notificar('Este pedido não pode ser cancelado.', 'aviso'); return; }
                    confirmarAcao('Cancelar Pedido', 'Tem a certeza que deseja cancelar este pedido?', async () => {
                        try { await window.api.pedidos.cancelar(id, 'Cancelado'); notificar('Pedido cancelado.', 'sucesso'); carregarPedidosDashboard(modo); }
                        catch (e) { notificar(e.message, 'erro'); }
                    });
                }}
            ]
        });
        ct.appendChild(tabela);
    }

    // ── Favoritos ──
    async function carregarFavoritosDashboard() {
        const ct = get('listaFavoritos'); const ev = get('favoritoVazio'); const fc = get('favContador');
        if (!ct) return;
        try {
            const r = await window.api.favoritos.listar(); const favs = r.dados || [];
            if (fc) fc.textContent = `(${favs.length})`;
            if (favs.length === 0) { ct.innerHTML = ''; if (ev) ev.style.display = 'flex'; return; }
            if (ev) ev.style.display = 'none';
            renderizarFavoritosComRemover(favs, ct);
        } catch (e) { ct.innerHTML = `<p class="text-center erro">${e.message}</p>`; }
    }

    // ── Chat ──
    async function inicializarModuloChat() {
        conversaAtiva = null;
        await recarregarListaConversas();
        document.body.classList.add('chat-active');
    }

    // ── Mobile Keyboard Handler ──
    // Usa visualViewport para redimensionar o container quando o teclado abre.
    // APENAS ajusta a altura — NÃO toca no input (flex-shrink:0 faz o trabalho).
    (function initKeyboardHandler() {
        if (!window.visualViewport) return;
        let pendingUpdate = null;

        function ajustarChatTeclado() {
            const chatSection = get('chatSection');
            if (!chatSection || chatSection.classList.contains('escondido')) return;

            const vh = window.visualViewport.height;
            const offset = window.visualViewport.offsetTop || 0;

            // Container fica exactamente na área visível (acima do teclado)
            chatSection.style.height = vh + 'px';
            chatSection.style.top = offset + 'px';

            // Scroll mensagens para fundo se estava no fundo
            const mc = get('mensagensContainer');
            if (mc && scrollEstavaNoFundo) {
                mc.scrollTop = mc.scrollHeight;
            }
        }

        function debouncedAjustar() {
            if (pendingUpdate) cancelAnimationFrame(pendingUpdate);
            pendingUpdate = requestAnimationFrame(() => {
                ajustarChatTeclado();
                pendingUpdate = null;
            });
        }

        window.visualViewport.addEventListener('resize', debouncedAjustar);
        window.visualViewport.addEventListener('scroll', debouncedAjustar);
    })();

    window.toggleChatSearch = function () {
        const bar = get('chatSearchBar');
        const title = get('chatTopbarTitle');
        if (!bar) return;
        bar.classList.toggle('escondido');
        if (!bar.classList.contains('escondido')) {
            const input = get('chatSearchInput');
            if (input) { input.value = ''; input.focus(); }
            if (title) title.textContent = 'Pesquisar';
        } else {
            if (title) title.textContent = 'Conversas';
            renderizarListaConversas();
        }
    };

    window.filtrarConversasChat = function (termo) {
        const t = termo.trim().toLowerCase();
        if (!t) { renderizarListaConversas(); return; }
        const filtradas = conversasCarregadas.filter(c =>
            (c.outro_nome || '').toLowerCase().includes(t) ||
            (c.produto_titulo || '').toLowerCase().includes(t) ||
            (c.ultima_mensagem || '').toLowerCase().includes(t)
        );
        const lt = get('listaConversas'); if (!lt) return;
        if (filtradas.length === 0) {
            lt.innerHTML = '<p class="text-center" style="padding:40px;color:var(--outline);">Nenhuma conversa encontrada.</p>';
            return;
        }
        const temp = conversasCarregadas;
        conversasCarregadas = filtradas;
        renderizarListaConversas();
        conversasCarregadas = temp;
    };
    async function recarregarListaConversas() {
        const lt = get('listaConversas'); if (!lt) return;
        try {
            const r = await window.api.conversas.listar();
            if (r.sucesso) {
                conversasCarregadas = r.dados || [];
                renderizarListaConversas();
            } else {
                conversasCarregadas = [];
                lt.innerHTML = '<div class="stitch-empty-state"><div class="stitch-empty-icon-wrap"><span class="material-symbols-outlined">chat_bubble_outline</span></div><h3>Sem conversas</h3><p>Clique num produto para negociar!</p></div>';
            }
        } catch (e) {
            console.error('[CHAT] Erro ao carregar conversas:', e);
            conversasCarregadas = [];
            lt.innerHTML = '<div class="stitch-empty-state"><div class="stitch-empty-icon-wrap"><span class="material-symbols-outlined">chat_bubble_outline</span></div><h3>Sem conversas</h3><p>Clique num produto para negociar!</p></div>';
        }
    }
    function renderizarListaConversas() {
        const lt = get('listaConversas'); if (!lt) return;
        if (conversasCarregadas.length === 0) { lt.innerHTML = '<div class="stitch-empty-state"><div class="stitch-empty-icon-wrap"><span class="material-symbols-outlined">chat_bubble_outline</span></div><h3>Sem conversas</h3></div>'; return; }
        lt.innerHTML = conversasCarregadas.map(c => {
            const n = c.outro_nome || 'User';
            const ini = n.split(' ').map(x => x[0]).join('').substring(0, 2).toUpperCase();
            const at = (conversaAtiva && conversaAtiva.id === c.id) ? 'active' : '';
            const preview = c.ultima_mensagem ? escaparHtml(c.ultima_mensagem) : 'Clique para conversar';
            const tempo = c.ultima_mensagem_em ? formatarDataRelativa(c.ultima_mensagem_em) : '';
            const unread = c.nao_lidas > 0 ? `<div class="lk-chat-unread">${c.nao_lidas}</div>` : '';
            const isUnread = c.nao_lidas > 0 ? 'font-weight:700;' : '';
            return `<a class="lk-chat-item ${at}" onclick="event.preventDefault(); window.abrirConversa(${c.id})" href="#">
                <div class="lk-chat-item-avatar">${ini}</div>
                <div class="lk-chat-item-body">
                    <div class="lk-chat-item-top">
                        <h3 class="lk-chat-item-name" style="${isUnread}">${escaparHtml(n)}</h3>
                        <span class="lk-chat-item-time">${tempo}</span>
                    </div>
                    <div class="lk-chat-item-bottom">
                        <p class="lk-chat-item-preview" style="${isUnread}">${preview}</p>
                        ${unread}
                    </div>
                </div>
            </a>`;
        }).join('');
    }
    function formatarDataSeparador(dataISO) {
        const d = new Date(dataISO);
        const hoje = new Date();
        const ontem = new Date(hoje); ontem.setDate(ontem.getDate() - 1);
        if (d.toDateString() === hoje.toDateString()) return 'Hoje';
        if (d.toDateString() === ontem.toDateString()) return 'Ontem';
        return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' });
    }

    window.abrirConversa = async (cid) => {
        const c = conversasCarregadas.find(x => x.id === cid); if (!c) return;
        if (conversaAtiva && socket) socket.emit('chat:sair', conversaAtiva.id);
        conversaAtiva = c; renderizarListaConversas(); if (socket) socket.emit('chat:entrar', cid);
        const j = get('janelaChatStitch');
        if (!j) return;

        const layout = document.querySelector('.lk-chat-standalone') || document.querySelector('.lk-chat-layout');
        if (layout) layout.classList.add('chat-window-ativa');

        const n = c.outro_nome || 'User';
        const ini = n.split(' ').map(x => x[0]).join('').substring(0, 2).toUpperCase();
        const dest = (c.utilizador1_id === utilizadorLogado.id) ? c.utilizador2_id : c.utilizador1_id;

        // Reset pagination state
        chatOffset = 0;
        chatHaMais = true;
        chatCarregandoMais = false;

        j.innerHTML = `
            <div class="chat-header">
                <div class="chat-header-info">
                    <div class="chat-header-back" onclick="window.voltarParaListaChat()"><span class="material-symbols-outlined">arrow_back</span></div>
                    <div class="chat-header-avatar">${ini}</div>
                    <div class="chat-header-dados">
                        <div class="chat-header-nome">${escaparHtml(n)}</div>
                        <div class="chat-header-status">Online</div>
                    </div>
                </div>
                ${c.produto_preco ? `<div class="chat-header-produto"><div class="chat-header-produto-preco">MZN ${formatarDinheiro(c.produto_preco)}</div>${c.produto_titulo ? `<div class="chat-header-produto-titulo">${escaparHtml(c.produto_titulo)}</div>` : ''}</div>` : ''}
            </div>
            <div class="chat-mensagens" id="mensagensContainer">
                <p class="text-center p-20" style="color:#9ca3af;">A carregar mensagens...</p>
            </div>
            <div class="chat-escrevendo-container" id="typingIndicator" style="display:none;">
                <div class="typing-bubble"><span></span><span></span><span></span></div>
                <span class="typing-text">${escaparHtml(n)} está a escrever...</span>
            </div>
            <form class="chat-input-area" id="formEnviarMensagem">
                <input type="text" id="inputMensagem" placeholder="Escreva uma mensagem..." autocomplete="off" required>
                <button type="submit" class="chat-btn-enviar" id="btnEnviarMsg"><span class="material-symbols-outlined">send</span></button>
            </form>`;

        // Carregar últimas 30 mensagens
        try {
            const r = await window.api.conversas.obterMensagens(cid, `?limite=${CHAT_PAGE_SIZE}&offset=0`);
            if (r.sucesso) {
                chatOffset = r.dados.length;
                chatHaMais = r.dados.length >= CHAT_PAGE_SIZE;
                renderizarMensagens(r.dados);
            }
        } catch {
            const mc = get('mensagensContainer');
            if (mc) mc.innerHTML = '<p class="text-center p-20 text-erro">Erro ao carregar mensagens.</p>';
        }

        const fm = get('formEnviarMensagem'); const im = get('inputMensagem');
        if (fm) fm.addEventListener('submit', (e) => { e.preventDefault(); enviarMensagemChat(dest, c.produto_id, im.value); emitirEscrita(false); });
        if (im) im.addEventListener('input', () => { emitirEscrita(true); clearTimeout(statusEscrevendoTimeout); statusEscrevendoTimeout = setTimeout(() => emitirEscrita(false), 2000); });

        // Scroll tracking — detectar se usuário está perto do fundo E carregar mais ao topo
        const mc = get('mensagensContainer');
        if (mc) {
            mc.addEventListener('scroll', onChatScroll, { passive: true });
            scrollEstavaNoFundo = true;
        }
    };

    window.voltarParaListaChat = function () {
        if (conversaAtiva && socket) socket.emit('chat:sair', conversaAtiva.id);
        const layout = document.querySelector('.lk-chat-standalone') || document.querySelector('.lk-chat-layout');
        if (layout) layout.classList.remove('chat-window-ativa');
        conversaAtiva = null;
        const j = get('janelaChatStitch');
        if (j) j.innerHTML = '<div class="lk-chat-window-empty"><span class="material-symbols-outlined">forum</span><p>Selecione uma conversa</p></div>';
        renderizarListaConversas();
    };

    function renderizarMensagens(msgs, prepend = false) {
        const ct = get('mensagensContainer'); if (!ct) return;
        const m = [...msgs].reverse();
        if (m.length === 0 && !prepend) { ct.innerHTML = '<p class="text-center p-20" style="color:#9ca3af;">Sem mensagens ainda. Digite a primeira!</p>'; return; }
        if (m.length === 0) return;

        // Agrupar por dia
        const dias = {};
        m.forEach(msg => {
            const chave = new Date(msg.criado_em).toDateString();
            if (!dias[chave]) dias[chave] = [];
            dias[chave].push(msg);
        });

        const html = Object.entries(dias).map(([chave, msgsDoDia]) => {
            const rotulo = formatarDataSeparador(msgsDoDia[0].criado_em);
            return `<div class="chat-date-sep"><span>${rotulo}</span></div>` +
                msgsDoDia.map(msg => {
                    const eu = msg.remetente_id === utilizadorLogado.id;
                    return `<div class="mensagem-linha ${eu ? 'enviada' : 'recebida'}"><div class="mensagem-balao">${escaparHtml(msg.conteudo)}</div><div class="mensagem-hora">${formatarHora(msg.criado_em)}</div></div>`;
                }).join('');
        }).join('');

        if (prepend) {
            // Modo prepend — inserir no topo (após loader se existir)
            const loader = document.getElementById('chatLoadMoreLoader');
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            const fragment = document.createDocumentFragment();
            while (tempDiv.firstChild) fragment.appendChild(tempDiv.firstChild);
            if (loader) {
                loader.after(fragment);
            } else {
                ct.prepend(fragment);
            }
        } else {
            // Modo normal — substituir conteúdo
            ct.innerHTML = html;
            scrollMensagensAoFundo();
        }
    }

    function adicionarMensagemAoEcra(msg) {
        const ct = get('mensagensContainer'); if (!ct) return;
        const eu = msg.remetente_id === utilizadorLogado.id;
        const ultimoSep = ct.querySelector('.chat-date-sep:last-child');
        const dataMsg = new Date(msg.criado_em).toDateString();
        if (!ultimoSep || ultimoSep.dataset.date !== dataMsg) {
            const sep = document.createElement('div');
            sep.className = 'chat-date-sep';
            sep.dataset.date = dataMsg;
            sep.innerHTML = `<span>${formatarDataSeparador(msg.criado_em)}</span>`;
            ct.appendChild(sep);
        }
        const d = document.createElement('div');
        d.className = `mensagem-linha ${eu ? 'enviada' : 'recebida'}`;
        d.dataset.msgId = msg.id || ('temp_' + Date.now());
        const statusIcon = eu ? `<span class="msg-status ${msg.status === 'sending' ? 'enviando' : ''}">${msg.status === 'error' ? 'error' : 'schedule'}</span>` : '';
        d.innerHTML = `<div class="mensagem-balao">${escaparHtml(msg.conteudo)}</div><div class="mensagem-hora">${formatarHora(msg.criado_em)}${statusIcon}</div>`;
        ct.appendChild(d);
        scrollMensagensAoFundo(true);
    }
    async function enviarMensagemChat(dest, pid, conteudo) {
        if (!conteudo.trim()) return;
        const im = get('inputMensagem');
        const ct = get('mensagensContainer');

        // 1. Optimistic update — criar mensagem local imediatamente
        const tempId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        const msgLocal = {
            id: tempId,
            conteudo: conteudo.trim(),
            remetente_id: utilizadorLogado.id,
            criado_em: new Date().toISOString(),
            status: 'sending'
        };
        adicionarMensagemAoEcra(msgLocal);

        // 2. Limpar input E manter foco (não fechar teclado)
        if (im) {
            im.value = '';
            // Usar requestAnimationFrame para garantir foco após actualização do DOM
            requestAnimationFrame(() => {
                im.focus({ preventScroll: true });
            });
        }

        // 3. Enviar via Socket.IO com fallback REST
        try {
            if (socket && socket.connected) {
                socket.emit('chat:enviar', {
                    conversaId: conversaAtiva ? conversaAtiva.id : undefined,
                    destinatario_id: dest,
                    produto_id: pid,
                    conteudo: msgLocal.conteudo
                }, (res) => {
                    if (res && res.sucesso) {
                        atualizarStatusMensagem(tempId, 'sent');
                        substituirIdMensagem(tempId, res.dados ? res.dados.mensagem_id : null);
                    } else {
                        atualizarStatusMensagem(tempId, 'error');
                    }
                });
            } else {
                // Fallback REST
                const r = await window.api.conversas.enviar({ destinatario_id: dest, produto_id: pid, conteudo: msgLocal.conteudo });
                if (r.sucesso) {
                    atualizarStatusMensagem(tempId, 'sent');
                    substituirIdMensagem(tempId, r.dados ? r.dados.mensagem_id : null);
                } else {
                    atualizarStatusMensagem(tempId, 'error');
                }
            }
        } catch (e) {
            atualizarStatusMensagem(tempId, 'error');
            window.notificar('Erro ao enviar mensagem.', 'erro');
        }
    }

    function atualizarStatusMensagem(tempId, status) {
        const el = document.querySelector(`[data-msg-id="${tempId}"]`);
        if (!el) return;
        const statusIcon = el.querySelector('.msg-status');
        if (statusIcon) {
            statusIcon.classList.remove('enviando', 'erro');
            if (status === 'sending') {
                statusIcon.textContent = 'schedule';
                statusIcon.classList.add('enviando');
            } else if (status === 'sent') {
                statusIcon.textContent = 'done';
            } else if (status === 'delivered') {
                statusIcon.textContent = 'done_all';
            } else if (status === 'read') {
                statusIcon.textContent = 'done_all';
                statusIcon.style.color = '#3b82f6';
            } else if (status === 'error') {
                statusIcon.textContent = 'error';
                statusIcon.classList.add('erro');
            }
        }
    }

    function substituirIdMensagem(tempId, realId) {
        if (!realId) return;
        const el = document.querySelector(`[data-msg-id="${tempId}"]`);
        if (el) el.dataset.msgId = realId;
    }
    function emitirEscrita(e) { if (!socket || !conversaAtiva || isTyping === e) return; isTyping = e; socket.emit('chat:escrevendo', { conversaId: conversaAtiva.id, escrevendo: e }); }
    function mostrarIndicadorEscrita(escrevendo) { const i = get('typingIndicator'); if (!i) return; i.style.display = escrevendo ? 'flex' : 'none'; if (escrevendo) scrollMensagensAoFundo(true); }

    function onChatScroll() {
        const c = get('mensagensContainer');
        if (!c) return;

        // 1. Tracking de fundo (para auto-scroll em mensagens novas)
        scrollEstavaNoFundo = (c.scrollHeight - c.scrollTop - c.clientHeight) < 200;
        if (scrollEstavaNoFundo) {
            const badge = document.getElementById('badgeNovasMensagens');
            if (badge) badge.classList.remove('visivel');
        }

        // 2. Lazy load ao topo — carregar mensagens mais antigas
        if (c.scrollTop < 80 && chatHaMais && !chatCarregandoMais && conversaAtiva) {
            carregarMaisMensagens(conversaAtiva.id);
        }
    }

    async function carregarMaisMensagens(conversaId) {
        if (chatCarregandoMais || !chatHaMais) return;
        chatCarregandoMais = true;

        const c = get('mensagensContainer');
        if (!c) { chatCarregandoMais = false; return; }

        // Medir altura actual para preservar scroll
        const alturaAntes = c.scrollHeight;

        // Mostrar separador "A carregar..."
        let loader = document.getElementById('chatLoadMoreLoader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'chatLoadMoreLoader';
            loader.className = 'chat-load-more';
            loader.innerHTML = '<div class="chat-load-more-spinner"></div><span>A carregar mensagens mais antigas...</span>';
            c.prepend(loader);
        }

        try {
            const r = await window.api.conversas.obterMensagens(conversaId, `?limite=${CHAT_PAGE_SIZE}&offset=${chatOffset}`);
            if (r.sucesso && r.dados.length > 0) {
                chatOffset += r.dados.length;
                chatHaMais = r.dados.length >= CHAT_PAGE_SIZE;

                // Renderizar mensagens antigas (prepend)
                renderizarMensagens(r.dados, true);

                // Preservar posição de scroll (empurrar para baixo pela altura das novas mensagens)
                const alturaDepois = c.scrollHeight;
                c.scrollTop = alturaDepois - alturaAntes;
            } else {
                chatHaMais = false;
                if (loader) loader.remove();
            }
        } catch (e) {
            console.error('[CHAT] Erro ao carregar mais mensagens:', e);
        } finally {
            chatCarregandoMais = false;
            // Remover loader se não há mais mensagens
            if (!chatHaMais && loader) loader.remove();
        }
    }

    function scrollMensagensAoFundo(forcar) {
        const c = get('mensagensContainer');
        if (!c) return;
        if (forcar || scrollEstavaNoFundo) {
            c.scrollTo({ top: c.scrollHeight, behavior: forcar ? 'auto' : 'smooth' });
        } else {
            mostrarBadgeNovasMensagens();
        }
    }

    function mostrarBadgeNovasMensagens() {
        let badge = document.getElementById('badgeNovasMensagens');
        if (!badge) {
            const container = get('mensagensContainer');
            if (!container) return;
            badge = document.createElement('div');
            badge.id = 'badgeNovasMensagens';
            badge.className = 'chat-novas-mensagens';
            badge.onclick = () => scrollMensagensAoFundo(true);
            container.parentElement.appendChild(badge);
        }
        badge.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px">arrow_downward</span> Novas mensagens';
        badge.classList.add('visivel');
    }

    window.contactarVendedor = async (dest, pid, titulo) => {
        if (!utilizadorLogado) { window.notificar('Inicie sessão.', 'info'); return; }
        try {
            const r = await window.api.conversas.enviar({ destinatario_id: dest, produto_id: pid, conteudo: `Olá! Tenho interesse em "${titulo}".` });
            if (r.sucesso) {
                window.fecharModalDetalhes();
                empurrarNavegacao({ secao: 'mensagens', tab: 'mensagens', scrollY: 0 });
                mostrarSecaoCliente('mensagens');
                inicializarModuloChat();
                setTimeout(() => window.abrirConversa(r.dados.conversa_id), 200);
            }
        } catch (e) { window.notificar(e.message, 'erro'); }
    };

    // ── Perfil ──
    async function carregarPerfilCompleto() {
        const ct = get('perfilContainer'); if (!ct) return;
        try {
            const r = await window.api.utilizadores.perfil(); const p = r.dados;
            const ini = (p.nome || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            const fotoHtml = p.fotografia_perfil
                ? `<img src="${resolverUrlImagem(p.fotografia_perfil)}" alt="Foto">`
                : ini;

            ct.innerHTML = `
            <div class="perfil-header-v2">
                <div class="perfil-avatar-section">
                    <div class="perfil-avatar-wrap">
                        <div class="perfil-avatar-v2">${fotoHtml}</div>
                        <label class="perfil-avatar-camera-v2" for="editFotoV2">
                            <span class="material-symbols-outlined">photo_camera</span>
                        </label>
                    </div>
                    <div class="perfil-nome-v2">${escaparHtml(p.nome || '')}</div>
                    <div class="perfil-email-v2">${escaparHtml(p.email || '')}</div>
                    <div class="perfil-badge-v2">
                        <span class="material-symbols-outlined">check_circle</span> Conta Verificada
                    </div>
                </div>
            </div>

            <div class="perfil-stats-v2">
                <div class="perfil-stat-card">
                    <div class="perfil-stat-num" id="perfilStatAnuncios">0</div>
                    <div class="perfil-stat-label">Anúncios</div>
                </div>
                <div class="perfil-stat-card">
                    <div class="perfil-stat-num" id="perfilStatFavoritos">0</div>
                    <div class="perfil-stat-label">Favoritos</div>
                </div>
                <div class="perfil-stat-card">
                    <div class="perfil-stat-num" id="perfilStatPedidos">0</div>
                    <div class="perfil-stat-label">Pedidos</div>
                </div>
            </div>

            <div class="perfil-menu-v2">
                <div class="perfil-menu-item-v2" onclick="window.mostrarPerfilEditar()">
                    <div class="perfil-menu-icon-v2 green"><span class="material-symbols-outlined">edit</span></div>
                    <div class="perfil-menu-text-v2">
                        <div class="perfil-menu-label-v2">Editar Perfil</div>
                        <div class="perfil-menu-desc-v2">Nome, telefone, fotografia</div>
                    </div>
                    <span class="material-symbols-outlined perfil-menu-arrow-v2">chevron_right</span>
                </div>
                <div class="perfil-menu-item-v2" onclick="window.mostrarSegurancaPerfil()">
                    <div class="perfil-menu-icon-v2 blue"><span class="material-symbols-outlined">lock</span></div>
                    <div class="perfil-menu-text-v2">
                        <div class="perfil-menu-label-v2">Segurança</div>
                        <div class="perfil-menu-desc-v2">Password, verificação em duas etapas</div>
                    </div>
                    <span class="material-symbols-outlined perfil-menu-arrow-v2">chevron_right</span>
                </div>
                <div class="perfil-menu-item-v2" onclick="window.mostrarNotificacoesPerfil()">
                    <div class="perfil-menu-icon-v2 purple"><span class="material-symbols-outlined">notifications</span></div>
                    <div class="perfil-menu-text-v2">
                        <div class="perfil-menu-label-v2">Notificações</div>
                        <div class="perfil-menu-desc-v2">Gerir alertas e preferências</div>
                    </div>
                    <span class="material-symbols-outlined perfil-menu-arrow-v2">chevron_right</span>
                </div>
                <div class="perfil-menu-item-v2" onclick="window.mostrarAjudaPerfil()">
                    <div class="perfil-menu-icon-v2 orange"><span class="material-symbols-outlined">help</span></div>
                    <div class="perfil-menu-text-v2">
                        <div class="perfil-menu-label-v2">Ajuda e Suporte</div>
                        <div class="perfil-menu-desc-v2">FAQ, contacto, termos</div>
                    </div>
                    <span class="material-symbols-outlined perfil-menu-arrow-v2">chevron_right</span>
                </div>
            </div>

            <button class="btn-tornar-vendedor-mobile" onclick="window.confirmarAcao('Tornar-me Vendedor', 'Sera redireccionado para o registo de vendedor na página inicial.', () => { window.location.href = '../index.html#vendedor'; })">
                <div class="btn-tv-icon"><span class="material-symbols-outlined">store</span></div>
                <div class="btn-tv-text">
                    <h4>Tornar-me Vendedor</h4>
                    <p>Comece a vender na LINKA</p>
                </div>
            </button>

            <div id="perfilEditarContainer"></div>
            `;

            // Load stats
            carregarPerfilStats();
        } catch { ct.innerHTML = '<p class="text-erro text-center p-20">Erro ao carregar perfil.</p>'; }
    }

    async function carregarPerfilStats() {
        try {
            const favR = await window.api.favoritos.listar();
            const favs = favR.dados || [];
            const ef = get('perfilStatFavoritos'); if (ef) ef.textContent = favs.length;
        } catch (e) { console.warn('Erro ao carregar favoritos:', e.message); }
        try {
            const pedR = await window.api.pedidos.listar();
            const peds = pedR.dados || [];
            const ep = get('perfilStatPedidos'); if (ep) ep.textContent = peds.length;
        } catch (e) { console.warn('Erro ao carregar pedidos:', e.message); }
        try {
            const prodR = await window.api.produtos.listar('?meus=true');
            const prods = prodR.dados || [];
            const ea = get('perfilStatAnuncios'); if (ea) ea.textContent = prods.length;
        } catch (e) { console.warn('Erro ao carregar anúncios:', e.message); }
    }

    window.mostrarPerfilEditar = async function () {
        try {
            const r = await window.api.utilizadores.perfil();
            const p = r.dados;
            const modal = criarModal({
                id: 'modalEditarPerfil',
                titulo: 'Editar Perfil',
                tamanho: 'medium',
                conteudo: `
                    <form id="formPerfilEditavel">
                        <div class="lk-campo-grupo">
                            <div class="lk-campo-grupo-titulo">Dados Pessoais</div>
                            <div class="lk-campo">
                                <label class="lk-campo-label">Nome Completo <span class="lk-campo-required">*</span></label>
                                <input class="lk-campo-input" type="text" id="editNomeV2" name="nome" placeholder="O seu nome completo" value="${escaparHtml(p.nome || '')}">
                                <span class="lk-campo-erro"></span>
                            </div>
                            <div class="lk-campo-linha">
                                <div class="lk-campo">
                                    <label class="lk-campo-label">Email</label>
                                    <input class="lk-campo-input" type="email" value="${escaparHtml(p.email || '')}" disabled>
                                </div>
                                <div class="lk-campo">
                                    <label class="lk-campo-label">Telefone</label>
                                    <input class="lk-campo-input" type="tel" id="editTelefoneV2" name="telefone" placeholder="84 000 0000" value="${escaparHtml(p.telefone || '')}">
                                    <span class="lk-campo-erro"></span>
                                    <span class="lk-campo-help">Formato: 84XXXXXXX</span>
                                </div>
                            </div>
                            <div class="lk-campo">
                                <label class="lk-campo-label">Fotografia de Perfil</label>
                                <input class="lk-campo-input" type="file" id="editFotoV2" accept="image/*" style="padding:8px;">
                            </div>
                        </div>
                    </form>
                `,
                rodape: `
                    <button class="btn btn-outline" data-modal-close>Cancelar</button>
                    <button class="btn btn-primario" id="btnGuardarPerfil">Guardar Alterações</button>
                `
            });

            configurarValidacao(document.getElementById('editNomeV2'), ['required', { test: v => v.trim().length >= 3, msg: 'Mínimo 3 caracteres.' }]);
            configurarValidacao(document.getElementById('editTelefoneV2'), ['telefone']);

            const btnGuardar = modal.modal.querySelector('#btnGuardarPerfil');
            salvarTextoOriginal(btnGuardar);

            btnGuardar.addEventListener('click', async () => {
                const nomeInput = document.getElementById('editNomeV2');
                const telInput = document.getElementById('editTelefoneV2');
                const valNome = validarCampo(nomeInput, ['required', { test: v => v.trim().length >= 3, msg: 'Mínimo 3 caracteres.' }]);
                const valTel = validarCampo(telInput, ['telefone']);

                if (!valNome || !valTel) { notificar('Corrija os erros no formulário.', 'aviso'); return; }

                definirEstadoBotao(btnGuardar, 'loading', 'A guardar...');
                try {
                    const fotoInput = document.getElementById('editFotoV2');
                    let dados;
                    if (fotoInput && fotoInput.files.length > 0) {
                        dados = new FormData();
                        dados.append('nome', nomeInput.value);
                        dados.append('telefone', telInput.value);
                        dados.append('fotografia', fotoInput.files[0]);
                    } else {
                        dados = { nome: nomeInput.value, telefone: telInput.value };
                    }
                    const r = await window.api.utilizadores.atualizar(dados);
                    if (r.sucesso) {
                        notificar('Perfil atualizado com sucesso!', 'sucesso');
                        if (r.dados?.utilizador) utilizadorLogado = r.dados.utilizador;
                        carregarPerfilCompleto();
                        modal.fechar();
                    } else {
                        throw new Error(r.erro || 'Erro ao atualizar');
                    }
                } catch (e) {
                    notificar(e.message, 'erro');
                    definirEstadoBotao(btnGuardar, 'error', 'Tentar novamente');
                }
            });
        } catch { notificar('Erro ao carregar dados do perfil.', 'erro'); }
    };

    // ── Favoritos (Tailwind MD3 Cards) ──
    function renderizarFavoritosComRemover(favs, container) {
        if (!favs || favs.length === 0) { container.innerHTML = ''; return; }
        container.className = 'fav-grid';
        container.innerHTML = favs.map((p, i) => {
            const imgPath = (p.imagens && p.imagens[0]) ? (typeof p.imagens[0] === 'string' ? p.imagens[0] : p.imagens[0].caminho) : p.imagem_url;
            const img = resolverUrlImagem(imgPath);
            const preco = p.preco ? `MZN ${formatarDinheiro(p.preco)}` : '';
            const marca = p.marca || p.categoria_nome || '';
            const badge = p.promocao ? '<div class="fav-badge fav-badge-promo">PROMO</div>' : (p.novo ? '<div class="fav-badge fav-badge-new">NEW</div>' : '');
            const delay = Math.min(i * 0.06, 0.4);
            return `
            <div class="fav-card" onclick="window.abrirDetalhes(${p.id})" style="animation-delay:${delay}s;">
                <div class="fav-card-img-wrap">
                    <img src="${img}" alt="${escaparHtml(p.titulo)}" loading="lazy">
                    <button class="fav-card-fav-btn" onclick="event.stopPropagation();window.removerFavorito(${p.id})" title="Remover dos favoritos">
                        <span class="material-symbols-outlined">favorite</span>
                    </button>
                    ${badge}
                </div>
                <div class="fav-card-body">
                    ${marca ? `<p class="fav-card-brand">${escaparHtml(marca)}</p>` : ''}
                    <h3 class="fav-card-title">${escaparHtml(p.titulo)}</h3>
                    <div class="fav-card-price">
                        <span>${preco}</span>
                    </div>
                </div>
            </div>
        `}).join('');
    }

    window.removerFavorito = async function(produtoId) {
        try { await window.api.favoritos.remover(produtoId); notificar('Removido dos favoritos.', 'sucesso'); carregarFavoritosDashboard(); }
        catch(e) { notificar(e.message, 'erro'); }
    };

    // ── Minhas Denúncias ──
    async function carregarMinhasDenuncias() {
        const ct = get('listaDenuncias'); if (!ct) return;
        try {
            const r = await window.api.denuncias.listarMinhas();
            const denuncias = r.dados || [];
            if (denuncias.length === 0) {
                ct.innerHTML = '<div class="stitch-empty-state"><div class="stitch-empty-icon-wrap"><span class="material-symbols-outlined">flag</span></div><h3>Nenhuma denúncia realizada</h3><p>Suas denúncias ajudam a manter a LINKA segura para todos.</p></div>';
                return;
            }

            const motivosMap = {
                fraude: { label: 'Golpe ou Fraude', icon: 'warning' },
                conteudo_inapropriado: { label: 'Conteúdo Impróprio', icon: 'warning' },
                spam: { label: 'Spam', icon: 'warning' },
                produto_falso: { label: 'Produto Falso', icon: 'warning' },
                preco_abusivo: { label: 'Preço Abusivo', icon: 'warning' },
                outro: { label: 'Outro', icon: 'warning' }
            };

            const estadosMap = {
                pendente: 'Pendente',
                em_analise: 'Em análise',
                resolvida: 'Resolvido',
                rejeitada: 'Recusado'
            };

            const acoesFooter = {
                em_analise: (d) => `<button class="denuncia-card-acao-btn" onclick="window.carregarDenunciaDetalhe(${d.id})">Ver Detalhes</button>`,
                resolvida: (d) => `
                    ${d.resposta_admin ? `<span class="denuncia-card-acao-info"><span class="material-symbols-outlined">check_circle</span>Ação tomada: ${escaparHtml(d.resposta_admin)}</span>` : ''}
                    <button class="denuncia-card-acao-btn" onclick="window.carregarDenunciaDetalhe(${d.id})">Ver Resolução</button>`,
                rejeitada: (d) => `
                    <span class="denuncia-card-acao-info">Informação insuficiente</span>
                    <button class="denuncia-card-acao-btn" onclick="window.carregarDenunciaDetalhe(${d.id})">Ver Justificativa</button>`,
                pendente: (d) => `<button class="denuncia-card-acao-btn" onclick="window.carregarDenunciaDetalhe(${d.id})">Ver Detalhes</button>`
            };

            const dataFormatada = (s) => {
                if (!s) return '—';
                const d = new Date(s);
                const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
                return `${String(d.getDate()).padStart(2,'0')} ${meses[d.getMonth()]} ${d.getFullYear()}`;
            };

            const cards = denuncias.map(d => {
                const tipo = d.produto_id ? 'PRODUTO' : 'PERFIL';
                const motivo = motivosMap[d.motivo] || { label: d.motivo, icon: 'flag' };
                const estadoLabel = estadosMap[d.estado] || d.estado;
                const estadoPill = `denuncia-status-${d.estado}`;
                const nomeAlvo = d.produto_titulo || d.denunciado_nome || 'Item denunciado';
                const footer = acoesFooter[d.estado] ? acoesFooter[d.estado](d) : '';

                return `
                <div class="denuncia-card">
                    <div class="denuncia-card-topo">
                        <div>
                            <span class="denuncia-card-tipo">${escaparHtml(tipo)}</span>
                            <h3 class="denuncia-card-titulo">${escaparHtml(nomeAlvo)}</h3>
                        </div>
                        <span class="denuncia-status-pill ${estadoPill}">${escaparHtml(estadoLabel)}</span>
                    </div>
                    <div class="denuncia-card-corpo">
                        <div class="denuncia-card-meta">
                            <span class="material-symbols-outlined">${motivo.icon}</span>
                            <span class="denuncia-card-meta-tipo">${escaparHtml(motivo.label)}</span>
                            <span class="denuncia-card-meta-sep">•</span>
                            <span class="denuncia-card-meta-data">${dataFormatada(d.criado_em)}</span>
                        </div>
                        <p class="denuncia-card-descricao">"${escaparHtml(d.descricao || '')}"</p>
                    </div>
                    <div class="denuncia-card-acoes">
                        ${footer}
                    </div>
                </div>`;
            }).join('');

            ct.innerHTML = `
                <div class="denuncias-lista">${cards}</div>
                <div class="denuncias-info-banner">
                    <span class="material-symbols-outlined">info</span>
                    <div class="denuncias-info-banner-texto">
                        <h4>Como funciona a nossa análise?</h4>
                        <p>Cada denúncia é revisada individualmente pela nossa equipa de moderação. O prazo médio de resposta é de 48 horas úteis.</p>
                    </div>
                </div>`;
        } catch(e) { ct.innerHTML = `<p class="text-center text-erro">${escaparHtml(e.message)}</p>`; }
    }

    // ── Detalhe de Denúncia ──
    async function carregarDenunciaDetalhe(denunciaId) {
        const ct = get('listaDenuncias'); if (!ct || !denunciaId) return;
        try {
            const r = await window.api.denuncias.obter(denunciaId);
            const d = r.dados;
            if (!d) { ct.innerHTML = '<p class="text-center text-erro">Denúncia não encontrada.</p>'; return; }

            const motivosMap = {
                fraude: 'Golpe ou Fraude', conteudo_inapropriado: 'Conteúdo Impróprio',
                spam: 'Spam', produto_falso: 'Produto Falso', preco_abusivo: 'Preço Abusivo', outro: 'Outro'
            };
            const estadosMap = { pendente: 'Pendente', em_analise: 'Em análise', resolvida: 'Resolvido', rejeitada: 'Recusado' };
            const estadoPill = `denuncia-status-${d.estado}`;
            const nomeAlvo = d.produto_titulo || d.denunciado_nome || 'Item denunciado';
            const dataFormatada = (s) => {
                if (!s) return '—';
                const dt = new Date(s);
                return dt.toLocaleDateString('pt-MZ', { day: '2-digit', month: 'long', year: 'numeric' });
            };

            ct.innerHTML = `
                <div style="margin-bottom:16px;">
                    <button onclick="window.carregarConteudoDashboard('minhas-denuncias')" style="background:none;border:none;color:var(--primary);font-weight:600;font-size:0.875rem;cursor:pointer;display:flex;align-items:center;gap:4px;padding:0;">
                        <span class="material-symbols-outlined" style="font-size:18px;">arrow_back</span> Voltar
                    </button>
                </div>
                <div class="denuncia-card" style="margin-bottom:0;">
                    <div class="denuncia-card-topo">
                        <div>
                            <span class="denuncia-card-tipo">${escaparHtml(d.produto_id ? 'PRODUTO' : 'PERFIL')}</span>
                            <h3 class="denuncia-card-titulo">${escaparHtml(nomeAlvo)}</h3>
                        </div>
                        <span class="denuncia-status-pill ${estadoPill}">${escaparHtml(estadosMap[d.estado] || d.estado)}</span>
                    </div>
                    <div class="denuncia-card-corpo">
                        <div class="denuncia-card-meta" style="margin-bottom:16px;">
                            <span class="material-symbols-outlined">category</span>
                            <span class="denuncia-card-meta-tipo">${escaparHtml(motivosMap[d.motivo] || d.motivo)}</span>
                            <span class="denuncia-card-meta-sep">•</span>
                            <span class="denuncia-card-meta-data">${dataFormatada(d.criado_em)}</span>
                        </div>
                        <div style="margin-bottom:16px;">
                            <h4 style="font-size:0.875rem;font-weight:700;color:var(--on-surface);margin-bottom:8px;">Descrição</h4>
                            <p style="font-size:0.875rem;color:var(--on-surface-variant);line-height:1.6;">${escaparHtml(d.descricao || 'Sem descrição')}</p>
                        </div>
                        ${d.resposta_admin ? `
                        <div style="padding:16px;background:var(--primary-container);border-radius:8px;">
                            <h4 style="font-size:0.875rem;font-weight:700;color:var(--on-primary);margin-bottom:8px;display:flex;align-items:center;gap:6px;">
                                <span class="material-symbols-outlined" style="font-size:18px;">admin_panel_settings</span> Resposta da Administração
                            </h4>
                            <p style="font-size:0.875rem;color:var(--on-primary);opacity:0.9;line-height:1.6;">${escaparHtml(d.resposta_admin)}</p>
                        </div>` : ''}
                    </div>
                </div>`;
        } catch(e) { ct.innerHTML = `<p class="text-center text-erro">${escaparHtml(e.message)}</p>`; }
    }
    window.carregarDenunciaDetalhe = carregarDenunciaDetalhe;

    // ── Minhas Sanções ──
    async function carregarMinhasSancoes() {
        const ct = get('listaSancoes'); if (!ct) return;
        try {
            const r = await window.api.sancoes.minhas();
            const sancoes = r.dados || [];
            if (sancoes.length === 0) {
                ct.innerHTML = '<div class="stitch-empty-state"><div class="stitch-empty-icon-wrap"><span class="material-symbols-outlined">verified</span></div><h3>Está tudo bem!</h3><p>Nenhuma sanção aplicada.</p></div>';
                return;
            }
            ct.innerHTML = '';
            const tipoBadge = (tipo) => {
                const cor = tipo === 'banimento' ? '#dc2626' : tipo === 'suspensao' ? '#d97706' : '#3b82f6';
                return `<span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:8px;background:${cor}15;color:${cor};font-size:0.78rem;font-weight:600;">${escaparHtml(tipo)}</span>`;
            };
            const tabela = criarTabela({
                id: 'tabelaSancoes',
                dados: sancoes,
                buscaPlaceholder: 'Pesquisar sanções...',
                vazio: 'Nenhuma sanção encontrada.',
                colunas: [
                    { header: 'Tipo', accessor: 'tipo', render: (v) => tipoBadge(v) },
                    { header: 'Motivo', accessor: 'motivo', render: (v) => escaparHtml(v) },
                    { header: 'Estado', accessor: 'activa', render: (v) => v ? '<span class="pedido-estado bg-cancelado">Activa</span>' : '<span class="pedido-estado bg-entregue">Inactiva</span>' },
                    { header: 'Data', accessor: 'criado_em', render: (v) => formatarDataCompleta(v) },
                    { header: 'Expira', accessor: 'expira_em', render: (v) => v ? formatarDataCompleta(v) : '—' }
                ]
            });
            ct.appendChild(tabela);
        } catch(e) { ct.innerHTML = `<p class="text-center text-erro">${escaparHtml(e.message)}</p>`; }
    }

    // ── Pedido Detalhe ──
    async function carregarPedidoDetalhe(pedidoId) {
        const ct = get('pedidoDetalheContainer'); if (!ct || !pedidoId) return;
        try {
            const r = await window.api.pedidos.obter(pedidoId);
            const p = r.dados;
            ct.innerHTML = `<div style="padding:20px;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;"><h2>Pedido #${p.id}</h2><span class="pedido-estado estado-${p.estado}">${escaparHtml(p.estado)}</span></div>
            <div style="background:var(--cor-fundo);border-radius:12px;padding:16px;margin-bottom:16px;">
                <h4 style="margin-bottom:8px;">Itens</h4>
                ${(p.itens || []).map(it => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;"><span>${escaparHtml(it.produto_titulo || 'Produto')} × ${it.quantidade}</span><strong>MZN ${formatarDinheiro(it.preco_unitario * it.quantidade)}</strong></div>`).join('')}
                <div style="display:flex;justify-content:space-between;padding:12px 0 0;font-weight:700;"><span>Total</span><span>MZN ${formatarDinheiro(p.total)}</span></div>
            </div>
            <div style="background:var(--cor-fundo);border-radius:12px;padding:16px;margin-bottom:16px;">
                <h4 style="margin-bottom:8px;">Detalhes</h4>
                <p><strong>Pagamento:</strong> ${escaparHtml(p.metodo_pagamento || 'N/D')}</p>
                <p><strong>Endereço:</strong> ${escaparHtml(p.endereco_entrega || 'N/D')}</p>
                <p><strong>Data:</strong> ${new Date(p.criado_em).toLocaleString('pt-MZ')}</p>
            </div>
            <button class="btn btn-secundario" onclick="window.carregarConteudoDashboard('compras')" style="width:100%;">Voltar às Compras</button></div>`;
        } catch(e) { ct.innerHTML = `<p class="text-center text-erro">${escaparHtml(e.message)}</p>`; }
    }



    // ── Full-Screen Viewer (Instagram Reels Style) ──
    let lkViewerProdutos = [];
    let lkViewerIdx = 0;
    let lkViewerLiked = new Set();
    let lkViewerSaved = new Set();

    function abrirViewerProduto(idx) {
        lkViewerProdutos = lkFeedCache;
        lkViewerIdx = idx || 0;
        const viewer = get('lkViewer');
        if (!viewer) return;
        viewer.classList.remove('escondido');
        document.body.style.overflow = 'hidden';
        renderizarViewerSlide();
    }
    window.abrirViewerProduto = abrirViewerProduto;

    function fecharViewer() {
        const viewer = get('lkViewer');
        if (viewer) viewer.classList.add('escondido');
        document.body.style.overflow = '';
    }
    window.fecharViewer = fecharViewer;

    function renderizarViewerSlide() {
        const slide = get('lkViewerSlide');
        if (!slide || !lkViewerProdutos.length) return;
        slide.innerHTML = lkViewerProdutos.map((p, i) => {
            const imgPath = (p.imagens && p.imagens[0]) ? (typeof p.imagens[0] === 'string' ? p.imagens[0] : p.imagens[0].caminho) : p.imagem_url;
            const img = resolverUrlImagem(imgPath);
            const vendedor = p.vendedor_nome || p.vendedor || 'Vendedor';
            const inicial = vendedor.charAt(0).toUpperCase();
            const isLiked = lkViewerLiked.has(i);
            const isSaved = lkViewerSaved.has(i);
            const likes = Math.floor(Math.random() * 900) + 100;
            const comments = Math.floor(Math.random() * 50) + 5;
            return `<div class="lk-viewer-card" id="lkViewerCard${i}">
                <div class="lk-viewer-card-bg" style="background-image:url('${img}');"></div>
                <!-- Header -->
                <div class="lk-viewer-header">
                    <span class="lk-viewer-logo">LINKA</span>
                    <div class="lk-viewer-header-icons">
                        <span class="material-symbols-outlined" style="cursor:pointer;" onclick="event.stopPropagation(); window.switchTabCliente('explorar'); window.fecharViewer();">search</span>
                        <span class="material-symbols-outlined" style="cursor:pointer;" onclick="event.stopPropagation(); window.notificar('Filtros: breve disponível!', 'info');">tune</span>
                    </div>
                </div>
                <!-- Right actions -->
                <div class="lk-viewer-actions">
                    <div class="lk-viewer-avatar" onclick="event.stopPropagation(); window.seguirVendedor(${lkViewerProdutos[i]?.vendedor_utilizador_id || 0}, this);">
                        ${inicial}
                        <div class="lk-viewer-avatar-plus">+</div>
                    </div>
                    <div class="lk-viewer-action ${isLiked ? 'liked' : ''}" onclick="event.stopPropagation(); window.toggleViewerLike(${i});">
                        <span class="material-symbols-outlined">favorite</span>
                        <span>${isLiked ? likes + 1 : likes}</span>
                    </div>
                    <div class="lk-viewer-action" onclick="event.stopPropagation(); window.fecharViewer(); window.abrirDetalhes('${lkViewerProdutos[i]?.id || ''}');">
                        <span class="material-symbols-outlined">comment</span>
                        <span>${comments}</span>
                    </div>
                    <div class="lk-viewer-action ${isSaved ? 'saved' : ''}" onclick="event.stopPropagation(); window.toggleViewerSave(${i});">
                        <span class="material-symbols-outlined">bookmark</span>
                        <span>${isSaved ? 'Saved' : 'Save'}</span>
                    </div>
                    <div class="lk-viewer-action" onclick="event.stopPropagation(); window.partilharProduto(${lkViewerProdutos[i]?.id || 0}, '${escaparHtml(lkViewerProdutos[i]?.titulo || '')}');">
                        <span class="material-symbols-outlined">share</span>
                        <span>Share</span>
                    </div>
                </div>
                <!-- Bottom info -->
                <div class="lk-viewer-info">
                    <div class="lk-viewer-info-title">${escaparHtml(p.titulo)}</div>
                    <div class="lk-viewer-info-desc">${escaparHtml(p.descricao || '')}</div>
                    <div class="lk-viewer-product">
                        <div class="lk-viewer-product-img" style="background-image:url('${img}');"></div>
                        <div class="lk-viewer-product-info">
                            <div class="lk-viewer-product-name">${escaparHtml(p.titulo)}</div>
                            <div class="lk-viewer-product-price">MZN ${formatarDinheiro(p.preco)}</div>
                        </div>
                        <button class="lk-viewer-buy-btn" onclick="event.stopPropagation(); window.fecharViewer(); window.abrirDetalhes('${p.id}');">Buy Now</button>
                    </div>
                </div>
            </div>`;
        }).join('');
        // Scroll to current product
        const target = document.getElementById('lkViewerCard' + lkViewerIdx);
        if (target) setTimeout(() => target.scrollIntoView({ behavior: 'auto' }), 50);
    }

    function toggleViewerLike(idx) {
        if (lkViewerLiked.has(idx)) lkViewerLiked.delete(idx); else lkViewerLiked.add(idx);
        const p = lkViewerProdutos[idx];
        if (p) {
            if (lkViewerLiked.has(idx)) {
                favoritosIds.add(p.id);
                window.api.favoritos.adicionar(p.id).catch(() => {});
                window.notificar('Guardado nos favoritos!', 'sucesso');
            } else {
                favoritosIds.delete(p.id);
                window.api.favoritos.remover(p.id).catch(() => {});
                window.notificar('Removido dos favoritos.', 'info');
            }
        }
        renderizarViewerSlide();
    }
    window.toggleViewerLike = toggleViewerLike;

    function toggleViewerSave(idx) {
        if (lkViewerSaved.has(idx)) lkViewerSaved.delete(idx); else lkViewerSaved.add(idx);
        const p = lkViewerProdutos[idx];
        if (p && lkViewerSaved.has(idx)) {
            favoritosIds.add(p.id);
            window.api.favoritos.adicionar(p.id).catch(() => {});
            window.notificar('Guardado nos favoritos!', 'sucesso');
        }
        renderizarViewerSlide();
    }
    window.toggleViewerSave = toggleViewerSave;

    // ── Abrir Explore Feed ──
    function abrirExploreFeed() {
        mostrarSecaoCliente('explorar');
        definirTabClienteAtiva('explorar');
        carregarExploreFeed(true);
        if (utilizadorLogado) {
            const ea = get('exploreAvatar');
            if (ea) ea.textContent = utilizadorLogado.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        }
        const pills = get('lkExplorePills');
        if (pills && !pills._bound) {
            pills._bound = true;
            pills.querySelectorAll('.lk-explore-chip').forEach(btn => {
                btn.addEventListener('click', () => {
                    pills.querySelectorAll('.lk-explore-chip').forEach(b => b.classList.remove('ativo'));
                    btn.classList.add('ativo');
                    filtrarExploreFeed(btn.dataset.feed);
                });
            });
        }
        const searchInput = get('lkExploreSearch');
        if (searchInput && !searchInput._bound) {
            searchInput._bound = true;
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    lkFeedTermoBusca = searchInput.value.trim();
                    lkFeedFiltro = 'all';
                    pills.querySelectorAll('.lk-explore-chip').forEach(b => b.classList.remove('ativo'));
                    const allPill = pills.querySelector('[data-feed="all"]');
                    if (allPill) allPill.classList.add('ativo');
                    carregarExploreFeed(true);
                }
            });
        }
        // Intersection Observer para explore infinite scroll
        if (feedObserverExplorar) feedObserverExplorar.disconnect();
        const rootElExp = getScrollContainer();
        feedObserverExplorar = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !lkExploreCarregando && lkExploreHaMais) {
                carregarExploreFeed(false);
            }
        }, { root: rootElExp === document.documentElement ? null : rootElExp, rootMargin: '300px' });

        // Criar sentinel para explore
        setTimeout(() => {
            const gs = get('galeriaSection');
            const grid = get('lkMasonryGrid');
            if (gs && grid && feedSentinelExplorar) {
                feedSentinelExplorar.remove();
            }
            if (gs && grid) {
                feedSentinelExplorar = document.createElement('div');
                feedSentinelExplorar.id = 'explore-sentinel';
                feedSentinelExplorar.style.height = '1px';
                grid.appendChild(feedSentinelExplorar);
                feedObserverExplorar.observe(feedSentinelExplorar);
            }
        }, 100);
    }
    window.abrirExploreFeed = abrirExploreFeed;

    // ── Comentários Bottom Sheet ──
    let _comentariosProdutoId = null;
    let _comentariosVendedorId = null;

    function _tempoRelativo(dataStr) {
        if (!dataStr) return '';
        const d = new Date(dataStr);
        const agora = new Date();
        const diff = Math.floor((agora - d) / 1000);
        if (diff < 60) return 'agora';
        if (diff < 3600) return Math.floor(diff / 60) + 'min';
        if (diff < 86400) return Math.floor(diff / 3600) + 'h';
        if (diff < 604800) return Math.floor(diff / 86400) + 'd';
        return d.toLocaleDateString('pt-MZ', { day: '2-digit', month: 'short' });
    }

    function _renderizarComentario(av) {
        const iniciais = (av.utilizador_nome || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        const avatarHtml = av.utilizador_avatar
            ? `<img src="${resolverUrlImagem(av.utilizador_avatar)}" alt="">`
            : `<div class="lk-comment-avatar-initials">${iniciais}</div>`;
        const texto = escaparHtml(av.comentario || av.texto || '');
        const likes = av.likes || 0;
        return `
        <div class="lk-comment-item" data-av-id="${av.id}">
            <div class="lk-comment-avatar">${avatarHtml}</div>
            <div class="lk-comment-body">
                <div class="lk-comment-top">
                    <span class="lk-comment-name">${escaparHtml(av.utilizador_nome || 'Utilizador')}</span>
                    <span class="lk-comment-time">${_tempoRelativo(av.criado_em || av.data_criacao)}</span>
                </div>
                <p class="lk-comment-text">${texto}</p>
                <div class="lk-comment-actions">
                    <button class="lk-comment-like-btn" onclick="window._toggleLikeComentario(this, ${av.id})">
                        <span class="material-symbols-outlined">favorite</span>
                        <span class="lk-comment-like-count">${likes || ''}</span>
                    </button>
                    <button class="lk-comment-reply-btn" onclick="window._responderComentario('${escaparHtml(av.utilizador_nome || '')}')">Responder</button>
                </div>
            </div>
        </div>`;
    }

    async function _carregarComentarios(produtoId) {
        const lista = get('lkCommentsList');
        const counter = get('lkCommentsCount');
        if (!lista) return;

        try {
            const res = await window.api.avaliacoes.listarPorProduto(produtoId);
            const avs = res.dados || res || [];
            const arr = Array.isArray(avs) ? avs : [];

            if (arr.length === 0) {
                lista.innerHTML = `
                    <div class="lk-comments-empty">
                        <span class="material-symbols-outlined">chat_bubble_outline</span>
                        <p>Seja o primeiro a comentar!</p>
                    </div>`;
                if (counter) counter.textContent = '0 comentários';
                return;
            }

            if (counter) counter.textContent = arr.length + (arr.length === 1 ? ' comentário' : ' comentários');
            lista.innerHTML = arr.map(_renderizarComentario).join('');
        } catch (e) {
            console.warn('Erro ao carregar comentários:', e);
            lista.innerHTML = `
                <div class="lk-comments-empty">
                    <span class="material-symbols-outlined">error_outline</span>
                    <p>Erro ao carregar comentários</p>
                </div>`;
        }
    }

    window.abrirComentarios = async function (produtoId, vendedorId) {
        _comentariosProdutoId = produtoId;
        _comentariosVendedorId = vendedorId || null;
        const overlay = get('lkCommentsOverlay');
        if (overlay) {
            overlay.classList.add('ativo');
            document.body.style.overflow = 'hidden';
        }
        await _carregarComentarios(produtoId);
    };

    window.fecharComentarios = function () {
        _comentariosProdutoId = null;
        _comentariosVendedorId = null;
        const overlay = get('lkCommentsOverlay');
        if (overlay) {
            overlay.classList.remove('ativo');
            document.body.style.overflow = '';
        }
    };

    window._toggleLikeComentario = async function (btn, comentarioId) {
        if (!comentarioId) return;
        try {
            const r = await window.api.comentarioLikes.toggle(comentarioId);
            const dados = r.dados || r;
            btn.classList.toggle('liked', dados.liked);
            const countEl = btn.querySelector('.lk-comment-like-count');
            if (countEl) {
                countEl.textContent = dados.total_likes || '';
            }
        } catch (e) {
            // Fallback visual
            btn.classList.toggle('liked');
            const countEl = btn.querySelector('.lk-comment-like-count');
            if (countEl) {
                let c = parseInt(countEl.textContent) || 0;
                c = btn.classList.contains('liked') ? c + 1 : Math.max(0, c - 1);
                countEl.textContent = c || '';
            }
        }
    };

    window._responderComentario = function (nome) {
        const input = get('lkCommentsInput');
        if (input) {
            input.value = '@' + nome + ' ';
            input.focus();
        }
    };

    function _enviarComentario() {
        const input = get('lkCommentsInput');
        if (!input || !input.value.trim() || !_comentariosProdutoId) return;
        if (!_comentariosVendedorId) {
            window.notificar('Não foi possível identificar o vendedor.', 'erro');
            return;
        }
        const texto = input.value.trim();
        input.value = '';

        const lista = get('lkCommentsList');
        const counter = get('lkCommentsCount');
        if (!lista) return;

        const empty = lista.querySelector('.lk-comments-empty');
        if (empty) empty.remove();

        const iniciais = (utilizadorLogado?.nome || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        const novoHtml = `
        <div class="lk-comment-item" style="opacity:0.7;">
            <div class="lk-comment-avatar">
                <div class="lk-comment-avatar-initials">${iniciais}</div>
            </div>
            <div class="lk-comment-body">
                <div class="lk-comment-top">
                    <span class="lk-comment-name">${escaparHtml(utilizadorLogado?.nome || 'Eu')}</span>
                    <span class="lk-comment-time">agora</span>
                </div>
                <p class="lk-comment-text">${escaparHtml(texto)}</p>
            </div>
        </div>`;
        lista.insertAdjacentHTML('afterbegin', novoHtml);

        if (counter) {
            const n = lista.querySelectorAll('.lk-comment-item').length;
            counter.textContent = n + (n === 1 ? ' comentário' : ' comentários');
        }

        window.api.avaliacoes.criar({
            avaliado_id: _comentariosVendedorId,
            produto_id: _comentariosProdutoId,
            comentario: texto,
            tipo: 'produto'
        }).then(() => {
            _carregarComentarios(_comentariosProdutoId);
        }).catch(err => {
            console.warn('Erro ao enviar comentário:', err);
            window.notificar('Erro ao enviar comentário', 'erro');
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && document.activeElement?.id === 'lkCommentsInput') {
            e.preventDefault();
            _enviarComentario();
        }
    });
    document.addEventListener('click', (e) => {
        if (e.target.closest('#lkCommentsSendBtn')) {
            _enviarComentario();
        }
        const emojiBtn = e.target.closest('.lk-comments-emoji');
        if (emojiBtn) {
            const input = get('lkCommentsInput');
            if (input) {
                input.value += emojiBtn.dataset.emoji;
                input.focus();
            }
        }
    });

    (function () {
        let startY = 0, currentY = 0, isDragging = false;
        const sheet = get('lkCommentsSheet');
        if (!sheet) return;
        sheet.addEventListener('touchstart', (e) => {
            if (e.touches.length !== 1) return;
            startY = e.touches[0].clientY;
            isDragging = true;
            sheet.style.transition = 'none';
        }, { passive: true });
        sheet.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            currentY = e.touches[0].clientY;
            const delta = currentY - startY;
            if (delta > 0) sheet.style.transform = `translateY(${delta}px)`;
        }, { passive: true });
        sheet.addEventListener('touchend', () => {
            if (!isDragging) return;
            isDragging = false;
            sheet.style.transition = '';
            const delta = currentY - startY;
            if (delta > 120) window.fecharComentarios();
            else sheet.style.transform = '';
            startY = 0; currentY = 0;
        }, { passive: true });
    })();

    // ── Configurar Navegação ──
    document.querySelectorAll('[data-tab]').forEach(item => {
        item.addEventListener('click', (e) => { e.preventDefault(); trocarTabCliente(item.dataset.tab, item); });
    });
    document.querySelectorAll('[data-drawer-toggle]').forEach(item => {
        item.addEventListener('click', (e) => { e.preventDefault(); const dr = get('mobileDrawer'), ov = get('drawerOverlay'); if (dr.style.display === 'block' || dr.classList.contains('open')) { dr.style.display = 'none'; dr.classList.remove('open'); if (ov) ov.style.display = 'none'; } else { dr.style.display = 'block'; dr.classList.add('open'); if (ov) ov.style.display = 'block'; } });
    });

    // ── Inicialização ──
    verificarSessao();

})();
