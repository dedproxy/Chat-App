const mongoose = require('mongoose');

const url = `mongodb+srv://DbUser:CIPEFyFUGwFKfEWM@cluster0.q3ollyd.mongodb.net/myDatabase?retryWrites=true&w=majority`;

mongoose.connect(url)
.then(() => {
    console.log('Connected to MongoDB');
})
.catch(err => {
    console.error('Failed to connect to MongoDB', err);
});
