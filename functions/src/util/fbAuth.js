const { createNotificationOnCollab } = require("../..");
const { admin, db } = require("./firebase-config");

module.exports = (req, res, next) => {
  let idToken;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    idToken = req.headers.authorization.split("Bearer ")[1];
  } else {
    console.error("No Token Found");
    return res.status(403).json({ error: "Unauthorized" });
  }

  admin
    .auth()
    .verifyIdToken(idToken)
    .then((decodedToken) => {
      req.user = decodedToken;
      if (req.user.email_verified) {
        req.user.handle = req.user.email.split("@")[0];
        req.user.imageUrl = req.user.picture;
        return next();
      } else {
        return db
          .collection("users")
          .where("userId", "==", req.user.uid)
          .limit(1)
          .get();
      }
    })
    .then((dataset) => {
      if (!req.user.email_verified) {
        req.user.handle = dataset.docs[0].data().handle;
        req.user.imageUrl = dataset.docs[0].data().imageUrl;
        return next();
      }
    })
    .catch((err) => {
      console.error("Error while verifying token", err);
      return res.status(500).json(err);
    });
};
