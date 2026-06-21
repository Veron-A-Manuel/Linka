-- ============================================================
-- LINKA — Migration: Funcionalidades de Interação entre Clientes
-- Seguidores, Likes/Respostas a Comentários, Vistos Recentemente,
-- Carrinho de Compras, Preferências do Utilizador
-- ============================================================

SET NAMES utf8mb4;


-- ============================================================
-- TABELA: seguidores
-- Seguir vendedores (relação utilizador → vendedor)
-- ============================================================
CREATE TABLE IF NOT EXISTS seguidores (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  seguidor_id         INT UNSIGNED     NOT NULL,
  vendedor_id         INT UNSIGNED     NOT NULL,
  criado_em           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_seguidor_vendedor (seguidor_id, vendedor_id),
  INDEX idx_vendedor  (vendedor_id),
  INDEX idx_criado    (criado_em),

  CONSTRAINT fk_seguidor_utilizador
    FOREIGN KEY (seguidor_id) REFERENCES utilizadores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_seguidor_vendedor
    FOREIGN KEY (vendedor_id) REFERENCES utilizadores(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- TABELA: comentario_likes
-- Likes em comentários de produtos
-- ============================================================
CREATE TABLE IF NOT EXISTS comentario_likes (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  comentario_id       INT UNSIGNED     NOT NULL,
  utilizador_id       INT UNSIGNED     NOT NULL,
  criado_em           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_comentario_like (comentario_id, utilizador_id),
  INDEX idx_comentario (comentario_id),
  INDEX idx_utilizador (utilizador_id),

  CONSTRAINT fk_comlike_comentario
    FOREIGN KEY (comentario_id) REFERENCES avaliacoes(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_comlike_utilizador
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- TABELA: comentario_respostas
-- Respostas a comentários (threading)
-- ============================================================
CREATE TABLE IF NOT EXISTS comentario_respostas (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  comentario_id       INT UNSIGNED     NOT NULL,
  utilizador_id       INT UNSIGNED     NOT NULL,
  texto               TEXT             NOT NULL,
  criado_em           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_comentario (comentario_id),
  INDEX idx_utilizador (utilizador_id),
  INDEX idx_criado     (criado_em),

  CONSTRAINT fk_comresp_comentario
    FOREIGN KEY (comentario_id) REFERENCES avaliacoes(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_comresp_utilizador
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- TABELA: recentemente_vistos
-- Produtos vistos recentemente pelo utilizador
-- ============================================================
CREATE TABLE IF NOT EXISTS recentemente_vistos (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  utilizador_id       INT UNSIGNED     NOT NULL,
  produto_id          INT UNSIGNED     NOT NULL,
  criado_em           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_visto (utilizador_id, produto_id),
  INDEX idx_utilizador (utilizador_id),
  INDEX idx_criado     (criado_em),

  CONSTRAINT fk_visto_utilizador
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_visto_produto
    FOREIGN KEY (produto_id) REFERENCES produtos(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- TABELA: carrinho
-- Carrinho de compras por utilizador
-- ============================================================
CREATE TABLE IF NOT EXISTS carrinho (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  utilizador_id       INT UNSIGNED     NOT NULL,
  produto_id          INT UNSIGNED     NOT NULL,
  quantidade          INT UNSIGNED     NOT NULL DEFAULT 1,
  criado_em           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_em      TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_carrinho_item (utilizador_id, produto_id),
  INDEX idx_utilizador (utilizador_id),

  CONSTRAINT fk_carrinho_utilizador
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_carrinho_produto
    FOREIGN KEY (produto_id) REFERENCES produtos(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- TABELA: preferencias_utilizador
-- Preferências e configurações do utilizador
-- ============================================================
CREATE TABLE IF NOT EXISTS preferencias_utilizador (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  utilizador_id       INT UNSIGNED     NOT NULL,
  notificacoes_push   TINYINT(1)       NOT NULL DEFAULT 1,
  notificacoes_chat   TINYINT(1)       NOT NULL DEFAULT 1,
  notificacoes_promo  TINYINT(1)       NOT NULL DEFAULT 1,
  notificacoes_pedido TINYINT(1)       NOT NULL DEFAULT 1,
  perfil_visivel      TINYINT(1)       NOT NULL DEFAULT 1,
  mostrar_email       TINYINT(1)       NOT NULL DEFAULT 0,
  mostrar_telefone    TINYINT(1)       NOT NULL DEFAULT 0,
  idioma              VARCHAR(10)      NOT NULL DEFAULT 'pt',
  moeda               VARCHAR(5)       NOT NULL DEFAULT 'MZN',
  criado_em           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_em      TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_preferencia (utilizador_id),

  CONSTRAINT fk_pref_utilizador
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
  AND table_name IN ('seguidores', 'comentario_likes', 'comentario_respostas',
                     'recentemente_vistos', 'carrinho', 'preferencias_utilizador')
ORDER BY table_name;
