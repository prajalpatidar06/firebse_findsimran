const { admin, db } = require("../util/admin");
const config = require("../util/config");
const { Router } = require("express");
const firebase = require("firebase");
firebase.initializeApp(config);
const route = Router();
const {
  validateSignupData,
  validateLogindata,
  reduceUserDetails,
} = require("../util/validators");
const FBAuth = require("../util/fbAuth");

// user registration
route.post("/signup", (req, res) => {
  const newUser = {
    email: req.body.email,
    handle: req.body.handle,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
  };

  const { errors, valid } = validateSignupData(newUser);
  if (!valid) return res.status(403).json(errors);

  let token, userId;
  db.doc(`/users/${newUser.handle}`)
    .get()
    .then((doc) => {
      if (doc.exists)
        return res.status(400).json({ handle: "this handle is already taken" });
      return firebase
        .auth()
        .createUserWithEmailAndPassword(newUser.email, newUser.password);
    })
    .then((data) => {
      userId = data.user.uid;
      return data.user.getIdToken();
    })
    .then((idToken) => {
      token = idToken;
      const userCredentials = {
        handle: newUser.handle,
        email: newUser.email,
        imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/noImg.png?alt=media`,
        createdAt: new Date().toISOString(),
        userId,
      };
      return db.doc(`/users/${newUser.handle}`).set(userCredentials);
    })
    .then(() => {
      return res.status(201).json({ token });
    })
    .catch((err) => {
      if (err.code === "auth/email-already-in-use")
        return res.status(400).json({ email: "Email already in use" });
      else
        console
          .status(500)
          .json({ error: "Something went wrong , Please try again later" });
    });
});

// user login
route.post("/login", (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password,
  };
  const { valid, errors } = validateLogindata(user);
  if (!valid) return res.status(400).json(errors);

  firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
    .then((data) => {
      return data.user.getIdToken();
    })
    .then((token) => {
      res.json({ token });
    })
    .catch((err) => {
      console.error(err);
      return res
        .status(403)
        .json({ general: "Wrong credentails, please try again later" });
    });
});

// get other users handle details
route.get("/:handle", (req, res) => {
  let userData = {};
  db.doc(`/users/${req.params.handle}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        userData = doc.data();
        return db
          .collection("screams")
          .where("handle", "==", req.params.handle)
          .where("active", "==", true)
          .orderBy("createdAt", "desc")
          .get();
      } else return res.status(400).json({ error: "user not found" });
    })
    .then((data) => {
      userData.screams = [];
      data.forEach((doc) => {
        userData.screams.push({
          screamId: doc.id,
          userImage: doc.data().userImage,
          handle: doc.data().handle,
          title: doc.data().title,
          body: doc.data().body,
          requiredSkills: doc.data().requiredSkills,
          url: doc.data().url,
          createdAt: doc.data().createdAt,
        });
      });
      return db
        .collection("projects")
        .where("handle", "==", req.params.handle)
        .orderBy("createdAt", "desc")
        .get();
    })
    .then((data) => {
      userData.projects = [];
      data.forEach((doc) => {
        userData.projects.push({
          projectId: doc.id,
          userImage: doc.data().userImage,
          handle: doc.data().handle,
          title: doc.data().title,
          body: doc.data().body,
          techUsed: doc.data().techUsed,
          url: doc.data().url,
          createdAt: doc.data().createdAt,
        });
      });
      return res.json(userData);
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
});

// get all users details
route.get("/users/getall" , (req,res)=>{
  let users = []
  db.collection('users')
    .get()
    .then((data)=>{
      data.forEach(doc => {
        users.push({
          handle:doc.data().handle,
          imageUrl: doc.data().imageUrl,
          name: doc.data().name,
          email: doc.data().email,
        })
      })
      res.status(201).json(users)
    })
    .catch(err =>{
      res.status(500).json({error: err.code})
    })
})

// edit Author details
route.post("/", FBAuth, (req, res) => {
  let userDetails = reduceUserDetails(req.body);
  db.doc(`/users/${req.user.handle}`)
    .update(userDetails)
    .then(() => {
      return res.json({ message: "Details added successfully" });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
});

// delete previous image
function updateNewImage(handle) {
  db.doc(`users/${handle}`)
    .get()
    .then((doc) => {
      if (
        doc.data().imageUrl !==
        "https://firebasestorage.googleapis.com/v0/b/findcodingpartner.appspot.com/o/noImg.png?alt=media"
      ) {
        const path = doc.data().imageUrl.split("?")[0].split("/")[
          doc.data().imageUrl.split("?")[0].split("/").length - 1
        ];
        return admin.storage().bucket().file(path).delete();
      }
    })
    .then(() => {
      console.log("delete file");
    })
    .catch((err) => console.log(err.code));
}

// post image of author
route.post("/image", FBAuth, (req, res) => {
  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  const busboy = new BusBoy({ headers: req.headers });
  let imageFileName;
  let imageToBeUploaded;
  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    if (mimetype !== "image/png" && mimetype !== "image/jpeg")
      return res.status(400).json({ error: "wrong file type submitted" });
    const imageExtension = filename.split(".")[filename.split(".").length - 1];
    imageFileName = `${Math.round(
      Math.random() * 100000000000
    )}.${imageExtension}`;
    const filePath = path.join(os.tmpdir(), imageFileName);
    imageToBeUploaded = { filePath, mimetype };
    file.pipe(fs.createWriteStream(filePath));
  });

  busboy.on("finish", () => {
    admin
      .storage()
      .bucket()
      .upload(imageToBeUploaded.filePath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.mimetype,
          },
        },
      })
      .then(() => {
        return updateNewImage(req.user.handle);
      })
      .then(() => {
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
        return db.doc(`/users/${req.user.handle}`).update({ imageUrl });
      })
      .then(() => {
        return res.json({ message: "Image uploaded successfully" });
      })
      .catch((err) => {
        console.log(err);
        return res.status(500).json({ error: err.code });
      });
  });
  busboy.end(req.rawBody);
});

// get Author details
route.get("/", FBAuth, (req, res) => {
  let userData = {};
  db.doc(`users/${req.user.handle}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        userData.credentials = doc.data();
        return db
          .collection("notifications")
          .where("recipient", "==", req.user.handle)
          .orderBy("createdAt", "desc")
          .get();
      }
    })
    .then((data) => {
      userData.notifications = [];
      data.forEach((doc) => {
        userData.notifications.push({
          recipient: doc.data().recipient,
          sender: doc.data().sender,
          senderImage: doc.data().senderImage,
          read: doc.data().read,
          type: doc.data().type,
          screamId: doc.data().screamId,
          createdAt: doc.data().createdAt,
          notificationId: doc.id,
        });
      });
      return res.json(userData);
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
});

// Mark notification Read
route.post("/notifications", FBAuth, (req, res) => {
  let batch = db.batch();
  req.body.forEach((notificationId) => {
    const notification = db.doc(`notifications/${notificationId}`);
    batch.update(notification, { read: true });
  });
  batch
    .commit()
    .then(() => {
      return res.json({ message: "Notifications marked read" });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
});

module.exports = {
  UserRoute: route,
};
