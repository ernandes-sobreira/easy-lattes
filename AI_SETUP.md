# Easy Lattes — ativar a análise generativa

O frontend já foi preparado para chamar um backend protegido. **Não coloque a chave da OpenAI no GitHub Pages.**

## Arquitetura

GitHub Pages → Firebase HTTPS Function → OpenAI Responses API

A função está em `functions/index.js`. Ela:

- aceita apenas origens autorizadas;
- limita o payload;
- resume os dados antes de enviar ao modelo;
- aplica limite diário por cliente;
- usa `store: false`;
- retorna JSON estruturado para a interface;
- retorna também tokens usados e custo estimado da chamada.

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
```

Em `OPENAI_API_KEY`, informe a chave do projeto da OpenAI. Em `RATE_LIMIT_SALT`, use uma sequência aleatória longa.

## 4. Modelo

O padrão do backend é `gpt-5.6-luna`, pensado para alto volume e baixo custo. Para uma análise premium, altere a variável de ambiente `EASY_LATTES_MODEL` para `gpt-5.6-terra` ou `gpt-5.6-sol`.

## 5. Deploy

```bash
firebase deploy --only functions:careerAnalysis
```

Copie a URL HTTPS exibida ao final.

## 6. Ligar o frontend

Antes de carregar `career-v3.js`, defina:

```html
<script>
  window.EASY_LATTES_AI_ENDPOINT = 'https://SUA-REGIAO-SEU-PROJETO.cloudfunctions.net/careerAnalysis';
</script>
```

Depois disso, o botão **Gerar análise aprofundada** passa a chamar a IA real.

## Estratégia de custo recomendada

- análise local: sempre gratuita;
- análise generativa básica: GPT-5.6 Luna;
- análise premium sob demanda: GPT-5.6 Terra;
- GPT-5.6 Sol: reservar para casos especiais;
- não enviar o XML bruto: mandar um resumo estruturado com amostras relevantes;
- limitar chamadas por usuário e armazenar a última análise até o currículo mudar.

## Privacidade

Enviar somente os campos acadêmicos necessários. Evitar CPF, endereço, telefone, e-mail, documentos pessoais ou outros campos não necessários à análise de carreira.
