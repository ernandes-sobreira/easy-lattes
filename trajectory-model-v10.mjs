import {GROUPS as BASE_GROUPS,analyzeProfile as baseProfile,normalize} from './profile-model-v9.mjs?v=20261112-1';
export {normalize};
export const GROUPS={...BASE_GROUPS,research:'Projetos de pesquisa',formation:'Formação e titulação',professional:'Vínculos profissionais',researchLines:'Linhas de pesquisa',researchActivity:'Atividades de pesquisa',accepted:'Artigos aceitos',otherBibliographic:'Outras produções bibliográficas',arts:'Produção artística e cultural',awards:'Prêmios e títulos',languages:'Idiomas',otherActivity:'Outras atividades identificadas',developmentProjects:'Projetos de desenvolvimento'};
const each=el=>[el,...el.querySelectorAll('*')];
const value=(el,names)=>{for(const n of each(el))for(const key of names){const v=n.getAttribute(key);if(v?.trim())return v.trim();}return '';};
const year=v=>/^(19|20)\d{2}$/.test(v||'')?+v:null;
function descriptiveTitle(el){return value(el,['TITULO-DO-ARTIGO','TITULO-DO-TRABALHO','TITULO-DA-LINHA-DE-PESQUISA','NOME-DO-PROJETO','TITULO','TITULO-DA-DISSERTACAO-TESE','NOME-CURSO','NOME-DO-CURSO','NOME-DO-PREMIO-OU-TITULO','CARGO-OU-FUNCAO','NOME-DO-EVENTO','NOME-UNIDADE','IDIOMA','NOME-INSTITUICAO']);}
function inheritedInstitution(el){for(let n=el;n&&n.tagName!=='CURRICULO-VITAE';n=n.parentElement){const v=n.getAttribute('NOME-INSTITUICAO')||n.getAttribute('NOME-DA-INSTITUICAO');if(v)return v;}return value(el,['NOME-INSTITUICAO','NOME-DA-INSTITUICAO','NOME-DA-ENTIDADE','NOME-DA-ENTIDADE-PROMOTORA']);}
function extraGroup(el){const t=el.tagName;
 if(t==='ARTIGO-ACEITO-PARA-PUBLICACAO')return 'accepted';
 if(t==='IDIOMA'&&el.parentElement?.tagName==='IDIOMAS')return 'languages';
 if(t==='PREMIO-TITULO')return 'awards';
 if(t==='VINCULOS'||(t==='ATUACAO-PROFISSIONAL'&&!el.querySelectorAll('VINCULOS').length))return 'professional';
 if(el.parentElement?.tagName==='FORMACAO-ACADEMICA-TITULACAO'||el.parentElement?.tagName==='FORMACAO-COMPLEMENTAR')return 'formation';
 if(t==='LINHA-DE-PESQUISA')return 'researchLines';
 if(t==='PESQUISA-E-DESENVOLVIMENTO')return 'researchActivity';
 if(t==='CONSELHO-COMISSAO-E-CONSULTORIA')return 'committees';
 if(t==='TREINAMENTO-MINISTRADO')return 'teaching';
 if(t==='SERVICO-TECNICO-ESPECIALIZADO')return 'technical';
 if(['SOFTWARE','PATENTE','PRODUTO-TECNOLOGICO','PROCESSOS-OU-TECNICAS','TRABALHO-TECNICO','MARCA','DESENHO-INDUSTRIAL','DESENVOLVIMENTO-DE-MATERIAL-DIDATICO-OU-INSTRUCIONAL','RELATORIO-DE-PESQUISA'].includes(t))return 'technical';
 // Sequence attributes identify records, while the following are references or child details.
 if(/^(DADOS-|DETALHAMENTO-|AUTORES$|INTEGRANTES-|FINANCIADOR-|PRODUCAO-CT-DO-PROJETO$|ORIENTACAO$|ATUACAO-PROFISSIONAL$)/.test(t))return null;
 const seq=[...el.attributes].some(a=>/^SEQUENCIA-(PRODUCAO|PROJETO|FORMACAO|FUNCAO-ATIVIDADE|HISTORICO)$/.test(a.name));
 if(!seq)return null;
 if(el.closest('PRODUCAO-ARTISTICA-CULTURAL'))return 'arts';
 if(el.closest('PRODUCAO-BIBLIOGRAFICA'))return 'otherBibliographic';
 return 'otherActivity';
}
function enrich(r){const el=r.source;
 r.institution=inheritedInstitution(el);r.description=value(el,['DESCRICAO-DO-PROJETO','OBJETIVOS-LINHA-DE-PESQUISA','FINALIDADE','OUTRAS-INFORMACOES']);
 r.start=year(el.getAttribute('ANO-INICIO'));r.end=year(el.getAttribute('ANO-FIM'));
 r.ongoing=r.ongoing||el.getAttribute('FLAG-LINHA-DE-PESQUISA-ATIVA')==='SIM'||el.getAttribute('FLAG-PERIODO')==='ATUAL'||el.getAttribute('SITUACAO')==='EM_ANDAMENTO';
 r.authors=[...new Set([...el.querySelectorAll('AUTORES')].map(n=>n.getAttribute('NOME-COMPLETO-DO-AUTOR')||n.getAttribute('NOME-PARA-CITACAO')||'').filter(Boolean))];
 r.student=value(el,['NOME-DO-ORIENTANDO','NOME-DO-ORIENTADO','NOME-DO-ALUNO']);
 r.keywords=[...new Set([...el.querySelectorAll('PALAVRAS-CHAVE')].flatMap(n=>[...n.attributes].filter(a=>/^PALAVRA-CHAVE-/.test(a.name)).map(a=>a.value.trim()).filter(Boolean)))];
 r.funders=[...new Set([...el.querySelectorAll('FINANCIADOR-DO-PROJETO')].map(n=>n.getAttribute('NOME-INSTITUICAO')||'').filter(Boolean))];
 r.team=[...new Set([...el.querySelectorAll('INTEGRANTES-DO-PROJETO')].map(n=>n.getAttribute('NOME-COMPLETO')||'').filter(Boolean))];
 r.status=el.getAttribute('SITUACAO')||el.getAttribute('FLAG-PERIODO')||'';
 return r;
}
export const DOMAINS={
 research:{label:'Pesquisa e produção científica',groups:['research','researchActivity','researchLines','articles','accepted','books','otherBibliographic']},
 extension:{label:'Extensão',groups:['extension']},
 teaching:{label:'Ensino e formação de pessoas',groups:['teaching','advising']},
 technology:{label:'Produção técnica e inovação',groups:['technical','developmentProjects']},
 collaboration:{label:'Colaboração e circulação',groups:['events']},
 management:{label:'Bancas e gestão acadêmica',groups:['committees']},
 education:{label:'Formação e atuação profissional',groups:['formation','professional','awards','languages','arts']}
};
const STOP=new Set('a o e de da do das dos em no na nos nas para por com sem um uma que se ao aos as os the and of in on for to with from by an a study analysis analise estudo estudos pesquisa research using use uso effects efeito sobre uma entre como at is its through based brazil brasil brasileira brasileiro estado university universidade journal new toward role'.split(' '));
function themes(records){const declared=new Map(),words=new Map();for(const r of records){for(const term of r.keywords){const key=normalize(term);if(!declared.has(key))declared.set(key,{term,ids:new Set(),origin:'Palavra-chave declarada'});declared.get(key).ids.add(r.id);}
 for(const term of new Set(normalize(r.title).split(' ').filter(w=>w.length>3&&!STOP.has(w)&&!/^\d+$/.test(w)))){if(!words.has(term))words.set(term,{term,ids:new Set(),origin:'Termo extraído de títulos'});words.get(term).ids.add(r.id);}}
 const ranked=map=>[...map.values()].map(x=>({...x,ids:[...x.ids],count:x.ids.size})).sort((a,b)=>b.count-a.count||a.term.localeCompare(b.term));
 return {declared:ranked(declared),titles:ranked(words).filter(x=>x.count>=2)};
}
function collaborators(records,doc){const me=normalize(doc.querySelector('DADOS-GERAIS')?.getAttribute('NOME-COMPLETO')||''),citations=(doc.querySelector('DADOS-GERAIS')?.getAttribute('NOME-EM-CITACOES-BIBLIOGRAFICAS')||'').split(';').map(normalize),names=new Map();for(const r of records)for(const name of r.authors){const key=normalize(name);if(!key||key===me||citations.includes(key))continue;if(!names.has(key))names.set(key,{name,ids:new Set()});names.get(key).ids.add(r.id);}
 const list=[...names.values()].map(x=>({...x,ids:[...x.ids],count:x.ids.size})).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name));
 const students=new Set(records.filter(r=>r.group==='advising'&&r.student).map(r=>normalize(r.student)));
 return {list,studentAuthored:records.filter(r=>r.authors.some(n=>students.has(normalize(n)))).map(r=>r.id),authoredRecords:records.filter(r=>r.authors.length).length};
}
function projectConnections(records){const links=[];for(const p of records.filter(r=>['research','extension','otherProjects','developmentProjects'].includes(r.group)&&r.tag==='PROJETO-DE-PESQUISA')){
 for(const ref of p.source.querySelectorAll('PRODUCAO-CT-DO-PROJETO, ORIENTACAO')){const isOrientation=ref.tagName==='ORIENTACAO',title=ref.getAttribute(isOrientation?'TITULO-ORIENTACAO':'TITULO-DA-PRODUCAO-CT')||'';
 const matches=title?records.filter(r=>r.id!==p.id&&(isOrientation?r.group==='advising':['articles','accepted','books','otherBibliographic','technical','arts','events'].includes(r.group))&&normalize(r.title)===normalize(title)):[];
 links.push({project:p.id,title:title||'Referência sem título',kind:isOrientation?'Orientação declarada no projeto':'Produção declarada no projeto',targets:matches.map(r=>r.id),ambiguous:matches.length>1});
 }}return links;
}
function coverage(doc,records){const all=[doc.documentElement,...doc.documentElement.querySelectorAll('*')],classified=new Set(records.filter(r=>r.group!=='otherActivity').map(r=>r.source));
 const sections=[...doc.documentElement.children].map(el=>{const nodes=[el,...el.querySelectorAll('*')],set=new Set(nodes),items=records.filter(r=>set.has(r.source));return {section:el.tagName,elements:nodes.length,attributes:nodes.reduce((n,e)=>n+e.attributes.length,0),records:items.length,unclassified:items.filter(r=>r.group==='otherActivity').length};});
 return {elements:all.length,attributes:all.reduce((n,e)=>n+e.attributes.length,0),sections,classified:records.filter(r=>classified.has(r.source)).length,unclassified:records.filter(r=>r.group==='otherActivity').map(r=>r.id),note:'Todo o arquivo foi percorrido. Percorrer um campo não significa validar seu conteúdo ou comprovar impacto. A cobertura interpretativa por seção está indicada abaixo.'};
}
function observations(m,now){const c=m.counts,rows=[];const add=(key,title,text,ids,limit)=>rows.push({key,title,text,ids,limit});
 add('research','Pesquisa e resultados registrados',`${c.articles} artigos publicados, ${c.accepted} aceitos, ${c.books} livros/capítulos, ${c.research} projetos e ${c.researchLines} linhas de pesquisa. ${m.links.length} relações projeto–produção/orientação estão explicitamente declaradas.`,m.records.filter(r=>DOMAINS.research.groups.includes(r.group)).map(r=>r.id),'Quantidade e metadados não demonstram qualidade científica, citações ou impacto.');
 add('extension','Extensão identificada',`${c.extension} projetos/atividades de extensão foram identificados pela natureza ou seção declarada. ${m.groups.extension.filter(r=>r.ongoing).length} aparecem em andamento/atuais.`,m.groups.extension.map(r=>r.id),'Público alcançado e mudança social precisam de evidências; não são inferidos da quantidade de ações.');
 const completed=m.groups.advising.filter(r=>!r.ongoing).length;
 add('teaching','Ensino e formação de pessoas',`${c.teaching} atividades de ensino/cursos ministrados; ${completed} orientações em categorias de conclusão e ${m.ongoingAdvising} em andamento. ${m.collaborators.studentAuthored.length} produções têm autoria com nome idêntico ao de uma pessoa orientada no XML.`,m.records.filter(r=>DOMAINS.teaching.groups.includes(r.group)).map(r=>r.id),'Períodos de ensino não equivalem ao número de disciplinas. Coincidência de nomes exige conferência de homônimos.');
 add('technology','Aplicações e produção técnica',`${c.technical} produções técnicas, incluindo ${m.groups.technical.filter(r=>r.tag==='SOFTWARE').length} softwares e ${m.groups.technical.filter(r=>r.tag==='PATENTE').length} registros de patente.`,m.groups.technical.map(r=>r.id),'Registro no XML não comprova concessão, uso, adoção ou receita.');
 add('collaboration','Colaboração e circulação do trabalho',`${m.collaborators.authoredRecords} registros contêm autoria identificável; ${m.collaborators.list.length} nomes de coautores, por grafia normalizada, além do titular. ${c.events} registros de eventos, trabalhos e apresentações.`,m.records.filter(r=>r.authors.length||r.group==='events').map(r=>r.id),'Variações de grafia podem representar a mesma pessoa; a rede mostra nomes registrados, não identidades verificadas.');
 add('management','Participação acadêmica e gestão',`${c.committees} registros de bancas, direção, conselhos e comissões foram identificados.`,m.groups.committees.map(r=>r.id),'Participação e cargo não medem, isoladamente, carga de trabalho ou contribuição institucional.');
 add('education','Formação e atuação profissional',`${c.formation} registros de formação, ${c.professional} vínculos/atuações, ${c.awards} prêmios, ${c.languages} idiomas e ${c.arts} produções artísticas/culturais identificados.`,m.records.filter(r=>DOMAINS.education.groups.includes(r.group)).map(r=>r.id),'Atividades não identificadas podem estar ausentes do arquivo ou em estrutura ainda não classificada.');
 return rows;
}
export function analyzeProfile(doc,now=new Date().getFullYear()){
 const m=baseProfile(doc,now);for(const k of Object.keys(GROUPS))m.groups[k]??=[];
 for(const r of [...m.groups.otherProjects])if(normalize(r.nature)==='desenvolvimento'){m.groups.otherProjects=m.groups.otherProjects.filter(x=>x!==r);r.group='developmentProjects';m.groups.developmentProjects.push(r);}
 const sources=new Set(m.records.map(r=>r.source));
 for(const el of doc.querySelectorAll('*')){if(sources.has(el))continue;const group=extraGroup(el);if(!group)continue;
 const title=descriptiveTitle(el)||inheritedInstitution(el)||'',yearValue=value(el,['ANO-DO-ARTIGO','ANO-DO-TRABALHO','ANO-DA-ORIENTACAO','ANO-DE-CONCLUSAO','ANO-INICIO','ANO','ANO-FIM','ANO-DA-PREMIACAO']);
 const r={id:`profile-${m.records.length}`,group,title:title||'Nome não identificado',year:year(yearValue),doi:value(el,['DOI']),tag:el.tagName,nature:el.getAttribute('NATUREZA')||'',ongoing:/EM-ANDAMENTO/.test(el.tagName),source:el};m.records.push(r);m.groups[group].push(r);sources.add(el);
 if(!title)m.issues.push({id:r.id+'-title',record:r,kind:'missing',message:'Nome ou título não identificado; confira o registro original.'});
 if(!r.year&&!['languages','researchLines'].includes(group))m.issues.push({id:r.id+'-year',record:r,kind:'missing',message:'Ano de referência não identificado; confira o período.'});
 }
 for(const r of m.records)enrich(r);
 m.issues=m.issues.filter(i=>!(i.id.endsWith('-person')&&i.record.student));
 m.counts=Object.fromEntries(Object.entries(m.groups).map(([k,v])=>[k,v.length]));
 const institutionMap=new Map();for(const r of m.records)if(r.institution){const key=normalize(r.institution);if(!institutionMap.has(key))institutionMap.set(key,{name:r.institution,ids:[]});institutionMap.get(key).ids.push(r.id);}m.institutions=[...institutionMap.values()].sort((a,b)=>b.ids.length-a.ids.length);
 m.identity={summary:value(doc.documentElement,['TEXTO-RESUMO-CV-RH']),areas:[...new Set([...doc.querySelectorAll('AREA-DE-ATUACAO')].flatMap(el=>['NOME-GRANDE-AREA-DO-CONHECIMENTO','NOME-DA-AREA-DO-CONHECIMENTO','NOME-DA-SUB-AREA-DO-CONHECIMENTO','NOME-DA-ESPECIALIDADE'].map(k=>el.getAttribute(k)).filter(Boolean)))]};
 m.coverage=coverage(doc,m.records);m.themes=themes(m.records);m.collaborators=collaborators(m.records,doc);m.links=projectConnections(m.records);
 const dated=m.records.map(r=>r.year).filter(y=>y&&y<=now),first=dated.length?Math.min(...dated):null,last=dated.length?Math.max(...dated):null;
 m.period={first,last};m.undated=m.records.filter(r=>!r.year).length;
 m.fullTimeline=first?Array.from({length:now-first+1},(_,i)=>({year:first+i,count:m.records.filter(r=>r.year===first+i).length})):[];
 m.domains=Object.entries(DOMAINS).map(([key,def])=>{const records=m.records.filter(r=>def.groups.includes(r.group));return {key,label:def.label,ids:records.map(r=>r.id),count:records.length,recent:records.filter(r=>r.year>=now-4&&r.year<=now).length,previous:records.filter(r=>r.year>=now-9&&r.year<=now-5).length,undated:records.filter(r=>!r.year).length};});
 m.observations=observations(m,now);m.observationYear=now;m.timeline=m.fullTimeline.filter(x=>x.year>=now-4);
 const available=m.domains.filter(d=>d.count);m.portrait=first?`Há registros datados de ${first} a ${last}, com ${m.records.length} registros de atividades, produções e formação. Há evidências em ${available.length} das ${m.domains.length} dimensões examinadas. Todos os ${m.counts.articles} artigos publicados foram incluídos na leitura, independentemente de DOI ou pendência cadastral.`:'Não foram identificados anos suficientes para descrever a trajetória. Confira a cobertura e os registros do arquivo.';
 const recurrent=m.themes.declared.slice(0,3);if(recurrent.length)m.portrait+=' Entre as palavras-chave declaradas mais recorrentes estão '+recurrent.map(t=>t.term).join(', ')+'.';
 return m;
}
export function careerPlan(m,goal){
 const domainKey={research:'research',extension:'extension',teaching:'teaching',technology:'technology'}[goal],d=m.domains.find(x=>x.key===domainKey),linked=new Set(m.links.map(l=>l.project)).size;
 const common=[['Completar a evidência do seu percurso',`${m.issues.length} alertas de cadastro e ${m.coverage.unclassified.length} registros ainda sem classificação interpretativa. Primeiro confira períodos, títulos e categorias; eles afetam a leitura da trajetória.`]];
 if(goal==='organize')return [...common,['Registrar relações já existentes',`${linked} projetos têm referências explícitas a produções/orientações. Confira os demais projetos e relacione entregas que de fato resultaram deles, com comprovação.`],['Organizar atividades ainda fora do currículo','Compare as fichas confirmadas no Easy Lattes com o XML. A comparação por título e ano é um indício, não uma prova de ausência.']];
 if(goal==='application')return [...common,['Definir a chamada e o período de avaliação',`O diagnóstico abrange ${m.period.first||'ano não identificado'}–${m.period.last||'ano não identificado'}. Uma candidatura exige aplicar os critérios e a janela temporal da chamada específica; não estimamos chances a partir dessas contagens.`],['Preparar um conjunto verificável de evidências','Reúna comprovantes das atividades exigidas e confira a relação entre projetos, publicações, orientações e produtos.']];
 const actions={research:['Explicitar sua linha e seus resultados',`${m.counts.researchLines} linhas e ${m.counts.research} projetos declarados. Examine os temas recorrentes e os vínculos explícitos com resultados para escolher uma próxima entrega.`],extension:['Documentar alcance e resultados','Escolha uma ação real de extensão e reúna público atendido, território, sua participação e resultados verificáveis. O arquivo, sozinho, não demonstra impacto social.'],teaching:['Relacionar ensino, orientação e materiais',`${m.counts.teaching} registros de ensino e ${m.counts.advising} orientações. Confira se materiais, projetos pedagógicos e produtos dos orientandos estão documentados e relacionados quando houver evidência.`],technology:['Demonstrar aplicação e adoção',`${m.counts.technical} produções técnicas. Para um produto concreto, documente a finalidade, usuários, sua contribuição e evidências de uso. Não presumimos uso a partir de um registro de software ou patente.`]};
 return [[`Situar seu objetivo na trajetória`,`${d?.count||0} registros na dimensão escolhida: ${d?.recent||0} com ano nos últimos cinco anos e ${d?.previous||0} nos cinco anteriores. A diferença descreve o cadastro; não mede dedicação ou desempenho.`],actions[goal]||common[0],...common];
}
