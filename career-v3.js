const C = {
  doc: null,
  candidates: [],
  additions: [],
  saved: [],
  currentCandidate: null,
  processing: new Set(),
  lastAnalysis: null
};

const q = (s, r = document) => r.querySelector(s);
const qa = (s, r = document) => [...r.querySelectorAll(s)];
const val = id => q(`#${id}`)?.value?.trim() || '';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

function toast3(message) {
  const stack = q('#toastStack');
  if (!stack) return;
  const d = document.createElement('div');
  d.className = 'toast';
  d.textContent = message;
  stack.appendChild(d);
  setTimeout(() => d.remove(), 3600);
}

function directChild(parent, name) {
  return parent ? [...parent.children].find(x => x.tagName === name) || null : null;
}

function orderedChild(parent, name, order) {
  let found = directChild(parent, name);
  if (found) return found;
  const node = C.doc.createElement(name);
  const idx = order.indexOf(name);
  const before = [...parent.children].find(child => {
    const i = order.indexOf(child.tagName);
    return i >= 0 && i > idx;
  });
  parent.insertBefore(node, before || null);
  return node;
}

function node(name, attrs = {}) {
  const el = C.doc.createElement(name);
  Object.entries(attrs).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).trim() !== '') el.setAttribute(k, String(v).trim());
  });
  return el;
}

function nextSequence() {
  const nums = qa('[SEQUENCIA-PRODUCAO]', C.doc).map(x => parseInt(x.getAttribute('SEQUENCIA-PRODUCAO'), 10)).filter(Number.isFinite);
  return String((nums.length ? Math.max(...nums) : 0) + 1);
}

function getRoot() {
  return C.doc?.querySelector('CURRICULO-VITAE') || C.doc?.documentElement || null;
}

function ensureTechGroup() {
  const root = getRoot();
  const rootOrder = ['DADOS-GERAIS','PRODUCAO-BIBLIOGRAFICA','PRODUCAO-TECNICA','OUTRA-PRODUCAO','DADOS-COMPLEMENTARES'];
  const tech = orderedChild(root, 'PRODUCAO-TECNICA', rootOrder);
  const techOrder = ['CULTIVAR-REGISTRADA','SOFTWARE','PATENTE','CULTIVAR-PROTEGIDA','DESENHO-INDUSTRIAL','MARCA','TOPOGRAFIA-DE-CIRCUITO-INTEGRADO','PRODUTO-TECNOLOGICO','PROCESSOS-OU-TECNICAS','TRABALHO-TECNICO','DEMAIS-TIPOS-DE-PRODUCAO-TECNICA'];
  return orderedChild(tech, 'DEMAIS-TIPOS-DE-PRODUCAO-TECNICA', techOrder);
}

function ensureComplementary() {
  const root = getRoot();
  const rootOrder = ['DADOS-GERAIS','PRODUCAO-BIBLIOGRAFICA','PRODUCAO-TECNICA','OUTRA-PRODUCAO','DADOS-COMPLEMENTARES'];
  return orderedChild(root, 'DADOS-COMPLEMENTARES', rootOrder);
}

function insertTechItem(el, tag) {
  const group = ensureTechGroup();
  const order = ['APRESENTACAO-DE-TRABALHO','CARTA-MAPA-OU-SIMILAR','CURSO-DE-CURTA-DURACAO-MINISTRADO','DESENVOLVIMENTO-DE-MATERIAL-DIDATICO-OU-INSTRUCIONAL','EDITORACAO','MANUTENCAO-DE-OBRA-ARTISTICA','MAQUETE','ORGANIZACAO-DE-EVENTO','PROGRAMA-DE-RADIO-OU-TV','RELATORIO-DE-PESQUISA','MIDIA-SOCIAL-WEBSITE-BLOG','OUTRA-PRODUCAO-TECNICA'];
  const idx = order.indexOf(tag);
  const before = [...group.children].find(c => {
    const i = order.indexOf(c.tagName);
    return i >= 0 && i > idx;
  });
  group.insertBefore(el, before || null);
}

function addPresentation(d) {
  const wrap = node('APRESENTACAO-DE-TRABALHO', {'SEQUENCIA-PRODUCAO': nextSequence()});
  const nature = /confer[eê]ncia|palestra|keynote/i.test(`${d.role} ${d.title}`) ? 'CONFERENCIA' : /semin[aá]rio/i.test(d.event) ? 'SEMINARIO' : /simp[oó]sio/i.test(d.event) ? 'SIMPOSIO' : /congresso/i.test(d.event) ? 'CONGRESSO' : 'OUTRA';
  wrap.appendChild(node('DADOS-BASICOS-DA-APRESENTACAO-DE-TRABALHO', {NATUREZA:nature,TITULO:d.title,ANO:d.year,PAIS:d.country || 'Brasil',IDIOMA:'Português','FLAG-RELEVANCIA':'NAO','FLAG-DIVULGACAO-CIENTIFICA':'SIM'}));
  wrap.appendChild(node('DETALHAMENTO-DA-APRESENTACAO-DE-TRABALHO', {'NOME-DO-EVENTO':d.event || d.title,'INSTITUICAO-PROMOTORA':d.institution,'LOCAL-DA-APRESENTACAO':d.local,'CIDADE-DA-APRESENTACAO':d.city}));
  insertTechItem(wrap, 'APRESENTACAO-DE-TRABALHO');
}

function addCourse(d) {
  const wrap = node('CURSO-DE-CURTA-DURACAO-MINISTRADO', {'SEQUENCIA-PRODUCAO': nextSequence()});
  wrap.appendChild(node('DADOS-BASICOS-DE-CURSOS-CURTA-DURACAO-MINISTRADO', {'NIVEL-DO-CURSO':'EXTENSAO',TITULO:d.title,ANO:d.year,PAIS:d.country || 'Brasil',IDIOMA:'Português','MEIO-DE-DIVULGACAO':'NAO_INFORMADO','FLAG-RELEVANCIA':'NAO','FLAG-DIVULGACAO-CIENTIFICA':'SIM'}));
  wrap.appendChild(node('DETALHAMENTO-DE-CURSOS-CURTA-DURACAO-MINISTRADO', {'PARTICIPACAO-DOS-AUTORES':'DOCENTE','INSTITUICAO-PROMOTORA-DO-CURSO':d.institution,'LOCAL-DO-CURSO':d.local || d.event,CIDADE:d.city,DURACAO:d.hours,UNIDADE:d.hours ? 'HORAS' : 'NAO_INFORMADO'}));
  insertTechItem(wrap, 'CURSO-DE-CURTA-DURACAO-MINISTRADO');
}

function addOrganization(d) {
  const wrap = node('ORGANIZACAO-DE-EVENTO', {'SEQUENCIA-PRODUCAO': nextSequence()});
  wrap.appendChild(node('DADOS-BASICOS-DA-ORGANIZACAO-DE-EVENTO', {TIPO:/congresso/i.test(d.event || d.title)?'CONGRESSO':'OUTRO',NATUREZA:'ORGANIZACAO',TITULO:d.title,ANO:d.year,PAIS:d.country || 'Brasil',IDIOMA:'Português','MEIO-DE-DIVULGACAO':'NAO_INFORMADO','FLAG-RELEVANCIA':'NAO','FLAG-DIVULGACAO-CIENTIFICA':'SIM'}));
  wrap.appendChild(node('DETALHAMENTO-DA-ORGANIZACAO-DE-EVENTO', {'INSTITUICAO-PROMOTORA':d.institution,LOCAL:d.local || d.event,CIDADE:d.city}));
  insertTechItem(wrap, 'ORGANIZACAO-DE-EVENTO');
}

function addOtherTechnical(d) {
  const wrap = node('OUTRA-PRODUCAO-TECNICA', {'SEQUENCIA-PRODUCAO': nextSequence()});
  wrap.appendChild(node('DADOS-BASICOS-DE-OUTRA-PRODUCAO-TECNICA', {NATUREZA:d.role || 'Outra produção técnica',TITULO:d.title,ANO:d.year,PAIS:d.country || 'Brasil',IDIOMA:'Português','MEIO-DE-DIVULGACAO':'NAO_INFORMADO','FLAG-RELEVANCIA':'NAO','FLAG-DIVULGACAO-CIENTIFICA':'SIM'}));
  wrap.appendChild(node('DETALHAMENTO-DE-OUTRA-PRODUCAO-TECNICA', {FINALIDADE:d.notes,'INSTITUICAO-PROMOTORA':d.institution,LOCAL:d.local || d.event}));
  insertTechItem(wrap, 'OUTRA-PRODUCAO-TECNICA');
}

function addEvent(d) {
  const comp = ensureComplementary();
  const order = ['FORMACAO-COMPLEMENTAR','PARTICIPACAO-EM-BANCA-TRABALHOS-CONCLUSAO','PARTICIPACAO-EM-BANCA-JULGADORA','PARTICIPACAO-EM-EVENTOS-CONGRESSOS','ORIENTACOES-EM-ANDAMENTO','INFORMACOES-ADICIONAIS-INSTITUICOES','INFORMACOES-ADICIONAIS-CURSOS'];
  const group = orderedChild(comp, 'PARTICIPACAO-EM-EVENTOS-CONGRESSOS', order);
  const wrap = node('OUTRAS-PARTICIPACOES-EM-EVENTOS-CONGRESSOS', {'SEQUENCIA-PRODUCAO': nextSequence()});
  wrap.appendChild(node('DADOS-BASICOS-DE-OUTRAS-PARTICIPACOES-EM-EVENTOS-CONGRESSOS', {NATUREZA:d.role || 'Participação em evento',TITULO:d.title || d.event,ANO:d.year,PAIS:d.country || 'Brasil',IDIOMA:'Português','MEIO-DE-DIVULGACAO':'NAO_INFORMADO','FLAG-RELEVANCIA':'NAO','TIPO-PARTICIPACAO':'PARTICIPANTE','FORMA-PARTICIPACAO':'OUTRA','FLAG-DIVULGACAO-CIENTIFICA':'SIM'}));
  wrap.appendChild(node('DETALHAMENTO-DE-OUTRAS-PARTICIPACOES-EM-EVENTOS-CONGRESSOS', {'NOME-DO-EVENTO':d.event || d.title,'NOME-INSTITUICAO':d.institution,'LOCAL-DO-EVENTO':d.local,'CIDADE-DO-EVENTO':d.city}));
  group.appendChild(wrap);
}

function addBanca(d) {
  const comp = ensureComplementary();
  const compOrder = ['FORMACAO-COMPLEMENTAR','PARTICIPACAO-EM-BANCA-TRABALHOS-CONCLUSAO','PARTICIPACAO-EM-BANCA-JULGADORA','PARTICIPACAO-EM-EVENTOS-CONGRESSOS','ORIENTACOES-EM-ANDAMENTO','INFORMACOES-ADICIONAIS-INSTITUICOES','INFORMACOES-ADICIONAIS-CURSOS'];
  const group = orderedChild(comp, 'PARTICIPACAO-EM-BANCA-TRABALHOS-CONCLUSAO', compOrder);
  const wrap = node('OUTRAS-PARTICIPACOES-EM-BANCA', {'SEQUENCIA-PRODUCAO': nextSequence()});
  wrap.appendChild(node('DADOS-BASICOS-DE-OUTRAS-PARTICIPACOES-EM-BANCA', {NATUREZA:d.role || 'Banca',TIPO:'OUTRA',TITULO:d.title,ANO:d.year,PAIS:d.country || 'Brasil',IDIOMA:'Português'}));
  wrap.appendChild(node('DETALHAMENTO-DE-OUTRAS-PARTICIPACOES-EM-BANCA', {'NOME-DO-CANDIDATO':d.person,'NOME-INSTITUICAO':d.institution,'NOME-CURSO':d.event}));
  group.appendChild(wrap);
}

function addPrize(d) {
  const general = C.doc.querySelector('DADOS-GERAIS');
  if (!general) throw new Error('DADOS-GERAIS não encontrado');
  const order = ['RESUMO-CV','OUTRAS-INFORMACOES-RELEVANTES','ENDERECO','FORMACAO-ACADEMICA-TITULACAO','ATUACOES-PROFISSIONAIS','AREAS-DE-ATUACAO','IDIOMAS','PREMIOS-TITULOS'];
  const prizes = orderedChild(general, 'PREMIOS-TITULOS', order);
  prizes.appendChild(node('PREMIO-TITULO', {'NOME-DO-PREMIO-OU-TITULO':d.title,'NOME-DA-ENTIDADE-PROMOTORA':d.institution,'ANO-DA-PREMIACAO':d.year}));
}

function saveLocalDraft(d) {
  try {
    localStorage.setItem('easy-lattes:approved-activities:v1', JSON.stringify(C.saved));
    window.dispatchEvent(new CustomEvent('easy-lattes:local-changed'));
    return true;
  } catch (e) {
    console.error('Armazenamento local indisponível', e);
    return false;
  }
}

function addCandidateToXml(d) {
  if (!d.title || !d.title.trim()) return toast3('Informe o título antes de salvar.');
  if (!/^(19|20)\d{2}$/.test(d.year) || Number(d.year) > new Date().getFullYear()+1) return toast3('Confira o ano (4 dígitos).');
  if(d.startYear&&!/^(19|20)\d{2}$/.test(d.startYear)||d.endYear&&!/^(19|20)\d{2}$/.test(d.endYear))return toast3('Confira os anos inicial e final.');
  if(d.startYear&&d.endYear&&Number(d.endYear)<Number(d.startYear))return toast3('O ano final deve ser igual ou posterior ao inicial.');
  const duplicate = C.saved.some(x => x.type === d.type && x.year === d.year && norm(x.title) === norm(d.title));
  if (duplicate && (!C.doc || d.type === 'artigo')) return toast3('Essa atividade já está salva neste navegador.');
  if (document.body.classList.contains('product-v9') || !C.doc || d.type === 'artigo') {
    const record = {...d, id:uid(), approvedAt:new Date().toISOString(), status:'saved'};
    C.saved.push(record);
    if (!saveLocalDraft(record)) { C.saved.pop(); return toast3('Não foi possível guardar neste navegador. Exporte seus dados antes de sair.'); }
    const candidate = C.candidates.find(x => x.id === d.candidateId);
    if (candidate) candidate.status = 'saved';
    else C.candidates.unshift({...record,sourceName:d.sourceName||'Cadastro manual'});
    closeIntakeModal(); renderIntakeQueue(); renderSavedDrafts();
    window.dispatchEvent(new CustomEvent('easy-lattes:record-added',{detail:{record}}));
    toast3('Atividade confirmada. Confira o caminho de cadastro na sua ficha.');
    return;
  }
  try {
    if (d.type === 'apresentacao') addPresentation(d);
    else if (d.type === 'curso') addCourse(d);
    else if (d.type === 'organizacao') addOrganization(d);
    else if (d.type === 'evento') addEvent(d);
    else if (d.type === 'banca') addBanca(d);
    else if (d.type === 'premio') addPrize(d);
    else addOtherTechnical(d);
    C.additions.push({...d, id: uid(), addedAt: new Date()});
    const candidate = C.candidates.find(x => x.id === d.candidateId);
    if (candidate) candidate.status = 'added';
    closeIntakeModal();
    renderIntakeQueue();
    analyzeCareer();
    syncAdditionsToReport();
    toast3('Atividade adicionada à cópia do XML.');
  } catch (e) {
    console.error(e);
    toast3('Não consegui inserir essa atividade no XML. Revise os dados e tente novamente.');
  }
}

function guessType(text) {
  const head = norm(String(text).slice(0,7000));
  if(/projeto de extensao|acao de extensao|programa de extensao/.test(head))return 'extensao_projeto';
  if(/projeto de pesquisa/.test(head))return 'pesquisa_projeto';
  if(/disciplina ministrada|atividade de ensino|docencia/.test(head))return 'ensino_atividade';
  if (/journal of |scientific journal|research article|original article|artigo cientifico|artigo original|issn|abstract.*keywords|volume.*issue/.test(head) && /abstract|resumo|issn|doi|journal/.test(head)) return 'artigo';
  if (/\bbanca\b|defesa de|avaliador/.test(head)) return 'banca';
  if (/premio|premiacao|homenagem|titulo de/.test(head)) return 'premio';
  if (/organizacao|organizador|comissao organizadora|coordenacao do evento/.test(head)) return 'organizacao';
  if (/ministrou|ministrante|curso de|minicurso|oficina/.test(head)) return 'curso';
  if (/palestra|palestrante|conferencista|apresentou o trabalho|apresentacao de trabalho|mesa redonda/.test(head)) return 'apresentacao';
  if (/participou|participacao|congresso|seminario|simposio|encontro|evento/.test(head)) return 'evento';
  return 'outra';
}

function extractJournalArticle(text, sourceName) {
  const head = String(text||'').slice(0,12500);
  const lines = head.split(/\n/).map(x=>x.trim()).filter(Boolean);
  const joined = lines.join(' ');
  const isJournal = /\b(journal of|revista (?:brasileira|cient[ií]fica|de)|scientific journal|research article|original article)\b/i.test(head.slice(0,2500))
    || (/\babstract\s*:/i.test(head) && /\b(issn|volume|vol\.|journal|doi)\b/i.test(head.slice(0,5000)));
  if (!isJournal) return null;
  const idx = lines.findIndex(x=>/\b(journal of|revista (?:brasileira|cient[ií]fica|de))\b/i.test(x) && /20\d{2}/.test(x));
  const lineStart = idx>=0?idx+1:0;
  const stop = lines.findIndex((x,i)=>i>=lineStart && (/\babstract\s*:/i.test(x)||/\bresumo\s*:/i.test(x)));
  const front = lines.slice(lineStart,stop>=0?stop:Math.min(lines.length,20));
  const titleLines=[];
  let afterTitle=0;
  for(let i=0;i<front.length && i<12;i++){
    const line=front[i];
    if (/^\d+$/.test(line) || /^(?:page|p[aá]gina)\b/i.test(line)) continue;
    if (/^\s*(?:received|accepted|published|e-issn|issn|doi)\b/i.test(line)) break;
    if (/\b(?:Ernandes|Maísa|Maisa|Cleverson)\b/i.test(line) && titleLines.length) {afterTitle=i;break;}
    if (/^\s*[A-Z][a-z]+\s+[A-Z][a-z]+.*\d[,;]/.test(line) && titleLines.length) {afterTitle=i;break;}
    if (line.length>18 && !/\b(?:journal of|revista )\b/i.test(line)) titleLines.push(line);
    if(titleLines.join(' ').length>230)break;
    afterTitle=i+1;
  }
  const title = titleLines.join(' ').replace(/\s+/g,' ').replace(/\s*-\s+/g,'-').trim();
  const journalLine=lines.find(x=>/\b(journal of|revista (?:brasileira|cient[ií]fica|de))\b/i.test(x))||'';
  const journal=(journalLine.match(/^(.*?)(?:,\s*20\d{2}\b|\s+20\d{2}\b)/)||[])[1]||journalLine;
  const journalMatch=journalLine.match(/(?:20\d{2})\s*,\s*(\d{1,4})/);
  const authorZone=front.slice(afterTitle).join(' ').split(/(?:Centro de |Universidade |Departamento de |Abstract:|Resumo:)/i)[0];
  const authors=authorZone.replace(/\d+,?\*/g,'').replace(/\d+/g,'').replace(/\s+and\s+/g,', ').split(/\s*,\s*/).map(x=>x.trim()).filter(x=>x.length>8 && x.length<90);
  const doi=(head.slice(0,5000).match(/(?:doi\s*[:/]\s*|doi\.org\/)(10\.\d{4,9}\/[-._;()/:A-Z0-9]+)/i)||[])[1]||'';
  const placeholder=/000\s*[-–]\s*000|00-00-20\d{2}/.test(head.slice(0,8500));
  const year=(journalLine.match(/\b(20\d{2})\b/)||head.match(/\b(20\d{2})\b/)||[])[1]||'';
  const pubStatus=placeholder?'Publicação a confirmar':'Situação editorial a conferir';
  return {
    id:uid(),type:'artigo',title,year,
    journal:journal.trim(),volume:journalMatch?.[1]||'',issue:'',pages:placeholder?'':((journalLine.match(/\b\d+\s*,\s*\d+\s*,\s*(\d+[-–]\d+)\b/)||[])[1]||''),
    authors:authors.join('; '),doi,publicationStatus:pubStatus,
    institution:'',event:'',role:'Artigo científico',hours:'',person:'',local:'',city:'',country:'',
    notes:placeholder?'Datas editoriais/paginação provisórias no PDF; não presumir publicação.':'Confirmar situação editorial e metadados antes do cadastro.',
    sourceName,text:head,status:'ready',
    confidence:title && journal && year?75:45
  };
}

function firstMatch(text, patterns) {
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) return m[1].replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/[.;,]$/, '');
  }
  return '';
}

function extractCandidate(text, sourceName = 'Entrada manual') {
  const clean = String(text || '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ');
  const article=extractJournalArticle(clean,sourceName);
  if(article)return article;
  const year = (clean.match(/\b(20\d{2}|19\d{2})\b/) || [])[1] || '';
  const hours = (clean.match(/(?:carga hor[aá]ria|dura[cç][aã]o)[^0-9]{0,20}(\d{1,4})\s*(?:h|horas?)/i) || [])[1] || '';
  let title = firstMatch(clean, [/(?:t[ií]tulo|tema)\s*[:\-–]\s*([^\n]{5,220})/i, /(?:palestra|confer[eê]ncia|minicurso|curso|trabalho)\s+["“']([^"”'\n]{5,220})/i, /["“]([^"”\n]{8,220})["”]/]);
  const event = firstMatch(clean, [/(?:evento|congresso|semin[aá]rio|simp[oó]sio|encontro)\s*[:\-–]?\s*([^\n]{5,180})/i, /(?:realizad[oa]\s+(?:no|na|durante o|durante a))\s+([^\n]{5,180})/i]);
  const institution = firstMatch(clean, [/(Universidade[^\n,.;]{3,100})/i, /(Instituto[^\n,.;]{3,100})/i, /(Funda[cç][aã]o[^\n,.;]{3,100})/i, /(UNEMAT[^\n,.;]{0,80})/i, /(UF[A-Z]{2,4}[^\n,.;]{0,80})/]);
  const person = firstMatch(clean, [/(?:candidat[oa]|discente|alun[oa])\s*[:\-–]?\s*([^\n,.;]{4,100})/i]);
  if (!title) {
    const lines = clean.split(/\n+/).map(x => x.trim()).filter(x => x.length > 8 && x.length < 180);
    title = lines.find(x => !/certific|declar|particip|universidade|instituto/i.test(x)) || event || '';
  }
  const type = guessType(clean);
  let role = type === 'apresentacao' ? (/palestr/i.test(clean) ? 'Palestra' : 'Apresentação de trabalho') : type === 'curso' ? 'Curso ministrado' : type === 'organizacao' ? 'Organização' : type === 'evento' ? 'Participação em evento' : type === 'banca' ? 'Participação em banca' : type === 'premio' ? 'Prêmio/Título' : 'Outra produção técnica';
  if(['pesquisa_projeto','extensao_projeto','ensino_atividade'].includes(type))role=firstMatch(clean,[/(?:participa[cç][aã]o|fun[cç][aã]o|papel)\s*[:\-–]\s*([^\n]{3,100})/i]);
  return {id:uid(), type, title, year, institution, event, local:'', city:'', country:'Brasil', role, hours, person, notes:'', sourceName, text:clean, status:'ready', confidence: Math.min(96, 48 + (year?12:0) + (title?18:0) + (institution?10:0) + (event?8:0))};
}

async function loadScript(src, id) {
  if (id && document.getElementById(id)) return;
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    if (id) s.id = id;
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function extractPdf(file) {
  const pdfjs = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';
  const pdf = await pdfjs.getDocument({data:await file.arrayBuffer()}).promise;
  let out='';
  for(let n=1;n<=Math.min(pdf.numPages,3);n++){
    const page=await pdf.getPage(n),content=await page.getTextContent();
    const groups=new Map();
    for(const it of content.items){
      if(!it.str?.trim())continue;
      const y=Math.round(it.transform?.[5]||0);
      if(!groups.has(y))groups.set(y,[]);
      groups.get(y).push({x:it.transform?.[4]||0,str:it.str});
    }
    const ordered=[...groups.entries()].sort((a,b)=>b[0]-a[0]);
    if (!content.items.some(it=>it.str?.trim())) {
      const viewport=page.getViewport({scale:1.5}),canvas=document.createElement('canvas');
      canvas.width=viewport.width;canvas.height=viewport.height;
      await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
      out+='\n'+await extractImage(blob);
      canvas.width=canvas.height=0;
    }
    out+='\n'+ordered.map(([,items])=>items.sort((a,b)=>a.x-b.x).map(i=>i.str).join(' ')).join('\n');
  }
  return out.slice(0,55000);
}

async function extractImage(file, progress) {
  await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js', 'easy-tesseract');
  if (!window.Tesseract) throw new Error('OCR indisponível');
  const result = await window.Tesseract.recognize(file, 'por', {logger: m => {
    if (m.status === 'recognizing text' && progress) progress(Math.round((m.progress || 0) * 100));
  }});
  return result?.data?.text || '';
}

async function processEvidenceFile(file) {
  if(file.size>30*1024*1024){toast3('Arquivo acima de 30 MB. Envie uma versão menor.');return;}
  const key = `${file.name}-${file.size}-${file.lastModified}`;
  if (C.processing.has(key)) return;
  C.processing.add(key);
  const status = q('#smartIntakeStatus');
  if (status) status.innerHTML = `<i data-lucide="loader-circle"></i><span>Lendo <strong>${esc(file.name)}</strong>…</span>`;
  window.lucide?.createIcons?.();
  try {
    let text = '';
    if (/\.pdf$/i.test(file.name)) text = await extractPdf(file);
    else if (file.type?.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(file.name)) text = await extractImage(file, pct => {
      if (status) status.innerHTML = `<i data-lucide="scan-text"></i><span>OCR de <strong>${esc(file.name)}</strong>: ${pct}%</span>`;
      window.lucide?.createIcons?.();
    });
    else if (/\.(txt|csv|md)$/i.test(file.name)) text = await file.text();
    else if (/\.docx$/i.test(file.name)) {
      await loadScript('https://cdn.jsdelivr.net/npm/mammoth@1.9.0/mammoth.browser.min.js','easy-mammoth');
      text=(await window.mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()})).value;
    } else { throw new Error('Formato não suportado. Converta DOC para DOCX ou PDF.'); }
    if (!text.trim()) throw new Error('Nenhum texto legível encontrado.');
    const candidate = extractCandidate(text, file.name);
    if (!candidate.title || candidate.type === 'outra') candidate.confidence = Math.min(candidate.confidence,35);
    C.candidates.unshift(candidate);
    renderIntakeQueue();
    if (status) status.innerHTML = `<i data-lucide="sparkles"></i><span>Pronto. Revise o registro sugerido abaixo.</span>`;
    window.lucide?.createIcons?.();
  } catch (e) {
    console.error(e);
    if (status) status.innerHTML = `<i data-lucide="triangle-alert"></i><span>Não consegui ler ${esc(file.name)}: ${esc(e.message)}</span>`;
    toast3('Não consegui ler esse arquivo automaticamente. Você ainda pode cadastrar pelo botão “Digitar atividade”.');
  } finally {
    C.processing.delete(key);
  }
}

let evidenceQueue=Promise.resolve();
function queueEvidence(files){for(const file of files)evidenceQueue=evidenceQueue.then(()=>processEvidenceFile(file));return evidenceQueue;}
window.addEventListener('easy-lattes:import-files',e=>queueEvidence(e.detail?.files||[]));

function renderIntakeQueue() {
  const box = q('#smartIntakeQueue');
  const count = q('#smartQueueCount');
  if (!box) return;
  const pending = C.candidates.filter(x => x.status !== 'added' && x.status !== 'saved');
  if (count) count.textContent = String(pending.length);
  if (!C.candidates.length) {
    box.innerHTML = `<div class="smart-empty"><i data-lucide="brain-circuit"></i><div><strong>Nenhum registro sugerido ainda.</strong><p>Envie um print, PDF ou digite uma atividade. O Easy Lattes transforma isso em campos revisáveis.</p></div></div>`;
  } else {
    box.innerHTML = C.candidates.map(c => `<article class="smart-candidate ${c.status === 'added' || c.status === 'saved' ? 'added' : ''}">
      <div class="smart-candidate-icon"><i data-lucide="${c.type === 'artigo'?'book-open':c.type === 'apresentacao'?'mic-2':c.type === 'curso'?'presentation':c.type === 'evento'?'calendar-check':c.type === 'banca'?'users':c.type === 'premio'?'award':c.type === 'organizacao'?'calendar-cog':'file-plus-2'}"></i></div>
      <div class="smart-candidate-main"><div class="smart-meta"><span>${typeLabel(c.type)}</span><span>Extração automática · conferir</span><span>${esc(c.sourceName)}</span></div><h4>${esc(c.title || 'Título precisa de revisão')}</h4><p>${esc((c.type==='artigo'?[c.year,c.journal,c.publicationStatus]:[c.year,c.institution,c.event]).filter(Boolean).join(' • ') || 'Revise os campos antes de incluir no XML.')}</p></div>
      <div class="smart-candidate-action">${c.status === 'added' ? '<span class="added-pill"><i data-lucide="check"></i>No XML</span>' : c.status === 'saved' ? '<span class="added-pill"><i data-lucide="check"></i>Salvo localmente</span>' : `<button class="btn neon mini" data-review-candidate="${c.id}">Revisar e adicionar</button>`}</div>
    </article>`).join('');
  }
  window.lucide?.createIcons?.();
}

function typeLabel(t) {
  return ({pesquisa_projeto:'Projeto de pesquisa',extensao_projeto:'Projeto / ação de extensão',ensino_atividade:'Atividade de ensino',artigo:'Artigo científico',apresentacao:'Palestra / apresentação',curso:'Curso ministrado',evento:'Participação em evento',organizacao:'Organização de evento',banca:'Banca',premio:'Prêmio / título',outra:'Produção técnica'})[t] || t;
}

function openIntakeModal(candidate = null) {
  const modal = q('#intakeModal');
  if (!modal) return;
  const c = candidate || {id:uid(),type:'apresentacao',title:'',year:String(new Date().getFullYear()),institution:'',event:'',local:'',city:'',country:'Brasil',role:'Palestra',hours:'',person:'',notes:'',sourceName:'Entrada manual'};
  C.currentCandidate = c;
  q('#intakeType').value = c.type || 'outra';
  if(q('#projectFieldsV9')){q('#projectFieldsV9').hidden=!['pesquisa_projeto','extensao_projeto','ensino_atividade'].includes(c.type);q('#intakeStartYearV9').value=c.startYear||'';q('#intakeEndYearV9').value=c.endYear||'';q('#intakeProjectStatusV9').value=c.projectStatus||'';}
  q('#intakeTitle').value = c.title || '';
  q('#intakeYear').value = c.year || '';
  q('#intakeInstitution').value = c.institution || '';
  q('#intakeEvent').value = c.event || '';
  q('#intakeRole').value = c.role || '';
  q('#intakeHours').value = c.hours || '';
  q('#intakePerson').value = c.person || '';
  q('#intakeLocal').value = c.local || '';
  q('#intakeCity').value = c.city || '';
  q('#intakeNotes').value = c.notes || '';
  ['journal','authors','doi','volume','pages','publicationStatus'].forEach(k=>{const el=q('#intake'+k[0].toUpperCase()+k.slice(1));if(el)el.value=c[k]||'';});
  q('#articleFields').hidden = c.type !== 'artigo';
  q('#intakeSource').textContent = c.sourceName || 'Entrada manual';
  modal.hidden = false;
  requestAnimationFrame(() => modal.classList.add('open'));
  q('#intakeConfirm').textContent = document.body.classList.contains('product-v9')?'Confirmar atividade':C.doc && c.type !== 'artigo' ? 'Adicionar à cópia do XML' : 'Confirmar e salvar neste dispositivo';
  q('#intakeTitle').focus();
}

function closeIntakeModal() {
  const modal = q('#intakeModal');
  if (!modal) return;
  modal.classList.remove('open');
  setTimeout(() => { modal.hidden = true; }, 160);
}

function formCandidate() {
  const base = C.currentCandidate || {};
  return {
    ...base,
    candidateId: base.id,
    startYear:val('intakeStartYearV9'),endYear:val('intakeEndYearV9'),projectStatus:val('intakeProjectStatusV9'),
    type: val('intakeType'),
    title: val('intakeTitle'),
    year: val('intakeYear'),
    institution: val('intakeInstitution'),
    event: val('intakeEvent'),
    role: val('intakeRole'),
    hours: val('intakeHours'),
    person: val('intakePerson'),
    local: val('intakeLocal'),
    city: val('intakeCity'),
    country: base.country || 'Brasil',
    notes: val('intakeNotes'),
    journal: val('intakeJournal'), authors: val('intakeAuthors'), doi: val('intakeDoi'),
    volume: val('intakeVolume'),pages: val('intakePages'),publicationStatus:val('intakePublicationStatus')
  };
}

const STOP = new Set('a o e de da do das dos em no na nos nas para por com sem um uma uns umas que se ao aos à às como entre sobre sua seu seus suas este esta isso isto mais menos ou já foi foram é são ser ter tem também muito grande nova novo uso estudo estudos analise análise dados pesquisa pesquisas pantanal mato grosso brasil brasileira brasileiro universidade'.split(/\s+/));

function wordCloud(doc) {
  const words = [];
  qa('PALAVRAS-CHAVE', doc).forEach(el => [...el.attributes].forEach(a => { if (/PALAVRA-CHAVE/i.test(a.name) && a.value) words.push(a.value); }));
  const attrs = ['TITULO-DO-ARTIGO','TITULO-DO-LIVRO','TITULO-DO-CAPITULO-DO-LIVRO','TITULO','NOME-DO-PROJETO'];
  qa('*', doc).forEach(el => attrs.forEach(a => { const v = el.getAttribute?.(a); if (v) words.push(v); }));
  const count = new Map();
  words.flatMap(x => norm(x).split(' ')).filter(w => w.length > 3 && !STOP.has(w) && !/^\d+$/.test(w)).forEach(w => count.set(w, (count.get(w)||0)+1));
  return [...count.entries()].sort((a,b)=>b[1]-a[1]).slice(0,18);
}

function areaNames(doc) {
  const names = [];
  qa('AREA-DE-ATUACAO', doc).forEach(el => ['NOME-GRANDE-AREA-DO-CONHECIMENTO','NOME-DA-AREA-DO-CONHECIMENTO','NOME-DA-SUB-AREA-DO-CONHECIMENTO','NOME-DA-ESPECIALIDADE'].forEach(a => { const v=el.getAttribute(a); if(v) names.push(v); }));
  return [...new Set(names)].slice(0,12);
}

function yearsFrom(doc) {
  const years=[];
  qa('*',doc).forEach(el=>[...el.attributes].forEach(a=>{ if (/^ANO($|-)|ANO-DO|ANO-DA/i.test(a.name) && /^(19|20)\d{2}$/.test(a.value)) years.push(+a.value); }));
  return years;
}

function analyzeCareer() {
  if (!C.doc) return renderCareerEmpty();
  const d = C.doc;
  const counts = {
    artigos: qa('ARTIGO-PUBLICADO',d).length,
    livros: qa('LIVRO-PUBLICADO-OU-ORGANIZADO',d).length + qa('CAPITULO-DE-LIVRO-PUBLICADO',d).length,
    orientacoes: qa('ORIENTACOES-CONCLUIDAS-PARA-MESTRADO,ORIENTACOES-CONCLUIDAS-PARA-DOUTORADO,OUTRAS-ORIENTACOES-CONCLUIDAS',d).length,
    tecnica: qa('PRODUCAO-TECNICA [SEQUENCIA-PRODUCAO]',d).length,
    eventos: qa('PARTICIPACAO-EM-EVENTOS-CONGRESSOS [SEQUENCIA-PRODUCAO]',d).length,
    bancas: qa('PARTICIPACAO-EM-BANCA-TRABALHOS-CONCLUSAO [SEQUENCIA-PRODUCAO],PARTICIPACAO-EM-BANCA-JULGADORA [SEQUENCIA-PRODUCAO]',d).length,
    projetos: qa('PROJETO-DE-PESQUISA',d).length
  };
  const years = yearsFrom(d);
  const now = new Date().getFullYear();
  const recent = years.filter(y => y >= now-4).length;
  const keywords = wordCloud(d);
  const areas = areaNames(d);
  const strengths = [
    ['Produção científica', Math.min(100, Math.round(100*(1-Math.exp(-(counts.artigos + counts.livros*1.5)/18)))), counts.artigos+counts.livros],
    ['Formação de pessoas', Math.min(100, Math.round(100*(1-Math.exp(-counts.orientacoes/12)))), counts.orientacoes],
    ['Produção técnica / extensão', Math.min(100, Math.round(100*(1-Math.exp(-counts.tecnica/12)))), counts.tecnica],
    ['Redes e visibilidade', Math.min(100, Math.round(100*(1-Math.exp(-(counts.eventos+counts.bancas*.7)/24)))), counts.eventos+counts.bancas],
    ['Projetos', Math.min(100, Math.round(100*(1-Math.exp(-counts.projetos/8)))), counts.projetos],
    ['Atividade recente', Math.min(100, Math.round(100*(1-Math.exp(-recent/35)))), recent]
  ];
  const recs = [];
  if (!areas.length) recs.push(['Identidade científica','Preencha ou revise as áreas de atuação no Lattes. Isso ajuda a deixar seu perfil científico mais coerente e legível.']);
  if (keywords.length && keywords[0][1] < 4) recs.push(['Palavras-chave','Sua produção parece muito dispersa em termos. Escolha 4–6 palavras-chave centrais e use-as com consistência nas produções e no resumo.']);
  if (counts.artigos >= 10 && counts.tecnica < Math.max(3, counts.artigos*.15)) recs.push(['Transformar ciência em impacto','Há produção científica relevante e proporcionalmente pouca produção técnica. Vale registrar produtos, relatórios, materiais, cursos, plataformas e outras entregas quando elas realmente existirem.']);
  if (counts.eventos < 5 && counts.artigos > 5) recs.push(['Visibilidade','Seu currículo mostra mais produção escrita do que participação em eventos. Se houver palestras, mesas, congressos e apresentações não registradas, a Caixa Acadêmica pode recuperar isso.']);
  if (recent < 8) recs.push(['Atualidade do currículo','Há poucos registros identificados nos últimos cinco anos. Confira se atividades recentes ficaram fora do Lattes.']);
  if (counts.orientacoes < 3) recs.push(['Formação de pessoas','Se orientação faz parte da sua atuação, confira IC, TCC, mestrado, doutorado e outras orientações que possam estar faltando.']);
  if (!recs.length) recs.push(['Coerência e evidências','Seu currículo está relativamente equilibrado. O próximo ganho vem de consistência nas palavras-chave, comprovantes organizados e atualização contínua.']);
  C.lastAnalysis = {counts,keywords,areas,strengths,recs,recent};
  renderCareer();
}

function renderCareerEmpty() {
  const box=q('#careerContent');
  if (box) box.innerHTML=`<div class="career-empty"><i data-lucide="radar"></i><h3>Importe seu XML para gerar o diagnóstico.</h3><p>O Easy Lattes vai analisar produção, orientação, extensão, projetos, palavras-chave e atividade recente.</p></div>`;
  window.lucide?.createIcons?.();
}

function renderCareer() {
  const box = q('#careerContent');
  if (!box) return;
  if (!C.lastAnalysis) return renderCareerEmpty();
  const a=C.lastAnalysis;
  box.innerHTML=`
    <div class="career-hero-v3"><div><div class="mini-label neon-text">LEITURA ESTRATÉGICA DO CURRÍCULO</div><h3>Onde sua trajetória aparece mais forte — e onde há espaço para crescer.</h3><p>Diagnóstico baseado no XML atual. Ele não substitui avaliação institucional nem julgamento profissional.</p></div><button class="btn neon" id="deepAiBtn"><i data-lucide="brain-circuit"></i>Gerar análise aprofundada</button></div>
    <div class="career-grid-v3">
      <section class="career-panel"><div class="career-panel-head"><span>Mapa da carreira</span><small>força relativa no próprio currículo</small></div><div class="strength-list">${a.strengths.map(s=>`<div class="strength-row"><div class="strength-top"><span>${s[0]}</span><strong>${s[1]}%</strong></div><div class="strength-track"><i style="width:${s[1]}%"></i></div><small>${s[2]} registros identificados</small></div>`).join('')}</div></section>
      <section class="career-panel"><div class="career-panel-head"><span>Palavras que definem sua produção</span><small>extraídas de títulos e palavras-chave</small></div><div class="keyword-cloud">${a.keywords.length?a.keywords.map((k,i)=>`<span style="--w:${Math.max(.8,1.35-i*.025)}">${esc(k[0])}</span>`).join(''):'<p class="muted-small">Poucas palavras-chave explícitas foram encontradas.</p>'}</div><div class="area-box"><strong>Áreas declaradas</strong><div>${a.areas.length?a.areas.map(x=>`<span>${esc(x)}</span>`).join(''):'<span>nenhuma área de atuação identificada</span>'}</div></div></section>
    </div>
    <section class="career-panel recommendations"><div class="career-panel-head"><span>O que eu revisaria agora</span><small>ações práticas a partir do currículo</small></div><div class="recommendation-list">${a.recs.map((r,i)=>`<article><div class="rec-number">${String(i+1).padStart(2,'0')}</div><div><strong>${esc(r[0])}</strong><p>${esc(r[1])}</p></div></article>`).join('')}</div></section>
    <section class="career-panel ai-box" id="aiCareerBox"><div class="ai-orb"><i data-lucide="sparkles"></i></div><div><strong>Análise generativa</strong><p>O modo local já encontra padrões e lacunas. Para uma análise realmente generativa — narrativa profissional, oportunidades, resumo estratégico e plano de ação — o Easy Lattes precisa chamar uma API por um backend seguro.</p></div><span class="api-status">API ainda não conectada</span></section>`;
  window.lucide?.createIcons?.();
  q('#deepAiBtn')?.addEventListener('click', deepCareerAnalysis);
}

async function deepCareerAnalysis() {
  const box=q('#aiCareerBox');
  const endpoint=window.EASY_LATTES_AI_ENDPOINT;
  if (!endpoint) {
    if (box) box.innerHTML=`<div class="ai-orb"><i data-lucide="shield-check"></i></div><div><strong>A base está pronta para IA real.</strong><p>Não vou colocar chave de API dentro do GitHub Pages. O próximo passo é ligar um endpoint protegido (por exemplo, função serverless/Firebase). A IA receberá apenas os dados acadêmicos necessários e devolverá uma análise estruturada.</p></div><span class="api-status safe">chave protegida no servidor</span>`;
    window.lucide?.createIcons?.();
    toast3('Análise local pronta. A IA generativa precisa de backend seguro.');
    return;
  }
  try {
    box.classList.add('loading');
    const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(C.lastAnalysis)});
    if(!res.ok) throw new Error('API');
    const data=await res.json();
    box.innerHTML=`<div class="ai-orb"><i data-lucide="brain-circuit"></i></div><div><strong>Análise aprofundada</strong><p>${esc(data.analysis || data.text || 'Análise recebida.')}</p></div><span class="api-status safe">IA conectada</span>`;
    window.lucide?.createIcons?.();
  } catch(e) {
    console.error(e); toast3('A API de análise não respondeu.');
  } finally { box?.classList.remove('loading'); }
}

function syncAdditionsToReport() {
  const changeList=q('#changeList');
  if (!changeList) return;
  qa('.career-added',changeList).forEach(x=>x.remove());
  if(C.additions.length){
    const empty=q('.empty-state',changeList); if(empty) empty.remove();
    C.additions.forEach(c=>changeList.insertAdjacentHTML('afterbegin',`<div class="change-row career-added"><div class="change-row-icon"><i data-lucide="plus"></i></div><div><strong>Novo registro: ${esc(typeLabel(c.type))}</strong><p>${esc(c.title)}${c.year?' • '+esc(c.year):''}</p></div><time>${c.addedAt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</time></div>`));
  }
  const total=q('#exportChangeCount');
  if(total){const prev=+(total.dataset.smartAdded||0), base=Math.max(0,(parseInt(total.textContent,10)||0)-prev);total.textContent=String(base+C.additions.length);total.dataset.smartAdded=String(C.additions.length)}
  const badge=q('#navChangeBadge');
  if(badge){const prev=+(badge.dataset.smartAdded||0), base=Math.max(0,(parseInt(badge.textContent,10)||0)-prev);badge.textContent=String(base+C.additions.length);badge.dataset.smartAdded=String(C.additions.length)}
  window.lucide?.createIcons?.();
}

function renderSavedDrafts() {
  const target = q('#stage1SavedList');
  const count = q('#stage1SavedCount');
  if (count) count.textContent = String(C.saved.length);
  if (!target) return;
  target.replaceChildren();
  if (!C.saved.length) {
    const p = document.createElement('p');
    p.className = 'stage1-muted';
    p.textContent = 'Nenhuma atividade aprovada ainda. Comece enviando um comprovante.';
    target.appendChild(p);
    return;
  }
  C.saved.slice().reverse().forEach(d => {
    const row = document.createElement('div');
    row.className = 'stage1-saved-row';
    const label = document.createElement('div');
    const strong = document.createElement('strong'); strong.textContent = d.title;
    const small = document.createElement('small'); small.textContent = [typeLabel(d.type),d.year,d.institution].filter(Boolean).join(' • ');
    label.append(strong,small);
    const btn = document.createElement('button');
    btn.className = 'btn ghost'; btn.textContent = 'Excluir'; btn.type='button';
    btn.addEventListener('click', () => {
      C.saved = C.saved.filter(x => x.id !== d.id);
      if (saveLocalDraft()) {
        C.candidates = C.candidates.filter(x => x.id !== d.candidateId && x.id !== d.id);
        window.dispatchEvent(new CustomEvent('easy-lattes:record-deleted',{detail:{id:d.id}}));
        renderIntakeQueue(); renderSavedDrafts();
      } else { C.saved.push(d); toast3('Não consegui excluir o registro.'); }
    });
    row.append(label,btn); target.appendChild(row);
  });
}
function importCloudActivities(items) {
  if (!Array.isArray(items)) return;
  C.saved = items.filter(x=>x && typeof x.id==='string' && typeof x.title==='string');
  try { localStorage.setItem('easy-lattes:approved-activities:v1',JSON.stringify(C.saved)); }
  catch(e) { console.warn('Cache local indisponível',e); }
  renderSavedDrafts();
}
window.addEventListener('easy-lattes:cloud-records',e=>importCloudActivities(e.detail?.records));
function exportApprovedActivities() {
  if (!C.saved.length) return toast3('Ainda não há atividades salvas para exportar.');
  const blob = new Blob([JSON.stringify({format:'easy-lattes-approved-v1', exportedAt:new Date().toISOString(),activities:C.saved},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a');
  a.href=url; a.download='easy-lattes-atividades.json'; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function wire() {
  try { const saved=JSON.parse(localStorage.getItem('easy-lattes:approved-activities:v1')||'[]'); C.saved=Array.isArray(saved)?saved:[]; } catch(e) { C.saved=[]; }
  renderSavedDrafts();
  q('#stage1Export')?.addEventListener('click',exportApprovedActivities);
  q('#stage1Upload')?.addEventListener('click',()=>{ q('[data-view="inbox"]')?.click(); q('#evidenceInput')?.click(); });
  q('#stage1Manual')?.addEventListener('click',()=>openIntakeModal());
  const careerBtn=q('[data-view="career"]');
  if(careerBtn){
    const old=careerBtn.onclick;
    careerBtn.onclick=function(e){ if(old) old.call(this,e); setTimeout(()=>{const t=q('#pageTitle');if(t)t.textContent='Análise da sua carreira.'; renderCareer();},0); };
  }
  q('#manualEntryBtn')?.addEventListener('click',()=>openIntakeModal());
  q('#intakeType')?.addEventListener('change',e=>{q('#articleFields').hidden=e.target.value!=='artigo';if(q('#projectFieldsV9'))q('#projectFieldsV9').hidden=!['pesquisa_projeto','extensao_projeto','ensino_atividade'].includes(e.target.value);q('#intakeConfirm').textContent=document.body.classList.contains('product-v9')?'Confirmar atividade':C.doc && e.target.value!=='artigo'?'Adicionar à cópia do XML':'Confirmar e salvar neste dispositivo';});
  q('#intakeClose')?.addEventListener('click',closeIntakeModal);
  q('#intakeCancel')?.addEventListener('click',closeIntakeModal);
  q('#intakeModal')?.addEventListener('click',e=>{if(e.target.id==='intakeModal')closeIntakeModal()});
  q('#intakeConfirm')?.addEventListener('click',()=>addCandidateToXml(formCandidate()));
  document.addEventListener('click',e=>{const b=e.target.closest('[data-review-candidate]');if(b){const c=C.candidates.find(x=>x.id===b.dataset.reviewCandidate);if(c)openIntakeModal(c)}});
  q('#evidenceInput')?.addEventListener('change',e=>queueEvidence([...e.target.files]));
  q('#dropzone')?.addEventListener('drop',e=>queueEvidence([...e.dataTransfer.files]));
  qa('.nav-item').forEach(b=>b.addEventListener('click',()=>setTimeout(syncAdditionsToReport,30)));
  renderIntakeQueue(); renderCareerEmpty();
}

window.addEventListener('easy-lattes:xml-ready', e => {
  C.doc=e.detail?.doc || window.__easyLattesCurrentDoc;
  analyzeCareer();
  renderIntakeQueue();
  toast3('XML conectado à Entrada Inteligente e à Análise de carreira.');
});

if(window.__easyLattesCurrentDoc){C.doc=window.__easyLattesCurrentDoc;analyzeCareer()}
wire();
window.lucide?.createIcons?.();
