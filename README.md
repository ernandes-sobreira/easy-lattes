# Easy Lattes — MVP Professor

Protótipo funcional, 100% frontend, para organizar e auditar um Currículo Lattes a partir do XML fornecido pelo próprio pesquisador.

## O que já funciona

- Importação local de XML do Currículo Lattes.
- Identificação de artigos, livros, capítulos, orientações, bancas, eventos, projetos e parte da produção técnica.
- Cálculo de completude por item.
- Auditoria heurística de:
  - artigos sem DOI;
  - campos de ano ausentes;
  - cadastros pouco completos;
  - títulos possivelmente duplicados.
- Caixa acadêmica com upload múltiplo de comprovantes.
- Leitura de texto de PDFs no navegador usando PDF.js (quando o navegador tem acesso à internet para carregar a biblioteca).
- Classificação heurística de comprovantes.
- Tentativa simples de correspondência entre comprovante e item já presente no XML.
- Exportação de relatório CSV.
- Modo de demonstração para testar a interface sem um XML real.

## O que este MVP NÃO faz ainda

- Não acessa a conta do CNPq.
- Não pede senha Gov.br/CNPq.
- Não grava nada diretamente no Lattes.
- Não gera ainda um XML de atualização pronto para importação.
- Não usa OCR em imagens.
- Não usa um modelo de IA externo. A classificação atual usa regras locais para permitir teste imediato da experiência.

## Como testar

A forma mais simples é servir a pasta por um servidor local:

```bash
python -m http.server 8000
```

Depois abra:

`http://localhost:8000`

Você também pode publicar os arquivos `index.html`, `styles.css` e `app.js` diretamente no GitHub Pages.

## Próxima versão recomendada

1. Backend autenticado (Firebase/Supabase).
2. Armazenamento seguro dos comprovantes.
3. OCR para imagens e PDFs escaneados.
4. Modelo de IA para classificação estruturada de comprovantes.
5. Integração com DOI/Crossref/OpenAlex/ORCID.
6. Auditor de edital/barema.
7. Módulo institucional para PPG.

## Observação

Produto independente e não oficial. O pesquisador deve conferir toda sugestão antes de atualizar a Plataforma Lattes oficial.
