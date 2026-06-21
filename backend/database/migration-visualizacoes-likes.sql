-- ============================================================
-- LINKA — Migration: Visualizações e Likes de Produtos
-- Compatível com o schema existente
-- ============================================================

SET NAMES utf8mb4;

-- ============================================================
-- TABELA: visualizacoes_produto
-- Regista visualizações únicas por utilizador/dia
-- ============================================================
CREATE TABLE IF NOT EXISTS visualizacoes_produto (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  produto_id          INT UNSIGNED     NOT NULL,
  utilizador_id       INT UNSIGNED     NULL,
  session_id          VARCHAR(100)     NULL,
  criado_em           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_produto       (produto_id),
  INDEX idx_utilizador    (utilizador_id),
  INDEX idx_session       (session_id),
  INDEX idx_criado        (criado_em),

  CONSTRAINT fk_visualizacoes_produto
    FOREIGN KEY (produto_id) REFERENCES produtos(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_visualizacoes_utilizador
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- TABELA: produto_likes
-- Likes/curtidas em produtos (separado de favoritos)
-- ============================================================
CREATE TABLE IF NOT EXISTS produto_likes (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  produto_id          INT UNSIGNED     NOT NULL,
  utilizador_id       INT UNSIGNED     NOT NULL,
  criado_em           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_like   (produto_id, utilizador_id),
  INDEX idx_produto    (produto_id),
  INDEX idx_utilizador (utilizador_id),

  CONSTRAINT fk_likes_produto
    FOREIGN KEY (produto_id) REFERENCES produtos(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_likes_utilizador
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- COLUNAS ADICIONAIS (se não existirem)
-- ============================================================
-- total_likes já existe no schema original, mas vamos garantir
-- ALTER TABLE produtos ADD COLUMN IF NOT EXISTS total_likes INT UNSIGNED NOT NULL DEFAULT 0;
-- (MySQL 8.0+ suporta ADD COLUMN IF NOT EXISTS, mas versões anteriores não)

-- Verificar e adicionar total_likes se não existir
SET @existe = (SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = 'linka_db' AND table_name = 'produtos' AND column_name = 'total_likes');

SET @sql = IF(@existe = 0,
  'ALTER TABLE produtos ADD COLUMN total_likes INT UNSIGNED NOT NULL DEFAULT 0 AFTER total_favoritos',
  'SELECT "Coluna total_likes já existe"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- ============================================================
-- VERIFICAÇÃO
-- ============================================================
SELECT
  table_name    AS 'Tabela',
  table_rows    AS 'Registos',
  engine        AS 'Motor'
FROM information_schema.tables
WHERE table_schema = 'linka_db'
  AND table_name IN ('visualizacoes_produto', 'produto_likes')
ORDER BY table_name;
