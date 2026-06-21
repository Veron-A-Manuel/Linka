-- ============================================================
-- LINKA — Correção de Charset (UTF-8 / Acentuação)
-- Executar UMA VEZ se os dados aparecem sem acentos:
--   mysql -u root -p linka_db < fix-charset.sql
-- ============================================================

SET NAMES utf8mb4;

-- Corrigir charset da base de dados
ALTER DATABASE linka_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Corrigir charset de TODAS as tabelas existentes
-- (o MySQL reconhece automaticamente as tabelas do linka_db)

-- Utilizadores
ALTER TABLE utilizadores CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Planos
ALTER TABLE planos_premium CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Vendedores
ALTER TABLE vendedores CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Subscricoes
ALTER TABLE subscricoes CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Categorias
ALTER TABLE categorias CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Produtos
ALTER TABLE produtos CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Imagens
ALTER TABLE imagens_produto CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Favoritos
ALTER TABLE favoritos CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Pedidos
ALTER TABLE pedidos CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Itens Pedido
ALTER TABLE itens_pedido CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Entregas
ALTER TABLE entregas CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Conversas
ALTER TABLE conversas CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Mensagens
ALTER TABLE mensagens CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Notificacoes
ALTER TABLE notificacoes CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Avaliacoes
ALTER TABLE avaliacoes CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Denuncias
ALTER TABLE denuncias CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Sancoes
ALTER TABLE sancoes CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Verificar charset de todas as tabelas
SELECT
  table_name    AS 'Tabela',
  table_collation AS 'Collation'
FROM information_schema.tables
WHERE table_schema = 'linka_db'
ORDER BY table_name;
