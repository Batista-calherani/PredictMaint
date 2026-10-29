import cors from "cors";
import express from "express";
import helmet from "helmet";

import { errorHandler } from "./middlewares/errorHandler.js";
import healthRoutes from "./routes/healthRoutes.js";
import maquinasRoutes from "./routes/maquinasRoutes.js";
import usersRoutes from "./routes/userRoutes.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
  }),
);
app.use(express.json());

app.get("/", (request, response) => {
  response.json({
    message: "API do projeto base",
  });
});

app.use("/api/users", usersRoutes);

app.use("/api/maquinas", maquinasRoutes);

app.use("/api/health", healthRoutes);

app.use(errorHandler);

export default app;
