const { generateKeyPairSync } = require('node:crypto');
const pair = generateKeyPairSync('rsa', {
  modulusLength: 3072,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});
console.log('JWT_PRIVATE_KEY=' + pair.privateKey.replace(/\n/g, '\\n'));
console.log('JWT_PUBLIC_KEY=' + pair.publicKey.replace(/\n/g, '\\n'));
console.log('JWT_KEY_ID=auth-api-' + new Date().toISOString().slice(0, 10));
