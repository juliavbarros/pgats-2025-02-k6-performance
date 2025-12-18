/* eslint-disable no-unused-expressions */
const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire").noCallThru();
const { ApolloServer } = require("apollo-server-express");

const typeDefs = require("../../graphql/schema");

describe("GraphQL resolvers (unit) – 100% paths", () => {
  afterEach(() => sinon.restore());

  function makeServer({ userServiceStub, checkoutServiceStub, usersModel = [] }) {
    const resolvers = proxyquire("../../graphql/resolvers", {
      "../src/services/userService": userServiceStub,
      "../src/services/checkoutService": checkoutServiceStub,
      "../src/models/user": usersModel,
    });

    let currentContext = { userData: null };

    const server = new ApolloServer({
      typeDefs,
      resolvers,
      context: () => currentContext,
    });

    const setContext = (ctx) => {
      currentContext = ctx;
    };

    return { server, setContext };
  }

  it("register: sucesso e erro (email duplicado)", async () => {
    const userServiceStub = {
      registerUser: sinon.stub().onFirstCall().returns({ name: "A", email: "a@mail.com" }).onSecondCall().returns(null),
      authenticate: sinon.stub(),
      verifyToken: sinon.stub(),
    };
    const checkoutServiceStub = { checkout: sinon.stub() };

    const { server } = makeServer({ userServiceStub, checkoutServiceStub });
    await server.start();

    let res = await server.executeOperation({
      query: `
        mutation($n:String!,$e:String!,$p:String!){
          register(name:$n,email:$e,password:$p){ name email }
        }`,
      variables: { n: "A", e: "a@mail.com", p: "123" },
    });
    expect(res.errors).to.be.undefined;
    expect(res.data.register.email).to.equal("a@mail.com");

    res = await server.executeOperation({
      query: `
        mutation($n:String!,$e:String!,$p:String!){
          register(name:$n,email:$e,password:$p){ name email }
        }`,
      variables: { n: "B", e: "a@mail.com", p: "123" },
    });
    expect(res.errors).to.exist;
    expect(res.errors[0].message).to.match(/já cadastrado/i);

    await server.stop();
  });

  it("login: sucesso e erro (credenciais inválidas)", async () => {
    const userServiceStub = {
      registerUser: sinon.stub(),
      authenticate: sinon
        .stub()
        .onFirstCall()
        .returns({ user: { name: "A", email: "a@mail.com" }, token: "tok" })
        .onSecondCall()
        .returns(null),
      verifyToken: sinon.stub(),
    };
    const checkoutServiceStub = { checkout: sinon.stub() };

    const { server } = makeServer({ userServiceStub, checkoutServiceStub });
    await server.start();

    let res = await server.executeOperation({
      query: `
        mutation($e:String!,$p:String!){
          login(email:$e,password:$p){ token user{email} }
        }`,
      variables: { e: "a@mail.com", p: "123" },
    });
    expect(res.errors).to.be.undefined;
    expect(res.data.login.token).to.equal("tok");

    res = await server.executeOperation({
      query: `
        mutation($e:String!,$p:String!){
          login(email:$e,password:$p){ token user{email} }
        }`,
      variables: { e: "a@mail.com", p: "wrong" },
    });
    expect(res.errors).to.exist;
    expect(res.errors[0].message).to.match(/inválidas/i);

    await server.stop();
  });

  it("checkout: 1) sem token -> erro; 2) com token -> sucesso; 3) service lança -> erro", async () => {
    const userServiceStub = {
      registerUser: sinon.stub(),
      authenticate: sinon.stub(),
      verifyToken: sinon.stub(),
    };

    const okResult = {
      total: 105,
      userId: "u1",
      paymentMethod: "boleto",
      freight: 10,
      items: [{ productId: 1, quantity: 2 }],
    };

    const checkoutServiceStub = {
      checkout: sinon.stub().onFirstCall().returns(okResult).onSecondCall().throws(new Error("boom")),
    };

    const { server, setContext } = makeServer({ userServiceStub, checkoutServiceStub });
    await server.start();

    const mutation = `
      mutation($items:[CheckoutItemInput!]!,$freight:Float!,$pm:String!){
        checkout(items:$items,freight:$freight,paymentMethod:$pm){
          valorFinal paymentMethod freight items{productId quantity}
        }}`;

    const vars = { items: [{ productId: 1, quantity: 2 }], freight: 10, pm: "boleto" };

    setContext({ userData: null });
    let res = await server.executeOperation({ query: mutation, variables: vars });
    expect(res.errors).to.exist;
    expect(res.errors[0].message).to.match(/Token inválido/i);

    setContext({ userData: { id: "u1" } });
    res = await server.executeOperation({ query: mutation, variables: vars });
    expect(res.errors, JSON.stringify(res.errors)).to.be.undefined;
    expect(res.data.checkout.valorFinal).to.equal(105);
    expect(res.data.checkout.paymentMethod).to.equal("boleto");

    setContext({ userData: { id: "u1" } });
    res = await server.executeOperation({ query: mutation, variables: vars });
    expect(res.errors).to.exist;
    expect(res.errors[0].message).to.match(/boom/i);

    await server.stop();
  });

  it("Query.users: usa model injetado (caminho feliz simples)", async () => {
    const userServiceStub = {
      registerUser: sinon.stub(),
      authenticate: sinon.stub(),
      verifyToken: sinon.stub(),
    };
    const checkoutServiceStub = { checkout: sinon.stub() };

    const usersModel = [{ name: "X", email: "x@mail.com" }];
    const { server } = makeServer({ userServiceStub, checkoutServiceStub, usersModel });
    await server.start();

    const res = await server.executeOperation({ query: `query { users { name email } }` });
    expect(res.errors).to.be.undefined;
    expect(res.data.users[0].email).to.equal("x@mail.com");

    await server.stop();
  });
});
