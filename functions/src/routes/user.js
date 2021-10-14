const {admin , db} = require('../util/admin')
const config = require('../util/config')
const {Router} = require('express')
const firebase = require('firebase')
firebase.initializeApp(config)
const route = Router()
const {validateSignupData} = require('../util/validators')

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


module.exports = {
    UserRoute: route
}

