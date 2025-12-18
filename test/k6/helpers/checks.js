import { check } from "k6";

export function checkOk(res, name = "request ok") {
  return check(res, {
    [`${name}: status 2xx`]: (r) => r.status >= 200 && r.status < 300,
  });
}

export function checkHasToken(res) {
  return check(res, {
    "login: tem token": (r) => !!(r.json && r.json("token")),
  });
}

export function checkCheckoutPayload(res) {
  return check(res, {
    "checkout: tem valorFinal": (r) => typeof r.json("valorFinal") === "number",
    "checkout: tem paymentMethod": (r) => typeof r.json("paymentMethod") === "string",
  });
}
