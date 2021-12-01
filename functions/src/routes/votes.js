const { Router } = require("express");
const route = Router();
const { db } = require("../util/firebase-config");
const FBAuth = require("../util/fbAuth");

async function getScreamOfVote(docs, res) {
  let voteData = [];
  let i = 0;
  const myPromise = new Promise((resolve, reject) => {
    docs.forEach((doc) => {
      db.doc(`screams/${doc.data().screamId}`)
        .get()
        .then((data) => {
          voteData.push({
            scream: {
              screamId: data.id,
              title: data.data().title,
              body: data.data().body,
              url: data.data().url,
              requiredSkills: data.data().requiredSkills,
              handle: data.data().handle,
              userImage: data.data().userImage,
              createdAt: data.data().createdAt,
            },
            vote: {
              voteId: doc.id,
              collabRequest: doc.data().collabRequest,
              comment: doc.data().comment,
              skills: doc.data().skills,
              handle: doc.data().handle,
              userImage: doc.data().userImage,
              createdAt: doc.data().createdAt,
              screamId: doc.data().screamId,
            },
          });
          if (++i === docs._size) {
            resolve("done");
          }
        });
    });
  });
  myPromise.then((e) => {
    res.json(voteData);
  });
}

// get authors vote
route.get("/", FBAuth, (req, res) => {
  db.collection("votes")
    .where("handle", "==", req.user.handle)
    .orderBy("createdAt", "desc")
    .get()
    .then((docs) => {
      return getScreamOfVote(docs, res);
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
});

// vote perticular scream
route.post("/:screamId", FBAuth, (req, res) => {
  if (req.body.comment.length == 1 && req.body.comment[0].trim() === "") {
    return res.status(400).json({ comment: "comment must not be empty" });
  }

  const newVote = {
    screamId: req.params.screamId,
    handle: req.user.handle,
    userImage: req.user.imageUrl,
    comment: req.body.comment,
    skills: req.body.skills,
    collabRequest: false,
    createdAt: new Date().toISOString(),
  };

  db.doc(`screams/${req.params.screamId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Scream not found" });
      }
      return db.collection("votes").add(newVote);
    })
    .then(() => {
      return res.json(newVote);
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
});

// update vote
route.put("/:voteId", FBAuth, (req, res) => {
  if (req.body.comment.length == 1 && req.body.comment[0].trim() === "") {
    return res.status(400).json({ comment: "comment must not be empty" });
  }
  const newVote = {
    comment: req.body.comment,
    skills: req.body.skills,
    createdAt: new Date().toISOString(),
  };

  const document = db.doc(`votes/${req.params.voteId}`);

  document
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "vote not found" });
      }
      if (doc.data().handle !== req.user.handle) {
        return res.status(403).json({ error: "unauthorized" });
      } else {
        return document.update(newVote);
      }
    })
    .then(() => {
      return res.json(newVote);
    })
    .catch((err) => {
      return res.status(500).json({ error: err.code });
    });
});

module.exports = {
  VoteRoute: route,
};
