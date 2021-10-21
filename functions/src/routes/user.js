const {admin , db} = require('../util/admin')
const config = require('../util/config')
const {Router} = require('express')
const firebase = require('firebase')
firebase.initializeApp(config)
const route = Router()
const {
    validateSignupData,
    validateLogindata,
    reduceUserDetails
} = require('../util/validators')
const FBAuth = require('../util/fbAuth')

// user registration
route.post('/signup', (req,res)=>{
    const newUser = {
        email: req.body.email,
        handle: req.body.handle,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword
    }

    const {errors , valid} = validateSignupData(newUser)
    if(!valid) return res.status(403).json(errors)

    let token , userId
    db.doc(`/users/${newUser.handle}`)
        .get()
        .then(doc =>{
            if(doc.exists)
                return res.status(400).json({handle: "this handle is already taken"})
            return firebase
                .auth()
                .createUserWithEmailAndPassword(newUser.email , newUser.password)
        })
        .then(data =>{
            userId = data.user.uid
            return data.user.getIdToken()
        })
        .then(idToken =>{
            token = idToken
            const userCredentials = {
                handle: newUser.handle,
                email: newUser.email,
                rating:0,
                createdAt: new Date().toISOString(),
                userId
            }
            return db.doc(`/users/${newUser.handle}`).set(userCredentials)
        })
        .then(()=>{
            return res.status(201).json({token})
        })
        .catch(err =>{
            if(err.code === 'auth/email-already-in-use')
                return res.status(400).json({email: "Email already in use"})
            else
                console.status(500).json({error: "Something went wrong , Please try again later"})
        })
})

// user login
route.post('/login' , (req,res)=>{
    const user = {
        email: req.body.email,
        password: req.body.password
    }
    const {valid , errors} = validateLogindata(user)
    if(!valid) return res.status(400).json(errors)

    firebase
        .auth()
        .signInWithEmailAndPassword(user.email, user.password)
        .then(data =>{
            return data.user.getIdToken()
        })
        .then(token =>{
            res.json({token})
        })
        .catch(err =>{
            console.error(err)
            return res.status(403).json({general: "Wrong credentails, please try again later"})
        })
})

// get other users handle details
route.get('/:handle' , (req,res)=>{
    let userData = {}
    db.doc(`/users/${req.params.handle}`)
        .get()
        .then(doc =>{
            if(doc.exists){
                userData = doc.data()
                return db
                    .collection('screams')
                    .where('handle','==',req.params.handle)
                    .get()
            }
            else{
                return res.status(400).json({error: "user not found"})
            }
        })
        .then(data =>{
            userData.screams = []
            data.forEach(doc => {
                userData.screams.push({
                    title: doc.data().title,
                    body: doc.data().body,
                    createdAt: doc.data().createdAt,
                    handle: doc.data().authorHandle,
                    rating:doc.data().rating,
                    requireSkills: doc.data().requireSkills,
                    url: doc.data().url,
                    screamId: doc.id
                })
            });
            return res.json(userData)
        })
        .then(err =>{
            console.error(err)
            return res.status(500).json({error: err.code})
        })
})

// edit Author details
route.post('/' , FBAuth , (req,res)=>{
    let userDetails = reduceUserDetails(req.body)
    db.doc(`/users/${req.user.handle}`)
        .update(userDetails)
        .then(()=>{
            return res.json({message: "Details added successfully"})
        })
        .catch(err =>{
            console.error(err)
            return res.status(500).json({error: err.code})
        })
})

// get Author details
route.get('/' , FBAuth , (req , res)=>{
    let userData = {}
    db.doc(`users/${req.user.handle}`)
        .get()
        .then(doc =>{
            if(doc.exists){
                userData.credentials = doc.data()
                return db
                    .collection('notifications')
                    .where('recipient','==',req.user.handle)
                    .get()
            }
        })
        .then(data =>{
            userData.notifications = []
            data.forEach(doc => {
                userData.notifications.push({
                    recipient: doc.data().recipient,
                    sender: doc.data().sender,
                    read: doc.data().read,
                    type: doc.data().type,
                    screamId: doc.data().screamId,
                    createdAt: doc.data().createdAt,
                    notificationId: doc.id
                })
            });
            return res.json(userData)
        })
        .catch(err =>{
            console.error(err)
            return res.status(500).json({error: err.code})
        })
})

// Mark notification Read
route.post('/notifications', FBAuth , (req,res)=>{
    let batch = db.batch()
    req.body.forEach((notificationId)=>{
        const notification = db.doc(`notifications/${notificationId}`)
            batch.update(notification , {read:true})
    })
    batch
        .commit()
        .then(()=>{
            return res.json({message: "Notifications marked read"})
        })
        .catch(err =>{
            console.error(err);
            return res.status(500).json({error: err.code})
        })
})

module.exports = {
    UserRoute: route
}

