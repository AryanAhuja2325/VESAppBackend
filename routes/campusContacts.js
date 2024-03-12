const express = require('express');
const router = express.Router();
const { connectToDatabase, handleErrors } = require('../common');

router.get('/', async (req, res) => {
    try {
        const client = await connectToDatabase();
        const database = client.db('database');
        const collection = database.collection('CampusContacts');
        const data = await collection.find({}).toArray();

        res.json(data)
    } catch (error) {

    }
})

router.post('/addContact', async (req, res) => {
    try {
        const { name, phoneNo, title, branch, mail, institute, photo } = req.body;

        if (!name || !phoneNo || !title || !mail || !institute || !photo) {
            return res.status(400).json({ message: 'All fields (except branch) are required.' });
        }

        const client = await connectToDatabase();
        const database = client.db('database');
        const collection = database.collection('CampusContacts');

        const data = await collection.findOne({ name });

        if (data) {
            res.status(400).json({ message: "Contact already exists" });
        } else {
            const newData = {
                name,
                phoneNo,
                title,
                mail,
                institute,
                photo,
            };

            if (branch) {
                newData.branch = branch;
            }

            await collection.insertOne(newData);

            res.status(201).json({ message: 'Data added successfully.' });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


module.exports = router;