// ============================================================
// LINKA — Lógica Principal do Frontend (SPA Lite)
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    
    // Elementos DOM (Seleção segura com opcional)
    const get = (id) => document.getElementById(id);

    const modalAuth = get('modalAuth');
    const modalDetalhes = get('modalDetalhes');
    const btnAbrirLogin = get('btnAbrirLogin');
    const btnLogo = get('btnLogo');
    const btnExplorar = get('btnExplorar');
    const secaoProdutos = get('produtos');
    const secaoHero = get('hero');
    const navAuth = get('navAuth');
    
    const formLogin = get('formLogin');
    const formRegisto = get('formRegisto');
    
    const linkIrParaRegisto = get('linkIrParaRegisto');
    const linkIrParaLogin = get('linkIrParaLogin');
    
    const modalTitulo = get('modalTitulo');
    const modalSubtitulo = get('modalSubtitulo');
    const gridProdutos = get('gridProdutos');
    const conteudoDetalhes = get('conteudoDetalhes');

    // Elementos exclusivos da Home
    const secaoDashboard = get('dashboard');
    const secaoHomeCliente = get('homeCliente');
    const dashboardSidebar = get('dashboardSidebar');
    const dashboardConteudo = get('dashboardConteudo');
    const gridProdutosCliente = get('gridProdutosCliente');
    const categoriasAtalhos = get('categoriasAtalhos');
    const txtBoasVindas = get('txtBoasVindas');

    // Estado Global
    let utilizadorLogado = null;
    let tipoRegisto = 'cliente'; // Pode mudar para 'vendedor' ao escolher plano

    const Navegador = {
        historico: [],
        irPara(vista) { this.historico.push(vista); },
        voltar() { this.historico.pop(); window.history.back(); },
        _renderState() {}
    };

    window.addEventListener('popstate', (event) => {
        if(event.state) {
            Navegador.historico.pop();
            Navegador._renderState(event.state);
        }
    });

    const caminhoPagina = window.location.pathname;
    const ehPaginaCliente = caminhoPagina.includes('/cliente.html') || caminhoPagina.includes('\\cliente.html');
    const ehPaginaVendedor = caminhoPagina.includes('/vendedor.html') || caminhoPagina.includes('\\vendedor.html');
    const ehPaginaPublica = Boolean(gridProdutos && !ehPaginaCliente && !ehPaginaVendedor);
    const ehPaginaHome = Boolean(secaoDashboard || secaoHomeCliente);


    // Helper: Gerar Skeleton Loading para Produtos
    window.gerarSkeletonProdutos = (quantidade = 6) => {
        return Array(quantidade).fill('').map(() => `
            <div class="skeleton-card">
                <div class="skeleton skeleton-img"></div>
                <div class="skeleton-info">
                    <div class="skeleton skeleton-text"></div>
                    <div class="skeleton skeleton-text-short"></div>
                    <div class="skeleton skeleton-text-price"></div>
                </div>
            </div>
        `).join('');
    };

    function obterPaginaPrivadaPorTipo(tipo) {
        if (tipo === 'admin') return 'paginas/admin.html';
        if (tipo === 'vendedor') return 'paginas/vendedor.html';
        return 'paginas/cliente.html';
    }

    const apiOrigin = window.linkaUtils.apiOrigin;
    const imagemProdutoPadrao = window.linkaUtils.imagemProdutoPadrao;
    const escaparHtml = window.linkaUtils.escaparHtml;
    const formatarMoeda = window.linkaUtils.formatarMoeda;
    const formatarDinheiro = window.linkaUtils.formatarDinheiro;
    const formatarData = window.linkaUtils.formatarData;
    const formatarHora = window.linkaUtils.formatarHora;
    const resolverUrlImagem = window.linkaUtils.resolverUrlImagem;
    const cssUrlImagem = window.linkaUtils.cssUrlImagem;
    const normalizarTelefone = window.linkaUtils.normalizarTelefone;

    // Helper: Converter nomes de ícones Font Awesome para Material Symbols
    const faIconParaMs = (icone) => {
        if (!icone) return 'inventory_2';
        const mapa = {
            'fa-check': 'check', 'fa-arrow-right': 'arrow_forward', 'fa-box': 'inventory_2',
            'fa-heart': 'favorite', 'fa-comment': 'comment', 'fa-camera': 'photo_camera',
            'fa-camera-retro': 'photo_camera', 'fa-circle-info': 'info', 'fa-star': 'star',
            'fa-clock-rotate-left': 'history', 'fa-money-bill-wave': 'payments',
            'fa-location-dot': 'location_on', 'fa-paper-plane': 'send', 'fa-plus': 'add',
            'fa-exclamation-triangle': 'warning', 'fa-phone': 'phone', 'fa-envelope': 'mail',
            'fa-arrow-trend-up': 'trending_up', 'fa-cart-shopping': 'shopping_cart',
            'fa-circle-exclamation': 'error', 'fa-pen': 'edit', 'fa-trash': 'delete',
            'fa-pen-to-square': 'edit', 'fa-lock': 'lock', 'fa-bell': 'notifications',
            'fa-circle-question': 'help', 'fa-store': 'store', 'fa-magnifying-glass': 'search',
            'fa-sliders': 'tune', 'fa-bookmark': 'bookmark', 'fa-share': 'share',
            'fa-xmark': 'close', 'fa-times': 'close', 'fa-gavel': 'gavel', 'fa-ban': 'block',
            'fa-skull-crossbones': 'skull', 'fa-users': 'group', 'fa-users-slash': 'group_off',
            'fa-clock': 'schedule', 'fa-receipt': 'receipt_long', 'fa-chart-line': 'trending_up',
            'fa-flag': 'flag', 'fa-shopping-cart': 'shopping_cart', 'fa-eye': 'visibility',
            'fa-store-slash': 'store_off', 'fa-refresh': 'refresh'
        };
        const match = icone.match(/fa-(\S+)/);
        return mapa[match ? match[0] : ''] || 'help';
    };

    let socket = null;
    let conversaAtiva = null;
    let conversasCarregadas = [];

    function conectarSocket() {
        const token = localStorage.getItem('linka_token');
        if (!token) return;

        if (typeof io !== 'function') {
            console.warn('[Socket] Cliente Socket.IO indisponivel. A app continua sem tempo real.');
            return;
        }

        if (socket && socket.connected) return;

        const socketUrl = (window.API_BASE_URL || '').replace('/api', '');
        if (!socketUrl) return;
        
        socket = io(socketUrl, {
            auth: { token }
        });

        socket.on('connect', () => {
            console.log('[Socket] Conectado ao servidor!');
        });

        socket.on('connect_error', (err) => {
            console.error('[Socket] Erro na ligação:', err.message);
        });

        socket.on('notificacao:nova', (notificacao) => {
            console.log('[Socket] Nova notificação:', notificacao);
            notificar(`${notificacao.titulo}: ${notificacao.corpo}`, 'info');
            recarregarListaConversas();
        });

        socket.on('chat:mensagem', (mensagem) => {
            console.log('[Socket] Nova mensagem recebida:', mensagem);
            if (conversaAtiva && conversaAtiva.id === mensagem.conversa_id) {
                adicionarMensagemAoEcra(mensagem);
                window.api.conversas.obterMensagens(conversaAtiva.id, '?limite=1').catch(() => {}); // Marcar como lida (fire-and-forget)
            }
            recarregarListaConversas();
        });

        socket.on('chat:escrevendo', (dados) => {
            if (conversaAtiva && conversaAtiva.id === dados.conversaId) {
                mostrarIndicadorEscrita(dados.escrevendo);
            }
        });
    }

    function desconectarSocket() {
        if (socket) {
            socket.disconnect();
            socket = null;
        }
    }

    function limparSessaoLocal() {
        localStorage.removeItem('linka_token');
        desconectarSocket();
    }

    function aplicarSessaoAutenticada(utilizador) {
        utilizadorLogado = utilizador;
        try { conectarSocket(); } catch (e) { console.warn('[Socket] Erro ao conectar:', e); }
        atualizarInterfaceAutenticada();
    }

    // --- Inicialização ---
    verificarSessao();
    
    // -----------------------------------------
    // PLANOS PREMIUM (LANDING PAGE)
    // -----------------------------------------
    async function carregarPlanosLandingPage() {
        const gridPlanos = get('gridPlanos');
        if (!gridPlanos) return;

        try {
            const res = await window.api.planos.listar();
            if (res.sucesso && res.dados && res.dados.planos_vendedor) {
                gridPlanos.innerHTML = res.dados.planos_vendedor.map(plano => `
                    <div class="plano-card app-style text-center" style="background: #ffffff; border: 1px solid var(--app-border); border-radius: 16px; padding: 24px; display: flex; flex-direction: column; gap: 12px; transition: transform 0.2s ease; cursor: pointer;">
                        <div class="plano-badge" style="background: ${plano.preco_mensal > 0 ? '#111827' : '#f3f4f6'}; color: ${plano.preco_mensal > 0 ? '#ffffff' : '#374151'}; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; align-self: center; text-transform: uppercase;">${plano.nome}</div>
                        <h3 style="font-size: 2rem; color: #111827; margin: 10px 0 0;">${plano.preco_mensal > 0 ? plano.preco_mensal + ' MT/mês' : 'Grátis'}</h3>
                        <p style="font-size: 0.85rem; color: #6b7280; flex: 1;">${plano.descricao}</p>
                        <ul style="list-style: none; padding: 0; margin: 10px 0; text-align: left; font-size: 0.85rem; color: #374151;">
                            <li><span class="material-symbols-outlined" style="color: var(--app-green-btn); margin-right: 8px;">check</span>${plano.max_produtos === -1 ? 'Produtos Ilimitados' : `Até ${plano.max_produtos} produtos`}</li>
                            ${plano.destaque_anuncios ? `<li><span class="material-symbols-outlined" style="color: var(--app-green-btn); margin-right: 8px;">check</span>Destaque nos anúncios</li>` : ''}
                            ${plano.loja_personalizada ? `<li><span class="material-symbols-outlined" style="color: var(--app-green-btn); margin-right: 8px;">check</span>Loja Personalizada</li>` : ''}
                        </ul>
                        <button class="btn btn-verde-app w-100" onclick="iniciarRegistoVendedor()" style="margin-top: 10px;">Começar com ${plano.nome}</button>
                    </div>
                `).join('');
            }
        } catch (erro) {
            console.error('Erro ao carregar planos:', erro);
            gridPlanos.innerHTML = '<p class="text-center" style="color: var(--cor-erro);">Erro ao carregar planos.</p>';
        }
    }

    // -----------------------------------------
    // CAROUSEL DE PRODUTOS EM DESTAQUE
    // -----------------------------------------
    let carouselIndex = 0;
    let carouselIntervalo = null;
    let carouselProdutos = [];

    function carregarCarouselDestaque() {
        const container = get('carouselSlides');
        const dotsContainer = get('carouselDots');
        if (!container || !dotsContainer) return;

        window.api.explore.trending(5).then(res => {
            if (res.sucesso && res.dados && res.dados.length > 0) {
                carouselProdutos = res.dados;
            } else {
                carouselProdutos = gerarProdutosFallback();
            }
            renderizarCarousel(container, dotsContainer);
            iniciarAutoPlay();
        }).catch(() => {
            carouselProdutos = gerarProdutosFallback();
            renderizarCarousel(container, dotsContainer);
            iniciarAutoPlay();
        });

        const btnPrev = get('carouselPrev');
        const btnNext = get('carouselNext');
        if (btnPrev) btnPrev.addEventListener('click', () => { carouselAvancar(-1); reiniciarAutoPlay(); });
        if (btnNext) btnNext.addEventListener('click', () => { carouselAvancar(1); reiniciarAutoPlay(); });
    }

    function gerarProdutosFallback() {
        return [
            { id: 1, titulo: 'Bolo de Chocolate Swiss', preco: 450, imagem_url: null, badge: 'OFERTA DA SEMANA' },
            { id: 2, titulo: 'Smartphone Galaxy S24', preco: 12500, imagem_url: null, badge: 'MAIS VISTO' },
            { id: 3, titulo: 'Sofá Moderno 3 Lugares', preco: 8900, imagem_url: null, badge: 'DESTAQUE' },
            { id: 4, titulo: 'Consulta Financeira', preco: 1500, imagem_url: null, badge: 'POPULAR' },
            { id: 5, titulo: 'Reforma de Cozinha', preco: 25000, imagem_url: null, badge: 'PREMIUM' }
        ];
    }

    function renderizarCarousel(container, dotsContainer) {
        container.innerHTML = carouselProdutos.map((p, i) => {
            const urlImagem = p.imagem_url ? resolverUrlImagem(p.imagem_url) : imagemProdutoPadrao;
            const preco = p.preco ? formatarMoeda(p.preco) : '';
            const badge = p.badge || 'DESTAQUE';
            return `
                <div class="carousel-slide${i === 0 ? ' carousel-active' : ''}" style="background-image: ${cssUrlImagem(p.imagem_url)};">
                    <div class="carousel-slide-overlay"></div>
                    <div class="carousel-slide-conteudo">
                        <span class="carousel-badge">${escaparHtml(badge)}</span>
                        <h3 class="carousel-slide-titulo">${escaparHtml(p.titulo)}</h3>
                        ${preco ? `<p class="carousel-slide-preco">${preco} MT</p>` : ''}
                        <button class="carousel-slide-btn" onclick="window.abrirDetalhes && window.abrirDetalhes(${p.id})">Ver Oferta <span class="material-symbols-outlined">arrow_forward</span></button>
                    </div>
                </div>`;
        }).join('');

        dotsContainer.innerHTML = carouselProdutos.map((_, i) =>
            `<button class="carousel-dot${i === 0 ? ' carousel-dot-ativo' : ''}" data-index="${i}" aria-label="Slide ${i + 1}"></button>`
        ).join('');

        dotsContainer.querySelectorAll('.carousel-dot').forEach(dot => {
            dot.addEventListener('click', () => {
                carouselIndex = parseInt(dot.dataset.index);
                atualizarCarousel();
                reiniciarAutoPlay();
            });
        });
    }

    function carouselAvancar(direcao) {
        carouselIndex = (carouselIndex + direcao + carouselProdutos.length) % carouselProdutos.length;
        atualizarCarousel();
    }

    function atualizarCarousel() {
        const slides = document.querySelectorAll('#carouselSlides .carousel-slide');
        const dots = document.querySelectorAll('#carouselDots .carousel-dot');
        slides.forEach((s, i) => s.classList.toggle('carousel-active', i === carouselIndex));
        dots.forEach((d, i) => d.classList.toggle('carousel-dot-ativo', i === carouselIndex));
    }

    function iniciarAutoPlay() {
        if (carouselIntervalo) clearInterval(carouselIntervalo);
        carouselIntervalo = setInterval(() => carouselAvancar(1), 8000);
    }

    function reiniciarAutoPlay() {
        clearInterval(carouselIntervalo);
        iniciarAutoPlay();
    }

    window.iniciarRegistoVendedor = function() {
        tipoRegisto = 'vendedor';
        if (modalAuth) modalAuth.classList.add('active');
        mostrarFormRegisto('vendedor');
        notificar('A criar conta de Vendedor. Preencha os dados.', 'sucesso');
    };

    window.abrirRegistoCliente = function() {
        tipoRegisto = 'cliente';
        if (modalAuth) modalAuth.classList.add('active');
        mostrarFormRegisto('cliente');
    };

    // Inicialização da Landing Page
    if (ehPaginaPublica) {
        carregarProdutos();
        carregarCategoriasFeed();
        carregarCategoriasHero();
        carregarPlanosLandingPage();
        carregarCarouselDestaque();

        // Newsletter
        const formNl = document.getElementById('formNewsletter');
        if (formNl) {
            formNl.addEventListener('submit', (e) => {
                e.preventDefault();
                const email = document.getElementById('inputNewsletter');
                if (email && email.value) {
                    notificar('Obrigado! Subscreveu a nossa newsletter.', 'sucesso');
                    email.value = '';
                }
            });
        }
    }

    // --- Navegação & Eventos ---

    if (btnLogo) {
        btnLogo.addEventListener('click', (e) => {
            e.preventDefault();
            irParaHome();
        });
    }
    
    if (btnExplorar && secaoProdutos) {
        btnExplorar.addEventListener('click', () => {
            secaoProdutos.scrollIntoView({ behavior: 'smooth' });
        });
    }

    // --- Gestão de Autenticação & Sessão ---

    async function verificarSessao() {
        const splash = document.getElementById('splash');
        
        const token = localStorage.getItem('linka_token');
        if (!token) {
            utilizadorLogado = null;
            desconectarSocket();
            atualizarInterfacePublica();
            return;
        }

        try {
            const res = await window.api.utilizadores.perfil();
            if (res.sucesso) {
                utilizadorLogado = res.dados;
                try { conectarSocket(); } catch (e) { console.warn('[Socket] Erro ao conectar:', e); }
                atualizarInterfaceAutenticada();
            }
        } catch (erro) {
            if (erro._abortado) return;
            utilizadorLogado = null;
            
            const ehErroAutenticacao = erro.status === 401;
            const mensagemErro = String(erro.message || '').toLowerCase();
            const ehErroRede = mensagemErro.includes('fetch') || mensagemErro.includes('network');
            
            if (ehErroAutenticacao) {
                limparSessaoLocal();
                atualizarInterfacePublica();
            } else if (ehErroRede) {
                console.warn('Servidor offline ou erro de rede.');
                notificar('Servidor Linka offline. Tente mais tarde.', 'erro');
                atualizarInterfacePublica();
            } else {
                console.error('Erro ao verificar sessão:', erro);
                atualizarInterfacePublica();
            }
        }
    }


    function atualizarInterfaceAutenticada() {
        // Redirecionamento por Papel (Segurança)
        if (ehPaginaPublica) {
            const tipo = utilizadorLogado && utilizadorLogado.tipo ? utilizadorLogado.tipo : 'cliente';
            window.location.href = obterPaginaPrivadaPorTipo(tipo);
            return;
        }

        // Validação de Acesso Cruzado (Um cliente não pode estar na tela de vendedor)
        if (ehPaginaVendedor && utilizadorLogado.tipo !== 'vendedor' && utilizadorLogado.tipo !== 'admin') {
            window.location.href = 'cliente.html';
            return;
        }

        if (ehPaginaCliente && utilizadorLogado.tipo === 'vendedor') {
            window.location.href = 'vendedor.html';
            return;
        }

        const iniciais = utilizadorLogado.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        
        if (navAuth) {
            navAuth.innerHTML = `
                <div class="user-menu-container">
                    <div class="user-avatar" style="margin-right: 0;">${iniciais}</div>
                    <div class="user-dropdown">
                        <a href="#" class="dropdown-item" id="btnIrParaDashboard">Minha Conta</a>
                        <a href="#" class="dropdown-item" id="btnIrParaHome">Início</a>
                        <div class="dropdown-divisor"></div>
                        <a href="#" class="dropdown-item" style="color: var(--cor-erro)" id="btnLogout">Sair</a>
                    </div>
                </div>
            `;

            // Eventos do Dropdown
            const btnDash = get('btnIrParaDashboard');
            const btnHome = get('btnIrParaHome');
            const btnSair = get('btnLogout');

            if (btnDash) btnDash.addEventListener('click', (e) => { e.preventDefault(); irParaDashboard(); });
            if (btnHome) btnHome.addEventListener('click', (e) => { e.preventDefault(); irParaHomeContexto(); });
            if (btnSair) btnSair.addEventListener('click', (e) => { e.preventDefault(); fazerLogout(); });
        }

        // Saudação dinâmica no cabeçalho ao lado do menu hambúrguer
        const elHeaderGreeting = document.getElementById('headerGreeting');
        if (elHeaderGreeting) {
            elHeaderGreeting.innerHTML = `Olá, <strong>${utilizadorLogado.nome.split(' ')[0]}</strong>`;
        }

        // Saudação dinâmica no banner de boas-vindas ("Olá, [Nome]!")
        const elBoasVindas = document.getElementById('headerBoasVindas');
        if (elBoasVindas) {
            elBoasVindas.textContent = utilizadorLogado.nome.split(' ')[0];
        }

        // Preencher nome e papel no drawer mobile
        const elDrawerNome = document.getElementById('drawer-nome');
        if (elDrawerNome) elDrawerNome.textContent = utilizadorLogado.nome;
        const elDrawerTag = document.getElementById('drawer-tag');
        if (elDrawerTag) elDrawerTag.textContent = utilizadorLogado.tipo === 'vendedor' ? 'Vendedor' : 'Cliente';

        // Sincronizar contador do carrinho no drawer (se existir)
        const drawerCartCount = document.getElementById('drawer-cart-count');
        const headerCartCount = document.getElementById('cart-count');
        if (drawerCartCount && headerCartCount) {
            const count = headerCartCount.textContent;
            const visible = headerCartCount.style.display !== 'none' && count !== '0';
            if (visible) {
                drawerCartCount.textContent = count;
                drawerCartCount.style.display = 'inline-block';
            }
        }

        // Mostrar navegação mobile (se existir)
        const bottomNav = document.getElementById('bottomNavGlobal');
        if (bottomNav) bottomNav.classList.remove('escondido');

        // Se estiver na página Home, mostrar a vista inicial correta
        if (ehPaginaHome) {
            if (utilizadorLogado.tipo === 'cliente') {
                irParaHomeCliente();
            } else {
                irParaDashboard();
            }
        }
    }

    function atualizarInterfacePublica() {
        const splash = document.getElementById('splash');
        if (splash) {
            splash.style.opacity = '0';
            setTimeout(() => { splash.classList.add('escondido'); }, 500);
        }
        
        Navegador.irPara('landing');
        
        document.querySelectorAll('#navAuth').forEach(navAuth => {
            navAuth.innerHTML = `<button class="btn btn-primario" id="btnAbrirLoginGlobal">Entrar</button>`;
            const btn = navAuth.querySelector('#btnAbrirLoginGlobal');
            if (btn) btn.addEventListener('click', () => { mostrarFormLogin(); modalAuth.classList.add('active'); });
        });
        
        const btnHero = document.getElementById('btnAbrirLogin');
        if (btnHero) {
            btnHero.addEventListener('click', () => { mostrarFormLogin(); modalAuth.classList.add('active'); });
        }

        if (ehPaginaPublica) {
            carregarProdutos();
            carregarCategoriasFeed();
            carregarPlanosLandingPage();
        }
    }

    function irParaHomeContexto() {
        if (utilizadorLogado) {
            if (utilizadorLogado.tipo === 'admin') {
                window.location.href = ehPaginaPublica ? 'paginas/admin.html' : 'admin.html';
            } else if (utilizadorLogado.tipo === 'vendedor') {
                if (ehPaginaVendedor) {
                    irParaDashboard();
                } else {
                    window.location.href = ehPaginaPublica ? 'paginas/vendedor.html' : 'vendedor.html';
                }
            } else {
                if (ehPaginaCliente) {
                    irParaHomeCliente();
                } else {
                    window.location.href = ehPaginaPublica ? 'paginas/cliente.html' : 'cliente.html';
                }
            }
        } else {
            irParaHome();
        }
    }

    async function fazerLogout() {
        window.confirmarAcao('Terminar Sessão', 'Tem a certeza de que deseja sair da sua conta?', async () => {
            try {
                await window.api.auth.logout();
                limparSessaoLocal();
                notificar('Sessão terminada.', 'info');
                window.location.href = ehPaginaPublica ? 'index.html' : '../index.html';
            } catch (erro) {
                limparSessaoLocal();
                notificar('Sessão terminada (forçado).', 'info');
                window.location.href = ehPaginaPublica ? 'index.html' : '../index.html';
            }
        });
    }

    window.filtrarPorCategoria = async (categoriaId) => {
        try {
            // Se já estivermos na Home de Cliente, filtramos lá
            if (ehPaginaHome && secaoHomeCliente && !secaoHomeCliente.classList.contains('escondido')) {
                gridProdutosCliente.innerHTML = window.gerarSkeletonProdutos(6);
                const res = await window.api.produtos.listar(`?categoria=${categoriaId}`);
                renderizarProdutos(res.dados, gridProdutosCliente);
            } else {
                // Se estiver na landing page, filtramos no grid principal
                gridProdutos.innerHTML = window.gerarSkeletonProdutos(6);
                const res = await window.api.produtos.listar(`?categoria=${categoriaId}`);
                renderizarProdutos(res.dados, gridProdutos);
            }
        } catch (erro) {
            notificar('Erro ao filtrar produtos', 'erro');
        }
    };

    function irParaHome() {
        if (secaoHero) secaoHero.classList.remove('escondido');
        if (secaoProdutos) secaoProdutos.classList.remove('escondido');
        if (secaoDashboard) secaoDashboard.classList.add('escondido');
        if (secaoHomeCliente) secaoHomeCliente.classList.add('escondido');
        const galeria = document.getElementById('galeriaSection');
        if (galeria) galeria.classList.add('escondido');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function irParaHomeCliente() {
        if (secaoHero) secaoHero.classList.add('escondido');
        if (secaoProdutos) secaoProdutos.classList.add('escondido');
        if (secaoDashboard) secaoDashboard.classList.add('escondido');
        if (secaoHomeCliente) secaoHomeCliente.classList.remove('escondido');
        const galeria = document.getElementById('galeriaSection');
        if (galeria) galeria.classList.add('escondido');
        
        // O texto de boas-vindas estava duplicado e foi removido do design mobile-first
        
        carregarCategoriasFeed();
        carregarProdutosFeed();

        // Lógica de Pesquisa Global (no Header) com Livesearch em todos os inputs da página
        const inputsBusca = document.querySelectorAll('.input-busca-global');
        inputsBusca.forEach(inputBusca => {
            inputBusca.addEventListener('input', debounce(async (e) => {
                const termo = e.target.value;
                try {
                    const res = await window.api.produtos.listar(`?pesquisa=${termo}`);
                    renderizarProdutos(res.dados, gridProdutosCliente);
                } catch (erro) {
                    console.error('Erro na pesquisa:', erro);
                }
            }, 500));
        });

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Helper: Debounce para não sobrecarregar a API na pesquisa
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    async function carregarCategoriasFeed() {
        try {
            const res = await window.api.categorias.listar();
            
            if (categoriasAtalhos) {
                categoriasAtalhos.innerHTML = res.dados.map(cat => `
                    <div class="categoria-chip" onclick="filtrarPorCategoria(${cat.id})">
                        <span class="chip-icone"><span class="material-symbols-outlined">${faIconParaMs(cat.icone)}</span></span>
                        <span class="chip-nome">${cat.nome}</span>
                    </div>
                `).join('');
            }

            const categoriasGridApp = document.getElementById('categoriasGridApp') || document.querySelector('.categorias-grid-app');
            if (categoriasGridApp) {
                // Mostrar até 4 categorias no grid
                const categoriasDestaque = res.dados.slice(0, 4);
                categoriasGridApp.innerHTML = categoriasDestaque.map(cat => `
                    <div class="cat-card-app" onclick="filtrarPorCategoria(${cat.id})" style="cursor: pointer;">
                        <div class="cat-icon-app"><span class="material-symbols-outlined">${faIconParaMs(cat.icone)}</span></div>
                        <span>${cat.nome}</span>
                    </div>
                `).join('');
            }
            
        } catch (erro) {
            if (erro._abortado) return;
            console.error('Erro ao carregar categorias:', erro);
            const categoriasGridApp = document.getElementById('categoriasGridApp') || document.querySelector('.categorias-grid-app');
            if (categoriasGridApp) {
                categoriasGridApp.innerHTML = `<p class="text-center w-100" style="grid-column: span 4; color: var(--cor-erro);">Erro ao carregar categorias.</p>`;
            }
        }
    }

    async function carregarCategoriasHero() {
        const grid = document.querySelector('.categorias-grid-app');
        if (!grid) return;
        try {
            const res = await window.api.categorias.listar();
            const cats = (res.dados || []).slice(0, 4);
            if (cats.length === 0) return;
            grid.innerHTML = cats.map(c => `<div class="cat-card-app" style="cursor:pointer;" onclick="window.location.href='paginas/cliente.html'"><div class="cat-icon-app"><span class="material-symbols-outlined">${faIconParaMs(c.icone)}</span></div><span>${c.nome}</span></div>`).join('');
        } catch (e) { console.warn('Erro ao carregar categorias:', e.message); }
    }

    async function carregarProdutos() {
        const targetGrid = gridProdutos || gridProdutosCliente;
        if (!targetGrid) return;
        
        try {
            targetGrid.innerHTML = window.gerarSkeletonProdutos(6);
            const res = await window.api.produtos.listar();
            renderizarProdutos(res.dados, targetGrid);
        } catch (erro) {
            targetGrid.innerHTML = `<p class="text-center erro">Não foi possível carregar os produtos. Verifique o servidor.</p>`;
            console.error('Erro ao carregar produtos:', erro);
        }
    }

    async function carregarProdutosFeed() {
        if (!gridProdutosCliente) return;
        try {
            // Carregar Market normal
            gridProdutosCliente.innerHTML = window.gerarSkeletonProdutos(6);
            const res = await window.api.produtos.listar();
            renderizarProdutos(res.dados, gridProdutosCliente);

            // Oferta da Semana (Pegar o primeiro produto como destaque)
            const bannerOfertaSemana = document.getElementById('bannerOfertaSemana');
            if (bannerOfertaSemana && res.dados && res.dados.length > 0) {
                const produtoDestaque = res.dados[0];
                bannerOfertaSemana.innerHTML = `
                    <div class="oferta-badge">OFERTA DA SEMANA</div>
                    <h2>${produtoDestaque.titulo}</h2>
                    <button class="btn btn-branco-app" onclick="abrirDetalhes(${produtoDestaque.id})">Ver Oferta</button>
                `;
                // Colocar a imagem do produto como fundo do banner se existir
                if (produtoDestaque.imagem_url) {
                    bannerOfertaSemana.style.backgroundImage = `linear-gradient(to right, rgba(0,70,67,0.9) 0%, rgba(0,70,67,0.4) 100%), ${cssUrlImagem(produtoDestaque.imagem_url)}`;
                    bannerOfertaSemana.style.backgroundSize = 'cover';
                    bannerOfertaSemana.style.backgroundPosition = 'center';
                }
            } else if (bannerOfertaSemana) {
                bannerOfertaSemana.innerHTML = `
                    <div class="oferta-badge">SEM OFERTAS</div>
                    <h2>Aguarde<br>por novidades</h2>
                `;
            }

            // Carregar Galeria (Explorar)
            carregarGaleriaExplorar(res.dados);

            // Carregar Feed Section
            const feedContainer = document.querySelector('#feedSection .feed-container');
            if (feedContainer) {
                if (!res.dados || res.dados.length === 0) {
                    feedContainer.innerHTML = '<p class="text-center">Nenhuma novidade no feed.</p>';
                } else {
                    feedContainer.innerHTML = res.dados.map(p => `
                        <div class="feed-card" style="background: var(--cor-fundo); border-radius: 15px; padding: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border: 1px solid #eaeaea; margin-bottom: 20px;">
                            <div class="feed-header" style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; cursor: pointer;" onclick="abrirDetalhes(${p.id})">
                                <div class="feed-avatar" style="width: 40px; height: 40px; border-radius: 50%; background: var(--cor-cyprus); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                                    ${(p.vendedor_nome || 'V').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h4 style="margin: 0; font-size: 1rem; color: var(--cor-cyprus);">${p.nome_loja || p.vendedor_nome || 'Vendedor Linka'}</h4>
                                    <span style="font-size: 0.8rem; color: var(--cor-texto-mutado);">${formatarData(p.criado_em)}</span>
                                </div>
                            </div>
                            <p style="margin-bottom: 15px; font-size: 0.95rem; line-height: 1.4;">${p.titulo}</p>
                            <div class="feed-image" onclick="abrirDetalhes(${p.id})" style="height: 200px; background: ${cssUrlImagem(p.imagem_url)} center/cover no-repeat; border-radius: 10px; margin-bottom: 15px; cursor: pointer;">
                            </div>
                            <div class="feed-actions" style="display: flex; gap: 20px; color: var(--cor-texto-mutado); border-top: 1px solid #eaeaea; padding-top: 10px;">
                                <span style="cursor: pointer; display: flex; align-items: center; gap: 5px;" onclick="window.api.favoritos.adicionar(${p.id}).then(()=>notificar('Gostou!', 'sucesso'))"><span class="material-symbols-outlined">favorite</span> ${p.total_likes || Math.floor(Math.random() * 100)}</span>
                                <span style="cursor: pointer; display: flex; align-items: center; gap: 5px;" onclick="abrirDetalhes(${p.id})"><span class="material-symbols-outlined">comment</span> Negociar</span>
                            </div>
                        </div>
                    `).join('');
                }
            }

        } catch (erro) {
            gridProdutosCliente.innerHTML = `<p class="text-center erro">${erro.message}</p>`;
        }
    }

    function carregarGaleriaExplorar(produtos) {
        const galeriaContainer = document.querySelector('#galeriaSection .galeria-grid');
        if (!galeriaContainer) return;

        if (!produtos || produtos.length === 0) {
            galeriaContainer.innerHTML = '<div class="galeria-item"><p class="text-center" style="padding: 20px;">Sem fotos para explorar.</p></div>';
            return;
        }

        galeriaContainer.innerHTML = produtos.map(p => {
            const visualizacoes = p.total_visualizacoes || Math.floor(Math.random() * 500) + 'K';
            return `
                <div class="galeria-item" onclick="abrirDetalhes(${p.id})">
                    <img src="${resolverUrlImagem(p.imagem_url)}" alt="${p.titulo}"/>
                    <div class="galeria-overlay">
                        <span class="material-symbols-outlined">visibility</span>
                        <span>${visualizacoes}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderizarProdutosNoContainer(produtos, container) {
        if (!produtos || produtos.length === 0) {
            container.innerHTML = '<p class="text-center">Nenhum produto encontrado.</p>';
            return;
        }

        container.innerHTML = produtos.map(p => `
            <div class="cartao-produto" onclick="abrirDetalhes(${p.id})">
                <div class="cartao-img" style="background-image: ${cssUrlImagem(p.imagem_url)}"></div>
                <div class="cartao-info">
                    <span class="cartao-categoria">${p.categoria_nome || 'Geral'}</span>
                    <h3 class="cartao-titulo">${p.titulo}</h3>
                    <div class="cartao-preco">${formatarMoeda(p.preco)}</div>
                    <div class="cartao-local">${p.localizacao || 'Moçambique'}</div>
                </div>
            </div>
        `).join('');
    }

    function irParaDashboard() {
        if (!ehPaginaHome) {
            Navegador.irPara(utilizadorLogado?.tipo === 'vendedor' ? 'vista-vendedor' : 'vista-cliente');
            return;
        }

        if (secaoHero) secaoHero.classList.add('escondido');
        if (secaoProdutos) secaoProdutos.classList.add('escondido');
        if (secaoHomeCliente) secaoHomeCliente.classList.add('escondido');
        if (secaoDashboard) secaoDashboard.classList.remove('escondido');
        renderizarEstruturaDashboard();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function renderizarEstruturaDashboard() {
        const role = utilizadorLogado.tipo; // 'cliente', 'vendedor', 'admin'
        
        // Renderizar Sidebar conforme Role
        let menuHtml = '<ul class="sidebar-menu">';
        
        if (role === 'cliente') {
            menuHtml += `
                <li class="sidebar-item active" data-view="compras">Minhas Compras</li>
                <li class="sidebar-item" data-view="favoritos">Favoritos</li>
                <li class="sidebar-item" data-view="mensagens">Mensagens</li>
                <li class="sidebar-item" data-view="perfil">Meu Perfil</li>
            `;
        } else if (role === 'vendedor') {
            menuHtml += `
                <li class="sidebar-item active" data-view="vendas">Minhas Vendas</li>
                <li class="sidebar-item" data-view="anuncios">Meus Anúncios</li>
                <li class="sidebar-item" data-view="novo-anuncio" style="color: var(--cor-cyprus)">+ Criar Anúncio</li>
                <li class="sidebar-item" data-view="mensagens">Mensagens</li>
                <li class="sidebar-item" data-view="perfil">Perfil Vendedor</li>
            `;
        } else if (role === 'admin') {
            menuHtml += `
                <li class="sidebar-item active" data-view="stats">Estatísticas</li>
                <li class="sidebar-item" data-view="users">Utilizadores</li>
                <li class="sidebar-item" data-view="categorias">Categorias</li>
            `;
        }
        
        menuHtml += '</ul>';
        if (dashboardSidebar) dashboardSidebar.innerHTML = menuHtml;

        // Adicionar eventos aos itens da sidebar
        if (dashboardSidebar) {
            dashboardSidebar.querySelectorAll('.sidebar-item').forEach(item => {
                item.addEventListener('click', () => {
                    dashboardSidebar.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
                    item.classList.add('active');
                    carregarConteudoDashboard(item.dataset.view);
                });
            });
        }

        // Carregar vista inicial
        carregarConteudoDashboard(role === 'vendedor' ? 'vendas' : (role === 'admin' ? 'stats' : 'compras'));
    }

    function carregarVistaDashboard(vista) {
        carregarConteudoDashboard(vista);
    }

    function carregarConteudoDashboard(vista) {
        const aliasVista = {
            perfil: 'meu-perfil',
            'novo-anuncio': 'criar-anuncio',
            anuncios: 'meus-anuncios'
        };
        vista = aliasVista[vista] || vista;
        let conteudo = '';
        
        switch(vista) {
            case 'vendedor-inicio':
                conteudo = `
                    <div id="dashboardStats">
                        <div class="spinner-linka" style="margin: 40px auto;"></div>
                    </div>
                    <div id="dashboardUltimosPedidos"></div>
                `;
                setTimeout(window.carregarEstatisticasVendedor, 100);
                break;
            case 'compras':
                conteudo = `
                    <div class="secao-cabecalho">
                        <h2>Minhas Compras</h2>
                    </div>
                    <div id="listaPedidos" class="lista-pedidos">
                        <p class="text-center">A carregar pedidos...</p>
                    </div>
                `;
                setTimeout(() => carregarPedidosDashboard('cliente'), 100);
                break;
            case 'vendas':
                conteudo = `
                    <div class="kh-section-header">
                        <span class="kh-section-title">Minhas Vendas</span>
                    </div>
                    <div id="listaPedidos">
                        <div class="spinner-linka" style="margin: 40px auto;"></div>
                    </div>
                `;
                setTimeout(() => carregarPedidosDashboard('vendedor'), 100);
                break;
            case 'favoritos':
                conteudo = `
                    <div class="stitch-favoritos">
                        <div class="stitch-fav-header">
                            <h2 class="stitch-fav-title">Favoritos <span id="favContador" class="stitch-fav-count">(0)</span></h2>
                        </div>
                        <div id="listaFavoritos" class="stitch-fav-grid">
                            ${window.gerarSkeletonProdutos(3)}
                        </div>
                        <div class="stitch-empty-state" id="favoritoVazio" style="display:none;">
                            <div class="stitch-empty-icon-wrap">
                                <span class="material-symbols-outlined">heart_broken</span>
                            </div>
                            <h3>Ainda não tens favoritos</h3>
                            <p>Explore o marketplace e guarda o que mais gostares!</p>
                            <button class="btn btn-primario" onclick="window.carregarConteudoDashboard && window.carregarConteudoDashboard('compras')">Explorar Agora</button>
                        </div>
                    </div>
                `;
                setTimeout(carregarFavoritosDashboard, 100);
                break;
            case 'meu-perfil':
                conteudo = `
                    <div id="perfilContainer">
                        <div class="spinner-linka" style="margin: 40px auto;"></div>
                    </div>
                `;
                setTimeout(window.carregarPerfilCompleto, 100);
                break;
            case 'criar-anuncio':
                conteudo = `
                    <div class="kh-section-header" style="margin-bottom:20px;">
                        <span class="kh-section-title">Novo Anúncio</span>
                    </div>

                    <form id="formNovoAnuncio">
                        <div class="kh-form-section">
                            <div class="kh-form-section-title"><span class="material-symbols-outlined">photo_camera</span> Fotografias</div>
                            <div class="kh-upload-area" onclick="document.getElementById('inputImagens').click()">
                                <input type="file" id="inputImagens" name="imagens" multiple accept="image/*" hidden>
                                <div class="kh-upload-icon"><span class="material-symbols-outlined">photo_camera</span></div>
                                <p class="kh-upload-title">Adicionar Fotos</p>
                                <p class="kh-upload-sub">Até 5 fotos &middot; JPG, PNG (Máx. 5MB)</p>
                            </div>
                            <div id="previsualizacaoImagens" class="kh-preview-grid"></div>
                        </div>

                        <div class="kh-form-section">
                            <div class="kh-form-section-title"><span class="material-symbols-outlined">info</span> Informações Básicas</div>
                            <div class="kh-input-group">
                                <label class="kh-label">Título do Anúncio</label>
                                <input type="text" name="titulo" class="kh-input" placeholder="Ex: iPhone 13 Pro Max – 256GB" required>
                            </div>
                            <div class="kh-input-group">
                                <label class="kh-label">Categoria</label>
                                <select name="categoria_id" id="selectCategorias" class="kh-select" required>
                                    <option value="">A carregar categorias...</option>
                                </select>
                            </div>
                            <div class="kh-input-group">
                                <label class="kh-label">Condição</label>
                                <div class="kh-chip-row">
                                    <button type="button" class="kh-chip selected" data-valor="novo" onclick="window.selecionarCondicao(this)">
                                        <span class="material-symbols-outlined">star</span> Novo
                                    </button>
                                    <button type="button" class="kh-chip" data-valor="usado" onclick="window.selecionarCondicao(this)">
                                        <span class="material-symbols-outlined">history</span> Usado
                                    </button>
                                </div>
                                <input type="hidden" name="estado_produto" id="hiddenEstadoProduto" value="novo">
                                <input type="hidden" name="condicao" value="disponivel">
                            </div>
                            <div class="kh-input-group">
                                <label class="kh-label">Descrição Detalhada</label>
                                <textarea name="descricao" class="kh-textarea" rows="4" placeholder="Descreva as condições, funcionalidades e o que está incluído..."></textarea>
                            </div>
                        </div>

                        <div class="kh-form-section">
                            <div class="kh-form-section-title"><span class="material-symbols-outlined">payments</span> Preço</div>
                            <div class="kh-input-group">
                                <label class="kh-label">Preço (MZN)</label>
                                <input type="number" name="preco" class="kh-input" placeholder="0.00" min="0" step="0.01" required>
                            </div>
                            <div class="kh-input-group">
                                <div class="kh-toggle-row">
                                    <div class="kh-toggle-info">
                                        <div class="kh-toggle-label">Negociável</div>
                                        <div class="kh-toggle-sub">Aceito propostas de compradores</div>
                                    </div>
                                    <label class="kh-toggle-switch">
                                        <input type="checkbox" name="preco_negociavel">
                                        <span class="kh-toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div class="kh-form-section">
                            <div class="kh-form-section-title"><span class="material-symbols-outlined">location_on</span> Localização</div>
                            <div class="kh-input-group">
                                <label class="kh-label">Cidade / Localização</label>
                                <input type="text" name="cidade" class="kh-input" placeholder="Ex: Maputo, Matola, Beira..." required>
                            </div>
                        </div>

                        <div style="height:90px;"></div>
                    </form>

                    <div class="kh-sticky-bottom">
                        <button type="submit" form="formNovoAnuncio" class="kh-btn-primary">
                            <span class="material-symbols-outlined">send</span> Publicar Anúncio
                        </button>
                    </div>
                `;
                setTimeout(popularCategoriasSelect, 100);
                break;
            case 'meus-anuncios':
                conteudo = `
                    <div class="kh-section-header" style="margin-bottom:16px;">
                        <span class="kh-section-title">Os Meus Anúncios</span>
                        <span class="kh-section-action" onclick="carregarConteudoDashboard('criar-anuncio')">
                            <span class="material-symbols-outlined">add</span> Novo
                        </span>
                    </div>
                    <div style="display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap;">
                        <select id="filtroStatusAnuncio" class="kh-select" style="flex:1;" onchange="window.carregarMeusAnuncios()">
                            <option value="">Todos os Estados</option>
                            <option value="ativo">Ativos</option>
                            <option value="inativo">Inativos</option>
                            <option value="vendido">Vendidos</option>
                        </select>
                        <select id="ordemAnuncio" class="kh-select" style="flex:1;" onchange="window.carregarMeusAnuncios()">
                            <option value="recentes">Mais recentes</option>
                            <option value="antigos">Mais antigos</option>
                            <option value="preco_maior">Maior preço</option>
                            <option value="preco_menor">Menor preço</option>
                        </select>
                    </div>
                    <div id="listaMeusAnuncios">
                        <div class="spinner-linka" style="margin: 40px auto;"></div>
                    </div>
                `;
                setTimeout(window.carregarMeusAnuncios, 100);
                break;
            case 'mensagens':
                conteudo = `
                    <div class="stitch-chat-layout">
                        <!-- Lista de Conversas -->
                        <div class="stitch-chat-sidebar" id="chatSidebarLista">
                            <div class="stitch-chat-sidebar-header">
                                <h2>Mensagens</h2>
                            </div>
                            <div id="listaConversas" class="stitch-chat-lista">
                                <div class="stitch-empty-state" style="padding:30px 16px;">
                                    <div class="stitch-empty-icon-wrap">
                                        <span class="material-symbols-outlined">chat_bubble_outline</span>
                                    </div>
                                    <h3>Sem conversas ainda</h3>
                                    <p>Clique num produto e inicie uma negociação!</p>
                                </div>
                            </div>
                        </div>

                        <!-- Janela de Chat Aberta -->
                        <div class="stitch-chat-janela" id="janelaChat">
                            <div class="stitch-chat-janela-vazia">
                                <span class="material-symbols-outlined">forum</span>
                                <p>Selecione uma conversa para começar a negociar.</p>
                            </div>
                        </div>
                    </div>
                `;
                setTimeout(inicializarModuloChat, 100);
                break;
            case 'minhas-denuncias':
                conteudo = '<div class="denuncias-cabecalho"><h2>Minhas Denúncias</h2><button class="denuncias-filtro-btn"><span class="material-symbols-outlined">filter_list</span><span>Filtrar</span></button></div><div id="listaDenuncias"><div class="spinner-linka" style="margin:40px auto;"></div></div>';
                setTimeout(async () => {
                    const ct = document.getElementById('listaDenuncias'); if (!ct) return;
                    try {
                        const r = await window.api.denuncias.listarMinhas();
                        const ds = r.dados || [];
                        if (!ds.length) { ct.innerHTML = '<div class="stitch-empty-state"><div class="stitch-empty-icon-wrap"><span class="material-symbols-outlined">flag</span></div><h3>Nenhuma denúncia realizada</h3><p>Suas denúncias ajudam a manter a LINKA segura para todos.</p></div>'; return; }
                        const motivosMap = { fraude: 'Golpe ou Fraude', conteudo_inapropriado: 'Conteúdo Impróprio', spam: 'Spam', produto_falso: 'Produto Falso', preco_abusivo: 'Preço Abusivo', outro: 'Outro' };
                        const estadosMap = { pendente: 'Pendente', em_analise: 'Em análise', resolvida: 'Resolvido', rejeitada: 'Recusado' };
                        const dataFmt = (s) => { if (!s) return '—'; const d = new Date(s); const ms = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']; return `${String(d.getDate()).padStart(2,'0')} ${ms[d.getMonth()]} ${d.getFullYear()}`; };
                        ct.innerHTML = '<div class="denuncias-lista">' + ds.map(d => {
                            const tipo = d.produto_id ? 'PRODUTO' : 'PERFIL';
                            const nome = d.produto_titulo || d.denunciado_nome || 'Item denunciado';
                            const ep = 'denuncia-status-' + d.estado;
                            const footer = d.estado === 'resolvida' ? (d.resposta_admin ? `<span class="denuncia-card-acao-info"><span class="material-symbols-outlined">check_circle</span>Ação: ${d.resposta_admin}</span>` : '') + `<button class="denuncia-card-acao-btn" onclick="window.carregarDenunciaDetalhe(${d.id})">Ver Resolução</button>` : `<button class="denuncia-card-acao-btn" onclick="window.carregarDenunciaDetalhe(${d.id})">Ver Detalhes</button>`;
                            return `<div class="denuncia-card"><div class="denuncia-card-topo"><div><span class="denuncia-card-tipo">${tipo}</span><h3 class="denuncia-card-titulo">${nome}</h3></div><span class="denuncia-status-pill ${ep}">${estadosMap[d.estado]||d.estado}</span></div><div class="denuncia-card-corpo"><div class="denuncia-card-meta"><span class="material-symbols-outlined">warning</span><span class="denuncia-card-meta-tipo">${motivosMap[d.motivo]||d.motivo}</span><span class="denuncia-card-meta-sep">•</span><span class="denuncia-card-meta-data">${dataFmt(d.criado_em)}</span></div><p class="denuncia-card-descricao">"${d.descricao||''}"</p></div><div class="denuncia-card-acoes">${footer}</div></div>`;
                        }).join('') + '</div><div class="denuncias-info-banner"><span class="material-symbols-outlined">info</span><div class="denuncias-info-banner-texto"><h4>Como funciona a nossa análise?</h4><p>Cada denúncia é revisada individualmente pela nossa equipa de moderação. O prazo médio de resposta é de 48 horas úteis.</p></div></div>';
                    } catch(e) { ct.innerHTML = `<p class="text-center text-erro">${e.message}</p>`; }
                }, 100);
                break;
            case 'minhas-sancoes':
                conteudo = '<div class="secao-cabecalho"><h2>Minhas Sanções</h2></div><div id="listaSancoes"><div class="spinner-linka" style="margin:40px auto;"></div></div>';
                setTimeout(async () => {
                    const ct = document.getElementById('listaSancoes'); if (!ct) return;
                    try { const r = await window.api.sancoes.minhas(); const ss = r.dados || []; if (!ss.length) { ct.innerHTML = '<p class="text-center p-20 text-muted">Nenhuma sanção.</p>'; return; } ct.innerHTML = ss.map(s => `<article class="pedido-card" style="border-left:4px solid ${s.tipo==='banimento'?'#dc2626':s.tipo==='suspensao'?'#d97706':'#3b82f6'};"><div class="pedido-topo"><div><h3>${s.tipo}</h3><p>${s.motivo}</p></div><span class="pedido-estado ${s.activa?'bg-cancelado':'bg-entregue'}">${s.activa?'Activa':'Inactiva'}</span></div></article>`).join(''); } catch(e) { ct.innerHTML = `<p class="text-center text-erro">${e.message}</p>`; }
                }, 100);
                break;
            case 'pedido-detalhe':
                conteudo = '<div id="pedidoDetalheContainer"><div class="spinner-linka" style="margin:40px auto;"></div></div>';
                setTimeout(async () => {
                    const ct = document.getElementById('pedidoDetalheContainer'); if (!ct || !window._pedidoDetalheId) return;
                    try { const r = await window.api.pedidos.obter(window._pedidoDetalheId); const p = r.dados; ct.innerHTML = `<div style="padding:20px;"><h2>Pedido #${p.id} <span class="pedido-estado estado-${p.estado}">${p.estado}</span></h2><div style="background:var(--cor-fundo);border-radius:12px;padding:16px;margin:16px 0;"><h4>Itens</h4>${(p.itens||[]).map(it=>`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;"><span>${it.produto_titulo||'Produto'} × ${it.quantidade}</span><strong>MZN ${formatarDinheiro(it.preco_unitario*it.quantidade)}</strong></div>`).join('')}<div style="display:flex;justify-content:space-between;padding:12px 0 0;font-weight:700;"><span>Total</span><span>MZN ${formatarDinheiro(p.total)}</span></div></div><div style="background:var(--cor-fundo);border-radius:12px;padding:16px;margin-bottom:16px;"><p><strong>Pagamento:</strong> ${p.metodo_pagamento||'N/D'}</p><p><strong>Endereço:</strong> ${p.endereco_entrega||'N/D'}</p><p><strong>Data:</strong> ${new Date(p.criado_em).toLocaleString('pt-MZ')}</p></div><button class="btn btn-secundario" onclick="window.carregarConteudoDashboard('compras')" style="width:100%;">Voltar</button></div>`; } catch(e) { ct.innerHTML = `<p class="text-center text-erro">${e.message}</p>`; }
                }, 100);
                break;
            case 'minha-subscricao':
                conteudo = '<div id="subscricaoContainer"><div class="spinner-linka" style="margin:40px auto;"></div></div>';
                setTimeout(async () => {
                    const ct = document.getElementById('subscricaoContainer'); if (!ct) return;
                    try { const r = await window.api.subscricoes.minha(); const ctx = r.dados||{}; const sub = ctx.subscricao_actual; const planos = ctx.planos||[]; let h = sub && sub.activa ? `<div style="background:linear-gradient(135deg,var(--cor-cyprus),#006b66);color:white;border-radius:16px;padding:24px;margin-bottom:24px;"><h2>${sub.plano_nome||'Plano'}</h2><p>Expira: ${sub.expira_em?new Date(sub.expira_em).toLocaleDateString('pt-MZ'):'Sem expiração'}</p></div>` : '<div style="background:#fef3c7;border-radius:12px;padding:16px;margin-bottom:24px;"><p style="color:#92400e;"><span class="material-symbols-outlined">warning</span> Sem plano activo.</p></div>'; h += planos.map(pl=>`<div style="background:var(--cor-fundo);border:2px solid ${(sub&&sub.plano_id===pl.id)?'var(--cor-cyprus)':'#e5e7eb'};border-radius:12px;padding:20px;margin-bottom:12px;"><h3>${pl.nome}</h3><div style="font-size:1.5rem;font-weight:700;color:var(--cor-cyprus);">MZN ${formatarDinheiro(pl.preco)}/mês</div><p style="color:var(--cor-texto-mutado);">${pl.descricao||''}</p>${(!sub||sub.plano_id!==pl.id)?`<button class="btn btn-primario btn-bloco mt-10" style="width:100%;" onclick="window.confirmarAcao('Contratar','Activar este plano?',async()=>{await window.api.subscricoes.contratar({plano_id:${pl.id}});window.notificar('Plano activado!','sucesso');window.carregarConteudoDashboard('minha-subscricao');})">Escolher</button>`:''}</div>`).join(''); ct.innerHTML = `<div style="padding:20px;"><h2>Minha Subscrição</h2>${h}</div>`; } catch(e) { ct.innerHTML = `<p class="text-center text-erro">${e.message}</p>`; }
                }, 100);
                break;
            default:
                conteudo = `
                    <div class="stitch-em-desenvolvimento">
                        <div class="stitch-dev-icon">
                            <span class="material-symbols-outlined">construction</span>
                        </div>
                        <h2>Em Breve!</h2>
                        <p>A secção de <strong>${vista}</strong> está a ser desenvolvida.<br>Fique atento às novidades do Linka!</p>
                        <button class="btn btn-primario" onclick="window.carregarConteudoDashboard && window.carregarConteudoDashboard('compras')">Voltar ao Início</button>
                    </div>
                `;
                break;
        }

        if (dashboardConteudo) dashboardConteudo.innerHTML = conteudo;
    }

    // Expor função globalmente para chamadas do HTML (ex: botões de menu e tabs)
    window.carregarConteudoDashboard = carregarConteudoDashboard;

    // Detalhe de Denúncia
    window.carregarDenunciaDetalhe = async function(denunciaId) {
        const ct = document.getElementById('listaDenuncias'); if (!ct || !denunciaId) return;
        try {
            const r = await window.api.denuncias.obter(denunciaId);
            const d = r.dados;
            if (!d) { ct.innerHTML = '<p class="text-center text-erro">Denúncia não encontrada.</p>'; return; }
            const motivosMap = { fraude: 'Golpe ou Fraude', conteudo_inapropriado: 'Conteúdo Impróprio', spam: 'Spam', produto_falso: 'Produto Falso', preco_abusivo: 'Preço Abusivo', outro: 'Outro' };
            const estadosMap = { pendente: 'Pendente', em_analise: 'Em análise', resolvida: 'Resolvido', rejeitada: 'Recusado' };
            const ep = 'denuncia-status-' + d.estado;
            const nome = d.produto_titulo || d.denunciado_nome || 'Item denunciado';
            const dfmt = (s) => { if (!s) return '—'; return new Date(s).toLocaleDateString('pt-MZ', { day: '2-digit', month: 'long', year: 'numeric' }); };
            ct.innerHTML = `<div style="margin-bottom:16px;"><button onclick="window.carregarConteudoDashboard('minhas-denuncias')" style="background:none;border:none;color:var(--primary);font-weight:600;font-size:0.875rem;cursor:pointer;display:flex;align-items:center;gap:4px;padding:0;"><span class="material-symbols-outlined" style="font-size:18px;">arrow_back</span> Voltar</button></div><div class="denuncia-card" style="margin-bottom:0;"><div class="denuncia-card-topo"><div><span class="denuncia-card-tipo">${d.produto_id ? 'PRODUTO' : 'PERFIL'}</span><h3 class="denuncia-card-titulo">${nome}</h3></div><span class="denuncia-status-pill ${ep}">${estadosMap[d.estado]||d.estado}</span></div><div class="denuncia-card-corpo"><div class="denuncia-card-meta" style="margin-bottom:16px;"><span class="material-symbols-outlined">category</span><span class="denuncia-card-meta-tipo">${motivosMap[d.motivo]||d.motivo}</span><span class="denuncia-card-meta-sep">•</span><span class="denuncia-card-meta-data">${dfmt(d.criado_em)}</span></div><div style="margin-bottom:16px;"><h4 style="font-size:0.875rem;font-weight:700;color:var(--on-surface);margin-bottom:8px;">Descrição</h4><p style="font-size:0.875rem;color:var(--on-surface-variant);line-height:1.6;">${d.descricao||'Sem descrição'}</p></div>${d.resposta_admin?`<div style="padding:16px;background:var(--primary-container);border-radius:8px;"><h4 style="font-size:0.875rem;font-weight:700;color:var(--on-primary);margin-bottom:8px;display:flex;align-items:center;gap:6px;"><span class="material-symbols-outlined" style="font-size:18px;">admin_panel_settings</span> Resposta da Administração</h4><p style="font-size:0.875rem;color:var(--on-primary);opacity:0.9;line-height:1.6;">${d.resposta_admin}</p></div>`:''}</div></div>`;
        } catch(e) { ct.innerHTML = `<p class="text-center text-erro">${e.message}</p>`; }
    };

    function fecharDrawerCliente() {
        if (window.innerWidth > 768) return;
        const drawer = get('mobileDrawer');
        const overlay = get('drawerOverlay');
        if (drawer) {
            drawer.style.display = 'none';
            drawer.classList.remove('open');
        }
        if (overlay) overlay.style.display = 'none';
    }

    function toggleDrawerCliente() {
        if (window.innerWidth > 768) return;
        const drawer = get('mobileDrawer');
        const overlay = get('drawerOverlay');
        if (!drawer || !overlay) return;

        const estaAberto = drawer.style.display === 'block' || drawer.classList.contains('open');
        if (estaAberto) {
            fecharDrawerCliente();
            return;
        }

        drawer.style.display = 'block';
        drawer.classList.add('open');
        overlay.style.display = 'block';
    }

    function definirTabClienteAtiva(tabId, elementoOrigem) {
        const tabAtiva = tabId === 'feed' ? 'post' : tabId;
        document.querySelectorAll('.bottom-nav-app .nav-item-app, .bottom-nav-app .nav-item-post, .sidebar-drawer .menu-item')
            .forEach(item => item.classList.remove('ativo'));

        document.querySelectorAll(`[data-tab="${tabAtiva}"]`).forEach(item => item.classList.add('ativo'));
        if (elementoOrigem) elementoOrigem.classList.add('ativo');
    }

    function mostrarSecaoCliente(secao) {
        const home = get('homeCliente');
        const dashboard = get('dashboard');
        const feed = get('feedSection');
        const galeria = get('galeriaSection');

        if (home) home.classList.toggle('escondido', secao !== 'inicio');
        if (dashboard) dashboard.classList.toggle('escondido', secao !== 'dashboard');
        if (feed) feed.classList.toggle('escondido', secao !== 'feed');
        if (galeria) galeria.classList.toggle('escondido', secao !== 'explorar');
    }

    function trocarTabCliente(tabId, elementoOrigem = null) {
        const mapaTabs = {
            post: 'feed',
            pesquisa: 'compras',
            perfil: 'meu-perfil',
            carrinho: 'compras',
        };

        const destino = mapaTabs[tabId] || tabId;

        if (destino === 'inicio') {
            mostrarSecaoCliente('inicio');
            carregarCategoriasFeed();
            carregarProdutosFeed();
        } else if (destino === 'feed') {
            mostrarSecaoCliente('feed');
            carregarProdutosFeed();
        } else if (destino === 'explorar') {
            mostrarSecaoCliente('explorar');
            carregarProdutosFeed();
        } else {
            mostrarSecaoCliente('dashboard');
            carregarConteudoDashboard(destino);
        }

        definirTabClienteAtiva(tabId, elementoOrigem);
        fecharDrawerCliente();
    }

    function configurarNavegacaoCliente() {
        document.querySelectorAll('[data-tab]').forEach(item => {
            if (item.dataset.linkaTabBound === '1') return;
            item.dataset.linkaTabBound = '1';
            item.addEventListener('click', (e) => {
                e.preventDefault();
                trocarTabCliente(item.dataset.tab, item);
            });
        });

        document.querySelectorAll('[data-drawer-toggle]').forEach(item => {
            if (item.dataset.linkaDrawerBound === '1') return;
            item.dataset.linkaDrawerBound = '1';
            item.addEventListener('click', (e) => {
                e.preventDefault();
                toggleDrawerCliente();
            });
        });

        document.querySelectorAll('[data-focus-search]').forEach(item => {
            if (item.dataset.linkaSearchBound === '1') return;
            item.dataset.linkaSearchBound = '1';
            item.addEventListener('click', () => {
                document.querySelector('.app-search-bar input')?.focus();
            });
        });

        document.querySelectorAll('[data-logout]').forEach(item => {
            if (item.dataset.linkaLogoutBound === '1') return;
            item.dataset.linkaLogoutBound = '1';
            item.addEventListener('click', (e) => {
                e.preventDefault();
                fazerLogout();
            });
        });
    }

    window.toggleDrawer = toggleDrawerCliente;
    window.switchTabCliente = trocarTabCliente;
    window.switchTab = trocarTabCliente;
    configurarNavegacaoCliente();

    async function carregarPedidosDashboard(modo) {
        const container = get('listaPedidos');
        if (!container) return;

        try {
            const res = await window.api.pedidos.listar();
            renderizarPedidos(res.dados || [], container, modo);
        } catch (erro) {
            container.innerHTML = `<p class="text-center erro">${escaparHtml(erro.message)}</p>`;
        }
    }

    function renderizarPedidos(pedidos, container, modo) {
        if (!pedidos || pedidos.length === 0) {
            container.innerHTML = `<p class="text-center">Nenhum ${modo === 'vendedor' ? 'pedido recebido' : 'pedido feito'} ainda.</p>`;
            return;
        }

        const estados = ['pendente', 'confirmado', 'preparando', 'pronto', 'enviado', 'entregue', 'cancelado'];

        container.innerHTML = pedidos.map((pedido) => {
            const nomeOutro = modo === 'vendedor'
                ? (pedido.nome_outro || 'Cliente Anónimo')
                : (pedido.nome_loja || pedido.nome_outro || 'Vendedor');
            const podeCancelar = modo !== 'vendedor' && !['entregue', 'cancelado', 'reembolsado'].includes(pedido.estado);
            const dataF = new Date(pedido.criado_em).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
            
            if (modo === 'vendedor') {
                return `
                    <div class="venda-card-mobile">
                        <div class="vcm-top">
                            <span class="vcm-id">#ORD-${String(pedido.id).padStart(4, '0')}</span>
                            <span class="vcm-data">${dataF}</span>
                        </div>
                        <div class="vcm-cliente">
                            <div class="vcm-avatar">${nomeOutro.charAt(0).toUpperCase()}</div>
                            <div class="vcm-cl-info">
                                <span class="vcm-nome">${escaparHtml(nomeOutro)}</span>
                            </div>
                            <div class="vcm-contactos">
                                ${pedido.telefone_outro ? `<a href="tel:${escaparHtml(pedido.telefone_outro)}" class="vcm-btn-icon"><span class="material-symbols-outlined">phone</span></a>` : ''}
                                ${pedido.email_outro ? `<a href="mailto:${escaparHtml(pedido.email_outro)}" class="vcm-btn-icon"><span class="material-symbols-outlined">mail</span></a>` : ''}
                            </div>
                        </div>
                        <div class="vcm-summary">
                            <div class="vcm-summ-row">
                                <span class="vcm-summ-label">Total</span>
                                <span class="vcm-summ-val">MZN ${formatarDinheiro(pedido.total || 0)}</span>
                            </div>
                            <div class="vcm-summ-row text-muted">
                                <span class="vcm-summ-label">Pagamento</span>
                                <span class="vcm-summ-val text-sm">${escaparHtml(pedido.metodo_pagamento || 'dinheiro')} / ${escaparHtml(pedido.estado_pagamento || 'pendente')}</span>
                            </div>
                            ${pedido.endereco_entrega ? `<p class="vcm-endereco mt-5"><span class="material-symbols-outlined">location_on</span> ${escaparHtml(pedido.endereco_entrega)}</p>` : ''}
                        </div>
                        <div class="vcm-bottom">
                            <select class="vcm-select pedido-estado-select" data-pedido-id="${pedido.id}">
                                ${estados.map(estado => `<option value="${estado}" ${estado === pedido.estado ? 'selected' : ''}>${estado.charAt(0).toUpperCase() + estado.slice(1)}</option>`).join('')}
                            </select>
                            <button class="vcm-btn-atualizar btn-atualizar-pedido" data-pedido-id="${pedido.id}">Atualizar</button>
                        </div>
                    </div>
                `;
            } else {
                // Layout Cliente (mantém original simplificado ou adapta)
                const botaoCancelar = podeCancelar ? `
                    <button class="btn btn-secundario btn-cancelar-pedido mt-10" style="width:100%" data-pedido-id="${pedido.id}">Cancelar Pedido</button>
                ` : '';

                return `
                    <article class="pedido-card">
                        <div class="pedido-topo">
                            <div>
                                <h3>Pedido #${pedido.id}</h3>
                                <p>${escaparHtml(nomeOutro)}</p>
                            </div>
                            <span class="pedido-estado estado-${pedido.estado}">${escaparHtml(pedido.estado)}</span>
                        </div>
                        <div class="pedido-detalhes">
                            <span>Total: <strong>MZN ${formatarDinheiro(pedido.total || 0)}</strong></span>
                            <span>Data: ${formatarData(pedido.criado_em)}</span>
                        </div>
                        ${botaoCancelar}
                    </article>
                `;
            }
        }).join('');

        container.querySelectorAll('.btn-atualizar-pedido').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const pedidoId = btn.dataset.pedidoId;
                const select = container.querySelector(`.pedido-estado-select[data-pedido-id="${pedidoId}"]`);
                if (!select) return;

                try {
                    btn.disabled = true;
                    await window.api.pedidos.atualizarEstado(pedidoId, select.value);
                    notificar('Estado do pedido actualizado.', 'sucesso');
                    carregarPedidosDashboard(modo);
                } catch (erro) {
                    notificar(erro.message, 'erro');
                } finally {
                    btn.disabled = false;
                }
            });
        });

        container.querySelectorAll('.btn-cancelar-pedido').forEach((btn) => {
            btn.addEventListener('click', async () => {
                try {
                    btn.disabled = true;
                    await window.api.pedidos.cancelar(btn.dataset.pedidoId, 'Cancelado pelo cliente');
                    notificar('Pedido cancelado.', 'sucesso');
                    carregarPedidosDashboard(modo);
                } catch (erro) {
                    notificar(erro.message, 'erro');
                } finally {
                    btn.disabled = false;
                }
            });
        });
    }

    async function carregarFavoritosDashboard() {
        const container = get('listaFavoritos');
        if (!container) return;

        try {
            const res = await window.api.favoritos.listar();
            renderizarProdutos(res.dados || [], container);
        } catch (erro) {
            container.innerHTML = `<p class="text-center erro">${escaparHtml(erro.message)}</p>`;
        }
    }

    window.carregarPerfilCompleto = async function() {
        const container = get('perfilContainer');
        if (!container) return;

        try {
            const res = await window.api.utilizadores.perfil();
            const perfil = res.dados;
            
            let camposLoja = '';
            if (perfil.tipo === 'vendedor') {
                camposLoja = `
                    <h3 class="mt-20 mb-10" style="border-bottom:1px solid #eee; padding-bottom:10px;">Dados da Loja</h3>
                    <div class="campo-grupo">
                        <label>Nome da Loja / Marca</label>
                        <input type="text" id="editNomeLoja" value="${escaparHtml(perfil.nome_loja || '')}">
                    </div>
                    <div class="campo-grupo">
                        <label>Descrição da Loja</label>
                        <textarea id="editDescricaoLoja" rows="3" placeholder="Descreva os produtos ou serviços oferecidos...">${escaparHtml(perfil.descricao_loja || '')}</textarea>
                    </div>
                    <div class="campo-grupo">
                        <label>Endereço Físico (Opcional)</label>
                        <input type="text" id="editEnderecoFisico" value="${escaparHtml(perfil.endereco_fisico || '')}">
                    </div>
                    <div class="campo-grupo">
                        <label>Métodos de Recebimento</label>
                        <input type="text" id="editMetodoRecebimento" placeholder="Ex: M-Pesa, e-Mola, Millennium BIM" value="${escaparHtml(perfil.metodo_recebimento || '')}">
                    </div>
                `;
            }

            container.innerHTML = `
                <form id="formPerfil" class="perfil-form" data-tipo="${perfil.tipo}">
                    <h3 class="mb-10" style="border-bottom:1px solid #eee; padding-bottom:10px;">Dados Pessoais</h3>
                    <div class="campo-grupo">
                        <label>Nome Completo</label>
                        <input type="text" value="${escaparHtml(perfil.nome || '')}" id="editNome" required>
                    </div>
                    <div class="campo-grupo">
                        <label>Email</label>
                        <input type="email" value="${escaparHtml(perfil.email || '')}" disabled>
                    </div>
                    <div class="campo-grupo">
                        <label>Telefone</label>
                        <input type="tel" value="${escaparHtml(perfil.telefone || '')}" id="editTelefone">
                    </div>
                    ${camposLoja}
                    <button type="submit" class="btn btn-primario mt-10">Guardar Alterações</button>
                </form>
            `;
        } catch (erro) {
            container.innerHTML = `<p class="text-erro text-center p-20">Erro ao carregar perfil: ${escaparHtml(erro.message)}</p>`;
        }
    };

    window.carregarEstatisticasVendedor = async function() {
        const statsContainer = get('dashboardStats');
        const pedidosContainer = get('dashboardUltimosPedidos');
        if (!statsContainer) return;

        try {
            const res = await window.api.estatisticas.vendedor();
            const dados = res.dados;

            statsContainer.innerHTML = `
                <div class="dashboard-kpi-grid">
                    <div class="kpi-card">
                        <span class="kpi-label">Receita Total</span>
                        <div class="kpi-value text-primario">MZN ${formatarDinheiro(dados.receita_total)}</div>
                        <div class="kpi-meta text-sucesso"><span class="material-symbols-outlined">trending_up</span> +8.2%</div>
                    </div>
                    <div class="kpi-card">
                        <span class="kpi-label">Vendas</span>
                        <div class="kpi-value">${dados.total_vendas}</div>
                        <div class="kpi-meta"><span class="material-symbols-outlined">shopping_cart</span> Meta atingida</div>
                    </div>
                    <div class="kpi-card">
                        <span class="kpi-label">Anúncios Ativos</span>
                        <div class="kpi-value">${dados.anuncios_ativos}</div>
                        <div class="kpi-meta text-muted"><span class="material-symbols-outlined">inventory_2</span> Estável</div>
                    </div>
                    <div class="kpi-card kpi-alert">
                        <span class="kpi-label">Pedidos Pendentes</span>
                        <div class="kpi-value text-erro">${dados.pedidos_pendentes}</div>
                        <div class="kpi-meta text-erro"><span class="material-symbols-outlined">error</span> Ação necessária</div>
                    </div>
                </div>
            `;

            // Renderizar últimos pedidos no novo formato de lista
            if (pedidosContainer) {
                if (dados.ultimos_pedidos && dados.ultimos_pedidos.length > 0) {
                    let htmlPedidos = '<div class="recent-orders-list">';
                    dados.ultimos_pedidos.forEach(p => {
                        const dataFormatada = new Date(p.criado_em).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
                        let badgeClass = 'bg-pendente';
                        if(p.estado === 'entregue') badgeClass = 'bg-entregue';
                        if(p.estado === 'cancelado') badgeClass = 'bg-cancelado';
                        
                        htmlPedidos += `
                            <div class="recent-order-card" onclick="switchTab('vendas', event)">
                                <div class="roc-top">
                                    <div class="roc-info">
                                        <span class="roc-id">#${String(p.id).padStart(4, '0')}</span>
                                        <span class="roc-nome">${escaparHtml(p.comprador_nome || 'Cliente Anónimo')}</span>
                                    </div>
                                    <span class="roc-badge ${badgeClass}">${p.estado}</span>
                                </div>
                                <div class="roc-bottom">
                                    <span class="roc-data">${dataFormatada}</span>
                                    <span class="roc-total">MZN ${formatarDinheiro(p.total)}</span>
                                </div>
                            </div>
                        `;
                    });
                    htmlPedidos += '</div>';
                    pedidosContainer.innerHTML = htmlPedidos;
                } else {
                    pedidosContainer.innerHTML = '<p class="text-muted p-10">Ainda não tem pedidos recentes.</p>';
                }
            }
        } catch (erro) {
            statsContainer.innerHTML = `<p class="text-erro">Erro: ${escaparHtml(erro.message)}</p>`;
        }
    };

    // --- Listeners de Modal e Navegação ---

    [modalAuth, modalDetalhes].forEach(modal => {
        if (!modal) return;
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
    });

    if (linkIrParaRegisto) linkIrParaRegisto.addEventListener('click', () => mostrarFormRegisto('cliente'));
    if (linkIrParaLogin) linkIrParaLogin.addEventListener('click', mostrarFormLogin);

    // Lógica de Mostrar/Esconder Senha (Olho) - Delegação de Eventos
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('toggle-senha')) {
            const btn = e.target;
            const inputId = btn.getAttribute('data-target');
            const input = document.getElementById(inputId);
            
            if (input && input.type === 'password') {
                input.type = 'text';
                btn.innerText = 'visibility_off'; // Muda o ícone para "esconder"
            } else if (input) {
                input.type = 'password';
                btn.innerText = 'visibility'; // Muda o ícone para "mostrar"
            }
        }
    });

    function mostrarFormLogin() {
        if (!formLogin || !formRegisto) return;
        formRegisto.classList.add('escondido');
        formLogin.classList.remove('escondido');
        if (modalTitulo) modalTitulo.innerText = 'Bem-vindo de volta';
        if (modalSubtitulo) modalSubtitulo.innerText = 'Introduza os seus dados para entrar.';
    }

    function mostrarFormRegisto(tipo = 'cliente') {
        if (!formLogin || !formRegisto) return;
        tipoRegisto = tipo === 'vendedor' ? 'vendedor' : 'cliente';
        formLogin.classList.add('escondido');
        formRegisto.classList.remove('escondido');
        if (modalTitulo) modalTitulo.innerText = tipoRegisto === 'vendedor' ? 'Criar conta de vendedor' : 'Criar nova conta';
        if (modalSubtitulo) modalSubtitulo.innerText = 'Junte-se à maior comunidade de Moçambique.';
    }

    // --- Gestão de Produtos ---

    // Função consolidada de renderização (substitui a anterior)
    function renderizarProdutos(produtos, container = gridProdutos) {
        if (!container) return;

        if (!produtos || produtos.length === 0) {
            container.innerHTML = '<p class="text-center">Nenhum produto encontrado.</p>';
            return;
        }

        container.innerHTML = produtos.map(p => `
            <div class="cartao-produto" onclick="abrirDetalhes(${p.id})">
                <div class="cartao-img" style="background-image: ${cssUrlImagem(p.imagem_url)}"></div>
                <div class="cartao-info">
                    <span class="cartao-categoria">${p.categoria_nome || 'Geral'}</span>
                    <h3 class="cartao-titulo">${p.titulo}</h3>
                    <div class="cartao-preco">${formatarMoeda(p.preco)}</div>
                    <div class="cartao-local">${p.localizacao || 'Moçambique'}</div>
                </div>
            </div>
        `).join('');
    }

    window.carregarMeusAnuncios = async function() {
        const container = get('listaMeusAnuncios');
        if(!container) return;
        const status = get('filtroStatusAnuncio')?.value || '';
        const ordem = get('ordemAnuncio')?.value || 'recentes';

        container.innerHTML = window.gerarSkeletonProdutos(3);

        try {
            const res = await window.api.produtos.listar('?meus=true');
            let produtos = res.dados || [];
            
            // Tratamento client-side para o MVP
            if (status) {
                produtos = produtos.filter(p => p.condicao === status);
            }
            if (ordem === 'recentes') produtos.sort((a,b) => new Date(b.criado_em || 0) > new Date(a.criado_em || 0) ? 1 : -1);
            if (ordem === 'antigos') produtos.sort((a,b) => new Date(a.criado_em || 0) > new Date(b.criado_em || 0) ? -1 : 1);
            if (ordem === 'preco_maior') produtos.sort((a,b) => b.preco - a.preco);
            if (ordem === 'preco_menor') produtos.sort((a,b) => a.preco - b.preco);

            window.renderizarMeusAnuncios(produtos, container);
        } catch (erro) {
            container.innerHTML = '<p class="text-center text-erro">Erro ao carregar os seus anúncios.</p>';
            console.error(erro);
        }
    };

    window.renderizarMeusAnuncios = function(produtos, container) {
        if (!produtos || produtos.length === 0) {
            container.innerHTML = '<p class="text-center w-100 p-20 text-muted">Nenhum anúncio encontrado com estes filtros.</p>';
            return;
        }

        container.innerHTML = produtos.map(p => `
            <div class="meus-anuncios-card" style="position:relative;">
                <div class="mac-img-box" style="background-image: ${cssUrlImagem(p.imagem_url)}">
                    ${p.condicao === 'vendido' ? '<div class="mac-badge-vendido">VENDIDO</div>' : ''}
                </div>
                <div class="mac-info">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <h3 class="mac-titulo">${p.titulo}</h3>
                        <span class="mac-cat">${p.categoria_nome || 'Geral'}</span>
                    </div>
                    <div class="mac-preco">MZN ${formatarDinheiro(p.preco)}</div>
                </div>
                
                <div class="mac-actions">
                    <button class="mac-btn" onclick="window.editarAnuncio(${p.id})">
                        <span class="material-symbols-outlined text-muted">edit</span>
                        <span>Editar</span>
                    </button>
                    ${p.condicao !== 'vendido' ? `
                    <button class="mac-btn" onclick="window.marcarVendido(${p.id})">
                        <span class="material-symbols-outlined text-sucesso">check</span>
                        <span class="text-sucesso">Vendido</span>
                    </button>` : `
                    <button class="mac-btn disabled" disabled>
                        <span class="material-symbols-outlined text-muted">check</span>
                        <span class="text-muted">Vendido</span>
                    </button>
                    `}
                    <button class="mac-btn" onclick="window.eliminarAnuncio(${p.id})">
                        <span class="material-symbols-outlined text-erro">delete</span>
                        <span class="text-erro">Eliminar</span>
                    </button>
                </div>
            </div>
        `).join('');
    };

    window.marcarVendido = async function(id) {
        window.confirmarAcao('Marcar como Vendido', 'Deseja marcar este produto como vendido? Ele deixará de aparecer nas listagens públicas.', async () => {
            try {
                await window.api.produtos.actualizar(id, { condicao: 'vendido' });
                notificar('Produto marcado como vendido.', 'sucesso');
                window.carregarMeusAnuncios();
            } catch (err) {
                notificar('Erro: ' + err.message, 'erro');
            }
        });
    };

    window.eliminarAnuncio = async function(id) {
        window.confirmarAcao('Eliminar Anúncio', 'Tem a certeza que deseja eliminar este anúncio permanentemente? Não pode ser desfeito.', async () => {
            try {
                await window.api.produtos.eliminar(id);
                notificar('Anúncio eliminado com sucesso.', 'sucesso');
                window.carregarMeusAnuncios();
            } catch (err) {
                notificar('Erro: ' + err.message, 'erro');
            }
        });
    };
    
    window.editarAnuncio = async function(id) {
        window.location.href = `paginas/vendedor.html`;
    };

    window.abrirDetalhes = async (id) => {
        if (!conteudoDetalhes) return;
        try {
            conteudoDetalhes.innerHTML = `
                <div class="detalhes-loading">
                    <div class="spinner-linka"></div>
                    <p>A carregar detalhes...</p>
                </div>
            `;
            if (modalDetalhes) modalDetalhes.classList.add('active');

            const res = await window.api.produtos.obter(id);
            const p = res.dados;
            const imagemPrincipal = (p.imagens && p.imagens.length > 0) ? p.imagens[0].caminho : p.imagem_url;
            const imagens = p.imagens && p.imagens.length > 0 ? p.imagens : (imagemPrincipal ? [{ caminho: imagemPrincipal }] : []);
            const ehProprioVendedor = utilizadorLogado && utilizadorLogado.id === p.vendedor_utilizador_id;
            const ehLogado = !!utilizadorLogado;
            const iniciais = (p.vendedor_nome || 'L').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            const totalFotos = imagens.length;

            const galeriaHtml = imagens.map(im => `
                <div class="dm-gallery-slide">
                    <img src="${resolverUrlImagem(im.caminho)}" alt="${(p.titulo || '').replace(/"/g, '&quot;')}">
                </div>
            `).join('');

            const topbarHtml = `
                <div class="dm-topbar">
                    <div class="dm-topbar-left">
                        <button class="dm-icon-btn" data-tooltip="Voltar" onclick="document.getElementById('modalDetalhes').classList.remove('active')">
                            <i class="fa-solid fa-arrow-left"></i>
                        </button>
                    </div>
                    <div class="dm-topbar-right">
                        ${!ehProprioVendedor && ehLogado ? `
                        <button class="dm-icon-btn" data-tooltip="Favoritar"><i class="fa-regular fa-heart"></i></button>` : ''}
                        <button class="dm-icon-btn" data-tooltip="Partilhar"><i class="fa-solid fa-share-nodes"></i></button>
                    </div>
                </div>
            `;

            const counterHtml = totalFotos > 0 ? `
                <div class="dm-gallery-counter">
                    <span class="dm-counter-pill"><i class="fa-regular fa-image"></i> ${totalFotos}</span>
                </div>
            ` : '';

            const galleryHtml = `
                <div class="dm-gallery">
                    ${topbarHtml}
                    <div class="dm-gallery-scroll" id="dmGalleryScroll">${galeriaHtml}</div>
                    ${counterHtml}
                </div>
            `;

            const productInfoHtml = `
                <div class="dm-product-info">
                    <div class="dm-product-meta">
                        <span class="dm-category-badge">${p.categoria_nome || 'Geral'}</span>
                        <span class="dm-stock-badge"><span class="dm-stock-dot"></span> Em Stock</span>
                    </div>
                    <h1 class="dm-title">${p.titulo}</h1>
                    <div class="dm-price-row">
                        <span class="dm-price">${formatarMoeda(p.preco)}</span>
                        ${p.preco_negociavel ? '<span class="dm-category-badge" style="color:#16a34a;border-color:#bbf7d0;background:#f0fdf4;">Negociável</span>' : ''}
                    </div>
                </div>
            `;

            const sellerHtml = `
                <div class="dm-seller">
                    <div class="dm-seller-left">
                        <div class="dm-seller-avatar">${iniciais}</div>
                        <div>
                            <p class="dm-seller-name">${p.vendedor_nome || 'Vendedor Linka'}</p>
                            <p class="dm-seller-badge">${p.nome_loja || (ehProprioVendedor ? 'A sua loja' : 'Vendedor Verificado')}</p>
                        </div>
                    </div>
                </div>
            `;

            const descHtml = p.descricao ? `
                <section>
                    <h2 class="dm-desc-title">Descrição Detalhada</h2>
                    <p class="dm-desc-text">${p.descricao}</p>
                </section>
            ` : '';

            const avisoHtml = ehProprioVendedor ? '<div class="info-aviso"><i class="fa-solid fa-circle-info"></i> Este é o seu anúncio.</div>' : '';

            const bottomBarHtml = `
                <div class="dm-bottom-bar">
                    <div class="dm-bottom-actions">
                        ${!ehProprioVendedor ? `<button class="dm-btn-chat" id="btnContactarVendedorModal" data-tooltip="Chat"><i class="fa-regular fa-comment"></i></button>` : ''}
                        <div style="flex:1; display:flex; gap:8px;">
                            ${!ehProprioVendedor && ehLogado && utilizadorLogado.tipo === 'cliente' ? `
                            <button class="dm-btn-buy" style="flex:1;" id="btnCriarPedidoModal">Comprar Agora</button>
                            ` : ehProprioVendedor ? `
                            <button class="dm-btn-buy" style="flex:1;" onclick="document.getElementById('modalDetalhes').classList.remove('active')">Gerir Anúncio</button>
                            ` : `
                            <button class="dm-btn-buy" style="flex:1;" onclick="document.getElementById('modalDetalhes').classList.remove('active'); notificar('Inicie sessão para comprar.', 'info');">Entrar para Comprar</button>
                            `}
                        </div>
                    </div>
                </div>
            `;

            conteudoDetalhes.innerHTML = `
                ${galleryHtml}
                <div class="dm-body">
                    ${productInfoHtml}
                    <hr class="dm-divider">
                    ${sellerHtml}
                    <hr class="dm-divider">
                    ${descHtml}
                    ${descHtml ? '<hr class="dm-divider">' : ''}
                    ${avisoHtml}
                </div>
                ${bottomBarHtml}
            `;

            const scrollEl = document.getElementById('dmGalleryScroll');
            const counterEl = conteudoDetalhes.querySelector('.dm-counter-pill');
            if (scrollEl && counterEl && totalFotos > 1) {
                scrollEl.addEventListener('scroll', () => {
                    const idx = Math.round(scrollEl.scrollLeft / scrollEl.clientWidth) + 1;
                    counterEl.innerHTML = '<i class="fa-regular fa-image"></i> ' + idx + '/' + totalFotos;
                });
            }

            const btnEl = get('btnContactarVendedorModal');
            if (btnEl) {
                btnEl.addEventListener('click', async () => {
                    if (!utilizadorLogado) {
                        if (modalDetalhes) modalDetalhes.classList.remove('active');
                        mostrarFormLogin();
                        if (modalAuth) modalAuth.classList.add('active');
                        notificar('Inicie sessão para contactar o vendedor.', 'info');
                        return;
                    }
                    btnEl.disabled = true;
                    btnEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
                    await window.contactarVendedor(p.vendedor_utilizador_id, p.id, p.titulo);
                });
            }

            const btnPedido = get('btnCriarPedidoModal');
            if (btnPedido) {
                btnPedido.addEventListener('click', async () => {
                    try {
                        btnPedido.disabled = true;
                        btnPedido.innerText = 'A processar...';
                        await window.api.pedidos.criar({ itens: [{ produto_id: p.id, quantidade: 1 }] });
                        notificar('Pedido criado com sucesso.', 'sucesso');
                        if (modalDetalhes) modalDetalhes.classList.remove('active');
                        irParaDashboard();
                        setTimeout(() => carregarVistaDashboard('compras'), 150);
                    } catch (erro) {
                        notificar(erro.message, 'erro');
                    } finally {
                        btnPedido.disabled = false;
                        btnPedido.innerText = 'Comprar Agora';
                    }
                });
            }

        } catch (erro) {
            if (conteudoDetalhes) conteudoDetalhes.innerHTML = `<p class="text-center" style="padding:40px;color:#c0392b">${erro.message}</p>`;
            notificar(erro.message, 'erro');
        }
    };

    // --- Submissão de Formulários ---

    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Seleção mais robusta (Firefox e autofills podem alterar os tipos dos inputs)
            const inputs = formLogin.querySelectorAll('input');
            const emailInput = inputs[0];
            const senhaInput = document.getElementById('loginSenha') || inputs[1];

            if (!emailInput || !senhaInput) {
                notificar('Não foi possível encontrar os campos de login.', 'erro');
                return;
            }

            const identificador = emailInput.value.trim();
            const email = identificador.includes('@') ? identificador.toLowerCase() : normalizarTelefone(identificador);
            const senha = senhaInput.value;

            try {
                desativarBotao(formLogin);
                const res = await window.api.auth.login({ email, senha });
                
                if (res.dados && res.dados.token) {
                    localStorage.setItem('linka_token', res.dados.token);
                }

                notificar('Bem-vindo de volta!', 'sucesso');
                modalAuth.classList.remove('active');

                if (res.dados && res.dados.utilizador) {
                    aplicarSessaoAutenticada(res.dados.utilizador);
                } else {
                    verificarSessao();
                }
            } catch (erro) {
                notificar(erro.message, 'erro');
            } finally {
                ativarBotao(formLogin);
            }
        });
    }

    if (formRegisto) {
        formRegisto.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const nome = document.getElementById('regNome').value.trim();
            const email = document.getElementById('regEmail').value.trim().toLowerCase();
            const telefone = normalizarTelefone(document.getElementById('regTelefone').value);
            const senha = document.getElementById('regSenha').value;
            const confirmaSenha = document.getElementById('regConfirmaSenha').value;

            if (senha !== confirmaSenha) {
                return notificar('As palavras-passe não coincidem.', 'erro');
            }

            if (senha.length < 6) {
                return notificar('A palavra-passe deve ter pelo menos 6 caracteres.', 'erro');
            }

            if (!/^[0-9]{9,13}$/.test(telefone)) {
                return notificar('Telefone invalido. Use 9 a 13 digitos.', 'erro');
            }

            const dados = { nome, email, telefone, senha, tipo: tipoRegisto };

            try {
                desativarBotao(formRegisto);
                await window.api.auth.registar(dados);
                notificar('Conta criada com sucesso!', 'sucesso');
                mostrarFormLogin();
                formRegisto.reset();
                atualizarMedidorForca('');
                tipoRegisto = 'cliente'; // Repor estado
            } catch (erro) {
                notificar(erro.message, 'erro');
            } finally {
                ativarBotao(formRegisto);
            }
        });
    }

    // --- Lógica do Medidor de Força ---

    const inputSenha = document.getElementById('regSenha');
    const barraForca = document.getElementById('barraForca');
    const textoForca = document.getElementById('textoForca');

    if (inputSenha) {
        inputSenha.addEventListener('input', (e) => {
            atualizarMedidorForca(e.target.value);
        });
    }

    function atualizarMedidorForca(senha) {
        if (!senha) {
            barraForca.className = 'medidor-barra';
            textoForca.innerText = 'Força da palavra-passe';
            textoForca.className = 'medidor-texto';
            return;
        }

        let forca = 0;
        if (senha.length >= 6) forca++;
        if (senha.length >= 10) forca++;
        if (/[A-Z]/.test(senha)) forca++;
        if (/[0-9]/.test(senha)) forca++;
        if (/[^A-Za-z0-9]/.test(senha)) forca++;

        let classe = '';
        let texto = '';

        if (forca <= 2) {
            classe = 'barra-fraca';
            texto = 'Fraca';
        } else if (forca === 3) {
            classe = 'barra-media';
            texto = 'Média';
        } else if (forca === 4) {
            classe = 'barra-forte';
            texto = 'Forte';
        } else {
            classe = 'barra-muito-forte';
            texto = 'Muito Forte';
        }

        barraForca.className = `medidor-barra ${classe}`;
        textoForca.innerText = `Força: ${texto}`;
        textoForca.className = `medidor-texto texto-${texto.toLowerCase().replace(' ', '-')}`;
    }

    // --- Funções de Publicação (Vendedor) ---

    async function popularCategoriasSelect() {
        const select = get('selectCategorias');
        if (!select) return;

        try {
            const res = await window.api.categorias.listar();
            select.innerHTML = '<option value="">Seleccione uma categoria</option>' + 
                res.dados.map(cat => `<option value="${cat.id}">${cat.nome}</option>`).join('');
        } catch (erro) {
            select.innerHTML = '<option value="">Erro ao carregar</option>';
        }
    }

    // Gerir pré-visualização de imagens e submissão do formulário
    window.selecionarCondicao = function(botao) {
        const form = botao.closest('form');
        if (!form) return;

        form.querySelectorAll('.kh-chip').forEach(chip => chip.classList.remove('selected'));
        botao.classList.add('selected');

        const campo = form.querySelector('#hiddenEstadoProduto');
        if (campo) campo.value = botao.dataset.valor || 'novo';
    };

    document.addEventListener('change', (e) => {
        if (e.target.id === 'inputImagens') {
            const container = get('previsualizacaoImagens');
            if (!container) return;
            
            container.innerHTML = '';
            const files = Array.from(e.target.files).slice(0, 5); // Limite de 5
            
            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const div = document.createElement('div');
                    div.className = 'preview-item';
                    div.innerHTML = `<img src="${event.target.result}">`;
                    container.appendChild(div);
                };
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
                const negociavel = form.querySelector('[name="preco_negociavel"]')?.checked || false;
                formData.set('preco_negociavel', negociavel ? 'true' : 'false');
                
                const data = await window.api.produtos.criar(formData);

                if (data.sucesso) {
                    notificar('Anúncio publicado com sucesso!', 'sucesso');
                    carregarVistaDashboard('vendedor-inicio'); // Volta para o início
                } else {
                    throw new Error(data.erro || 'Falha ao publicar anúncio');
                }
            } catch (erro) {
                notificar(erro.message, 'erro');
            } finally {
                ativarBotao(form);
                btn.innerText = 'Publicar Anúncio Agora';
            }
        } else if (e.target.id === 'formPerfil') {
            e.preventDefault();
            const form = e.target;
            const btn = form.querySelector('button[type="submit"]');
            
            const nomeInput = document.getElementById('editNome');
            const telefoneInput = document.getElementById('editTelefone');

            if (!nomeInput || !telefoneInput) return;

            try {
                desativarBotao(form);
                btn.innerText = 'A guardar...';

                const dados = {
                    nome: nomeInput.value,
                    telefone: telefoneInput.value
                };

                if (form.dataset.tipo === 'vendedor') {
                    dados.nome_loja = document.getElementById('editNomeLoja')?.value;
                    dados.descricao_loja = document.getElementById('editDescricaoLoja')?.value;
                    dados.endereco_fisico = document.getElementById('editEnderecoFisico')?.value;
                    dados.metodo_recebimento = document.getElementById('editMetodoRecebimento')?.value;
                }

                const res = await window.api.utilizadores.atualizar(dados);
                if (res.sucesso) {
                    notificar('Perfil atualizado com sucesso!', 'sucesso');
                    
                    // Atualizar estado global
                    if (res.dados && res.dados.utilizador) {
                        utilizadorLogado = res.dados.utilizador;
                        localStorage.setItem('linka_user_data', JSON.stringify(utilizadorLogado));
                        aplicarSessaoAutenticada(utilizadorLogado); // Atualiza avatares/nomes no header
                    }
                } else {
                    throw new Error(res.erro || 'Falha ao atualizar perfil');
                }
            } catch (erro) {
                notificar(erro.message, 'erro');
            } finally {
                ativarBotao(form);
                btn.innerText = 'Guardar Alterações';
            }
        }
    });

    // --- Auxiliares UI (importados de utils.js) ---
    const notificar = window.notificar;

    // --- Módulo de Chat (Conversas) ---

    let statusEscrevendoTimeout = null;
    let isTyping = false;

    async function inicializarModuloChat() {
        conversaAtiva = null;
        await recarregarListaConversas();
    }

    async function recarregarListaConversas() {
        const listaContainer = get('listaConversas');
        if (!listaContainer) return;

        try {
            const res = await window.api.conversas.listar();
            if (res.sucesso) {
                conversasCarregadas = res.dados;
                renderizarListaConversas();
            } else {
                listaContainer.innerHTML = '<p class="text-center p-20">Nenhuma conversa encontrada.</p>';
            }
        } catch (erro) {
            console.error('Erro ao listar conversas:', erro);
            listaContainer.innerHTML = '<p class="text-center p-20 text-erro">Erro ao carregar conversas.</p>';
        }
    }

    function renderizarListaConversas() {
        const listaContainer = get('listaConversas');
        if (!listaContainer) return;

        if (conversasCarregadas.length === 0) {
            listaContainer.innerHTML = '<p class="text-center p-20 text-mutado">Sem conversas ativas.</p>';
            return;
        }

        listaContainer.innerHTML = conversasCarregadas.map(conv => {
            const outroNome = conv.outro_nome || 'Utilizador';
            const produtoTitulo = conv.produto_titulo || 'Produto';
            const ultimaMsg = conv.ultima_mensagem || 'Sem mensagens...';
            const ativoClass = (conversaAtiva && conversaAtiva.id === conv.id) ? 'active' : '';
            const unreadBadge = conv.nao_lidas > 0 ? `<span class="chat-badge">${conv.nao_lidas}</span>` : '';
            const dataFormatada = conv.ultima_mensagem_em ? formatarData(conv.ultima_mensagem_em) : '';

            return `
                <div class="chat-item ${ativoClass}" onclick="window.abrirConversa(${conv.id})">
                    <div class="chat-item-avatar">${outroNome.charAt(0).toUpperCase()}</div>
                    <div class="chat-item-info">
                        <div class="chat-item-topo">
                            <span class="chat-item-nome">${outroNome}</span>
                            <span class="chat-item-tempo">${dataFormatada}</span>
                        </div>
                        <div class="chat-item-produto">${produtoTitulo}</div>
                        <div class="chat-item-preview">${ultimaMsg}</div>
                    </div>
                    ${unreadBadge}
                </div>
            `;
        }).join('');
    }

    window.abrirConversa = async function(conversaId) {
        const conversa = conversasCarregadas.find(c => c.id === conversaId);
        if (!conversa) return;

        // Se já havia conversa ativa, sair da sala anterior
        if (conversaAtiva && socket) {
            socket.emit('chat:sair', conversaAtiva.id);
        }

        conversaAtiva = conversa;
        
        // Atualizar lista para marcar a conversa selecionada como ativa
        renderizarListaConversas();

        // Entrar na sala do Socket.IO
        if (socket) {
            socket.emit('chat:entrar', conversaId);
        }

        const janelaChat = get('janelaChat');
        if (!janelaChat) return;

        const outroNome = conversa.outro_nome || 'Utilizador';
        const produtoTitulo = conversa.produto_titulo || 'Produto';
        const produtoPreco = conversa.produto_preco ? formatarMoeda(conversa.produto_preco) : '';
        const destinatarioId = (conversa.utilizador1_id === utilizadorLogado.id) 
            ? conversa.utilizador2_id 
            : conversa.utilizador1_id;

        janelaChat.innerHTML = `
            <div class="chat-header">
                <div class="chat-header-info">
                    <div class="chat-header-avatar">${outroNome.charAt(0).toUpperCase()}</div>
                    <div>
                        <div class="chat-header-nome">${outroNome}</div>
                        <div class="chat-header-status" id="statusOnline">Negociando: ${produtoTitulo}</div>
                    </div>
                </div>
                <div class="chat-header-produto">
                    <div class="chat-header-produto-info">
                        <span class="chat-header-produto-preco">${produtoPreco}</span>
                    </div>
                </div>
            </div>
            <div class="chat-mensagens" id="mensagensContainer">
                <p class="text-center p-20">A carregar histórico...</p>
            </div>
            <div class="chat-escrevendo-container escondido" id="typingIndicator">
                <div class="typing-bubble">
                    <span></span><span></span><span></span>
                </div>
                <span class="typing-text">${outroNome} está a escrever...</span>
            </div>
            <form class="chat-input-area" id="formEnviarMensagem">
                <input type="text" id="inputMensagem" placeholder="Escreva uma mensagem..." autocomplete="off" required>
                <button type="submit" class="btn btn-primario chat-btn-enviar">
                    <span class="material-symbols-outlined">send</span>
                </button>
            </form>
        `;

        // Carregar Histórico
        try {
            const res = await window.api.conversas.obterMensagens(conversaId);
            if (res.sucesso) {
                renderizarMensagens(res.dados);
            }
        } catch (erro) {
            console.error('Erro ao carregar histórico:', erro);
            const container = get('mensagensContainer');
            if (container) container.innerHTML = '<p class="text-center p-20 text-erro">Erro ao carregar mensagens.</p>';
        }

        // Configurar Eventos do Input
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
                statusEscrevendoTimeout = setTimeout(() => {
                    emitirEscrita(false);
                }, 2000);
            });
        }
    };

    function renderizarMensagens(mensagens) {
        const container = get('mensagensContainer');
        if (!container) return;

        const mensagensOrdenadas = [...mensagens].reverse();

        if (mensagensOrdenadas.length === 0) {
            container.innerHTML = '<p class="text-center p-20 text-mutado">Nenhuma mensagem nesta negociação.</p>';
            return;
        }

        container.innerHTML = mensagensOrdenadas.map(msg => {
            const souEu = msg.remetente_id === utilizadorLogado.id;
            const alinhamento = souEu ? 'enviada' : 'recebida';
            const dataFormatada = formatarHora(msg.criado_em);

            return `
                <div class="mensagem-linha ${alinhamento}">
                    <div class="mensagem-balao">
                        <div class="mensagem-conteudo">${escaparHtml(msg.conteudo)}</div>
                        <div class="mensagem-hora">${dataFormatada}</div>
                    </div>
                </div>
            `;
        }).join('');

        scrollMensagensAoFundo();
    }

    function adicionarMensagemAoEcra(mensagem) {
        const container = get('mensagensContainer');
        if (!container) return;

        const placeholder = container.querySelector('.text-mutado');
        if (placeholder) placeholder.remove();

        const souEu = mensagem.remetente_id === utilizadorLogado.id;
        const alinhamento = souEu ? 'enviada' : 'recebida';
        const dataFormatada = formatarHora(mensagem.criado_em);

        const div = document.createElement('div');
        div.className = `mensagem-linha ${alinhamento}`;
        div.innerHTML = `
            <div class="mensagem-balao">
                <div class="mensagem-conteudo">${escaparHtml(mensagem.conteudo)}</div>
                <div class="mensagem-hora">${dataFormatada}</div>
            </div>
        `;
        container.appendChild(div);
        scrollMensagensAoFundo();
    }

    async function enviarMensagemChat(destinatarioId, produtoId, conteudo) {
        if (!conteudo.trim()) return;

        try {
            await window.api.conversas.enviar({
                destinatario_id: destinatarioId,
                produto_id: produtoId,
                conteudo: conteudo.trim()
            });
        } catch (erro) {
            console.error('Erro ao enviar mensagem:', erro);
            notificar('Erro ao enviar mensagem. Tente novamente.', 'erro');
        }
    }

    function emitirEscrita(escrevendo) {
        if (!socket || !conversaAtiva || isTyping === escrevendo) return;
        isTyping = escrevendo;
        socket.emit('chat:escrevendo', {
            conversaId: conversaAtiva.id,
            escrevendo
        });
    }

    function mostrarIndicadorEscrita(escrevendo) {
        const indicador = get('typingIndicator');
        if (!indicador) return;

        if (escrevendo) {
            indicador.classList.remove('escondido');
            scrollMensagensAoFundo();
        } else {
            indicador.classList.add('escondido');
        }
    }

    function scrollMensagensAoFundo() {
        const container = get('mensagensContainer');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }

    window.contactarVendedor = async function(destinatarioId, produtoId, produtoTitulo) {
        if (!utilizadorLogado) {
            notificar('Por favor, inicie sessão para contactar o vendedor.', 'erro');
            mostrarFormLogin();
            return;
        }

        try {
            const dadosEnvio = {
                destinatario_id: destinatarioId,
                produto_id: produtoId,
                conteudo: `Olá! Tenho interesse no seu anúncio: "${produtoTitulo}".`
            };
            
            const res = await window.api.conversas.enviar(dadosEnvio);
            if (res.sucesso) {
                if (modalDetalhes) modalDetalhes.classList.remove('active');
                
                const role = utilizadorLogado.tipo;
                const destino = obterPaginaPrivadaPorTipo(role);
                
                if (!window.location.pathname.includes(destino)) {
                    localStorage.setItem('conversa_para_abrir', res.dados.conversa_id);
                    window.location.href = destino.replace('paginas/', '');
                } else {
                    const sidebar = get('dashboardSidebar');
                    if (sidebar) {
                        sidebar.querySelectorAll('.sidebar-item').forEach(i => {
                            if (i.dataset.view === 'mensagens') {
                                i.click();
                            }
                        });
                    }
                    setTimeout(() => {
                        window.abrirConversa(res.dados.conversa_id);
                    }, 200);
                }
            }
        } catch (erro) {
            console.error('Erro ao contactar vendedor:', erro);
            notificar(erro.message, 'erro');
        }
    };

    setTimeout(() => {
        const conversaParaAbrir = localStorage.getItem('conversa_para_abrir');
        if (conversaParaAbrir && utilizadorLogado) {
            localStorage.removeItem('conversa_para_abrir');
            
            const sidebar = get('dashboardSidebar');
            if (sidebar) {
                sidebar.querySelectorAll('.sidebar-item').forEach(i => {
                    if (i.dataset.view === 'mensagens') {
                        i.click();
                    }
                });
            }
            setTimeout(() => {
                window.abrirConversa(parseInt(conversaParaAbrir));
            }, 300);
        }
    }, 500);

    // --- Lógica Mobile (Bottom Nav e Hamburger) ---
    const btnBottomHome = get('btnBottomHome');
    const btnBottomPesquisa = get('btnBottomPesquisa');
    const btnBottomMensagens = get('btnBottomMensagens');
    const btnBottomPerfil = get('btnBottomPerfil');
    const btnMenuHamburger = get('btnMenuHamburger');

    if (btnBottomHome) {
        btnBottomHome.addEventListener('click', (e) => {
            e.preventDefault();
            atualizarActiveBottomNav(btnBottomHome);
            irParaHomeContexto();
        });
    }

    if (btnBottomPesquisa) {
        btnBottomPesquisa.addEventListener('click', (e) => {
            e.preventDefault();
            atualizarActiveBottomNav(btnBottomPesquisa);
            const navBusca = get('navbarPesquisa');
            if (navBusca) {
                navBusca.style.display = navBusca.style.display === 'flex' ? 'none' : 'flex';
                if (navBusca.style.display === 'flex') {
                    const input = get('inputBuscaGlobal');
                    if (input) input.focus();
                }
            }
        });
    }

    if (btnBottomMensagens) {
        btnBottomMensagens.addEventListener('click', (e) => {
            e.preventDefault();
            atualizarActiveBottomNav(btnBottomMensagens);
            if (ehPaginaPublica) {
                Navegador.irPara(utilizadorLogado?.tipo === 'vendedor' ? 'vista-vendedor' : 'vista-cliente');
            } else {
                carregarConteudoDashboard('mensagens');
            }
        });
    }

    if (btnBottomPerfil) {
        btnBottomPerfil.addEventListener('click', (e) => {
            e.preventDefault();
            atualizarActiveBottomNav(btnBottomPerfil);
            if (ehPaginaPublica) {
                Navegador.irPara(utilizadorLogado?.tipo === 'vendedor' ? 'vista-vendedor' : 'vista-cliente');
            } else {
                carregarConteudoDashboard('meu-perfil');
            }
        });
    }

    function atualizarActiveBottomNav(btnAtivo) {
        document.querySelectorAll('.bottom-nav-item').forEach(i => i.classList.remove('active'));
        btnAtivo.classList.add('active');
    }

    if (btnMenuHamburger) {
        btnMenuHamburger.addEventListener('click', () => {
            if (!utilizadorLogado) {
                mostrarFormLogin();
                const modal = get('modalAuth');
                if (modal) modal.classList.add('active');
            } else {
                const navBusca = get('navbarPesquisa');
                if (navBusca) {
                    navBusca.style.display = navBusca.style.display === 'flex' ? 'none' : 'flex';
                }
            }
        });
    }

});


// ============================================================
// Funções Globais de Navegação SPA (Integradas de cliente.html e vendedor.html)
// ============================================================

window.toggleDrawer = function() {
    if (window.innerWidth > 768) return;
    const drawer = document.getElementById('mobileDrawer');
    const overlay = document.getElementById('drawerOverlay');
    if (drawer && overlay) {
        if (drawer.style.display === 'block' || drawer.classList.contains('open')) {
            drawer.style.display = 'none';
            drawer.classList.remove('open');
            overlay.style.display = 'none';
        } else {
            drawer.style.display = 'block';
            drawer.classList.add('open');
            overlay.style.display = 'block';
        }
    }
};

window.switchTabCliente = function(tabId, eventTarget) {
    if (tabId === 'post') tabId = 'feed';
    const homeCliente = document.getElementById('homeCliente');
    const dashboard = document.getElementById('dashboard');
    const feedSection = document.getElementById('feedSection');
    const galeriaSection = document.getElementById('galeriaSection');

    if (tabId === 'inicio') {
        if(dashboard) dashboard.classList.add('escondido');
        if(feedSection) feedSection.classList.add('escondido');
        if(galeriaSection) galeriaSection.classList.add('escondido');
        if(homeCliente) homeCliente.classList.remove('escondido');
    } else if (tabId === 'feed') {
        if(dashboard) dashboard.classList.add('escondido');
        if(homeCliente) homeCliente.classList.add('escondido');
        if(galeriaSection) galeriaSection.classList.add('escondido');
        if(feedSection) feedSection.classList.remove('escondido');
    } else if (tabId === 'explorar') {
        if(dashboard) dashboard.classList.add('escondido');
        if(homeCliente) homeCliente.classList.add('escondido');
        if(feedSection) feedSection.classList.add('escondido');
        if(galeriaSection) galeriaSection.classList.remove('escondido');
    } else {
        if(homeCliente) homeCliente.classList.add('escondido');
        if(feedSection) feedSection.classList.add('escondido');
        if(galeriaSection) galeriaSection.classList.add('escondido');
        if(dashboard) dashboard.classList.remove('escondido');
        
        if (window.carregarConteudoDashboard) {
            window.carregarConteudoDashboard(tabId === 'pesquisa' ? 'compras' : (tabId === 'perfil' ? 'meu-perfil' : tabId));
        }
    }

    document.querySelectorAll('.nav-btn, .nav-item-app, .nav-item-post').forEach(btn => btn.classList.remove('ativo'));
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('ativo'));

    if (eventTarget) {
        eventTarget.classList.add('ativo');
    }

    const mobileDrawer = document.getElementById('mobileDrawer');
    if (window.innerWidth <= 768 && mobileDrawer && (mobileDrawer.style.display === 'block' || mobileDrawer.classList.contains('open'))) {
        window.toggleDrawer();
    }
};

window.switchTabVendedor = function(tabId) {
    const TAB_MAP = {
        'dashboard': 'vendedor-inicio',
        'anuncios':  'meus-anuncios',
        'criar':     'criar-anuncio',
        'vendas':    'vendas',
        'mensagens': 'mensagens',
        'perfil':    'meu-perfil'
    };

    const NAV_BTN_MAP = {
        'dashboard': 'btnNavPainel',
        'anuncios':  'btnNavAnuncios',
        'criar':     'btnNavCriar',
        'vendas':    null,
        'mensagens': 'btnNavMensagens',
        'perfil':    'btnNavLoja'
    };

    const vista = TAB_MAP[tabId] || tabId;
    if (window.carregarConteudoDashboard) {
        window.carregarConteudoDashboard(vista);
    }

    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('ativo'));
    const btnId = NAV_BTN_MAP[tabId];
    if (btnId) {
        const btn = document.getElementById(btnId);
        if (btn) btn.classList.add('ativo');
    }

    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('ativo'));
    
    // Simplification for event handling inline
    const mobileDrawer = document.getElementById('mobileDrawer');
    if (window.innerWidth <= 768 && mobileDrawer && (mobileDrawer.style.display === 'block' || mobileDrawer.classList.contains('open'))) {
        window.toggleDrawer();
    }
};

window.switchTab = function(tabId) {
    if (typeof utilizadorLogado !== 'undefined' && utilizadorLogado && utilizadorLogado.tipo === 'cliente') {
        window.switchTabCliente(tabId, window.event ? window.event.currentTarget : null);
    } else {
        window.switchTabVendedor(tabId);
    }
};

