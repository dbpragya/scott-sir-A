const path = require('path');
const admin = require('firebase-admin');

const parseServiceAccountJson = (value) => {
  try {
    return JSON.parse(value);
  } catch (error) {
    console.error('Failed to parse Firebase service account JSON from env.');
    throw error;
  }
};

const getServiceAccount = () => {
  const inlineJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (inlineJson) {
    return parseServiceAccountJson(inlineJson);
  }

  const explicitPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (explicitPath) {
    // Allow passing JSON string via env for platforms where file storage is tricky
    if (explicitPath.trim().startsWith('{')) {
      return parseServiceAccountJson(explicitPath);
    }
    return require(path.resolve(explicitPath));
  }

  throw new Error(
    'Firebase service account not configured. Set FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_PATH.'
  );
};

if (!admin.apps.length) {
  const serviceAccount = getServiceAccount();

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

module.exports = admin;

