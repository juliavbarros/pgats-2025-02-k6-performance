import { group, sleep } from "k6";
import { ENV } from "../helpers/env.js";
import { postJson } from "../helpers/http.js";
import { pickDataset } from "../helpers/data.js";
import { checkCheckoutPayload, checkOk } from "../helpers/checks.js";
import { registerAndLogin } from "../helpers/auth.js";
import { TRENDS } from "../helpers/trends.js";
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/latest/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.1.0/index.js";

export const options = {
  stages: [
    { duration: ENV.RAMP_UP, target: ENV.MAX_VUS },
    { duration: ENV.STEADY, target: ENV.MAX_VUS },
    { duration: ENV.RAMP_DOWN, target: 0 },
  ],

  // Thresholds (globais + trends)
  thresholds: {
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(95)<500"],
    auth_ms: ["p(95)<300"],
    checkout_ms: ["p(95)<400"],
  },
};

export default function () {
  const baseUrl = ENV.BASE_URL;

  group("Auth (register + login)", () => {
    const { token } = registerAndLogin(baseUrl);

    group("Checkout (data-driven)", () => {
      const ds = pickDataset(__ITER);

      const headers = { Authorization: `Bearer ${token}` };

      const t0 = Date.now();
      const res = postJson(`${baseUrl}/api/checkout`, ds, headers);
      TRENDS.checkout_ms.add(Date.now() - t0);

      checkOk(res, `checkout ${ds.name}`);
      checkCheckoutPayload(res);

      const valorFinal = res.json("valorFinal");
      if (typeof valorFinal === "number") TRENDS.valor_final.add(valorFinal);
    });
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    "test/k6/reports/summary.html": htmlReport(data),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}
