-- ============================================================
-- LINKA — Migration Fase 7v2: Anúncios Dinâmicos + Segmentação
-- ============================================================

SET NAMES utf8mb4;

-- ============================================================
-- NOVAS COLUNAS em anuncios_patrocinados
-- ============================================================
ALTER TABLE anuncios_patrocinados
  ADD COLUMN tipo_anuncio ENUM('imagem','video','oferta','animated') NOT NULL DEFAULT 'imagem' AFTER destino,
  ADD COLUMN texto_oferta VARCHAR(255) NULL AFTER tipo_anuncio,
  ADD COLUMN link_externo VARCHAR(500) NULL AFTER texto_oferta,
  ADD COLUMN categorias_alvo JSON NULL AFTER link_externo,
  ADD COLUMN cidades_alvo JSON NULL AFTER categorias_alvo,
  ADD COLUMN prioridade INT UNSIGNED NOT NULL DEFAULT 0 AFTER cidades_alvo;

ALTER TABLE anuncios_patrocinados
  ADD INDEX idx_tipo (tipo_anuncio),
  ADD INDEX idx_prioridade (prioridade DESC);


-- ============================================================
-- TABELA: anuncios_vistos_utilizador
-- Controlo de frequência por utilizador
-- ============================================================
CREATE TABLE IF NOT EXISTS anuncios_vistos_utilizador (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  utilizador_id       INT UNSIGNED     NOT NULL,
  anuncio_id          INT UNSIGNED     NOT NULL,
  vezes_visto         INT UNSIGNED     NOT NULL DEFAULT 1,
  cliou               TINYINT(1)       NOT NULL DEFAULT 0,
  ultimo_visto_em     TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  criado_em           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_utilizador_anuncio (utilizador_id, anuncio_id),
  INDEX idx_anuncio (anuncio_id),

  CONSTRAINT fk_avu_utilizador
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_avu_anuncio
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
  AND table_name IN ('anuncios_patrocinados', 'anuncios_vistos_utilizador')
ORDER BY table_name;
