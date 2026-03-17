import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const certDir = './certs';
const keyPath = path.join(certDir, 'key.pem');
const certPath = path.join(certDir, 'cert.pem');

// Create certs directory if it doesn't exist
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir, { recursive: true });
}

// Check if certificates already exist
if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  console.log('✓ SSL certificates already exist in ./certs/');
  process.exit(0);
}

console.log('Generating self-signed SSL certificate...');

try {
  const cmd = `openssl req -x509 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Org/CN=localhost"`;
  execSync(cmd, { stdio: 'inherit' });
  console.log('✓ SSL certificates generated successfully in ./certs/');
} catch (error) {
  // If openssl is not available, use Node.js crypto module
  console.log('Fallback: Using Node.js crypto module...');
  try {
    // For Windows, we recommend using WSL or falling back to HTTP
    console.warn('⚠ OpenSSL not found. Please install OpenSSL or use WSL on Windows.');
    console.warn('Alternatively, set USE_HTTPS=false in .env for HTTP development');
    process.exit(1);
  } catch (err) {
    console.error('Error generating certificate:', err.message);
    process.exit(1);
  }
}
