const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.LINKA_SKIP_DB_CHECK = '1';

const { app } = require('../server');

test('GET /api/saude responde com estado saudável', async () => {
  const server = app.listen(0);
  try {
    const url = `http://127.0.0.1:${server.address().port}/api/saude`;
    const res = await fetch(url);
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.sucesso, true);
    assert.ok(body.mensagem);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('Rota inexistente devolve 404 padrão', async () => {
  const server = app.listen(0);
  try {
    const url = `http://127.0.0.1:${server.address().port}/api/rota-inexistente`;
    const res = await fetch(url);
    const body = await res.json();

    assert.equal(res.status, 404);
    assert.equal(body.sucesso, false);
    assert.equal(body.codigo, 404);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
