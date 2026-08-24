'use strict';

const {
  getZargoxAIResponse,
  DEFAULT_MODEL,
  webSearchConfiguration
} = require('./zargox-ai.js');

const rateWindows = new Map();
const RATE_WINDOW_MS = 60 * 1000;
const RATE_LIMIT = Math.max(1, Math.min(Number(process.env.ZARGOX_RATE_LIMIT_PER_MINUTE) || 20, 120));

function requestKey(req) {
  return String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'anonymous').split(',')[0].trim();
}

function consumeRateLimit(req) {
  const now = Date.now();
  const key = requestKey(req);
  const current = rateWindows.get(key);
  if (!current || now - current.startedAt >= RATE_WINDOW_MS) {
    if (rateWindows.size > 5000) {
      for (const [storedKey, window] of rateWindows) {
        if (now - window.startedAt >= RATE_WINDOW_MS) rateWindows.delete(storedKey);
      }
      if (rateWindows.size > 5000) rateWindows.delete(rateWindows.keys().next().value);
    }
    rateWindows.set(key, { startedAt: now, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= RATE_LIMIT;
}

function setHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
}

module.exports = async function handler(req, res) {
  setHeaders(res);

  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      name: 'Zorgax',
      entity: 'ZORGAX-001',
      legacy_name: 'Zargox',
      service: 'MyZubster Public AI',
      provider: 'deepseek-direct',
      model: DEFAULT_MODEL,
      public: true,
      configured: Boolean(process.env.DEEPSEEK_API_KEY),
      live_context: String(process.env.ZARGOX_LIVE_CONTEXT_ENABLED || 'true').toLowerCase() !== 'false',
      web_search: webSearchConfiguration(),
      live_sources: ['Brave Search or Tavily (when configured)', 'Wikipedia', 'GDELT (time-sensitive queries)']
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  if (!consumeRateLimit(req)) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ ok: false, error: 'Troppe richieste: riprova tra un minuto' });
  }

  try {
    const body = req.body || {};
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message) return res.status(400).json({ ok: false, error: 'message is required' });
    if (message.length > 12000) return res.status(400).json({ ok: false, error: 'message too long' });

    const mode = String(body.mode || 'Assistente').slice(0, 40);
    const tone = String(body.tone || 'Chiaro').slice(0, 40);
    const contextualMessage = `[Modalità: ${mode}; stile: ${tone}]\n${message}`;
    const result = await getZargoxAIResponse(contextualMessage, body.history || [], {
      useWeb: body.useWeb !== false
    });

    return res.status(200).json({
      ok: true,
      name: 'Zorgax',
      entity: 'ZORGAX-001',
      response: result.text,
      model: result.model,
      provider: result.provider || 'deepseek-direct',
      web_access_requested: Boolean(result.webAccessRequested),
      web_search_provider: result.webSearchProvider,
      live_context_used: Boolean(result.liveContextUsed),
      live_sources: result.liveSources || [],
      external_sources: result.liveSources || [],
      live_context_errors: result.liveContextErrors || [],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Zargox AI error:', error);
    const missingKey = error && error.code === 'deepseek_key_missing';
    return res.status(missingKey ? 503 : 500).json({
      ok: false,
      error: missingKey ? 'DeepSeek API is not configured' : 'Zargox AI is temporarily unavailable',
      detail: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
};
