const express = require('express');
const router = express.Router();
const { connectToDatabase, handleErrors } = require('../common');
const { ObjectId } = require('mongodb');

router.get('/:classroom/:date', async (req, res) => {
    const { classroom, date } = req.params;
    try {
        const startDate = new Date(date);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59);

        const client = await connectToDatabase();
        const database = client.db('database');
        const collection = database.collection('Classroom');

        const result = await collection
            .find({
                classroom,
                currentTime: { $gte: startDate, $lte: endDate }
            })
            .toArray();

        res.json(result);
    } catch (error) {
        handleErrors(res, error);
    }
});

router.get('/viewAsTeacher/:email/:date', async (req, res) => {
    const { email, date } = req.params;
    try {
        const startDate = new Date(date);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59);

        const client = await connectToDatabase();
        const database = client.db('database');
        const collection = database.collection('Classroom');

        const result = await collection
            .find({
                currentTime: { $gte: startDate, $lte: endDate },
                email
            })
            .toArray();

        res.json(result);
    } catch (error) {
        handleErrors(res, error);
    }
});

router.post('/addAttendance', async (req, res) => {
    const attendanceData = req.body;

    // Convert the timestamp in currentTime to a Date object
    attendanceData.currentTime = new Date(attendanceData.currentTime);

    try {
        const client = await connectToDatabase();
        const database = client.db('database');
        const collection = database.collection('Classroom');

        await collection.insertOne(attendanceData);

        res.status(200).json({ message: 'Attendance data added successfully' });
    } catch (error) {
        console.error('Error adding attendance data: ', error);
        res.status(500).json({ error: 'Failed to add attendance data' });
    }
});



module.exports = router;