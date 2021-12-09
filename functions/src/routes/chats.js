const { Router } = require("express");
const route = Router();
const { admin, db } = require("../util/firebase-config");
const FBAuth = require("../util/fbAuth");
const e = require("cors");

// get all groups info
route.get("/", FBAuth, (req, res) => {
  db.doc(`users/${req.user.handle}`)
    .get()
    .then((doc) => {
      let groups = doc.data().groups;
      res.status(201).json(groups);
    })
    .catch((err) => {
      res.status(500).json({ error: err.code });
    });
});

// get all chats from perticular group
route.get("/:groupId", FBAuth, (req, res) => {
  db.doc(`chats/${req.params.groupId}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        let isMemberPresent = false;
        let RespondData = {
          groupId: doc.id,
          groupName: doc.data().groupName,
          admin: doc.data().admin,
          members: doc.data().members,
          messages: doc.data().messages,
        };
        doc.data().members.forEach((member) => {
          if (member === req.user.handle) {
            isMemberPresent = true;
          }
        });
        if (isMemberPresent) {
          res.json(RespondData);
        } else {
          res.status(400).json({ error: "unauthorized user" });
        }
      }
      else{
        res.status(403).json({error: "invalid request"})
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json(err);
    });
});

// post message in perticular group
route.post("/:groupId", FBAuth, (req, res) => {
  let document = db.doc(`chats/${req.params.groupId}`);
  let message = {
    message: req.body.message,
    createdAt: new Date().toISOString(),
    handle: req.user.handle,
  };
  document
    .get()
    .then((doc) => {
      let isMemberPresent = false;
      console.log(doc.data());
      doc.data().members.forEach((member) => {
        if (member === req.user.handle) {
          isMemberPresent = true;
        }
      });
      if (!isMemberPresent) {
        res.status(400).json({ error: "unauthorized user" });
      } else {
        document
          .update({ messages: admin.firestore.FieldValue.arrayUnion(message) })
          .then(() => {
            res.json({ message: "message successfully send" });
          });
      }
    })
    .catch((err) => {
      res.status(500).json({ error: err.code });
    });
});

// edit groupName
route.put("/:groupId/editName", FBAuth, (req, res) => {
  let document = db.doc(`chats/${req.params.groupId}`);
  let prevName;
  let newName;
  document
    .get()
    .then((doc) => {
      if (doc.data().admin !== req.user.handle) {
        res.status(400).json({ error: "unauthorized user" });
      } else {
        prevName = `${doc.id}{~!@#$%^&*()_+}${doc.data().groupName}`;
        newName = `${doc.id}{~!@#$%^&*()_+}${req.body.groupName}`;
        document.update({ groupName: req.body.groupName }).then(() => {
          res.json({ message: "Group name edited successfully" });
          doc.data().members.forEach((member) => {
            db.doc(`users/${member}`)
              .update({
                groups: admin.firestore.FieldValue.arrayRemove(prevName),
              })
              .then(() => {
                db.doc(`users/${member}`).update({
                  groups: admin.firestore.FieldValue.arrayUnion(newName),
                });
              });
          });
        });
      }
    })
    .catch((err) => {
      res.status(500).json({ error: err.code });
    });
});

// remove participants from group by group admin
route.put("/:groupId/removeMember", FBAuth, (req, res) => {
  let document = db.doc(`chats/${req.params.groupId}`);
  document
    .get()
    .then((doc) => {
      if (doc.data().admin !== req.user.handle) {
        res.status(400).json({ error: "unauthorized user" });
      } else {
        document
          .update({
            members: admin.firestore.FieldValue.arrayRemove(
              req.body.removeMember
            ),
          })
          .then(() => {
            let GroupRemove = `${doc.id}{~!@#$%^&*()_+}${doc.data().groupName}`;
            db.doc(`users/${req.body.removeMember}`)
              .update({
                groups: admin.firestore.FieldValue.arrayRemove(GroupRemove),
              })
              .then(() => {
                res.json({ message: "Member removed successfully" });
              })
              .catch((err) => {
                res.status(403).json("user not found");
              });
          });
      }
    })
    .catch((err) => {
      res.status(500).json({ error: err.code });
    });
});

// leave from group
route.put("/:groupId/leave", FBAuth, (req, res) => {
  let document = db.doc(`chats/${req.params.groupId}`);
  document
    .get()
    .then((doc) => {
      if (doc.data().admin === req.user.handle) {
        db.doc(`screams/${req.params.groupId}`)
          .delete()
          .then(() => {
            res.json({ message: "you successfully left group" });
          });
      } else {
        db.doc(`users/${req.user.handle}`)
          .update({
            groups: admin.firestore.FieldValue.arrayRemove(req.params.groupId),
          })
          .then(() => {
            document
              .update({
                members: admin.firestore.FieldValue.arrayRemove(
                  req.user.handle
                ),
              })
              .then(() => {
                res.json({ message: "you successfully left group" });
              });
          });
      }
    })
    .catch((err) => {
      res.status(500).json(err);
    });
});

module.exports = {
  ChatRoute: route,
};
