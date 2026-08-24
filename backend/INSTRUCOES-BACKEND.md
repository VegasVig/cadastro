# Backend — Google Apps Script (passo a passo)

O sistema já funciona em **modo demonstração** (salva no navegador) para você testar. Para colocar de verdade em produção — salvando no Google Sheets, com login real — siga os passos abaixo. Leva ~10 minutos e é **gratuito**.

---

## 1. Crie a planilha
1. Acesse https://sheets.google.com e crie uma planilha nova.
2. Dê o nome que quiser (ex.: **Cadastros Vegas**).
3. Copie o **ID da planilha** — está na URL, entre `/d/` e `/edit`:
   `https://docs.google.com/spreadsheets/d/`**`ESTE_TRECHO_É_O_ID`**`/edit`

## 2. Abra o Apps Script
1. Na planilha, vá em **Extensões → Apps Script**.
2. Apague qualquer código que estiver lá.
3. Cole **todo** o conteúdo do arquivo `Code.gs` (desta pasta).
4. Salve (ícone de disquete).

## 3. Configure usuário, senha e planilha
1. No arquivo `Code.gs`, localize a função `configurarInicial()` no final.
2. Troque `'admin'` e `'MudeEstaSenha!2025'` pelo usuário e senha que você quer usar no painel.
3. Como o script foi criado **de dentro da planilha**, ele já fica vinculado — pode deixar `SHEET_ID` comentado. (Se preferir usar `SHEET_ID`, descomente a linha e cole o ID do passo 1.)
4. No topo do editor, selecione a função **`configurarInicial`** e clique em **Executar** (▶).
5. Autorize o acesso quando o Google pedir (é seu próprio script).
6. Confira no log a mensagem "Configuração concluída".

> A senha fica guardada nas **Script Properties** do Google — nunca aparece no site nem no navegador do candidato.

## 4. Publique como Web App
1. Clique em **Implantar → Nova implantação**.
2. Em "Tipo", escolha **App da Web**.
3. Configure:
   - **Executar como:** Eu (sua conta)
   - **Quem pode acessar:** **Qualquer pessoa**
4. Clique em **Implantar** e autorize.
5. Copie a **URL do app da Web** (termina em `/exec`).

## 5. Ligue o site ao backend
1. Abra o arquivo `frontend/config.js`.
2. Cole a URL na linha `API_URL`:
   ```js
   API_URL: "https://script.google.com/macros/s/SEU_ID/exec",
   ```
3. Salve. Pronto — o modo demonstração desliga sozinho e tudo passa a salvar no Google Sheets.

## 6. Teste
- Faça um cadastro de teste no site → confira se a linha apareceu na planilha.
- Acesse **Painel Administrativo** → entre com o usuário/senha que você definiu.

---

## Atualizações futuras
Sempre que editar o `Code.gs`, gere uma **nova versão** em **Implantar → Gerenciar implantações → Editar (lápis) → Versão: Nova versão → Implantar**. A URL `/exec` continua a mesma.

## Trocar a senha do painel
Edite os valores em `configurarInicial()` e rode a função de novo.

## Segurança — resumo
- As credenciais do painel ficam no servidor do Google, não no site.
- O painel só devolve a lista de cadastros mediante um **token** válido, obtido no login.
- O candidato não tem como acessar a lista nem as credenciais pelo navegador.
- A comunicação com a planilha passa **sempre** pelo Apps Script (backend).

## Observação sobre a foto
A foto do candidato é enviada como imagem compactada (base64) e guardada na coluna `foto`. Para muitos cadastros com foto, a planilha pode crescer bastante — se preferir, é possível evoluir para salvar as fotos no Google Drive e guardar apenas o link. Posso te ajudar com essa evolução quando quiser.
