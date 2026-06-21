const db = require('../config/base-de-dados');

class PushSubscriptionModel {
  async guardar(utilizadorId, subscription, userAgent) {
    const existente = await db('push_subscriptions')
      .where({ utilizador_id: utilizadorId, endpoint: subscription.endpoint })
      .first();

    if (existente) {
      await db('push_subscriptions')
        .where('id', existente.id)
        .update({
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          user_agent: userAgent,
          activa: 1,
          actualizado_em: db.fn.now()
        });
      return existente.id;
    }

    const [id] = await db('push_subscriptions').insert({
      utilizador_id: utilizadorId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      user_agent: userAgent
    });
    return id;
  }

  async remover(utilizadorId, endpoint) {
    return await db('push_subscriptions')
      .where({ utilizador_id: utilizadorId, endpoint })
      .update({ activa: 0 });
  }

  async listarPorUtilizador(utilizadorId) {
    return await db('push_subscriptions')
      .where({ utilizador_id: utilizadorId, activa: 1 });
  }

  async listarTodas() {
    return await db('push_subscriptions')
      .where('activa', 1);
  }
}

module.exports = new PushSubscriptionModel();
