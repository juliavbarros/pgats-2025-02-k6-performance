/* eslint-disable no-unused-expressions */
const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire").noCallThru();
const path = require("path");

describe("Service - userService (100%)", () => {
  afterEach(() => sinon.restore());

  function makeUsersArray(seed = []) {
    const arr = [...seed];
    arr.push = Array.prototype.push.bind(arr);
    return arr;
  }

  it("registerUser → cria usuário e evita duplicidade por email", () => {
    const users = makeUsersArray([{ id: 1, name: "A", email: "a@mail.com", password: "x" }]);
    const jwt = { sign: sinon.stub(), verify: sinon.stub() };

    const userService = proxyquire(path.join(process.cwd(), "src", "services", "userService.js"), {
      "../models/user": users,
      jsonwebtoken: jwt,
    });

    const u1 = userService.registerUser("B", "b@mail.com", "123");
    expect(u1).to.include({ name: "B", email: "b@mail.com" });
    expect(users).to.have.length(2);

    const u2 = userService.registerUser("C", "a@mail.com", "zzz");
    expect(u2).to.equal(null);
  });

  it("authenticate → sucesso gera token; erro com credenciais inválidas", () => {
    const users = [{ id: 7, name: "X", email: "x@mail.com", password: "123" }];
    const jwt = { sign: sinon.stub().returns("signed.token"), verify: sinon.stub() };

    const userService = proxyquire(path.join(process.cwd(), "src", "services", "userService.js"), {
      "../models/user": users,
      jsonwebtoken: jwt,
    });

    const ok = userService.authenticate("x@mail.com", "123");
    expect(ok).to.be.an("object");
    expect(ok).to.have.property("token", "signed.token");

    if (ok.user) {
      expect(ok.user.email).to.equal("x@mail.com");
    }
    expect(jwt.sign.calledOnce).to.be.true;

    const bad = userService.authenticate("x@mail.com", "wrong");
    expect(bad).to.equal(null);
  });

  it("verifyToken → válido retorna payload; inválido retorna null", () => {
    const users = makeUsersArray();
    const jwt = {
      verify: sinon
        .stub()
        .onFirstCall()
        .returns({ id: "u1", email: "u@mail.com" })
        .onSecondCall()
        .throws(new Error("invalid")),
      sign: sinon.stub(),
    };

    const userService = proxyquire(path.join(process.cwd(), "src", "services", "userService.js"), {
      "../models/user": users,
      jsonwebtoken: jwt,
    });

    const ok = userService.verifyToken("good.token");
    expect(ok).to.deep.equal({ id: "u1", email: "u@mail.com" });

    const bad = userService.verifyToken("bad.token");
    expect(bad).to.equal(null);
  });
});
