const {Router} = require('express')
const route = Router()
const {db} = require('../util/admin')

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

route.post('/' , (req,res)=>{
    const newScream = {
        handle: req.body.handle,
        body: req.body.body,
        createdAt: new Date().toISOString()
    }

    db.collection('screams')
        .add(newScream)
        .then(doc =>{
            return res.json({message: `${doc.id} created successfully`})
        })
        .catch(err =>{
            console.error(err)
            return res.status(500).json({error: "something went wrong"})
        })
})


module.exports = {
    ScreamRoute: route
}