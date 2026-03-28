import http, { get, post } from 'k6/http';
import { check } from 'k6';

// docker run --rm -i grafana/k6 run - <rinha_test.js

// docker exec -it rinha-db psql -U admin -d rinha -c "SELECT count(*) FROM reservas;"

export const options = {
  scenarios: {
    leitura: {
      executor:        'constant-arrival-rate',
      rate:            500,
      timeUnit:        '1s',
      duration:        '30s',
      preAllocatedVUs: 50,
      maxVUs:          100,
      exec:            'fluxoLeitura',
    },
    escrita: {
      executor:        'constant-arrival-rate',
      rate:            500,
      timeUnit:        '1s',
      duration:        '30s',
      preAllocatedVUs: 100,
      maxVUs:          150,
      exec:            'fluxoEscrita',
    },
  },
  thresholds: {
    'http_req_failed{scenario:escrita}':   ['rate<0.01'],
    'http_req_failed{scenario:leitura}':   ['rate<0.01'],
    'http_req_duration{scenario:escrita}': ['p(95)<200'],
    'http_req_duration{scenario:leitura}': ['p(95)<50'],
  },
};

const BASE_URL     = 'http://172.17.0.1:8080';
const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } };

export function setup() {
  http.setResponseCallback(http.expectedStatuses(200, 201, 422));
}

export function fluxoLeitura() {
  const res = get(`${BASE_URL}/eventos`);
  check(res, { 'listagem: status 200': (r) => r.status === 200 });
}

export function fluxoEscrita() {
  const payload = JSON.stringify({
    evento_id:  1,
    usuario_id: Math.floor(Math.random() * 1_000_000),
  });

  const res = post(`${BASE_URL}/reservas`, payload, JSON_HEADERS);
  check(res, {
    'reserva: 201 ou 422':   (r) => r.status === 201 || r.status === 422,
    'reserva: sem erro 500': (r) => r.status !== 500,
  });
}