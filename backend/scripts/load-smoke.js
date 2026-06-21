process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.LINKA_SKIP_DB_CHECK = '1';

const { app } = require('../server');

const total = Number(process.env.LOAD_REQUESTS || 50);
const concorrencia = Number(process.env.LOAD_CONCURRENCY || 10);

async function run() {
  const server = app.listen(0);
  const port = server.address().port;
  const url = `http://127.0.0.1:${port}/api/saude`;

  const inicio = Date.now();
  let indice = 0;

  async function worker() {
    while (true) {
      const atual = indice++;
      if (atual >= total) break;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Pedido ${atual} falhou com status ${res.status}`);
      }
    }
  }

  try {
    await Promise.all(Array.from({ length: concorrencia }, () => worker()));
    const duracao = Date.now() - inicio;
    console.log(JSON.stringify({
      sucesso: true,
      pedidos: total,
      concorrencia,
      duracao_ms: duracao,
      rps_aproximado: Number((total / (duracao / 1000)).toFixed(2))
    }, null, 2));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

run().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
