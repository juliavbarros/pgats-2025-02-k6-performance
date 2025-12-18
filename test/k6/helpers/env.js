export const ENV = {
  BASE_URL: __ENV.BASE_URL || "http://localhost:3000",
  MAX_VUS: parseInt(__ENV.MAX_VUS || "10", 10), // Quantidade máxima de usuários virtuais
  RAMP_UP: __ENV.RAMP_UP || "10s", // Tempo de subida da carga
  STEADY: __ENV.STEADY || "20s", // Tempo mantendo carga máxima
  RAMP_DOWN: __ENV.RAMP_DOWN || "10s", // Tempo de descida da carga
};
