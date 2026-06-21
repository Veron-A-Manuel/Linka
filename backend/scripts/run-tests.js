process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.LINKA_SKIP_DB_CHECK = '1';

const assert = require('node:assert/strict');
const { app } = require('../server');
const { validarRegisto, validarLogin } = require('../src/middlewares/validacao.middleware');

async function requestJson(path) {
  const server = app.listen(0);
  try {
    const url = `http://127.0.0.1:${server.address().port}${path}`;
    const res = await fetch(url);
    const body = await res.json();
    return { res, body };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function executarMiddleware(middleware, body) {
  return new Promise((resolve, reject) => {
    const req = { body };
    const res = {
      statusCode: 200,
      payload: null,
      status(codigo) {
        this.statusCode = codigo;
        return this;
      },
      json(payload) {
        this.payload = payload;
        resolve({
          chamouNext: false,
          status: this.statusCode,
          payload,
          body: req.body,
        });
      },
    };

    try {
      middleware(req, res, () => {
        resolve({
          chamouNext: true,
          status: res.statusCode,
          payload: res.payload,
          body: req.body,
        });
      });
    } catch (erro) {
      reject(erro);
    }
  });
}

async function main() {
  const saude = await requestJson('/api/saude');
  assert.equal(saude.res.status, 200);
  assert.equal(saude.body.sucesso, true);
  assert.ok(saude.body.mensagem);

  const rotaInexistente = await requestJson('/api/rota-inexistente');
  assert.equal(rotaInexistente.res.status, 404);
  assert.equal(rotaInexistente.body.sucesso, false);
  assert.equal(rotaInexistente.body.codigo, 404);

  const registoVendedor = await executarMiddleware(validarRegisto, {
    nome: 'Vendedor Teste',
    email: 'VENDEDOR@LINKA.COM',
    telefone: '84 000 0000',
    senha: 'Password123',
    tipo: 'vendedor',
  });
  assert.equal(registoVendedor.chamouNext, true);
  assert.equal(registoVendedor.body.email, 'vendedor@linka.com');
  assert.equal(registoVendedor.body.telefone, '840000000');
  assert.equal(registoVendedor.body.tipo, 'vendedor');

  const registoCliente = await executarMiddleware(validarRegisto, {
    nome: 'Cliente Teste',
    email: 'cliente@linka.com',
    telefone: '850000000',
    senha: 'Password123',
  });
  assert.equal(registoCliente.chamouNext, true);
  assert.equal(registoCliente.body.tipo, 'cliente');

  const registoAdmin = await executarMiddleware(validarRegisto, {
    nome: 'Admin Teste',
    email: 'admin@linka.com',
    telefone: '860000000',
    senha: 'Password123',
    tipo: 'admin',
  });
  assert.equal(registoAdmin.chamouNext, false);
  assert.equal(registoAdmin.status, 422);

  const loginTelefone = await executarMiddleware(validarLogin, {
    email: '84 000 0000',
    senha: 'Password123',
  });
  assert.equal(loginTelefone.chamouNext, true);
  assert.equal(loginTelefone.body.email, '840000000');

  console.log('Smoke tests passed.');
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
