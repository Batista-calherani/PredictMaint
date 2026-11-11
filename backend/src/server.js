import "./config/env.js";

import app from "./app.js";

const port = Number(process.env.PORT || 8080);

app.listen(port, () => {
  console.log(`API do PredictMaint rodando na porta ${port}`);
});
