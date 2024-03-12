const express = require('express');
const router = express.Router();
const { connectToDatabase, handleErrors } = require('../common');
const { ObjectId } = require('mongodb');
const multer = require('multer');

const admin = require('firebase-admin');
const serviceAccount = require('../vesapp-e6a7d-firebase-adminsdk-wl00w-4f1b323f14.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'vesapp-e6a7d.appspot.com',
});

const storage = admin.storage();


router.get('/getData', async (req, res) => {
    try {
        const client = await connectToDatabase();
        console.log("Connected to Database");

        const db = client.db('database');
        const collection = db.collection('Exams');

        const userType = req.query.loginType;

        let query = {};

        if (!(userType == 'Teacher')) {
            const userInstitute = req.query.institute;
            query = { institute: userInstitute };
        }

        const examSchedule = await collection.find(query).toArray();
        res.json(examSchedule);
    }

    catch (error) {
        handleErrors(res, error);
    }
});

router.delete('/deleteDoc/:postId', async (req, res) => {
    const postId = req.params.postId;
    const client = await connectToDatabase()
    try {
        const db = client.db('database');
        const collection = db.collection('Exams');

        const result = await collection.deleteOne({ _id: new ObjectId(postId) });

        if (result.deletedCount === 1) {
            res.json({ message: 'Post deleted' });
        } else {
            res.status(404).json({ error: 'Post not found' });
        }
    } catch (error) {
        handleErrors(res, error);
    }
});

const storageBucket = 'vesapp-e6a7d.appspot.com';

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
});

router.post('/upload-pdf', upload.single('file'), async (req, res) => {
    try {
        const { uploadedBy, title, institute } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: 'No file provided' });
        }

        const folderPath = 'pdfs';
        const bucket = storage.bucket(storageBucket);
        const fileName = `${folderPath}/${Date.now()}_${file.originalname}`; // Include folder path

        const fileUpload = bucket.file(fileName);
        const blobStream = fileUpload.createWriteStream({
            metadata: {
                contentType: 'application/pdf',
            },
        });

        blobStream.on('error', (error) => {
            console.error('Error uploading to Firebase:', error);
            res.status(500).json({ error: 'Error uploading to Firebase' });
        });

        blobStream.on('finish', async () => {
            const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o/${encodeURIComponent(fileName)}?alt=media`;

            const newExam = {
                uploadedBy,
                uploadedOn: new Date(),
                title,
                institute,
                fileName,
                url: downloadUrl,
            };

            const client = await connectToDatabase();
            const db = client.db('database');
            const collection = db.collection('Exams');
            const result = await collection.insertOne(newExam);

            res.json({ message: 'PDF uploaded successfully!', exam: newExam });
        });

        blobStream.end(file.buffer);
    } catch (error) {
        handleErrors(res, error);
    }
});
module.exports = router;
