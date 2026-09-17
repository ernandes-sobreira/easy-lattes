# Easy Lattes — ativação única da IA

O Easy Lattes funciona em duas camadas:

1. **Local, sem API:** XML, auditoria, revisão assistida, Caixa Acadêmica, OCR/PDF quando suportado, Crossref/OpenAlex e análise descritiva.
2. **Backend protegido:** análise generativa, análise profunda e busca ampla em fontes públicas.

A chave da OpenAI **nunca deve ficar no GitHub Pages**.

## Arquitetura atual

GitHub Pages → Firebase HTTPS Functions → OpenAI Responses API

O backend é carregado por `functions/bootstrap.js` e publica quatro funções:

- `health`: informa ao próprio Easy Lattes se o backend está online;
- `careerAnalysis`: análise generativa econômica a partir de um resumo estruturado do currículo;
- `careerAnalysisDeep`: modo consultoria, com identidade profissional, evidências, forças, oportunidades, plano de 90 dias e revisão de pistas públicas ainda não confirmadas;
- `webDiscovery`: usa pesquisa web para encontrar possíveis atividades acadêmicas públicas esquecidas, sempre com revisão humana antes de qualquer inclusão.

O backend também tenta usar Firestore para cache e limites de uso. Se o Firestore ainda não estiver disponível, as funções continuam funcionando, mas sem esses controles adicionais.

## O único segredo obrigatório

```bash
firebase functions:secrets:set OPENAI_API_KEY
```

Use uma chave de um projeto da OpenAI destinado ao Easy Lattes. **Não cole essa chave no HTML, JavaScript público ou na tela do Easy Lattes.**

## Primeira implantação

No computador com Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
firebase use SEU_PROJECT_ID
cd functions
npm install
cd ..
firebase deploy --only functions:health,functions:careerAnalysis,functions:careerAnalysisDeep,functions:webDiscovery
```

O `firebase.json` do repositório já aponta para `functions/` e Node.js 20.

## Depois do deploy: nada de editar código

Abra o Easy Lattes e entre na aba **Sistema**.

Cole somente o **ID do projeto Firebase**, por exemplo:

```text
meu-easy-lattes-123
```

A própria plataforma monta os endereços principais. A análise profunda usa o mesmo projeto e o endpoint `careerAnalysisDeep` automaticamente.

Clique **Salvar e testar**. Quando a tela mostrar o backend como online, a ativação acabou. O ID fica salvo no navegador.

## Controle de custo

- análise local: sem chamada de IA;
- análise generativa: GPT-5.6 Luna por padrão;
- análise profunda: GPT-5.6 Luna por padrão, com raciocínio maior e limite de 3 novas análises por cliente/dia quando Firestore está disponível;
- busca ampla: GPT-5.6 Luna + ferramenta de busca web;
- resultados idênticos podem ser reutilizados do cache;
- análise de carreira padrão: limite de 5 novas chamadas por cliente/dia;
- descoberta ampla: limite de 3 novas varreduras por cliente/dia;
- o backend retorna tokens e custo estimado de cada operação para futura telemetria administrativa;
- modelos mais caros podem ser reservados depois para um plano premium por variável de ambiente.

## Privacidade

A análise de carreira não precisa enviar o XML bruto. O navegador prepara contagens, áreas, palavras-chave, recorte temporal e amostras de títulos.

A análise profunda pode receber também até 12 **pistas públicas** já encontradas pelo módulo Descobertas. Elas são marcadas para a IA como não confirmadas e não podem ser tratadas como fatos do currículo.

A busca pública foi instruída a procurar apenas informação acadêmica/profissional publicamente acessível, como palestras, eventos, cursos, bancas, docência pública, prêmios e projetos. Ela não deve procurar dados pessoais ou sensíveis.

Toda descoberta é apenas uma **pista**. O pesquisador precisa abrir a fonte, conferir e confirmar antes de qualquer registro entrar na cópia do XML.

## Segurança do XML

A versão atual do frontend preserva, quando presentes no arquivo original:

- declaração XML;
- codificação UTF-8 ou ISO-8859-1;
- DOCTYPE original;
- identificador do currículo.

Antes do download, o Easy Lattes serializa e reabre a cópia para verificar erros estruturais. Isso é uma validação técnica local; a compatibilidade final precisa ser confirmada no mecanismo real de importação disponibilizado pela Plataforma Lattes.
