import http from "k6/http";

export function postJson(url, body, headers = {}) {
  return http.post(url, JSON.stringify(body), {
    headers: { "Content-Type": "application/json", ...headers },
  });
}
