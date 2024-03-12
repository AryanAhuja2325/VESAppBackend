const express = require('express');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const router = express.Router();
const { connectToDatabase, handleErrors } = require('../common');

router.use(bodyParser.json());

router.post('/', async (req, res) => {
    const {
        email,
        password,
        confirmPassword,
        firstName,
        lastName,
        gender,
        phoneNo,
        loginType,
        isVerified,
        grNo,
        address,
        child,
    } = req.body;


    const client = await connectToDatabase();
    const usersCollection = client.db('database').collection('Users');
    const existingUser = await usersCollection.findOne({ email });

    if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
    }

    const saltRounds = 5;
    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const user = {
            email,
            password: hashedPassword,
            firstName,
            lastName,
            gender,
            phoneNo,
            loginType,
            grNo,
            address,
            child: loginType === 'Parent' ? child : null,
            isVerified,
        };

        const result = await usersCollection.insertOne(user);

        if (result) {
            console.log('Insert Result:', result);
            return res.status(200).json({ message: 'User Created Successfully' })
        } else {
            console.log('Result is undefined');
            return res.status(500).json({ error: 'User creation failed' });
        }

    } catch (err) {
        return handleErrors(res, err);
    }
});

module.exports = router;
