// Test coordination system connectivity
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3847,
  path: '/api/coordination/dashboard',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Coordination API Response:');
    console.log(data);
  });
});

req.on('error', (error) => {
  console.error('Coordination API Error:', error.message);
  console.log('The cockpit server needs to be started on port 3847');
});

req.end();