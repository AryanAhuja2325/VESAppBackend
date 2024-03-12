const express = require('express');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const router = express.Router();
const { connectToDatabase, handleErrors } = require('../common');

router.use(bodyParser.json());

router.post('/', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Fields cannot be empty" });
    }

    try {
        const client = await connectToDatabase();
        console.log('Connected to MongoDB');

        const users = client.db("database").collection('Users');
        const user = await users.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const hashedPassword = user.password;

        bcrypt.compare(password, hashedPassword, (error, isMatch) => {
            if (isMatch) {
                res.json({ message: "Login successful", user });

            } else {
                return res.status(400).json({ error: "Invalid email or password" });
            }
        });
    } catch (error) {
        handleErrors(res, error)
    }
});

router.post('/getUserByEmail', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: "Email is required" });
    }

    try {
        const client = await connectToDatabase();
        const users = client.db("database").collection('Users');
        const user = await users.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({ user });
    } catch (error) {
        handleErrors(res, error);
    }
});

router.post('/change-password', async (req, res) => {
    const { email, curPass, newPass, confirmPass } = req.body;

    if (!email || !curPass || !newPass || !confirmPass) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        const client = await connectToDatabase();
        console.log('Connected to MongoDB');

        const users = client.db("database").collection('Users');
        const user = await users.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const hashedPassword = user.password;

        bcrypt.compare(curPass, hashedPassword, async (error, isMatch) => {
            if (isMatch) {
                if (newPass === curPass) {
                    return res.status(400).json({ error: "New password cannot be the same as the old password" });
                } else {
                    if (newPass !== confirmPass) {
                        return res.status(400).json({ error: "Passwords do not match" });
                    } else {
                        const saltRounds = 5;
                        try {
                            const newHashedPassword = await new Promise((resolve, reject) => {
                                bcrypt.hash(newPass, saltRounds, (error, hash) => {
                                    if (error) {
                                        reject(error);
                                    } else {
                                        resolve(hash);
                                    }
                                });
                            });

                            await users.updateOne({ email }, { $set: { password: newHashedPassword } });

                            res.json({ message: "Password changed successfully" });
                        } catch (error) {
                            handleErrors(res, error);
                        }
                    }
                }
            } else {
                return res.status(400).json({ error: "Invalid password" });
            }
        });
    } catch (error) {
        handleErrors(res, error);
    }
});

module.exports = router;

