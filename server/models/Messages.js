const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    conversationID: {
        type: String,
    },
    senderID: {
        type: String,
    },
    message : {
        type: String,
    },
});

const message = mongoose.model('message', messageSchema);

module.exports = message;