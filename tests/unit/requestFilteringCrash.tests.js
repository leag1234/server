const {describe, test, expect} = require('@jest/globals');
const http = require('http');
const {RequestFilteringHttpAgent} = require('../../Common/node_modules/request-filtering-agent');

// GHSA-r3r9-wp5j-pq5g: request-filtering-agent versions that throw synchronously from createConnection() for a
// literal private IP crash the process. The version in use must keep blocking private addresses and report the
// block through the request 'error' event.
describe('request filtering agent', () => {
  test('a private literal IP is blocked through the error event, without a synchronous throw', async () => {
    const server = http.createServer((req, res) => res.end('reachable'));
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const {port} = server.address();
    try {
      const outcome = await new Promise(resolve => {
        let req;
        try {
          req = http.get({host: '127.0.0.1', port, path: '/', agent: new RequestFilteringHttpAgent({})});
        } catch (e) {
          resolve('thrown: ' + e.message);
          return;
        }
        req.on('error', e => resolve('error: ' + e.message));
        req.on('response', () => resolve('response'));
      });
      expect(outcome).toMatch(/^error: .*not allowed/);
    } finally {
      server.close();
    }
  });
});
