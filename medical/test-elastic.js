import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.ELASTICSEARCH_API_KEY;
const url = process.env.ELASTICSEARCH_URL;

console.log('API Key length:', apiKey?.length);
console.log('URL:', url);

// Test basic connectivity
try {
  const testLog = {
    '@timestamp': new Date().toISOString(),
    message: 'Test log entry',
    system: 'medical-ai-cockpit'
  };
  
  console.log('Test log entry:', JSON.stringify(testLog));
  console.log('Would POST to:', `${url}/cockpit-logs/_doc`);
} catch (error) {
  console.error('Error:', error.message);
}