// Simple fetch test without dotenv
import http from 'http';

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/news',
  method: 'GET',
  headers: {
    'Accept': 'application/json'
  }
};

console.log('Testing GET http://localhost:3001/api/news...');

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`✅ Status: ${res.statusCode}`);
    try {
      const json = JSON.parse(data);
      console.log('  - Type:', Array.isArray(json) ? 'Array' : 'Object');
      console.log('  - Count:', json.length || json.data?.length || json.results || 0);
      if (Array.isArray(json) && json.length > 0) {
        console.log('  - First:', json[0].title?.substring(0, 60));
      } else if (json.data && json.data.length > 0) {
        console.log('  - First:', json.data[0].title?.substring(0, 60));
      }
    } catch (e) {
      console.error('Parse error:', e.message);
      console.log('Raw response:', data.substring(0, 200));
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request error:', e.message);
});

req.end();
