require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../src/config/base-de-dados');
const anuncioAnalyticsService = require('../src/services/anuncio-analytics.service');

async function executarAgregacao() {
  try {
    console.log('[Cron] Iniciando agregação de analytics...');
    await db.raw('SELECT 1');
    console.log('[Cron] Ligação à BD OK.');

    const resultado = await anuncioAnalyticsService.agregarDados();
    console.log('[Cron] Agregação concluída:', JSON.stringify(resultado));

    await db.destroy();
    process.exit(0);
  } catch (erro) {
    console.error('[Cron] Erro na agregação:', erro);
    await db.destroy().catch(() => {});
    process.exit(1);
  }
}

executarAgregacao();
