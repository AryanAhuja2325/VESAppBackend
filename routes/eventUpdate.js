const express = require('express');
const router = express.Router();
const { connectToDatabase, handleErrors } = require('../common');

router.get('/', async (req, res) => {
    try {
        const client = await connectToDatabase();
        const database = client.db("database");
        const collection = database.collection("EventUpdate");

        const currentDate = new Date();
        const activeEvents = await collection.find({ Eventdate: { $gt: currentDate } }).toArray();

        res.json(activeEvents);
    } catch (error) {
        handleErrors(res, error);
    }
});


router.post('/addEvent', async (req, res) => {
    const { Title, Desc, Image, Eventdate } = req.body;
    try {
        const client = await connectToDatabase();
        const database = client.db("database");
        const collection = database.collection('EventUpdate');

        const event = {
            Title,
            Desc,
            Image,
            Eventdate: new Date(Eventdate),
            Date: new Date()
        };

        const result = await collection.insertOne(event);

        if (result) {
            res.json({ message: "Event added successfully" });
        }

        else {
            res.status(500).json({ error: 'Error adding event' });
        }
    }
    catch (error) {
        handleErrors(error);
    }
})

router.get('/completed', async (req, res) => {
    try {
        const client = await connectToDatabase();
        const database = client.db("database");
        const collection = database.collection("EventUpdate");

        const currentDate = new Date();
        const completedEvents = await collection.find({ Eventdate: { $lte: currentDate } }).toArray();

        res.json(completedEvents);
    } catch (error) {
        handleErrors(res, error);
    }
});

module.exports = router;
