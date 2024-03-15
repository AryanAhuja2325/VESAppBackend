const express = require('express');
const router = express.Router();
const { connectToDatabase, handleErrors } = require('../common');
const { ObjectId } = require('mongodb');

router.get('/', async (req, res) => {
    try {
        const client = await connectToDatabase();
        const database = client.db("database");
        const collection = database.collection("Alumni");
        const data = await collection.find({}).toArray();
        res.json(data);
    } catch (error) {
        handleErrors(res, error);
    }
});



router.post('/add', async (req, res) => {
    try {
        const client = await connectToDatabase();
        const database = client.db("database");
        const collection = database.collection("Alumni");
        const highestIdAlumni = await collection.findOne({}, { sort: { id: -1 }, limit: 1 });

        const nextId = highestIdAlumni ? parseInt(highestIdAlumni.id) + 1 : 1;
        const name = req.body.name
        const already = await collection.findOne({ name });

        if (already) {
            res.status(400).json("Already Exists")
        }
        else {
            const data = { ...req.body, id: nextId.toString() };
            collection.insertOne(data);
            res.status(200).json("Data added successfully");
        }
    } catch (error) {
        handleErrors(res, error);
    }
});


module.exports = router;
