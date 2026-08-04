// Generates a VAPID key pair for Web Push (PWA notifications).
// Run with:  node scripts/generate-vapid-keys.cjs
const crypto = require('crypto');

function urlBase64(u8) {
  return Buffer.from(u8)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
  namedCurve: 'prime256v1',
});

const pub = publicKey.export({ type: 'spki', format: 'der' });
const priv = privateKey.export({ type: 'pkcs8', format: 'der' });

console.log('=======================================');
console.log('VAPID Public Key:');
console.log(urlBase64(pub));
console.log('');
console.log('VAPID Private Key:');
console.log(urlBase64(priv));
console.log('=======================================');
console.log('');
console.log('Add VITE_VAPID_PUBLIC_KEY to your .env file');
console.log('Set VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY as send-push Edge Function secrets');
console.log('See PUSH_SETUP.md for full instructions.');

