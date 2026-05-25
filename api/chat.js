// Vercel serverless function — handles all AI chat requests for production
// The API key stays on the server, users never see it.

const PROVIDERS = {
  groq: {
    url:   'https://api.groq.com/openai/v1/chat/completions',
    model: process.env.GROQ_MODEL       || 'llama-3.3-70b-versatile',
    key:   process.env.GROQ_API_KEY,
  },
  openrouter: {
    url:   'https://openrouter.ai/api/v1/chat/completions',
    model: process.env.OPENROUTER_MODEL || 'google/gemma-3-27b-it:free',
    key:   process.env.OPENROUTER_API_KEY,
    extra: { 'HTTP-Referer': 'https://foldbase.app', 'X-Title': 'Foldbase' },
  },
  cerebras: {
    url:   'https://api.cerebras.ai/v1/chat/completions',
    model: process.env.CEREBRAS_MODEL   || 'llama-3.3-70b',
    key:   process.env.CEREBRAS_API_KEY,
  },
  sambanova: {
    url:   'https://api.sambanova.ai/v1/chat/completions',
    model: process.env.SAMBANOVA_MODEL  || 'Meta-Llama-3.3-70B-Instruct',
    key:   process.env.SAMBANOVA_API_KEY,
  },
};

function getActiveProvider() {
  for (const [name, cfg] of Object.entries(PROVIDERS)) {
    if (cfg.key) return { name, ...cfg };
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, max_tokens = 3000 } = req.body;
  if (!messages?.length) {
    return res.status(400).json({ error: 'messages is required' });
  }

  const provider = getActiveProvider();
  if (!provider) {
    return res.status(500).json({
      error: 'No AI API key configured on server. Add GROQ_API_KEY or OPENROUTER_API_KEY to Vercel environment variables.'
    });
  }

  const response = await fetch(provider.url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${provider.key}`,
      'Content-Type':  'application/json',
      ...(provider.extra || {}),
    },
    body: JSON.stringify({
      model:       provider.model,
      messages,
      max_tokens,
      temperature: 0.7,
      stream:      true,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    return res.status(response.status).json({ error: err.error?.message || `HTTP ${response.status}` });
  }

  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');

  for await (const chunk of response.body) {
    res.write(chunk);
  }
  res.end();
}
