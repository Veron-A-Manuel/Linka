-- ============================================================
-- LINKA — Dados de Seed para Testes
-- Executar APÓS o schema.sql
-- ============================================================
-- Execução:
--   mysql -u root -p linka_db < seeds.sql
-- ============================================================

SET NAMES utf8mb4;
USE linka_db;

-- ============================================================
-- PLANOS PREMIUM
-- ============================================================
INSERT INTO planos_premium (nome, descricao, preco_mensal, max_produtos, destaque_anuncios, loja_personalizada, analytics_avancado) VALUES
('Gratuito',  'Plano base sem custo. Ideal para começar.',               0.00,    5,  0, 0, 0),
('Básico',    'Para vendedores a crescer. Mais produtos e visibilidade.', 50.00,  20, 0, 0, 0),
('Pro',       'Para vendas frequentes. Destaque nos anúncios.',           100.00,  50, 1, 0, 0),
('Premium',   'Para lojas estabelecidas. Tudo incluído.',                 150.00,  -1, 1, 1, 1);
-- Nota: max_produtos = -1 significa ilimitado

-- ============================================================
-- CATEGORIAS PRINCIPAIS
-- ============================================================
INSERT INTO categorias (pai_id, nome, icone, slug, ordem) VALUES
(NULL, 'Alimentos & Encomendas', 'fa-utensils',      'alimentos-encomendas', 1),
(NULL, 'Serviços',               'fa-tools',          'servicos',             2),
(NULL, 'Electrónica',            'fa-mobile-alt',     'electronica',          3),
(NULL, 'Vestuário & Moda',       'fa-tshirt',         'vestuario-moda',       4),
(NULL, 'Casa & Jardim',          'fa-home',           'casa-jardim',          5),
(NULL, 'Veículos',               'fa-car',            'veiculos',             6),
(NULL, 'Imóveis',                'fa-building',       'imoveis',              7),
(NULL, 'Animais',                'fa-paw',            'animais',              8);

-- ============================================================
-- SUBCATEGORIAS — Alimentos & Encomendas (id=1)
-- ============================================================
INSERT INTO categorias (pai_id, nome, icone, slug, ordem) VALUES
(1, 'Bolos & Doces',     'fa-birthday-cake', 'bolos-doces',    1),
(1, 'Salgados',          'fa-drumstick-bite','salgados',        2),
(1, 'Fast Food',         'fa-hamburger',     'fast-food',       3),
(1, 'Comida Caseira',    'fa-pepper-hot',    'comida-caseira',  4),
(1, 'Bebidas',           'fa-glass-cheers',  'bebidas',         5);

-- ============================================================
-- SUBCATEGORIAS — Serviços (id=2)
-- ============================================================
INSERT INTO categorias (pai_id, nome, icone, slug, ordem) VALUES
(2, 'Mecânico',              'fa-wrench',         'mecanico',              1),
(2, 'Carpintaria',           'fa-hammer',         'carpintaria',           2),
(2, 'Electricista',          'fa-bolt',           'electricista',          3),
(2, 'Canalizador',           'fa-faucet',         'canalizador',           4),
(2, 'Serralharia',           'fa-key',            'serralharia',           5),
(2, 'Design Gráfico',        'fa-palette',        'design-grafico',        6),
(2, 'Gestão de Redes',       'fa-share-alt',      'gestao-redes',          7),
(2, 'Limpeza',               'fa-broom',          'limpeza',               8);

-- ============================================================
-- UTILIZADORES DE TESTE
-- Senha de todos: Linka@2026
-- Hash bcrypt de "Linka@2026" (12 rounds)
-- ============================================================
INSERT INTO utilizadores (nome, email, telefone, senha_hash, tipo, estado, cidade, bairro, verificado) VALUES
-- Admin
('Admin Linka',       'admin@linka.co.mz',     '+258840000001', '$2b$12$rQnuJjRKGHaBeVDFaGqfPOoTN.AKPlk0bUz6sn6RRl7Bfr7s.nKaG', 'admin',     'activo', 'Maputo',    'Sommerschield', 1),
-- Vendedores
('Maria Filomena',    'maria@linka.co.mz',     '+258840000002', '$2b$12$rQnuJjRKGHaBeVDFaGqfPOoTN.AKPlk0bUz6sn6RRl7Bfr7s.nKaG', 'vendedor',  'activo', 'Maputo',    'Polana',        1),
('João Machava',      'joao@linka.co.mz',      '+258840000003', '$2b$12$rQnuJjRKGHaBeVDFaGqfPOoTN.AKPlk0bUz6sn6RRl7Bfr7s.nKaG', 'vendedor',  'activo', 'Matola',    'Fomento',       1),
('Carlos Mecânico',   'carlos@linka.co.mz',    '+258840000004', '$2b$12$rQnuJjRKGHaBeVDFaGqfPOoTN.AKPlk0bUz6sn6RRl7Bfr7s.nKaG', 'prestador', 'activo', 'Maputo',    'Maxaquene',     1),
-- Clientes
('Ana Sitoe',         'ana@linka.co.mz',       '+258840000005', '$2b$12$rQnuJjRKGHaBeVDFaGqfPOoTN.AKPlk0bUz6sn6RRl7Bfr7s.nKaG', 'cliente',   'activo', 'Maputo',    'Alto-Maé',      1),
('Pedro Cossa',       'pedro@linka.co.mz',     '+258840000006', '$2b$12$rQnuJjRKGHaBeVDFaGqfPOoTN.AKPlk0bUz6sn6RRl7Bfr7s.nKaG', 'cliente',   'activo', 'Matola',    'Liberdade',     0),
-- Entregador
('Fábio Entregas',    'fabio@linka.co.mz',     '+258840000007', '$2b$12$rQnuJjRKGHaBeVDFaGqfPOoTN.AKPlk0bUz6sn6RRl7Bfr7s.nKaG', 'entregador','activo', 'Maputo',    'Hulene',        1);

-- ============================================================
-- PERFIS DE VENDEDOR
-- ============================================================
INSERT INTO vendedores (utilizador_id, nome_loja, descricao_loja, plano, aprovado) VALUES
(2, 'Bolos da Maria',      'Os melhores bolos e doces artesanais de Maputo. Encomendas para todas as ocasiões!', 'pro',      1),
(3, 'Loja do João Tech',   'Electrónica, acessórios e gadgets. Qualidade garantida.',                           'basico',   1),
(4, 'Carlos Fix — Mecânico','Serviços de mecânica automóvel e motociclos. Atendimento ao domicílio.',           'gratuito', 1);

-- ============================================================
-- PRODUTOS DE TESTE
-- ============================================================
INSERT INTO produtos (vendedor_id, categoria_id, titulo, descricao, preco, stock, estado_produto, condicao, cidade, bairro, aprovado) VALUES
-- Bolos da Maria (vendedor_id=1)
(1, 9,  'Bolo de Chocolate Suíço Premium',         'Bolo de chocolate belga com 3 camadas e recheio de morango. Ideal para festas.', 1500.00, 10, 'novo', 'disponivel', 'Maputo', 'Polana',   1),
(1, 9,  'Bolo de Aniversário Temático Moderno',    'Bolos personalizados com nome e tema. Encomendar com 48h de antecedência.',     2500.00, 5,  'novo', 'disponivel', 'Maputo', 'Polana',   1),
(1, 10, 'Kit Salgados Finos (50 Unidades)',        'Rissóis frescos de camarão. Feitos no dia. Perfeitos para eventos.',             450.00,  20, 'novo', 'disponivel', 'Maputo', 'Polana',   1),
-- Loja do João Tech (vendedor_id=2)
(2, 3,  'Auriculares Apple AirPods Pro (Gen 2)',   'Auriculares sem fio com cancelamento de ruído. Autonomia 8h. Novo e selado.',    2800.00, 15, 'novo', 'disponivel', 'Matola', 'Fomento',  1),
(2, 3,  'Powerbank Samsung 20000mAh Ultra Fast',   'Carregador portátil de alta capacidade. Carrega 4 dispositivos em simultâneo.',  1200.00, 8,  'novo', 'disponivel', 'Matola', 'Fomento',  1),
-- Carlos Fix (vendedor_id=3)
(3, 14, 'Serviço de Revisão Automóvel Premium',    'Revisão completa: troca de óleo, filtros, verificação de travões e suspensão.',  3500.00, 999,'novo', 'disponivel', 'Maputo', 'Maxaquene',1),
(3, 14, 'Diagnóstico Computadorizado Auto',        'Diagnóstico por computador. Identificação de avarias em qualquer marca.',        500.00,  999,'novo', 'disponivel', 'Maputo', 'Maxaquene',1);

-- ============================================================
-- IMAGENS DOS PRODUTOS
-- ============================================================
INSERT INTO imagens_produto (produto_id, caminho, principal, ordem) VALUES
(1, 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=60', 1, 0),
(2, 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&auto=format&fit=crop&q=60', 1, 0),
(3, 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600&auto=format&fit=crop&q=60', 1, 0),
(4, 'https://images.unsplash.com/photo-1606220588913-b3aecb492021?w=600&auto=format&fit=crop&q=60', 1, 0),
(5, 'https://images.unsplash.com/photo-1610465299996-30f240ac2b1c?w=600&auto=format&fit=crop&q=60', 1, 0),
(6, 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=600&auto=format&fit=crop&q=60', 1, 0),
(7, 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600&auto=format&fit=crop&q=60', 1, 0);

-- ============================================================
-- VERIFICAÇÃO FINAL
-- ============================================================
SELECT 'planos_premium'  AS tabela, COUNT(*) AS registos FROM planos_premium  UNION ALL
SELECT 'categorias',                COUNT(*)              FROM categorias       UNION ALL
SELECT 'utilizadores',              COUNT(*)              FROM utilizadores     UNION ALL
SELECT 'vendedores',                COUNT(*)              FROM vendedores       UNION ALL
SELECT 'produtos',                  COUNT(*)              FROM produtos;
