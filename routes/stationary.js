const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();
const { connectToDatabase, handleErrors } = require('../common');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'ahujaaryan2511@gmail.com',
        pass: 'qvsv nigy zuwg crzn',
    },
});

router.get('/products', async (req, res) => {
    try {
        const client = await connectToDatabase();
        const database = client.db("database");
        const collection = database.collection("Products");
        const data = await collection.find({}).toArray();
        res.json(data);
    } catch (error) {
        handleErrors(res, error);
    }
});

router.get('/orders/:email', async (req, res) => {
    const userEmail = req.params.email;

    try {
        const client = await connectToDatabase();
        const database = client.db("database");
        const collection = database.collection("Orders");
        const data = await collection.find({ email: userEmail }).toArray();
        res.json(data);
    } catch (error) {
        handleErrors(res, error);
    }
});

router.get('/allOrders', async (req, res) => {

    try {
        const client = await connectToDatabase();
        const database = client.db("database");
        const collection = database.collection("Orders");
        const data = await collection.find({}).toArray();
        res.json(data);
    } catch (error) {
        handleErrors(res, error);
    }
});

router.post('/addProduct', async (req, res) => {
    const productData = req.body;

    try {
        const client = await connectToDatabase();
        const db = client.db('database');
        const productsCollection = db.collection('Products');

        const highestProdId = await productsCollection.find().sort({ prodId: -1 }).limit(1).toArray();
        productData.prodId = highestProdId.length > 0 ? highestProdId[0].prodId + 1 : 1;

        if (productData.discount) {
            productData.prodPrice = (productData.mrp - productData.discount).toString();
        }

        productData.availQty = parseInt(productData.availQty);

        const result = await productsCollection.insertOne(productData);

        if (result) {
            res.json({ message: 'Product added successfully' });
        } else {
            res.status(500).json({ error: 'Product addition failed' });
        }
    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/placeOrder', async (req, res) => {
    const orderData = req.body;

    try {
        const client = await connectToDatabase();
        const db = client.db('database');
        const ordersCollection = db.collection('Orders');
        const productsCollection = db.collection('Products');

        orderData.date = new Date();

        const result = await ordersCollection.insertOne(orderData);

        if (result) {
            for (const item of orderData.items) {
                const product = await productsCollection.findOne({ prodId: item.productId });
                console.log('Product before update:', product);

                await productsCollection.updateOne(
                    { prodId: parseInt(item.id) },
                    { $inc: { availQty: -item.qty } }
                );

                const updatedProduct = await productsCollection.findOne({ prodId: item.productId });
                console.log('Product after update:', updatedProduct);
            }

            res.json({ message: 'Order placed successfully' });

            const mailOptions = {
                from: 'ahujaaryan2511@gmail.com',
                to: 'vendor@gmail.com',
                subject: 'Order Placed Confirmation',
                text: `Order for ${orderData.itemCount} items has been placed by ${orderData.name}.`,
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error('Error sending email:', error);
                } else {
                    console.log('Email sent:', info.response);
                }
            });
        } else {
            res.status(500).json({ error: 'Order placement failed' });
        }
    } catch (error) {
        console.error('Error placing order:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


module.exports = router;
