const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.LINKA_SKIP_DB_CHECK = '1';

const { app } = require('../server');

let server;
let baseUrl;

async function startServer() {
  server = app.listen(0);
  baseUrl = `http://127.0.0.1:${server.address().port}`;
}

async function stopServer() {
  if (server) await new Promise(r => server.close(r));
}

async function get(path) {
  const res = await fetch(`${baseUrl}${path}`);
  return { status: res.status, body: await res.json() };
}

async function post(path, data, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST', headers, body: JSON.stringify(data)
  });
  return { status: res.status, body: await res.json() };
}

test.before(async () => { await startServer(); });
test.after(async () => { await stopServer(); });

test('GET /api/saude — health check', async () => {
  const r = await get('/api/saude');
  assert.equal(r.status, 200);
  assert.equal(r.body.sucesso, true);
  assert.ok(r.body.versao);
});

test('GET /api/categorias — listar categorias', async () => {
  const r = await get('/api/categorias');
  assert.equal(r.status, 200);
  assert.equal(r.body.sucesso, true);
  assert.ok(Array.isArray(r.body.dados));
});

test('GET /api/explore — listar produtos', async () => {
  const r = await get('/api/explore?limite=5');
  assert.equal(r.status, 200);
  assert.ok(r.body.dados);
});

test('GET /api/explore com filtros — preco_min, ordem', async () => {
  const r = await get('/api/explore?preco_min=100&ordem=barato&limite=5');
  assert.equal(r.status, 200);
  assert.ok(r.body.dados);
});

test('GET /api/explore/busca — sugestões', async () => {
  const r = await get('/api/explore/busca?termo=te&limite=3');
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.body.dados));
});

test('POST /api/pedidos sem auth — 401', async () => {
  const r = await post('/api/pedidos', {
    itens: [{ produto_id: 1, quantidade: 1 }],
    endereco_entrega: 'Maputo'
  });
  assert.equal(r.status, 401);
});

test('POST /api/carrinho sem auth — 401', async () => {
  const r = await post('/api/carrinho', { produto_id: 1 });
  assert.equal(r.status, 401);
});

test('GET /api/ranking/vendedores — ranking público', async () => {
  const r = await get('/api/ranking/vendedores');
  assert.equal(r.status, 200);
  assert.ok(r.body.sucesso);
});

test('Rota inexistente — 404', async () => {
  const r = await get('/api/rota-inexistente-xyz');
  assert.equal(r.status, 404);
  assert.equal(r.body.sucesso, false);
});

test('Validação — middleware registo', async () => {
  const { validarRegisto } = require('../src/middlewares/validacao.middleware');
  const exec = (middleware, body) => new Promise((resolve) => {
    const req = { body };
    const res = {
      statusCode: 200,
      payload: null,
      status(c) { this.statusCode = c; return this; },
      json(p) { this.payload = p; resolve({ status: this.statusCode, payload: p }); }
    };
    middleware(req, res, () => resolve({ status: 200, next: true }));
  });

  const valid = await exec(validarRegisto, {
    nome: 'Teste', email: 'test@linka.com', telefone: '840000000', senha: 'Password123'
  });
  assert.equal(valid.next || valid.status === 200, true);

  const invalid = await exec(validarRegisto, {
    nome: '', email: 'invalid', telefone: '12', senha: '123'
  });
  assert.ok(invalid.status >= 400);
});

console.log('Linka API test suite loaded.');
