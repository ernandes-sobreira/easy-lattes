// Counts are evidence from the imported XML, never a productivity score.
export const GROUPS={articles:'Artigos publicados',research:'Pesquisa',extension:'Extensão',teaching:'Ensino',advising:'Orientações',technical:'Produção técnica',books:'Livros e capítulos',events:'Eventos e apresentações',committees:'Bancas e gestão',otherProjects:'Outros projetos'};
export const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const elements=(el)=>[el,...el.querySelectorAll('*')];
function field(el,pattern){for(const n of elements(el))for(const a of [...n.attributes])if(pattern.test(a.name)&&a.value.trim())return a.value.trim();return '';}
function yearOf(el){for(const n of elements(el))for(const a of [...n.attributes])if(/^(ANO($|-)|ANO-DO|ANO-DA)/.test(a.name)&&/^(19|20)\d{2}$/.test(a.value))return Number(a.value);return null;}
function groupOf(el){const t=el.tagName;
 if(t==='ARTIGO-PUBLICADO')return 'articles';
 if(t==='PROJETO-DE-PESQUISA'){const nature=normalize(el.getAttribute('NATUREZA'));return nature==='pesquisa'?'research':nature==='extensao'?'extension':'otherProjects';}
 if(t==='EXTENSAO-UNIVERSITARIA'&&el.parentElement?.tagName==='ATIVIDADES-DE-EXTENSAO-UNIVERSITARIA')return 'extension';
 if(t==='ENSINO'&&el.parentElement?.tagName==='ATIVIDADES-DE-ENSINO')return 'teaching';
 if(/^ORIENTACAO-EM-ANDAMENTO-DE-/.test(t)||/^ORIENTACOES-CONCLUIDAS-PARA-/.test(t)||t==='OUTRAS-ORIENTACOES-CONCLUIDAS')return 'advising';
 if(['LIVRO-PUBLICADO-OU-ORGANIZADO','CAPITULO-DE-LIVRO-PUBLICADO'].includes(t))return 'books';
 if(/^PARTICIPACAO-EM-BANCA-DE-/.test(t)||/^BANCA-JULGADORA-PARA-/.test(t)||t==='OUTRAS-BANCAS-JULGADORAS'||t==='DIRECAO-E-ADMINISTRACAO')return 'committees';
 if(t==='APRESENTACAO-DE-TRABALHO'||t==='TRABALHO-EM-EVENTOS'||/^PARTICIPACAO-EM-(CONGRESSO|SEMINARIO|SIMPOSIO|ENCONTRO|OUTRAS)/.test(t))return 'events';
 if(el.closest('PRODUCAO-TECNICA')&&el.hasAttribute('SEQUENCIA-PRODUCAO')&&!t.startsWith('DADOS-')&&!t.startsWith('DETALHAMENTO-'))return t==='CURSO-DE-CURTA-DURACAO-MINISTRADO'?'teaching':'technical';
 return null;
}
export function analyzeProfile(doc,now=new Date().getFullYear()){
 const groups=Object.fromEntries(Object.keys(GROUPS).map(k=>[k,[]])),records=[],issues=[];
 for(const el of doc.querySelectorAll('*')){const group=groupOf(el);if(!group)continue;
 const title=field(el,/^(TITULO($|-)|NOME-DO-PROJETO$|NOME-DO-EVENTO$|NOME-CURSO$|DISCIPLINA-MINISTRADA$|CARGO-OU-FUNCAO$)/)||el.getAttribute('NOME-UNIDADE')||'';
 const year=yearOf(el),doi=field(el,/^DOI$/),id=`profile-${records.length}`;
 const record={id,group,title:title||'Nome não identificado',year,doi,tag:el.tagName,nature:el.getAttribute('NATUREZA')||'',ongoing:/EM-ANDAMENTO/.test(el.tagName)||el.getAttribute('SITUACAO')==='EM_ANDAMENTO',source:el};groups[group].push(record);records.push(record);
 if(!title)issues.push({id:id+'-title',record,kind:'missing',message:'Nome ou título não identificado no registro.'});
 if(!year)issues.push({id:id+'-year',record,kind:'missing',message:'Ano de referência não identificado; confira o período.'});
 if(el.tagName==='PROJETO-DE-PESQUISA'&&!el.getAttribute('NATUREZA'))issues.push({id:id+'-nature',record,kind:'missing',message:'Natureza do projeto não identificada. Confira se é pesquisa, extensão ou outra atividade.'});
 if(group==='advising'&&!field(el,/^NOME-DO-ORIENTANDO$/))issues.push({id:id+'-person',record,kind:'missing',message:'Nome da pessoa orientada não identificado.'});
 }
 const seen=new Map();for(const r of records){if(r.title==='Nome não identificado')continue;const key=r.group+'|'+normalize(r.title)+'|'+r.year;if(!r.year)continue;if(seen.has(key))issues.push({id:r.id+'-duplicate',record:r,kind:'duplicate',message:'Possível repetição de categoria, título e ano. Compare os registros antes de excluir.'});else seen.set(key,r);}
 const counts=Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,v.length]));
 const years=Array.from({length:5},(_,i)=>now-4+i),timeline=years.map(y=>({year:y,count:records.filter(r=>r.year===y).length}));
 const root=doc.documentElement,date=root.getAttribute('DATA-ATUALIZACAO')||'';
 return {name:doc.querySelector('DADOS-GERAIS')?.getAttribute('NOME-COMPLETO')||'Seu perfil',date,groups,counts,records,issues,timeline,undated:records.filter(r=>!r.year).length,articleDoiMissing:groups.articles.filter(r=>!r.doi).length,ongoingAdvising:groups.advising.filter(r=>r.ongoing).length};
}
export function careerPlan(profile,goal){
 const c=profile.counts;
 const options={
 organize:[['Conferir o que falta registrar',`${profile.issues.length} alertas de cadastro foram identificados nas categorias reconhecidas. Confira documentos antes de preencher informações ausentes.`],['Organizar sua rotina de atualização','Reúna certificados, declarações e produtos recentes e registre cada atividade após conferir a classificação.']],
 research:[['Relacionar projetos e resultados',`${c.research} projetos de pesquisa e ${c.articles} artigos foram identificados. Confira quais trabalhos e orientações derivaram de cada projeto; a relação não é inferida automaticamente.`],['Definir uma próxima entrega','Escolha uma pesquisa em andamento, registre sua pergunta central e planeje um produto e um prazo compatíveis com sua atuação.']],
 extension:[['Tornar a extensão visível',`${c.extension} registros de extensão foram identificados. Se outras ações foram realizadas, reúna as declarações; ausência no XML não significa ausência de atuação.`],['Documentar alcance e resultados','Para cada ação, registre público atendido, território, sua participação e resultados que possam ser comprovados. Quantidade de ações não mede impacto sozinha.']],
 teaching:[['Conferir ensino e formação',`${c.teaching} registros de ensino e ${c.advising} orientações foram identificados. Confira disciplinas, cursos ministrados, materiais e orientações que ainda precisem de registro.`],['Planejar uma melhoria pedagógica','Escolha uma prática de ensino, defina o resultado esperado e guarde evidências para avaliar a experiência e documentá-la.']],
 technology:[['Relacionar pesquisa e aplicação',`${c.technical} produções técnicas foram identificadas. Confira softwares, materiais, relatórios e outros produtos efetivamente desenvolvidos.`],['Documentar uso e benefício','Registre a finalidade, quem utilizou o produto, sua contribuição e as evidências disponíveis. Um artigo não é convertido automaticamente em produto.']],
 application:[['Escolher a chamada antes de comparar','Informe os critérios de uma chamada específica para uma avaliação futura. Este diagnóstico não estima elegibilidade, pontuação ou chance de aprovação.'],['Preparar evidências verificáveis','Confira produção, orientações, projetos e produtos no período solicitado e reúna os comprovantes correspondentes.']]
 };
 return options[goal]||options.organize;
}
