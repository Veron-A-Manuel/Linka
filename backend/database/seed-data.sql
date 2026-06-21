SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS=0;
TRUNCATE TABLE denuncias;
TRUNCATE TABLE sancoes;
TRUNCATE TABLE notificacoes;
TRUNCATE TABLE avaliacoes;
TRUNCATE TABLE mensagens;
TRUNCATE TABLE conversas;
TRUNCATE TABLE itens_pedido;
TRUNCATE TABLE pedidos;
TRUNCATE TABLE favoritos;
TRUNCATE TABLE imagens_produto;
TRUNCATE TABLE produtos;
ALTER TABLE produtos AUTO_INCREMENT = 1;
SET FOREIGN_KEY_CHECKS=1;

INSERT INTO produtos (vendedor_id, categoria_id, titulo, descricao, preco, preco_negociavel, stock, estado_produto, condicao, cidade, bairro, aprovado, total_visualizacoes, total_likes, total_favoritos) VALUES
(1, 11, 'Bolo de Chocolate Suiss', 'Bolo de chocolate belga com 3 camadas e recheio de morango.', 1500.00, 1, 10, 'novo', 'disponivel', 'Maputo', 'Polana', 1, 342, 89, 23),
(1, 11, 'Bolo de Aniversario', 'Bolos personalizados com nome e tema. 48h antecedencia.', 2500.00, 1, 5, 'novo', 'disponivel', 'Maputo', 'Polana', 1, 215, 56, 14),
(1, 11, 'Bolo de Cenoura', 'Bolo de cenoura caseiro com cobertura de chocolate.', 800.00, 0, 15, 'novo', 'disponivel', 'Maputo', 'Polana', 1, 189, 45, 12),
(1, 12, 'Kit Salgados 50 un', 'Rissois de camarao, pasteis de bacalhau e espetadas.', 4500.00, 1, 8, 'novo', 'disponivel', 'Maputo', 'Polana', 1, 456, 112, 31),
(1, 13, 'Marmita Executiva', 'Arroz, feijao, frango grelhado, salada e farofa.', 350.00, 0, 30, 'novo', 'disponivel', 'Maputo', 'Polana', 1, 567, 134, 42),
(1, 14, 'Sumo de Maracuja 1L', 'Sumo natural fresco sem acucar.', 150.00, 0, 50, 'novo', 'disponivel', 'Maputo', 'Polana', 1, 234, 67, 19),
(2, 23, 'iPhone 14 Pro Max 256GB', 'Novo e selado. Garantia 1 ano.', 45000.00, 1, 5, 'novo', 'disponivel', 'Matola', 'Fomento', 1, 1203, 345, 89),
(2, 23, 'Samsung Galaxy A54 5G', 'Smartphone 5G camera 50MP.', 18500.00, 1, 12, 'novo', 'disponivel', 'Matola', 'Fomento', 1, 876, 234, 56),
(2, 25, 'Powerbank 20000mAh', 'Carregador portatil 4 saidas USB.', 2800.00, 0, 20, 'novo', 'disponivel', 'Matola', 'Fomento', 1, 543, 123, 34),
(2, 25, 'AirPods Pro Gen 2', 'Cancelamento de ruido activo.', 28000.00, 1, 8, 'novo', 'disponivel', 'Matola', 'Fomento', 1, 987, 267, 72),
(2, 24, 'Portatil HP i5 8GB', 'Portatil para trabalho e estudos.', 22000.00, 1, 6, 'novo', 'disponivel', 'Matola', 'Fomento', 1, 654, 178, 45),
(2, 25, 'Capa iPhone 15 Pro', 'Capa protectora magnetica.', 450.00, 0, 30, 'novo', 'disponivel', 'Matola', 'Fomento', 1, 321, 89, 23),
(3, 16, 'Revisao Automovel', 'Troca oleo, filtros, travoes e suspensao.', 3500.00, 1, 999, 'novo', 'disponivel', 'Maputo', 'Maxaquene', 1, 432, 98, 28),
(3, 16, 'Diagnostico Computadorizado', 'Leitura de erros por computador.', 800.00, 0, 999, 'novo', 'disponivel', 'Maputo', 'Maxaquene', 1, 345, 76, 19),
(3, 16, 'Troca de Pneus 4 un', 'Montagem e balanceamento incluidos.', 12000.00, 1, 999, 'novo', 'disponivel', 'Maputo', 'Maxaquene', 1, 267, 54, 15),
(3, 17, 'Instalacao Eletrica', 'Instalacao completa ou reparacao.', 5000.00, 1, 999, 'novo', 'disponivel', 'Maputo', 'Maxaquene', 1, 198, 43, 11),
(4, 20, 'Logotipo Profissional', 'Logotipo unico com 3 propostas.', 3500.00, 1, 999, 'novo', 'disponivel', 'Maputo', 'KaMpfumo', 1, 567, 145, 38),
(4, 20, 'Pacote Redes Sociais', '30 posts para Instagram e Facebook.', 8000.00, 1, 999, 'novo', 'disponivel', 'Maputo', 'KaMpfumo', 1, 432, 98, 27),
(4, 20, 'Flyer Digital', 'Design de flyer A4 ou A5.', 1500.00, 0, 999, 'novo', 'disponivel', 'Maputo', 'KaMpfumo', 1, 345, 76, 21),
(5, 25, 'Smartwatch Amazfit GTS 4', 'GPS, monitor cardiaco, 7 dias bateria.', 5500.00, 1, 10, 'novo', 'disponivel', 'Maputo', 'Malhangalene', 1, 678, 167, 43),
(5, 25, 'Altifone JBL Flip 6', 'Portatil a prova de agua. 12h bateria.', 4200.00, 0, 15, 'novo', 'disponivel', 'Maputo', 'Malhangalene', 1, 543, 134, 35),
(5, 25, 'Philips Hue Pack 3', 'Lampadas LED smart. Controlo por app.', 3800.00, 1, 8, 'novo', 'disponivel', 'Maputo', 'Malhangalene', 1, 321, 78, 21),
(6, 27, 'Vestido Longo Floral', 'Vestido feminino com estampa floral. P-M-G.', 2200.00, 1, 12, 'novo', 'disponivel', 'Matola', 'Costa do Sol', 1, 876, 234, 67),
(6, 27, 'Conjunto Camisola Saia', 'Conjunto feminino elegante. Tecido leve.', 1800.00, 1, 8, 'novo', 'disponivel', 'Matola', 'Costa do Sol', 1, 654, 178, 45),
(6, 28, 'Tenis Nike Air Max 2024', 'Originais. Todos os tamanhos.', 6500.00, 1, 15, 'novo', 'disponivel', 'Matola', 'Costa do Sol', 1, 1234, 345, 89),
(6, 28, 'Bolsa Couro Feminina', 'Artesanal de couro legitimo.', 3200.00, 1, 10, 'novo', 'disponivel', 'Matola', 'Costa do Sol', 1, 543, 123, 34),
(7, 30, 'Apartamento T3 Polana', 'Mobiliado. Arrendamento mensal.', 25000.00, 1, 1, 'novo', 'disponivel', 'Maputo', 'Polana', 1, 2345, 567, 123),
(7, 31, 'Terreno 500m2 Zona Verde', 'Documentacao em ordem.', 1800000.00, 1, 1, 'novo', 'disponivel', 'Maputo', 'Zona Verde', 1, 1567, 345, 89),
(7, 30, 'Loja Comercial Centro', '80m2 no centro. Aluguer.', 15000.00, 1, 1, 'novo', 'disponivel', 'Maputo', 'Centro', 1, 987, 234, 56),
(8, 33, 'Corte Escova Tratamento', 'Corte feminino com escova.', 800.00, 0, 999, 'novo', 'disponivel', 'Maputo', 'Bairro Alto', 1, 456, 112, 29),
(8, 34, 'Manicure Completa', 'Esmalte em gel. 2 semanas.', 350.00, 0, 999, 'novo', 'disponivel', 'Maputo', 'Bairro Alto', 1, 345, 87, 23),
(8, 35, 'Maquagem Profissional', 'Para eventos e festas.', 2500.00, 1, 999, 'novo', 'disponivel', 'Maputo', 'Bairro Alto', 1, 234, 67, 18),
(9, 39, 'Bicicleta Montanha 26', 'Aro 26 21 velocidades.', 8500.00, 1, 5, 'novo', 'disponivel', 'Matola', 'Zona 1', 1, 543, 134, 36),
(9, 40, 'Kit Halteres Banco', 'Musculacao completa. 20kg.', 12000.00, 1, 3, 'novo', 'disponivel', 'Matola', 'Zona 1', 1, 321, 78, 21),
(9, 41, 'Bola Adidas Al Rihla', 'Tamanho 5. Certificada FIFA.', 2500.00, 0, 20, 'novo', 'disponivel', 'Matola', 'Zona 1', 1, 678, 189, 52);

INSERT INTO imagens_produto (produto_id, caminho, principal, ordem) VALUES
(1, 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=60', 1, 0),
(2, 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&auto=format&fit=crop&q=60', 1, 0),
(3, 'https://images.unsplash.com/photo-1621303837174-89787a7d4729?w=600&auto=format&fit=crop&q=60', 1, 0),
(4, 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600&auto=format&fit=crop&q=60', 1, 0),
(5, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=60', 1, 0),
(6, 'https://images.unsplash.com/photo-1622597467836-f3285f2131b8?w=600&auto=format&fit=crop&q=60', 1, 0),
(7, 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600&auto=format&fit=crop&q=60', 1, 0),
(8, 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600&auto=format&fit=crop&q=60', 1, 0),
(9, 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600&auto=format&fit=crop&q=60', 1, 0),
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
(31, 'https://images.unsplash.com/photo-1596394516093501ba68a0ba6?w=600&auto=format&fit=crop&q=60', 1, 0),
(32, 'https://images.unsplash.com/photo-1610557892470-55d9e80c0eb7?w=600&auto=format&fit=crop&q=60', 1, 0),
(33, 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&auto=format&fit=crop&q=60', 1, 0);

INSERT INTO favoritos (utilizador_id, produto_id) VALUES
(11, 1), (11, 4), (11, 7), (11, 10), (11, 17), (11, 23), (11, 29), (11, 33),
(12, 8), (12, 9), (12, 11), (12, 20), (12, 32), (12, 33),
(13, 23), (13, 24), (13, 29), (13, 30), (13, 31),
(14, 7), (14, 8), (14, 11), (14, 5), (14, 6),
(15, 25), (15, 26), (15, 27), (15, 28),
(16, 13), (16, 14), (16, 15), (16, 16), (16, 32);

INSERT INTO pedidos (cliente_id, vendedor_id, estado, subtotal, taxa_entrega, total, metodo_pagamento, estado_pagamento, endereco_entrega, notas) VALUES
(11, 1, 'entregue', 4500.00, 200.00, 4700.00, 'mpesa', 'pago', 'Bairro Alto, Rua da Paz 12', 'Entregar antes das 12h'),
(11, 2, 'confirmado', 18500.00, 300.00, 18800.00, 'mpesa', 'pago', 'Alto-Mae, Av. 24 de Julho', 'Caixa selada por favor'),
(12, 1, 'pendente', 350.00, 150.00, 500.00, 'dinheiro', 'pendente', 'Liberdade, Rua 5', ''),
(12, 6, 'preparando', 6500.00, 250.00, 6750.00, 'emola', 'pago', 'Liberdade, Rua 8', 'Tenis numero 42'),
(13, 1, 'entregue', 800.00, 150.00, 950.00, 'dinheiro', 'pago', 'Munhuwani, Bairro Novo', ''),
(13, 8, 'enviado', 800.00, 200.00, 1000.00, 'mpesa', 'pago', 'Munhuwani, Rua das Flores', 'Corte feminino'),
(14, 2, 'entregue', 28000.00, 500.00, 28500.00, 'transferencia', 'pago', 'Beira, Esturro, Rua 12', 'Factura por favor'),
(14, 5, 'confirmado', 5500.00, 300.00, 5800.00, 'mpesa', 'pago', 'Beira, Esturro', ''),
(15, 7, 'pendente', 25000.00, 0.00, 25000.00, 'transferencia', 'pendente', 'Pontagoya, Av. Eduardo Mondlane', 'Apartamento T3'),
(15, 4, 'preparando', 3500.00, 0.00, 3500.00, 'mpesa', 'pago', 'Pontagoya', 'Logotipo para loja'),
(16, 1, 'pendente', 1500.00, 400.00, 1900.00, 'mpesa', 'pendente', 'Nampula, Laravel', 'Entrega em 2 dias'),
(16, 3, 'confirmado', 3500.00, 0.00, 3500.00, 'dinheiro', 'pendente', 'Nampula, Laravel', 'Mecanico ao domicilio'),
(11, 6, 'pendente', 2200.00, 200.00, 2400.00, 'emola', 'pendente', 'Alto-Mae', 'Vestido tamanho M'),
(12, 9, 'cancelado', 8500.00, 300.00, 8800.00, 'mpesa', 'reembolsado', 'Liberdade', 'Cancelado pelo cliente'),
(13, 9, 'entregue', 2500.00, 200.00, 2700.00, 'dinheiro', 'pago', 'Munhuwani', 'Bola futebol');

INSERT INTO itens_pedido (pedido_id, produto_id, titulo_produto, preco_unitario, quantidade, subtotal) VALUES
(1, 4, 'Kit Salgados 50 un', 4500.00, 1, 4500.00),
(2, 8, 'Samsung Galaxy A54 5G', 18500.00, 1, 18500.00),
(3, 5, 'Marmita Executiva', 350.00, 1, 350.00),
(4, 25, 'Tenis Nike Air Max 2024', 6500.00, 1, 6500.00),
(5, 3, 'Bolo de Cenoura', 800.00, 1, 800.00),
(6, 29, 'Corte Escova Tratamento', 800.00, 1, 800.00),
(7, 10, 'AirPods Pro Gen 2', 28000.00, 1, 28000.00),
(8, 20, 'Smartwatch Amazfit GTS 4', 5500.00, 1, 5500.00),
(9, 27, 'Apartamento T3 Polana', 25000.00, 1, 25000.00),
(10, 17, 'Logotipo Profissional', 3500.00, 1, 3500.00),
(11, 1, 'Bolo de Chocolate Suiss', 1500.00, 1, 1500.00),
(12, 13, 'Revisao Automovel', 3500.00, 1, 3500.00),
(13, 23, 'Vestido Longo Floral', 2200.00, 1, 2200.00),
(14, 33, 'Bicicleta Montanha 26', 8500.00, 1, 8500.00),
(15, 35, 'Bola Adidas Al Rihla', 2500.00, 1, 2500.00);

INSERT INTO conversas (utilizador1_id, utilizador2_id, produto_id, ultima_mensagem_em) VALUES
(11, 2, 1, '2026-06-09 10:30:00'),
(11, 3, 8, '2026-06-09 11:45:00'),
(12, 2, 7, '2026-06-08 16:20:00'),
(13, 10, 23, '2026-06-09 09:15:00'),
(14, 2, 10, '2026-06-07 14:30:00'),
(15, 11, 25, '2026-06-08 08:00:00'),
(11, 6, 23, '2026-06-09 12:00:00');

INSERT INTO mensagens (conversa_id, remetente_id, conteudo, tipo, lida, criado_em) VALUES
(1, 11, 'Ola! O bolo de chocolate ainda esta disponivel?', 'texto', 1, '2026-06-09 10:00:00'),
(1, 2, 'Sim, ainda temos! Quantas fatias pretende?', 'texto', 1, '2026-06-09 10:05:00'),
(1, 11, 'Quero um bolo inteiro para aniversario.', 'texto', 1, '2026-06-09 10:10:00'),
(1, 2, 'Perfeito! Para que data? Precisamos de 48h.', 'texto', 1, '2026-06-09 10:15:00'),
(1, 11, 'Para sabado de manha. Pode entregar?', 'texto', 1, '2026-06-09 10:20:00'),
(1, 2, 'Sim, entregamos em Maputo. Taxa MZN 200.', 'texto', 1, '2026-06-09 10:25:00'),
(1, 11, 'Perfeito, combinado! Vou fazer o pedido agora.', 'texto', 1, '2026-06-09 10:30:00'),
(2, 11, 'Boas! O Galaxy A54 tem garantia?', 'texto', 1, '2026-06-09 11:00:00'),
(2, 2, 'Sim! 1 ano de garantia oficial Samsung.', 'texto', 1, '2026-06-09 11:05:00'),
(2, 11, 'E aceita M-Pesa?', 'texto', 1, '2026-06-09 11:10:00'),
(2, 2, 'Aceitamos M-Pesa, e-Mola e dinheiro.', 'texto', 1, '2026-06-09 11:15:00'),
(2, 11, 'Combinado! Vou encomendar.', 'texto', 1, '2026-06-09 11:45:00'),
(3, 12, 'Esses AirPods sao originais?', 'texto', 1, '2026-06-08 15:00:00'),
(3, 2, 'Sim, 100% originais. Factura incluida.', 'texto', 1, '2026-06-08 15:10:00'),
(3, 12, 'Quanto faz por 25.000?', 'texto', 1, '2026-06-08 15:30:00'),
(3, 2, 'O melhor que faco e 27.000. Inclui capa.', 'texto', 1, '2026-06-08 16:00:00'),
(3, 12, 'Esta bom, fechamos por 27.000!', 'texto', 1, '2026-06-08 16:20:00'),
(4, 13, 'Ola! Os tenis Nike sao originais?', 'texto', 1, '2026-06-09 09:00:00'),
(4, 10, 'Sim! Trazenos directamente da fabrica.', 'texto', 1, '2026-06-09 09:05:00'),
(4, 13, 'Tenho o pe 38. Ainda tem?', 'texto', 1, '2026-06-09 09:10:00'),
(4, 10, 'Tem sim! Temos na cor preta e branca.', 'texto', 1, '2026-06-09 09:15:00'),
(5, 14, 'Boas, os AirPods Pro ainda tem stock?', 'texto', 1, '2026-06-07 14:00:00'),
(5, 2, 'Sim! Ultimos 3 pares.', 'texto', 1, '2026-06-07 14:10:00'),
(5, 14, 'Enviam para a Beira?', 'texto', 1, '2026-06-07 14:20:00'),
(5, 2, 'Sim, mas a entrega e por conta do cliente.', 'texto', 1, '2026-06-07 14:30:00'),
(6, 15, 'Bom dia! O apartamento T3 ainda esta disponivel?', 'texto', 1, '2026-06-08 07:30:00'),
(6, 11, 'Bom dia! Sim, ainda esta. Quando quer visitar?', 'texto', 1, '2026-06-08 07:45:00'),
(6, 15, 'Pode ser amanha a tarde?', 'texto', 1, '2026-06-08 07:50:00'),
(6, 11, 'Claro! As 15h combinamos.', 'texto', 1, '2026-06-08 08:00:00'),
(7, 11, 'Ola! O vestido floral e de que tecido?', 'texto', 1, '2026-06-09 11:30:00'),
(7, 10, 'E de viscose, muito fresco.', 'texto', 1, '2026-06-09 11:35:00'),
(7, 11, 'Bonito! Tem tamanho M?', 'texto', 1, '2026-06-09 11:50:00'),
(7, 10, 'Sim! Temos em M e G.', 'texto', 1, '2026-06-09 12:00:00');

INSERT INTO avaliacoes (avaliador_id, avaliado_id, produto_id, estrelas, comentario, tipo) VALUES
(11, 2, 1, 5, 'Bolo incrivelmente delicioso!', 'produto'),
(11, 2, 4, 5, 'Salgados frescos e saborosos.', 'produto'),
(12, 2, 7, 4, 'Bom produto, entrega demorou.', 'produto'),
(13, 10, 23, 5, 'Vestido lindo! Igual a foto.', 'produto'),
(14, 2, 10, 5, 'AirPods originais e excelentes!', 'produto'),
(15, 11, 25, 4, 'Apartamento bom.', 'produto'),
(11, 3, 8, 4, 'Samsung funciona perfeitamente!', 'produto'),
(12, 6, 23, 5, 'Nike originais, satisfeito!', 'produto'),
(13, 8, 29, 4, 'Corte muito bom!', 'produto'),
(16, 1, 1, 5, 'Melhores bolos de Maputo!', 'produto');

INSERT INTO notificacoes (utilizador_id, titulo, corpo, tipo, lida) VALUES
(11, 'Pedido Confirmado', 'O seu pedido #2 foi confirmado.', 'pedido', 0),
(11, 'Produto Entregue', 'O seu pedido #1 foi entregue!', 'pedido', 1),
(11, 'Nova Mensagem', 'Joao Machava enviou-lhe uma mensagem.', 'mensagem', 0),
(12, 'Promocao Especial', 'Desconto de 20% em smartphones!', 'promocao', 0),
(12, 'Lembrete de Pedido', 'Complete o pagamento do pedido #4.', 'pedido', 0),
(13, 'Avaliacao Pendente', 'Avalie a sua compra.', 'avaliacao', 0),
(14, 'Bem-vindo a LINKA!', 'Conta criada com sucesso.', 'sistema', 1),
(15, 'Pedido Recebido', 'O vendedor recebeu o seu pedido #9.', 'pedido', 0);

INSERT INTO denuncias (denunciante_id, denunciado_id, produto_id, motivo, descricao, estado) VALUES
(14, NULL, NULL, 'spam', 'Anuncios repetidos na mesma categoria.', 'pendente'),
(12, NULL, NULL, 'preco_abusivo', 'Preco muito acima do mercado.', 'em_analise');

INSERT INTO sancoes (utilizador_id, admin_id, tipo, motivo, activa) VALUES
(12, 1, 'aviso', 'Anuncios com precos abusivos.', 1);
