/* eslint-disable no-unused-expressions */
const { expect } = require("chai");
const request = require("supertest");
const path = require("path");

describe("REST app (smoke / wiring)", () => {
  it("carrega o app e serve Swagger UI em /api-docs", async () => {
    const app = require(path.join(process.cwd(), "rest", "app.js"));

    const r1 = await request(app).get("/api-docs");
    expect([200, 301]).to.include(r1.status);

    const r2 = await request(app).get("/api-docs/");
    expect(r2.status).to.equal(200);
    expect(r2.headers["content-type"]).to.match(/html/i);
    expect(r2.text).to.include("Swagger");
  });
});
