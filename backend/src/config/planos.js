const TIPOS_CONTA = [
  {
    codigo: 'cliente',
    nome: 'Cliente',
    descricao: 'Comprar produtos e negociar com vendedores locais.',
    disponivel: true,
  },
  {
    codigo: 'vendedor',
    nome: 'Vendedor',
    descricao: 'Vender produtos no marketplace Linka.',
    disponivel: true,
  },
  {
    codigo: 'prestador',
    nome: 'Prestador de servicos',
    descricao: 'Publicar e gerir servicos profissionais.',
    disponivel: false,
    etiqueta: 'Brevemente',
  },
];

const PLANOS_VENDEDOR = [
  {
    codigo: 'gratuito',
    nome: 'Gratuito',
    descricao: 'Para testar a plataforma com poucos produtos.',
    preco_mensal: 0,
    moeda: 'MZN',
    max_produtos: 5,
    destaque_anuncios: false,
    loja_personalizada: false,
    analytics_avancado: false,
    recomendado: false,
    actividades: ['venda ocasional', 'bolos e doces', 'artesanato', 'produtos usados'],
  },
  {
    codigo: 'basico',
    nome: 'Basico',
    descricao: 'Para vendedores com movimento semanal e catalogo pequeno.',
    preco_mensal: 149,
    moeda: 'MZN',
    max_produtos: 20,
    destaque_anuncios: false,
    loja_personalizada: false,
    analytics_avancado: false,
    recomendado: false,
    actividades: ['comida por encomenda', 'moda', 'cosmeticos', 'acessorios'],
  },
  {
    codigo: 'pro',
    nome: 'Pro',
    descricao: 'Para lojas e vendedores com vendas frequentes.',
    preco_mensal: 399,
    moeda: 'MZN',
    max_produtos: 75,
    destaque_anuncios: true,
    loja_personalizada: false,
    analytics_avancado: false,
    recomendado: true,
    actividades: ['electronica', 'mercearia local', 'pecas auto', 'revenda'],
  },
  {
    codigo: 'premium',
    nome: 'Premium',
    descricao: 'Para lojas estabelecidas que precisam de mais visibilidade.',
    preco_mensal: 799,
    moeda: 'MZN',
    max_produtos: -1,
    destaque_anuncios: true,
    loja_personalizada: true,
    analytics_avancado: true,
    recomendado: false,
    actividades: ['lojas formais', 'grossistas', 'multi-categoria', 'marcas locais'],
  },
];

function listarPlanosVendedor() {
  return PLANOS_VENDEDOR.map((plano) => ({ ...plano }));
}

function listarTiposConta() {
  return TIPOS_CONTA.map((tipo) => ({ ...tipo }));
}

function obterPlanoVendedor(codigo) {
  return PLANOS_VENDEDOR.find((plano) => plano.codigo === codigo);
}

function planoVendedorExiste(codigo) {
  return Boolean(obterPlanoVendedor(codigo));
}

module.exports = {
  TIPOS_CONTA,
  PLANOS_VENDEDOR,
  listarPlanosVendedor,
  listarTiposConta,
  obterPlanoVendedor,
  planoVendedorExiste,
};
