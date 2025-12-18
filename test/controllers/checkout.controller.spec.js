/* eslint-disable no-unused-expressions */
const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire").noCallThru();
const express = require("express");
const request = require("supertest");
const path = require("path");

function buildAppWith(ctrl) {
  const app = express();
  app.use(express.json());
  const handler = ctrl.checkout || ctrl;
  app.post("/api/checkout", handler);
  return app;
}

const controllerPath = path.join(process.cwd(), "rest", "controllers", "checkoutController.js");

describe("Controller - /api/checkout (100% coverage)", () => {
  afterEach(() => sinon.restore());

  it("401 quando token inválido (verifyToken retorna falsy)", async () => {
    const userServiceStub = { verifyToken: sinon.stub().returns(null) };
    const checkoutServiceStub = { checkout: sinon.stub() };

    const controller = proxyquire(controllerPath, {
      "../../src/services/userService": userServiceStub,
      "../../src/services/checkoutService": checkoutServiceStub,
    });

    const app = buildAppWith(controller);

    const res = await request(app)
      .post("/api/checkout")
      .set("Authorization", "Bearer invalid.token")
      .send({ items: [{ productId: 1, quantity: 1 }], freight: 10, paymentMethod: "boleto" });

    expect(res.status).to.equal(401);
    expect(res.body).to.have.property("error");
    expect(checkoutServiceStub.checkout.called).to.be.false;
  });

  it("200 no sucesso (mapeia result.total -> valorFinal e espalha result)", async () => {
    const userServiceStub = { verifyToken: sinon.stub().returns({ id: "user-1" }) };
    const result = {
      total: 123.45,
      items: [{ productId: 1, quantity: 2 }],
      freight: 10,
      paymentMethod: "boleto",
    };
    const checkoutServiceStub = { checkout: sinon.stub().returns(result) };

    const controller = proxyquire(controllerPath, {
      "../../src/services/userService": userServiceStub,
      "../../src/services/checkoutService": checkoutServiceStub,
    });

    const app = buildAppWith(controller);

    const res = await request(app)
      .post("/api/checkout")
      .set("Authorization", "Bearer valid.token")
      .send({ items: result.items, freight: result.freight, paymentMethod: result.paymentMethod });

    expect(res.status).to.equal(200);
    expect(res.body).to.include({ valorFinal: result.total, paymentMethod: "boleto", freight: 10 });
    expect(res.body.items).to.be.an("array").with.length(1);
    expect(checkoutServiceStub.checkout.calledOnceWith("user-1")).to.be.true;
  });

  it("400 quando o service lança erro (cobre o catch)", async () => {
    const userServiceStub = { verifyToken: sinon.stub().returns({ id: "user-1" }) };
    const checkoutServiceStub = { checkout: sinon.stub().throws(new Error("boom")) };

    const controller = proxyquire(controllerPath, {
      "../../src/services/userService": userServiceStub,
      "../../src/services/checkoutService": checkoutServiceStub,
    });

    const app = buildAppWith(controller);

    const res = await request(app)
      .post("/api/checkout")
      .set("Authorization", "Bearer valid.token")
      .send({ items: [{ productId: 1, quantity: 1 }], freight: 10, paymentMethod: "boleto" });

    expect(res.status).to.equal(400);
    expect(res.body).to.have.property("error").that.matches(/boom/i);
  });
});
