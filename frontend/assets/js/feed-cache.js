/* ============================================================
   LINKA — Feed Cache Module
   Cache local para feed de produtos (localStorage)
   ============================================================ */

(function () {
    'use strict';

    const CACHE_KEY = 'linka_feed_cache';
    const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos
    const MAX_CACHE_ITEMS = 100;

    /**
     * Guardar produtos no cache local
     */
    function guardarFeed(chave, produtos) {
        try {
            const cache = obterCacheRaw();
            cache[chave] = {
                dados: produtos.slice(0, MAX_CACHE_ITEMS),
                timestamp: Date.now(),
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        } catch (e) {
            // localStorage cheio ou indisponível — silencioso
        }
    }

    /**
     * Obter produtos do cache local
     */
    function obterFeed(chave) {
        try {
            const cache = obterCacheRaw();
            const entrada = cache[chave];
            if (!entrada) return null;

            // Verificar TTL
            if (Date.now() - entrada.timestamp > CACHE_TTL_MS) {
                delete cache[chave];
                localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
                return null;
            }

            return entrada.dados;
        } catch (e) {
            return null;
        }
    }

    /**
     * Adicionar novos produtos ao topo do cache
     */
    function prependFeed(chave, novosProdutos) {
        try {
            const cache = obterCacheRaw();
            const existente = cache[chave]?.dados || [];
            const idsExistentes = new Set(existentes.map(p => p.id));
            const unicos = novosProdutos.filter(p => !idsExistentes.has(p.id));

            cache[chave] = {
                dados: [...unicos, ...existentes].slice(0, MAX_CACHE_ITEMS),
                timestamp: Date.now(),
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        } catch (e) {
            // silencioso
        }
    }

    /**
     * Adicionar produtos ao fim do cache (scroll infinito)
     */
    function appendFeed(chave, novosProdutos) {
        try {
            const cache = obterCacheRaw();
            const existente = cache[chave]?.dados || [];
            const idsExistentes = new Set(existentes.map(p => p.id));
            const unicos = novosProdutos.filter(p => !idsExistentes.has(p.id));

            cache[chave] = {
                dados: [...existentes, ...unicos].slice(0, MAX_CACHE_ITEMS),
                timestamp: Date.now(),
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        } catch (e) {
            // silencioso
        }
    }

    /**
     * Invalidar uma chave de cache
     */
    function invalidarFeed(chave) {
        try {
            const cache = obterCacheRaw();
            delete cache[chave];
            localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        } catch (e) {
            // silencioso
        }
    }

    /**
     * Limpar todo o cache
     */
    function limparCache() {
        try {
            localStorage.removeItem(CACHE_KEY);
        } catch (e) {
            // silencioso
        }
    }

    /**
     * Obter raw do cache
     */
    function obterCacheRaw() {
        try {
            const raw = localStorage.getItem(CACHE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }

    /**
     * Guardar posição de scroll
     */
    function guardarScrollPos(chave, pos) {
        try {
            const key = 'linka_scroll_positions';
            const raw = localStorage.getItem(key);
            const posicoes = raw ? JSON.parse(raw) : {};
            posicoes[chave] = pos;
            localStorage.setItem(key, JSON.stringify(posicoes));
        } catch (e) {
            // silencioso
        }
    }

    /**
     * Obter posição de scroll
     */
    function obterScrollPos(chave) {
        try {
            const key = 'linka_scroll_positions';
            const raw = localStorage.getItem(key);
            const posicoes = raw ? JSON.parse(raw) : {};
            return posicoes[chave] || 0;
        } catch (e) {
            return 0;
        }
    }

    // Exportar globalmente
    window.linkaFeedCache = {
        guardar: guardarFeed,
        obter: obterFeed,
        prepend: prependFeed,
        append: appendFeed,
        invalidar: invalidarFeed,
        limpar: limparCache,
        guardarScrollPos,
        obterScrollPos,
    };
})();
