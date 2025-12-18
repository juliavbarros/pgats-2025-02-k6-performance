import { postJson } from "./http.js";
import { checkHasToken, checkOk } from "./checks.js";
import { TRENDS } from "./trends.js";
import Faker from "https://cdnjs.cloudflare.com/ajax/libs/Faker/3.1.0/faker.min.js";

export function registerAndLogin(baseUrl) {
  const email = `${Faker.internet.email().toLowerCase()}.${Date.now()}@mail.com`;
  const password = "123456";
  const name = Faker.name.firstName();

  // register (se der 400 por duplicidade, gera outro email e segue)
  const r1 = postJson(`${baseUrl}/api/users/register`, { name, email, password });
  checkOk(r1, "register");

  // login
  const t0 = Date.now();
  const r2 = postJson(`${baseUrl}/api/users/login`, { email, password });
  TRENDS.auth_ms.add(Date.now() - t0);

  checkOk(r2, "login");
  checkHasToken(r2);

  const token = r2.json("token"); // reuso da resposta (token)
  return { token, email };
}
