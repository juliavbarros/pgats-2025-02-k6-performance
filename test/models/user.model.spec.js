/* eslint-disable no-unused-expressions */
const { expect } = require("chai");
const path = require("path");

describe("Model - user.js", () => {
  it("expõe a lista padrão de usuários com id, name, email e password", () => {
    const users = require(path.join(process.cwd(), "src", "models", "user.js"));
    expect(users).to.be.an("array").that.is.not.empty;

    const first = users[0];
    expect(first).to.include.all.keys(["id", "name", "email", "password"]);
    expect(first.id).to.be.a("number");
    expect(first.name).to.be.a("string");
    expect(first.email).to.match(/@/);
    expect(first.password).to.be.a("string");
  });
});
