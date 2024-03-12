const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const { connectToDatabase, handleErrors } = require('../common');
const { ObjectId } = require('mongodb');
const nodemailer = require('nodemailer');

router.use(bodyParser.json());

router.get('/', async (req, res) => {
    try {
        const client = await connectToDatabase();
        const database = client.db('database');
        const collection = database.collection('Booking');

        const data = await collection.find({}).toArray();

        res.json(data);
    }
    catch (error) {
        handleErrors(res, error);
    }
})

const moment = require('moment');

const getPrincipal = async (insti) => {
    try {
        const client = await connectToDatabase();
        const database = client.db('database');
        const collection = database.collection('Users');

        const data = await collection.findOne({ institute: insti, loginType: 'Principal' });

        return data;
    } catch (error) {
        console.log(error);
    }
}

router.post('/bookRequest/:id', async (req, res) => {
    try {
        const client = await connectToDatabase();
        console.log('Connected to MongoDB');

        const database = client.db('database');
        const collection = database.collection('Booking');

        const bookingId = req.params.id;

        const bookingData = await collection.findOne({ _id: new ObjectId(bookingId) });

        if (!bookingData) {
            res.status(404).json({ error: 'Booking not found' });
            return;
        }

        const requestData = req.body;

        const selectedDate = new Date(`${Object.keys(requestData.selectedDates)[0]}T00:00:00.000Z`);
        const selectedDateUTC = new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000);

        const selectedItems = requestData.selectedItems;

        const conflicts = selectedItems.some((timeSlot) => {
            const formattedStartTime = moment(`${selectedDate.toISOString().split('T')[0]} ${timeSlot.start}`, 'YYYY-MM-DD h:mm A');
            const formattedEndTime = moment(`${selectedDate.toISOString().split('T')[0]} ${timeSlot.end}`, 'YYYY-MM-DD h:mm A');

            return bookingData.bookings.some((existingBooking) => {
                const existingStartTime = moment(existingBooking.time.startTime);
                const existingEndTime = moment(existingBooking.time.endTime);

                return (
                    formattedStartTime.isBefore(existingEndTime) && formattedEndTime.isAfter(existingStartTime)
                );
            });
        });

        if (!conflicts) {
            const mergedBooking = selectedItems.reduce((merged, timeSlot) => {
                const formattedStartTime = moment(`${selectedDateUTC.toISOString().split('T')[0]} ${timeSlot.start}`, 'YYYY-MM-DD h:mm A');
                const formattedEndTime = moment(`${selectedDateUTC.toISOString().split('T')[0]} ${timeSlot.end}`, 'YYYY-MM-DD h:mm A');

                let newStartTime, newEndTime;

                if (merged.time && merged.time.startTime) {
                    newStartTime = formattedStartTime.isBefore(merged.time.startTime) ? formattedStartTime.toDate() : merged.time.startTime;
                } else {
                    newStartTime = formattedStartTime.toDate();
                }

                if (merged.time && merged.time.endTime) {
                    newEndTime = formattedEndTime.isAfter(merged.time.endTime) ? formattedEndTime.toDate() : merged.time.endTime;
                } else {
                    newEndTime = formattedEndTime.toDate();
                }

                return {
                    bookedBy: requestData.user.email,
                    date: new Date(selectedDate),
                    time: {
                        startTime: newStartTime,
                        endTime: newEndTime,
                    },
                    bookedOn: new Date(),
                    bookingId: requestData.bookingId,
                    status: "Pending",
                    userInstitute: requestData.userInstitute,
                    bookingInstitute: requestData.bookingInstitute
                };
            }, { time: {} });

            const updatedBookings = bookingData.bookings.filter((existingBooking) => {
                const existingStartTime = moment(existingBooking.time.startTime);
                const existingEndTime = moment(existingBooking.time.endTime);

                const mergedStartTime = moment(mergedBooking.time.startTime);
                const mergedEndTime = moment(mergedBooking.time.endTime);

                return !(mergedEndTime.isBefore(existingStartTime) || mergedStartTime.isAfter(existingEndTime));
            });

            updatedBookings.push(mergedBooking);

            await collection.updateOne(
                { _id: new ObjectId(bookingId) },
                { $push: { bookings: mergedBooking } }
            );


            const user = await database.collection('Users').findOne({ email: requestData.user.email });
            const name = `${user.firstName} ${user.lastName}`
            const booking = {
                bookedBy: name,
                id: requestData.bookingId,
                venue: bookingData.name,
                date: mergedBooking.date.toLocaleDateString(),
            }
            const instiPrincipal = await getPrincipal(requestData.userInstitute)
            res.json({ message: 'Request Sent Successfully' });
            sendConfirmationEmailToPrincipal(bookingId, booking, instiPrincipal, 'new_request');
            sendConfirmationToUser(booking, requestData.user.email, 'new_request');
        } else {
            res.status(409).json({ error: 'Booking conflicts found. Please choose a different time slot.' });
        }
    } catch (error) {
        handleErrors(res, error);
    }
});


router.get('/approvalRequests/:institute', async (req, res) => {
    try {
        const client = await connectToDatabase();
        const database = client.db('database');
        const collection = database.collection('Booking');
        const institute = req.params.institute;

        const data = await collection.aggregate([
            {
                $match: {
                    'bookings.userInstitute': institute,
                },
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    location: 1,
                    bookings: {
                        $filter: {
                            input: '$bookings',
                            as: 'booking',
                            cond: {},
                        },
                    },
                },
            },
        ]).toArray();

        res.json(data);
    } catch (error) {
        handleErrors(res, error);
    }
});

router.get('/confirmationRequests/:institute', async (req, res) => {
    try {
        const client = await connectToDatabase();
        const database = client.db('database');
        const collection = database.collection('Booking');
        const institute = req.params.institute;

        const data = await collection.aggregate([
            {
                $match: {
                    'bookings.bookingInstitute': institute,
                },
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    location: 1,
                    bookings: {
                        $filter: {
                            input: '$bookings',
                            as: 'booking',
                            cond: {},
                        },
                    },
                },
            },
        ]).toArray();

        res.json(data);
    } catch (error) {
        handleErrors(res, error);
    }
});

router.post('/approveBooking/:id', async (req, res) => {
    try {
        const client = await connectToDatabase();
        const database = client.db('database');
        const collection = database.collection('Booking');

        const bookingId = req.params.id;
        const { bookingId: targetBookingId } = req.body;

        await collection.updateOne(
            { _id: new ObjectId(bookingId), 'bookings.bookingId': targetBookingId },
            { $set: { 'bookings.$.status': 'Approved' } }
        );

        const bookingDetails = await collection.findOne(
            { _id: new ObjectId(bookingId), 'bookings.bookingId': targetBookingId },
            { 'bookings.$': 1 }
        );


        sendConfirmationToUser(bookingDetails.bookings[0], bookingDetails.bookings[0].user, 'approved');

        const instiPrincipal = await getPrincipal(bookingDetails.bookings[0].userInstitute);

        sendConfirmationEmailToPrincipal(bookingId, bookingDetails.bookings[0], instiPrincipal, 'approved');

        const bookingPrincipal = await getPrincipal(bookingDetails.bookings[0].bookingInstitute);

        sendConfirmationEmailToPrincipal(bookingId, bookingDetails.bookings[0], bookingPrincipal, 'approved');

        res.json({ message: 'Booking confirmed successfully.' });
    } catch (error) {
        console.error('Error in /approveBooking:', error);
        handleErrors(res, error);
    }
});


router.post('/confirmBooking/:id', async (req, res) => {
    try {
        const client = await connectToDatabase();
        const database = client.db('database');
        const collection = database.collection('Booking');

        const bookingId = req.params.id;
        const { bookingId: targetBookingId } = req.body;

        await collection.updateOne(
            { _id: new ObjectId(bookingId), 'bookings.bookingId': targetBookingId },
            { $set: { 'bookings.$.status': 'Confirmed' } }
        );

        const bookingDetails = await collection.findOne(
            { _id: new ObjectId(bookingId), 'bookings.bookingId': targetBookingId },
            { 'bookings.$': 1 }
        );

        if (!bookingDetails || !bookingDetails.bookings || !bookingDetails.bookings[0]) {
            console.error('Booking details are undefined or missing properties.');
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }

        res.json({ message: 'Booking confirmed successfully.' });

        sendConfirmationToUser(bookingDetails.bookings[0], bookingDetails.bookings[0].user, 'confirmed');

        const instiPrincipal = await getPrincipal(bookingDetails.bookings[0].userInstitute);
        if (instiPrincipal) {
            sendConfirmationEmailToPrincipal(bookingId, bookingDetails.bookings[0], instiPrincipal, 'confirmed');
        } else {
            console.error('Institute Principal details are undefined.');
        }

        const bookingPrincipal = await getPrincipal(bookingDetails.bookings[0].bookingInstitute);
        if (bookingPrincipal) {
            sendConfirmationEmailToPrincipal(bookingId, bookingDetails.bookings[0], bookingPrincipal, 'confirmed');
        } else {
            console.error('Booking Principal details are undefined.');
        }

        sendConfirmationEmailToAdmin(bookingDetails.bookings[0]);
    } catch (error) {
        handleErrors(res, error);
    }
});


router.post('/rejectBooking/:id', async (req, res) => {
    try {
        const client = await connectToDatabase();
        const database = client.db('database');
        const collection = database.collection('Booking');

        const bookingId = req.params.id;
        const { bookingId: targetBookingId } = req.body;

        await collection.updateOne(
            { _id: new ObjectId(bookingId), 'bookings.bookingId': targetBookingId },
            { $set: { 'bookings.$.status': 'Rejected' } }
        );

        const bookingDetails = await collection.findOne(
            { _id: new ObjectId(bookingId), 'bookings.bookingId': targetBookingId },
            { 'bookings.$': 1 } // Projection to get only the rejected booking
        );

        res.json({ message: 'Booking rejected successfully.' });

        sendConfirmationToUser(bookingDetails.bookings[0], bookingDetails.name, 'rejected');

        const instiPrincipal = await getPrincipal(bookingDetails.bookings[0].userInstitute);
        sendConfirmationEmailToPrincipal(bookingId, bookingDetails.bookings[0], instiPrincipal, 'rejected');

        const bookingPrincipal = await getPrincipal(bookingDetails.bookings[0].bookingInstitute);
        sendConfirmationEmailToPrincipal(bookingId, bookingDetails.bookings[0], bookingPrincipal, 'rejected');
    } catch (error) {
        handleErrors(res, error);
    }
});

router.get('/userBookings/:email', async (req, res) => {
    try {
        const client = await connectToDatabase();
        const database = client.db('database');
        const collection = database.collection('Booking');

        const userEmail = req.params.email;

        const userBookings = await collection.aggregate([
            {
                $match: {
                    'bookings.bookedBy': userEmail,
                },
            },
            {
                $project: {
                    _id: 0,
                    name: 1,
                    location: 1,
                    bookings: {
                        $filter: {
                            input: '$bookings',
                            as: 'booking',
                            cond: {
                                $and: [
                                    { $eq: ['$$booking.bookedBy', userEmail] },
                                ]
                            },
                        },
                    },
                },
            },
        ]).toArray();

        res.json(userBookings);
    } catch (error) {
        handleErrors(res, error);
    }
});


function sendConfirmationToUser(bookingDetails, user, status) {
    let subject, confirmationText;

    switch (status) {
        case 'approved':
            subject = 'Booking Approval';
            confirmationText = 'approved for the following details:';
            break;
        case 'confirmed':
            subject = 'Booking Confirmation';
            confirmationText = 'confirmed for the following details:';
            break;
        case 'rejected':
            subject = 'Booking Rejection';
            confirmationText = 'rejected for the following details:';
            break;
        default:
            subject = 'New Booking Confirmation';
            confirmationText = 'confirmed for the following details:';
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'ahujaaryan2511@gmail.com',
            pass: 'qvsv nigy zuwg crzn',
        },
    });

    const mailOptions = {
        from: 'ahujaaryan2511@gmail.com',
        to: user,
        subject: subject,
        text: `
Respected User,

Your booking has been ${confirmationText}

Booking ID: ${bookingDetails.id}
Venue: ${bookingDetails.venue}
Booked by: ${bookingDetails.bookedBy}
Date: ${bookingDetails.date}
Status: ${status.toUpperCase()}

Thank you for choosing our services.

Best regards,
VES
`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error(`Error sending ${status} email to user:`, error);
        } else {
            console.log(`${status} email sent to user:`, info.response);
        }
    });
}


function sendConfirmationEmailToAdmin(bookingDetails) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'ahujaaryan2511@gmail.com',
            pass: 'qvsv nigy zuwg crzn',
        },
    });

    const mailOptions = {
        from: 'ahujaaryan2511@gmail.com',
        to: 'admin@gmail.com',
        subject: 'New Booking Confirmation',
        text: `
Respected Authority,

A new booking has been confirmed for the following details:

Booking ID: ${bookingDetails.id}
Venue: ${bookingDetails.venue}
Booked by: ${bookingDetails.bookedBy}
Date: ${bookingDetails.date}

Thank you for your attention.

Best regards,
VES
`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending confirmation email to admin:', error);
        } else {
            console.log('Confirmation email sent to admin:', info.response);
        }
    });
}

async function sendConfirmationEmailToPrincipal(bookingInstituteId, bookingDetails, instiPrincipal, status) {
    try {
        let emailText = '';
        switch (status) {
            case 'new_request':
                emailText = `
Respected Authority,

A new booking request has been submitted for the following details:

Booking ID: ${bookingDetails.id}
Venue: ${bookingDetails.venue}
Booked by: ${bookingDetails.bookedBy}
Date: ${bookingDetails.date}

Please review and take necessary actions.

Best regards,
VES
`;
                break;
            case 'approved':
                emailText = `
Respected Authority,

The booking request with the following details has been approved:

Booking ID: ${bookingDetails.id}
Venue: ${bookingDetails.venue}
Booked by: ${bookingDetails.bookedBy}
Date: ${bookingDetails.date}

Thank you for your attention.

Best regards,
VES
`;
                break;
            case 'confirmed':
                emailText = `
Respected Authority,

The booking request with the following details has been confirmed:

Booking ID: ${bookingDetails.id}
Venue: ${bookingDetails.venue}
Booked by: ${bookingDetails.bookedBy}
Date: ${bookingDetails.date}

Thank you for your attention.

Best regards,
VES
`;
                break;
            default:
                break;
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'ahujaaryan2511@gmail.com',
                pass: 'qvsv nigy zuwg crzn',
            },
        });

        const mailOptions = {
            from: 'ahujaaryan2511@gmail.com',
            to: instiPrincipal.email,
            subject: `Booking ${status.replace('_', ' ').toUpperCase()}`,
            text: emailText,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error(`Error sending confirmation email to principal for ${status}:`, error);
            } else {
                console.log(`Confirmation email sent to principal for ${status}:`, info.response);
            }
        });
    } catch (error) {
        console.error(`Error fetching principal email for ${status}:`, error);
    }
}

router.get('/allBookings', async (req, res) => {
    try {
        const client = await connectToDatabase();
        const database = client.db('database');
        const collection = database.collection('Booking');

        const allBookings = await collection.aggregate([
            {
                $project: {
                    _id: 0,
                    name: 1,
                    location: 1,
                    bookings: 1,
                },
            },
        ]).toArray();

        res.json(allBookings);
    } catch (error) {
        handleErrors(res, error);
    }
});

router.get('/instituteBookings/:institute', async (req, res) => {
    try {
        const client = await connectToDatabase();
        const database = client.db('database');
        const collection = database.collection('Booking');

        const instituteName = req.params.institute;

        const allBookings = await collection.aggregate([
            {
                $match: {
                    'institute': instituteName,
                },
            },
            {
                $project: {
                    _id: 0,
                    name: 1,
                    location: 1,
                    bookings: 1,
                },
            },
        ]).toArray();

        res.json(allBookings);
    } catch (error) {
        handleErrors(res, error);
    }
});

router.post('/cancelBooking/:documentId', async (req, res) => {
    const documentId = req.params.documentId;
    const bookingToDelete = req.body;

    try {
        const client = await connectToDatabase();
        const database = client.db('database');
        const collection = database.collection('Booking');

        const doc = await collection.findOne({ _id: new ObjectId(documentId) });

        if (doc) {
            let bookingsArray = doc.bookings || [];

            const indexToDelete = bookingsArray.findIndex(
                (booking) => booking.bookingId === bookingToDelete.bookingId
            );

            if (indexToDelete !== -1) {
                const bookingDate = new Date(bookingToDelete.bookedOn._seconds * 1000);
                const currentDate = new Date();
                const timeDifference = currentDate.getTime() - bookingDate.getTime();
                const daysDifference = timeDifference / (1000 * 3600 * 24);

                if (daysDifference > 2) {
                    res.status(400).json({ message: 'Cannot cancel booking made more than 2 days ago.' });
                } else {
                    bookingsArray.splice(indexToDelete, 1);

                    await collection.updateOne(
                        { _id: new ObjectId(documentId) },
                        { $set: { bookings: bookingsArray } }
                    );

                    res.status(200).json({ message: 'Booking canceled successfully.' });
                }
            } else {
                res.status(404).json({ message: 'Booking not found.' });
            }
        } else {
            res.status(404).json({ message: 'Document does not exist.' });
        }
    } catch (error) {
        console.error('Error deleting booking:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

router.get('/bookingsForDate/:venueId/:date', async (req, res) => {
    try {
        const client = await connectToDatabase();
        const database = client.db('database');
        const collection = database.collection('Booking');

        const { venueId, date } = req.params;

        const selectedDate = new Date(`${date}T00:00:00.000Z`);

        const pipeline = [
            {
                $match: {
                    _id: new ObjectId(venueId),
                    'bookings.date': {
                        $gte: selectedDate,
                        $lt: new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000),
                    },
                },
            },
            {
                $unwind: '$bookings',
            },
            {
                $match: {
                    'bookings.date': selectedDate,
                    'bookings.status': { $ne: 'Rejected' },
                },
            },
            {
                $group: {
                    _id: '$_id',
                    bookings: { $push: '$bookings' },
                },
            },
        ];

        const cursor = collection.aggregate(pipeline);
        const fetchedBookings = await cursor.toArray();

        res.json(fetchedBookings);
    } catch (error) {
        handleErrors(res, error);
    }
});


module.exports = router;

