-- ============================================================
-- LINKA — Migration Fase 4: Anti-Spam + Detecção de Padrões
-- ============================================================

SET NAMES utf8mb4;

-- ============================================================
-- TABELA: anti_spam_registos
-- Registos de acções para rate limiting por utilizador
-- ============================================================
CREATE TABLE IF NOT EXISTS anti_spam_registos (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  utilizador_id       INT UNSIGNED     NOT NULL,
  tipo_accao          VARCHAR(50)      NOT NULL,
  ip_address          VARCHAR(45)      NULL,
  criado_em           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_utilizador_tipo (utilizador_id, tipo_accao, criado_em),
  INDEX idx_ip_tipo         (ip_address, tipo_accao, criado_em),
  INDEX idx_criado_em       (criado_em),

  CONSTRAINT fk_asr_utilizador
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- TABELA: anti_spam_bloqueios
-- Bloqueios temporários de utilizadores
-- ============================================================
CREATE TABLE IF NOT EXISTS anti_spam_bloqueios (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  utilizador_id       INT UNSIGNED     NOT NULL,
  motivo              VARCHAR(255)     NOT NULL,
  tipo_bloqueio       ENUM('temporario', 'permanente') NOT NULL DEFAULT 'temporario',
  expira_em           TIMESTAMP        NULL,
  ativo               TINYINT(1)       NOT NULL DEFAULT 1,
  criado_em           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_utilizador  (utilizador_id),
  INDEX idx_ativo       (ativo, expira_em),

  CONSTRAINT fk_asb_utilizador
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- TABELA: padroes_deteccao
-- Regras de detecção de padrões anómalos
-- ============================================================
CREATE TABLE IF NOT EXISTS padroes_deteccao (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome                VARCHAR(100)     NOT NULL,
  descricao           TEXT             NULL,
  tipo_padrao         ENUM('mensagens', 'produtos', 'avaliacoes', 'denuncias', 'visualizacoes') NOT NULL,
  janela_minutos      INT UNSIGNED     NOT NULL DEFAULT 60,
  limite_accoes       INT UNSIGNED     NOT NULL DEFAULT 10,
  accao               ENUM('alerta', 'bloquear_temp', 'bloquear_perm', 'notificar_admin') NOT NULL DEFAULT 'alerta',
  ativo               TINYINT(1)       NOT NULL DEFAULT 1,
  criado_em           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_nome (nome),
  INDEX idx_tipo (tipo_padrao, ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- TABELA: alertas_moderacao
-- Alertas gerados pela detecção de padrões
-- ============================================================
CREATE TABLE IF NOT EXISTS alertas_moderacao (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  utilizador_id       INT UNSIGNED     NOT NULL,
  padrao_id           INT UNSIGNED     NULL,
  tipo_alerta         VARCHAR(50)      NOT NULL,
  descricao           TEXT             NOT NULL,
  dados_contexto      JSON             NULL,
  estado              ENUM('pendente', 'revisado', 'resolvido', 'descartado') NOT NULL DEFAULT 'pendente',
  revisado_por        INT UNSIGNED     NULL,
  notas_revisao       TEXT             NULL,
  criado_em           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em       TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_estado      (estado),
  INDEX idx_utilizador  (utilizador_id),
  INDEX idx_criado_em   (criado_em),

  CONSTRAINT fk_am_utilizador
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_am_padrao
    FOREIGN KEY (padrao_id) REFERENCES padroes_deteccao(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- REGRAS PADRÃO — Regras default para detecção
-- ============================================================
INSERT IGNORE INTO padroes_deteccao (nome, descricao, tipo_padrao, janela_minutos, limite_accoes, accao) VALUES
  ('spam_mensagens',       'Muitas mensagens em pouco tempo',            'mensagens',   10,  20, 'bloquear_temp'),
  ('spam_produtos',        'Muitos produtos criados em pouco tempo',     'produtos',    60,  10, 'bloquear_temp'),
  ('spam_avaliacoes',      'Muitas avaliações em pouco tempo',           'avaliacoes',  60,  15, 'alerta'),
  ('denuncias_repetidas',  'Mesmo utilizador a ser denunciado vezes',    'denuncias',  1440,  5, 'notificar_admin'),
  ('spam_visualizacoes',   'Muitas visualizações em pouco tempo',        'visualizacoes', 5, 100, 'alerta');


-- ============================================================
-- VERIFICAÇÃO
-- ============================================================
SELECT
  table_name    AS 'Tabela',
  table_rows    AS 'Registos',
  engine        AS 'Motor'
FROM information_schema.tables
WHERE table_schema = 'linka_db'
  AND table_name IN ('anti_spam_registos', 'anti_spam_bloqueios', 'padroes_deteccao', 'alertas_moderacao')
ORDER BY table_name;
