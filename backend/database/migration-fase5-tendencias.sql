-- ============================================================
-- LINKA — Migration Fase 5: Tendências + Conteúdo em Alta
-- ============================================================

SET NAMES utf8mb4;

-- ============================================================
-- TABELA: tendencias
-- Topics/hashtags em tendência (actualizados periodicamente)
-- ============================================================
CREATE TABLE IF NOT EXISTS tendencias (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  termo               VARCHAR(100)     NOT NULL,
  tipo                ENUM('hashtag', 'categoria', 'localizacao', 'marca') NOT NULL DEFAULT 'hashtag',
  categoria_id        INT UNSIGNED     NULL,
  contagem            INT UNSIGNED     NOT NULL DEFAULT 0,
  tendencia_score     DECIMAL(10,2)    NOT NULL DEFAULT 0.00,
  periodo             ENUM('1h', '6h', '24h', '7d') NOT NULL DEFAULT '24h',
  dados_extras        JSON             NULL,
  activo              TINYINT(1)       NOT NULL DEFAULT 1,
  criado_em           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em       TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_termo_tipo_periodo (termo, tipo, periodo),
  INDEX idx_tipo        (tipo, activo),
  INDEX idx_periodo     (periodo, activo),
  INDEX idx_score       (tendencia_score DESC),
  INDEX idx_categoria   (categoria_id),

  CONSTRAINT fk_tendencia_categoria
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- TABELA: conteudo_alta
-- Produtos/content em alta (populares recentemente)
-- ============================================================
CREATE TABLE IF NOT EXISTS conteudo_alta (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  produto_id          INT UNSIGNED     NOT NULL,
  metrica_principal   ENUM('visualizacoes', 'likes', 'favoritos', 'comentarios', 'partilhas', 'pedidos') NOT NULL DEFAULT 'visualizacoes',
  pontuacao           DECIMAL(10,2)    NOT NULL DEFAULT 0.00,
  periodo             ENUM('1h', '6h', '24h', '7d') NOT NULL DEFAULT '24h',
  posicao             INT UNSIGNED     NULL,
  criado_em           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em       TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_produto_metrica_periodo (produto_id, metrica_principal, periodo),
  INDEX idx_periodo       (periodo),
  INDEX idx_metrica       (metrica_principal, pontuacao DESC),
  INDEX idx_pontuacao     (pontuacao DESC),

  CONSTRAINT fk_ca_produto
    FOREIGN KEY (produto_id) REFERENCES produtos(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- TABELA: palavras_chave_tendencia
-- Palavras extraídas de títulos/descrições para detecção
-- ============================================================
CREATE TABLE IF NOT EXISTS palavras_chave_tendencia (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  palavra             VARCHAR(100)     NOT NULL,
  produto_id          INT UNSIGNED     NOT NULL,
  criado_em           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_palavra    (palavra),
  INDEX idx_produto    (produto_id),

  CONSTRAINT fk_pckt_produto
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
  AND table_name IN ('tendencias', 'conteudo_alta', 'palavras_chave_tendencia')
ORDER BY table_name;
