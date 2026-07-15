export function errorHandler(error, request, response, next) {
  console.error(error);

  response.status(500).json({
    message: "Erro interno no servidor",
  });
}
