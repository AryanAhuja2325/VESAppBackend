const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const { connectToDatabase, handleErrors } = require('../common');
const { ObjectId } = require('mongodb');

router.get('/', async (req, res) => {
    try {
        const client = await connectToDatabase();
        const database = client.db("database");
        const collection = database.collection("Blog");
        const data = await collection.find({}).toArray();
        res.json(data);
    } catch (error) {
        handleErrors(res, error);
    }
});

router.delete('/deletePost/:postId', async (req, res) => {
    const postId = req.params.postId;
    const client = await connectToDatabase()
    try {
        const db = client.db('database');
        const collection = db.collection('Blog');

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

router.post('/likePost', async (req, res) => {
    const { postId, userEmail, isLiked } = req.body;
    const client = await connectToDatabase();

    try {
        const db = client.db('database');
        const collection = db.collection('Blog');

        const post = await collection.findOne({ _id: new ObjectId(postId) });

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        const likedBy = post.likedBy || [];

        if (isLiked) {
            if (!likedBy.includes(userEmail)) {
                likedBy.push(userEmail);
                await collection.updateOne(
                    { _id: new ObjectId(postId) },
                    { $set: { likedBy, likes: post.likes + 1 } }
                );
            }
        } else {
            if (likedBy.includes(userEmail)) {
                likedBy.splice(likedBy.indexOf(userEmail), 1);
                await collection.updateOne(
                    { _id: new ObjectID(postId) },
                    { $set: { likedBy, likes: post.likes - 1 } }
                );
            }
        }

        res.json({ message: 'Like action successful' });
    } catch (error) {
        handleErrors(res, error);
    }
});

router.get('/postDetails/:postId', async (req, res) => {
    const postId = req.params.postId;
    const client = await connectToDatabase();
    try {
        const db = client.db('database');
        const collection = db.collection('Blog');
        const post = await collection.findOne({ _id: new ObjectId(postId) });

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        const commentsData = post.comments || [];
        const commentsReceived = commentsData.sort(
            (a, b) => b.commentedOn - a.commentedOn
        );

        res.json({
            post: post,
            comments: commentsReceived,
        });
    } catch (error) {
        handleErrors(res, error)
    }
});

router.post('/addComment', async (req, res) => {
    const { postId, comment, user } = req.body;
    const client = await connectToDatabase();
    try {
        const db = client.db('database');
        const collection = db.collection('Blog');

        const blogPost = await collection.findOne({ _id: new ObjectId(postId) });

        if (!blogPost) {
            res.status(404).json({ error: 'Blog post not found' });
            return;
        }

        const commentObject = {
            text: comment,
            commentedOn: new Date(),
            commentedBy: {
                email: user.email,
                name: `${user.firstName} ${user.lastName}`,
            },
        };

        await collection.updateOne(
            { _id: new ObjectId(postId) },
            { $push: { comments: commentObject } }
        );

        res.json({ message: 'Comment added successfully' });
    } catch (error) {
        handleErrors(error);
    }
});

module.exports = router;
