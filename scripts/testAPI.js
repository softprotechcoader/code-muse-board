import fetch from 'node-fetch';

async function testAPI() {
    try {
        console.log('Testing GET /api/news...');
        const res = await fetch('http://localhost:3001/api/news');
        
        if (!res.ok) {
            console.error(`❌ HTTP ${res.status}: ${res.statusText}`);
            const text = await res.text();
            console.error('Response:', text.substring(0, 200));
            return;
        }
        
        const data = await res.json();
        console.log('✅ API Response:');
        console.log('  - Type:', Array.isArray(data) ? 'Array' : 'Object');
        console.log('  - Count:', data.length || data.data?.length || data.results);
        
        if (Array.isArray(data) && data.length > 0) {
            console.log('  - First item:', data[0]?.title?.substring(0, 60));
        } else if (data.data && data.data.length > 0) {
            console.log('  - First item:', data.data[0]?.title?.substring(0, 60));
        } else {
            console.log('  - Warning: No items in response');
        }
    } catch (error) {
        console.error('❌ Fetch error:', error.message);
    }
}

testAPI();