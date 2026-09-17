const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { getApps, initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const crypto = require('crypto');
const OpenAI = require('openai');

if (!getApps().length) initializeApp();
const db = getFirestore();
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
const REGION = 'southamerica-east1';
const VERSION = '2026-09-17-deep-v7';
const ORIGINS = new Set([
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
  if (origin && ORIGINS.has(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
  }
  res.set('Access-Control-Allow-Headers', 'Content-Type, X-Easy-Lattes-Client');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
}

function allowed(req) {
  const origin = req.get('origin');
  return !origin || ORIGINS.has(origin);
}

function sha(v) {
  return crypto.createHash('sha256').update(String(v)).digest('hex');
}

function clientHash(req) {
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || 'unknown';
  const client = String(req.get('x-easy-lattes-client') || '').slice(0, 120);
  return sha(`easy-lattes-deep-v7|${ip}|${client}`);
}

async function allowDaily(hash, max = 3) {
  try {
    const day = new Date().toISOString().slice(0, 10);
    const ref = db.collection('easyLattesFeatureUsage').doc(`${day}_careerAnalysisDeep_${hash.slice(0, 28)}`);
    return await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      const used = snap.exists ? Number(snap.data().count || 0) : 0;
      if (used >= max) return false;
      tx.set(ref, { count: used + 1, day, feature: 'careerAnalysisDeep', updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      return true;
    });
  } catch (e) {
    console.warn('rate limit fallback', e?.message);
    return true;
  }
}

async function cacheGet(key) {
  try {
    const snap = await db.collection('easyLattesDeepCareerCache').doc(key).get();
    if (!snap.exists) return null;
    const d = snap.data() || {};
    const created = d.createdAt?.toMillis?.() || Number(d.createdMs || 0);
    if (!created || Date.now() - created > 30 * 864e5) return null;
    return d.payload || null;
  } catch (_) {
    return null;
  }
}

async function cacheSet(key, payload) {
  try {
    await db.collection('easyLattesDeepCareerCache').doc(key).set({
      payload,
      createdAt: FieldValue.serverTimestamp(),
      createdMs: Date.now()
    });
  } catch (e) {
    console.warn('cache fallback', e?.message);
  }
}

function compact(body) {
  const x = body && typeof body === 'object' ? body : {};
  const samples = x.samples && typeof x.samples === 'object' ? Object.fromEntries(
    Object.entries(x.samples).slice(0, 8).map(([k, arr]) => [k, Array.isArray(arr) ? arr.slice(0, 22).map(v => ({
      title: String(v?.title || '').slice(0, 220),
      year: Number.isFinite(Number(v?.year)) ? Number(v.year) : null
    })) : []])
  ) : {};
  const publicLeads = Array.isArray(x.public_leads) ? x.public_leads.slice(0, 12).map(v => ({
    title: String(v?.title || '').slice(0, 260),
    year: String(v?.year || '').slice(0, 8),
    kind: String(v?.kind || 'outra').slice(0, 40),
    source: String(v?.source || '').slice(0, 160),
    source_url: String(v?.source_url || v?.url || '').slice(0, 700),
    evidence: String(v?.evidence || v?.snippet || '').slice(0, 600),
    confidence: Math.max(0, Math.min(100, Number(v?.confidence || 0)))
  })) : [];
  return {
    researcher: String(x.researcher || '').slice(0, 160),
    declared_summary: String(x.declared_summary || '').slice(0, 3500),
    areas: Array.isArray(x.areas) ? x.areas.slice(0, 12).map(v => String(v).slice(0, 120)) : [],
    counts: x.counts && typeof x.counts === 'object' ? x.counts : {},
    recent_by_year: Array.isArray(x.recent_by_year) ? x.recent_by_year.slice(0, 8) : [],
    keywords: Array.isArray(x.keywords) ? x.keywords.slice(0, 18) : [],
    samples,
    public_leads: publicLeads
  };
}

const schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'headline','identity','evidence_summary','strengths','opportunities','next_90_days',
    'strategic_keywords','lattes_actions','public_leads_review','suggested_summary','caution'
  ],
  properties: {
    headline: { type: 'string' },
    identity: { type: 'string' },
    evidence_summary: { type: 'string' },
    strengths: {
      type: 'array', minItems: 2, maxItems: 4,
      items: {
        type: 'object', additionalProperties: false,
        required: ['title','evidence'],
        properties: { title: { type: 'string' }, evidence: { type: 'string' } }
      }
    },
    opportunities: { type: 'array', minItems: 2, maxItems: 4, items: { type: 'string' } },
    next_90_days: { type: 'array', minItems: 3, maxItems: 5, items: { type: 'string' } },
    strategic_keywords: { type: 'array', minItems: 4, maxItems: 8, items: { type: 'string' } },
    lattes_actions: { type: 'array', minItems: 2, maxItems: 6, items: { type: 'string' } },
    public_leads_review: {
      type: 'array', maxItems: 8,
      items: {
        type: 'object', additionalProperties: false,
        required: ['title','verdict','reason'],
        properties: {
          title: { type: 'string' },
          verdict: { type: 'string', enum: ['priorizar_revisao','revisar_com_cautela','ignorar_por_enquanto'] },
          reason: { type: 'string' }
        }
      }
    },
    suggested_summary: { type: 'string' },
    caution: { type: 'string' }
  }
};

exports.careerAnalysisDeep = onRequest({
  region: REGION,
  secrets: [OPENAI_API_KEY],
  timeoutSeconds: 75,
  memory: '256MiB',
  maxInstances: 20
}, async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!allowed(req)) return res.status(403).json({ error: 'origin_not_allowed' });
  if (Buffer.byteLength(JSON.stringify(req.body || {}), 'utf8') > 120000) return res.status(413).json({ error: 'payload_too_large' });

  const payload = compact(req.body);
  const cacheKey = sha(`deep-v7|${JSON.stringify(payload)}`);
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json({ ...cached, meta: { ...(cached.meta || {}), cached: true } });

  const hash = clientHash(req);
  if (!(await allowDaily(hash, 3))) {
    return res.status(429).json({ error: 'daily_limit_reached', message: 'Limite diário de análises aprofundadas atingido.' });
  }

  try {
    const model = process.env.EASY_LATTES_DEEP_MODEL || 'gpt-5.6-luna';
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY.value() });
    const response = await openai.responses.create({
      model,
      store: false,
      reasoning: { effort: 'medium' },
      max_output_tokens: 3000,
      prompt_cache_key: 'easy-lattes-career-deep-v7',
      safety_identifier: `easy-lattes-deep-${hash.slice(0, 24)}`,
      instructions: [
        'Você é um consultor de trajetória acadêmica brasileira dentro do Easy Lattes.',
        'Seu trabalho é transformar evidências do currículo em uma leitura profissional clara e útil, sem inventar mérito, impacto ou atividades.',
        'Separe rigorosamente: fatos observados no XML, interpretação dos padrões e sugestões futuras.',
        'Quantidade não equivale a qualidade. Não dê nota, ranking ou comparação com outros pesquisadores sem base comparativa.',
        'As public_leads são pistas encontradas em fontes públicas e ainda NÃO confirmadas pelo pesquisador. Nunca as trate como parte do currículo.',
        'Para cada pista pública, indique se vale priorizar revisão, revisar com cautela ou ignorar por enquanto, explicando por quê.',
        'Sugira ações que reduzam trabalho do professor: recuperar comprovantes, consolidar palavras-chave, revisar títulos incompletos, atualizar resumo, conferir atividades recentes e confirmar pistas públicas.',
        'O plano de 90 dias deve ser prático, específico e executável.',
        'O resumo profissional sugerido deve ser factual e pronto para revisão humana.',
        'Escreva em português do Brasil, com frases curtas, linguagem clara e sem jargão desnecessário.'
      ].join(' '),
      input: JSON.stringify(payload),
      text: {
        verbosity: 'medium',
        format: { type: 'json_schema', name: 'easy_lattes_deep_analysis', strict: true, schema }
      }
    });

    const usage = response.usage || {};
    const price = PRICES[model] || null;
    const estimated = price ? ((Number(usage.input_tokens || 0) * price.input) + (Number(usage.output_tokens || 0) * price.output)) / 1e6 : null;
    const out = {
      result: JSON.parse(response.output_text || '{}'),
      meta: {
        model,
        input_tokens: Number(usage.input_tokens || 0),
        output_tokens: Number(usage.output_tokens || 0),
        estimated_cost_usd: estimated == null ? null : Number(estimated.toFixed(6)),
        cached: false,
        backend_version: VERSION,
        public_leads_received: payload.public_leads.length
      }
    };
    await cacheSet(cacheKey, out);
    return res.json(out);
  } catch (e) {
    console.error('careerAnalysisDeep', e);
    return res.status(500).json({ error: 'analysis_failed' });
  }
});
