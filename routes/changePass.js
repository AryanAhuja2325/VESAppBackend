const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const { connectToDatabase, handleErrors } = require('../common');
const { ObjectId } = require('mongodb');

router.post('/', async (req, res) => {
    const { email, curPass, newPass, confirmPass } = req.body;

    try {
        const client = await connectToDatabase();
        const database = client.db('database');
        const collection = database.collection('Users');

        const user = await collection.findOne({ email: email });

        if (!user) {
            res.status(400).json({ error: 'User not found' });
            return;
        }

        bcrypt.compare(curPass, user.password, async (error, isMatch) => {
            if (isMatch) {
                if (newPass === curPass) {
                    res.status(400).json({ error: 'New Password cannot be the same as the old password' });
                } else if (newPass !== confirmPass) {
                    res.status(400).json({ error: 'Passwords do not match' });
                } else {
                    const saltRounds = 5;

                    const newHashedPassword = await bcrypt.hash(newPass, saltRounds);

                    await collection.updateOne({ email: email }, { $set: { password: newHashedPassword } });
                    res.json({ message: 'Password changed' });
                }
            } else {
                res.status(400).json({ error: 'Invalid Password' });
            }
        });
    } catch (error) {
        handleErrors(res, error);
    }
});

module.exports = router;
