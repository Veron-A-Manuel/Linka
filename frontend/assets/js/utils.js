/* ============================================================
   LINKA — Utils Partilhados (v2)
   Funções utilitárias usadas por todas as apps
   ============================================================ */

(function () {
    'use strict';

    const apiOrigin = (window.API_BASE_URL || '').replace(/\/api\/?$/, '') || window.location.origin;

    const imagemProdutoPadrao = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
            <rect width="800" height="600" fill="#f3f4f6"/>
            <rect x="260" y="210" width="280" height="180" rx="18" fill="#d1d5db"/>
            <circle cx="330" cy="270" r="34" fill="#ffffff"/>
            <path d="M285 360l80-72 62 52 42-38 70 58z" fill="#ffffff"/>
            <text x="400" y="455" text-anchor="middle" fill="#6b7280" font-family="Arial, sans-serif" font-size="28">Sem imagem</text>
        </svg>
    `.trim())}`;

    function escaparHtml(texto) {
        if (!texto) return '';
        const d = document.createElement('div');
        d.innerText = texto;
        return d.innerHTML;
    }

    function formatarMoeda(v) {
        return new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(v);
    }

    function formatarDinheiro(v) {
        return Number(v || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function formatarHora(s) {
        return new Date(s).toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' });
    }

    function formatarData(s) {
        const d = new Date(s);
        const h = new Date();
        if (d.toDateString() === h.toDateString()) return formatarHora(s);
        return d.toLocaleDateString('pt-MZ', { day: '2-digit', month: '2-digit' });
    }

    function formatarDataCompleta(s) {
        return new Date(s).toLocaleDateString('pt-MZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    function formatarDataRelativa(s) {
        const d = new Date(s);
        const agora = new Date();
        const diff = Math.floor((agora - d) / 1000);
        if (diff < 60) return 'agora';
        if (diff < 3600) return `${Math.floor(diff / 60)}m`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
        return formatarDataCompleta(s);
    }

    function resolverUrlImagem(caminho) {
        if (!caminho || typeof caminho !== 'string') return imagemProdutoPadrao;
        const valor = caminho.trim();
        if (!valor) return imagemProdutoPadrao;
        if (/^(https?:|data:|blob:)/i.test(valor)) return valor;
        if (valor.startsWith('/uploads/')) return `${apiOrigin}${valor}`;
        if (valor.startsWith('uploads/')) return `${apiOrigin}/${valor}`;
        if (!valor.includes('/')) return imagemProdutoPadrao;
        try { return new URL(valor, window.location.href).href; } catch { return imagemProdutoPadrao; }
    }

    function cssUrlImagem(caminho) {
        return `url('${resolverUrlImagem(caminho).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')`;
    }

    function debounce(fn, ms) {
        let t;
        return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
    }

    function normalizarTelefone(valor) {
        return String(valor || '').replace(/\D/g, '');
    }

    // ─── Estados de Botão ──────────────────────────────────────
    function definirEstadoBotao(btn, estado, texto) {
        if (!btn) return;
        const estados = {
            loading: { disabled: true, html: `<span class="spinner-sm"></span> ${texto || 'A processar...'}` },
            disabled: { disabled: true, html: btn.dataset.originalText || btn.innerHTML },
            success: { disabled: false, html: `<span class="material-symbols-outlined">check</span> ${texto || 'Concluído'}` },
            error: { disabled: false, html: `<span class="material-symbols-outlined">refresh</span> ${texto || 'Tentar novamente'}` },
            idle: { disabled: false, html: btn.dataset.originalText || btn.innerHTML }
        };
        const cfg = estados[estado] || estados.idle;
        btn.disabled = cfg.disabled;
        btn.innerHTML = cfg.html;
    }

    function salvarTextoOriginal(btn) {
        if (btn && !btn.dataset.originalText) {
            btn.dataset.originalText = btn.innerHTML;
        }
    }

    // ─── Validação de Formulários ──────────────────────────────
    const REGRAS_VALIDACAO = {
        required: { test: v => v.trim().length > 0, msg: 'Este campo é obrigatório.' },
        email: { test: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()), msg: 'Introduza um email válido.' },
        telefone: { test: v => /^8[0-9]{7}$/.test(normalizarTelefone(v)), msg: 'Introduza um telefone válido (84XXXXXXX).' },
        numero: { test: v => !isNaN(parseFloat(v)) && isFinite(v), msg: 'Introduza um número válido.' },
        positivo: { test: v => parseFloat(v) > 0, msg: 'O valor deve ser superior a zero.' },
        minLength: length => ({ test: v => v.trim().length >= length, msg: `Mínimo ${length} caracteres.` }),
        maxLength: length => ({ test: v => v.trim().length <= length, msg: `Máximo ${length} caracteres.` }),
        min: min => ({ test: v => parseFloat(v) >= min, msg: `Valor mínimo: ${min}.` }),
        max: max => ({ test: v => parseFloat(v) <= max, msg: `Valor máximo: ${max}.` }),
        pattern: regex => ({ test: v => regex.test(v.trim()), msg: 'Formato inválido.' }),
        sameAs: (id, label) => ({ test: v => v.trim() === (document.getElementById(id)?.value || '').trim(), msg: `Deve ser igual a ${label}.` })
    };

    function validarCampo(input, regras) {
        const wrapper = input.closest('.lk-campo') || input;
        const erroEl = wrapper.querySelector('.lk-campo-erro');
        let valido = true;
        let primeiraMsg = '';

        if (!regras || regras.length === 0) {
            if (erroEl) { erroEl.textContent = ''; erroEl.classList.remove('visivel'); }
            wrapper.classList.remove('lk-campo-invalido', 'lk-campo-valido');
            return true;
        }

        for (const regra of regras) {
            if (typeof regra === 'function') {
                const r = regra();
                if (!r.test(input.value)) { valido = false; primeiraMsg = r.msg; break; }
            } else if (typeof regra === 'string') {
                const r = REGRAS_VALIDACAO[regra];
                if (r && !r.test(input.value)) { valido = false; primeiraMsg = r.msg; break; }
            } else if (regra.test && regra.msg) {
                if (!regra.test(input.value)) { valido = false; primeiraMsg = regra.msg; break; }
            }
        }

        wrapper.classList.toggle('lk-campo-invalido', !valido && input.value.length > 0);
        wrapper.classList.toggle('lk-campo-valido', valido && input.value.length > 0);

        if (erroEl) {
            erroEl.textContent = !valido ? primeiraMsg : '';
            erroEl.classList.toggle('visivel', !valido && input.value.length > 0);
        }

        return valido;
    }

    function validarFormulario(form, campos) {
        let valido = true;
        campos.forEach(c => {
            const input = typeof c === 'string' ? form.querySelector(`[name="${c}"]`) || document.getElementById(c) : c.input;
            if (input && c.regras) {
                if (!validarCampo(input, c.regras)) valido = false;
            }
        });
        return valido;
    }

    function configurarValidacao(input, regras) {
        input.addEventListener('blur', () => validarCampo(input, regras));
        input.addEventListener('input', debounce(() => {
            if (input.value.length > 0 || input.dataset.touched) {
                validarCampo(input, regras);
            }
        }, 300));
        input.addEventListener('focus', () => { input.dataset.touched = 'true'; });
    }

    function criarCampoHTML(tipo, config) {
        const obrigatorio = config.obrigatorio ? '<span class="lk-campo-required">*</span>' : '';
        return `
            <div class="lk-campo">
                <label class="lk-campo-label">${config.label || ''} ${obrigatorio}</label>
                ${tipo === 'textarea'
                    ? `<textarea class="lk-campo-input" id="${config.id}" name="${config.id}" placeholder="${config.placeholder || ''}" ${config.rows ? `rows="${config.rows}"` : ''}>${config.value || ''}</textarea>`
                    : tipo === 'select'
                    ? `<select class="lk-campo-input" id="${config.id}" name="${config.id}">${(config.options || []).map(o => `<option value="${o.value}" ${o.value === (config.value || '') ? 'selected' : ''}>${o.label}</option>`).join('')}</select>`
                    : `<input class="lk-campo-input" type="${tipo || 'text'}" id="${config.id}" name="${config.id}" placeholder="${config.placeholder || ''}" value="${config.value || ''}" ${config.maxlength ? `maxlength="${config.maxlength}"` : ''}>`
                }
                <span class="lk-campo-erro"></span>
                ${config.help ? `<span class="lk-campo-help">${config.help}</span>` : ''}
            </div>`;
    }

    // ─── Modal System ──────────────────────────────────────────
    function criarModal(config) {
        const existing = document.getElementById(config.id || 'lkModalDynamic');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.className = 'lk-modal-overlay';
        overlay.id = config.id || 'lkModalDynamic';

        const tamanho = config.tamanho || 'medium';
        const podeFecharExterno = config.podeFecharExterno !== false;

        overlay.innerHTML = `
            <div class="lk-modal ${tamanho}" role="dialog" aria-modal="true" aria-labelledby="${config.id || 'lkModalDynamic'}Title">
                <div class="lk-modal-header">
                    <h3 class="lk-modal-title" id="${config.id || 'lkModalDynamic'}Title">${config.titulo || ''}</h3>
                    <button class="lk-modal-close" aria-label="Fechar" data-modal-close>
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div class="lk-modal-body">${config.conteudo || ''}</div>
                ${config.rodape !== undefined ? `<div class="lk-modal-footer">${config.rodape}</div>` : ''}
            </div>
        `;

        document.body.appendChild(overlay);

        const modal = overlay.querySelector('.lk-modal');
        let dirty = false;

        function marcarSujo() { dirty = true; }
        function marcarLimpo() { dirty = false; }

        function fechar() {
            if (dirty && podeFecharExterno) {
                confirmarAcao('Alterações não guardadas', 'Tem alterações que ainda não foram guardadas. Deseja descartá-las?', () => {
                    overlay.classList.remove('ativo');
                    setTimeout(() => overlay.remove(), 300);
                });
                return;
            }
            overlay.classList.remove('ativo');
            setTimeout(() => overlay.remove(), 300);
        }

        overlay.querySelectorAll('[data-modal-close]').forEach(el => el.addEventListener('click', fechar));

        document.addEventListener('keydown', function fecharEsc(e) {
            if (e.key === 'Escape' && document.body.contains(overlay) && overlay.classList.contains('ativo')) {
                fechar();
            }
        });

        if (podeFecharExterno) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) fechar();
            });
        }

        requestAnimationFrame(() => overlay.classList.add('ativo'));

        return {
            overlay,
            modal,
            fechar,
            marcarSujo,
            marcarLimpo,
            elemento: overlay
        };
    }

    // ─── Confirmação Aprimorada ────────────────────────────────
    function confirmarAcao(titulo, texto, onConfirm, opcoes) {
        opcoes = opcoes || {};
        const m = criarModal({
            id: 'modalConfirmacaoGlobal',
            titulo: titulo,
            tamanho: 'small',
            podeFecharExterno: false,
            conteudo: `<p class="lk-confirm-text">${escaparHtml(texto)}</p>`,
            rodape: `
                <button class="btn btn-outline" data-modal-close id="btnCancelarAcao">${opcoes.cancelarTexto || 'Cancelar'}</button>
                <button class="btn ${opcoes.perigo !== false ? 'btn-perigo' : 'btn-primario'}" id="btnConfirmarAcao">${opcoes.confirmarTexto || opcoes.perigo !== false ? 'Eliminar' : 'Confirmar'}</button>
            `
        });

        const confirmBtn = m.modal.querySelector('#btnConfirmarAcao');
        const cancelBtns = m.modal.querySelectorAll('[data-modal-close]');

        function confirmHandler() {
            m.fechar();
            if (typeof onConfirm === 'function') onConfirm();
        }

        confirmBtn.addEventListener('click', confirmHandler);
    }

    // ─── Toast Moderno ─────────────────────────────────────────
    function notificar(mensagem, tipo = 'info') {
        const container = document.getElementById('toastContainer') || (() => {
            const c = document.createElement('div');
            c.id = 'toastContainer';
            c.className = 'lk-toast-container';
            document.body.appendChild(c);
            return c;
        })();

        const t = document.createElement('div');
        t.className = `lk-toast lk-toast-${tipo}`;

        const icons = { sucesso: 'check_circle', erro: 'cancel', aviso: 'warning', info: 'info' };
        const ic = icons[tipo] || 'info';

        t.innerHTML = `
            <span class="material-symbols-outlined lk-toast-icon">${ic}</span>
            <span class="lk-toast-text">${escaparHtml(mensagem)}</span>
            <button class="lk-toast-close" onclick="this.parentElement.remove()"><span class="material-symbols-outlined">close</span></button>
        `;

        container.appendChild(t);
        requestAnimationFrame(() => t.classList.add('lk-toast-show'));

        setTimeout(() => {
            t.classList.remove('lk-toast-show');
            setTimeout(() => t.remove(), 300);
        }, 4000);
    }

    // ─── Spinner ──────────────────────────────────────────────
    function mostrarSpinner(container) {
        if (!container) return;
        container.innerHTML = '<div class="lk-spinner-container"><div class="lk-spinner"></div></div>';
    }

    // ─── Tabela DataTable ──────────────────────────────────────
    function criarTabela(config) {
        const {
            id = 'lkTabela',
            dados = [],
            colunas = [],
            acoes = [],
            pagina = 1,
            porPagina = 10,
            buscaPlaceholder = 'Pesquisar...',
            vazio = 'Nenhum registo encontrado.',
            onSelecao = null,
            onSort = null
        } = config;

        let estado = {
            dados,
            filtrados: [...dados],
            pagina,
            porPagina,
            ordenarPor: null,
            ordenarDir: 'asc',
            selecionados: new Set(),
            termoBusca: ''
        };

        const container = document.getElementById(id) || (() => {
            const c = document.createElement('div');
            c.id = id;
            return c;
        })();

        function pesquisar(termo) {
            estado.termoBusca = termo.toLowerCase().trim();
            if (!estado.termoBusca) {
                estado.filtrados = [...estado.dados];
            } else {
                estado.filtrados = estado.dados.filter(item =>
                    colunas.some(col => {
                        const val = col.accessor ? item[col.accessor] : '';
                        return String(val).toLowerCase().includes(estado.termoBusca);
                    })
                );
            }
            estado.pagina = 1;
            renderizar();
        }

        function ordenar(colKey) {
            if (estado.ordenarPor === colKey) {
                estado.ordenarDir = estado.ordenarDir === 'asc' ? 'desc' : 'asc';
            } else {
                estado.ordenarPor = colKey;
                estado.ordenarDir = 'asc';
            }
            estado.filtrados.sort((a, b) => {
                const va = a[colKey], vb = b[colKey];
                if (va == null) return 1;
                if (vb == null) return -1;
                const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb));
                return estado.ordenarDir === 'asc' ? cmp : -cmp;
            });
            renderizar();
            if (onSort) onSort(colKey, estado.ordenarDir);
        }

        function toggleSelecao(id) {
            if (estado.selecionados.has(id)) estado.selecionados.delete(id);
            else estado.selecionados.add(id);
            renderizar();
            if (onSelecao) onSelecao([...estado.selecionados]);
        }

        function toggleTodas() {
            const paginados = getPaginaAtual();
            const todasSelecionadas = paginados.every(item => estado.selecionados.has(item.id));
            paginados.forEach(item => {
                if (todasSelecionadas) estado.selecionados.delete(item.id);
                else estado.selecionados.add(item.id);
            });
            renderizar();
            if (onSelecao) onSelecao([...estado.selecionados]);
        }

        function getPaginaAtual() {
            const start = (estado.pagina - 1) * estado.porPagina;
            return estado.filtrados.slice(start, start + estado.porPagina);
        }

        function totalPaginas() {
            return Math.max(1, Math.ceil(estado.filtrados.length / estado.porPagina));
        }

        function mudarPagina(nova) {
            if (nova < 1 || nova > totalPaginas()) return;
            estado.pagina = nova;
            renderizar();
        }

        function atualizarDados(novosDados) {
            estado.dados = novosDados;
            estado.selecionados = new Set();
            pesquisar(estado.termoBusca);
        }

        function renderizar() {
            const paginados = getPaginaAtual();
            const total = estado.filtrados.length;
            const tp = totalPaginas();

            const ordenarIcon = (key) => {
                if (estado.ordenarPor !== key) return '';
                return estado.ordenarDir === 'asc'
                    ? ' <span class="material-symbols-outlined">arrow_upward</span>'
                    : ' <span class="material-symbols-outlined">arrow_downward</span>';
            };

            const headerHtml = `<thead>
                <tr>
                    <th class="lk-td-check"><input type="checkbox" onchange="document.querySelector('#${id} table .lk-td-check input').click()" ${paginados.every(i => estado.selecionados.has(i.id)) && paginados.length > 0 ? 'checked' : ''}></th>
                    ${colunas.map(col => `<th onclick="document.querySelector('#${id}')._ordenar('${col.accessor}')" class="lk-th-sortable">${col.header}${ordenarIcon(col.accessor)}</th>`).join('')}
                    ${acoes.length > 0 ? '<th class="lk-td-actions">Acções</th>' : ''}
                </tr>
            </thead>`;

            const bodyHtml = paginados.length === 0
                ? `<tbody><tr><td colspan="${colunas.length + 2}" class="lk-td-empty">${vazio}</td></tr></tbody>`
                : `<tbody>${paginados.map(item => `
                    <tr class="${estado.selecionados.has(item.id) ? 'lk-tr-selected' : ''}">
                        <td class="lk-td-check"><input type="checkbox" ${estado.selecionados.has(item.id) ? 'checked' : ''} onchange="document.querySelector('#${id}')._toggleSelecao(${item.id})"></td>
                        ${colunas.map(col => `<td>${col.render ? col.render(item[col.accessor], item) : escaparHtml(String(item[col.accessor] ?? ''))}</td>`).join('')}
                        ${acoes.length > 0 ? `<td class="lk-td-actions">${acoes.map(a => `<button class="lk-table-action" onclick="document.querySelector('#${id}')._acao('${a.key}', ${item.id})" title="${a.label}"><span class="material-symbols-outlined">${a.icon}</span></button>`).join('')}</td>` : ''}
                    </tr>
                `).join('')}</tbody>`;

            const paginacaoHtml = total > estado.porPagina ? `
                <div class="lk-table-footer">
                    <span class="lk-table-info">${(estado.pagina - 1) * estado.porPagina + 1}-${Math.min(estado.pagina * estado.porPagina, total)} de ${total}</span>
                    <div class="lk-table-pages">
                        <button class="lk-page-btn" onclick="document.querySelector('#${id}')._pagina(${estado.pagina - 1})" ${estado.pagina <= 1 ? 'disabled' : ''}><span class="material-symbols-outlined">chevron_left</span></button>
                        ${Array.from({ length: Math.min(tp, 5) }, (_, i) => {
                            const inicio = Math.max(1, Math.min(estado.pagina - 2, tp - 4));
                            const p = inicio + i;
                            return p <= tp ? `<button class="lk-page-btn ${p === estado.pagina ? 'ativo' : ''}" onclick="document.querySelector('#${id}')._pagina(${p})">${p}</button>` : '';
                        }).filter(Boolean).join('')}
                        <button class="lk-page-btn" onclick="document.querySelector('#${id}')._pagina(${estado.pagina + 1})" ${estado.pagina >= tp ? 'disabled' : ''}><span class="material-symbols-outlined">chevron_right</span></button>
                    </div>
                    <select class="lk-page-size" onchange="document.querySelector('#${id}')._porPagina(parseInt(this.value))">
                        <option value="5" ${estado.porPagina === 5 ? 'selected' : ''}>5</option>
                        <option value="10" ${estado.porPagina === 10 ? 'selected' : ''}>10</option>
                        <option value="25" ${estado.porPagina === 25 ? 'selected' : ''}>25</option>
                        <option value="50" ${estado.porPagina === 50 ? 'selected' : ''}>50</option>
                    </select>
                </div>
            ` : '';

            container.innerHTML = `
                <div class="lk-table-wrapper">
                    <div class="lk-table-toolbar">
                        <div class="lk-table-search">
                            <span class="material-symbols-outlined">search</span>
                            <input type="text" placeholder="${buscaPlaceholder}" value="${estado.termoBusca}" oninput="document.querySelector('#${id}')._pesquisar(this.value)">
                        </div>
                        ${config.botoesToolbar || ''}
                    </div>
                    <div class="lk-table-scroll">
                        <table class="lk-table">${headerHtml}${bodyHtml}</table>
                    </div>
                    ${paginacaoHtml}
                </div>
            `;

            // Mobile: card view for small screens
            if (window.innerWidth <= 640 && paginados.length > 0) {
                renderizarMobileCards(paginados, total);
            }
        }

        function renderizarMobileCards(paginados, total) {
            const table = container.querySelector('.lk-table-scroll');
            if (!table) return;
            const cardsHtml = paginados.map(item => {
                const selecionado = estado.selecionados.has(item.id);
                return `
                    <div class="lk-table-card ${selecionado ? 'selecionado' : ''}">
                        <div class="lk-table-card-header">
                            <input type="checkbox" ${selecionado ? 'checked' : ''} onchange="document.querySelector('#${id}')._toggleSelecao(${item.id})">
                            <span class="lk-table-card-title">${colunas[0]?.render ? colunas[0].render(item[colunas[0].accessor], item) : escaparHtml(String(item[colunas[0]?.accessor] || ''))}</span>
                        </div>
                        <div class="lk-table-card-body">
                            ${colunas.slice(1).map(col => `
                                <div class="lk-table-card-row">
                                    <span class="lk-table-card-label">${col.header}</span>
                                    <span class="lk-table-card-value">${col.render ? col.render(item[col.accessor], item) : escaparHtml(String(item[col.accessor] ?? ''))}</span>
                                </div>
                            `).join('')}
                        </div>
                        ${acoes.length > 0 ? `<div class="lk-table-card-actions">${acoes.map(a => `<button class="lk-table-action" onclick="document.querySelector('#${id}')._acao('${a.key}', ${item.id})" title="${a.label}"><span class="material-symbols-outlined">${a.icon}</span></button>`).join('')}</div>` : ''}
                    </div>
                `;
            }).join('');
            if (cardsHtml) {
                table.innerHTML = `<div class="lk-table-cards">${cardsHtml}</div>`;
            }
        }

        container._pesquisar = pesquisar;
        container._ordenar = ordenar;
        container._toggleSelecao = toggleSelecao;
        container._pagina = mudarPagina;
        container._porPagina = (n) => { estado.porPagina = n; estado.pagina = 1; renderizar(); };
        container._acao = (key, id) => {
            const acao = acoes.find(a => a.key === key);
            if (acao && acao.onClick) acao.onClick(id, estado.dados.find(d => d.id === id));
        };
        container.atualizarDados = atualizarDados;
        container.renderizar = renderizar;
        container.obterSelecionados = () => [...estado.selecionados];

        renderizar();
        return container;
    }

    // ─── Skeleton Produtos ─────────────────────────────────────
    function gerarSkeletonProdutos(q = 6) {
        return Array(q).fill('').map(() =>
            '<div class="skeleton-card"><div class="skeleton skeleton-img"></div><div class="skeleton-info"><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text-short"></div><div class="skeleton skeleton-text-price"></div></div></div>'
        ).join('');
    }

    // ─── Botão helpers ─────────────────────────────────────────
    function desativarBotao(form) {
        const b = form?.querySelector?.('button[type="submit"], button');
        if (b) { salvarTextoOriginal(b); definirEstadoBotao(b, 'loading'); }
    }

    function ativarBotao(form) {
        const b = form?.querySelector?.('button[type="submit"], button');
        if (b) definirEstadoBotao(b, 'idle');
    }

    // ─── Export ────────────────────────────────────────────────
    window.linkaUtils = {
        apiOrigin,
        imagemProdutoPadrao,
        escaparHtml,
        formatarMoeda,
        formatarDinheiro,
        formatarHora,
        formatarData,
        formatarDataCompleta,
        formatarDataRelativa,
        resolverUrlImagem,
        cssUrlImagem,
        debounce,
        normalizarTelefone,
        desativarBotao,
        ativarBotao,
        gerarSkeletonProdutos,
        notificar,
        confirmarAcao,
        criarModal,
        validarCampo,
        validarFormulario,
        configurarValidacao,
        criarCampoHTML,
        definirEstadoBotao,
        salvarTextoOriginal,
        criarTabela
    };

    // Aliases globais
    window.notificar = window.notificar || notificar;
    window.confirmarAcao = window.confirmarAcao || confirmarAcao;
    window.escaparHtml = window.escaparHtml || escaparHtml;
    window.formatarMoeda = window.formatarMoeda || formatarMoeda;
    window.formatarDinheiro = window.formatarDinheiro || formatarDinheiro;
    window.formatarData = window.formatarData || formatarData;
    window.formatarHora = window.formatarHora || formatarHora;
    window.resolverUrlImagem = window.resolverUrlImagem || resolverUrlImagem;
    window.cssUrlImagem = window.cssUrlImagem || cssUrlImagem;
    window.imagemProdutoPadrao = window.imagemProdutoPadrao || imagemProdutoPadrao;
    window.formatarDataRelativa = window.formatarDataRelativa || formatarDataRelativa;
    window.gerarSkeletonProdutos = window.gerarSkeletonProdutos || gerarSkeletonProdutos;
    window.definirEstadoBotao = definirEstadoBotao;
    window.salvarTextoOriginal = salvarTextoOriginal;
    window.criarModal = criarModal;
    window.validarCampo = validarCampo;
    window.validarFormulario = validarFormulario;
    window.configurarValidacao = configurarValidacao;
    window.criarCampoHTML = criarCampoHTML;
    window.criarTabela = criarTabela;
    window.ativarBotao = window.ativarBotao || ativarBotao;
    window.desativarBotao = window.desativarBotao || desativarBotao;
    window.normalizarTelefone = window.normalizarTelefone || normalizarTelefone;
})();
