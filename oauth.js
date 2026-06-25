// OAuth 2.0 simplificado para MCP interno
// Flujo: Authorization Code Grant

const CLIENT_ID = process.env.OAUTH_CLIENT_ID || 'innova-mcp-client';
const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET || '';
const ACCESS_TOKEN = process.env.MCP_SECRET_TOKEN || '';

// Códigos temporales de autorización (en memoria)
const authCodes = new Map();

function generateCode() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function setupOAuth(app) {

  // 1. Endpoint de autorización — claude.ai redirige aquí
  app.get('/authorize', (req, res) => {
    const { client_id, redirect_uri, state, response_type } = req.query;

    // Validar client_id
    if (client_id !== CLIENT_ID) {
      return res.status(401).send('Invalid client_id');
    }

    // Generar código de autorización temporal
    const code = generateCode();
    authCodes.set(code, { redirect_uri, createdAt: Date.now() });

    // Limpiar códigos viejos (>5 min)
    for (const [k, v] of authCodes.entries()) {
      if (Date.now() - v.createdAt > 300000) authCodes.delete(k);
    }

    // Redirigir con el código
    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.set('code', code);
    if (state) redirectUrl.searchParams.set('state', state);

    res.redirect(redirectUrl.toString());
  });

  // 2. Endpoint de token — intercambia código por access token
  app.post('/token', express.urlencoded({ extended: true }), (req, res) => {
    const { grant_type, code, client_id, client_secret, redirect_uri } = req.body;

    if (grant_type !== 'authorization_code') {
      return res.status(400).json({ error: 'unsupported_grant_type' });
    }

    if (client_id !== CLIENT_ID || client_secret !== CLIENT_SECRET) {
      return res.status(401).json({ error: 'invalid_client' });
    }

    if (!authCodes.has(code)) {
      return res.status(400).json({ error: 'invalid_grant' });
    }

    authCodes.delete(code);

    res.json({
      access_token: ACCESS_TOKEN,
      token_type: 'Bearer',
      expires_in: 86400,
    });
  });

  // 3. Discovery endpoint — claude.ai lo usa para descubrir el servidor OAuth
  app.get('/.well-known/oauth-authorization-server', (req, res) => {
    const base = process.env.SERVER_URL || `https://${req.headers.host}`;
    res.json({
      issuer: base,
      authorization_endpoint: `${base}/authorize`,
      token_endpoint: `${base}/token`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code'],
      code_challenge_methods_supported: ['S256'],
    });
  });

  // También en /mcp/.well-known por si claude.ai lo busca ahí
  app.get('/mcp/.well-known/oauth-authorization-server', (req, res) => {
    const base = process.env.SERVER_URL || `https://${req.headers.host}`;
    res.json({
      issuer: base,
      authorization_endpoint: `${base}/authorize`,
      token_endpoint: `${base}/token`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code'],
      code_challenge_methods_supported: ['S256'],
    });
  });
}
