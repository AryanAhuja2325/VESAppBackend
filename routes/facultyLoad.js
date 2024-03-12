const express = require('express');
const router = express.Router();
const { connectToDatabase, handleErrors } = require('../common');

router.get('/', async (req, res) => {
    try {
        const client = await connectToDatabase();
        console.log('Connected to MongoDB');

        const database = client.db('database');
        const collection = database.collection('FacultyLoad');
        const userFirstName = req.query.firstName;
        const query = { teacherName: userFirstName };
        const facultyLoadData = await collection.find(query).toArray();
        res.json(facultyLoadData);
    } catch (error) {
        handleErrors(res, error)
    }
});

module.exports = router;
