import { Trend } from "k6/metrics";

export const TRENDS = {
  auth_ms: new Trend("auth_ms"),
  checkout_ms: new Trend("checkout_ms"),
  valor_final: new Trend("valor_final"),
};
