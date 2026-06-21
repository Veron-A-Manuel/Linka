-- ============================================================
-- LINKA — Migration Fase 4: Anti-Spam Básico + Detecção de Padrões
-- ============================================================

SET NAMES utf8mb4;

-- ============================================================
-- TABELA: spam_reports
-- Registo de acções anti-spam executadas
-- ============================================================
CREATE TABLE IF NOT EXISTS spam_reports (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  utilizador_id       INT UNSIGNED     NULL,
  tipo                ENUM('mensagem_flood','mensagem_duplicada','produto_duplicado','avaliacao_flood','denuncia_abuso') NOT NULL,
  detalhes_json       JSON             NULL,
  accao_tomada        ENUM('bloqueado','alertado','limitado','ignorado') NOT NULL DEFAULT 'alertado',
  criado_em           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_utilizador  (utilizador_id),
  INDEX idx_tipo        (tipo),
  INDEX idx_criado      (criado_em),

  CONSTRAINT fk_spam_utilizador
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- TABELA: rate_limits
-- Contadores de rate limiting por utilizador/akção
-- ============================================================
CREATE TABLE IF NOT EXISTS rate_limits (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  utilizador_id       INT UNSIGNED     NOT NULL,
  accao               VARCHAR(50)      NOT NULL,
  contador            INT UNSIGNED     NOT NULL DEFAULT 1,
  janela_inicio       TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  criado_em           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_utilizador_accao (utilizador_id, accao),
  INDEX idx_janela    (janela_inicio),

  CONSTRAINT fk_ratelimit_utilizador
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id)
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
  AND table_name IN ('spam_reports', 'rate_limits')
ORDER BY table_name;
