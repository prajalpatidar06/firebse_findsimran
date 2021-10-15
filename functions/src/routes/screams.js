const {Router} = require('express')
const route = Router()
const {db} = require('../util/admin')
const FBAuth = require('../util/fbAuth')

route.get('/' , (req,res)=>{
    db.collection('screams')
        .orderBy('createdAt' , 'desc')
        .get()
        .then(data =>{
            let screams = []
            data.forEach(doc => {
                screams.push({
                   screamId: doc.id,
                   handle: doc.data().handle,
                   body: doc.data().body,
                   createdAt: doc.data().createdAt
                })
            });
            return res.status(201).json(screams)
        })
        .catch(err =>{
            console.error(err)
            return res.status(500).json({error: err.code})
        })
})

route.get('/:screamId' , (req , res)=>{
    let screamData = {}
    db.doc(`/screams/${req.params.screamId}`)
        .get()
        .then(doc =>{
            if(!doc.exists)
                return res.status(404).json({error: "scream not found"})
            screamData = doc.data()
            screamData.screamId = doc.id
            return res.status(201).json(screamData)
        })
        .catch(err =>{
            console.error(err)
            return res.status(500).json({error: err.code})
        })
})

route.post('/' , FBAuth , (req,res)=>{
    if (req.body.body.trim() === '') {
        return res.status(400).json({ body: 'Body must not be empty' });
    }

    const newScream = {
        handle: req.user.handle,
        rating: req.user.rating,
        title: req.body.title,
        body: req.body.body,
        requiredSkills: req.body.requiredSkills,
        url: req.body.url,
        createdAt: new Date().toISOString()
    }

    db.collection('screams')
        .add(newScream)
        .then(doc =>{
            const resScream = newScream
            resScream.screamId = doc.id
            return res.json(resScream)
        })
        .catch(err =>{
            console.error(err)
            return res.status(500).json({error: "something went wrong"})
        })
})

route.delete('/:screamId' , FBAuth , (req,res)=>{
    const document = db.doc(`screams/${req.params.screamId}`)
    document
        .get()
        .then(doc =>{
            if(!doc.exists){
                return res.status(404).json({error: "scream not found"})
            }
            if(doc.data().handle !== req.user.handle){
                return res.status(403).json({error: "unauthorized"})
            }
            else{
                return document.delete()
            }
        })
        .then(()=>{
            res.json({messsage: "Scream deleted successfully"})
        })
        .catch(err =>{
            console.error(err)
            return res.status(500).json({error: err.code})
        })
})

route.post('/:screamId/vote' , FBAuth , (req,res)=>{
    if(req.body.comment.trim() === '')
        return res.status(400).json({comment: "Must not be empty"})
    
    const newVote = {
        comment: req.body.comment,
        createdAt: new Date().toISOString(),
        screamId: req.params.screamId,
        handle: req.user.handle,
        collabRequest: false,
        skills: req.body.skills
    }

    db.doc(`screams/${req.params.screamId}`)
        .get()
        .then(doc =>{
            if(!doc.exists){
                return res.status(404).json({error: "Scream not found"})
            }
            return db.collection('votes').add(newVote)
        })
        .then(()=>{
            return res.json(newVote)
        })
        .catch(err =>{
            console.error(err)
            return res.status(500).json({error: err.code})
        })
})


module.exports = {
    ScreamRoute: route
}