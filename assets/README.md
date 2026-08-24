# Sistema de Cadastro de Candidatos — Vegas Vigilância

Sistema web completo para candidatos preencherem a ficha de cadastro pelo celular ou computador, com geração automática de PDF e um painel administrativo para o RH acompanhar os cadastros.

## O que o sistema faz
- **Cadastro público** (`frontend/index.html`): ficha em 6 etapas com todos os campos da ficha original, cálculo automático de idade, busca de endereço por CEP, máscaras de CPF/telefone/data, foto do candidato e validações.
- **PDF profissional**: ao finalizar, o candidato recebe um número de protocolo e baixa a ficha em PDF (gerado no próprio navegador).
- **Painel administrativo** (`frontend/admin.html`): login protegido, painel com totais, busca, filtros por status e data, visualização completa de cada cadastro, alteração de status, preenchimento dos campos do departamento pessoal, download do PDF e exclusão.

## Estrutura das pastas
```
vegas/
├── assets/       → logotipos (branca, escura e miniatura)
├── frontend/     → o site (HTML, CSS e JavaScript)
│   ├── index.html   (cadastro público)
│   ├── admin.html   (login do painel)
│   ├── painel.html  (painel do RH)
│   ├── config.js    ← ÚNICO arquivo a editar em produção
│   └── ...          (styles.css, utils.js, app.js, pdf.js, painel.js)
└── backend/      → Google Apps Script + instruções
    ├── Code.gs
    └── INSTRUCOES-BACKEND.md
```

## Como testar agora (modo demonstração)
Não precisa instalar nada. Abra `frontend/index.html` num navegador (de preferência servindo a pasta, veja abaixo) e faça um cadastro. Nesse modo os dados ficam salvos **no próprio navegador**, só para você experimentar.

- Painel de teste: abra `frontend/admin.html` e entre com **usuário `admin`** e **senha `vegas123`**.

> Dica: alguns navegadores bloqueiam recursos quando o arquivo é aberto direto do disco. Para testar sem surpresas, sirva a pasta localmente. Exemplo com Python:
> ```
> cd vegas
> python3 -m http.server 8000
> ```
> Depois acesse `http://localhost:8000/frontend/index.html`.

## Como colocar em produção (dados reais no Google Sheets)
Siga o passo a passo em **`backend/INSTRUCOES-BACKEND.md`**. Em resumo:
1. Crie uma planilha no Google e abra o Apps Script.
2. Cole o `Code.gs`, defina usuário/senha e publique como Web App.
3. Cole a URL gerada no arquivo `frontend/config.js` (linha `API_URL`).
4. Publique a pasta `frontend` num serviço de hospedagem (veja abaixo).

Quando a `API_URL` estiver preenchida, o modo demonstração desliga sozinho e tudo passa a salvar no Google Sheets, com login real.

## Onde hospedar o site
A pasta `frontend` é composta de arquivos estáticos — pode ser publicada gratuitamente em serviços como **Netlify**, **Vercel**, **GitHub Pages** ou **Cloudflare Pages**. Basta enviar a pasta e compartilhar o link do `index.html` com os candidatos.

## Identidade visual
As cores e a marca seguem o logotipo da Vegas: azul-marinho corporativo com detalhe em dourado. Para trocar textos, cores ou o logotipo, os arquivos são `frontend/styles.css` (cores/estilos) e `frontend/config.js` (nome, status, empresas do grupo).

## Segurança e privacidade
- As credenciais do painel ficam no servidor do Google (Apps Script), nunca no site.
- O painel exige login e só devolve os dados com um token válido.
- Há uma declaração de consentimento obrigatória antes do envio do cadastro.

## Suporte a evoluções
Alguns aprimoramentos possíveis quando quiser: guardar as fotos no Google Drive (em vez da planilha), enviar e-mail automático de confirmação ao candidato, exportar a lista em Excel, e adicionar mais usuários no painel. É só pedir.
