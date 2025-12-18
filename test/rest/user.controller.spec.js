/* eslint-disable no-unused-expressions */
const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire").noCallThru();

describe("Controller - /api/users (100% coverage)", () => {
  afterEach(() => sinon.restore());

  it("register → sucesso (201 com user)", () => {
    const user = { id: 1, name: "Test", email: "t@mail.com" };
    const userServiceStub = { registerUser: sinon.stub().returns(user) };

    const userController = proxyquire("../../rest/controllers/userController", {
      "../../src/services/userService": userServiceStub,
    });

    const req = { body: { name: "Test", email: "t@mail.com", password: "123" } };
    const res = {
      statusCode: 0,
      payload: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(obj) {
        this.payload = obj;
        return this;
      },
    };

    userController.register(req, res);

    expect(res.statusCode).to.equal(201);
    expect(res.payload).to.deep.equal({ user });
  });

  it("register → email já cadastrado (400)", () => {
    const userServiceStub = { registerUser: sinon.stub().returns(null) };

    const userController = proxyquire("../../rest/controllers/userController", {
      "../../src/services/userService": userServiceStub,
    });

    const req = { body: { name: "Test", email: "dup@mail.com", password: "123" } };
    const res = {
      statusCode: 0,
      payload: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(obj) {
        this.payload = obj;
        return this;
      },
    };

    userController.register(req, res);

    expect(res.statusCode).to.equal(400);
    expect(res.payload.error).to.match(/Email já cadastrado/);
  });

  it("login → sucesso (200 com token)", () => {
    const authResult = { user: { id: 1, email: "a@mail.com" }, token: "tok" };
    const userServiceStub = { authenticate: sinon.stub().returns(authResult) };

    const userController = proxyquire("../../rest/controllers/userController", {
      "../../src/services/userService": userServiceStub,
    });

    const req = { body: { email: "a@mail.com", password: "123" } };
    const res = {
      statusCode: 0,
      payload: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(obj) {
        this.payload = obj;
        return this;
      },
    };

    userController.login(req, res);

    expect(res.statusCode).to.equal(0);
    expect(res.payload).to.deep.equal(authResult);
  });

  it("login → credenciais inválidas (401)", () => {
    const userServiceStub = { authenticate: sinon.stub().returns(null) };

    const userController = proxyquire("../../rest/controllers/userController", {
      "../../src/services/userService": userServiceStub,
    });

    const req = { body: { email: "a@mail.com", password: "wrong" } };
    const res = {
      statusCode: 0,
      payload: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(obj) {
        this.payload = obj;
        return this;
      },
    };

    userController.login(req, res);

    expect(res.statusCode).to.equal(401);
    expect(res.payload.error).to.match(/Credenciais inválidas/);
  });
});
