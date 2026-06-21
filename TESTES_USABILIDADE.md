# 🧪 TESTES DE USABILIDADE — LINKA MARKETPLACE

**Versão:** 1.0
**Data:** 2026-06-14
**Ambiente:** http://localhost:3005 (Backend) + Frontend via Live Server
**Stack:** Node.js + Express + MySQL + Vanilla JS SPA

---

## 📋 ÍNDICE

1. [Preparação do Ambiente](#1-preparação-do-ambiente)
2. [Contas de Teste](#2-contas-de-teste)
3. [Módulo 1: Autenticação](#3-módulo-1-autenticação)
4. [Módulo 2: Cliente — Explorar e Comprar](#4-módulo-2-cliente)
5. [Módulo 3: Cliente — Perfil e Favoritos](#5-módulo-3-cliente-perfil)
6. [Módulo 4: Cliente — Pedidos e Chat](#6-módulo-4-cliente-pedidos)
7. [Módulo 5: Vendedor — Criar Anúncio](#7-módulo-5-vendedor-anuncio)
8. [Módulo 6: Vendedor — Gestão de Vendas](#8-módulo-6-vendedor-vendas)
9. [Módulo 7: Admin — Gestão de Utilizadores](#9-módulo-7-admin-utilizadores)
10. [Módulo 8: Admin — Denúncias e Sanções](#10-módulo-8-admin-denuncias)
11. [Módulo 9: Edge Cases e Erros](#11-módulo-9-edge-cases)
12. [Módulo 10: Performance e Responsividade](#12-módulo-10-performance)
13. [Módulo 11: Segurança](#13-módulo-11-segurança)
14. [Bug Report](#14-bug-report)
15. [Checklist Final](#15-checklist-final)

---

## 1. PREPARAÇÃO DO AMBIENTE

### 1.1 Pré-requisitos
```
1. MySQL a correr com a base de dados "linka_db"
2. Backend: cd backend && npm run dev (porta 3005)
3. Frontend: Abrir frontend/index.html com Live Server
4. Socket.IO a funcionar (verificar consola)
```

### 1.2 Verificação Inicial
```
Teste 0.1: Abrir http://localhost:3005/api/saude
  → Esperado: { sucesso: true, mensagem: "Linka API esta a funcionar!" }

Teste 0.2: Abrir frontend/index.html
  → Esperado: Splash screen aparece e desaparece, hero section visível

Teste 0.3: Verificar consola do browser (F12)
  → Esperado: [LINKA API] Ligado a: http://127.0.0.1:3005/api (sem erros vermelhos)
```

---

## 2. CONTAS DE TESTE

### 2.1 Criar Contas Necessárias

**Cliente:**
```
Nome: Maria Teste
Email: maria@teste.com
Telefone: 841000001
Senha: teste123
Tipo: cliente
```

**Vendedor:**
```
Nome: Carlos Vendedor
Email: carlos@teste.com
Telefone: 842000002
Senha: teste123
Tipo: vendedor
```

**Admin:**
```
Email: admin@linka.com (ou o email do admin seed)
Senha: (senha do seed)
```

### 2.2 Verificar Seed de Dados
```
Teste 2.1: GET /api/categorias
  → Esperado: Lista de categorias (mínimo 4)

Teste 2.2: GET /api/produtos
  → Esperado: Lista de produtos (mínimo 3)

Teste 2.3: GET /api/planos
  → Esperado: Lista de planos (Free, Básico, Pro, Premium)
```

---

## 3. MÓDULO 1: AUTENTICAÇÃO

### 3.1 Registo

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 1.1 | Clicar "Criar Conta" na landing page | Modal de registo abre | ☐ |
| 1.2 | Submeter formulário vazio | Erros de validação nos campos obrigatórios | ☐ |
| 1.3 | Nome com 2 caracteres ("AB") | Erro: "O nome deve ter pelo menos 3 caracteres" | ☐ |
| 1.4 | Email inválido ("abc") | Erro: "Introduza um email válido" | ☐ |
| 1.5 | Telefone com 5 dígitos ("12345") | Erro: "Telefone inválido (9 a 13 dígitos)" | ☐ |
| 1.6 | Senha com 5 caracteres ("12345") | Erro: "A senha deve ter pelo menos 6 caracteres" | ☐ |
| 1.7 | Email já existente | Erro: "Email já está em uso" (409) | ☐ |
| 1.8 | Telefone já existente | Erro: "Telefone já está em uso" (409) | ☐ |
| 1.9 | Dados válidos | Registo OK, redireciona para página do perfil | ☐ |
| 1.10 | Verificar token guardado | localStorage contém "linka_token" | ☐ |
| 1.11 | Toggle visibilidade senha | Clicar no ícone de olho alterna password/texto | ☐ |
| 1.12 | Medidor de força da senha | Barra actualiza conforme complexidade | ☐ |

### 3.2 Login

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 1.13 | Clicar "Entrar" na landing page | Modal de login abre | ☐ |
| 1.14 | Submeter formulário vazio | Erros de validação | ☐ |
| 1.15 | Email errado | Erro: "Credenciais inválidas" (401) | ☐ |
| 1.16 | Senha errada | Erro: "Credenciais inválidas" (401) | ☐ |
| 1.17 | Login com email correto | Redireciona para página correcta (cliente/vendedor/admin) | ☐ |
| 1.18 | Login com telefone | Funciona correctamente | ☐ |
| 1.19 | Verificar saudação | Header mostra "Olá, [Nome]" | ☐ |
| 1.20 | Verificar avatar | Avatar mostra iniciais do nome | ☐ |

### 3.3 Logout

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 1.21 | Clicar "Sair" no drawer | Modal de confirmação aparece | ☐ |
| 1.22 | Clicar "Cancelar" no modal | Modal fecha, utilizador continua logado | ☐ |
| 1.23 | Clicar "Confirmar" no modal | Token removido, redireciona para index.html | ☐ |
| 1.24 | Verificar localStorage | "linka_token" removido | ☐ |
| 1.25 | Tentar aceder /paginas/cliente.html sem login | Redireciona para index.html | ☐ |

### 3.4 Token Refresh

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 1.26 | Esperar 15 min (ou forçar 401) | Token é renovado automaticamente | ☐ |
| 1.27 | Após refresh, pedido original é reenviado | Dados chegam correctamente | ☐ |
| 1.28 | Refresh token expirado (7 dias) | Sessão termina, redireciona para login | ☐ |

### 3.5 Rate Limiting

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 1.29 | Fazer 10+ logins falhados rapidamente | Erro 429: "Demasiadas tentativas" | ☐ |

---

## 4. MÓDULO 2: CLIENTE — EXPLORAR E COMPRAR

### 4.1 Home / Feed

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 2.1 | Abrir cliente.html logado como cliente | Secção "Início" visível com grid de produtos | ☐ |
| 2.2 | Verificar skeleton loading | Skeletons aparecem enquanto dados carregam | ☐ |
| 2.3 | Verificar produtos carregados | Grid mostra cards com imagem, título, preço, categoria | ☐ |
| 2.4 | Verificar banner destaque | Banner mostra produto em destaque | ☐ |
| 2.5 | Verificar categorias pills | Pills mostram categorias da API | ☐ |
| 2.6 | Clicar numa categoria | Grid filtra produtos por essa categoria | ☐ |
| 2.7 | Clicar em "All Items" | Mostra todos os produtos | ☐ |
| 2.8 | Scroll até ao fim (infinite scroll) | Mais produtos são carregados automaticamente | ☐ |

### 4.2 Pesquisa

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 2.9 | Digitar termo e clicar "Buscar" | Produtos filtrados pelo termo | ☐ |
| 2.10 | Pressionar Enter no campo de pesquisa | Mesmo resultado que clicar "Buscar" | ☐ |
| 2.11 | Pesquisa sem resultados | Mensagem "Nenhum produto encontrado" | ☐ |
| 2.12 | Pesquisa com caracteres especiais | Não causa erro | ☐ |

### 4.3 Detalhes do Produto

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 2.13 | Clicar num produto | Modal de detalhes abre com loading spinner | ☐ |
| 2.14 | Verificar conteúdo | Imagem, título, preço, descrição, vendedor, localização | ☐ |
| 2.15 | Verificar avaliações | Seção de avaliações com média de estrelas | ☐ |
| 2.16 | Clicar miniaturas de imagens | Imagem principal muda | ☐ |
| 2.17 | Clicar no X (fechar) | Modal fecha | ☐ |
| 2.18 | Clicar fora do modal | Modal fecha | ☐ |
| 2.19 | Pressionar ESC | Modal fecha | ☐ |
| 2.20 | Produto é meu próprio anúncio | Botão "Contactar" mostra aviso "Este é o seu anúncio" | ☐ |

### 4.4 Favoritar

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 2.21 | Clicar coração no card de produto | Coração fica preenchido, toast sucesso | ☐ |
| 2.22 | Clicar novamente no coração | (Comportamento actual: adiciona novamente) | ☐ |
| 2.23 | Clicar "Guardar nos Favoritos" no modal detalhes | Produto adicionado, toast sucesso | ☐ |

### 4.5 Criar Pedido

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 2.24 | Clicar "Fazer Pedido" no modal detalhes | **ERRO ESPERADO:** Falha porque frontend não envia `endereco_entrega` (BUG-001) | ☐ |
| 2.25 | Verificar toast de erro | Mensagem de erro da API | ☐ |

### 4.6 Contactar Vendedor

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 2.26 | Clicar "Contactar Vendedor" no modal detalhes | Conversa criada, redireciona para chat | ☐ |
| 2.27 | Verificar mensagem automática | "Olá! Tenho interesse em [título]" enviada | ☐ |
| 2.28 | Clicar "Contactar" sem estar logado | Aviso "Inicie sessão" | ☐ |

### 4.7 Explorar (Pinterest Style)

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 2.29 | Clicar no botão "+" (centro do nav) | Secção Explorar abre com masonry grid | ☐ |
| 2.30 | Verificar layout Pinterest | Cards com alturas variadas | ☐ |
| 2.31 | Clicar em "Tendências" | Feed filtra trending | ☐ |
| 2.32 | Clicar em "Vídeos" | Feed filtra vídeos | ☐ |
| 2.33 | Clicar num card | Viewer full-screen abre (estilo Instagram Reels) | ☐ |
| 2.34 | Navegar no viewer | Scroll vertical entre produtos | ☐ |
| 2.35 | Clicar coração no viewer | Like toggle funciona | ☐ |
| 2.36 | Clicar bookmark no viewer | Save toggle funciona | ☐ |
| 2.37 | Clicar "Buy Now" no viewer | Fecha viewer, abre detalhes do produto | ☐ |
| 2.38 | Clicar X no viewer | Viewer fecha | ☐ |

---

## 5. MÓDULO 3: CLIENTE — PERFIL E FAVORITOS

### 5.1 Perfil

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 3.1 | Navegar para "Perfil" | Perfil carrega com dados do utilizador | ☐ |
| 3.2 | Verificar avatar | Mostra iniciais ou foto de perfil | ☐ |
| 3.3 | Verificar estatísticas | Números de anúncios, favoritos, pedidos | ☐ |
| 3.4 | Clicar "Editar Perfil" | Formulário de edição aparece | ☐ |
| 3.5 | Alterar nome | Campo aceita alteração | ☐ |
| 3.6 | Alterar telefone | Campo aceita alteração | ☐ |
| 3.7 | Carregar fotografia | Input de file aceita imagem | ☐ |
| 3.8 | Submeter sem alterações | Perfil actualizado com sucesso | ☐ |
| 3.9 | Clicar "Cancelar" | Formulário fecha sem alterações | ☐ |
| 3.10 | Verificar menu "Segurança" | Mensagem "Em breve!" | ☐ |
| 3.11 | Verificar menu "Notificações" | Mensagem "Em breve!" | ☐ |
| 3.12 | Verificar menu "Ajuda e Suporte" | Mensagem "Em breve!" | ☐ |
| 3.13 | Clicar "Tornar-me Vendedor" | Mensagem "Funcionalidade em breve!" | ☐ |

### 5.2 Favoritos

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 3.14 | Navegar para "Favoritos" | Lista de favoritos carrega | ☐ |
| 3.15 | Sem favoritos | Estado vazio "Ainda não tens favoritos" | ☐ |
| 3.16 | Com favoritos | Grid de produtos favoritos | ☐ |
| 3.17 | Clicar no X do favorito | Produto removido, toast sucesso | ☐ |
| 3.18 | Clicar num favorito | Abre detalhes do produto | ☐ |
| 3.19 | Verificar botão "Explorar" no estado vazio | Navega para explorar produtos | ☐ |

---

## 6. MÓDULO 4: CLIENTE — PEDIDOS E CHAT

### 6.1 Pedidos / Compras

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 4.1 | Navegar para "Os Meus Pedidos" | Lista de pedidos carrega | ☐ |
| 4.2 | Sem pedidos | Mensagem "Nenhum pedido ainda" | ☐ |
| 4.3 | Com pedidos | Cards com ID, vendedor, estado, total, data | ☐ |
| 4.4 | Clicar "Ver Detalhe" | Detalhe do pedido com itens, totais, estado | ☐ |
| 4.5 | Clicar "Cancelar" num pedido pendente | Pedido cancelado, toast sucesso | ☐ |
| 4.6 | Tentar cancelar pedido entregue | Botão não aparece (já entregue) | ☐ |
| 4.7 | Verificar badge de estado | Cores correctas por estado (pendente, entregue, cancelado) | ☐ |

### 6.2 Chat / Mensagens

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 4.8 | Navegar para "Mensagens" | Lista de conversas carrega | ☐ |
| 4.9 | Sem conversas | Estado vazio "Sem conversas" | ☐ |
| 4.10 | Com conversas | Lista com avatar, nome, produto, preview, tempo | ☐ |
| 4.11 | Clicar numa conversa | Janela de chat abre | ☐ |
| 4.12 | Verificar header do chat | Avatar, nome, estado "Activo agora" | ☐ |
| 4.13 | Verificar contexto do produto | Thumbnail do produto no topo do chat | ☐ |
| 4.14 | Digitar e enviar mensagem | Mensagem aparece no chat | ☐ |
| 4.15 | Mensagem enviada | Bolha à direita (cor own), hora visível | ☐ |
| 4.16 | Mensagem recebida | Bolha à esquerda (cor other) | ☐ |
| 4.17 | Indicador "a escrever" | Aparece quando outro utilizador digita | ☐ |
| 4.18 | Scroll automático | Chat rola para baixo ao receber mensagem | ☐ |
| 4.19 | Clicar "Voltar" (mobile) | Volta para lista de conversas | ☐ |
| 4.20 | Pesquisar conversas | Filtra por nome, produto ou mensagem | ☐ |
| 4.21 | Verificar badge de não lidas | Número de mensagens não lidas visível | ☐ |

### 6.3 Minhas Denúncias

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 4.22 | Navegar para "Minhas Denúncias" | Lista de denúncias carrega | ☐ |
| 4.23 | Sem denúncias | Mensagem "Nenhuma denúncia feita ainda" | ☐ |
| 4.24 | Com denúncias | Cards com ID, produto, motivo, estado, data | ☐ |

### 6.4 Minhas Sanções

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 4.25 | Navegar para "Minhas Sanções" | Lista de sanções carrega | ☐ |
| 4.26 | Sem sanções | Mensagem "Nenhuma sanção. Está tudo bem!" | ☐ |
| 4.27 | Com sanções | Cards com tipo, motivo, estado, data, expiração | ☐ |
| 4.28 | Sanção activa | Border vermelho, badge "Activa" | ☐ |
| 4.29 | Sanção inactiva | Border verde, badge "Inactiva" | ☐ |

---

## 7. MÓDULO 5: VENDEDOR — CRIAR ANÚNCIO

### 7.1 Criar Anúncio

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 5.1 | Navegar para "Novo Anúncio" | Formulário de criação aparece | ☐ |
| 5.2 | Verificar upload de fotos | Área de upload visível | ☐ |
| 5.3 | Clicar na área de upload | Selector de ficheiros abre | ☐ |
| 5.4 | Selecionar imagem válida (JPG) | Preview da imagem aparece | ☐ |
| 5.5 | Selecionar múltiplas imagens | Até 5 previews aparecem | ☐ |
| 5.6 | Tentar selecionar 6 imagens | Apenas 5 são aceites | ☐ |
| 5.7 | Selecionar imagem > 50MB | Erro de tamanho | ☐ |
| 5.8 | Selecionar ficheiro .exe | Erro de tipo | ☐ |
| 5.9 | Preencher título curto ("abc") | Erro: mínimo 5 caracteres | ☐ |
| 5.10 | Preencher descrição curta ("abc") | Erro: mínimo 20 caracteres | ☐ |
| 5.11 | Preço zero ou negativo | Erro de validação | ☐ |
| 5.12 | Selecionar categoria | Select popula com categorias da API | ☐ |
| 5.13 | Clicar "Novo" (condição) | Chip selecionado, hidden field actualizado | ☐ |
| 5.14 | Clicar "Usado" (condição) | Chip selecionado | ☐ |
| 5.15 | Toggle "Negociável" | Checkbox alterna | ☐ |
| 5.16 | Submeter com dados válidos | Anúncio publicado, toast sucesso | ☐ |
| 5.17 | Verificar redirecionamento | Volta para "Meus Anúncios" | ☐ |
| 5.18 | Submeter sem imagens | Anúncio pode ser criado (sem foto) | ☐ |

### 7.2 Editar Anúncio

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 5.19 | Clicar "Editar" num anúncio | Formulário de edição carrega com dados actuais | ☐ |
| 5.20 | Verificar campos preenchidos | Título, preço, descrição, etc. pré-preenchidos | ☐ |
| 5.21 | Verificar imagens actuais | Thumbnails das imagens existentes visíveis | ☐ |
| 5.22 | Alterar título | Campo aceita alteração | ☐ |
| 5.23 | Alterar preço | Campo aceita alteração | ☐ |
| 5.24 | Guardar alterações | Toast sucesso, volta para lista | ☐ |
| 5.25 | Clicar voltar (sem guardar) | Pede confirmação ou perde alterações | ☐ |

### 7.3 Eliminar / Marcar Vendido

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 5.26 | Clicar "Vendido" num anúncio | **ERRO ESPERADO:** BUG-002 (campo `status` vs `condicao`) | ☐ |
| 5.27 | Clicar "Eliminar" num anúncio | Modal de confirmação aparece | ☐ |
| 5.28 | Confirmar eliminação | Anúncio removido, toast sucesso | ☐ |
| 5.29 | Cancelar eliminação | Modal fecha, anúncio mantido | ☐ |

### 7.4 Filtros e Ordenação

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 5.30 | Filtrar por "Ativos" | Apenas anúncios activos | ☐ |
| 5.31 | Filtrar por "Inativos" | Apenas anúncios inativos | ☐ |
| 5.32 | Filtrar por "Vendidos" | Apenas anúncios vendidos | ☐ |
| 5.33 | Ordenar "Mais recentes" | Ordenação cronológica descendente | ☐ |
| 5.34 | Ordenar "Maior preço" | Ordenação por preço descendente | ☐ |
| 5.35 | Ordenar "Menor preço" | Ordenação por preço ascendente | ☐ |

---

## 8. MÓDULO 6: VENDEDOR — GESTÃO DE VENDAS

### 8.1 Dashboard

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 6.1 | Abrir vendedor.html | Dashboard com KPIs carrega | ☐ |
| 6.2 | Verificar KPIs | Receita Total, Vendas, Anúncios Ativos, Pedidos Pendentes | ☐ |
| 6.3 | Verificar pedidos recentes | Lista dos últimos 5 pedidos | ☐ |
| 6.4 | Clicar num pedido recente | Navega para secção de vendas | ☐ |

### 8.2 Vendas / Pedidos Recebidos

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 6.5 | Navegar para "Minhas Vendas" | Lista de pedidos recebidos | ☐ |
| 6.6 | Verificar card de venda | ID, cliente, total, estado, data | ☐ |
| 6.7 | Alterar estado do pedido | Select com opções (pendente → confirmado → preparando...) | ☐ |
| 6.8 | Clicar "Atualizar" | Estado actualizado, toast sucesso | ☐ |
| 6.9 | Estado inválido | Erro da API | ☐ |

### 8.3 Perfil da Loja

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 6.10 | Navegar para "Perfil da Loja" | Formulário com dados da loja | ☐ |
| 6.11 | Verificar dados | Nome loja, descrição, endereço, métodos recebimento | ☐ |
| 6.12 | Editar nome da loja | Campo aceita alteração | ☐ |
| 6.13 | Guardar alterações | Perfil actualizado, toast sucesso | ☐ |
| 6.14 | Verificar avaliações | Lista de avaliações do vendedor | ☐ |

### 8.4 Subscrição

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 6.15 | Navegar para "Minha Subscrição" | Estado da subscrição actual | ☐ |
| 6.16 | Sem plano activo | Aviso "Não tem um plano activo" | ☐ |
| 6.17 | Com plano activo | Card com nome, expiração, limites | ☐ |
| 6.18 | Verificar planos disponíveis | Lista de planos (Free, Básico, Pro, Premium) | ☐ |
| 6.19 | Clicar "Escolher Plano" | Modal de confirmação | ☐ |
| 6.20 | Confirmar | Plano activado, toast sucesso | ☐ |

---

## 9. MÓDULO 7: ADMIN — GESTÃO DE UTILIZADORES

### 9.1 Dashboard Admin

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 7.1 | Abrir admin.html como admin | Dashboard com métricas | ☐ |
| 7.2 | Verificar cards | Utilizadores, Vendedores, Produtos, Pedidos, Receita, Denúncias | ☐ |
| 7.3 | Verificar "Pedidos por Estado" | Lista de estados com contadores | ☐ |
| 7.4 | Verificar "Registos Recentes" | Últimos utilizadores registados | ☐ |
| 7.5 | Clicar num utilizador recente | Abre detalhes do utilizador | ☐ |
| 7.6 | Clicar "pendentes de aprovação" | Navega para secção de vendedores | ☐ |
| 7.7 | Clicar "pendentes de moderação" | Navega para secção de produtos | ☐ |

### 9.2 Gestão de Utilizadores

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 7.8 | Navegar para "Utilizadores" | Tabela de utilizadores carrega | ☐ |
| 7.9 | Verificar filtros | Busca, tipo, estado | ☐ |
| 7.10 | Pesquisar por nome | Filtra resultados | ☐ |
| 7.11 | Filtrar por tipo "Clientes" | Apenas clientes | ☐ |
| 7.12 | Filtrar por estado "Activo" | Apenas activos | ☐ |
| 7.13 | Clicar num utilizador | Modal de detalhes abre | ☐ |
| 7.14 | Verificar detalhes | Nome, email, telefone, cidade, data registo | ☐ |
| 7.15 | Verificar dados de vendedor | Nome loja, plano, aprovação, vendas, receita | ☐ |
| 7.16 | Verificar sanções | Número de sanções activas | ☐ |
| 7.17 | Verificar denúncias | Número de denúncias recebidas | ☐ |

### 9.3 Alterar Estado de Utilizador

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 7.18 | Clicar "Suspender" | **Usa `confirm()` nativo** (inconsistente) | ☐ |
| 7.19 | Confirmar suspensão | Utilizador fica "suspenso", tabela actualiza | ☐ |
| 7.20 | Clicar "Banir" | `confirm()` nativo | ☐ |
| 7.21 | Confirmar banimento | Utilizador fica "banido" | ☐ |
| 7.22 | Clicar "Reactivar" | `confirm()` nativo | ☐ |
| 7.23 | Confirmar reactivação | Utilizador fica "activo" | ☐ |
| 7.24 | Clicar "Aplicar Sanção" | Modal de sanção abre | ☐ |

### 9.4 Aprovar/Revogar Vendedor

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 7.25 | Navegar para "Vendedores" | Lista de vendedores | ☐ |
| 7.26 | Filtrar "Pendentes de Aprovação" | Vendedores não aprovados | ☐ |
| 7.27 | Clicar "Aprovar" | `confirm()` nativo, vendedor aprovado | ☐ |
| 7.28 | Clicar "Revogar" | `confirm()` nativo, aprovação revogada | ☐ |
| 7.29 | Verificar badge | "Aprovado" ou "Pendente" | ☐ |

---

## 10. MÓDULO 8: ADMIN — DENÚNCIAS E SANÇÕES

### 10.1 Denúncias

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 8.1 | Navegar para "Denúncias" | Lista de denúncias carrega | ☐ |
| 8.2 | Filtrar "Pendentes" | Apenas pendentes | ☐ |
| 8.3 | Verificar card de denúncia | ID, denunciante, denunciado, motivo, descrição, estado | ☐ |
| 8.4 | Clicar "Resolver" | Modal com textarea de resposta | ☐ |
| 8.5 | Submeter resposta | Denúncia resolvida, toast sucesso | ☐ |
| 8.6 | Clicar "Rejeitar" | Modal com textarea | ☐ |
| 8.7 | Submeter rejeição | Denúncia rejeitada | ☐ |
| 8.8 | Verificar badge de pendentes | Número actualizado no sidebar | ☐ |
| 8.9 | Verificar "Resposta do Admin" | Resposta visível na denúncia | ☐ |

### 10.2 Sanções

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 8.10 | Navegar para "Sanções" | Lista de sanções | ☐ |
| 8.11 | Clicar "Nova Sanção" | Modal de criação | ☐ |
| 8.12 | Preencher ID do utilizador | Campo aceita ID | ☐ |
| 8.13 | Selecionar tipo "Aviso" | Select funciona | ☐ |
| 8.14 | Selecionar tipo "Suspensão" | Select funciona | ☐ |
| 8.15 | Selecionar tipo "Banimento" | Select funciona | ☐ |
| 8.16 | Preencher motivo curto ("abc") | Erro: mínimo 5 caracteres | ☐ |
| 8.17 | Preencher duração | Campo aceita número de dias | ☐ |
| 8.18 | Submeter sem duração | Sanção permanente | ☐ |
| 8.19 | Submeter com dados válidos | Sanção aplicada, toast sucesso | ☐ |
| 8.20 | Clicar "Desactivar" numa sanção | Sanção fica inactiva | ☐ |
| 8.21 | Verificar sanção inactiva | Badge "Inactiva", botão "Desactivar" desaparece | ☐ |

### 10.3 Moderação de Produtos

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 8.22 | Navegar para "Produtos" | Lista de produtos | ☐ |
| 8.23 | Filtrar "Pendentes" | Produtos pendentes de moderação | ☐ |
| 8.24 | Clicar "Aprovar" | `confirm()` nativo, produto aprovado | ☐ |
| 8.25 | Clicar "Rejeitar" | `confirm()` nativo, produto rejeitado | ☐ |
| 8.26 | Clicar "Remover" | `confirm()` nativo, produto eliminado | ☐ |
| 8.27 | Verificar chip de estado | "Aprovado" ou "Pendente" | ☐ |

---

## 11. MÓDULO 9: EDGE CASES E CENÁRIOS DE ERRO

### 11.1 Sessão Expirada

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 9.1 | Login, esperar 15 min | Token expira | ☐ |
| 9.2 | Fazer pedido | 401 → refresh automático → pedido reenviado | ☐ |
| 9.3 | Refresh token expirado | Redireciona para login | ☐ |

### 11.2 Acesso Não Autorizado

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 9.4 | Cliente aceder a /api/utilizadores/admin/todos | 403 "Sem permissão" | ☐ |
| 9.5 | Vendedor aceder a /api/sancoes (POST) | 403 "Sem permissão" | ☐ |
| 9.6 | Admin aceder a endpoints sem token | 401 "Acesso negado" | ☐ |
| 9.7 | Utilizador suspenso fazer login | 403 "A conta encontra-se: suspenso" | ☐ |
| 9.8 | Utilizador banido fazer login | 403 "A conta encontra-se: banido" | ☐ |

### 11.3 Dados Inválidos

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 9.9 | Criar produto sem categoria_id | 422 "Dados inválidos" | ☐ |
| 9.10 | Criar pedido sem itens | 400 "O pedido precisa de pelo menos um item" | ☐ |
| 9.11 | Criar pedido com produto inexistente | 404 "Produto não encontrado" | ☐ |
| 9.12 | Criar pedido com stock insuficiente | 400 "Stock insuficiente" | ☐ |
| 9.13 | Avaliar a si mesmo | 400 "Não pode avaliar a si mesmo" | ☐ |
| 9.14 | Denunciar a si mesmo | 400 "Não pode denunciar a si mesmo" | ☐ |
| 9.15 | Sancionar a si mesmo | 400 "Não pode sancionar a si mesmo" | ☐ |
| 9.16 | Enviar mensagem para si mesmo | 400 "Não pode enviar mensagens para si mesmo" | ☐ |

### 11.4 Recursos Não Encontrados

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 9.17 | GET /api/produtos/99999 | 404 "Produto não encontrado" | ☐ |
| 9.18 | GET /api/pedidos/99999 | 404 "Pedido não encontrado" | ☐ |
| 9.19 | Rota inexistente /api/xyz | 404 "Rota não encontrada" | ☐ |

### 11.5 Concorrência

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 9.20 | Dois utilizadores favoritam o mesmo produto ao mesmo tempo | Contador incrementa correctamente | ☐ |
| 9.21 | Utilizador compra último item em stock | Stock actualizado, outros veem "indisponível" | ☐ |

---

## 12. MÓDULO 10: PERFORMANCE E RESPONSIVIDADE

### 12.1 Performance

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 10.1 | Tempo de carregamento da landing page | < 3 segundos | ☐ |
| 10.2 | Tempo de resposta da API (GET /produtos) | < 500ms | ☐ |
| 10.3 | Tempo de login | < 2 segundos | ☐ |
| 10.4 | Infinite scroll sem lag | Smooth scroll, sem.freeze | ☐ |
| 10.5 | Chat com Socket.IO | Mensagem aparece em < 1 segundo | ☐ |
| 10.6 | Upload de imagem 5MB | < 5 segundos | ☐ |

### 12.2 Responsividade (Mobile)

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 10.7 | Abrir em ecrã 375px (iPhone SE) | Layout adapta, bottom nav visível | ☐ |
| 10.8 | Abrir em ecrã 768px (iPad) | Layout adapta, sidebar ou drawer | ☐ |
| 10.9 | Abrir em ecrã 1024px+ (Desktop) | Layout desktop completo | ☐ |
| 10.10 | Drawer abre/fecha no mobile | Animação suave, overlay escuro | ☐ |
| 10.11 | Modal de detalhes no mobile | Layout unificado (imagem em cima) | ☐ |
| 10.12 | Chat no mobile | Layout otimizado, teclado não cobre input | ☐ |
| 10.13 | Formulários no mobile | Campos legíveis, teclado adequado | ☐ |

### 12.3 Browser

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 10.14 | Chrome (latest) | Tudo funciona | ☐ |
| 10.15 | Firefox (latest) | Tudo funciona | ☐ |
| 10.16 | Safari (latest) | Tudo funciona | ☐ |
| 10.17 | Edge (latest) | Tudo funciona | ☐ |

---

## 13. MÓDULO 11: SEGURANÇA

### 13.1 Autenticação

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 11.1 | Token em localStorage | Visível mas não enviável cross-origin | ☐ |
| 11.2 | Cookie httpOnly | Refresh token não acessível via JS | ☐ |
| 11.3 | Senha hashed | bcrypt rounds ≥ 12 | ☐ |
| 11.4 | JWT expira em 15 min | Access token tem exp | ☐ |
| 11.5 | Refresh token expira em 7 dias | Refresh token tem exp | ☐ |

### 13.2 Validação

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 11.6 | SQL Injection no campo de busca | Query não é executada (parameterized) | ☐ |
| 11.7 | XSS no nome | HTML escapado no output | ☐ |
| 11.8 | CSRF nos pedidos | Token/cookie protege | ☐ |
| 11.9 | Upload de ficheiro .php | Rejeitado (tipo não suportado) | ☐ |
| 11.10 | Upload de imagem > 50MB | Rejeitado (tamanho excedido) | ☐ |

### 13.3 Rate Limiting

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 11.11 | Login 10+ vezes falhado | 429 "Demasiadas tentativas" | ☐ |
| 11.12 | 1000+ pedidos/min | 429 "Limite de pedidos excedido" | ☐ |

### 13.4 CORS

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 11.13 | Pedido de origem diferente | Headers CORS correctos | ☐ |
| 11.14 | Credentials incluídos | Cookie enviado correctamente | ☐ |

---

## 14. BUG REPORT

### 🔴 CRÍTICO

| ID | Descrição | Severidade | Passos | Estado |
|----|-----------|------------|--------|--------|
| BUG-001 | **Criar pedido falha** — Frontend envia `{ itens: [...] }` mas API requer `endereco_entrega` (obrigatório no schema) | 🔴 Crítico | 2.24 | ✅ CORRIGIDO |
| BUG-002 | **Marcar como vendido falha** — Frontend envia `{ status: 'vendido' }` mas API espera `condicao: 'vendido'` | 🔴 Crítico | 5.26 | ✅ CORRIGIDO |
| BUG-003 | **`contactarVendedor` pode ser undefined** — Função usada em HTML inline mas pode não estar declarada em todas as páginas | 🔴 Crítico | 2.26 | ✅ RESOLVIDO (definida em app.js e app-cliente.js) |

### 🟡 MÉDIO

| ID | Descrição | Severidade | Passos | Estado |
|----|-----------|------------|--------|--------|
| BUG-004 | **`confirm()` nativo** — Admin usa `confirm()` e `alert()` nativos em vez de `confirmarAcao()` customizado | 🟡 Médio | 7.18, 7.20, 8.24 | ✅ CORRIGIDO |
| BUG-005 | **Código duplicado** — `formatarMoeda()`, `escaparHtml()`, `resolverUrlImagem()` duplicados em 3 ficheiros JS | 🟡 Médio | — | ✅ CORRIGIDO (utils.js partilhado) |
| BUG-006 | **Toast inconsistente** — Às vezes `document.body.appendChild()`, às vezes `toastContainer` | 🟡 Médio | — | ✅ RESOLVIDO (CSS unificado) |
| BUG-007 | **Categorias hardcoded** — Landing page mostra categorias estáticas em vez de vir da API | 🟡 Médio | — | ✅ RESOLVIDO (carregarCategoriasHero() busca da API) |
| BUG-008 | **Newsletter não funcional** — Formulário faz `preventDefault()` sem acção | 🟡 Médio | — | ✅ CORRIGIDO (mostra toast de confirmação) |
| BUG-009 | **Infinite scroll duplicação** — Pode carregar a mesma página 2× se scroll rápido | 🟡 Médio | 2.8 | ✅ CORRIGIDO |
| BUG-010 | **Erros silenciados** — Vários `catch {}` vazios que escondem problemas | 🟡 Médio | — | ✅ CORRIGIDO |
| BUG-011 | **Indicador de escrita** — `mostrarIndicadorEscrita()` tem parâmetro `e` em vez de `escrevendo` em `app-cliente.js:722` | 🟡 Médio | 4.17 | ✅ CORRIGIDO |
| BUG-012 | **Subscrição não mostra planos** — `api.subscricoes.minha()` pode falhar se vendedor não tem perfil | 🟡 Médio | 6.15 | ✅ CORRIGIDO (mensagem de erro amigável) |
| BUG-013 | **Upload não valida tamanho no frontend** — Apenas valida no backend (50MB) | 🟡 Médio | 5.7 | ✅ CORRIGIDO |

### 🟢 BAIXO

| ID | Descrição | Severidade | Passes |
|----|-----------|------------|--------|
| BUG-014 | **Menu "Em breve!"** — Segurança, Notificações, Ajuda não funcionam | 🟢 Baixo | 3.10-3.12 | ✅ CORRIGIDO (mensagens descritivas) |
| BUG-015 | **Tornar-me Vendedor** — Botão não faz nada | 🟢 Baixo | 3.13 | ✅ CORRIGIDO (redireciona para registo) |
| BUG-016 | **Pesquisa no header vendedor** — Input não está conectado | 🟢 Baixo | — | ✅ CORRIGIDO (handler de live search) |
| BUG-017 | **Bottom nav admin 6 itens** — Pode ficar apertado em mobile | 🟢 Baixo | — | ✅ CORRIGIDO (scroll horizontal + sizing) |

---

## 15. CHECKLIST FINAL

### Funcionalidades Core
- [ ] Login/logout funciona para todos os tipos de conta
- [ ] Registo cria conta correctamente
- [ ] Token refresh automático funciona
- [ ] Produtos são listados e filtrados
- [ ] Detalhes do produto mostra informação completa
- [ ] Favoritos funcionam (adicionar/remover)
- [ ] Chat em tempo real funciona
- [ ] Pedidos podem ser criados (com BUG-001 corrigido)
- [ ] Vendedor pode criar/editar/eliminar anúncios
- [ ] Admin pode gerir utilizadores, denúncias, sanções

### UX/UI
- [ ] Modais abrem e fecham correctamente
- [ ] Loading states visíveis em todas as operações
- [ ] Toasts de sucesso/erro aparecem
- [ ] Formulários têm validação visual
- [ ] Layout responsivo em mobile/tablet/desktop
- [ ] Navegação é intuitiva e consistente
- [ ] Estados vazios são informativos
- [ ] Erros são compreensíveis pelo utilizador

### Segurança
- [ ] Utilizadores não podem aceder a recursos de outros
- [ ] Admin não pode ser criado via registo
- [ ] Rate limiting funciona
- [ ] Upload aceita apenas tipos permitidos
- [ ] Senhas são hasheadas

---

**Total de Testes:** 228
**Bug Corrigidos:** 17/17 ✅
**Bug Pendentes:** 0

**Todos os bugs foram corrigidos!**
