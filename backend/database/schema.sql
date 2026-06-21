-- ============================================================
-- LINKA — Esquema Completo da Base de Dados
-- Marketplace Local — Moçambique
-- Versão: 1.0 | Data: 2026-05-08
-- ============================================================
-- Execução:
--   mysql -u root -p < schema.sql
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;
SET time_zone = '+02:00'; -- Fuso horário de Moçambique (CAT)

-- ============================================================
-- BASE DE DADOS
-- ============================================================
CREATE DATABASE IF NOT EXISTS linka_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE linka_db;

-- ============================================================
-- TABELA 1: planos_premium
-- Tem de existir antes de vendedores e subscricoes
-- ============================================================
CREATE TABLE IF NOT EXISTS planos_premium (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome                VARCHAR(100)     NOT NULL,
  descricao           TEXT,
  preco_mensal        DECIMAL(10,2)    NOT NULL DEFAULT 0.00,
  max_produtos        INT              NOT NULL DEFAULT 5,
  destaque_anuncios   TINYINT(1)       NOT NULL DEFAULT 0,
  loja_personalizada  TINYINT(1)       NOT NULL DEFAULT 0,
  analytics_avancado  TINYINT(1)       NOT NULL DEFAULT 0,
  activo              TINYINT(1)       NOT NULL DEFAULT 1,
  criado_em           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_em      TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- TABELA 2: utilizadores
-- Base de todos os tipos de conta
-- ============================================================
CREATE TABLE IF NOT EXISTS utilizadores (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome                VARCHAR(150)     NOT NULL,
  email               VARCHAR(255)     NOT NULL,
  telefone            VARCHAR(20),
  senha_hash          VARCHAR(255)     NOT NULL,
  tipo                ENUM(
                        'cliente',
                        'vendedor',
                        'prestador',
                        'entregador',
                        'admin'
                      )                NOT NULL DEFAULT 'cliente',
  estado              ENUM(
                        'activo',
                        'inactivo',
                        'suspenso',
                        'banido'
                      )                NOT NULL DEFAULT 'activo',
  avatar              VARCHAR(500),
  cidade              VARCHAR(100),
  bairro              VARCHAR(100),
  latitude            DECIMAL(10, 8),
  longitude           DECIMAL(11, 8),
  verificado          TINYINT(1)       NOT NULL DEFAULT 0,
  pontos_reputacao    INT              NOT NULL DEFAULT 0,
  refresh_token       TEXT,
  ultimo_acesso_em    TIMESTAMP        NULL,
  criado_em           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_em      TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_email     (email),
  UNIQUE KEY uq_telefone  (telefone),
  INDEX idx_tipo          (tipo),
  INDEX idx_estado        (estado),
  INDEX idx_cidade        (cidade),
  INDEX idx_localizacao   (latitude, longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- TABELA 3: vendedores
-- Perfil extendido de utilizadores do tipo vendedor/prestador
-- ============================================================
CREATE TABLE IF NOT EXISTS vendedores (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  utilizador_id       INT UNSIGNED     NOT NULL,
  nome_loja           VARCHAR(200)     NOT NULL,
  descricao_loja      TEXT,
  logo_loja           VARCHAR(500),
  banner_loja         VARCHAR(500),
  plano               ENUM(
                        'gratuito',
                        'basico',
                        'pro',
                        'premium'
                      )                NOT NULL DEFAULT 'gratuito',
  plano_expira_em     TIMESTAMP        NULL,
  total_vendas        INT UNSIGNED     NOT NULL DEFAULT 0,
  avaliacao_media     DECIMAL(3, 2)    NOT NULL DEFAULT 0.00,
  total_avaliacoes    INT UNSIGNED     NOT NULL DEFAULT 0,
  aprovado            TINYINT(1)       NOT NULL DEFAULT 0,
  criado_em           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_em      TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_utilizador  (utilizador_id),
  INDEX idx_plano           (plano),
  INDEX idx_aprovado        (aprovado),

  CONSTRAINT fk_vendedores_utilizador
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- TABELA 4: subscricoes
-- Planos premium activos dos vendedores
-- ============================================================
CREATE TABLE IF NOT EXISTS subscricoes (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vendedor_id         INT UNSIGNED     NOT NULL,
  plano_id            INT UNSIGNED     NOT NULL,
  estado              ENUM(
                        'activa',
                        'expirada',
                        'cancelada',
                        'pendente'
                      )                NOT NULL DEFAULT 'pendente',
  valor_pago          DECIMAL(10, 2)   NOT NULL DEFAULT 0.00,
  inicio_em           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fim_em              TIMESTAMP        NULL,
  referencia_pagamento VARCHAR(255),
  criado_em           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_em      TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_vendedor  (vendedor_id),
  INDEX idx_estado    (estado),

  CONSTRAINT fk_subscricoes_vendedor
    FOREIGN KEY (vendedor_id) REFERENCES vendedores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_subscricoes_plano
    FOREIGN KEY (plano_id) REFERENCES planos_premium(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- TABELA 5: categorias
-- Hierárquica (pai/subcategoria)
-- ============================================================
CREATE TABLE IF NOT EXISTS categorias (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pai_id              INT UNSIGNED     NULL,
  nome                VARCHAR(150)     NOT NULL,
  descricao           TEXT,
  icone               VARCHAR(100),
  slug                VARCHAR(150)     NOT NULL,
  imagem              VARCHAR(500),
  ordem               INT              NOT NULL DEFAULT 0,
  activa              TINYINT(1)       NOT NULL DEFAULT 1,
  criado_em           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_em      TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_slug  (slug),
  INDEX idx_pai       (pai_id),
  INDEX idx_activa    (activa),

  CONSTRAINT fk_categorias_pai
    FOREIGN KEY (pai_id) REFERENCES categorias(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- TABELA 6: produtos
-- Anúncios publicados pelos vendedores
-- ============================================================
CREATE TABLE IF NOT EXISTS produtos (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vendedor_id         INT UNSIGNED     NOT NULL,
  categoria_id        INT UNSIGNED     NOT NULL,
  titulo              VARCHAR(255)     NOT NULL,
  descricao           TEXT             NOT NULL,
  preco               DECIMAL(10, 2)   NOT NULL,
  preco_negociavel    TINYINT(1)       NOT NULL DEFAULT 0,
  stock               INT              NOT NULL DEFAULT 1,
  estado_produto      ENUM(
                        'novo',
                        'usado',
                        'recondicionado'
                      )                NOT NULL DEFAULT 'novo',
  condicao            ENUM(
                        'disponivel',
                        'indisponivel',
                        'pausado',
                        'vendido'
                      )                NOT NULL DEFAULT 'disponivel',
  cidade              VARCHAR(100),
  bairro              VARCHAR(100),
  latitude            DECIMAL(10, 8),
  longitude           DECIMAL(11, 8),
  destacado           TINYINT(1)       NOT NULL DEFAULT 0,
  destacado_ate       TIMESTAMP        NULL,
  total_visualizacoes INT UNSIGNED     NOT NULL DEFAULT 0,
  total_likes         INT UNSIGNED     NOT NULL DEFAULT 0,
  total_favoritos     INT UNSIGNED     NOT NULL DEFAULT 0,
  aprovado            TINYINT(1)       NOT NULL DEFAULT 1,
  video_url           VARCHAR(500),
  anunciado           TINYINT(1)       NOT NULL DEFAULT 0,
  anunciado_ate       TIMESTAMP        NULL,
  criado_em           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_em      TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_vendedor      (vendedor_id),
  INDEX idx_categoria     (categoria_id),
  INDEX idx_condicao      (condicao),
  INDEX idx_destacado     (destacado),
  INDEX idx_preco         (preco),
  INDEX idx_cidade        (cidade),
  INDEX idx_localizacao   (latitude, longitude),
  FULLTEXT idx_busca      (titulo, descricao),

  CONSTRAINT fk_produtos_vendedor
    FOREIGN KEY (vendedor_id) REFERENCES vendedores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_produtos_categoria
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- TABELA 7: imagens_produto
-- Fotos associadas a cada produto
-- ============================================================
CREATE TABLE IF NOT EXISTS imagens_produto (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  produto_id          INT UNSIGNED     NOT NULL,
  caminho             VARCHAR(500)     NOT NULL,
  principal           TINYINT(1)       NOT NULL DEFAULT 0,
  ordem               INT              NOT NULL DEFAULT 0,
  criado_em           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_produto   (produto_id),

  CONSTRAINT fk_imagens_produto
    FOREIGN KEY (produto_id) REFERENCES produtos(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- TABELA 8: favoritos
-- Produtos guardados pelos clientes
-- ============================================================
CREATE TABLE IF NOT EXISTS favoritos (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  utilizador_id       INT UNSIGNED     NOT NULL,
  produto_id          INT UNSIGNED     NOT NULL,
  criado_em           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_favorito  (utilizador_id, produto_id),
  INDEX idx_utilizador    (utilizador_id),
  INDEX idx_produto       (produto_id),

  CONSTRAINT fk_favoritos_utilizador
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_favoritos_produto
    FOREIGN KEY (produto_id) REFERENCES produtos(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- TABELA 9: pedidos
-- Encomendas feitas pelos clientes
-- ============================================================
CREATE TABLE IF NOT EXISTS pedidos (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cliente_id          INT UNSIGNED     NOT NULL,
  vendedor_id         INT UNSIGNED     NOT NULL,
  estado              ENUM(
                        'pendente',
                        'confirmado',
                        'preparando',
                        'pronto',
                        'enviado',
                        'entregue',
                        'cancelado',
                        'reembolsado'
                      )                NOT NULL DEFAULT 'pendente',
  subtotal            DECIMAL(10, 2)   NOT NULL DEFAULT 0.00,
  taxa_entrega        DECIMAL(10, 2)   NOT NULL DEFAULT 0.00,
  total               DECIMAL(10, 2)   NOT NULL DEFAULT 0.00,
  metodo_pagamento    ENUM(
                        'mpesa',
                        'emola',
                        'dinheiro',
                        'transferencia'
                      )                NOT NULL DEFAULT 'dinheiro',
  estado_pagamento    ENUM(
                        'pendente',
                        'pago',
                        'falhado',
                        'reembolsado'
                      )                NOT NULL DEFAULT 'pendente',
  referencia_pagamento VARCHAR(255),
  notas               TEXT,
  endereco_entrega    TEXT,
  latitude_entrega    DECIMAL(10, 8),
  longitude_entrega   DECIMAL(11, 8),
  cancelado_motivo    TEXT,
  criado_em           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_em      TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_cliente   (cliente_id),
  INDEX idx_vendedor  (vendedor_id),
  INDEX idx_estado    (estado),

  CONSTRAINT fk_pedidos_cliente
    FOREIGN KEY (cliente_id) REFERENCES utilizadores(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT fk_pedidos_vendedor
    FOREIGN KEY (vendedor_id) REFERENCES vendedores(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- TABELA 10: itens_pedido
-- Linhas de cada pedido (produto + quantidade + preço)
-- ============================================================
CREATE TABLE IF NOT EXISTS itens_pedido (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pedido_id           INT UNSIGNED     NOT NULL,
  produto_id          INT UNSIGNED     NOT NULL,
  titulo_produto      VARCHAR(255)     NOT NULL, -- snapshot do título no momento da compra
  preco_unitario      DECIMAL(10, 2)   NOT NULL,
  quantidade          INT UNSIGNED     NOT NULL DEFAULT 1,
  subtotal            DECIMAL(10, 2)   NOT NULL,
  criado_em           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_pedido    (pedido_id),
  INDEX idx_produto   (produto_id),

  CONSTRAINT fk_itens_pedido
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_itens_produto
    FOREIGN KEY (produto_id) REFERENCES produtos(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- TABELA 11: entregas
-- Pedido de entrega associado a um pedido
-- ============================================================
CREATE TABLE IF NOT EXISTS entregas (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pedido_id           INT UNSIGNED     NOT NULL,
  entregador_id       INT UNSIGNED     NULL, -- NULL até ser aceite por um entregador
  estado              ENUM(
                        'aguardando',
                        'aceite',
                        'a_caminho',
                        'entregue',
                        'falhou',
                        'cancelado'
                      )                NOT NULL DEFAULT 'aguardando',
  endereco_origem     TEXT             NOT NULL,
  endereco_destino    TEXT             NOT NULL,
  latitude_origem     DECIMAL(10, 8),
  longitude_origem    DECIMAL(11, 8),
  latitude_destino    DECIMAL(10, 8),
  longitude_destino   DECIMAL(11, 8),
  latitude_actual     DECIMAL(10, 8),  -- posição actual do entregador (GPS em tempo real)
  longitude_actual    DECIMAL(11, 8),
  preco_entrega       DECIMAL(10, 2)   NOT NULL DEFAULT 0.00,
  distancia_km        DECIMAL(8, 2),
  notas               TEXT,
  aceite_em           TIMESTAMP        NULL,
  entregue_em         TIMESTAMP        NULL,
  criado_em           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_em      TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_pedido    (pedido_id),
  INDEX idx_entregador    (entregador_id),
  INDEX idx_estado        (estado),

  CONSTRAINT fk_entregas_pedido
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_entregas_entregador
    FOREIGN KEY (entregador_id) REFERENCES utilizadores(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- TABELA 12: conversas
-- Canal de chat entre dois utilizadores sobre um produto
-- ============================================================
CREATE TABLE IF NOT EXISTS conversas (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  utilizador1_id      INT UNSIGNED     NOT NULL,
  utilizador2_id      INT UNSIGNED     NOT NULL,
  produto_id          INT UNSIGNED     NULL,  -- produto que originou a conversa (opcional)
  ultima_mensagem_em  TIMESTAMP        NULL,
  criado_em           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_conversa          (utilizador1_id, utilizador2_id, produto_id),
  INDEX idx_utilizador1           (utilizador1_id),
  INDEX idx_utilizador2           (utilizador2_id),
  INDEX idx_ultima_mensagem       (ultima_mensagem_em),

  CONSTRAINT fk_conversas_user1
    FOREIGN KEY (utilizador1_id) REFERENCES utilizadores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_conversas_user2
    FOREIGN KEY (utilizador2_id) REFERENCES utilizadores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_conversas_produto
    FOREIGN KEY (produto_id) REFERENCES produtos(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- TABELA 13: mensagens
-- Mensagens individuais dentro de cada conversa
-- ============================================================
CREATE TABLE IF NOT EXISTS mensagens (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conversa_id         INT UNSIGNED     NOT NULL,
  remetente_id        INT UNSIGNED     NOT NULL,
  conteudo            TEXT             NOT NULL,
  tipo                ENUM(
                        'texto',
                        'imagem',
                        'localizacao',
                        'sistema'
                      )                NOT NULL DEFAULT 'texto',
  lida                TINYINT(1)       NOT NULL DEFAULT 0,
  eliminada           TINYINT(1)       NOT NULL DEFAULT 0,
  criado_em           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_conversa  (conversa_id),
  INDEX idx_remetente (remetente_id),
  INDEX idx_lida      (lida),

  CONSTRAINT fk_mensagens_conversa
    FOREIGN KEY (conversa_id) REFERENCES conversas(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_mensagens_remetente
    FOREIGN KEY (remetente_id) REFERENCES utilizadores(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- TABELA 14: notificacoes
-- Alertas persistidos para cada utilizador
-- ============================================================
CREATE TABLE IF NOT EXISTS notificacoes (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  utilizador_id       INT UNSIGNED     NOT NULL,
  titulo              VARCHAR(255)     NOT NULL,
  corpo               TEXT             NOT NULL,
  link                VARCHAR(500),
  tipo                ENUM(
                        'pedido',
                        'mensagem',
                        'entrega',
                        'avaliacao',
                        'sistema',
                        'promocao',
                        'denuncia'
                      )                NOT NULL DEFAULT 'sistema',
  dados_json          JSON,
  lida                TINYINT(1)       NOT NULL DEFAULT 0,
  criado_em           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_utilizador    (utilizador_id),
  INDEX idx_lida          (lida),
  INDEX idx_tipo          (tipo),

  CONSTRAINT fk_notificacoes_utilizador
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- TABELA 15: avaliacoes
-- Avaliações de produto, vendedor ou entregador
-- ============================================================
CREATE TABLE IF NOT EXISTS avaliacoes (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  avaliador_id        INT UNSIGNED     NOT NULL,
  avaliado_id         INT UNSIGNED     NOT NULL, -- utilizador que é avaliado
  produto_id          INT UNSIGNED     NULL,
  pedido_id           INT UNSIGNED     NULL,
  estrelas            TINYINT UNSIGNED NULL CHECK (estrelas BETWEEN 1 AND 5),
  comentario          TEXT,
  tipo                ENUM(
                        'produto',
                        'vendedor',
                        'entregador'
                      )                NOT NULL,
  criado_em           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_avaliador (avaliador_id),
  INDEX idx_avaliado  (avaliado_id),
  INDEX idx_produto   (produto_id),
  INDEX idx_tipo      (tipo),

  CONSTRAINT fk_avaliacoes_avaliador
    FOREIGN KEY (avaliador_id) REFERENCES utilizadores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_avaliacoes_avaliado
    FOREIGN KEY (avaliado_id) REFERENCES utilizadores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_avaliacoes_produto
    FOREIGN KEY (produto_id) REFERENCES produtos(id)
    ON DELETE SET NULL ON UPDATE CASCADE,

  CONSTRAINT fk_avaliacoes_pedido
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- TABELA 16: denuncias
-- Reportes de comportamento indevido
-- ============================================================
CREATE TABLE IF NOT EXISTS denuncias (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  denunciante_id      INT UNSIGNED     NOT NULL,
  denunciado_id       INT UNSIGNED     NULL,
  produto_id          INT UNSIGNED     NULL,
  motivo              ENUM(
                        'fraude',
                        'conteudo_inapropriado',
                        'spam',
                        'produto_falso',
                        'preco_abusivo',
                        'outro'
                      )                NOT NULL,
  descricao           TEXT             NOT NULL,
  estado              ENUM(
                        'pendente',
                        'em_analise',
                        'resolvida',
                        'rejeitada'
                      )                NOT NULL DEFAULT 'pendente',
  admin_id            INT UNSIGNED     NULL,
  resposta_admin      TEXT,
  criado_em           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolvida_em        TIMESTAMP        NULL,
  actualizado_em      TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_denunciante   (denunciante_id),
  INDEX idx_denunciado    (denunciado_id),
  INDEX idx_estado        (estado),

  CONSTRAINT fk_denuncias_denunciante
    FOREIGN KEY (denunciante_id) REFERENCES utilizadores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_denuncias_denunciado
    FOREIGN KEY (denunciado_id) REFERENCES utilizadores(id)
    ON DELETE SET NULL ON UPDATE CASCADE,

  CONSTRAINT fk_denuncias_produto
    FOREIGN KEY (produto_id) REFERENCES produtos(id)
    ON DELETE SET NULL ON UPDATE CASCADE,

  CONSTRAINT fk_denuncias_admin
    FOREIGN KEY (admin_id) REFERENCES utilizadores(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- TABELA 17: sancoes
-- Avisos, suspensões e banimentos aplicados pelo admin
-- ============================================================
CREATE TABLE IF NOT EXISTS sancoes (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  utilizador_id       INT UNSIGNED     NOT NULL,
  admin_id            INT UNSIGNED     NOT NULL,
  tipo                ENUM(
                        'aviso',
                        'suspensao',
                        'banimento'
                      )                NOT NULL,
  motivo              TEXT             NOT NULL,
  expira_em           TIMESTAMP        NULL, -- NULL = permanente (banimento)
  activa              TINYINT(1)       NOT NULL DEFAULT 1,
  criado_em           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_em      TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_utilizador    (utilizador_id),
  INDEX idx_tipo          (tipo),
  INDEX idx_activa        (activa),

  CONSTRAINT fk_sancoes_utilizador
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_sancoes_admin
    FOREIGN KEY (admin_id) REFERENCES utilizadores(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- VERIFICAÇÃO FINAL
-- ============================================================
SELECT
  table_name    AS 'Tabela',
  table_rows    AS 'Registos',
  engine        AS 'Motor'
FROM information_schema.tables
WHERE table_schema = 'linka_db'
ORDER BY table_name;
