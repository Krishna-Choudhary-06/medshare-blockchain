import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 }
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000']
  }
};

export default function () {
  const url = 'http://localhost:3000/api/signed/query';
  const payload = JSON.stringify({
    requestPayload: {
      requestId: `req_${Math.random().toString(16).slice(2,8)}`,
      requestorId: 'test-user',
      ownerId: 'patient_001',
      action: 'READ',
      sensitivity: 'LOW',
      timestamp: new Date().toISOString()
    }
  });
  const params = { headers: { 'Content-Type': 'application/json', 'x-signature': 'medshare-secret-signature-placeholder' } };
  const res = http.post(url, payload, params);
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(1);
}
