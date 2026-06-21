-- ============================================================
-- LINKA — Migration Fase 7: Sistema de Anúncios Patrocinados
-- ============================================================

SET NAMES utf8mb4;

-- ============================================================
-- TABELA: anuncios_patrocinados
-- Anúncios criados por vendedores
-- ============================================================
CREATE TABLE IF NOT EXISTS anuncios_patrocinados (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vendedor_id         INT UNSIGNED     NOT NULL,
  produto_id          INT UNSIGNED     NOT NULL,
  titulo              VARCHAR(150)     NOT NULL,
  orcamento_diario    DECIMAL(10,2)    NOT NULL DEFAULT 5.00,
  custo_por_clique    DECIMAL(10,2)    NOT NULL DEFAULT 0.50,
  gasto_total         DECIMAL(10,2)    NOT NULL DEFAULT 0.00,
  cliques_total       INT UNSIGNED     NOT NULL DEFAULT 0,
  impressoes_total    INT UNSIGNED     NOT NULL DEFAULT 0,
  data_inicio         DATE             NOT NULL,
  data_fim            DATE             NOT NULL,
  estado              ENUM('pendente', 'activo', 'pausado', 'expirado', 'sem_saldo') NOT NULL DEFAULT 'pendente',
  destino             ENUM('feed', 'reels', 'explore', 'pesquisa', 'todos') NOT NULL DEFAULT 'todos',
  criado_em           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em       TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_vendedor     (vendedor_id, estado),
  INDEX idx_produto      (produto_id),
  INDEX idx_estado       (estado, data_inicio, data_fim),
  INDEX idx_data         (data_inicio, data_fim),

  CONSTRAINT fk_ap_vendedor
    FOREIGN KEY (vendedor_id) REFERENCES vendedores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_ap_produto
    FOREIGN KEY (produto_id) REFERENCES produtos(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- TABELA: anuncios_impressoes
-- Tracking de impressões e cliques
-- ============================================================
CREATE TABLE IF NOT EXISTS anuncios_impressoes (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  anuncio_id          INT UNSIGNED     NOT NULL,
  utilizador_id       INT UNSIGNED     NULL,
  session_id          VARCHAR(100)     NULL,
  tipo_evento         ENUM('impressao', 'clique') NOT NULL,
  ip_address          VARCHAR(45)      NULL,
  user_agent          VARCHAR(500)     NULL,
  criado_em           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_anuncio       (anuncio_id, criado_em),
  INDEX idx_utilizador    (utilizador_id),
  INDEX idx_tipo          (tipo_evento),
  INDEX idx_criado_em     (criado_em),

  CONSTRAINT fk_ai_anuncio
    FOREIGN KEY (anuncio_id) REFERENCES anuncios_patrocinados(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- TABELA: anuncios_gasto_diario
-- Controlo de gasto diário por anúncio
-- ============================================================
CREATE TABLE IF NOT EXISTS anuncios_gasto_diario (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  anuncio_id          INT UNSIGNED     NOT NULL,
  data                DATE             NOT NULL,
  impressoes          INT UNSIGNED     NOT NULL DEFAULT 0,
  cliques             INT UNSIGNED     NOT NULL DEFAULT 0,
  gasto               DECIMAL(10,2)    NOT NULL DEFAULT 0.00,

  UNIQUE KEY uq_anuncio_data (anuncio_id, data),
  INDEX idx_data (data),

  CONSTRAINT fk_agd_anuncio
    FOREIGN KEY (anuncio_id) REFERENCES anuncios_patrocinados(id)
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
  AND table_name IN ('anuncios_patrocinados', 'anuncios_impressoes', 'anuncios_gasto_diario')
ORDER BY table_name;
