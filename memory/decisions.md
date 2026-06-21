# Decisões Técnicas — LINKA

## Arquitetura

- **Backend**: Node.js com Express.
- **Base de Dados**: MySQL (Relacional) para garantir integridade referencial em transações de marketplace.
- **Estrutura**: Desacoplada seguindo o padrão Controller-Service-Model.

## Base de Dados

- Implementado schema com 17 tabelas abrangendo utilizadores, produtos, pedidos, entregas e chat.
- Utilização de `TIMESTAMP` com `DEFAULT CURRENT_TIMESTAMP` e `ON UPDATE CURRENT_TIMESTAMP` para auditoria.

## Módulos Core (Etapa 2)

- **Pedidos**: Implementado com transações SQL para garantir que itens de pedido são criados com o pedido pai.
- **Chat**: Sistema de conversas persistente via REST API, preparado para upgrade para WebSockets.
- **Arquitetura**: Padronização absoluta para Controller -> Service -> Model em todos os módulos.
- **Tratamento de Erros**: Centralizado via `ErroApp` e `asyncHandler`, garantindo que nenhuma falha assíncrona quebre o servidor.
- **Media**: Configuração centralizada do Multer para gestão de imagens com validação automática.

## Segurança (Etapa 3)

- **Sessões**: Cookies HttpOnly + JWT Access/Refresh tokens.
- **Proteção**: Rate Limiting (Login e Geral) e Helmet.
- **RBAC**: Middleware para controlo de acesso baseado em papéis (Cliente, Vendedor, Admin).

## Integração (Frontend-Backend)

- **CORS**: Configurado para ser o primeiro middleware executado. Isto garante que mesmo respostas de erro ou bloqueios por rate-limit incluam os cabeçalhos necessários para o navegador, evitando erros de "Origem Cruzada" falsos.
- **Credenciais**: Suporte explícito para `credentials: true` com origens dinâmicas (reflectindo a origem do pedido se estiver na lista de permitidas) para permitir o uso de cookies HttpOnly entre o frontend (ex: Live Server) e o backend.
