// Test summarize endpoint
import http from 'http';

async function testSummarize() {
    // First, get a news item ID
    const getNews = () => new Promise((resolve, reject) => {
        http.get('http://localhost:3001/api/news', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    const items = json.data || json;
                    resolve(items[0]?.id);
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });

    const id = await getNews();
    console.log(`Testing summarize with ID: ${id}`);

    const postData = JSON.stringify({});
    const options = {
        hostname: 'localhost',
        port: 3001,
        path: `/api/news/${id}/summarize`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': postData.length
        }
    };

    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            console.log(`Status: ${res.statusCode}`);
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    console.log('Response:', JSON.stringify(json, null, 2));
                    resolve();
                } catch (e) {
                    console.log('Raw response:', data.substring(0, 500));
                    reject(e);
                }
            });
        });

        req.on('error', (e) => {
            console.error('Request error:', e.message);
            reject(e);
        });

        req.write(postData);
        req.end();
    });
}

testSummarize().catch(console.error);
