/* ============================================================
   LINKA — Admin App Logic
   SPA state management for platform administration
   Flow: Admin ↔ Clientes | Admin ↔ Vendedores
============================================================ */

// Helpers importados de utils.js (window.linkaUtils)
const notificar = window.notificar;
const confirmarAcao = window.confirmarAcao;
const escaparHtml = window.linkaUtils.escaparHtml;
const formatarMoeda = window.linkaUtils.formatarMoeda;
const formatarDinheiro = window.linkaUtils.formatarDinheiro;
const resolverUrlImagem = window.linkaUtils.resolverUrlImagem;

const appAdmin = {
    estadoAtual: null,
    utilizador: null,
    socket: null,

    init: async function() {
        await this.verificarSessao();
        if (!this.utilizador) return;

        this.iniciarSocket();
        this.navegar('dashboard');
        this.carregarBadgeDenuncias();
    },

    verificarSessao: async function() {
        const token = localStorage.getItem('linka_token');
        if (!token) {
            window.location.href = '../index.html';
            return;
        }

        try {
            const res = await window.api.utilizadores.perfil();
            if (res.sucesso && res.dados.tipo === 'admin') {
                this.utilizador = res.dados;
                const avatar = document.getElementById('avatarAdmin');
                if (avatar) avatar.textContent = this.utilizador.nome.charAt(0).toUpperCase();
            } else {
                window.location.href = '../index.html';
            }
        } catch (e) {
            console.error('Erro na sessão admin', e);
            window.location.href = '../index.html';
        }
    },

    iniciarSocket: function() {
        if (typeof io !== 'function') return;
        const token = localStorage.getItem('linka_token');
        const socketUrl = (window.API_BASE_URL || '').replace('/api', '');
        if (!socketUrl) return;
        this.socket = io(socketUrl, { auth: { token } });

        // Escutar notificações em tempo real
        this.socket.on('notificacao:nova', (notif) => {
            this.carregarBadgeDenuncias();
        });
    },

    navegar: function(estado) {
        this.estadoAtual = estado;

        document.querySelectorAll('.v-nav-item').forEach(el => el.classList.remove('active'));
        const navItem = document.getElementById(`nav-${estado}`);
        if (navItem) navItem.classList.add('active');

        document.querySelectorAll('.v-bottom-nav-item').forEach(el => el.classList.remove('active'));
        const bnavItem = document.getElementById(`bnav-${estado}`);
        if (bnavItem) bnavItem.classList.add('active');

        const content = document.getElementById('adminContent');
        const title = document.getElementById('topbarTitle');

        switch(estado) {
            case 'dashboard':
                title.textContent = 'Dashboard Admin';
                this.renderDashboard(content);
                break;
            case 'utilizadores':
                title.textContent = 'Gestão de Utilizadores';
                this.renderUtilizadores(content);
                break;
            case 'vendedores':
                title.textContent = 'Aprovação de Vendedores';
                this.renderVendedores(content);
                break;
            case 'denuncias':
                title.textContent = 'Gestão de Denúncias';
                this.renderDenuncias(content);
                break;
            case 'sancoes':
                title.textContent = 'Gestão de Sanções';
                this.renderSancoes(content);
                break;
            case 'produtos':
                title.textContent = 'Moderação de Produtos';
                this.renderProdutos(content);
                break;
            case 'anti-spam':
                title.textContent = 'Anti-Spam & Detecção de Padrões';
                this.renderAntiSpam(content);
                break;
        }
    },

    // --------------------------------------------------------
    // 1. DASHBOARD (Métricas detalhadas)
    // --------------------------------------------------------
    renderDashboard: async function(container) {
        container.innerHTML = '<div class="spinner-linka" style="margin: 40px auto;"></div>';
        try {
            const res = await window.api.admin.estatisticasDetalhadas();
            const s = res.dados || {};

            const pedidos = s.pedidos_por_estado || {};
            const tipos = s.utilizadores_por_tipo || {};
            const registos = s.registos_recentes || [];

            container.innerHTML = `
                <div class="admin-grid-stats">
                    <div class="admin-stat-card stat-users">
                        <div class="admin-stat-icon"><span class="material-symbols-outlined">group</span></div>
                        <div class="admin-stat-label">Utilizadores</div>
                        <div class="admin-stat-value">${s.total_utilizadores || 0}</div>
                        <div style="font-size: 12px; color: var(--v-text-muted); margin-top: 4px;">
                            ${tipos.cliente || 0} clientes • ${tipos.vendedor || 0} vendedores
                        </div>
                    </div>
                    <div class="admin-stat-card stat-sellers">
                        <div class="admin-stat-icon"><span class="material-symbols-outlined">store</span></div>
                        <div class="admin-stat-label">Vendedores</div>
                        <div class="admin-stat-value">${s.total_vendedores || 0}</div>
                        ${s.vendedores_pendentes > 0 ? `
                            <div style="font-size: 12px; color: #d97706; margin-top: 4px; cursor: pointer;" onclick="appAdmin.navegar('vendedores')">
                                <span class="material-symbols-outlined">schedule</span> ${s.vendedores_pendentes} pendente(s) de aprovação
                            </div>
                        ` : ''}
                    </div>
                    <div class="admin-stat-card stat-products">
                        <div class="admin-stat-icon"><span class="material-symbols-outlined">inventory_2</span></div>
                        <div class="admin-stat-label">Produtos</div>
                        <div class="admin-stat-value">${s.total_produtos || 0}</div>
                        ${s.produtos_pendentes > 0 ? `
                            <div style="font-size: 12px; color: #d97706; margin-top: 4px; cursor: pointer;" onclick="appAdmin.navegar('produtos')">
                                <span class="material-symbols-outlined">schedule</span> ${s.produtos_pendentes} pendente(s) de moderação
                            </div>
                        ` : ''}
                    </div>
                    <div class="admin-stat-card stat-orders">
                        <div class="admin-stat-icon"><span class="material-symbols-outlined">receipt_long</span></div>
                        <div class="admin-stat-label">Pedidos</div>
                        <div class="admin-stat-value">${s.total_pedidos || 0}</div>
                        <div style="font-size: 12px; color: var(--v-text-muted); margin-top: 4px;">
                            ${pedidos.pendente || 0} pendentes • ${pedidos.entregue || 0} entregues
                        </div>
                    </div>
                    <div class="admin-stat-card stat-revenue">
                        <div class="admin-stat-icon"><span class="material-symbols-outlined">trending_up</span></div>
                        <div class="admin-stat-label">Receita Plataforma</div>
                        <div class="admin-stat-value">${this.formatarMoeda(s.receita_plataforma || 0)}</div>
                    </div>
                    <div class="admin-stat-card stat-reports">
                        <div class="admin-stat-icon"><span class="material-symbols-outlined">flag</span></div>
                        <div class="admin-stat-label">Denúncias Pendentes</div>
                        <div class="admin-stat-value">${s.denuncias_pendentes || 0}</div>
                        <div style="font-size: 12px; color: var(--v-text-muted); margin-top: 4px;">
                            ${s.total_sancoes_activas || 0} sanções activas
                        </div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
                    <div class="v-card">
                        <div class="v-card-header">
                            <h3 class="v-card-title">Pedidos por Estado</h3>
                        </div>
                        <div style="padding: 20px;">
                            ${Object.keys(pedidos).length > 0 ? Object.entries(pedidos).map(([estado, total]) => `
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--v-border);">
                                    <span class="v-status v-status-${estado}" style="text-transform: capitalize;">${estado}</span>
                                    <span style="font-weight: 600;">${total}</span>
                                </div>
                            `).join('') : '<p style="color: var(--v-text-muted);">Sem pedidos registados.</p>'}
                        </div>
                    </div>

                    <div class="v-card">
                        <div class="v-card-header">
                            <h3 class="v-card-title">Registos Recentes</h3>
                        </div>
                        <div style="padding: 20px;">
                            ${registos.length > 0 ? registos.map(u => `
                                <div style="display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--v-border); cursor: pointer;" onclick="appAdmin.verDetalhesUtilizador(${u.id})">
                                    <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--v-primary); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px; flex-shrink: 0;">
                                        ${u.nome.charAt(0).toUpperCase()}
                                    </div>
                                    <div style="flex: 1; min-width: 0;">
                                        <div style="font-weight: 500; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${u.nome}</div>
                                        <div style="font-size: 12px; color: var(--v-text-muted);">${this.formatarData(u.criado_em)}</div>
                                    </div>
                                    <span class="admin-type-chip tipo-${u.tipo}">${u.tipo}</span>
                                </div>
                            `).join('') : '<p style="color: var(--v-text-muted);">Sem registos recentes.</p>'}
                        </div>
                    </div>
                </div>
            `;
        } catch(e) {
            container.innerHTML = '<p style="color: red;">Erro ao carregar dashboard admin.</p>';
        }
    },

    // --------------------------------------------------------
    // 2. UTILIZADORES (com modal de detalhes)
    // --------------------------------------------------------
    renderUtilizadores: async function(container) {
        container.innerHTML = `
            <div class="admin-filters">
                <input type="text" class="v-input" placeholder="Pesquisar por nome, email ou telefone..." id="adminBuscaUser" style="flex: 1; min-width: 200px;">
                <select class="v-input" id="adminFiltroTipo" style="max-width: 160px;">
                    <option value="">Todos os tipos</option>
                    <option value="cliente">Clientes</option>
                    <option value="vendedor">Vendedores</option>
                    <option value="admin">Admins</option>
                    <option value="entregador">Entregadores</option>
                </select>
                <select class="v-input" id="adminFiltroEstado" style="max-width: 160px;">
                    <option value="">Todos os estados</option>
                    <option value="activo">Activo</option>
                    <option value="suspenso">Suspenso</option>
                    <option value="banido">Banido</option>
                </select>
                <button class="v-btn v-btn-primary" onclick="appAdmin.carregarUtilizadores()">
                    <span class="material-symbols-outlined">search</span> Filtrar
                </button>
            </div>
            <div id="adminUsersList"><div class="spinner-linka" style="margin: 40px auto;"></div></div>
            <div class="admin-mobile-list" id="adminUsersMobileList"></div>
        `;

        document.getElementById('adminBuscaUser').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') appAdmin.carregarUtilizadores();
        });

        await this.carregarUtilizadores();
    },

    carregarUtilizadores: async function() {
        const list = document.getElementById('adminUsersList');
        const mobileList = document.getElementById('adminUsersMobileList');
        if (!list) return;

        const filtros = {};
        const busca = document.getElementById('adminBuscaUser')?.value;
        const tipo = document.getElementById('adminFiltroTipo')?.value;
        const estado = document.getElementById('adminFiltroEstado')?.value;

        if (busca) filtros.busca = busca;
        if (tipo) filtros.tipo = tipo;
        if (estado) filtros.estado = estado;

        list.innerHTML = '<div class="spinner-linka" style="margin: 40px auto;"></div>';
        if (mobileList) mobileList.innerHTML = '';

        try {
            const res = await window.api.admin.listarUtilizadores(filtros);
            if (res.sucesso && res.dados.length > 0) {
                list.innerHTML = `
                    <div class="admin-table-wrapper">
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>Utilizador</th>
                                    <th>Telefone</th>
                                    <th>Tipo</th>
                                    <th>Estado</th>
                                    <th>Registado</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${res.dados.map(u => `
                                    <tr style="cursor: pointer;" onclick="appAdmin.verDetalhesUtilizador(${u.id})">
                                        <td>
                                            <div style="display: flex; align-items: center; gap: 10px;">
                                                <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--v-primary); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 13px; flex-shrink: 0;">${u.nome.charAt(0).toUpperCase()}</div>
                                                <div>
                                                    <div style="font-weight: 500;">${u.nome}</div>
                                                    <div style="font-size: 12px; color: var(--v-text-muted);">${u.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>${u.telefone || '--'}</td>
                                        <td><span class="admin-type-chip tipo-${u.tipo}">${u.tipo}</span></td>
                                        <td><span class="admin-status-chip estado-${u.estado || 'activo'}">${u.estado || 'activo'}</span></td>
                                        <td style="font-size: 13px; color: var(--v-text-muted);">${this.formatarData(u.criado_em)}</td>
                                        <td onclick="event.stopPropagation()">
                                            <div style="display: flex; gap: 6px;">
                                                <button class="admin-action-btn" onclick="appAdmin.verDetalhesUtilizador(${u.id})" title="Ver detalhes"><span class="material-symbols-outlined">visibility</span></button>
                                                ${(u.estado || 'activo') !== 'suspenso' ? `<button class="admin-action-btn btn-warning" onclick="appAdmin.mudarEstadoUser(${u.id}, 'suspenso', '${u.nome.replace(/'/g, "\\'")}')" title="Suspender"><span class="material-symbols-outlined">block</span></button>` : ''}
                                                ${(u.estado || 'activo') !== 'banido' ? `<button class="admin-action-btn btn-danger" onclick="appAdmin.mudarEstadoUser(${u.id}, 'banido', '${u.nome.replace(/'/g, "\\'")}')" title="Banir"><span class="material-symbols-outlined">skull</span></button>` : ''}
                                                ${(u.estado || 'activo') !== 'activo' ? `<button class="admin-action-btn btn-success" onclick="appAdmin.mudarEstadoUser(${u.id}, 'activo', '${u.nome.replace(/'/g, "\\'")}')" title="Reactivar"><span class="material-symbols-outlined">check</span></button>` : ''}
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;

                if (mobileList) {
                    mobileList.innerHTML = res.dados.map(u => `
                        <div class="admin-mobile-user-card" onclick="appAdmin.verDetalhesUtilizador(${u.id})" style="cursor: pointer;">
                            <div class="user-header">
                                <div class="user-avatar">${u.nome.charAt(0).toUpperCase()}</div>
                                <div class="user-info">
                                    <div class="user-name">${u.nome}</div>
                                    <div class="user-email">${u.email}</div>
                                </div>
                            </div>
                            <div class="user-meta">
                                <div style="display: flex; gap: 6px;">
                                    <span class="admin-type-chip tipo-${u.tipo}">${u.tipo}</span>
                                    <span class="admin-status-chip estado-${u.estado || 'activo'}">${u.estado || 'activo'}</span>
                                </div>
                            </div>
                        </div>
                    `).join('');
                }
            } else {
                const empty = '<div class="admin-empty-state"><span class="material-symbols-outlined">group_off</span><h3>Nenhum utilizador encontrado</h3><p>Tenta ajustar os filtros de pesquisa.</p></div>';
                list.innerHTML = empty;
                if (mobileList) mobileList.innerHTML = empty;
            }
        } catch(e) {
            list.innerHTML = '<p style="color: red;">Erro ao carregar utilizadores.</p>';
        }
    },

    verDetalhesUtilizador: async function(id) {
        const modal = document.getElementById('modalAdmin');
        const conteudo = document.getElementById('modalAdminConteudo');

        conteudo.innerHTML = '<div class="spinner-linka" style="margin: 40px auto;"></div>';
        modal.classList.add('active');

        try {
            const res = await window.api.admin.obterDetalhesUtilizador(id);
            const u = res.dados;
            const v = u.vendedor;

            conteudo.innerHTML = `
                <div class="admin-modal-form">
                    <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid var(--v-border);">
                        <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--v-primary); color: white; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold;">${u.nome.charAt(0).toUpperCase()}</div>
                        <div>
                            <div class="admin-modal-title" style="margin: 0; padding: 0; border: none;">${u.nome}</div>
                            <div style="color: var(--v-text-muted); font-size: 14px;">${u.email}</div>
                        </div>
                        <div style="margin-left: auto; display: flex; gap: 8px;">
                            <span class="admin-type-chip tipo-${u.tipo}">${u.tipo}</span>
                            <span class="admin-status-chip estado-${u.estado || 'activo'}">${u.estado || 'activo'}</span>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
                        <div>
                            <div style="font-size: 12px; color: var(--v-text-muted); margin-bottom: 4px;">Telefone</div>
                            <div style="font-weight: 500;">${u.telefone || 'Não informado'}</div>
                        </div>
                        <div>
                            <div style="font-size: 12px; color: var(--v-text-muted); margin-bottom: 4px;">Cidade</div>
                            <div style="font-weight: 500;">${u.cidade || 'Não informado'}</div>
                        </div>
                        <div>
                            <div style="font-size: 12px; color: var(--v-text-muted); margin-bottom: 4px;">Registado em</div>
                            <div style="font-weight: 500;">${this.formatarData(u.criado_em)}</div>
                        </div>
                        <div>
                            <div style="font-size: 12px; color: var(--v-text-muted); margin-bottom: 4px;">Último acesso</div>
                            <div style="font-weight: 500;">${u.ultimo_acesso_em ? this.formatarData(u.ultimo_acesso_em) : 'Nunca'}</div>
                        </div>
                    </div>

                    ${v ? `
                        <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                            <div style="font-weight: 600; margin-bottom: 12px;"><span class="material-symbols-outlined">store</span> Perfil de Vendedor</div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                <div>
                                    <div style="font-size: 12px; color: var(--v-text-muted);">Nome da Loja</div>
                                    <div style="font-weight: 500;">${v.nome_loja || 'Sem nome'}</div>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: var(--v-text-muted);">Plano</div>
                                    <div style="font-weight: 500; text-transform: capitalize;">${v.plano || 'gratuito'}</div>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: var(--v-text-muted);">Aprovado</div>
                                    <div style="font-weight: 500;">${v.aprovado ? '<span style="color: #059669;">Sim</span>' : '<span style="color: #dc2626;">Não</span>'}</div>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: var(--v-text-muted);">Produtos</div>
                                    <div style="font-weight: 500;">${u.total_produtos || 0}</div>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: var(--v-text-muted);">Vendas</div>
                                    <div style="font-weight: 500;">${u.total_vendas || 0}</div>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: var(--v-text-muted);">Receita</div>
                                    <div style="font-weight: 500;">${this.formatarMoeda(u.receita_total || 0)}</div>
                                </div>
                            </div>
                            <div style="margin-top: 12px; display: flex; gap: 8px;">
                                ${!v.aprovado ?
                                    `<button class="v-btn v-btn-primary" style="font-size: 13px;" onclick="appAdmin.aprovarVendedor(${u.id}, true, '${u.nome.replace(/'/g, "\\'")}')"><span class="material-symbols-outlined">check</span> Aprovar Loja</button>` :
                                    `<button class="v-btn v-btn-outline" style="font-size: 13px;" onclick="appAdmin.aprovarVendedor(${u.id}, false, '${u.nome.replace(/'/g, "\\'")}')"><span class="material-symbols-outlined">close</span> Revogar Aprovação</button>`
                                }
                            </div>
                        </div>
                    ` : ''}

                    ${u.tipo === 'cliente' ? `
                        <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                            <div style="font-weight: 600; margin-bottom: 12px;"><span class="material-symbols-outlined">shopping_cart</span> Actividade de Compras</div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                <div>
                                    <div style="font-size: 12px; color: var(--v-text-muted);">Total de Pedidos</div>
                                    <div style="font-weight: 500;">${u.total_pedidos || 0}</div>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: var(--v-text-muted);">Gasto Total</div>
                                    <div style="font-weight: 500;">${this.formatarMoeda(u.gasto_total || 0)}</div>
                                </div>
                            </div>
                        </div>
                    ` : ''}

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
                        <div style="background: ${u.sancoes_activas > 0 ? '#fef2f2' : '#f9fafb'}; border-radius: 8px; padding: 16px;">
                            <div style="font-size: 12px; color: var(--v-text-muted);">Sanções Activas</div>
                            <div style="font-weight: 700; font-size: 24px; color: ${u.sancoes_activas > 0 ? '#dc2626' : 'inherit'};">${u.sancoes_activas || 0}</div>
                        </div>
                        <div style="background: ${u.denuncias_recebidas > 0 ? '#fef2f2' : '#f9fafb'}; border-radius: 8px; padding: 16px;">
                            <div style="font-size: 12px; color: var(--v-text-muted);">Denúncias Recebidas</div>
                            <div style="font-weight: 700; font-size: 24px; color: ${u.denuncias_recebidas > 0 ? '#dc2626' : 'inherit'};">${u.denuncias_recebidas || 0}</div>
                        </div>
                    </div>

                    <div style="display: flex; gap: 8px; padding-top: 16px; border-top: 1px solid var(--v-border);">
                        ${(u.estado || 'activo') !== 'suspenso' ? `<button class="v-btn v-btn-outline" style="flex: 1; color: #d97706; border-color: #fde68a;" onclick="appAdmin.mudarEstadoUser(${u.id}, 'suspenso', '${u.nome.replace(/'/g, "\\'")}'); appAdmin.fecharModal();"><span class="material-symbols-outlined">block</span> Suspender</button>` : ''}
                        ${(u.estado || 'activo') !== 'banido' ? `<button class="v-btn v-btn-outline" style="flex: 1; color: #dc2626; border-color: #fecaca;" onclick="appAdmin.mudarEstadoUser(${u.id}, 'banido', '${u.nome.replace(/'/g, "\\'")}'); appAdmin.fecharModal();"><span class="material-symbols-outlined">skull</span> Banir</button>` : ''}
                        ${(u.estado || 'activo') !== 'activo' ? `<button class="v-btn v-btn-primary" style="flex: 1;" onclick="appAdmin.mudarEstadoUser(${u.id}, 'activo', '${u.nome.replace(/'/g, "\\'")}'); appAdmin.fecharModal();"><span class="material-symbols-outlined">check</span> Reactivar</button>` : ''}
                        <button class="v-btn v-btn-outline" onclick="appAdmin.abrirModalSancaoDireto(${u.id}, '${u.nome.replace(/'/g, "\\'")}')" style="flex: 1;"><span class="material-symbols-outlined">gavel</span> Aplicar Sanção</button>
                    </div>
                </div>
            `;
        } catch(e) {
            conteudo.innerHTML = '<p style="color: red; padding: 20px;">Erro ao carregar detalhes do utilizador.</p>';
        }
    },

    mudarEstadoUser: async function(id, novoEstado, nome) {
        const accoes = { suspenso: 'suspender', banido: 'banir', activo: 'reactivar' };
        window.confirmarAcao('Confirmar Acção', `Tem a certeza que deseja ${accoes[novoEstado]} o utilizador "${nome}"?`, async () => {
            try {
                await window.api.admin.alterarEstadoUtilizador(id, novoEstado);
                window.notificar('Estado do utilizador alterado com sucesso.', 'sucesso');
                if (this.estadoAtual === 'utilizadores') this.carregarUtilizadores();
            } catch(e) {
                window.notificar('Erro ao alterar estado: ' + e.message, 'erro');
            }
        });
    },

    // --------------------------------------------------------
    // 3. VENDEDORES (Aprovação)
    // --------------------------------------------------------
    renderVendedores: async function(container) {
        container.innerHTML = `
            <div class="admin-filters">
                <input type="text" class="v-input" placeholder="Pesquisar vendedor..." id="adminBuscaVendedor" style="flex: 1; min-width: 200px;">
                <select class="v-input" id="adminFiltroAprovacao" style="max-width: 180px;">
                    <option value="">Todos</option>
                    <option value="0">Pendentes de Aprovação</option>
                    <option value="1">Aprovados</option>
                </select>
                <button class="v-btn v-btn-primary" onclick="appAdmin.carregarVendedores()">
                    <span class="material-symbols-outlined">search</span> Filtrar
                </button>
            </div>
            <div id="adminVendedoresList"><div class="spinner-linka" style="margin: 40px auto;"></div></div>
        `;

        document.getElementById('adminBuscaVendedor').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') appAdmin.carregarVendedores();
        });

        await this.carregarVendedores();
    },

    carregarVendedores: async function() {
        const list = document.getElementById('adminVendedoresList');
        if (!list) return;

        const filtros = {};
        const busca = document.getElementById('adminBuscaVendedor')?.value;
        const aprovado = document.getElementById('adminFiltroAprovacao')?.value;

        if (busca) filtros.busca = busca;
        if (aprovado !== '') filtros.aprovado = aprovado;

        list.innerHTML = '<div class="spinner-linka" style="margin: 40px auto;"></div>';

        try {
            const res = await window.api.admin.listarVendedores(filtros);
            if (res.sucesso && res.dados.length > 0) {
                list.innerHTML = `
                    <div class="admin-table-wrapper">
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>Vendedor</th>
                                    <th>Loja</th>
                                    <th>Plano</th>
                                    <th>Aprovado</th>
                                    <th>Registado</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${res.dados.map(v => `
                                    <tr>
                                        <td>
                                            <div style="display: flex; align-items: center; gap: 10px;">
                                                <div style="width: 32px; height: 32px; border-radius: 50%; background: #10b981; color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 13px; flex-shrink: 0;">${(v.nome_utilizador || 'V').charAt(0).toUpperCase()}</div>
                                                <div>
                                                    <div style="font-weight: 500;">${v.nome_utilizador || '--'}</div>
                                                    <div style="font-size: 12px; color: var(--v-text-muted);">${v.email || '--'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style="font-weight: 500;">${v.nome_loja || 'Sem nome'}</td>
                                        <td style="text-transform: capitalize;">${v.plano || 'gratuito'}</td>
                                        <td>
                                            ${v.aprovado ?
                                                '<span class="admin-status-chip estado-activo">Aprovado</span>' :
                                                '<span class="admin-status-chip estado-suspenso">Pendente</span>'
                                            }
                                        </td>
                                        <td style="font-size: 13px; color: var(--v-text-muted);">${this.formatarData(v.utilizador_criado_em || v.criado_em)}</td>
                                        <td>
                                            <div style="display: flex; gap: 6px;">
                                                <button class="admin-action-btn" onclick="appAdmin.verDetalhesUtilizador(${v.utilizador_id})" title="Ver perfil"><span class="material-symbols-outlined">visibility</span></button>
                                                ${!v.aprovado ?
                                                    `<button class="admin-action-btn btn-success" onclick="appAdmin.aprovarVendedor(${v.utilizador_id}, true, '${(v.nome_utilizador || '').replace(/'/g, "\\'")}')" title="Aprovar"><span class="material-symbols-outlined">check</span> Aprovar</button>` :
                                                    `<button class="admin-action-btn btn-danger" onclick="appAdmin.aprovarVendedor(${v.utilizador_id}, false, '${(v.nome_utilizador || '').replace(/'/g, "\\'")}')" title="Revogar"><span class="material-symbols-outlined">close</span></button>`
                                                }
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            } else {
                list.innerHTML = '<div class="admin-empty-state"><span class="material-symbols-outlined">store_off</span><h3>Sem vendedores</h3><p>Nenhum vendedor encontrado com os filtros seleccionados.</p></div>';
            }
        } catch(e) {
            list.innerHTML = '<p style="color: red;">Erro ao carregar vendedores.</p>';
        }
    },

    aprovarVendedor: async function(utilizadorId, aprovado, nome) {
        const accao = aprovado ? 'aprovar' : 'revogar a aprovação de';
        window.confirmarAcao('Confirmar Acção', `Deseja ${accao} a loja de "${nome}"?`, async () => {
            try {
                await window.api.admin.aprovarVendedor(utilizadorId, aprovado);
                window.notificar('Acção executada com sucesso.', 'sucesso');
                if (this.estadoAtual === 'vendedores') this.carregarVendedores();
                if (this.estadoAtual === 'utilizadores') this.carregarUtilizadores();
            } catch(e) {
                window.notificar('Erro ao processar: ' + e.message, 'erro');
            }
        });
    },

    // --------------------------------------------------------
    // 4. DENÚNCIAS
    // --------------------------------------------------------
    renderDenuncias: async function(container) {
        container.innerHTML = `
            <div class="admin-filters">
                <select class="v-input" id="adminFiltroDenuncia" style="max-width: 200px;">
                    <option value="">Todas</option>
                    <option value="pendente">Pendentes</option>
                    <option value="em_analise">Em Análise</option>
                    <option value="resolvida">Resolvidas</option>
                    <option value="rejeitada">Rejeitadas</option>
                </select>
                <button class="v-btn v-btn-primary" onclick="appAdmin.carregarDenuncias()">
                    <span class="material-symbols-outlined">refresh</span> Actualizar
                </button>
            </div>
            <div id="adminDenunciasList"><div class="spinner-linka" style="margin: 40px auto;"></div></div>
        `;

        await this.carregarDenuncias();
    },

    carregarDenuncias: async function() {
        const list = document.getElementById('adminDenunciasList');
        if (!list) return;

        const estado = document.getElementById('adminFiltroDenuncia')?.value || '';
        list.innerHTML = '<div class="spinner-linka" style="margin: 40px auto;"></div>';

        try {
            const res = await window.api.denuncias.listar(estado);
            if (res.sucesso && res.dados.length > 0) {
                list.innerHTML = res.dados.map(d => `
                    <div class="admin-denuncia-card">
                        <div class="admin-denuncia-header">
                            <div>
                                <div style="font-weight: 600; font-size: 15px;">Denúncia #${d.id}</div>
                                <div class="admin-denuncia-meta">
                                    Por: <strong>${d.denunciante_nome || 'Anónimo'}</strong> • ${d.denunciado_nome ? `Contra: <strong>${d.denunciado_nome}</strong>` : ''} • ${this.formatarData(d.criado_em)}
                                </div>
                            </div>
                            <span class="admin-status-chip estado-${d.estado === 'pendente' ? 'suspenso' : d.estado === 'resolvida' ? 'activo' : d.estado === 'em_analise' ? 'confirmado' : 'banido'}">${d.estado}</span>
                        </div>
                        ${d.produto_titulo ? `<div style="font-size: 13px; margin-bottom: 8px;"><span class="material-symbols-outlined" style="color: var(--v-text-muted);">inventory_2</span> Produto: <strong>${d.produto_titulo}</strong></div>` : ''}
                        <div style="margin-bottom: 8px;">
                            <span style="font-size: 12px; color: var(--v-text-muted);">Motivo:</span>
                            <span style="font-size: 12px; font-weight: 500; text-transform: capitalize;">${d.motivo || 'Não especificado'}</span>
                        </div>
                        <div class="admin-denuncia-motivo">${d.descricao || 'Sem descrição adicional.'}</div>
                        ${d.resposta_admin ? `<div style="margin-top: 12px; padding: 12px; background: #f0fdf4; border-radius: 8px; font-size: 13px;"><strong>Resposta do Admin:</strong> ${d.resposta_admin}</div>` : ''}
                        ${d.estado === 'pendente' ? `
                            <div class="admin-denuncia-actions">
                                <button class="v-btn v-btn-primary" onclick="appAdmin.resolverDenunciaComentario(${d.id}, 'resolvida')" style="font-size: 13px;">
                                    <span class="material-symbols-outlined">check</span> Resolver
                                </button>
                                <button class="v-btn v-btn-outline" onclick="appAdmin.resolverDenunciaComentario(${d.id}, 'rejeitada')" style="font-size: 13px;">
                                    <span class="material-symbols-outlined">close</span> Rejeitar
                                </button>
                            </div>
                        ` : ''}
                    </div>
                `).join('');
            } else {
                list.innerHTML = '<div class="admin-empty-state"><span class="material-symbols-outlined">flag</span><h3>Sem denúncias</h3><p>Não há denúncias para mostrar.</p></div>';
            }
            this.carregarBadgeDenuncias();
        } catch(e) {
            list.innerHTML = '<p style="color: red;">Erro ao carregar denúncias.</p>';
        }
    },

    resolverDenunciaComentario: function(id, novoEstado) {
        const modal = document.getElementById('modalAdmin');
        const conteudo = document.getElementById('modalAdminConteudo');
        const accao = novoEstado === 'resolvida' ? 'Resolver' : 'Rejeitar';

        conteudo.innerHTML = `
            <div class="admin-modal-form">
                <div class="admin-modal-title">${accao} Denúncia #${id}</div>
                <form id="formResolverDenuncia">
                    <div class="v-form-group">
                        <label class="v-label">Resposta ao Denunciante (opcional)</label>
                        <textarea name="resposta_admin" class="v-input" rows="3" placeholder="Explique a decisão tomada..."></textarea>
                    </div>
                    <div style="display: flex; gap: 12px;">
                        <button type="button" class="v-btn v-btn-outline" onclick="appAdmin.fecharModal()" style="flex: 1; padding: 14px;">Cancelar</button>
                        <button type="submit" class="v-btn v-btn-primary" style="flex: 2; padding: 14px; ${novoEstado === 'rejeitada' ? 'background: #6b7280;' : ''}">${accao}</button>
                    </div>
                </form>
            </div>
        `;

        modal.classList.add('active');

        document.getElementById('formResolverDenuncia').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            btn.textContent = 'A processar...';
            btn.disabled = true;

            const resposta = e.target.resposta_admin.value;
            try {
                await window.api.denuncias.resolver(id, novoEstado, resposta);
                appAdmin.fecharModal();
                appAdmin.carregarDenuncias();
            } catch(e) {
                window.notificar('Erro: ' + e.message, 'erro');
                btn.textContent = accao;
                btn.disabled = false;
            }
        });
    },

    carregarBadgeDenuncias: async function() {
        try {
            const res = await window.api.denuncias.contarPendentes();
            const badge = document.getElementById('badgeDenuncias');
            if (badge && res.sucesso) {
                const total = res.dados.total || 0;
                badge.textContent = total;
                badge.style.display = total > 0 ? 'inline-block' : 'none';
            }
        } catch(e) { console.warn('Erro ao carregar badge denúncias:', e.message); }
    },

    // --------------------------------------------------------
    // 5. SANÇÕES
    // --------------------------------------------------------
    renderSancoes: async function(container) {
        container.innerHTML = `
            <div class="admin-filters">
                <button class="v-btn v-btn-primary" onclick="appAdmin.abrirModalCriarSancao()">
                    <span class="material-symbols-outlined">add</span> Nova Sanção
                </button>
                <button class="v-btn v-btn-outline" onclick="appAdmin.carregarSancoes()">
                    <span class="material-symbols-outlined">refresh</span> Actualizar
                </button>
            </div>
            <div id="adminSancoesList"><div class="spinner-linka" style="margin: 40px auto;"></div></div>
        `;

        await this.carregarSancoes();
    },

    carregarSancoes: async function() {
        const list = document.getElementById('adminSancoesList');
        if (!list) return;

        list.innerHTML = '<div class="spinner-linka" style="margin: 40px auto;"></div>';

        try {
            const res = await window.api.sancoes.listarTodas();
            if (res.sucesso && res.dados.length > 0) {
                list.innerHTML = res.dados.map(s => `
                    <div class="admin-sancao-card ${s.activa === 0 ? 'sancao-inactiva' : ''}">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                            <div>
                                <div style="font-weight: 600; font-size: 15px;">Sanção #${s.id}</div>
                                <div style="font-size: 13px; color: var(--v-text-muted); margin-top: 2px;">
                                    Utilizador: <strong>${s.utilizador_nome || 'ID ' + s.utilizador_id}</strong> • Aplicada por: ${s.admin_nome || 'Admin'}
                                </div>
                            </div>
                            <span class="admin-status-chip ${s.activa ? 'estado-activo' : 'estado-banido'}">${s.activa ? 'Activa' : 'Inactiva'}</span>
                        </div>
                        <div style="margin-bottom: 8px;">
                            <span style="font-size: 12px; color: var(--v-text-muted);">Tipo:</span>
                            <span style="font-size: 13px; font-weight: 500; text-transform: capitalize; ${s.tipo === 'banimento' ? 'color: #dc2626;' : s.tipo === 'suspensao' ? 'color: #d97706;' : ''}">${s.tipo}</span>
                        </div>
                        <div style="font-size: 14px; line-height: 1.5; margin-bottom: 12px;">${s.motivo || 'Sem motivo especificado.'}</div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 12px; color: var(--v-text-muted);">${this.formatarData(s.criado_em)}${s.expira_em ? ` • Expira: ${this.formatarData(s.expira_em)}` : ''}</span>
                            <div style="display: flex; gap: 6px;">
                                <button class="admin-action-btn" onclick="appAdmin.verDetalhesUtilizador(${s.utilizador_id})" title="Ver utilizador"><span class="material-symbols-outlined">visibility</span></button>
                                ${s.activa ? `<button class="admin-action-btn btn-danger" onclick="appAdmin.desactivarSancao(${s.id})"><span class="material-symbols-outlined">block</span> Desactivar</button>` : ''}
                            </div>
                        </div>
                    </div>
                `).join('');
            } else {
                list.innerHTML = '<div class="admin-empty-state"><span class="material-symbols-outlined">gavel</span><h3>Sem sanções</h3><p>Nenhuma sanção foi aplicada ainda.</p></div>';
            }
        } catch(e) {
            list.innerHTML = '<p style="color: red;">Erro ao carregar sanções.</p>';
        }
    },

    abrirModalCriarSancao: function(utilizadorIdPredefinido = '', nomePredefinido = '') {
        const modal = document.getElementById('modalAdmin');
        const conteudo = document.getElementById('modalAdminConteudo');

        conteudo.innerHTML = `
            <div class="admin-modal-form">
                <div class="admin-modal-title">Aplicar Nova Sanção</div>
                <form id="formCriarSancao">
                    <div class="v-form-group">
                        <label class="v-label">ID do Utilizador</label>
                        <input type="number" name="utilizador_id" class="v-input" required placeholder="ID do utilizador" value="${utilizadorIdPredefinido}" ${utilizadorIdPredefinido ? 'readonly style="background: #f3f4f6;"' : ''}>
                        ${nomePredefinido ? `<div style="font-size: 12px; color: var(--v-text-muted); margin-top: 4px;">${nomePredefinido}</div>` : ''}
                    </div>
                    <div class="v-form-group">
                        <label class="v-label">Tipo de Sanção</label>
                        <select name="tipo" class="v-input" required>
                            <option value="aviso">Aviso</option>
                            <option value="suspensao">Suspensão</option>
                            <option value="banimento">Banimento</option>
                        </select>
                    </div>
                    <div class="v-form-group">
                        <label class="v-label">Motivo</label>
                        <textarea name="motivo" class="v-input" rows="3" required placeholder="Descreva o motivo da sanção..."></textarea>
                    </div>
                    <div class="v-form-group">
                        <label class="v-label">Duração (dias, vazio = permanente)</label>
                        <input type="number" name="duracao_dias" class="v-input" min="1" placeholder="Ex: 7, 30, 90...">
                    </div>
                    <div style="display: flex; gap: 12px;">
                        <button type="button" class="v-btn v-btn-outline" onclick="appAdmin.fecharModal()" style="flex: 1; padding: 14px;">Cancelar</button>
                        <button type="submit" class="v-btn v-btn-primary" style="flex: 2; padding: 14px; background: #dc2626;">Aplicar Sanção</button>
                    </div>
                </form>
            </div>
        `;

        modal.classList.add('active');

        document.getElementById('formCriarSancao').addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const btn = form.querySelector('button[type="submit"]');
            btn.textContent = 'A aplicar...';
            btn.disabled = true;

            const formData = new FormData(form);
            const dados = Object.fromEntries(formData.entries());
            if (dados.duracao_dias) dados.duracao_dias = parseInt(dados.duracao_dias);
            else delete dados.duracao_dias;

            try {
                await window.api.sancoes.criar(dados);
                appAdmin.fecharModal();
                appAdmin.carregarSancoes();
            } catch(e) {
                window.notificar('Erro ao aplicar sanção: ' + e.message, 'erro');
                btn.textContent = 'Aplicar Sanção';
                btn.disabled = false;
            }
        });
    },

    abrirModalSancaoDireto: function(utilizadorId, nome) {
        this.fecharModal();
        setTimeout(() => this.abrirModalCriarSancao(utilizadorId, nome), 100);
    },

    desactivarSancao: async function(id) {
        window.confirmarAcao('Desactivar Sanção', 'Deseja desactivar esta sanção?', async () => {
            try {
                await window.api.sancoes.desactivar(id);
                window.notificar('Sanção desactivada com sucesso.', 'sucesso');
                this.carregarSancoes();
            } catch(e) {
                window.notificar('Erro ao desactivar sanção: ' + e.message, 'erro');
            }
        });
    },

    // --------------------------------------------------------
    // 6. PRODUTOS (MODERAÇÃO)
    // --------------------------------------------------------
    renderProdutos: async function(container) {
        container.innerHTML = `
            <div class="admin-filters">
                <input type="text" class="v-input" placeholder="Pesquisar produto..." id="adminBuscaProduto" style="flex: 1; min-width: 200px;">
                <select class="v-input" id="adminFiltroAprovacaoProd" style="max-width: 180px;">
                    <option value="">Todos</option>
                    <option value="0">Pendentes</option>
                    <option value="1">Aprovados</option>
                </select>
                <button class="v-btn v-btn-primary" onclick="appAdmin.carregarProdutosAdmin()">
                    <span class="material-symbols-outlined">search</span> Filtrar
                </button>
            </div>
            <div id="adminProdutosList"><div class="spinner-linka" style="margin: 40px auto;"></div></div>
        `;

        document.getElementById('adminBuscaProduto').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') appAdmin.carregarProdutosAdmin();
        });

        await this.carregarProdutosAdmin();
    },

    carregarProdutosAdmin: async function() {
        const list = document.getElementById('adminProdutosList');
        if (!list) return;

        const filtros = {};
        const busca = document.getElementById('adminBuscaProduto')?.value;
        const aprovado = document.getElementById('adminFiltroAprovacaoProd')?.value;

        if (busca) filtros.busca = busca;
        if (aprovado !== '') filtros.aprovado = aprovado;

        list.innerHTML = '<div class="spinner-linka" style="margin: 40px auto;"></div>';

        try {
            const res = await window.api.admin.listarProdutosAdmin(filtros);
            if (res.sucesso && res.dados.length > 0) {
                list.innerHTML = `
                    <div class="v-card">
                        ${res.dados.map(p => `
                            <div class="v-list-item">
                                <div style="display: flex; gap: 16px; align-items: center;">
                                    <div style="width: 60px; height: 60px; border-radius: var(--v-radius-sm); background: url('${this.resolverImg(p.imagem_url)}') center/cover; flex-shrink: 0;"></div>
                                    <div style="min-width: 0;">
                                        <div style="font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.titulo}</div>
                                        <div style="color: var(--v-text-muted); font-size: 13px;">Vendedor: ${p.vendedor_nome || 'N/D'} • ${this.formatarMoeda(p.preco)}</div>
                                    </div>
                                </div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span class="admin-status-chip ${p.aprovado ? 'estado-activo' : 'estado-suspenso'}">${p.aprovado ? 'Aprovado' : 'Pendente'}</span>
                                    ${!p.aprovado ?
                                        `<button class="admin-action-btn btn-success" onclick="appAdmin.moderarProduto(${p.id}, true)" title="Aprovar"><span class="material-symbols-outlined">check</span></button>` :
                                        `<button class="admin-action-btn btn-warning" onclick="appAdmin.moderarProduto(${p.id}, false)" title="Rejeitar"><span class="material-symbols-outlined">close</span></button>`
                                    }
                                    <button class="admin-action-btn btn-danger" onclick="appAdmin.apagarProduto(${p.id}, '${p.titulo.replace(/'/g, "\\'")}')" title="Remover"><span class="material-symbols-outlined">delete</span></button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            } else {
                list.innerHTML = '<div class="admin-empty-state"><span class="material-symbols-outlined">inventory_2</span><h3>Sem produtos</h3><p>Não existem produtos com os filtros seleccionados.</p></div>';
            }
        } catch(e) {
            list.innerHTML = '<p style="color: red;">Erro ao carregar produtos.</p>';
        }
    },

    moderarProduto: async function(id, aprovado) {
        const accao = aprovado ? 'aprovar' : 'rejeitar';
        window.confirmarAcao('Moderar Produto', `Deseja ${accao} este produto?`, async () => {
            try {
                await window.api.admin.moderarProduto(id, aprovado);
                window.notificar('Produto moderado com sucesso.', 'sucesso');
                this.carregarProdutosAdmin();
            } catch(e) {
                window.notificar('Erro ao processar: ' + e.message, 'erro');
            }
        });
    },

    apagarProduto: async function(id, titulo) {
        window.confirmarAcao('Eliminar Produto', `Tem a certeza que deseja remover o produto "${titulo}"?`, async () => {
            try {
                await window.api.produtos.eliminar(id);
                window.notificar('Produto removido com sucesso.', 'sucesso');
                this.carregarProdutosAdmin();
            } catch(e) {
                window.notificar('Erro ao remover produto: ' + e.message, 'erro');
            }
        });
    },

    // --------------------------------------------------------
    // 7. ANTI-SPAM & DETECÇÃO DE PADRÕES
    // --------------------------------------------------------
    renderAntiSpam: async function(container) {
        container.innerHTML = '<div class="spinner-linka" style="margin: 40px auto;"></div>';

        try {
            const [estRes, alertasRes, bloqueiosRes] = await Promise.all([
                window.api.antiSpam.estatisticas(),
                window.api.antiSpam.alertas('pendente', 20, 0),
                window.api.antiSpam.bloqueios('ativos')
            ]);

            const est = estRes.dados || {};
            const alertas = alertasRes.dados?.dados || [];
            const pendentes = alertasRes.dados?.pendentes || 0;
            const bloqueios = bloqueiosRes.dados || [];

            container.innerHTML = `
                <div class="admin-grid-stats" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 24px;">
                    <div class="admin-stat-card stat-users">
                        <div class="admin-stat-icon"><span class="material-symbols-outlined">analytics</span></div>
                        <div class="admin-stat-label">Accões Hoje</div>
                        <div class="admin-stat-value">${est.accoes_hoje || 0}</div>
                    </div>
                    <div class="admin-stat-card stat-reports">
                        <div class="admin-stat-icon"><span class="material-symbols-outlined">flag</span></div>
                        <div class="admin-stat-label">Alertas Pendentes</div>
                        <div class="admin-stat-value">${pendentes}</div>
                    </div>
                    <div class="admin-stat-card stat-sellers">
                        <div class="admin-stat-icon"><span class="material-symbols-outlined">block</span></div>
                        <div class="admin-stat-label">Bloqueios Activos</div>
                        <div class="admin-stat-value">${est.bloqueios_activos || 0}</div>
                    </div>
                    <div class="admin-stat-card stat-orders">
                        <div class="admin-stat-icon"><span class="material-symbols-outlined">security</span></div>
                        <div class="admin-stat-label">Total Alertas</div>
                        <div class="admin-stat-value">${est.total_alertas || 0}</div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px;">
                    <div class="v-card">
                        <div class="v-card-header">
                            <h3 class="v-card-title">Alertas Recentes</h3>
                        </div>
                        <div style="padding: 12px;">
                            ${alertas.length > 0 ? alertas.map(a => `
                                <div style="display: flex; align-items: center; gap: 12px; padding: 12px; border-bottom: 1px solid var(--v-border);">
                                    <div style="width: 36px; height: 36px; border-radius: 50%; background: ${a.estado === 'pendente' ? '#fef3c7' : '#d1fae5'}; display: flex; align-items: center; justify-content: center;">
                                        <span class="material-symbols-outlined" style="font-size: 20px; color: ${a.estado === 'pendente' ? '#d97706' : '#059669'};">${a.estado === 'pendente' ? 'warning' : 'check_circle'}</span>
                                    </div>
                                    <div style="flex: 1; min-width: 0;">
                                        <div style="font-weight: 500; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${a.descricao}</div>
                                        <div style="font-size: 12px; color: var(--v-text-muted);">${a.utilzador_nome || 'Utilizador'} • ${a.padrao_nome || a.tipo_alerta} • ${this.formatarData(a.criado_em)}</div>
                                    </div>
                                    ${a.estado === 'pendente' ? `
                                        <div style="display: flex; gap: 4px;">
                                            <button class="admin-action-btn btn-success" onclick="appAdmin.resolverAlertaAntiSpam(${a.id}, 'resolvido')" title="Resolver"><span class="material-symbols-outlined">check</span></button>
                                            <button class="admin-action-btn btn-danger" onclick="appAdmin.resolverAlertaAntiSpam(${a.id}, 'descartado')" title="Descartar"><span class="material-symbols-outlined">close</span></button>
                                        </div>
                                    ` : `<span style="font-size: 12px; color: var(--v-text-muted);">${a.estado}</span>`}
                                </div>
                            `).join('') : '<p style="padding: 20px; color: var(--v-text-muted);">Nenhum alerta recente.</p>'}
                        </div>
                    </div>

                    <div>
                        <div class="v-card" style="margin-bottom: 16px;">
                            <div class="v-card-header">
                                <h3 class="v-card-title">Bloqueios Activos</h3>
                            </div>
                            <div style="padding: 12px;">
                                ${bloqueios.length > 0 ? bloqueios.map(b => `
                                    <div style="padding: 10px; border-bottom: 1px solid var(--v-border);">
                                        <div style="font-weight: 500; font-size: 14px;">${b.nome || 'ID ' + b.utilizador_id}</div>
                                        <div style="font-size: 12px; color: var(--v-text-muted);">${b.motivo}</div>
                                        <div style="font-size: 11px; color: var(--v-text-muted); margin-top: 4px;">
                                            ${b.tipo_bloqueio === 'permanente' ? 'Permanente' : `Até ${b.expira_em ? this.formatarData(b.expira_em) : 'N/D'}`}
                                        </div>
                                        <button class="v-btn v-btn-outline" style="font-size: 12px; margin-top: 6px; padding: 4px 8px;" onclick="appAdmin.desbloquearAntiSpam(${b.utilizador_id})">Desbloquear</button>
                                    </div>
                                `).join('') : '<p style="padding: 20px; color: var(--v-text-muted);">Nenhum bloqueio activo.</p>'}
                            </div>
                        </div>

                        <div class="v-card">
                            <div class="v-card-header">
                                <h3 class="v-card-title">Acções Rápidas</h3>
                            </div>
                            <div style="padding: 12px; display: flex; flex-direction: column; gap: 8px;">
                                <button class="v-btn v-btn-outline" onclick="appAdmin.limparRegistosAntiSpam()">
                                    <span class="material-symbols-outlined">delete_sweep</span> Limpar Registos (30 dias)
                                </button>
                                <button class="v-btn v-btn-outline" onclick="appAdmin.verificarBloqueio()">
                                    <span class="material-symbols-outlined">search</span> Verificar Bloqueio
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } catch(e) {
            container.innerHTML = '<p style="color: red;">Erro ao carregar dados de anti-spam.</p>';
        }
    },

    resolverAlertaAntiSpam: async function(id, estado) {
        try {
            await window.api.antiSpam.resolverAlerta(id, estado);
            window.notificar(`Alerta ${estado}.`, 'sucesso');
            this.renderAntiSpam(document.getElementById('adminContent'));
        } catch(e) {
            window.notificar('Erro: ' + e.message, 'erro');
        }
    },

    desbloquearAntiSpam: async function(utilizadorId) {
        window.confirmarAcao('Desbloquear', 'Remover bloqueio deste utilizador?', async () => {
            try {
                await window.api.antiSpam.desbloquear(utilizadorId);
                window.notificar('Utilizador desbloqueado.', 'sucesso');
                this.renderAntiSpam(document.getElementById('adminContent'));
            } catch(e) {
                window.notificar('Erro: ' + e.message, 'erro');
            }
        });
    },

    limparRegistosAntiSpam: async function() {
        window.confirmarAcao('Limpar Registos', 'Eliminar registos de anti-spam com mais de 30 dias?', async () => {
            try {
                const res = await window.api.pedido('/anti-spam/limpar', 'POST', { dias: 30 });
                window.notificar(res.mensagem || 'Registos limpos.', 'sucesso');
                this.renderAntiSpam(document.getElementById('adminContent'));
            } catch(e) {
                window.notificar('Erro: ' + e.message, 'erro');
            }
        });
    },

    verificarBloqueio: function() {
        const modal = document.getElementById('modalAdmin');
        const conteudo = document.getElementById('modalAdminConteudo');
        conteudo.innerHTML = `
            <div class="admin-modal-form">
                <div class="admin-modal-title">Verificar Bloqueio de Utilizador</div>
                <form id="formVerificarBloqueio">
                    <div class="v-form-group">
                        <label class="v-label">ID do Utilizador</label>
                        <input type="number" name="utilizador_id" class="v-input" required placeholder="ID do utilizador">
                    </div>
                    <div style="display: flex; gap: 12px;">
                        <button type="button" class="v-btn v-btn-outline" onclick="appAdmin.fecharModal()" style="flex: 1; padding: 14px;">Cancelar</button>
                        <button type="submit" class="v-btn v-btn-primary" style="flex: 2; padding: 14px;">Verificar</button>
                    </div>
                </form>
            </div>
        `;
        modal.classList.add('active');

        document.getElementById('formVerificarBloqueio').addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = e.target.utilizador_id.value;
            try {
                const res = await window.api.pedido(`/anti-spam/bloqueios?utilizador_id=${id}`);
                const bloqueios = res.dados || [];
                if (bloqueios.length > 0) {
                    window.notificar(`Utilizador ${id} tem ${bloqueios.length} bloqueio(s) activo(s).`, 'erro');
                } else {
                    window.notificar(`Utilizador ${id} não está bloqueado.`, 'sucesso');
                }
            } catch(err) {
                window.notificar('Erro: ' + err.message, 'erro');
            }
            appAdmin.fecharModal();
        });
    },

    // --------------------------------------------------------
    // UTILITÁRIOS
    // --------------------------------------------------------
    fecharModal: function() {
        document.getElementById('modalAdmin').classList.remove('active');
    },

    formatarMoeda: function(valor) {
        return new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(valor);
    },

    formatarData: function(dataStr) {
        if (!dataStr) return '';
        const d = new Date(dataStr);
        return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
    },

    resolverImg: function(url) {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        const apiOrigin = window.API_BASE_URL.replace('/api', '');
        return `${apiOrigin}${url.startsWith('/') ? '' : '/'}${url}`;
    },

    fazerLogout: function() {
        confirmarAcao('Terminar Sessão', 'Tem a certeza de que deseja sair da conta admin?', async () => {
            try { await window.api.auth.logout(); } catch (e) { console.warn('Logout API error:', e.message); }
            localStorage.removeItem('linka_token');
            localStorage.removeItem('linka_utilizador');
            window.location.href = '../index.html';
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    appAdmin.init();
});
