/**
 * Helper script to format service account JSON for Railway environment variable
 * 
 * Usage: node format-credentials.js
 * 
 * This will read service-account-key.json and output a single-line JSON string
 * that can be pasted into Railway's GOOGLE_CLOUD_CREDENTIALS environment variable
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  const jsonPath = path.join(__dirname, 'service-account-key.json');
  
  if (!fs.existsSync(jsonPath)) {
    console.error('❌ Error: service-account-key.json not found');
    console.error('   Make sure you run this from the backend directory');
    process.exit(1);
  }

  // Read and parse the JSON file
  const jsonContent = fs.readFileSync(jsonPath, 'utf8');
  const jsonObject = JSON.parse(jsonContent);

  // Validate required fields
  const requiredFields = ['type', 'project_id', 'private_key', 'client_email'];
  const missingFields = requiredFields.filter(field => !jsonObject[field]);
  
  if (missingFields.length > 0) {
    console.error('❌ Error: Missing required fields:', missingFields.join(', '));
    process.exit(1);
  }

  // Fix private key: replace actual newlines with escaped newlines for environment variable
  if (jsonObject.private_key && typeof jsonObject.private_key === 'string') {
    // Replace actual newlines with \n (which JSON.stringify will then escape to \\n)
    jsonObject.private_key = jsonObject.private_key.replace(/\n/g, '\\n');
  }

  // Convert to single-line JSON string
  const singleLine = JSON.stringify(jsonObject);

  console.log('✅ Service account JSON formatted successfully!');
  console.log('');
  console.log('📋 Copy the following and paste it into Railway as GOOGLE_CLOUD_CREDENTIALS:');
  console.log('');
  console.log('─'.repeat(80));
  console.log(singleLine);
  console.log('─'.repeat(80));
  console.log('');
  console.log('📊 Stats:');
  console.log(`   Length: ${singleLine.length} characters`);
  console.log(`   Project ID: ${jsonObject.project_id}`);
  console.log(`   Service Account: ${jsonObject.client_email}`);
  console.log(`   Private Key Length: ${jsonObject.private_key.length} characters`);
  console.log('');
  console.log('💡 Next steps:');
  console.log('   1. Copy the JSON above');
  console.log('   2. Go to Railway → Your Service → Variables');
  console.log('   3. Add variable: GOOGLE_CLOUD_CREDENTIALS');
  console.log('   4. Paste the JSON as the value');
  console.log('   5. Redeploy your service');

} catch (error) {
  console.error('❌ Error formatting credentials:', error.message);
  if (error instanceof SyntaxError) {
    console.error('   The JSON file appears to be invalid');
  }
  process.exit(1);
}

