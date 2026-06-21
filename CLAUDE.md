# LINKA Marketplace — Estado do Projecto

## 📅 Última Atualização: 2026-06-20

## 🚀 Etapa Actual: FUNCIONALIDADES DE INTERAÇÃO ENTRE CLIENTES — CONCLUÍDA

### ✅ Concluído

- **Etapa 1**: Base de Dados completa.
- **Etapa 2**: Núcleo da API completo (Auth, Users, Products, Categories, Favorites, Orders, Chat).
- **Etapa 3**: Segurança (Rate Limiting, JWT Refresh, RBAC).
- **Etapa 4**: WebSocket / Tempo Real (Handshake autenticado, Chat live, Notificações instantâneas).
- **Arquitetura**: Refatoração 100% concluída para padrão `asyncHandler`.
- **Media**: Configurado módulo central de Uploads (Multer).
- **Frontend SPA**: Login, Registo, Feed, Explorar, Chat, Viewer, Perfil.
- **Fase 1 — Perfil de Interesses + Recomendação Personalizada**: CONCLUÍDA
- **Fase 2 — Trust Score + Ranking de Vendedores**: CONCLUÍDA
- **Fase 3 — Analytics para Vendedores**: CONCLUÍDA
- **Fase 4 — Anti-Spam Básico + Detecção de Padrões**: CONCLUÍDA
- **Fase 5 — Tendências + Conteúdo em Alta**: CONCLUÍDA
- **Fase 6 — Ranking de Vendedores (Leaderboard)**: CONCLUÍDA
- **Fase 3 — Analytics para Vendedores**: CONCLUÍDA
- **Fase 4 — Anti-Spam + Detecção de Padrões**: CONCLUÍDA
- **Fase 5 — Tendências + Conteúdo em Alta**: CONCLUÍDA
- **Fase 7 — Sistema de Anúncios Patrocinados**: CONCLUÍDA

### ✅ UI/UX — Concluído (2026-06-16)

- **Explore**: Bento grid 3-coluna, TopAppBar fixo, search bar, category chips, tune icon.
- **Chat**: Secção standalone WhatsApp-style, conversa list, search toggle, filter, FAB.
- **Feed/Reels**: Full-screen TikTok-style vertical scroll, snap, right action bar (like/comment/share/more), follow button, music ticker.
- **Viewer**: Slide-based product viewer com share, comment, follow, save via API.
- **Perfil**: Sub-páginas reais — Segurança, Notificações (toggles interactivos), Ajuda/FAQ.
- **Product Modal**: Share button com Web Share API + clipboard fallback.
- **Explore Chips**: "Vídeos" chip mapeado para API filter `videos`.
- **Partilhar**: `window.partilharProduto()` — Web Share API + clipboard fallback.
- **Seguir**: `window.seguirVendedor()` — toggle interno com feedback visual.
- **Bottom Nav**: FAB center button, tab routing via `switchTabCliente`.
- **Mobile**: dvh, safe-area-inset, scroll-snap-stop: always, smaller touch targets.

### 🧠 Funcionalidades Invisíveis — Fase 1 (2026-06-17)

#### Base de Dados
- `utilizador_interesses` — Pesos de interesse por categoria para cada utilizador
- `eventos_utilizador` — Registo granular de todas as acções (view, like, favorite, comment, share, purchase)

#### Backend
- `evento.model.js` — CRUD de eventos + agregação de categorias interagidas
- `utilizador-interesse.model.js` — Gestão de interesses com decair de pesos
- `evento.service.js` — Lógica de actualização automática de interesses
- `evento.controller.js` — Endpoints: `POST /api/eventos`, `GET /api/eventos/interesses`, `GET /api/eventos/analytics`
- `evento.routes.js` — Rotas do módulo de eventos
- `produto.model.js` — Novo modo `personalizado` no `feedComCursor()` com boost +15 para categorias de interesse
- `produto.controller.js` — Feed auto-detecta modo personalizado se utilizador tem interesses

#### Frontend
- `api.js` — Módulo `eventos` com `registar()`, `registarLote()`, `interesses()`, `analytics()`
- `app-cliente.js` — Registo automático de eventos: view (2s), like, unlike, favorite, unfavorite, comment, share, purchase
- Feed usa modo `personalizado` por defecto quando utilizador está logado

### 🛡️ Funcionalidades Invisíveis — Fase 2 (2026-06-17)

#### Base de Dados
- `confianca_conta` — Score de confiança por utilizador (0-100) com factores JSON
- `vendedor_ranking` — Ranking semanal dos vendedores com métricas detalhadas

#### Backend
- `confianca.model.js` — CRUD de scores de confiança
- `confianca.service.js` — Cálculo automático baseado em: idade conta, verificação email, vendas, avaliações, denúncias, produtos activos
- `confianca.controller.js` — Endpoints: `GET /api/confianca/perfil`, `GET /api/confianca/utilizador/:id`, `GET /api/confianca/top`
- `confianca.routes.js` — Rotas do módulo de confiança
- `vendedor-ranking.model.js` — CRUD de rankings
- `vendedor-ranking.service.js` — Score composto: 30% avaliações, 25% vendas, 20% resposta, 15% entrega, 10% visualizações
- `vendedor-ranking.controller.js` — Endpoints: `GET /api/ranking/vendedores`, `GET /api/ranking/posicao`, `GET /api/ranking/evolucao`
- `vendedor-ranking.routes.js` — Rotas do módulo de ranking
- `feed.js` — Novo peso `confianca` no scoring do feed
- `produto.model.js` — Feed inclui score de confiança do vendedor no ranking (+5 para score 80+, +3 para 60+)

#### Frontend
- `api.js` — Módulos `confianca` e `ranking` com todas as operações
- `app-cliente.js` — Badge de confiança no detalhe do produto e nos reels (verified/trusted)
- `estilo.css` — Estilos para badges `.verified-badge` e `.trusted-badge`

### 💬 Chat — Refactor WhatsApp-Style (2026-06-20)

#### Bugs Corrigidos
- **CRÍTICO**: `formatarDataRelativa` não importada em `app-cliente.js` → ReferenceError impedia renderização do chat
- **CSS**: Bottom nav ficava sobre o input do chat (z-index 650 > 600) → `body.chat-active .lk-bottom-nav` agora faz `display:none`
- **Socket**: `voltarParaListaChat()` não emitia `chat:sair` → agora emite
- **Código morto**: `verificarPosicaoScroll()` removida (duplicava `onChatScroll`)

#### Funcionalidades
- **Layout**: Flex vertical, header fixo, scroll area, input fixo com safe-area-inset
- **Keyboard handler**: `visualViewport.height` com debounce via `requestAnimationFrame`
- **Optimistic update**: Mensagem aparece imediatamente, input limpo, foco mantido, teclado aberto
- **Lazy loading**: 30 mensagens/página, scroll ao topo carrega mais com preservação de scroll
- **Badge**: "Novas mensagens" quando utilizador não está no fundo
- **Date separators**: Mensagens agrupadas por dia (Hoje, Ontem, data)
- **Typing indicator**: Bolha animada quando对面 está a escrever

### 🔐 Multi-device Sessions (2026-06-20)

#### Base de Dados
- `user_sessions` — Registo de sessões activas por utilizador (multi-device)

#### Backend
- `sessao.model.js` — CRUD: criar, procurarPorTokenHash, listarPorUtilizador, revogar, revogarTodasExceto
- `sessao.controller.js` — Endpoints: `GET /api/sessoes`, `DELETE /api/sessoes/:id`, `DELETE /api/sessoes`
- `sessao.routes.js` — Rotas protegidas por `verificarAuth`
- `token.js` — `gerarRefreshToken(id, sessaoId)` com claim `sid` no payload
- `autenticacao.service.js` — Login cria sessão com hash SHA-256 + parse device name; Refresh valida sessão; Logout revoga sessão
- `autenticacao.controller.js` — Passa `req` ao service para IP/UA extraction
- `autenticacao.routes.js` — Nova rota de sessões

#### Frontend
- `api.js` — Módulo `sessoes`: `listar()`, `revogar(id)`, `revogarTodas()`
- `app-cliente.js` — Tela "Dispositivos Conectados" com cards, estado actual, terminar individual/global
- Perfil > Segurança > Dispositivos → navega para tela real

### 💬 Funcionalidades de Interação entre Clientes (2026-06-20)

#### Base de Dados
- `seguidores` — Relação utilizador → vendedor (seguir/deixar de seguir)
- `comentario_likes` — Likes em comentários de produtos
- `comentario_respostas` — Respostas a comentários (threading)
- `recentemente_vistos` — Produtos vistos recentemente (últimos 100 por utilizador)
- `carrinho` — Carrinho de compras multi-item por utilizador
- `preferencias_utilizador` — Configurações de notificações, privacidade, regional

#### Backend (novos módulos)
- `seguidor.model.js` / `seguidor.service.js` / `seguidor.controller.js` / `seguidor.routes.js`
  - `POST /api/seguidores/:id/toggle` — Seguir/deixar de seguir
  - `GET /api/seguidores/:id/verificar` — Verificar se segue
  - `GET /api/seguidores/:id/contar` — Contar seguidores
  - `GET /api/seguidores/seguindo` — Listar seguidores/seguindo
- `comentario-like.model.js` / `comentario-like.service.js` / `comentario-like.controller.js` / `comentario-like.routes.js`
  - `POST /api/comentario-likes/:id/toggle` — Like/deslike
- `comentario-resposta.model.js` / `comentario-resposta.service.js` / `comentario-resposta.controller.js` / `comentario-resposta.routes.js`
  - `POST /api/comentario-respostas/:id` — Criar resposta
  - `GET /api/comentario-respostas/:id/listar` — Listar respostas
- `recentemente-visto.model.js` / `recentemente-visto.service.js` / `recentemente-visto.controller.js` / `recentemente-visto.routes.js`
  - `POST /api/recentemente-vistos/:id` — Registar vista
  - `GET /api/recentemente-vistos` — Listar vistos
- `carrinho.model.js` / `carrinho.service.js` / `carrinho.controller.js` / `carrinho.routes.js`
  - `POST /api/carrinho` — Adicionar item
  - `GET /api/carrinho` — Listar itens
  - `PUT /api/carrinho/:id/quantidade` — Actualizar quantidade
  - `DELETE /api/carrinho/:id` — Remover item
- `preferencia.model.js` / `preferencia.service.js` / `preferencia.controller.js` / `preferencia.routes.js`
  - `GET /api/preferencias` — Obter preferências
  - `PUT /api/preferencias` — Actualizar preferências
- `vendedor-ranking.controller.js` — Novo endpoint `GET /api/ranking/vendedor/:id/perfil` (perfil público)
- `entrega.model.js` / `entrega.service.js` / `entrega.controller.js` / `entrega.routes.js`
  - `POST /api/entregas/:pedidoId` — Criar pedido de entrega
  - `GET /api/entregas` — Listar entregas do utilizador
  - `GET /api/entregas/disponiveis` — Entregas disponíveis (entregadores)
  - `GET /api/entregas/:id` — Detalhes de entrega
  - `PUT /api/entregas/:id/aceitar` — Entregador aceita
  - `PUT /api/entregas/:id/rejeitar` — Entregador rejeita
  - `PUT /api/entregas/:id/a-caminho` — Marcar a caminho
  - `PUT /api/entregas/:id/entregue` — Marcar entregue
  - `PUT /api/entregas/:id/falhou` — Marcar falhada
  - `PUT /api/entregas/:id/cancelar` — Cancelar entrega
  - `PUT /api/entregas/:id/localizacao` — Actualizar GPS
- `utils/geo.js` — Cálculo de distância Haversine

#### Frontend (novos módulos e páginas)
- `api.js` — Módulos: `seguidores`, `comentarioLikes`, `comentarioRespostas`, `recentementeVistos`, `carrinho`, `preferencias`, `entregas`
- `app-cliente.js`:
  - `window.seguirVendedor()` — Agora usa backend API (antes era só local)
  - `window._toggleLikeComentario()` — Agora usa backend API
  - Página "Perfil do Vendedor" — Stats, produtos, botão seguir/mensagem
  - Página "Vistos Recentemente" — Grid com opção de limpar
  - Página "Carrinho de Compras" — Lista, quantidades, resumo, finalizar
  - Página "Preferências" — Toggles de notificações, privacidade, regional
  - `registrarVisualizacao()` — Agora regista também em vistos recentemente
- `estilo.css` — Estilos para: `.lk-seller-*`, `.lk-recent-*`, `.lk-cart-*`, `.lk-pref-*`
- `cliente.html` — Novos items no drawer: Vistos Recente., Carrinho, Preferências

### 🛠️ Em Curso / Pendente

- Testes mobile reais (safe-area, viewport, teclado)

### ⚙️ Como Executar o Projecto

#### 1. Backend
```bash
cd backend && npm install && npm run dev
```

#### 2. Frontend
Abrir `frontend/paginas/cliente.html` no browser (directamente, file://).

#### 3. Migrations (executar uma vez)
```sql
-- Executar no MySQL:
source backend/database/migration-fase1-interesses-eventos.sql
source backend/database/migration-fase2-confianca-ranking.sql
source backend/database/migration-fase3-analytics.sql
source backend/database/migration-fase4-anti-spam.sql
source backend/database/migration-fase5-tendencias.sql
source backend/database/migration-fase7-anuncios.sql
source backend/database/migration-user-sessions.sql
source backend/database/migration-interacao-clientes.sql
```

### 🔜 Próximos Passos

1. Testes mobile reais (safe-area, viewport, teclado).

