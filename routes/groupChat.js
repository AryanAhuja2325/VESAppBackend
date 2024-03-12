const express = require('express');
const router = express.Router();
const { connectToDatabase, handleErrors } = require('../common');

router.get('/', async (req, res) => {
    try {
        const client = await connectToDatabase();
        const database = client.db('database');
        const collection = database.collection('GroupChat');

        const fetchedMessages = await collection.find({}).sort({ createdAt: 1 }).toArray();
        res.json(fetchedMessages);
    } catch (error) {
        handleErrors(res, error)
    }
});

router.post('/sendMessage', async (req, res) => {
    const { user, text, uname } = req.body;

    if (text.trim() === '') {
        res.status(400).json({ error: 'Message cannot be empty' });
        return;
    }

    try {
        const client = await connectToDatabase();
        const database = client.db('database')
        const groupChatCollection = database.collection('GroupChat');

        const currentTime = new Date();
        const message = text.trim();
        const name = uname;

        const newMessage = {
            name,
            email: user,
            text: message,
            createdAt: currentTime,
        };

        const result = await groupChatCollection.insertOne(newMessage);

        if (result) {
            res.json({ message: 'Message sent successfully' });
        } else {
            res.status(500).json({ error: 'Error sending message' });
        }
    } catch (error) {
        handleErrors(error);
    }
});

module.exports = router;
