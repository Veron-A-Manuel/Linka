-- ============================================================
-- LINKA — Migration: User Sessions (Multi-device)
-- Gestão de sessões e dispositivos conectados
-- ============================================================

SET NAMES utf8mb4;

-- ============================================================
-- TABELA: user_sessions
-- Registo de todas as sessões activas por utilizador
-- ============================================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  utilizador_id       INT UNSIGNED     NOT NULL,
  refresh_token_hash  VARCHAR(64)      NOT NULL,
  device_name         VARCHAR(200)     NULL,
  ip_address          VARCHAR(45)      NULL,
  user_agent          TEXT             NULL,
  expires_at          TIMESTAMP        NOT NULL,
  last_activity       TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked             TINYINT(1)       NOT NULL DEFAULT 0,
  criado_em           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_sessao_utilizador  (utilizador_id),
  INDEX idx_sessao_token_hash  (refresh_token_hash),
  INDEX idx_sessao_expires     (expires_at),
  INDEX idx_sessao_revoked     (revoked),

  CONSTRAINT fk_sessao_utilizador
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
