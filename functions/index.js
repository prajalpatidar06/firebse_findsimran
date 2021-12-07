const functions = require("firebase-functions");
const express = require("express");
const app = express();
const { db, admin } = require("./src/util/firebase-config");
const { ScreamRoute } = require("./src/routes/screams");
const { UserRoute } = require("./src/routes/user");
const { VoteRoute } = require("./src/routes/votes");
const { ProjectRoute } = require("./src/routes/project");
const { ChatRoute } = require("./src/routes/chats");
const cors = require("cors");
app.use(cors());

app.use("/screams", ScreamRoute);
app.use("/user", UserRoute);
app.use("/votes", VoteRoute);
app.use("/projects", ProjectRoute);
app.use("/chats", ChatRoute);

exports.api = functions.region("asia-east1").https.onRequest(app);

exports.createNotificationOnVote = functions
  .region("asia-east1")
  .firestore.document("votes/{id}")
  .onCreate((snapshot, context) => {
    return db
      .doc(`/screams/${snapshot.data().screamId}`)
      .get()
      .then((doc) => {
        if (doc.exists) {
          return db.doc(`notifications/${context.params.id}`).set({
            recipient: doc.data().handle,
            sender: snapshot.data().handle,
            senderImage: snapshot.data().userImage,
            read: false,
            type: "vote",
            screamId: snapshot.data().screamId,
            createdAt: new Date().toISOString(),
          });
        }
      })
      .catch((err) => {
        console.error(err);
      });
  });

exports.createNotificationOnCollab = functions
  .region("asia-east1")
  .firestore.document("votes/{id}")
  .onUpdate((snapshot, context) => {
    const data = snapshot.after.data();
    return db
      .doc(`/screams/${data.screamId}`)
      .get()
      .then((doc) => {
        if (doc.exists && data.collabRequest === true) {
          return db.doc(`notifications/${data.screamId}`).set({
            recipient: data.handle,
            sender: doc.data().handle,
            senderImage: doc.data().userImage,
            type: "collaboration",
            read: false,
            screamId: doc.id,
          });
        }
      })
      .catch((err) => {
        console.log(err);
      });
  });

exports.onScreamDelete = functions
  .region("asia-east1")
  .firestore.document("screams/{screamId}")
  .onDelete((snapshot, context) => {
    const screamId = context.params.screamId;
    const batch = db.batch();
    return db
      .collection("votes")
      .where("screamId", "==", screamId)
      .get()
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/votes/${doc.id}`));
        });
        return db
          .collection("notifications")
          .where("screamId", "==", screamId)
          .get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/notifications/${doc.id}`));
        });
        return db.doc(`chats/${context.params.screamId}`).get();
      })
      .then((doc) => {
        doc.data().members.forEach((member) => {
          db.doc(`users/${member}`).update({
            groups: admin.firestore.FieldValue.arrayRemove(
              context.params.screamId
            ),
          });
        });
      })
      .then(() => {
        return db
          .doc(`chats/${context.params.screamId}`)
          .delete()
          .then(() => {
            batch.commit();
          });
      });
  });

exports.onVoteDelete = functions
  .region("asia-east1")
  .firestore.document("votes/{voteId}")
  .onDelete((snapshot, context) => {
    const voteId = context.params.voteId;
    return db.doc(`notifications/${voteId}`).delete();
  });

exports.onUserImageChange = functions
  .region("asia-east1")
  .firestore.document("users/{userId}")
  .onUpdate((snapshot, context) => {
    if (snapshot.before.data().imageUrl !== snapshot.after.data().imageUrl) {
      console.log("image has changed");
      const batch = db.batch();
      return db
        .collection("screams")
        .where("handle", "==", context.params.userId)
        .get()
        .then((data) => {
          data.forEach((doc) => {
            const scream = db.doc(`/screams/${doc.id}`);
            batch.update(scream, { userImage: snapshot.after.data().imageUrl });
          });
          return db
            .collection("votes")
            .where("handle", "==", context.params.userId)
            .get();
        })
        .then((data) => {
          data.forEach((doc) => {
            const scream = db.doc(`/votes/${doc.id}`);
            batch.update(scream, { userImage: snapshot.after.data().imageUrl });
          });
          return db
            .collection("projects")
            .where("handle", "==", context.params.userId)
            .get();
        })
        .then((data) => {
          data.forEach((doc) => {
            const project = db.doc(`/projects/${doc.id}`);
            batch.update(project, {
              userImage: snapshot.after.data().imageUrl,
            });
          });
          return db
            .collection("notifications")
            .where("sender", "==", context.params.userId)
            .get();
        })
        .then((data) => {
          data.forEach((doc) => {
            const scream = db.doc(`/notifications/${doc.id}`);
            batch.update(scream, {
              senderImage: snapshot.after.data().imageUrl,
            });
          });
          return batch.commit();
        });
    } else return true;
  });

exports.onUserDeleting = functions
  .region("asia-east1")
  .firestore.document("users/{userId}")
  .onDelete((snapshot, context) => {
    const batch = db.batch();
    return db
      .collection("projects")
      .where("handle", "==", context.params.userId)
      .get()
      .then((data) => {
        data.forEach((doc) => {
          const project = db.doc(`/projects/${doc.id}`);
          batch.delete(project);
        });
        return db
          .collection("notifications")
          .where("sender", "==", context.params.userId)
          .get();
      })
      .then((data) => {
        data.forEach((doc) => {
          const notification = db.doc(`/notifications/${doc.id}`);
          batch.delete(notification);
        });
        return db
          .collection("votes")
          .where("handle", "==", context.params.userId)
          .get();
      })
      .then((data) => {
        data.forEach((doc) => {
          const vote = db.doc(`/votes/${doc.id}`);
          batch.delete(vote);
        });
        return db
          .collection("screams")
          .where("handle", "==", context.params.userId)
          .get();
      })
      .then((data) => {
        data.forEach((doc) => {
          const scream = db.doc(`/screams/${doc.id}`);
          batch.delete(scream);
        });
        return batch.commit();
      });
  });

exports.CreateGroupOnScreamPost = functions
  .region("asia-east1")
  .firestore.document("screams/{screamId}")
  .onCreate((snapshot, context) => {
    let messageObject = {
      groupName: context.params.screamId,
      admin: snapshot.data().handle,
      members: [snapshot.data().handle],
      messages: [],
    };
    return db
      .doc(`chats/${context.params.screamId}`)
      .set(messageObject)
      .then(() => {
        db.doc(`users/${snapshot.data().handle}`).update({
          groups: admin.firestore.FieldValue.arrayUnion(
            context.params.screamId
          ),
        });
      });
  });
