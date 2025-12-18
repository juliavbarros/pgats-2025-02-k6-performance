/* eslint-disable no-unused-expressions */
const { expect } = require("chai");
const path = require("path");

describe("Swagger document", () => {
  it("expõe OpenAPI 3.0 com rotas esperadas e bearerAuth", () => {
    const doc = require(path.join(process.cwd(), "rest", "swagger.js"));

    expect(doc).to.be.an("object");
    expect(doc.openapi).to.equal("3.0.0");

    expect(doc.paths).to.have.all.keys("/api/users/register", "/api/users/login", "/api/checkout");

    expect(doc).to.have.nested.property("components.securitySchemes.bearerAuth");
    const bearer = doc.components.securitySchemes.bearerAuth;
    expect(bearer).to.include({ type: "http", scheme: "bearer" });

    const checkout = doc.paths["/api/checkout"].post;
    expect(checkout).to.be.an("object");
    expect(checkout)
      .to.have.nested.property("requestBody.content.application/json.schema.required")
      .that.includes.members(["items", "freight", "paymentMethod"]);
  });
});
