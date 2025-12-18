# Teste de Performance com K6 – API Checkout (REST + GraphQL)

Este repositório contém a API de Checkout (REST e GraphQL) e um projeto de **testes automatizados de performance com K6**, atendendo aos requisitos do desafio.

## Pré-requisitos

- Node.js (LTS recomendado)
- NPM
- K6 instalado e disponível no PATH (`k6 version`)

## Como rodar a API

Instalar dependências

```bash
npm install
```

Subir REST (porta 3000)

```bash
npm run start:rest
```

Subir GraphQL (porta 4000)

```bash
npm run start:gql
```

## Como rodar o teste de performance (K6)

### Executar o cenário REST (checkout com autenticação)

#### Com a API REST em execução:
```bash
k6 run -e BASE_URL=http://localhost:3000 test/k6/scenarios/checkout.rest.perf.js
```

### Relatório de Execução (HTML)

Ao final da execução é gerado:

test/k6/reports/summary.html

Obs.: a pasta test/k6/reports contém um .gitkeep para garantir que o diretório exista no repositório.


## Arquitetura dos testes (test/k6)

```bash
test/k6/
  helpers/     -> funções reutilizáveis (http, env, auth, checks, trends, data)
  data/        -> datasets para data-driven testing (JSON)
  scenarios/   -> cenários executáveis do K6
  reports/     -> saída do relatório (HTML) + .gitkeep
```

## Onde cada conceito foi aplicado (com trechos)

### 1) Variável de Ambiente
```
test/k6/helpers/env.js
```
Usa __ENV para configurar o teste sem alterar código.

```js
export const ENV = {
  BASE_URL: __ENV.BASE_URL || "http://localhost:3000",
  MAX_VUS: parseInt(__ENV.MAX_VUS || "10", 10),
  RAMP_UP: __ENV.RAMP_UP || "10s",
  STEADY: __ENV.STEADY || "20s",
  RAMP_DOWN: __ENV.RAMP_DOWN || "10s",
};
```

### 2) Stages
```
test/k6/scenarios/checkout.rest.perf.js
```
Define subida, carga constante e descida.

```js
stages: [
  { duration: ENV.RAMP_UP, target: ENV.MAX_VUS },
  { duration: ENV.STEADY, target: ENV.MAX_VUS },
  { duration: ENV.RAMP_DOWN, target: 0 },
],
```

### 3) Thresholds
```
test/k6/scenarios/checkout.rest.perf.js
```
Critérios automáticos de aprovação/reprovação do teste.

```js
thresholds: {
  http_req_failed: ["rate<0.02"],
  http_req_duration: ["p(95)<500"],
  auth_ms: ["p(95)<300"],
  checkout_ms: ["p(95)<400"],
},
```

### 4) Checks
```
test/k6/helpers/checks.js
```
Valida respostas durante o teste (sanidade).

```js
export function checkOk(res, name = "request ok") {
  return check(res, {
    [`${name}: status 2xx`]: (r) => r.status >= 200 && r.status < 300,
  });
}
```

### 5) Helpers
```
test/k6/helpers/
```
Organização do código reutilizável (ex.: wrapper HTTP).

```js
export function postJson(url, body, headers = {}) {
  return http.post(url, JSON.stringify(body), {
    headers: { "Content-Type": "application/json", ...headers },
  });
}
```

### 6) Trends
```
test/k6/helpers/trends.js
```
Métricas customizadas de tempo para autenticação e checkout.

```js
export const TRENDS = {
  auth_ms: new Trend("auth_ms"),
  checkout_ms: new Trend("checkout_ms"),
  valor_final: new Trend("valor_final"),
};
```
Uso no cenário
```js
TRENDS.checkout_ms.add(Date.now() - t0);

```

### 7) Faker
```
test/k6/helpers/auth.js
```
Gera dados dinâmicos de usuário (evita conflito de email).

```js
const email = `${Faker.internet.email().toLowerCase()}.${Date.now()}@mail.com`;

```

### 8) Uso de Token de Autenticação
```
test/k6/helpers/auth.js + test/k6/scenarios/checkout.rest.perf.js
```
O token vem do login e é enviado no header do checkout.
```js
const token = r2.json("token");

```
```js
const headers = { Authorization: `Bearer ${token}` };
```

### 9) Reaproveitamento de Resposta
```
test/k6/helpers/auth.js
```
Reaproveita o token obtido no login (resposta HTTP) para chamadas seguintes.
```js
const token = r2.json("token");
return { token, email };

```

### 10) Data-Driven Testing
```
test/k6/data/checkout-datasets.json + test/k6/helpers/data.js
```
Usa datasets externos em JSON e alterna por iteração.
```js
export function pickDataset(iter) {
  return datasets[iter % datasets.length];
}
```

### 11) Groups
```
test/k6/scenarios/checkout.rest.perf.js
```
Agrupa etapas para ficar mais legível no output/relatório.
```js
group("Auth (register + login)", () => {
  group("Checkout (data-driven)", () => {
    // ...
  });
})
```

### 12) Relatório HTML
```
test/k6/scenarios/checkout.rest.perf.js
```
Gera relatório de execução em HTML ao final.
```js
export function handleSummary(data) {
  return {
    "test/k6/reports/summary.html": htmlReport(data),
  };
}
```



