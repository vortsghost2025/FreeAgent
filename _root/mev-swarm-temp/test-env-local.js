import dotenv from 'dotenv';

// Load .env.local explicitly
dotenv.config({ path: '.env.local' });

console.log('🔍 After loading .env.local...\n');
console.log(`process.env.DEBUG_LOGS = "${process.env.DEBUG_LOGS}"`);
console.log(`process.env.DEBUG_LOGS === 'true' = ${process.env.DEBUG_LOGS === 'true'}`);
console.log(`process.env.DEBUG_LOGS?.toLowerCase() === 'true' = ${(process.env.DEBUG_LOGS?.toLowerCase() === 'true')}`);
