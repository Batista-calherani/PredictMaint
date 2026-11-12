# Homologação no Coolify · PredictMaint

Guia para subir o sistema completo (banco + API + site) no servidor Coolify
usando o `docker-compose.yml` da raiz do repositório.

## 1. Criar o recurso

1. No Coolify: **Projects › (projeto da turma) › + New › Docker Compose** a partir do repositório Git.
2. Repositório: `Luiz-sourceDev/PredictMaint-Luiz` (ou o oficial, depois do merge) · branch `feat/banco-completo`.
3. Arquivo: `docker-compose.yml` (o `docker-compose.override.yml` é só para os PCs da equipe e o Coolify o ignora).

## 2. Domínios

Em cada serviço do compose, defina o domínio público:

| Serviço | Porta interna | Domínio (exemplo do servidor do SENAI) |
| --- | --- | --- |
| `frontend` | 3000 | `http://predictmaint.10.189.87.231.sslip.io:3000` |
| `backend` | 8080 | opcional: `http://back.predictmaint.10.189.87.231.sslip.io:8080` (só para abrir o `/api/health` direto) |
| `database` | 3306 | **sem domínio** (fica só na rede interna) |

O `:3000` e o `:8080` no fim dizem ao Coolify a porta interna do serviço; não aparecem no endereço final.

**Como o site fala com a API:** o navegador chama só o endereço do site (`/api/...` e `/uploads/...`)
e o próprio site repassa para o serviço `backend` pela rede interna do Docker. Por isso funciona em
`http` ou `https`, sem erro de "mixed content" e sem CORS.

## 3. Variáveis de ambiente

| Variável | Valor na homologação | Observação |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `/api` | **Entra no build do site.** Deixe `/api` (ou apague a variável: `/api` é o padrão). Se mudar, faça *Redeploy* com rebuild. |
| `API_INTERNA` | (não precisa) | Padrão `http://backend:8080`: endereço da API dentro da rede do Docker. |
| `FRONTEND_URL` | `http://predictmaint.10.189.87.231.sslip.io` | Só importa se alguém chamar a API por outro domínio. Mais de um: separe por vírgula. |
| `JWT_SECRET` | texto longo e aleatório | Assina os logins. Trocar derruba as sessões abertas. |
| `TZ` | `America/Sao_Paulo` | Horário do banco e da API. |
| `MYSQL_ROOT_PASSWORD` · `MYSQL_PASSWORD` · `DB_PASSWORD` | `senai@123` | Padrão da equipe. `MYSQL_PASSWORD` e `DB_PASSWORD` precisam ser iguais. |
| `MYSQL_DATABASE` · `DB_NAME` | `predictmaint` | |
| `MYSQL_USER` · `DB_USER` | `app_user` | |
| `DB_HOST` | `database` | Nome do serviço no compose. |

Não use `localhost` em nenhuma URL: no servidor, `localhost` é o próprio container.

## 4. Primeiro deploy

1. Clique em **Deploy** e acompanhe os logs.
2. Na primeira subida, o MySQL roda `database/init/01-schema.sql` e `02-seed.sql`
   (16 tabelas, 5 views e os dados de demonstração).
3. A API espera o banco ficar saudável, aplica as migrações (`backend/src/config/migracoes.js`)
   e mostra `API do PredictMaint rodando na porta 8080`.
4. Confira: `http://predictmaint.10.189.87.231.sslip.io/api/health` (pelo endereço do site) deve responder `"database":"connected"`.
5. Abra o site e entre com os logins de teste (senha `senai@123`):
   `admin@mantech.com.br` (gestor) · `tecnico@mantech.com.br` (técnico) · `funcionario@mantech.com.br` (funcionário).

## 5. Atualizações seguintes

- **Redeploy** mantém os volumes: os dados do banco (`mysql-data`) e as fotos dos chamados (`uploads`) não se perdem.
- Os scripts de `database/init` **não** rodam de novo num volume que já tem dados.
  Por isso, mudanças de estrutura novas vão também em `migracoes.js` (com `IF NOT EXISTS`),
  e a API as aplica sozinha ao reiniciar.
- Para zerar a homologação e voltar ao seed: apague o volume `mysql-data` do recurso no Coolify e faça Deploy.

## 6. Problemas comuns

| Sintoma | Causa provável | Como resolver |
| --- | --- | --- |
| "Não consegui falar com a API em http://back…" | Build antigo, com o endereço completo da API (site em `https` chamando API em `http`) | Mude `NEXT_PUBLIC_API_URL` para `/api` e faça Redeploy **com rebuild**. |
| `/api/health` pelo endereço do site dá 502/erro | O serviço `backend` não subiu ou mudou de nome/porta | Veja os logs do `backend` no Coolify; se mudou a porta, ajuste `API_INTERNA`. |
| `/api/health` sem banco | Senha do `DB_PASSWORD` diferente de `MYSQL_PASSWORD` | Deixe as duas iguais. Se o volume já foi criado com outra senha, apague o volume e faça Deploy. |
| Login cai sozinho | `JWT_SECRET` foi trocado | Normal: entre de novo. |
| Usuário não consegue entrar | Foi desativado na tela Usuários | O gestor reativa em Usuários › Situação: Desativados › Reativar. |
