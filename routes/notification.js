const express = require('express');
const router = express.Router();
const { connectToDatabase, handleErrors } = require('../common');
const { MongoClient } = require('mongodb');
const nodemailer = require('nodemailer');


const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: 'ahujaaryan2511@gmail.com',
        pass: 'qvsv nigy zuwg crzn',
    },
    disableFileAccess: true,
    disableUrlAccess: true,
    dsn: false,
});


const findMaxId = async () => {
    const client = await connectToDatabase();
    const database = client.db('database');
    const notificationsCollection = database.collection('Notifications');
    const result = await notificationsCollection.findOne({}, { sort: { id: -1 } });
    return result ? result.id : 0;
};

const insertNotification = async (notification) => {
    const nextId = await findMaxId() + 1;

    const newNotification = {
        date: new Date(),
        title: notification.title,
        link: notification.link,
        desc: notification.desc,
        id: nextId,
    };

    const client = await connectToDatabase();
    const database = client.db('database');
    const notificationsCollection = database.collection('Notifications');
    await notificationsCollection.insertOne(newNotification);

    const users = await fetchUsersFromDatabase();
    for (const user of users) {
        const mailOptions = {
            from: 'ahujaaryan2511@gmail.com',
            to: user.email,
            subject: title,
            text: `${desc} \n ${link}`,
        };

        await transporter.sendMail(mailOptions);
    }
};

const fetchUsersFromDatabase = async () => {
    try {
        const client = await connectToDatabase();
        const database = client.db('database');
        const collection = database.collection('Users');

        const users = collection.find({}).toArray();
        return users;
    } catch (error) {
        console.log(error)
    }
};

router.get('/', async (req, res) => {
    try {
        const client = await connectToDatabase();
        const database = client.db("database");
        const collection = database.collection("Notifications");
        const data = await collection.find({}).toArray();
        res.json(data);
    } catch (error) {
        handleErrors(res, error);
    }
});

router.post('/add-notification', async (req, res) => {
    try {
        const notificationData = req.body;
        await insertNotification(notificationData);
        res.json({ success: true, message: 'Notification added successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
