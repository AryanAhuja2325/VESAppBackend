const { MongoClient } = require('mongodb');

async function connectToDatabase() {
    const uri = "mongodb+srv://aryan:aryan@cluster0.bd0t9zd.mongodb.net/?retryWrites=true&w=majority";

    const client = new MongoClient(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        ssl: true
    });

    await client.connect();
    console.log('Connected to MongoDB');

    return client;
}

function handleErrors(res, error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
}

module.exports = {
    connectToDatabase,
    handleErrors,
};
