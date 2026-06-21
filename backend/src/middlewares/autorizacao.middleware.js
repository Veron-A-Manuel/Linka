const resposta = require('../utils/resposta');

const exigirTipos = (...tiposPermitidos) => {
  return (req, res, next) => {
    if (!req.utilizador || !tiposPermitidos.includes(req.utilizador.tipo)) {
      return resposta.semPermissao(res, 'Sem permissao para aceder a este recurso.');
    }

    next();
  };
};

const exigirAdmin = exigirTipos('admin');
const exigirVendedor = exigirTipos('vendedor', 'admin');

module.exports = {
  exigirTipos,
  exigirAdmin,
  exigirVendedor,
};
