const functions = require("firebase-functions");
const express = require('express')
const app = express()
const {ScreamRoute} = require('./src/routes/screams')
const {UserRoute} = require('./src/routes/user')

app.use('/screams', ScreamRoute)
app.use('/user' , UserRoute)


exports.api = functions.region('asia-east1').https.onRequest(app)
