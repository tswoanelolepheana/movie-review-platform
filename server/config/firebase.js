const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Enable offline persistence (optional)
db.settings({
  ignoreUndefinedProperties: true
});

module.exports = { admin, db };