# Easy Lattes — ativar IA e Descobertas Públicas

O frontend já foi preparado para chamar backends protegidos. **Não coloque chaves da OpenAI ou do buscador dentro do GitHub Pages.**

## Arquitetura

GitHub Pages → Firebase HTTPS Functions → OpenAI Responses API / Brave Search API

As funções estão em `functions/index.js`.

### `careerAnalysis`

- aceita apenas origens autorizadas;
- limita o payload;
- envia um resumo estruturado, não o XML bruto;
- aplica limite diário por cliente;
- usa `store: false`;
- retorna JSON estruturado para a interface;
- retorna tokens usados e custo estimado da chamada.

### `webDiscovery`

- recebe nome e instituição informados pelo pesquisador;
- pesquisa apenas conteúdo que já esteja publicamente indexado na web;
- usa duas consultas controladas por varredura;
- procura páginas relacionadas a palestras, cursos, eventos, bancas, disciplinas/docência e atividades institucionais;
- não adiciona nada ao XML automaticamente;
- cada descoberta deve ser revisada pelo pesquisador;
- retorna o custo estimado da busca ampla.

A interface também consulta OpenAlex e Crossref diretamente para localizar produção científica possivelmente ausente. Essa etapa não usa IA generativa.

## 1. Preparar Firebase

No computador com Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
firebase init functions
```

Use o projeto Firebase escolhido para o Easy Lattes e preserve a pasta `functions/` deste repositório.

## 2. Instalar dependências

```bash
cd functions
npm install
```

## 3. Criar os segredos

```bash
firebase functions:secrets:set OPENAI_API_KEY
firebase functions:secrets:set RATE_LIMIT_SALT
firebase functions:secrets:set BRAVE_SEARCH_API_KEY
```

- `OPENAI_API_KEY`: chave do projeto da OpenAI.
- `RATE_LIMIT_SALT`: sequência aleatória longa.
- `BRAVE_SEARCH_API_KEY`: chave da Brave Search API para a busca ampla na web.

## 4. Modelo da análise de carreira

O padrão do backend é `gpt-5.6-luna`, pensado para alto volume e baixo custo. Para uma análise premium, altere a variável de ambiente `EASY_LATTES_MODEL` para `gpt-5.6-terra` ou `gpt-5.6-sol`.

## 5. Deploy

```bash
firebase deploy --only functions:careerAnalysis,functions:webDiscovery
```

Copie as duas URLs HTTPS exibidas ao final.

## 6. Ligar o frontend

Defina os endpoints antes dos scripts do aplicativo ou em um arquivo de configuração carregado pela página:

```html
<script>
  window.EASY_LATTES_AI_ENDPOINT = 'https://SUA-REGIAO-SEU-PROJETO.cloudfunctions.net/careerAnalysis';
  window.EASY_LATTES_WEB_DISCOVERY_ENDPOINT = 'https://SUA-REGIAO-SEU-PROJETO.cloudfunctions.net/webDiscovery';
</script>
```

Depois disso:

- **Analisar com IA** passa a chamar a análise generativa real;
- **Vasculhar fontes públicas** combina OpenAlex + Crossref + busca ampla na web.

## Estratégia de custo recomendada

- leitura do XML: local e gratuita;
- auditoria e comparação: local e gratuita;
- OpenAlex + Crossref: usar como primeira camada e cachear resultados;
- análise generativa básica: GPT-5.6 Luna;
- análise premium sob demanda: GPT-5.6 Terra;
- busca ampla na web: somente após ação explícita do usuário e com limite diário;
- não refazer pesquisa se o nome, instituição e XML não mudaram;
- armazenar a última análise e a última varredura para reaproveitamento;
- limitar chamadas por usuário e por instituição.

A função `webDiscovery` faz **2 consultas** ao buscador por varredura. Com preço de referência de US$ 5 por 1.000 consultas, isso corresponde a aproximadamente **US$ 0,01 por varredura ampla**, antes de eventuais impostos/câmbio. OpenAlex e Crossref ficam fora desse custo de busca.

## Privacidade e responsabilidade

- a busca pública deve ser opt-in;
- pesquisar apenas informações já publicamente acessíveis;
- não acessar áreas logadas, páginas privadas ou dados pessoais desnecessários;
- mostrar a fonte e o link para cada descoberta;
- homônimos são possíveis: nome, instituição e ORCID devem ser usados para reduzir falsos positivos;
- resultado de busca não é prova de autoria;
- nada encontrado na web deve entrar no XML sem confirmação do pesquisador;
- para a análise de carreira, enviar somente campos acadêmicos necessários e evitar CPF, endereço, telefone, e-mail e documentos pessoais.
