/* ============================================================
   LINKA — Prefetch Module (v1)
   Pré-carregamento inteligente de conteúdo baseado na velocidade
   da rede para navegação instantânea no feed, reels e explore.
   ============================================================ */

(function () {
    'use strict';

    const CACHE_MAX = 50;
    const TTL = 5 * 60 * 1000;
    const cache = new Map();

    function obterVelocidadeRede() {
        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (!conn) return { tipo: 'desconhecido', downlink: 10, efeito: 'rapido' };

        const downlink = conn.downlink || 10;
        const tipo = conn.effectiveType || '4g';

        let efeito = 'rapido';
        if (downlink < 1 || tipo === 'slow-2g' || tipo === '2g') efeito = 'lento';
        else if (downlink < 5 || tipo === '3g') efeito = 'regular';

        return { tipo, downlink, efeito };
    }

    function limparCacheExpirado() {
        const agora = Date.now();
        for (const [url, entry] of cache) {
            if (agora - entry.timestamp > TTL) cache.delete(url);
        }
        while (cache.size > CACHE_MAX) {
            const primeira = cache.keys().next().value;
            cache.delete(primeira);
        }
    }

    function prefetchImagens(urls) {
        urls.forEach(url => {
            if (!url || cache.has(url)) return;
            const img = new Image();
            img.src = url;
            cache.set(url, { timestamp: Date.now() });
        });
        limparCacheExpirado();
    }

    function extrairUrlImagem(produto) {
        if (!produto) return null;
        const imagens = produto.imagens;
        let caminho = null;
        if (imagens && imagens.length > 0) {
            caminho = typeof imagens[0] === 'string' ? imagens[0] : imagens[0].caminho;
        } else if (produto.imagem_url) {
            caminho = produto.imagem_url;
        }
        if (!caminho) return null;
        if (typeof window.linkaUtils !== 'undefined' && window.linkaUtils.resolverUrlImagem) {
            return window.linkaUtils.resolverUrlImagem(caminho);
        }
        if (typeof window.resolverUrlImagem === 'function') return window.resolverUrlImagem(caminho);
        return caminho;
    }

    function prefetchProximos(produtos, qtd) {
        if (!produtos || produtos.length === 0) return;
        const rede = obterVelocidadeRede();
        if (rede.efeito === 'lento') return;

        const quantidade = rede.efeito === 'rapido' ? (qtd || 3) : 1;
        const proximos = produtos.slice(0, quantidade);
        const urls = proximos.map(extrairUrlImagem).filter(u => u && !u.startsWith('data:'));
        prefetchImagens(urls);
    }

    function prefetchUrl(url) {
        if (!url || cache.has(url)) return;
        fetch(url, { priority: 'low', credentials: 'same-origin' })
            .then(() => cache.set(url, { timestamp: Date.now() }))
            .catch(() => {});
    }

    function prefetchCursor(cursorUrl) {
        if (!cursorUrl) return;
        prefetchUrl(cursorUrl);
    }

    window.linkaPrefetch = {
        obterVelocidadeRede,
        prefetchProximos,
        prefetchImagens,
        prefetchUrl,
        prefetchCursor,
        extrairUrlImagem
    };
})();
