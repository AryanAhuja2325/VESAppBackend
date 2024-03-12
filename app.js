const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;
const cors = require('cors');

app.use(cors());
app.use(bodyParser.json());

const alumni = require('./routes/alumni');
const notification = require('./routes/notification');
const photos = require('./routes/photos');
const facultyLoad = require('./routes/facultyLoad');
const blog = require('./routes/blog');
const eventUpdate = require('./routes/eventUpdate');
const examSchedule = require('./routes/examSchedule');
const groupChat = require('./routes/groupChat');
const booking = require('./routes/booking');
const login = require('./routes/login');
const stationary = require('./routes/stationary');
const signUp = require('./routes/signUp');
const enquiry = require('./routes/enquiry');
const changePass = require('./routes/changePass');
const attendance = require('./routes/attendance');
const venue = require('./routes/venue');
const campusContacts = require('./routes/campusContacts')

app.use('/api/alumni', alumni);
app.use('/api/notifications', notification);
app.use('/api/photos', photos);
app.use('/api/facultyLoad', facultyLoad);
app.use('/api/blog', blog);
app.use('/api/eventUpdate', eventUpdate);
app.use('/api/examSchedule', examSchedule);
app.use('/api/groupChat', groupChat);
app.use('/api/booking', booking);
app.use('/api/login', login);
app.use('/api/stationary', stationary);
app.use('/api/signUp', signUp);
app.use('/api/enquiry', enquiry);
app.use('/api/changePassword', changePass);
app.use('/api/attendance', attendance);
app.use('/api/venue', venue);
app.use('/api/campusContacts', campusContacts);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
