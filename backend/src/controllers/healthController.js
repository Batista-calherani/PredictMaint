import { checkDatabaseConnection } from "../config/database.js";

export async function healthCheck(request, response, next) {
  try {
    const databaseConnected = await checkDatabaseConnection();

    response.json({
      status: "ok",
      database: databaseConnected ? "connected" : "disconnected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}
