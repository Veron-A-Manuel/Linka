-- ============================================================
-- LINKA — Migration Fase 3: Analytics para Vendedores
-- ============================================================

SET NAMES utf8mb4;

-- ============================================================
-- TABELA: anuncio_analytics
-- Métricas agregadas diárias por produto
-- ============================================================
CREATE TABLE IF NOT EXISTS anuncio_analytics (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  produto_id          INT UNSIGNED     NOT NULL,
  data                DATE             NOT NULL,
  visualizacoes_unicas INT UNSIGNED    NOT NULL DEFAULT 0,
  likes               INT UNSIGNED     NOT NULL DEFAULT 0,
  favoritos           INT UNSIGNED     NOT NULL DEFAULT 0,
  comentarios         INT UNSIGNED     NOT NULL DEFAULT 0,
  partilhas           INT UNSIGNED     NOT NULL DEFAULT 0,
  contactos_chat      INT UNSIGNED     NOT NULL DEFAULT 0,
  pedidos             INT UNSIGNED     NOT NULL DEFAULT 0,
  receita             DECIMAL(10,2)    NOT NULL DEFAULT 0.00,
  criado_em           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_produto_data (produto_id, data),
  INDEX idx_data           (data),
  INDEX idx_produto        (produto_id),

  CONSTRAINT fk_analytics_produto
    FOREIGN KEY (produto_id) REFERENCES produtos(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- TABELA: vendedor_analytics
-- Métricas agregadas diárias por vendedor (resumo)
-- ============================================================
CREATE TABLE IF NOT EXISTS vendedor_analytics (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vendedor_id         INT UNSIGNED     NOT NULL,
  data                DATE             NOT NULL,
  visualizacoes       INT UNSIGNED     NOT NULL DEFAULT 0,
  novos_followers     INT UNSIGNED     NOT NULL DEFAULT 0,
  total_produtos      INT UNSIGNED     NOT NULL DEFAULT 0,
  pedidos_novos       INT UNSIGNED     NOT NULL DEFAULT 0,
  receita_diaria      DECIMAL(10,2)    NOT NULL DEFAULT 0.00,
  mensagens_recebidas INT UNSIGNED     NOT NULL DEFAULT 0,
  mensagens_respondidas INT UNSIGNED   NOT NULL DEFAULT 0,
  criado_em           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_vendedor_data (vendedor_id, data),
  INDEX idx_data           (data),
  INDEX idx_vendedor       (vendedor_id),

  CONSTRAINT fk_vanalytics_vendedor
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
  AND table_name IN ('anuncio_analytics', 'vendedor_analytics')
ORDER BY table_name;
