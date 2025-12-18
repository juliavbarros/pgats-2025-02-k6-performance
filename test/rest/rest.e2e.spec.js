/* eslint-disable no-unused-expressions */
const { expect } = require("chai");
const request = require("supertest");
const { spawn } = require("child_process");
const path = require("path");
const waitOn = require("wait-on");

const BASE = "http://localhost:3000";

describe("REST - External (E2E)", function () {
  this.timeout(20000);

  let proc;
  let restToken;

  before(async () => {
    const root = process.cwd();
    proc = spawn(process.execPath, [path.join(root, "rest", "server.js")], {
      stdio: "inherit",
      env: { ...process.env, PORT: "3000" },
    });

    await waitOn({ resources: ["tcp:3000"], timeout: 10000 });

    const email = `e2e${Date.now()}@mail.com`;
    const password = "123456";

    await request(BASE)
      .post("/api/users/register")
      .send({ name: "E2E", email, password })
      .set("Content-Type", "application/json");

    const login = await request(BASE)
      .post("/api/users/login")
      .send({ email, password })
      .set("Content-Type", "application/json");

    restToken = login.body && login.body.token;
    expect(restToken, "token de login ausente").to.be.a("string");
  });

  after(() => {
    if (proc) proc.kill();
  });

  it("deve registrar um usuário (201/200) e retornar campos básicos", async () => {
    const res = await request(BASE)
      .post("/api/users/register")
      .send({ name: "Novo Usuário", email: `novo${Date.now()}@email.com`, password: "senha123" })
      .set("Content-Type", "application/json");

    expect([200, 201]).to.include(res.status);

    const payload = res.body && typeof res.body === "object" ? res.body.user || res.body : {};

    expect(payload).to.be.an("object");
    expect(payload).to.have.any.keys(["name", "email", "id"]);
  });

  it("deve bloquear checkout sem token (401/403)", async () => {
    const res = await request(BASE)
      .post("/api/checkout")
      .send({ items: [{ productId: 1, quantity: 1 }], freight: 10, paymentMethod: "boleto" })
      .set("Content-Type", "application/json");

    expect([401, 403]).to.include(res.status);
  });

  it("deve permitir checkout com token e retornar payload esperado", async () => {
    const res = await request(BASE)
      .post("/api/checkout")
      .set("Authorization", `Bearer ${restToken}`)
      .send({
        items: [
          { productId: 1, quantity: 2 },
          { productId: 2, quantity: 1 },
        ],
        freight: 10,
        paymentMethod: "boleto",
      })
      .set("Content-Type", "application/json");

    expect(res.status).to.equal(200);
    expect(res.body).to.include.keys(["freight", "items", "paymentMethod", "valorFinal"]);
    expect(res.body.items).to.be.an("array").with.length.greaterThan(0);
    expect(res.body.paymentMethod).to.equal("boleto");
  });

  it("deve aplicar desconto no cartão (valorFinal cartão < valorFinal boleto)", async () => {
    const boleto = await request(BASE)
      .post("/api/checkout")
      .set("Authorization", `Bearer ${restToken}`)
      .send({
        items: [
          { productId: 1, quantity: 2 },
          { productId: 2, quantity: 1 },
        ],
        freight: 10,
        paymentMethod: "boleto",
      })
      .set("Content-Type", "application/json");

    const cc = await request(BASE)
      .post("/api/checkout")
      .set("Authorization", `Bearer ${restToken}`)
      .send({
        items: [
          { productId: 1, quantity: 2 },
          { productId: 2, quantity: 1 },
        ],
        freight: 10,
        paymentMethod: "credit_card",
        cardData: { number: "4111111111111111", name: "Teste", expiry: "12/30", cvv: "123" },
      })
      .set("Content-Type", "application/json");

    expect(boleto.status).to.equal(200);
    expect(cc.status).to.equal(200);
    expect(cc.body.valorFinal).to.be.below(boleto.body.valorFinal);
    expect(cc.body.paymentMethod).to.equal("credit_card");
  });
});
