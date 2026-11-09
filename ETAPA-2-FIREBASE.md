# Etapa 2 — Google + Firestore
A integração frontend está preparada, mas **não ativada** até que as credenciais públicas do aplicativo Web sejam preenchidas e o Firebase seja configurado.

1. No projeto Firebase `easy-lattes`, registre um aplicativo Web e copie `apiKey` e `appId` para `firebase-settings.js` (incluindo os valores corretos de `authDomain` e `projectId`).
2. Authentication > Sign-in method > habilite Google e defina email de suporte.
3. Authentication > Settings > Authorized domains > adicione `ernandes-sobreira.github.io`.
4. Firestore Database > crie o banco; em Rules publique o conteúdo de `firestore.rules`.
5. Abra o GitHub Pages e teste com uma conta Google em dois navegadores/dispositivos, incluindo criação, exclusão e entrada novamente.
6. Os registros locais existentes são enviados à conta no primeiro login quando ainda não existem remotamente. Exporte um backup JSON antes de conectar.

Escopo: somente metadados aprovados de atividades. **PDFs, XML e imagens não são enviados ao Firestore**. Evidências ainda ficam locais; upload seguro de arquivos será módulo separado. A plataforma não acessa a senha do Lattes e não atualiza o CNPq. Regras devem ser auditadas e o banco testado antes do uso público.
