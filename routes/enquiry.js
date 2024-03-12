const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const { connectToDatabase, handleErrors } = require('../common');

router.use(bodyParser.json());

router.post('/query', async (req, res) => {
    const { email, queryTypeToSend, description } = req.body;

    if (!email || !queryTypeToSend || !description) {
        return res.status(400).json({ error: 'Fields cannot be empty' });
    }

    try {
        const client = await connectToDatabase();
        const queryCollection = client.db('database').collection('Query');

        const query = {
            Email: email,
            Type: queryTypeToSend,
            Description: description,
        };

        const result = await queryCollection.insertOne(query);

        if (result) {
            res.json({ message: 'Query submitted' });
        } else {
            return res.status(500).json({ error: 'Query submission failed' });
        }
    } catch (err) {
        return handleErrors(res, err);
    }
});

router.post('/feedback', async (req, res) => {
    const { email, description } = req.body;

    if (!email || !description) {
        res.status(400).json({ error: 'Fields cannot be empty' });
        return;
    }

    try {
        const client = await connectToDatabase();
        const database = client.db('database');
        const collection = database.collection('Feedback');

        const feedback = {
            Email: email,
            Description: description
        };

        const result = collection.insertOne(feedback);

        if (result) {
            res.json({ message: "Feedback Sent" });
        }

        else {
            res.status(500).json({ error: 'Feedback submission failed' })
        }
    }
    catch (error) {
        handleErrors(error);
    }

})

module.exports = router;
