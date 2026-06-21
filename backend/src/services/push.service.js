const pushModel = require('../models/push-subscription.model');
const webpush = require('web-push');
const ErroApp = require('../utils/erro-app');

class PushService {
  constructor() {
    this.vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
    this.vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';

    if (this.vapidPublicKey && this.vapidPrivateKey) {
      webpush.setVapidDetails(
        'mailto:linka@linka.co.mz',
        this.vapidPublicKey,
        this.vapidPrivateKey
      );
    }
  }

  getVapidPublicKey() {
    if (!this.vapidPublicKey) {
      throw new ErroApp('Push notifications não configuradas no servidor.', 503);
    }
    return this.vapidPublicKey;
  }

  async subscrever(utilizadorId, subscription, userAgent) {
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      throw new ErroApp('Subscription inválida.', 400);
    }
    return await pushModel.guardar(utilizadorId, subscription, userAgent);
  }

  async cancelarSubscricao(utilizadorId, endpoint) {
    return await pushModel.remover(utilizadorId, endpoint);
  }

  async enviarParaUtilizador(utilizadorId, titulo, corpo, dados = {}) {
    if (!this.vapidPublicKey) return;

    const subs = await pushModel.listarPorUtilizador(utilizadorId);
    if (subs.length === 0) return;

    const payload = JSON.stringify({ titulo, corpo, ...dados });

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await pushModel.remover(utilizadorId, sub.endpoint);
        }
      }
    }
  }

  async enviarParaTodos(titulo, corpo, dados = {}) {
    if (!this.vapidPublicKey) return;

    const subs = await pushModel.listarTodas();
    if (subs.length === 0) return;

    const payload = JSON.stringify({ titulo, corpo, ...dados });

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await pushModel.remover(sub.utilizador_id, sub.endpoint);
        }
      }
    }
  }
}

module.exports = new PushService();
