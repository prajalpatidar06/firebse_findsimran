const functions = require("firebase-functions");
const express = require('express')
const app = express()
const {db} = require('./src/util/admin')
const {ScreamRoute} = require('./src/routes/screams')
const {UserRoute} = require('./src/routes/user')

app.use('/screams', ScreamRoute)
app.use('/user' , UserRoute)


exports.api = functions.region('asia-east1').https.onRequest(app)

exports.createNotificationOnVote = functions.region('asia-east1').firestore.document('votes/{id}')
.onCreate((snapshot , context) =>{
    return db.doc(`/screams/${snapshot.data().screamId}`).get()
    .then(doc =>{
        if(doc.exists){
            return db.doc(`notifications/${context.params.id}`).set({
                    recipient: doc.data().handle,
                    sender: snapshot.data().handle,
                    read: false,
                    type: 'vote',
                    screamId: snapshot.data().screamId,
                    createdAt: new Date().toISOString()
                })
        }
    })
    .catch(err =>{
        console.error(err)
    })
})

exports.createNotificationOnCollab = functions.region('asia-east1').firestore.document('votes/{id}')
.onUpdate((snapshot , context) =>{
   const data = snapshot.after.data()
   return db.doc(`/screams/${data.screamId}`)
   .get()
   .then(doc =>{
       if(doc.exists && data.collabRequest == true){
           return db.doc(`notifications/${data.screamId}`).set({
               recipient: data.handle,
               sender: doc.data().handle,
               type: "collaboration",
               read: false,
               screamId: doc.id
           })
       }
   })
   .catch(err =>{
       console.log(err)
   })
})

exports.onScreamDelete =functions.region('asia-east1').firestore.document('screams/{screamId}')
.onDelete((snapshot,context)=>{
    const screamId = context.params.screamId
    const batch  = db.batch()
    return db.collection('votes')
        .where('screamId','==',screamId)
        .get()
        .then(data =>{
            data.forEach(doc => {
                batch.delete(db.doc(`/votes/${doc.id}`))
            });
            return db.collection('notifications')
                .where('screamId','==',screamId)
                .get()
        })
        .then(data =>{
            data.forEach(doc => {
                batch.delete(db.doc(`/notifications/${doc.id}`))
            });
            return batch.commit()
        })
        .catch(err =>{
            console.log(err)
        })
})

exports.onUserImageChange = functions.region('asia-east1').firestore.document('users/{userId}')
.onUpdate((snapshot , context)=>{
    if(snapshot.before.data().imageUrl !== snapshot.after.data().imageUrl){
        console.log('image has changed')
        const batch = db.batch()
        return db.collection('screams')
            .where('handle' , '==' , context.params.userId)
            .get()
            .then(data =>{
                data.forEach(doc =>{
                    const scream = db.doc(`/screams/${doc.id}`)
                    batch.update(scream , {userImage: snapshot.after.data().imageUrl})
                })
                return db.collection('votes')
                    .where('handle','==',context.params.userId)
                    .get()
            })
            .then(data =>{
                data.forEach(doc =>{
                    const scream = db.doc(`/votes/${doc.id}`)
                    batch.update(scream , {userImage: snapshot.after.data().imageUrl})
                })
                return batch.commit()
            })
    }
    else return true
})