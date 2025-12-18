/* eslint-disable no-unused-expressions */
const { expect } = require("chai");
const path = require("path");

describe("Model - product.js", () => {
  it("expõe a lista padrão de produtos com id, name e price", () => {
    const products = require(path.join(process.cwd(), "src", "models", "product.js"));
    expect(products).to.be.an("array").that.is.not.empty;
    expect(products[0]).to.include.all.keys(["id", "name", "price"]);
    expect(products.every((p) => typeof p.price === "number")).to.equal(true);
  });
});
