const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const crypto = require('crypto');
const OpenAI = require('openai');

admin.initializeApp();
const db = admin.firestore();
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
const REGION = 'southamerica-east1';
const VERSION = '2026-09-17-v6';
const ORIGINS = new Set(['https://ernandes-sobreira.github.io','http://localhost:5000','http://localhost:5500','http://127.0.0.1:5500']);
const PRICES = {'gpt-5.6-luna':{input:.20,output:1.20},'gpt-5.6-terra':{input:2,output:12},'gpt-5.6-sol':{input:4,output:20}};
const WEB_CALL_USD = .01;

function cors(req,res,methods='POST, OPTIONS'){
  const origin=req.get('origin');
  if(origin&&ORIGINS.has(origin)){res.set('Access-Control-Allow-Origin',origin);res.set('Vary','Origin')}
  res.set('Access-Control-Allow-Headers','Content-Type, X-Easy-Lattes-Client');
  res.set('Access-Control-Allow-Methods',methods);
}
const allowed=req=>!req.get('origin')||ORIGINS.has(req.get('origin'));
const sha=v=>crypto.createHash('sha256').update(String(v)).digest('hex');
function clientHash(req){const ip=String(req.headers['x-forwarded-for']||'').split(',')[0].trim()||req.ip||'unknown';const client=String(req.get('x-easy-lattes-client')||'').slice(0,120);return sha(`easy-lattes-v6|${ip}|${client}`)}
async function limited(hash,feature,max){try{const day=new Date().toISOString().slice(0,10),ref=db.collection('easyLattesFeatureUsage').doc(`${day}_${feature}_${hash.slice(0,28)}`);return await db.runTransaction(async tx=>{const snap=await tx.get(ref),used=snap.exists?Number(snap.data().count||0):0;if(used>=max)return false;tx.set(ref,{count:used+1,day,feature,updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});return true})}catch(e){console.warn('rate-limit fallback',e?.message);return true}}
async function cacheGet(collection,key,maxAge){try{const snap=await db.collection(collection).doc(key).get();if(!snap.exists)return null;const d=snap.data()||{},t=d.createdAt?.toMillis?.()||Number(d.createdMs||0);return t&&Date.now()-t<=maxAge?d.payload||null:null}catch(e){return null}}
async function cacheSet(collection,key,payload){try{await db.collection(collection).doc(key).set({payload,createdAt:admin.firestore.FieldValue.serverTimestamp(),createdMs:Date.now()})}catch(e){console.warn('cache fallback',e?.message)}}
function modelCost(model,usage){const p=PRICES[model];return p?((Number(usage?.input_tokens||0)*p.input+Number(usage?.output_tokens||0)*p.output)/1e6):null}

exports.health=onRequest({region:REGION,timeoutSeconds:10,memory:'128MiB',maxInstances:10},async(req,res)=>{
  cors(req,res,'GET, OPTIONS');
  if(req.method==='OPTIONS')return res.status(204).send('');
  if(req.method!=='GET')return res.status(405).json({error:'method_not_allowed'});
  if(!allowed(req))return res.status(403).json({error:'origin_not_allowed'});
  return res.json({ok:true,version:VERSION,region:REGION,features:{career_analysis:true,public_web_discovery:true,cache:'firestore-when-available',raw_xml_sent_to_ai:false}});
});

function careerPayload(body){const x=body&&typeof body==='object'?body:{};return{researcher:String(x.researcher||'').slice(0,160),declared_summary:String(x.declared_summary||'').slice(0,3500),areas:Array.isArray(x.areas)?x.areas.slice(0,12).map(v=>String(v).slice(0,120)):[],counts:x.counts&&typeof x.counts==='object'?x.counts:{},recent_by_year:Array.isArray(x.recent_by_year)?x.recent_by_year.slice(0,8):[],keywords:Array.isArray(x.keywords)?x.keywords.slice(0,18):[],samples:x.samples&&typeof x.samples==='object'?Object.fromEntries(Object.entries(x.samples).slice(0,8).map(([k,a])=>[k,Array.isArray(a)?a.slice(0,28).map(v=>({title:String(v?.title||'').slice(0,240),year:Number.isFinite(Number(v?.year))?Number(v.year):null})):[]])):{}}}
const careerSchema={type:'object',additionalProperties:false,required:['headline','identity','strengths','opportunities','next_90_days','strategic_keywords','lattes_actions','suggested_summary','caution'],properties:{headline:{type:'string'},identity:{type:'string'},strengths:{type:'array',minItems:2,maxItems:4,items:{type:'string'}},opportunities:{type:'array',minItems:2,maxItems:4,items:{type:'string'}},next_90_days:{type:'array',minItems:3,maxItems:5,items:{type:'string'}},strategic_keywords:{type:'array',minItems:4,maxItems:8,items:{type:'string'}},lattes_actions:{type:'array',minItems:2,maxItems:5,items:{type:'string'}},suggested_summary:{type:'string'},caution:{type:'string'}}};

exports.careerAnalysis=onRequest({region:REGION,secrets:[OPENAI_API_KEY],timeoutSeconds:60,memory:'256MiB',maxInstances:20},async(req,res)=>{
  cors(req,res);if(req.method==='OPTIONS')return res.status(204).send('');if(req.method!=='POST')return res.status(405).json({error:'method_not_allowed'});if(!allowed(req))return res.status(403).json({error:'origin_not_allowed'});
  if(Buffer.byteLength(JSON.stringify(req.body||{}),'utf8')>90000)return res.status(413).json({error:'payload_too_large'});
  const payload=careerPayload(req.body),key=sha(`career-v2|${JSON.stringify(payload)}`),cached=await cacheGet('easyLattesCareerCache',key,30*864e5);if(cached)return res.json({...cached,meta:{...(cached.meta||{}),cached:true}});
  const hash=clientHash(req);if(!(await limited(hash,'careerAnalysis',5)))return res.status(429).json({error:'daily_limit_reached',message:'Limite diário de análises atingido.'});
  try{
    const model=process.env.EASY_LATTES_MODEL||'gpt-5.6-luna',openai=new OpenAI({apiKey:OPENAI_API_KEY.value()});
    const response=await openai.responses.create({model,store:false,reasoning:{effort:'low'},max_output_tokens:2200,prompt_cache_key:'easy-lattes-career-analysis-v2',safety_identifier:`easy-lattes-${hash.slice(0,24)}`,instructions:['Você é um analista de trajetória acadêmica brasileira dentro do Easy Lattes.','Use somente as evidências fornecidas; nunca invente produção, impacto, reconhecimento, liderança, internacionalização ou qualidade.','Quantidade de registros não equivale a qualidade. Não dê nota de mérito nem compare com outros pesquisadores sem dados comparativos.','Diferencie fato observado, interpretação e sugestão.','Escreva em português do Brasil com frases claras, concretas e úteis.','Sintetize identidade profissional, temas recorrentes, direção recente, forças documentadas, oportunidades plausíveis e plano de 90 dias.','Nunca sugira inventar ou inflar produção. O resumo sugerido precisa ser factual.'].join(' '),input:JSON.stringify(payload),text:{verbosity:'medium',format:{type:'json_schema',name:'easy_lattes_career_analysis',strict:true,schema:careerSchema}}});
    const usage=response.usage||{},cost=modelCost(model,usage),out={result:JSON.parse(response.output_text||'{}'),meta:{model,input_tokens:Number(usage.input_tokens||0),output_tokens:Number(usage.output_tokens||0),estimated_cost_usd:cost==null?null:Number(cost.toFixed(6)),cached:false,backend_version:VERSION}};await cacheSet('easyLattesCareerCache',key,out);return res.json(out);
  }catch(e){console.error('careerAnalysis',e);return res.status(500).json({error:'analysis_failed'})}
});

const discoverySchema={type:'object',additionalProperties:false,required:['results'],properties:{results:{type:'array',maxItems:20,items:{type:'object',additionalProperties:false,required:['title','source_url','source_title','kind','year','confidence','evidence','institution'],properties:{title:{type:'string'},source_url:{type:'string'},source_title:{type:'string'},kind:{type:'string',enum:['apresentacao','curso','banca','evento','disciplina','premio','projeto','outra']},year:{type:'string'},confidence:{type:'integer',minimum:0,maximum:100},evidence:{type:'string'},institution:{type:'string'}}}}}};
const validUrl=v=>{try{const u=new URL(String(v||''));return u.protocol==='https:'||u.protocol==='http:'}catch{return false}};
function cleanResults(items){const seen=new Set(),out=[];for(const r of Array.isArray(items)?items:[]){const title=String(r?.title||'').trim().slice(0,300),url=String(r?.source_url||'').trim();if(!title||!validUrl(url))continue;const key=sha(`${title.toLowerCase()}|${url}`);if(seen.has(key))continue;seen.add(key);out.push({title,url,source:String(r?.source_title||'').trim().slice(0,200)||new URL(url).hostname.replace(/^www\./,''),kind:String(r?.kind||'outra'),year:String(r?.year||'').match(/\b(19|20)\d{2}\b/)?.[0]||'',confidence:Math.max(0,Math.min(100,Number(r?.confidence||0))),snippet:String(r?.evidence||'').trim().slice(0,900),institution:String(r?.institution||'').trim().slice(0,180),evidence:String(r?.evidence||'').trim().slice(0,900)});if(out.length>=20)break}return out}
function sourcesFrom(response){const map=new Map();for(const item of response?.output||[]){if(item?.type!=='web_search_call')continue;for(const s of item?.action?.sources||item?.sources||[]){const url=String(s?.url||'').trim();if(validUrl(url)&&!map.has(url))map.set(url,{url,title:String(s?.title||'').slice(0,220)})}}return [...map.values()].slice(0,40)}

exports.webDiscovery=onRequest({region:REGION,secrets:[OPENAI_API_KEY],timeoutSeconds:75,memory:'256MiB',maxInstances:20},async(req,res)=>{
  cors(req,res);if(req.method==='OPTIONS')return res.status(204).send('');if(req.method!=='POST')return res.status(405).json({error:'method_not_allowed'});if(!allowed(req))return res.status(403).json({error:'origin_not_allowed'});
  const name=String(req.body?.name||'').trim().slice(0,160),institution=String(req.body?.institution||'').trim().slice(0,180),orcid=String(req.body?.orcid||'').trim().slice(0,80);if(name.length<5)return res.status(400).json({error:'invalid_name'});
  const key=sha(`web-v2|${name.toLowerCase()}|${institution.toLowerCase()}|${orcid.toLowerCase()}`),cached=await cacheGet('easyLattesWebDiscoveryCache',key,7*864e5);if(cached)return res.json({...cached,meta:{...(cached.meta||{}),cached:true}});
  const hash=clientHash(req);if(!(await limited(hash,'webDiscovery',3)))return res.status(429).json({error:'daily_limit_reached',message:'Limite diário de buscas públicas atingido.'});
  try{
    const model='gpt-5.6-luna',openai=new OpenAI({apiKey:OPENAI_API_KEY.value()}),identity=[name,institution&&`instituição: ${institution}`,orcid&&`ORCID: ${orcid}`].filter(Boolean).join(' | ');
    const response=await openai.responses.create({model,store:false,reasoning:{effort:'low'},max_output_tokens:2600,max_tool_calls:2,include:['web_search_call.action.sources'],tools:[{type:'web_search',search_context_size:'low',user_location:{type:'approximate',country:'BR'}}],tool_choice:'auto',prompt_cache_key:'easy-lattes-public-discovery-v2',safety_identifier:`easy-lattes-discovery-${hash.slice(0,20)}`,instructions:['Procure somente informações acadêmicas e profissionais públicas que possam pertencer ao pesquisador informado.','Use a pesquisa na web para palestras, conferências, cursos ou minicursos ministrados, oficinas, bancas/defesas, eventos, disciplinas/docência publicamente documentadas, prêmios, projetos e outras atividades acadêmicas.','Não procure nem retorne endereço, telefone, documentos pessoais, família, saúde, política, religião ou dados sensíveis/privados.','Desambigue homônimos por instituição, ORCID, área acadêmica e contexto. Reduza a confiança ou omita quando houver dúvida.','Cada resultado precisa ter URL pública real encontrada na busca; nunca invente URL.','A evidência deve ser curta e explicar a associação com o pesquisador.','Nada deve ser tratado como automaticamente apto ao Lattes: é uma pista para revisão humana.'].join(' '),input:`Pesquisador a verificar: ${identity}. Faça busca ampla priorizando sites institucionais, universidades, eventos, periódicos, repositórios e PDFs/programações oficiais no Brasil.`,text:{verbosity:'low',format:{type:'json_schema',name:'easy_lattes_public_discovery',strict:true,schema:discoverySchema}}});
    const parsed=JSON.parse(response.output_text||'{"results":[]}'),results=cleanResults(parsed.results),usage=response.usage||{},modelUsd=modelCost(model,usage)||0,webCalls=(response.output||[]).filter(x=>x?.type==='web_search_call').length,out={results,sources:sourcesFrom(response),meta:{provider:'OpenAI Web Search',model,web_search_calls:webCalls,input_tokens:Number(usage.input_tokens||0),output_tokens:Number(usage.output_tokens||0),estimated_cost_usd:Number((modelUsd+webCalls*WEB_CALL_USD).toFixed(6)),cached:false,backend_version:VERSION}};await cacheSet('easyLattesWebDiscoveryCache',key,out);return res.json(out);
  }catch(e){console.error('webDiscovery',e);return res.status(500).json({error:'web_discovery_failed'})}
});