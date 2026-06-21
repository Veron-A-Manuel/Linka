const autenticacaoService = require('../services/autenticacao.service');
const resposta = require('../utils/resposta');
const { asyncHandler } = require('../middlewares/erro.middleware');

class AutenticacaoController {
  registar = asyncHandler(async (req, res) => {
    const utilizador = await autenticacaoService.registar(req.body);
    return resposta.criado(res, { utilizador }, 'Registo efectuado com sucesso.');
  });

  login = asyncHandler(async (req, res) => {
    const { utilizador, accessToken, refreshToken } = await autenticacaoService.login(req.body, null, req);

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    };

    res.cookie('access_token', accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refresh_token', refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return resposta.sucesso(res, { utilizador, token: accessToken }, 'Login efectuado com sucesso.');
  });

  logout = asyncHandler(async (req, res) => {
    await autenticacaoService.logout(req.utilizador.id, req);

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    };

    res.clearCookie('access_token', cookieOptions);
    res.clearCookie('refresh_token', cookieOptions);

    return resposta.sucesso(res, null, 'Sessao terminada.');
  });

  refresh = asyncHandler(async (req, res) => {
    const token = req.cookies.refresh_token;

    if (!token) {
      return resposta.naoAutorizado(res, 'Refresh token em falta.');
    }

    const { utilizador, accessToken, refreshToken } = await autenticacaoService.renovarTokens(token, req);

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    };

    res.cookie('access_token', accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refresh_token', refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return resposta.sucesso(res, { utilizador, token: accessToken }, 'Tokens renovados.');
  });
}

module.exports = new AutenticacaoController();
