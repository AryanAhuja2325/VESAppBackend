const express = require('express');
const router = express.Router();
const { connectToDatabase, handleErrors } = require('../common');

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

module.exports = router;
