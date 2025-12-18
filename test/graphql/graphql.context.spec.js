/* eslint-disable no-unused-expressions */
const { expect } = require("chai");
const proxyquire = require("proxyquire").noCallThru();
const request = require("supertest");

const testResolvers = {
  Query: {
    users: (_, __, { userData }) => (userData ? [{ name: "Y", email: "y@mail.com" }] : []),
  },
  Mutation: {},
};

describe("GraphQL app (context de autenticação)", () => {
  it("sem Authorization -> context.userData = null", async () => {
    const userServiceStub = { verifyToken: () => null };

    const app = proxyquire("../../graphql/app", {
      "./resolvers": testResolvers,
      "../src/services/userService": userServiceStub,
    });

    const res = await request(app).post("/graphql").send({ query: `query { users { email } }` });

    expect(res.status).to.equal(200);
    expect(res.body.data.users).to.be.an("array").that.is.empty;
  });

  it("com Authorization Bearer e token válido -> context.userData definido", async () => {
    const userServiceStub = { verifyToken: () => ({ id: "u1" }) };

    const app = proxyquire("../../graphql/app", {
      "./resolvers": testResolvers,
      "../src/services/userService": userServiceStub,
    });

    const res = await request(app)
      .post("/graphql")
      .set("Authorization", "Bearer token.ok")
      .send({ query: `query { users { email } }` });

    expect(res.status).to.equal(200);
    expect(res.body.data.users).to.be.an("array").with.length(1);
    expect(res.body.data.users[0].email).to.equal("y@mail.com");
  });

  it("com Authorization Bearer mas token inválido -> context.userData = null", async () => {
    const userServiceStub = { verifyToken: () => null };

    const app = proxyquire("../../graphql/app", {
      "./resolvers": testResolvers,
      "../src/services/userService": userServiceStub,
    });

    const res = await request(app)
      .post("/graphql")
      .set("Authorization", "Bearer token.ruim")
      .send({ query: `query { users { email } }` });

    expect(res.status).to.equal(200);
    expect(res.body.data.users).to.be.an("array").that.is.empty;
  });
});
