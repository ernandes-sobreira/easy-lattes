# Easy Lattes — backend da análise generativa

O frontend continua no GitHub Pages. A chave da IA deve ficar somente no backend.

## Arquitetura

GitHub Pages → Firebase Cloud Function → OpenAI Responses API

A função `careerAnalysis` usa, por padrão, `gpt-5.6-luna`, envia apenas um resumo estruturado do currículo e limita o uso a 5 análises por dia por identificador técnico anonimizado.

## Segredos necessários

No projeto Firebase escolhido para o Easy Lattes:

```bash
firebase functions:secrets:set OPENAI_API_KEY
firebase functions:secrets:set RATE_LIMIT_SALT
```

`RATE_LIMIT_SALT` pode ser uma sequência aleatória longa.

## Deploy

```bash
cd functions
npm install
cd ..
firebase use SEU_PROJECT_ID
firebase deploy --only functions:careerAnalysis
```

Após o deploy, copie a URL HTTPS da função e configure no frontend:

```js
window.EASY_LATTES_AI_ENDPOINT = "URL_DA_FUNCAO";
```

A configuração pode ser feita no `bridge-v3.js` após o endpoint existir.

## Modelo

Padrão: `gpt-5.6-luna`.

Para testar outro modelo, defina a variável de ambiente `EASY_LATTES_MODEL` no backend como `gpt-5.6-terra` ou outro modelo compatível. Luna é recomendado para alto volume; Terra pode ser usado em um futuro modo premium.

## Segurança para produção

Antes de abrir para grande escala, adicionar Firebase Authentication + App Check e migrar o limite de uso para usuário autenticado. O limite por identificador técnico atual é adequado para o MVP, mas não deve ser a única barreira de abuso de uma versão comercial.
