const admin = require("firebase-admin");

var serviceAccount = require("./serviceAccount.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "findcodingpartner.appspot.com"
});

const db = admin.firestore();

module.exports = {
  admin,
  db,
};
