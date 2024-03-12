const express = require('express');
const multer = require('multer');
const admin = require('firebase-admin');
const { connectToDatabase, handleErrors } = require('../common');

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images are allowed.'));
        }
    },
});


const serviceAccount = require('../vesapp-e6a7d-firebase-adminsdk-wl00w-4f1b323f14.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

router.post('/upload-data', upload.array('images', 6), async (req, res) => {
    try {
        const client = await connectToDatabase();
        const database = client.db("database");
        const collection = database.collection("Booking");

        const { name, institute, desc, location, timetable, facilities } = req.body;

        const uploadedImages = req.files;
        const uploadedUrls = await Promise.all(uploadedImages.map(uploadImageToFirebase));

        const newBooking = {
            name,
            institute,
            desc,
            location,
            images: uploadedUrls,
        };

        if (timetable) {
            newBooking.timetable = JSON.parse(timetable);
        }

        if (facilities && Array.isArray(facilities)) {
            newBooking.facilities = facilities;
        }

        newBooking.bookings = [];

        const result = await collection.insertOne(newBooking);

        res.json({ success: true, insertedId: result.insertedId });
    } catch (error) {
        console.error('Error uploading data:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});


async function uploadImageToFirebase(image) {
    const bucket = admin.storage().bucket();
    const fileName = `${Date.now()}_${Math.floor(Math.random() * 10000)}.jpg`;
    const file = bucket.file(`images/${fileName}`);

    await file.createWriteStream({
        metadata: { contentType: image.mimetype },
        resumable: false,
    }).end(image.buffer);

    const signedUrl = await file.getSignedUrl({
        action: 'read',
        expires: '03-09-2491',
    });

    return signedUrl[0];
}


module.exports = router;
