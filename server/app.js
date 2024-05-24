const express = require('express');
const bcrypt = require('bcryptjs');
const JWT = require('jsonwebtoken');
const app = express();
const cors = require('cors');

//Connect DB
require('./db/connections');

//Import files
const users = require('./models/users');
const Conversation = require('./models/Conversations');
const Message = require('./models/Messages');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const port = process.env.PORT || 8000;

//Take user data
app.post('/api/register', async (req, res) => {
    try {
        const { fullName, email, password } = req.body;

        if (!fullName || !email || !password) {
            return res.status(400).json({ error: 'Please fill all the fields' });
        }

        const isAlreadyExist = await users.findOne({ email });
        if (isAlreadyExist) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new users({ fullName, email, password: hashedPassword });
        await newUser.save();

        return res.status(200).json({ message: 'User registered successfully' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});


app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.sendStatus(400).send('Please fill all the fields');
        }

        const user = await users.findOne({ email });

        if (!user) {
            return res.status(400).send('User email or password is incorrect');
        }

        const validatePassword = await bcrypt.compare(password, user.password);

        if (!validatePassword) {
            return res.status(400).send('User email or password is incorrect');
        }

        const payload = {
            userID: user._id,
            email: user.email,
        };

        const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'THIS_IS_A_SECRET_JWT_KEY';

        JWT.sign(payload, JWT_SECRET_KEY, { expiresIn: 84600 }, async (err, token) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Error signing JWT token');
            }

            await users.updateOne({ _id: user._id }, { $set: { token } });

            res.status(200).json({ user:{ email: user.email, fullName: user.fullName, token: user.token}});
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal server error');
    }
});

app.post('/api/conversations', async (req, res) => {
    try {
        const { senderID, receiverID } = req.body;
        const newConversation = new Conversation({ members: [senderID, receiverID] });
        await newConversation.save();
        res.status(200).send('Conversation created successfully');  
    } catch (error) {
        console.log(error);
    }
});

app.get('/api/conversations/:userID', async (req, res) => {
    try {
        const userID = req.params.userID;
        const conversations = await Conversation.find({ members: { $in: [userID] } });
        const conversationUserData = Promise.all(conversations.map(async (conversation) => {
            const receiverID = conversation.members.find((member) => member !== userID);
            const user = await users.findById(receiverID);
            return {user: {email: user.email, fullName: user.fullName}, conversationID: conversation._id }
        }));
        res.status(200).json(await conversationUserData);
    } catch (error) {
        console.log(error);
    }
});

app.post('/api/messages', async (req, res) => {
    try {
        const { conversationID, receiverID, senderID, message } = req.body;
        if(!senderID || !message) return res.status(400).send('Please fill all the fields');
        if(!conversationID && receiverID){
            const newConversation = new Conversation({ members: [senderID, receiverID = ''] });
            await newConversation.save();
            const newMessage = new Message({ conversationID: newConversation._id, senderID, message});
            await newMessage.save();
            return res.status(200).send('Message sent successfully');
        } 
        else {
            const conversation = await Conversation.findById(conversationID);
            if(!conversation) return res.status(400).send('Conversation not found');
        }
        const newMessage = new Message({ conversationID, senderID, message});
        await newMessage.save();
        res.status(200).send('Message sent successfully');
    } catch (error) {
        console.log(error);
    }
});

app.get('/api/messages/:conversationID', async (req,res) => {
    try {
        const conversationID = req.params.conversationID;
        if(conversationID == 'new') return res.status(200).json([])
        const messages = await Message.find({conversationID});
        const messageUserData = Promise.all(messages.map(async (message) => {
            const user = await users.findById(message.senderID);
            return { users: { email: user.email, fullName: user.fullName }, message: message.message}
        }));
        res.status(200).json(await messageUserData);
    } catch (error) {
        console.log(error);
    }
});

app.get('/api/users', async (req, res) => {
    try {
        const userList = await users.find(); 
        const userData = Promise.all(userList.map(async (user) => {
            return { users: { email: user.email, fullName: user.fullName }, userID: user._id }
        }));
        res.status(200).json(await userData);
    } catch (error) {
        console.error(error); 
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});


app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});