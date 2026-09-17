# Easy Lattes — ativação única da IA

O Easy Lattes funciona em duas camadas:

1. **Local, sem API:** XML, auditoria, revisão assistida, Caixa Acadêmica, Crossref/OpenAlex, bibliometria pública e painel acadêmico robusto.
2. **Backend protegido:** análise generativa, análise profunda, análise acadêmica completa e busca ampla em fontes públicas.

A chave da OpenAI **nunca deve ficar no GitHub Pages**.

## Arquitetura atual

GitHub Pages → Firebase HTTPS Functions → OpenAI Responses API

O backend é carregado por `functions/bootstrap.js` e publica cinco funções:

- `health`: informa ao próprio Easy Lattes se o backend está online;
- `careerAnalysis`: análise generativa econômica a partir de um resumo estruturado do currículo;
- `careerAnalysisDeep`: modo consultoria com identidade profissional, evidências, forças, oportunidades, plano de 90 dias e revisão de pistas públicas;
- `academicAnalysisV8`: análise acadêmica robusta, separando bibliometria, internacionalização, formação de pessoas, produção com discentes, redes institucionais, visibilidade, produtos técnicos, bancas/comitês e evidências de alcance social/transferência;
- `webDiscovery`: pesquisa pública de possíveis atividades esquecidas, sempre com revisão humana antes de qualquer inclusão.

## O único segredo obrigatório

```bash
firebase functions:secrets:set OPENAI_API_KEY
```

Use uma chave de um projeto da OpenAI destinado ao Easy Lattes. **Não cole essa chave no HTML, JavaScript público ou na tela do Easy Lattes.**

## Primeira implantação

```bash
npm install -g firebase-tools
firebase login
firebase use SEU_PROJECT_ID
cd functions
npm install
cd ..
firebase deploy --only functions:health,functions:careerAnalysis,functions:careerAnalysisDeep,functions:academicAnalysisV8,functions:webDiscovery
```

O `firebase.json` aponta para `functions/` e Node.js 20.

## Depois do deploy

Abra o Easy Lattes → **Sistema** → informe somente o ID do projeto Firebase → **Salvar e testar**.

A própria plataforma monta os endpoints principais. Os módulos avançados derivam os endpoints `careerAnalysisDeep` e `academicAnalysisV8` do mesmo projeto.

## Controle de custo

- painel acadêmico local e métricas OpenAlex: sem chamada de IA;
- análise generativa padrão: GPT-5.6 Luna;
- análise profunda e análise acadêmica V8: GPT-5.6 Luna por padrão, com cache de resultados;
- busca ampla: GPT-5.6 Luna + ferramenta de pesquisa web;
- resultados idênticos podem ser reutilizados do cache;
- modelos mais caros podem ser reservados para um plano premium.

## Privacidade e rigor

A análise de carreira não precisa enviar o XML bruto. O navegador prepara contagens, indicadores e amostras acadêmicas.

A análise acadêmica V8 diferencia explicitamente:

- dados do XML;
- métricas públicas OpenAlex;
- estimativas que precisam de conferência, como produção com discentes;
- evidências de transferência/alcance social, sem chamá-las automaticamente de impacto social.

Métricas como índice h e citações são identificadas pela fonte. Os valores do OpenAlex podem diferir do Google Acadêmico porque as bases indexam conjuntos diferentes de documentos.

## Segurança do XML

O frontend preserva, quando presentes no original:

- declaração XML;
- codificação UTF-8 ou ISO-8859-1;
- DOCTYPE;
- identificador do currículo.

Antes do download, a cópia é serializada e reaberta para detectar erro estrutural. A validação definitiva continua sendo a aceitação pelo mecanismo real de importação da Plataforma Lattes.
