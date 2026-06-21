-- ============================================================
-- LINKA — Migration Fase 2: Trust Score + Ranking de Vendedores
-- ============================================================

SET NAMES utf8mb4;

-- ============================================================
-- TABELA: confianca_conta
-- Score de confiança por utilizador (0-100)
-- ============================================================
CREATE TABLE IF NOT EXISTS confianca_conta (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  utilizador_id       INT UNSIGNED     NOT NULL,
  score               DECIMAL(5,2)     NOT NULL DEFAULT 50.00,
  factores_json       JSON             NULL,
  actualizado_em      TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  criado_em           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_utilizador (utilizador_id),
  INDEX idx_score          (score DESC),

  CONSTRAINT fk_confianca_utilizador
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- TABELA: vendedor_ranking
-- Ranking semanal dos vendedores
-- ============================================================
CREATE TABLE IF NOT EXISTS vendedor_ranking (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vendedor_id         INT UNSIGNED     NOT NULL,
  score_composto      DECIMAL(7,2)     NOT NULL DEFAULT 0.00,
  posicao             INT UNSIGNED     NULL,
  periodo             VARCHAR(20)      NOT NULL,
  avaliacao_media     DECIMAL(3,2)     NOT NULL DEFAULT 0.00,
  total_vendas        INT UNSIGNED     NOT NULL DEFAULT 0,
  taxa_resposta       DECIMAL(5,2)     NOT NULL DEFAULT 0.00,
  taxa_entrega        DECIMAL(5,2)     NOT NULL DEFAULT 0.00,
  total_visualizacoes INT UNSIGNED     NOT NULL DEFAULT 0,
  criado_em           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_vendedor_periodo (vendedor_id, periodo),
  INDEX idx_periodo       (periodo),
  INDEX idx_score         (score_composto DESC),

  CONSTRAINT fk_ranking_vendedor
    FOREIGN KEY (vendedor_id) REFERENCES vendedores(id)
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
  AND table_name IN ('confianca_conta', 'vendedor_ranking')
ORDER BY table_name;
