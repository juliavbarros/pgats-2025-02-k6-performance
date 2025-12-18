/* eslint-disable no-unused-expressions */
const { expect } = require("chai");
const request = require("supertest");
const { spawn } = require("child_process");
const path = require("path");
const waitOn = require("wait-on");

const BASE = "http://localhost:4000";

const gql = (query, variables = {}) => ({ query, variables });

describe("GraphQL - External (E2E)", function () {
  this.timeout(20000);

  let proc;

  const root = process.cwd();
  before(async () => {
    proc = spawn(process.execPath, [path.join(root, "graphql", "server.js")], {
      stdio: "inherit",
      env: { ...process.env, PORT: "4000" },
    });
    await waitOn({ resources: ["tcp:4000"], timeout: 10000 });
  });

  after(() => {
    if (proc) proc.kill();
  });

  it("register -> login -> checkout (boleto e cartão) com as mutações do README", async () => {
    // register
    const email = `gql${Date.now()}@email.com`;
    const register = await request(BASE)
      .post("/graphql")
      .send(
        gql(
          `mutation Register($name:String!,$email:String!,$password:String!){
            register(name:$name,email:$email,password:$password){ email name }
          }`,
          { name: "GQL User", email, password: "123456" }
        )
      );
    expect(register.status).to.equal(200);
    expect(register.body.data.register.email).to.equal(email);

    // login
    const login = await request(BASE)
      .post("/graphql")
      .send(
        gql(
          `mutation Login($email:String!,$password:String!){
            login(email:$email,password:$password){ token }
          }`,
          { email, password: "123456" }
        )
      );
    const token = login.body.data.login.token;
    expect(token).to.be.a("string");

    const agent = request.agent(BASE);

    // checkout boleto
    const boleto = await agent
      .post("/graphql")
      .set("Authorization", `Bearer ${token}`)
      .send(
        gql(
          `mutation Checkout($items:[CheckoutItemInput!]!,$freight:Float!,$paymentMethod:String!){
            checkout(items:$items,freight:$freight,paymentMethod:$paymentMethod){
              valorFinal paymentMethod freight items{productId quantity}
            }
          }`,
          {
            items: [
              { productId: 1, quantity: 2 },
              { productId: 2, quantity: 1 },
            ],
            freight: 10,
            paymentMethod: "boleto",
          }
        )
      );

    // checkout cartão
    const cc = await agent
      .post("/graphql")
      .set("Authorization", `Bearer ${token}`)
      .send(
        gql(
          `mutation CheckoutCard($items:[CheckoutItemInput!]!,$freight:Float!,$paymentMethod:String!,$cardData:CardDataInput){
            checkout(items:$items,freight:$freight,paymentMethod:$paymentMethod,cardData:$cardData){
              valorFinal paymentMethod freight
            }
          }`,
          {
            items: [
              { productId: 1, quantity: 2 },
              { productId: 2, quantity: 1 },
            ],
            freight: 10,
            paymentMethod: "credit_card",
            cardData: { number: "4111111111111111", name: "GQL", expiry: "12/30", cvv: "123" },
          }
        )
      );

    expect(boleto.status).to.equal(200);
    expect(cc.status).to.equal(200);
    expect(cc.body.data.checkout.valorFinal).to.be.below(boleto.body.data.checkout.valorFinal);
    expect(cc.body.data.checkout.paymentMethod).to.equal("credit_card");
  });
});
