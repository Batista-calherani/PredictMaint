import "./config/env.js";

import app from "./app.js";
import { rodarMigracoes } from "./config/migracoes.js";
import { pool } from "./config/database.js";
import { mimicMedicoes } from "./lib/mimicMedicoes.js";
if (process.env.SIMULAR === "1") mimicMedicoes(pool);

const port = Number(process.env.PORT || 8080);

// Aplica as mudanças de banco pendentes antes de aceitar requisições.
// Se o banco ainda não estiver pronto, a API sobe mesmo assim e o /api/health mostra o problema.
await rodarMigracoes();

app.listen(port, () => {
  console.log(`API do PredictMaint rodando na porta ${port}`);
});
