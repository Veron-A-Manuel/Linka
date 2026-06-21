const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { gerarAccessToken, gerarRefreshToken, verificarRefreshToken } = require('../utils/token');
const utilizadorModel = require('../models/utilizador.model');
const vendedorModel = require('../models/vendedor.model');
const sessaoModel = require('../models/sessao.model');
const db = require('../config/base-de-dados');
const ErroApp = require('../utils/erro-app');

// ============================================================
// LINKA - Servico de Autenticacao (com Multi-device Sessions)
// ============================================================

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function parseDeviceName(userAgent) {
  if (!userAgent) return 'Dispositivo desconhecido';
  const ua = userAgent.toLowerCase();
  let device = '';
  let os = '';

  // OS
  if (ua.includes('android')) os = 'Android';
  else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';
  else if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('macintosh') || ua.includes('mac os')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';

  // Browser
  if (ua.includes('edg/')) device = 'Edge';
  else if (ua.includes('chrome/') && !ua.includes('edg/')) device = 'Chrome';
  else if (ua.includes('firefox/')) device = 'Firefox';
  else if (ua.includes('safari/') && !ua.includes('chrome')) device = 'Safari';
  else if (ua.includes('opera') || ua.includes('opr/')) device = 'Opera';

  if (device && os) return `${device} — ${os}`;
  if (device) return device;
  if (os) return os;
  return userAgent.substring(0, 60);
}

function getIpFromReq(req) {
  if (!req) return null;
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.socket?.remoteAddress
    || null;
}

class AutenticacaoService {
  async registarCliente(dados) {
    const { nome, email, telefone, senha, tipo } = dados;

    const existente = await utilizadorModel.verificarExistencia(email, telefone);
    if (existente) {
      if (existente.email === email) throw new ErroApp('Email ja esta em uso.', 409);
      if (existente.telefone === telefone) throw new ErroApp('Telefone ja esta em uso.', 409);
    }

    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;
    const senhaHash = await bcrypt.hash(senha, saltRounds);

    const tipoRegisto = tipo === 'vendedor' ? 'vendedor' : 'cliente';

    const id = await db.transaction(async (trx) => {
      const utilizadorId = await utilizadorModel.criar({
        nome,
        email,
        telefone,
        senha_hash: senhaHash,
        tipo: tipoRegisto,
        estado: 'activo',
      }, trx);

      if (tipoRegisto === 'vendedor') {
        await vendedorModel.criar({
          utilizador_id: utilizadorId,
          nome_loja: nome,
          plano: 'gratuito',
        }, trx);
      }

      return utilizadorId;
    });

    return {
      id,
      nome,
      email,
      telefone,
      tipo: tipoRegisto,
    };
  }

  async registar(dados) {
    return this.registarCliente(dados);
  }

  async login(dadosOuEmail, senha, req = null) {
    const identificador = typeof dadosOuEmail === 'object' && dadosOuEmail !== null
      ? dadosOuEmail.email
      : dadosOuEmail;
    const senhaFinal = typeof dadosOuEmail === 'object' && dadosOuEmail !== null
      ? dadosOuEmail.senha
      : senha;

    const utilizador = await utilizadorModel.procurarPorEmailOuTelefone(identificador);
    if (!utilizador) {
      throw new ErroApp('Credenciais invalidas.', 401);
    }

    if (utilizador.estado !== 'activo') {
      throw new ErroApp(`A conta encontra-se: ${utilizador.estado}. Contacte o suporte.`, 403);
    }

    const senhaValida = await bcrypt.compare(senhaFinal, utilizador.senha_hash);
    if (!senhaValida) {
      throw new ErroApp('Credenciais invalidas.', 401);
    }

    const accessToken = gerarAccessToken(utilizador);

    // Criar sessão antes de gerar refresh token
    const deviceName = parseDeviceName(req?.headers?.['user-agent']);
    const ipAddress = getIpFromReq(req);
    const refreshExpiryDays = parseInt(process.env.JWT_REFRESH_EXPIRA_EM, 10) || 7;

    const sessaoId = await sessaoModel.criar({
      utilizador_id: utilizador.id,
      refresh_token_hash: '', // preencher depois
      device_name: deviceName,
      ip_address: ipAddress,
      user_agent: req?.headers?.['user-agent'] || null,
      expires_at: db.raw(`DATE_ADD(NOW(), INTERVAL ${refreshExpiryDays} DAY)`),
    });

    const refreshToken = gerarRefreshToken(utilizador.id, sessaoId);

    // Actualizar hash da sessão com o token real
    await db('user_sessions').where({ id: sessaoId }).update({
      refresh_token_hash: hashToken(refreshToken),
    });

    // Manter compatibilidade: guardar refresh token na tabela utilizadores
    await utilizadorModel.actualizar(utilizador.id, {
      refresh_token: refreshToken,
      ultimo_acesso_em: db.fn.now(),
    });

    const dadosUtilizador = {
      id: utilizador.id,
      nome: utilizador.nome,
      email: utilizador.email,
      tipo: utilizador.tipo,
      avatar: utilizador.avatar,
    };

    return {
      utilizador: dadosUtilizador,
      accessToken,
      refreshToken,
    };
  }

  async logout(utilizadorId, req = null) {
    // Revogar sessão actual se houver refresh token no cookie
    const refreshToken = req?.cookies?.refresh_token;
    if (refreshToken) {
      const hash = hashToken(refreshToken);
      const sessao = await sessaoModel.procurarPorTokenHash(hash);
      if (sessao) {
        await sessaoModel.revogar(sessao.id, utilizadorId);
      }
    }

    // Manter compatibilidade
    await utilizadorModel.actualizar(utilizadorId, {
      refresh_token: null,
    });

    return true;
  }

  async renovarTokens(token, req = null) {
    const payload = verificarRefreshToken(token);
    if (!payload) {
      throw new ErroApp('Refresh token invalido ou expirado.', 401);
    }

    const utilizador = await utilizadorModel.procurarPorId(payload.id);
    if (!utilizador) {
      throw new ErroApp('Utilizador nao encontrado.', 401);
    }

    if (utilizador.estado !== 'activo') {
      throw new ErroApp('Conta inativa.', 403);
    }

    // Verificar sessão se tiver session_id no token
    let sessaoActual = null;
    if (payload.sid) {
      sessaoActual = await db('user_sessions').where({ id: payload.sid, revoked: 0 }).first();
      if (!sessaoActual) {
        throw new ErroApp('Sessao revogada. Faca login novamente.', 401);
      }
      // Verificar se o hash bate certo
      const hashApresentado = hashToken(token);
      if (sessaoActual.refresh_token_hash !== hashApresentado) {
        throw new ErroApp('Refresh token nao reconhecido.', 401);
      }
    } else {
      // Fallback: verificar pela coluna refresh_token na tabela utilizadores
      if (utilizador.refresh_token !== token) {
        throw new ErroApp('Refresh token nao reconhecido.', 401);
      }
    }

    const novoAccessToken = gerarAccessToken(utilizador);
    const novoRefreshToken = gerarRefreshToken(utilizador.id, sessaoActual?.id || null);

    // Actualizar sessão
    if (sessaoActual) {
      await db('user_sessions').where({ id: sessaoActual.id }).update({
        refresh_token_hash: hashToken(novoRefreshToken),
        last_activity: db.fn.now(),
      });
    }

    // Manter compatibilidade
    await utilizadorModel.actualizar(utilizador.id, {
      refresh_token: novoRefreshToken,
    });

    return {
      utilizador: {
        id: utilizador.id,
        nome: utilizador.nome,
        email: utilizador.email,
        tipo: utilizador.tipo,
      },
      accessToken: novoAccessToken,
      refreshToken: novoRefreshToken,
    };
  }
}

module.exports = new AutenticacaoService();
