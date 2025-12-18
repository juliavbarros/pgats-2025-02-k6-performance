/* eslint-disable no-unused-expressions */
const { expect } = require("chai");
const proxyquire = require("proxyquire").noCallThru();
const path = require("path");

describe("Service - checkoutService (100%)", () => {
  const products = [
    { id: 1, name: "P1", price: 100 },
    { id: 2, name: "P2", price: 50 },
  ];

  function loadService() {
    return proxyquire(path.join(process.cwd(), "src", "services", "checkoutService.js"), {
      "../models/product": products,
    });
  }

  it("boleto → total = soma(itens) + frete (sem desconto)", () => {
    const service = loadService();
    const result = service.checkout(
      "user-1",
      [
        { productId: 1, quantity: 2 }, // 2 * 100 = 200
        { productId: 2, quantity: 1 }, // 1 * 50  = 50
      ],
      10,
      "boleto"
    );

    // total esperado = 200 + 50 + 10 = 260
    expect(result).to.include({
      userId: "user-1",
      paymentMethod: "boleto",
      freight: 10,
    });
    expect(result.items).to.have.length(2);
    expect(result.total).to.equal(260);
  });

  it("cartão → aplica 5% de desconto sobre o subtotal+frete", () => {
    const service = loadService();
    const result = service.checkout(
      "user-1",
      [
        { productId: 1, quantity: 2 }, // 200
        { productId: 2, quantity: 1 }, // 50
      ],
      10,
      "credit_card",
      { number: "4111111111111111", name: "T", expiry: "12/30", cvv: "123" }
    );

    // boleto seria 260; com 5% off -> 247
    expect(result.paymentMethod).to.equal("credit_card");
    expect(result.total).to.be.closeTo(247, 0.0001);
  });

  it("erro → productId inexistente", () => {
    const service = loadService();
    expect(() => service.checkout("u", [{ productId: 999, quantity: 1 }], 0, "boleto")).to.throw(/produto/i);
  });

  it("paymentMethod inválido → deve lançar OU retornar resultado coerente", () => {
    const service = loadService();
    const call = () => service.checkout("u", [{ productId: 1, quantity: 1 }], 0, "pix");

    try {
      const r = call();
      expect(r).to.be.an("object");
      expect(r).to.include.keys(["userId", "items", "freight", "paymentMethod", "total"]);
      expect(r.paymentMethod).to.be.a("string");
    } catch (err) {
      const msg = String(err && err.message ? err.message : err);
      expect(msg).to.match(/método|payment|inválid/i);
    }
  });

  it("erro → cartão sem cardData", () => {
    const service = loadService();
    expect(() => service.checkout("u", [{ productId: 1, quantity: 1 }], 0, "credit_card")).to.throw(/cart(ã|a)o/i);
  });
});
