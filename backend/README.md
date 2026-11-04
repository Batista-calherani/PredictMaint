# Backend · PredictMaint

API em Node.js + Express, ligada ao MySQL (`predictmaint`). Todas as respostas e erros
usam o formato que o front espera — erros sempre vêm como `{ "mensagem": "..." }`.

## Rodar

```bash
cd backend
npm install
cp .env.example .env   # ajuste DB_USER, DB_PASSWORD e JWT_SECRET
npm run dev            # http://localhost:8080
```

Teste rápido: abra `http://localhost:8080/api/health` — deve mostrar `"database": "connected"`.

## Login

`POST /api/auth/login` com `{ "usuario": "admin@mantech.com.br", "senha": "Mantech@2026", "perfil": "gestor" }`
devolve um `token`. As outras rotas exigem o cabeçalho `Authorization: Bearer <token>`.
Os logins de teste estão em [`../database/README.md`](../database/README.md).

## Rotas

| Método | Rota | Quem pode | O que faz |
| --- | --- | --- | --- |
| GET | `/api/health` | livre | Testa API e banco |
| POST | `/api/auth/login` | livre | Login (devolve token) |
| POST | `/api/auth/recuperar` | livre | Pedido de nova senha |
| GET | `/api/dashboard` | gestão | Indicadores, alertas, saúde e OS |
| GET | `/api/busca?q=` | gestão | Busca máquinas, OS e alertas |
| GET | `/api/planta` · `/api/planta/resumo` | gestão | Mapa da planta (`?horas=-6` = replay) |
| GET | `/api/planta/:codigo/preditivo` | gestão | Vida útil estimada e causas |
| GET | `/api/maquinas` | logado | Lista (`?setor=&status=&ordem=saude\|codigo\|setor`) |
| GET | `/api/maquinas/:codigo` | logado | Detalhe com medições e OS abertas |
| POST | `/api/maquinas` | gestão | Cadastra (`id`, `nome`, `setor`, `prox`, `custoParada`) |
| PUT | `/api/maquinas/:codigo` | gestão | Atualiza campos enviados |
| DELETE | `/api/maquinas/:codigo` | gestor | Desativa (mantém histórico) |
| GET | `/api/medicoes` · `/api/medicoes/serie` | gestão | Últimas leituras / série do gráfico |
| POST | `/api/medicoes` | gestão | Registra leitura; acima do limite abre alerta |
| GET | `/api/alertas` | logado | Alertas não resolvidos (`?setor=`) |
| PATCH | `/api/alertas/:id/reconhecer` | gestão | Marca como reconhecido |
| GET · PUT | `/api/limites` | gestão · gestor | Limites de vibração, temperatura e corrente |
| GET | `/api/ordens` | gestão | Quadro de OS (`?equipe=&prioridade=&periodo=30`) |
| POST | `/api/ordens` | gestão | Cria OS |
| PATCH | `/api/ordens/:codigo` | gestão | Muda status, prioridade, equipe, prazo… |
| GET | `/api/orcamento/base/:codigo` · `/api/orcamento/resumo` | gestão | Parâmetros e comparativo |
| GET · POST | `/api/orcamento` | gestão | Orçamentos salvos |
| GET | `/api/chamados` | logado | Funcionário vê os seus; gestão vê todos |
| POST | `/api/chamados` | logado | Abre chamado (JSON ou com foto) e já cria a OS |
| POST | `/api/chamados/:codigo/comentarios` | logado | Comenta |
| GET · POST · PUT · DELETE | `/api/users` | gestor | Cadastro de usuários |

"gestão" = perfis gestor e técnico.

## Como as coisas se conectam

- **Chamado → OS:** ao abrir um chamado, a API cria uma OS ligada a ele (prioridade pela urgência).
  Quando a OS muda de status no quadro, a linha do tempo do chamado avança sozinha.
- **Medição → alerta:** leitura acima do limite crítico abre um alerta (sem duplicar se já houver um aberto).
- **Alerta → OS:** "Gerar OS" num alerta já o marca como reconhecido.

## Pastas

- `src/routes/index.js` — todas as rotas e permissões num lugar só
- `src/controllers/` — uma tela/assunto por arquivo
- `src/middlewares/` — login (`auth.js`), erros e upload de fotos
- `src/lib/` — formatação de datas e regras de negócio
- `uploads/` — fotos dos chamados (criada sozinha, fora do Git)
