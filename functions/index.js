const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const crypto = require('crypto');
const OpenAI = require('openai');

admin.initializeApp();
const db = admin.firestore();
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
const RATE_LIMIT_SALT = defineSecret('RATE_LIMIT_SALT');

const ALLOWED_ORIGINS = new Set([
  'https://ernandes-sobreira.github.io',
  'http://localhost:5000',
  'http://localhost:5500',
  'http://127.0.0.1:5500'
]);

const PRICES = {
  'gpt-5.6-luna': { input: 0.20, output: 1.20 },
  'gpt-5.6-terra': { input: 2.00, output: 12.00 },
  'gpt-5.6-sol': { input: 4.00, output: 20.00 }
};

function cors(req, res) {
  const origin = req.get('origin');
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
  }
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
}

function clientHash(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = forwarded || req.ip || 'unknown';
  return crypto.createHash('sha256').update(`${RATE_LIMIT_SALT.value()}|${ip}`).digest('hex');
}

async function enforceDailyLimit(hash, max = 5) {
  const day = new Date().toISOString().slice(0, 10);
  const ref = db.collection('easyLattesUsage').doc(`${day}_${hash.slice(0, 32)}`);
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    const used = snap.exists ? Number(snap.data().count || 0) : 0;
    if (used >= max) return false;
    tx.set(ref, { count: used + 1, day, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    return true;
  });
}

function compactPayload(body) {
  const safe = body && typeof body === 'object' ? body : {};
  return {
    researcher: String(safe.researcher || '').slice(0, 160),
    declared_summary: String(safe.declared_summary || '').slice(0, 3500),
    areas: Array.isArray(safe.areas) ? safe.areas.slice(0, 12).map(x => String(x).slice(0, 120)) : [],
    counts: safe.counts && typeof safe.counts === 'object' ? safe.counts : {},
    recent_by_year: Array.isArray(safe.recent_by_year) ? safe.recent_by_year.slice(0, 8) : [],
    keywords: Array.isArray(safe.keywords) ? safe.keywords.slice(0, 18) : [],
    samples: safe.samples && typeof safe.samples === 'object' ? Object.fromEntries(
      Object.entries(safe.samples).slice(0, 8).map(([k, arr]) => [k, Array.isArray(arr) ? arr.slice(0, 28).map(x => ({
        title: String(x?.title || '').slice(0, 240),
        year: Number.isFinite(Number(x?.year)) ? Number(x.year) : null
      })) : []])
    ) : {}
  };
}

const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['headline','identity','strengths','opportunities','next_90_days','strategic_keywords','lattes_actions','suggested_summary','caution'],
  properties: {
    headline: { type: 'string' },
    identity: { type: 'string' },
    strengths: { type: 'array', minItems: 2, maxItems: 4, items: { type: 'string' } },
    opportunities: { type: 'array', minItems: 2, maxItems: 4, items: { type: 'string' } },
    next_90_days: { type: 'array', minItems: 3, maxItems: 5, items: { type: 'string' } },
    strategic_keywords: { type: 'array', minItems: 4, maxItems: 8, items: { type: 'string' } },
    lattes_actions: { type: 'array', minItems: 2, maxItems: 5, items: { type: 'string' } },
    suggested_summary: { type: 'string' },
    caution: { type: 'string' }
  }
};

exports.careerAnalysis = onRequest({
  region: 'southamerica-east1',
  secrets: [OPENAI_API_KEY, RATE_LIMIT_SALT],
  timeoutSeconds: 60,
  memory: '256MiB',
  maxInstances: 20
}, async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const origin = req.get('origin');
  if (origin && !ALLOWED_ORIGINS.has(origin)) return res.status(403).json({ error: 'origin_not_allowed' });

  const rawSize = Buffer.byteLength(JSON.stringify(req.body || {}), 'utf8');
  if (rawSize > 90000) return res.status(413).json({ error: 'payload_too_large' });

  const hash = clientHash(req);
  const allowed = await enforceDailyLimit(hash, 5);
  if (!allowed) return res.status(429).json({ error: 'daily_limit_reached', message: 'Limite diário de análises atingido.' });

  try {
    const payload = compactPayload(req.body);
    const model = process.env.EASY_LATTES_MODEL || 'gpt-5.6-luna';
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY.value() });

    const response = await openai.responses.create({
      model,
      store: false,
      reasoning: { effort: 'low' },
      max_output_tokens: 2400,
      prompt_cache_key: 'easy-lattes-career-analysis-v1',
      safety_identifier: `easy-lattes-${hash.slice(0, 24)}`,
      instructions: [
        'Você é um analista de trajetória acadêmica brasileira trabalhando dentro do Easy Lattes.',
        'Analise somente as evidências fornecidas. Nunca invente produção, impacto, reconhecimento, qualidade, liderança ou internacionalização que não estejam documentados.',
        'Quantidade de registros não equivale a qualidade. Não atribua notas de mérito e não compare a pessoa com outros pesquisadores sem dados comparativos.',
        'Diferencie claramente o que aparece no currículo de sugestões de fortalecimento.',
        'Escreva em português do Brasil, de forma clara, direta e útil para um professor ou pesquisador.',
        'A identidade profissional deve sintetizar os temas, tipos de atividade e direção recente visíveis nos dados.',
        'As oportunidades devem ser ações plausíveis de organização, registro, coerência temática, visibilidade acadêmica, formação de pessoas, produção técnica ou atualização do currículo — nunca inventar atividades.',
        'O resumo sugerido deve ser profissional, factual e baseado apenas no material fornecido.'
      ].join(' '),
      input: JSON.stringify(payload),
      text: {
        verbosity: 'medium',
        format: {
          type: 'json_schema',
          name: 'easy_lattes_career_analysis',
          strict: true,
          schema
        }
      }
    });

    const result = JSON.parse(response.output_text || '{}');
    const usage = response.usage || {};
    const price = PRICES[model] || null;
    const estimatedCost = price ? ((Number(usage.input_tokens || 0) * price.input) + (Number(usage.output_tokens || 0) * price.output)) / 1e6 : null;

    return res.json({
      result,
      meta: {
        model,
        input_tokens: Number(usage.input_tokens || 0),
        output_tokens: Number(usage.output_tokens || 0),
        estimated_cost_usd: estimatedCost == null ? null : Number(estimatedCost.toFixed(6))
      }
    });
  } catch (error) {
    console.error('careerAnalysis', error);
    return res.status(500).json({ error: 'analysis_failed' });
  }
});
