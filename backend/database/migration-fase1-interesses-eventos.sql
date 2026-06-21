-- ============================================================
-- LINKA — Migration Fase 1: Perfil de Interesses + Eventos
-- Registo de comportamento + Recomendação personalizada
-- ============================================================

SET NAMES utf8mb4;

-- ============================================================
-- TABELA: utilizador_interesses
-- Pesos de interesse por categoria para cada utilizador
-- ============================================================
CREATE TABLE IF NOT EXISTS utilizador_interesses (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  utilizador_id       INT UNSIGNED     NOT NULL,
  categoria_id        INT UNSIGNED     NOT NULL,
  peso                DECIMAL(5,2)     NOT NULL DEFAULT 1.00,
  total_accoes         INT UNSIGNED     NOT NULL DEFAULT 0,
  ultima_accao_em     TIMESTAMP        NULL,
  criado_em           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_em      TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_utilizador_categoria (utilizador_id, categoria_id),
  INDEX idx_utilizador  (utilizador_id),
  INDEX idx_categoria   (categoria_id),
  INDEX idx_peso        (peso DESC),

  CONSTRAINT fk_interesses_utilizador
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_interesses_categoria
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- TABELA: eventos_utilizador
-- Registo granular de todas as acções do utilizador
-- ============================================================
CREATE TABLE IF NOT EXISTS eventos_utilizador (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  utilizador_id       INT UNSIGNED     NULL,
  session_id          VARCHAR(100)     NULL,
  produto_id          INT UNSIGNED     NOT NULL,
  tipo_evento         ENUM('view','like','unlike','favorite','unfavorite','comment','share','purchase','search') NOT NULL,
  duracao_ms          INT UNSIGNED     NULL,
  metadata_json       JSON             NULL,
  criado_em           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_utilizador    (utilizador_id),
  INDEX idx_produto       (produto_id),
  INDEX idx_tipo          (tipo_evento),
  INDEX idx_criado        (criado_em),
  INDEX idx_util_tipo     (utilizador_id, tipo_evento),
  INDEX idx_produto_tipo  (produto_id, tipo_evento),

  CONSTRAINT fk_eventos_utilizador
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id)
    ON DELETE SET NULL ON UPDATE CASCADE,

  CONSTRAINT fk_eventos_produto
    FOREIGN KEY (produto_id) REFERENCES produtos(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- VERIFICAÇÃO
-- ============================================================
SELECT
  table_name    AS 'Tabela',
  table_rows    AS 'Registos',
  engine        AS 'Motor'
FROM information_schema.tables
WHERE table_schema = 'linka_db'
  AND table_name IN ('utilizador_interesses', 'eventos_utilizador')
ORDER BY table_name;
