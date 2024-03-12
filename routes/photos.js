const express = require('express');
const router = express.Router();
const { connectToDatabase, handleErrors } = require('../common');
const { ObjectId } = require('mongodb');

router.get('/', async (req, res) => {
    try {
        const client = await connectToDatabase();
        const database = client.db("database");
        const collection = database.collection("Photos");

        const selectedItem = req.query.selectedItem;
        const filter = selectedItem ? { imageTitle: selectedItem } : {};

        const fetchedDocuments = await collection.find(filter).toArray();

        const likesData = {};
        const likesSnapshot = await collection.find({}, { projection: { _id: 1, likes: 1 } }).toArray();
        likesSnapshot.forEach((doc) => {
            likesData[doc._id] = doc.likes;
        });

        res.json({ images: fetchedDocuments, likesData });

        client.close();
    } catch (error) {
        handleErrors(error);
    }
});

router.post('/likePost', async (req, res) => {
    const { docId, user } = req.body;

    try {
        const client = await connectToDatabase();
        const database = client.db("database");
        const collection = database.collection("Photos");

        const post = await collection.findOne({ _id: new ObjectId(docId) });
        if (!post) {
            throw new Error('Post does not exist.');
        }

        const likedBy = post.likedBy || [];

        if (!likedBy.includes(user.email)) {
            await collection.updateOne(
                { _id: new ObjectId(docId) },
                {
                    $inc: { likes: 1 },
                    $push: { likedBy: user.email },
                }
            );
            res.json({ message: 'Post liked successfully' });
        } else {
            await collection.updateOne(
                { _id: new ObjectId(docId) },
                {
                    $inc: { likes: -1 },
                    $pull: { likedBy: user.email },
                }
            );
            res.json({ message: 'Post unliked successfully' });
        }

        client.close();
    } catch (error) {
        console.error(error); // Log the error for debugging
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
