-- ============================================================
-- LINKA — Seed Completo com Dados Reais
-- Marketplace Local — Moçambique
-- ============================================================

SET NAMES utf8mb4;
USE linka_db;

-- ============================================================
-- PLANOS PREMIUM
-- ============================================================
INSERT INTO planos_premium (nome, descricao, preco_mensal, max_produtos, destaque_anuncios, loja_personalizada, analytics_avancado) VALUES
('Gratuito',  'Plano base sem custo.',                0.00,    5,  0, 0, 0),
('Básico',    'Mais produtos e visibilidade.',         50.00,  20, 0, 0, 0),
('Pro',       'Destaque nos anúncios.',               100.00,  50, 1, 0, 0),
('Premium',   'Tudo incluído. Loja personalizada.',   150.00,  -1, 1, 1, 1);

-- ============================================================
-- CATEGORIAS + SUBCATEGORIAS
-- ============================================================
INSERT INTO categorias (pai_id, nome, icone, slug, ordem) VALUES
(NULL, 'Alimentos & Bebidas',   'fa-utensils',      'alimentos',        1),
(NULL, 'Serviços',              'fa-tools',          'servicos',         2),
(NULL, 'Electrónica',           'fa-mobile-alt',     'electronica',      3),
(NULL, 'Vestuário & Moda',      'fa-tshirt',         'vestuario-moda',   4),
(NULL, 'Casa & Jardim',         'fa-home',           'casa-jardim',      5),
(NULL, 'Veículos',              'fa-car',            'veiculos',         6),
(NULL, 'Imóveis',               'fa-building',       'imoveis',          7),
(NULL, 'Educação & Formação',   'fa-graduation-cap', 'educacao',         8),
(NULL, 'Saúde & Beleza',        'fa-heart',          'saude-beleza',     9),
(NULL, 'Desporto & Lazer',      'fa-futbol',         'desporto-lazer',   10);

-- Subcategorias Alimentos (pai=1)
INSERT INTO categorias (pai_id, nome, icone, slug, ordem) VALUES
(1, 'Bolos & Doces',     'fa-birthday-cake', 'bolos-doces',    1),
(1, 'Salgados',          'fa-drumstick-bite','salgados',        2),
(1, 'Comida Caseira',    'fa-pepper-hot',    'comida-caseira',  3),
(1, 'Bebidas & Sucos',   'fa-glass-water',   'bebidas',         4),
(1, 'Padaria',           'fa-bread-slice',   'padaria',         5);

-- Subcategorias Serviços (pai=2)
INSERT INTO categorias (pai_id, nome, icone, slug, ordem) VALUES
(2, 'Mecânico',              'fa-wrench',         'mecanico',         1),
(2, 'Electricista',          'fa-bolt',           'electricista',     2),
(2, 'Canalizador',           'fa-faucet',         'canalizador',      3),
(2, 'Design Gráfico',        'fa-palette',        'design-grafico',   4),
(2, 'Limpeza',               'fa-broom',          'limpeza',          5),
(2, 'Fotografia',            'fa-camera',         'fotografia',       6);

-- Subcategorias Electrónica (pai=3)
INSERT INTO categorias (pai_id, nome, icone, slug, ordem) VALUES
(3, 'Smartphones',           'fa-mobile-alt',     'smartphones',      1),
(3, 'Computadores',          'fa-laptop',         'computadores',     2),
(3, 'Acessórios',            'fa-headphones',     'acessorios',       3),
(3, 'Smart TV & Audio',      'fa-tv',             'tv-audio',         4);

-- Subcategorias Vestuário (pai=4)
INSERT INTO categorias (pai_id, nome, icone, slug, ordem) VALUES
(4, 'Masculino',             'fa-user',           'masculino',        1),
(4, 'Feminino',              'fa-user',           'feminino',         2),
(4, 'Infantil',              'fa-child',          'infantil',         3),
(4, 'Calçados',              'fa-shoe-prints',    'calcados',         4);

-- Subcategorias Casa (pai=5)
INSERT INTO categorias (pai_id, nome, icone, slug, ordem) VALUES
(5, 'Móveis',                'fa-couch',          'moveis',           1),
(5, 'Decoração',             'fa-paint-roller',   'decoracao',        2),
(5, 'Ferramentas',           'fa-hammer',         'ferramentas',      3),
(5, 'Jardim',                'fa-leaf',           'jardim',           4);

-- Subcategorias Veículos (pai=6)
INSERT INTO categorias (pai_id, nome, icone, slug, ordem) VALUES
(6, 'Carros',                'fa-car',            'carros',           1),
(6, 'Motociclos',            'fa-motorcycle',     'motociclos',       2),
(6, 'Peças & Acessórios',    'fa-cogs',           'pecas-veiculos',   3);

-- Subcategorias Imóveis (pai=7)
INSERT INTO categorias (pai_id, nome, icone, slug, ordem) VALUES
(7, 'Arrendamento',          'fa-key',            'arrendamento',     1),
(7, 'Venda',                 'fa-home',           'venda-imovel',     2),
(7, 'Comercial',             'fa-store',          'comercial',        3);

-- Subcategorias Educação (pai=8)
INSERT INTO categorias (pai_id, nome, icone, slug, ordem) VALUES
(8, 'Formação Profissional', 'fa-certificate',    'formacao-prof',    1),
(8, 'Aulas Particulares',    'fa-book',           'aulas-partic',     2),
(8, 'Cursos Online',         'fa-laptop-code',    'cursos-online',    3);

-- Subcategorias Saúde (pai=9)
INSERT INTO categorias (pai_id, nome, icone, slug, ordem) VALUES
(9, 'Cabeleireiro',          'fa-cut',            'cabeleireiro',     1),
(9, 'Manicure & Pedicure',   'fa-hand-sparkles',  'manicure',         2),
(9, 'Maquiagem',             'fa-magic',          'maquiagem',        3),
(9, 'Produtos Naturais',     'fa-leaf',           'produtos-nat',     4);

-- Subcategorias Desporto (pai=10)
INSERT INTO categorias (pai_id, nome, icone, slug, ordem) VALUES
(10, 'Bicicletas',           'fa-bicycle',        'bicicletas',       1),
(10, 'Fitness',              'fa-dumbbell',       'fitness',          2),
(10, 'Futebol',              'fa-futbol',         'futebol',          3);

-- ============================================================
-- UTILIZADORES (senha de todos: Linka@2026)
-- Hash bcrypt de "Linka@2026" (12 rounds)
-- ============================================================
INSERT INTO utilizadores (nome, email, telefone, senha_hash, tipo, estado, cidade, bairro, verificado, pontos_reputacao) VALUES
-- Admin
('Admin Linka',       'admin@linka.co.mz',     '+258840000001', '$2b$12$rQnuJjRKGHaBeVDFaGqfPOoTN.AKPlk0bUz6sn6RRl7Bfr7s.nKaG', 'admin',     'activo', 'Maputo',    'Sommerschield', 1, 100),
-- Vendedores
('Maria Filomena',    'maria@linka.co.mz',     '+258840000002', '$2b$12$rQnuJjRKGHaBeVDFaGqfPOoTN.AKPlk0bUz6sn6RRl7Bfr7s.nKaG', 'vendedor',  'activo', 'Maputo',    'Polana',        1, 245),
('João Machava',      'joao@linka.co.mz',      '+258840000003', '$2b$12$rQnuJjRKGHaBeVDFaGqfPOoTN.AKPlk0bUz6sn6RRl7Bfr7s.nKaG', 'vendedor',  'activo', 'Matola',    'Fomento',       1, 180),
('Carlos Mecânico',   'carlos@linka.co.mz',    '+258840000004', '$2b$12$rQnuJjRKGHaBeVDFaGqfPOoTN.AKPlk0bUz6sn6RRl7Bfr7s.nKaG', 'prestador', 'activo', 'Maputo',    'Maxaquene',     1, 310),
('Fatima Designs',    'fatima@linka.co.mz',    '+258840000008', '$2b$12$rQnuJjRKGHaBeVDFaGqfPOoTN.AKPlk0bUz6sn6RRl7Bfr7s.nKaG', 'vendedor',  'activo', 'Maputo',    'KaMpfumo',      1, 156),
('Ricardo Tech',      'ricardo@linka.co.mz',   '+258840000009', '$2b$12$rQnuJjRKGHaBeVDFaGqfPOoTN.AKPlk0bUz6sn6RRl7Bfr7s.nKaG', 'vendedor',  'activo', 'Maputo',    'Malhangalene',  1, 203),
('Sofia Moda',        'sofia@linka.co.mz',     '+258840000010', '$2b$12$rQnuJjRKGHaBeVDFaGqfPOoTN.AKPlk0bUz6sn6RRl7Bfr7s.nKaG', 'vendedor',  'activo', 'Matola',    'Costa do Sol',  1, 178),
('Manuel Imóveis',    'manuel@linka.co.mz',    '+258840000011', '$2b$12$rQnuJjRKGHaBeVDFaGqfPOoTN.AKPlk0bUz6sn6RRl7Bfr7s.nKaG', 'vendedor',  'activo', 'Maputo',    'Zona Verde',    1, 290),
('Teresa Beleza',     'teresa@linka.co.mz',    '+258840000012', '$2b$12$rQnuJjRKGHaBeVDFaGqfPOoTN.AKPlk0bUz6sn6RRl7Bfr7s.nKaG', 'vendedor',  'activo', 'Maputo',    'Bairro Alto',   1, 134),
('Pedro Desporto',    'pedro.desp@linka.co.mz','+258840000013', '$2b$12$rQnuJjRKGHaBeVDFaGqfPOoTN.AKPlk0bUz6sn6RRl7Bfr7s.nKaG', 'vendedor',  'activo', 'Matola',    'Zona 1',        1, 167),
-- Clientes
('Ana Sitoe',         'ana@linka.co.mz',       '+258840000005', '$2b$12$rQnuJjRKGHaBeVDFaGqfPOoTN.AKPlk0bUz6sn6RRl7Bfr7s.nKaG', 'cliente',   'activo', 'Maputo',    'Alto-Maé',      1, 85),
('Pedro Cossa',       'pedro@linka.co.mz',     '+258840000006', '$2b$12$rQnuJjRKGHaBeVDFaGqfPOoTN.AKPlk0bUz6sn6RRl7Bfr7s.nKaG', 'cliente',   'activo', 'Matola',    'Liberdade',     0, 42),
('Rosa Nhaca',        'rosa@linka.co.mz',      '+258840000014', '$2b$12$rQnuJjRKGHaBeVDFaGqfPOoTN.AKPlk0bUz6sn6RRl7Bfr7s.nKaG', 'cliente',   'activo', 'Maputo',    'Munhuwani',     1, 67),
('Jorge Tembe',       'jorge@linka.co.mz',     '+258840000015', '$2b$12$rQnuJjRKGHaBeVDFaGqfPOoTN.AKPlk0bUz6sn6RRl7Bfr7s.nKaG', 'cliente',   'activo', 'Beira',     'Esturro',       1, 53),
('Lucia Mondlane',    'lucia@linka.co.mz',     '+258840000016', '$2b$12$rQnuJjRKGHaBeVDFaGqfPOoTN.AKPlk0bUz6sn6RRl7Bfr7s.nKaG', 'cliente',   'activo', 'Maputo',    'Pontagoya',     0, 31),
('Carlos Timane',     'carlos.t@linka.co.mz',  '+258840000017', '$2b$12$rQnuJjRKGHaBeVDFaGqfPOoTN.AKPlk0bUz6sn6RRl7Bfr7s.nKaG', 'cliente',   'activo', 'Nampula',   'Laravel',       1, 78),
-- Entregadores
('Fábio Entregas',    'fabio@linka.co.mz',     '+258840000007', '$2b$12$rQnuJjRKGHaBeVDFaGqfPOoTN.AKPlk0bUz6sn6RRl7Bfr7s.nKaG', 'entregador','activo', 'Maputo',    'Hulene',        1, 402),
('António Bikes',     'antonio@linka.co.mz',   '+258840000018', '$2b$12$rQnuJjRKGHaBeVDFaGqfPOoTN.AKPlk0bUz6sn6RRl7Bfr7s.nKaG', 'entregador','activo', 'Matola',    '25 de Setembro',1, 289);

-- ============================================================
-- PERFIS DE VENDEDOR
-- ============================================================
INSERT INTO vendedores (utilizador_id, nome_loja, descricao_loja, plano, aprovado, avaliacao_media, total_avaliacoes, total_vendas) VALUES
(2,  'Bolos da Maria',          'Os melhores bolos e doces artesanais de Maputo!',                    'pro',      1, 4.80, 45, 120),
(3,  'Loja do João Tech',       'Electrónica, smartphones e acessórios de qualidade.',                'basico',   1, 4.50, 32, 89),
(4,  'Carlos Fix — Mecânico',   'Serviços de mecânica automóvel. Atendimento ao domicílio.',          'gratuito', 1, 4.90, 67, 203),
(8,  'Fatima Design Studio',    'Design gráfico, logos, flyers e redes sociais.',                     'pro',      1, 4.70, 28, 76),
(9,  'Ricardo Gadgets',         'Gadgets, acessórios tech e soluções inteligentes.',                  'basico',   1, 4.30, 19, 54),
(10, 'Sofia Fashion',           'Roupas e acessórios de moda feminina e masculina.',                  'pro',      1, 4.60, 37, 102),
(11, 'Manuel Imobiliária',      'Compra, venda e arrendamento de imóveis em Maputo.',                 'premium',  1, 4.85, 52, 167),
(12, 'Teresa Beauty Salon',     'Cabeleireiro, manicure, maquiagem e cuidados de beleza.',           'basico',   1, 4.40, 23, 61),
(13, 'Pedro Sports Store',      'Artigos desportivos, bicicletas e equipamento fitness.',             'gratuito', 1, 4.20, 15, 38);

-- ============================================================
-- PRODUTOS (30+ produtos reais)
-- ============================================================
INSERT INTO produtos (vendedor_id, categoria_id, titulo, descricao, preco, preco_negociavel, stock, estado_produto, condicao, cidade, bairro, aprovado, total_visualizacoes, total_likes, total_favoritos) VALUES
-- Bolos da Maria (vendedor=1)
(1, 11, 'Bolo de Chocolate Suíço Premium',        'Bolo de chocolate belga com 3 camadas e recheio de morango fresco.', 1500.00, 1, 10, 'novo', 'disponivel', 'Maputo', 'Polana', 1, 342, 89, 23),
(1, 11, 'Bolo de Aniversário Temático',            'Bolos personalizados com nome e tema à escolha. Encomendar 48h antes.', 2500.00, 1, 5, 'novo', 'disponivel', 'Maputo', 'Polana', 1, 215, 56, 14),
(1, 11, 'Bolo de Cenoura com Cobertura',           'Bolo de cenoura caseiro com cobertura de chocolate amargo.', 800.00, 0, 15, 'novo', 'disponivel', 'Maputo', 'Polana', 1, 189, 45, 12),
(1, 12, 'Kit Salgados Finos (50 Un)',              'Rissóis de camarão, pastéis de bacalhau e espetadas.', 4500.00, 1, 8, 'novo', 'disponivel', 'Maputo', 'Polana', 1, 456, 112, 31),
(1, 13, 'Marmita Executiva',                       'Arroz, feijão, frango grelhado, salada e farofa. Entrega incluída.', 350.00, 0, 30, 'novo', 'disponivel', 'Maputo', 'Polana', 1, 567, 134, 42),
(1, 14, 'Sumo Natural de Maracujá (1L)',           'Sumo natural fresco sem açúcar artificial.', 150.00, 0, 50, 'novo', 'disponivel', 'Maputo', 'Polana', 1, 234, 67, 19),

-- Loja do João Tech (vendedor=2)
(2, 23, 'iPhone 14 Pro Max 256GB',                 'Novo e selado. Garantia de 1 ano. Acessórios incluídos.', 45000.00, 1, 5, 'novo', 'disponivel', 'Matola', 'Fomento', 1, 1203, 345, 89),
(2, 23, 'Samsung Galaxy A54 5G',                   'Smartphone 5G com câmara 50MP e ecrã 120Hz.', 18500.00, 1, 12, 'novo', 'disponivel', 'Matola', 'Fomento', 1, 876, 234, 56),
(2, 25, 'Powerbank Samsung 20000mAh',              'Carregador portátil. 4 saídas USB. Carregamento rápido.', 2800.00, 0, 20, 'novo', 'disponivel', 'Matola', 'Fomento', 1, 543, 123, 34),
(2, 25, 'Auriculares AirPods Pro Gen 2',           'Cancelamento de ruído activo. Autonomia 8h.', 28000.00, 1, 8, 'novo', 'disponivel', 'Matola', 'Fomento', 1, 987, 267, 72),
(2, 24, 'Portátil HP 15" i5 8GB 256GB SSD',        'Portátil para trabalho e estudos. Windows 11.', 22000.00, 1, 6, 'novo', 'disponivel', 'Matola', 'Fomento', 1, 654, 178, 45),
(2, 25, 'Capa Silicone iPhone 15 Pro',              'Capa protectora com suporte magnético MagSafe.', 450.00, 0, 30, 'novo', 'disponivel', 'Matola', 'Fomento', 1, 321, 89, 23),

-- Carlos Fix (vendedor=3)
(3, 16, 'Revisão Completa do Automóvel',           'Troca de óleo, filtros, verificação de travões e suspensão.', 3500.00, 1, 999, 'novo', 'disponivel', 'Maputo', 'Maxaquene', 1, 432, 98, 28),
(3, 16, 'Diagnóstico Computadorizado',             'Leitura de erros por computador. Qualquer marca/modelo.', 800.00, 0, 999, 'novo', 'disponivel', 'Maputo', 'Maxaquene', 1, 345, 76, 19),
(3, 16, 'Troca de Pneus (4 unidades)',             'Montagem e balanceamento incluídos. Trabalhamos com todas as marcas.', 12000.00, 1, 999, 'novo', 'disponivel', 'Maputo', 'Maxaquene', 1, 267, 54, 15),
(3, 17, 'Instalação Elétrica Residencial',         'Instalação completa ou reparação. Orçamento grátis.', 5000.00, 1, 999, 'novo', 'disponivel', 'Maputo', 'Maxaquene', 1, 198, 43, 11),

-- Fatima Design (vendedor=4)
(4, 20, 'Design de Logótipo Profissional',          'Logótipo único com 3 propostas. Ficheiros finais em AI, SVG, PNG.', 3500.00, 1, 999, 'novo', 'disponivel', 'Maputo', 'KaMpfumo', 1, 567, 145, 38),
(4, 20, 'Pacote Redes Sociais (30 posts)',          'Design de 30 posts para Instagram/Facebook com calendário editorial.', 8000.00, 1, 999, 'novo', 'disponivel', 'Maputo', 'KaMpfumo', 1, 432, 98, 27),
(4, 20, 'Flyer / Panfleto Digital',                'Design de flyer impressão A4/A5. 2 propostas.', 1500.00, 0, 999, 'novo', 'disponivel', 'Maputo', 'KaMpfumo', 1, 345, 76, 21),

-- Ricardo Gadgets (vendedor=5)
(5, 25, 'Smartwatch Amazfit GTS 4',                'Smartwatch com GPS, monitor cardíaco, 7 dias de bateria.', 5500.00, 1, 10, 'novo', 'disponivel', 'Maputo', 'Malhangalene', 1, 678, 167, 43),
(5, 25, 'Altifone JBL Flip 6',                     'Altifone portátil à prova de água. 12h de bateria.', 4200.00, 0, 15, 'novo', 'disponivel', 'Maputo', 'Malhangalene', 1, 543, 134, 35),
(5, 25, 'Lâmpada Inteligente Philips Hue (Pack 3)', 'Lâmpadas LED smart. Controlo por app e voz.', 3800.00, 1, 8, 'novo', 'disponivel', 'Maputo', 'Malhangalene', 1, 321, 78, 21),

-- Sofia Fashion (vendedor=6)
(6, 27, 'Vestido Longo Floral',                    'Vestido feminino longo com estampa floral. Tamanhos P-M-G.', 2200.00, 1, 12, 'novo', 'disponivel', 'Matola', 'Costa do Sol', 1, 876, 234, 67),
(6, 27, 'Conjunto Camisola + Saia',                'Conjunto feminino elegante. Tecido leve e confortável.', 1800.00, 1, 8, 'novo', 'disponivel', 'Matola', 'Costa do Sol', 1, 654, 178, 45),
(6, 28, 'Ténis Nike Air Max 2024',                 'Ténis originals. Todos os tamanhos disponíveis.', 6500.00, 1, 15, 'novo', 'disponivel', 'Matola', 'Costa do Sol', 1, 1234, 345, 89),
(6, 28, 'Bolsa de Couro Feminina',                 'Bolsa artesanal de couro legítimo. Cores: preta, castanha.', 3200.00, 1, 10, 'novo', 'disponivel', 'Matola', 'Costa do Sol', 1, 543, 123, 34),

-- Manuel Imobiliária (vendedor=7)
(7, 30, 'Apartamento T3 — Polana',                 'Apartamento mobiliado com 3 quartos, 2 casas de banho. Arrendamento mensal.', 25000.00, 1, 1, 'novo', 'disponivel', 'Maputo', 'Polana', 1, 2345, 567, 123),
(7, 31, 'Terreno 500m² — Zona Verde',              'Terreno com 500m². Documentação em ordem. Água e electricidade disponíveis.', 1800000.00, 1, 1, 'novo', 'disponivel', 'Maputo', 'Zona Verde', 1, 1567, 345, 89),
(7, 30, 'Loja Comercial — Centro da Cidade',       'Loja de 80m² no centro. Ideal para comércio. Aluguer mensal.', 15000.00, 1, 1, 'novo', 'disponivel', 'Maputo', 'Centro', 1, 987, 234, 56),

-- Teresa Beauty (vendedor=8)
(9, 33, 'Corte + Escova + Tratamento',              'Corte de cabelo feminino com escova e tratamento capilar.', 800.00, 0, 999, 'novo', 'disponivel', 'Maputo', 'Bairro Alto', 1, 456, 112, 29),
(9, 34, 'Manicure Completa',                        'Manicure com esmalte em gel. Duração 2 semanas.', 350.00, 0, 999, 'novo', 'disponivel', 'Maputo', 'Bairro Alto', 1, 345, 87, 23),
(9, 35, 'Maquagem Profissional',                    'Maquagem para eventos, casamentos e festas. Produto de qualidade.', 2500.00, 1, 999, 'novo', 'disponivel', 'Maputo', 'Bairro Alto', 1, 234, 67, 18),

-- Pedro Sports (vendedor=9)
(10, 39, 'Bicicleta Montanha 26"',                  'Bicicleta aro 26 com 21 velocidades. Freios a disco.', 8500.00, 1, 5, 'novo', 'disponivel', 'Matola', 'Zona 1', 1, 543, 134, 36),
(10, 40, 'Kit Halteres + Banco',                    'Kit completo de musculação: halteres 20kg + banco ajustável.', 12000.00, 1, 3, 'novo', 'disponivel', 'Matola', 'Zona 1', 1, 321, 78, 21),
(10, 41, 'Bola Futebol Adidas Al Rihla',           'Bola oficial da Copa do Mundo. Tamanho 5. Certificada FIFA.', 2500.00, 0, 20, 'novo', 'disponivel', 'Matola', 'Zona 1', 1, 678, 189, 52);

-- ============================================================
-- IMAGENS DOS PRODUTOS
-- ============================================================
INSERT INTO imagens_produto (produto_id, caminho, principal, ordem) VALUES
(1,  'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=60', 1, 0),
(2,  'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&auto=format&fit=crop&q=60', 1, 0),
(3,  'https://images.unsplash.com/photo-1621303837174-89787a7d4729?w=600&auto=format&fit=crop&q=60', 1, 0),
(4,  'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600&auto=format&fit=crop&q=60', 1, 0),
(5,  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=60', 1, 0),
(6,  'https://images.unsplash.com/photo-1622597467836-f3285f2131b8?w=600&auto=format&fit=crop&q=60', 1, 0),
(7,  'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600&auto=format&fit=crop&q=60', 1, 0),
(8,  'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600&auto=format&fit=crop&q=60', 1, 0),
(9,  'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600&auto=format&fit=crop&q=60', 1, 0),
(10, 'https://images.unsplash.com/photo-1606220588913-b3aecb492021?w=600&auto=format&fit=crop&q=60', 1, 0),
(11, 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&auto=format&fit=crop&q=60', 1, 0),
(12, 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=600&auto=format&fit=crop&q=60', 1, 0),
(13, 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=600&auto=format&fit=crop&q=60', 1, 0),
(14, 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600&auto=format&fit=crop&q=60', 1, 0),
(15, 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&auto=format&fit=crop&q=60', 1, 0),
(16, 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&auto=format&fit=crop&q=60', 1, 0),
(17, 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=600&auto=format&fit=crop&q=60', 1, 0),
(18, 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&auto=format&fit=crop&q=60', 1, 0),
(19, 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=600&auto=format&fit=crop&q=60', 1, 0),
(20, 'https://images.unsplash.com/photo-1546868871-af0de0ae72be?w=600&auto=format&fit=crop&q=60', 1, 0),
(21, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=60', 1, 0),
(22, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=60', 1, 0),
(23, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=60', 1, 0),
(24, 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&auto=format&fit=crop&q=60', 1, 0),
(25, 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&auto=format&fit=crop&q=60', 1, 0),
(26, 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop&q=60', 1, 0),
(27, 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&auto=format&fit=crop&q=60', 1, 0),
(28, 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=600&auto=format&fit=crop&q=60', 1, 0),
(29, 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&auto=format&fit=crop&q=60', 1, 0),
(30, 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&auto=format&fit=crop&q=60', 1, 0),
(31, 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=600&auto=format&fit=crop&q=60', 1, 0),
(32, 'https://images.unsplash.com/photo-1610557892470-55d9e80c0eb7?w=600&auto=format&fit=crop&q=60', 1, 0),
(33, 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&auto=format&fit=crop&q=60', 1, 0);

-- ============================================================
-- FAVORITOS (clientes favoritam produtos)
-- ============================================================
INSERT INTO favoritos (utilizador_id, produto_id) VALUES
-- Ana (11) favorita vários
(11, 1), (11, 4), (11, 7), (11, 10), (11, 17), (11, 23), (11, 29), (11, 33),
-- Pedro (12) favorita tech + desporto
(12, 8), (12, 9), (12, 11), (12, 20), (12, 32), (12, 33),
-- Rosa (13) favorita moda + beleza
(13, 23), (13, 24), (13, 29), (13, 30), (13, 31),
-- Jorge (14) favorita electrónica + comida
(14, 7), (14, 8), (14, 11), (14, 5), (14, 6),
-- Lucia (15) favorita casa + imóveis
(15, 25), (15, 26), (15, 27), (15, 28),
-- Carlos T (16) favorita serviços + veículos
(16, 13), (16, 14), (16, 15), (16, 16), (16, 32);

-- ============================================================
-- PEDIDOS (15 pedidos variados)
-- ============================================================
INSERT INTO pedidos (cliente_id, vendedor_id, estado, subtotal, taxa_entrega, total, metodo_pagamento, estado_pagamento, endereco_entrega, notas) VALUES
(11, 1, 'entregue',  4500.00, 200.00, 4700.00, 'mpesa',      'pago',     'Bairro Alto, Rua da Paz 12', 'Entregar antes das 12h'),
(11, 2, 'confirmado', 18500.00, 300.00, 18800.00, 'mpesa',      'pago',     'Alto-Maé, Av. 24 de Julho',  'Caixa selada por favor'),
(12, 1, 'pendente',  350.00,  150.00, 500.00,  'dinheiro',   'pendente', 'Liberdade, Rua 5',           ''),
(12, 6, 'preparando', 6500.00, 250.00, 6750.00, 'emola',      'pago',     'Liberdade, Rua 8',           'Ténis n.º 42'),
(13, 1, 'entregue',  800.00,  150.00, 950.00,  'dinheiro',   'pago',     'Munhuwani, Bairro Novo',     ''),
(13, 8, 'enviado',   800.00,  200.00, 1000.00, 'mpesa',      'pago',     'Munhuwani, Rua das Flores',  'Corte feminino'),
(14, 2, 'entregue',  28000.00, 500.00, 28500.00, 'transferencia','pago',  'Beira, Esturro, Rua 12',     'Factura por favor'),
(14, 5, 'confirmado', 5500.00, 300.00, 5800.00, 'mpesa',      'pago',     'Beira, Esturro',             ''),
(15, 7, 'pendente',  25000.00, 0.00,  25000.00, 'transferencia','pendente','Pontagoya, Av. Eduardo Mondlane','Apartamento T3'),
(15, 4, 'preparando', 3500.00, 0.00,  3500.00,  'mpesa',      'pago',     'Pontagoya',                  'Logótipo para loja de roupa'),
(16, 1, 'pendente',  1500.00, 400.00, 1900.00,  'mpesa',      'pendente', 'Nampula, Laravel',           'Entrega em 2 dias'),
(16, 3, 'confirmado', 3500.00, 0.00,  3500.00,  'dinheiro',   'pendente', 'Nampula, Laravel',           'Mecânico ao domicílio'),
(11, 6, 'pendente',  2200.00, 200.00, 2400.00,  'emola',      'pendente', 'Alto-Maé',                   'Vestido tamanho M'),
(12, 9, 'cancelado', 8500.00, 300.00, 8800.00,  'mpesa',      'reembolsado','Liberdade',               'Cancelado pelo cliente'),
(13, 9, 'entregue',  2500.00, 200.00, 2700.00,  'dinheiro',   'pago',     'Munhuwani',                  'Bola futebol');

-- ============================================================
-- ITENS DOS PEDIDOS
-- ============================================================
INSERT INTO itens_pedido (pedido_id, produto_id, titulo_produto, preco_unitario, quantidade, subtotal) VALUES
(1,  4, 'Kit Salgados Finos (50 Un)',     4500.00, 1, 4500.00),
(2,  8, 'Samsung Galaxy A54 5G',          18500.00, 1, 18500.00),
(3,  5, 'Marmita Executiva',              350.00, 1, 350.00),
(4,  23, 'Ténis Nike Air Max 2024',       6500.00, 1, 6500.00),
(5,  3, 'Bolo de Cenoura com Cobertura',  800.00, 1, 800.00),
(6,  29, 'Corte + Escova + Tratamento',    800.00, 1, 800.00),
(7,  10, 'Auriculares AirPods Pro Gen 2', 28000.00, 1, 28000.00),
(8,  20, 'Smartwatch Amazfit GTS 4',      5500.00, 1, 5500.00),
(9,  25, 'Apartamento T3 — Polana',        25000.00, 1, 25000.00),
(10, 17, 'Design de Logótipo Profissional',3500.00, 1, 3500.00),
(11, 1,  'Bolo de Chocolate Suíço Premium',1500.00, 1, 1500.00),
(12, 13, 'Revisão Completa do Automóvel',  3500.00, 1, 3500.00),
(13, 23, 'Vestido Longo Floral',           2200.00, 1, 2200.00),
(14, 32, 'Bicicleta Montanha 26"',         8500.00, 1, 8500.00),
(15, 33, 'Bola Futebol Adidas Al Rihla',  2500.00, 1, 2500.00);

-- ============================================================
-- CONVERSAS (chat entre utilizadores)
-- ============================================================
INSERT INTO conversas (utilizador1_id, utilizador2_id, produto_id, ultima_mensagem_em) VALUES
(11, 2, 1,  '2026-06-09 10:30:00'),
(11, 3, 8,  '2026-06-09 11:45:00'),
(12, 2, 7,  '2026-06-08 16:20:00'),
(13, 10, 23,'2026-06-09 09:15:00'),
(14, 2, 10, '2026-06-07 14:30:00'),
(15, 11, 25,'2026-06-08 08:00:00'),
(11, 6, 23, '2026-06-09 12:00:00');

-- ============================================================
-- MENSAGENS (conversas reais)
-- ============================================================
INSERT INTO mensagens (conversa_id, remetente_id, conteudo, tipo, lida, criado_em) VALUES
-- Conversa 1: Ana (11) ↔ João (2) sobre Bolo
(1, 11, 'Olá! O bolo de chocolate ainda está disponível?', 'texto', 1, '2026-06-09 10:00:00'),
(1, 2,  'Sim, ainda temos! Quantas fatias pretende?',      'texto', 1, '2026-06-09 10:05:00'),
(1, 11, 'Quero um bolo inteiro para aniversário.',         'texto', 1, '2026-06-09 10:10:00'),
(1, 2,  'Perfeito! Para que data? Precisamos de 48h.',     'texto', 1, '2026-06-09 10:15:00'),
(1, 11, 'Para sábado de manhã. Pode entregar?',            'texto', 1, '2026-06-09 10:20:00'),
(1, 2,  'Sim, entregamos em Maputo. Taxa de entrega MZN 200.', 'texto', 1, '2026-06-09 10:25:00'),
(1, 11, 'Perfeito, combinado! Vou fazer o pedido agora.',  'texto', 1, '2026-06-09 10:30:00'),

-- Conversa 2: Ana (11) ↔ João (2) sobre Samsung
(2, 11, 'Boas! O Galaxy A54 tem garantia?',                'texto', 1, '2026-06-09 11:00:00'),
(2, 2,  'Sim! 1 ano de garantia oficial Samsung.',          'texto', 1, '2026-06-09 11:05:00'),
(2, 11, 'E aceita M-Pesa?',                                'texto', 1, '2026-06-09 11:10:00'),
(2, 2,  'Aceitamos M-Pesa, e-Mola e dinheiro.',            'texto', 1, '2026-06-09 11:15:00'),
(2, 11, 'Combinado! Vou encomendar.',                      'texto', 1, '2026-06-09 11:45:00'),

-- Conversa 3: Pedro (12) ↔ João (2) sobre AirPods
(3, 12, 'Esses AirPods são originais?',                     'texto', 1, '2026-06-08 15:00:00'),
(3, 2,  'Sim, 100% originais. Factura incluída.',           'texto', 1, '2026-06-08 15:10:00'),
(3, 12, 'Quanto faz por 25.000?',                          'texto', 1, '2026-06-08 15:30:00'),
(3, 2,  'O melhor que faço é 27.000. Inclui capa.',        'texto', 1, '2026-06-08 16:00:00'),
(3, 12, 'Está bom, fechamos por 27.000!',                  'texto', 1, '2026-06-08 16:20:00'),

-- Conversa 4: Rosa (13) ↔ Pedro Sports (10) sobre Nike
(4, 13, 'Olá! Os ténis Nike Air Max são mesmo originais?',  'texto', 1, '2026-06-09 09:00:00'),
(4, 10, 'Sim! Trazemos directamente da fábrica.',           'texto', 1, '2026-06-09 09:05:00'),
(4, 13, 'Tenho o pé 38. Ainda tem?',                       'texto', 1, '2026-06-09 09:10:00'),
(4, 10, 'Tem sim! Temos na cor preta e branca.',            'texto', 1, '2026-06-09 09:15:00'),

-- Conversa 5: Jorge (14) ↔ João (2) sobre AirPods
(5, 14, 'Boas, os AirPods Pro ainda têm stock?',            'texto', 1, '2026-06-07 14:00:00'),
(5, 2,  'Sim! Últimos 3 pares.',                            'texto', 1, '2026-06-07 14:10:00'),
(5, 14, 'Enviam para a Beira?',                            'texto', 1, '2026-06-07 14:20:00'),
(5, 2,  'Sim, mas a entrega é por conta do cliente.',       'texto', 1, '2026-06-07 14:30:00'),

-- Conversa 6: Lucia (15) ↔ Manuel (11) sobre apartamento
(6, 15, 'Bom dia! O apartamento T3 na Polana ainda está disponível?', 'texto', 1, '2026-06-08 07:30:00'),
(6, 11, 'Bom dia! Sim, ainda está. Quando quer visitar?',  'texto', 1, '2026-06-08 07:45:00'),
(6, 15, 'Pode ser amanhã à tarde?',                         'texto', 1, '2026-06-08 07:50:00'),
(6, 11, 'Claro! Às 15h combinamos. Levo as chaves.',       'texto', 1, '2026-06-08 08:00:00'),

-- Conversa 7: Ana (11) ↔ Sofia (10) sobre vestido
(7, 11, 'Olá! O vestido floral é de que tecido?',           'texto', 1, '2026-06-09 11:30:00'),
(7, 10, 'É de viscose, muito fresco para o calor de Maputo.', 'texto', 1, '2026-06-09 11:35:00'),
(7, 11, 'Bonito! Tem tamanho M?',                           'texto', 1, '2026-06-09 11:50:00'),
(7, 10, 'Sim! Temos em M e G.',                             'texto', 1, '2026-06-09 12:00:00');

-- ============================================================
-- AVALIAÇÕES (reviews dos clientes)
-- ============================================================
INSERT INTO avaliacoes (avaliador_id, avaliado_id, produto_id, estrelas, comentario, tipo) VALUES
(11, 2, 1,  5, 'Bolo incrivelmente delicioso! Recomendo a todos.',    'produto'),
(11, 2, 4,  5, 'Salgados frescos e muito saborosos. Entrega pontual.', 'produto'),
(12, 2, 7,  4, 'Bom produto, mas a entrega demorou um pouco.',        'produto'),
(13, 10, 23,5, 'Vestido lindo! Exatamente como na foto.',             'produto'),
(14, 2, 10, 5, 'AirPods originais e excelentes. Recomendo!',          'produto'),
(15, 11, 25,4, 'Apartamento bom, apenas preciso de obras menores.',   'produto'),
(11, 3, 8,  4, 'Samsung funciona perfeitamente. Boa loja!',           'produto'),
(12, 6, 23, 5, 'Nike originais, muito satisfeito!',                   'produto'),
(13, 8, 29, 4, 'Corte muito bom! Vou voltar.',                        'produto'),
(16, 1, 1,  5, 'Melhores bolos de Maputo, sem dúvida!',              'produto');

-- ============================================================
-- NOTIFICAÇÕES
-- ============================================================
INSERT INTO notificacoes (utilizador_id, titulo, corpo, tipo, lida) VALUES
(11, 'Pedido Confirmado',     'O seu pedido #2 foi confirmado pelo vendedor.',    'pedido', 0),
(11, 'Produto Entregue',      'O seu pedido #1 foi entregue com sucesso!',        'pedido', 1),
(11, 'Nova Mensagem',         'João Machava enviou-lhe uma mensagem.',            'mensagem', 0),
(12, 'Promoção Especial',     'Desconto de 20% em todos os smartphones!',         'promocao', 0),
(12, 'Lembrete de Pedido',    'Complete o pagamento do pedido #4.',               'pedido', 0),
(13, 'Avaliação Pendente',    'Avalie a sua compra na Bolos da Maria.',           'avaliacao', 0),
(14, 'Bem-vindo à LINKA!',    'A sua conta foi criada com sucesso.',              'sistema', 1),
(15, 'Pedido Recebido',       'O vendedor recebeu o seu pedido #9.',              'pedido', 0);

-- ============================================================
-- DENÚNCIAS
-- ============================================================
INSERT INTO denuncias (denunciante_id, denunciado_id, produto_id, motivo, descricao, estado) VALUES
(14, NULL, NULL, 'spam', 'Anúncios repetidos na mesma categoria.', 'pendente'),
(12, NULL, NULL, 'preco_abusivo', 'Preço muito acima do mercado para o produto.', 'em_analise');

-- ============================================================
-- SANÇÕES
-- ============================================================
INSERT INTO sancoes (utilizador_id, admin_id, tipo, motivo, activa) VALUES
(12, 1, 'aviso', 'Publicou anúncios com preços abusivos.', 1);

-- ============================================================
-- VERIFICAÇÃO
-- ============================================================
SELECT
  (SELECT COUNT(*) FROM utilizadores)  AS users,
  (SELECT COUNT(*) FROM vendedores)    AS sellers,
  (SELECT COUNT(*) FROM produtos)      AS products,
  (SELECT COUNT(*) FROM categorias)    AS categories,
  (SELECT COUNT(*) FROM favoritos)     AS favorites,
  (SELECT COUNT(*) FROM pedidos)       AS orders,
  (SELECT COUNT(*) FROM conversas)     AS conversations,
  (SELECT COUNT(*) FROM mensagens)     AS messages,
  (SELECT COUNT(*) FROM avaliacoes)    AS reviews,
  (SELECT COUNT(*) FROM notificacoes)  AS notifications;
