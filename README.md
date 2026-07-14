# Projeto PAP / PoupIn

## Visão Geral
O `PAP` (Projeto PoupIn) é uma aplicação web para comparar preços de produtos em lojas online portuguesas. O sistema reúne dados via scraping e oferece uma interface de usuário com cadastro/login, perfil, histórico de buscas e envio de feedback.

## Objetivo
Permitir que o usuário pesquise produtos em diferentes supermercados online, compare preços e armazene resultados em um banco de dados centralizado para buscas e análises futuras.

## Tecnologias
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- Banco de dados: MongoDB
- Scraping: Puppeteer / puppeteer-core
- Email: Nodemailer
- Autenticação: JWT, cookies e refresh token
- Segurança: Helmet, express-rate-limit, CORS

## Estrutura do Projeto
```
server/
  package.json
  server.js
  scraper.js
  server-modules/
    auth.js
    conndb.js
    email.js
    perfil.js
public/
  index.html
  login.html
  scrapper.html
  assets/
    js/
      loading.js
      toast.js
    css/
      css.css
vercel.json
README.md
```

## Componentes Principais
- `server/server.js`: servidor Express que define rotas, autenticação e chamadas de scraping.
- `server/scraper.js`: funções de scraping para lojas como Pingo Doce, Continente, Auchan, Lidl e Intermarché.
- `server/server-modules/auth.js`: cadastro, login, logout, recuperação de senha e middleware de autenticação.
- `server/server-modules/perfil.js`: endpoints de perfil, histórico e feedback.
- `server/server-modules/conndb.js`: conexão com MongoDB.
- `server/server-modules/email.js`: envio de email via SMTP para códigos de verificação.
- `public/index.html`: frontend principal do comparador.
- `public/login.html`: páginas de login, cadastro e recuperação de senha.
- `public/scrapper.html`: interface de teste para execução manual de scrapers.
- `vercel.json`: configuração de deployment para Vercel.

## Funcionalidades
- Cadastro de usuário com `fullname`, `email` e `password`.
- Login com envio de código de verificação por email.
- Autenticação JWT com rotas protegidas.
- Refresh token opcional para "Lembrar de mim".
- Recuperação de senha via código enviado por email.
- Perfil do usuário e retorno de dados de usuário autenticado.
- Envio de feedback e registro de avaliação.
- Histórico de scrapers do usuário armazenado no MongoDB.
- Scraping de preços em várias lojas online.
- API para teste de ambiente.

## Rotas da API
### Autenticação
- `POST /papapi/cadastraruser` - cadastra um novo usuário.
- `POST /papapi/loginuser` - valida email e senha e envia código de login.
- `POST /papapi/recebercodeLogin` - confirma código e retorna token JWT.
- `POST /papapi/logout` - encerra sessão e revoga token.
- `POST /papapi/refresh-token` - renova o token de acesso.
- `POST /papapi/recuperar-senha` - inicia fluxo de recuperação de senha.
- `POST /papapi/verificarCodigo` - verifica código de recuperação.
- `POST /papapi/redefinir-senha-codigo` - redefine a senha com o código.

### Perfil e histórico
- `POST /papapi/perfil` - retorna dados do perfil do usuário autenticado.
- `POST /papapi/enviarfeedback` - envia avaliação e comentário.
- `POST /papapi/pegarhistorico` - retorna histórico de pesquisas do usuário.

### Verificação e testes
- `GET /papapi/getambiente` - retorna ambiente atual do servidor.
- `GET /papapi/verificar-token` - valida token JWT.
- `GET /papapi/perfil` - retorna perfil do usuário via GET.
- `GET /papapi/teste` - rota de teste pública.
- `POST /papapi/teste` - rota de teste autenticada.

### Scrapers
- `GET /papapi/run-scraper-pingodoce?produto=<termo>`
- `GET /papapi/run-scraper-continente?produto=<termo>`
- `GET /papapi/run-scraper-Auchan?produto=<termo>`
- `GET /papapi/run-scraper-Intermarche?produto=<termo>`
- `GET /papapi/run-scraper-lidl?produto=<termo>`

> Todas as rotas de scraper exigem autenticação e salvam resultados em `users_historico`.

## Configuração do Vercel
O arquivo `vercel.json` define o deployment e as rotas:
- `/` → `public/login.html`
- `/app/(.*)` → `public/index.html`
- `/assets/js/(.*)` → `public/assets/js/$1`
- `/papapi/(.*)` → `server/server.js`

## Banco de Dados
- Banco: `PoupIn`
- Conexão em `server/server-modules/conndb.js`
- Principais coleções:
  - `users`
  - `users_historico`
  - `users_feedback`

### Estrutura de dados de produto (sugestão)
- `id_product` (UUID / PK)
- `nome_produto` (VARCHAR)
- `descricao` (TEXT)
- `preco_atual` (DECIMAL)
- `preco_anterior` (DECIMAL)
- `url_produto` (VARCHAR)
- `url_imagem` (VARCHAR)
- `sku` (VARCHAR)
- `marca` (VARCHAR)
- `modelo` (VARCHAR)
- `loja` (VARCHAR)
- `categoria_principal` (VARCHAR)
- `subcategoria` (VARCHAR)
- `data_coleta` (TIMESTAMP)
- `data_atualizacao` (TIMESTAMP)
- `disponibilidade` (BOOLEAN)
- `avaliacao_media` (DECIMAL)
- `numero_avaliacoes` (INTEGER)
- `especificacoes` (JSONB)
- `tags` (ARRAY)

## Variáveis de Ambiente
Crie um arquivo `.env` com as seguintes variáveis:
- `NODE_ENV`
- `PORT` (ex.: `1919`)
- `MONGODB_URI`
- `HASH_SECRET`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `BROWSERLESS_TOKEN`
- `NODEMAIL_EMAIL_FROM`
- `NODEMAIL_EMAIL_PASS`

## Instalação e execução
1. Navegue até o diretório do servidor: `cd server`
2. Instale dependências: `npm install`
3. Crie o arquivo `.env` com as variáveis necessárias.
4. Inicie o servidor:
   - `npm run dev` para desenvolvimento com nodemon
   - `npm start` para produção

## Uso
1. Abra o browser em `http://localhost:1919` ou no host configurado.
2. Cadastre um novo usuário.
3. Faça login com email e senha.
4. Use o código enviado por email para autenticar.
5. Acesse o comparador em `/app/`.
6. Execute os scrapers passando `produto` como parâmetro.

## Observações
- O scraper depende de `BROWSERLESS_TOKEN` para rodar no Browserless.
- O login usa verificação por código e tokens JWT para segurança.
- O projeto já tem proteção com `helmet`, CORS e `express-rate-limit`.
- O histórico de buscas é salvo em `users_historico`.
- O envio de email usa Gmail SMTP via Nodemailer.

## Contato
Projeto desenvolvido por `Isaac Pereira` / `PAP IsaacPereira`.
