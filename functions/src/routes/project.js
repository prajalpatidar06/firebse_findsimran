const { Router } = require("express");
const route = Router();
const { db } = require("../util/firebase-config");
const FBAuth = require("../util/fbAuth");

// get all projects
route.get("/", (req, res) => {
  db.collection("projects")
    .orderBy("createdAt", "desc")
    .get()
    .then((data) => {
      let projects = [];
      data.forEach((doc) => {
        projects.push({
          projectId: doc.id,
          title: doc.data().title,
          body: doc.data().body,
          url: doc.data().url,
          techUsed: doc.data().techUsed,
          handle: doc.data().handle,
          userImage: doc.data().userImage,
          createdAt: doc.data().createdAt,
        });
      });
      return res.status(201).json(projects);
    })
    .catch((err) => {
      return res.status(500).json({ error: err.code });
    });
});

// get all projects of author
route.get("/:handle", FBAuth, (req, res) => {
  if (req.user.handle !== req.params.handle)
    return res.status(403).json({ error: "unauthorized access" });

  let projectData = [];
  db.collection("projects")
    .where("handle", "==", req.params.handle)
    .orderBy("createdAt", "desc")
    .get()
    .then((docs) => {
      docs.forEach((doc) => {
        projectData.push({
          projectId: doc.id,
          title: doc.data().title,
          body: doc.data().body,
          url: doc.data().url,
          techUsed: doc.data().techUsed,
          handle: doc.data().userHandle,
          userImage: doc.data().userImage,
          createdAt: doc.data().createdAt,
        });
      });
      return res.status(201).json(projectData);
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
});

// post new project
route.post("/", FBAuth, (req, res) => {
  if (req.body.body.length == 1 && req.body.body[0].trim() === "") {
    return res.status(400).json({ body: "Body must not be empty" });
  }
  const newProject = {
    handle: req.user.handle,
    userImage: req.user.imageUrl,
    title: req.body.title,
    body: req.body.body,
    techUsed: req.body.techUsed,
    url: req.body.url,
    createdAt: new Date().toISOString(),
  };
  db.collection("projects")
    .add(newProject)
    .then((doc) => {
      let resProject = newProject;
      resProject.projectId = doc.id;
      res.status(201).json(resProject);
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: "something went wrong" });
    });
});

// update project
route.put("/:projectId", FBAuth, (req, res) => {
  if (req.body.body.length == 1 && req.body.body[0].trim() === "") {
    return res.status(400).json({ body: "Body must not be empty" });
  }

  const newProject = {
    handle: req.user.handle,
    userImage: req.user.imageUrl,
    title: req.body.title,
    body: req.body.body,
    techUsed: req.body.techUsed,
    url: req.body.url,
    createdAt: new Date().toISOString(),
  };

  const document = db.doc(`projects/${req.params.projectId}`);

  document
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "project not found" });
      }
      if (doc.data().handle !== req.user.handle) {
        return res.status(403).json({ error: "unauthorized" });
      } else {
        return document.update(newProject);
      }
    })
    .then((doc) => {
      const resProject = newProject;
      resProject.projectId = doc.id;
      return res.json(resProject);
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: "something went wrong" });
    });
});

// delete project
route.delete("/:projectId", FBAuth, (req, res) => {
  const document = db.doc(`projects/${req.params.projectId}`);
  document
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "project not found" });
      }
      if (doc.data().handle !== req.user.handle) {
        return res.status(403).json({ error: "unauthorized" });
      } else {
        return document.delete();
      }
    })
    .then(() => {
      res.json({ messsage: "project deleted successfully" });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
});

module.exports = {
  ProjectRoute: route,
};
