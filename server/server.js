const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB connection string
const dbURI = process.env.MONGODB_URI;

mongoose.connect(dbURI)
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch(err => console.error('Could not connect to MongoDB Atlas:', err));

// JWT Secret Key (use environment variable)
const jwtSecret = process.env.JWT_SECRET;

// Nodemailer Transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// --- User Schema and Model ---
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
});
const User = mongoose.model('User', userSchema);

// --- Question Schema ---
const questionSchema = new mongoose.Schema({
    title: String,
    problemStatement: String,
    solution: String,
    topic: String,
    dateCreated: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});
const Question = mongoose.model('Question', questionSchema);

// --- Authentication Middleware ---
const authMiddleware = (req, res, next) => {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }
    const token = authHeader.replace('Bearer ', '');
    try {
        const decoded = jwt.verify(token, jwtSecret);
        req.user = decoded.user;
        next();
    } catch (e) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

// --- User Authentication Routes ---
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ message: 'User with that email already exists' });
        
        user = await User.findOne({ username });
        if (user) return res.status(400).json({ message: 'Username is already taken' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({ username, email, password: hashedPassword });
        await user.save();

        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const payload = { user: { id: user.id } };
        const token = jwt.sign(payload, jwtSecret, { expiresIn: '1h' });
        res.json({ token, email: user.email, username: user.username, userId: user.id });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- API Endpoints ---
app.get('/questions', async (req, res) => {
    try {
        const questions = await Question.find().sort({ dateCreated: -1 });
        res.json(questions);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/questions', authMiddleware, async (req, res) => {
    const newQuestion = new Question({
        title: req.body.title || 'Untitled Question',
        problemStatement: req.body.problemStatement,
        solution: req.body.solution,
        topic: req.body.topic,
        createdBy: req.user.id
    });
    try {
        const savedQuestion = await newQuestion.save();

        const users = await User.find();
        const recipientEmails = users.map(user => user.email);
        
        const creator = await User.findById(req.user.id);

        const mailOptions = {
            from: process.env.EMAIL_USER, // Correctly using environment variable
            to: recipientEmails.join(', '),
            subject: 'New Coding Question Posted!',
            html: `
                <h2>A new question has been posted!</h2>
                <p>Hello,</p>
                <p>A new coding question titled "<strong>${newQuestion.title}</strong>" has been added by ${creator.email}.</p>
                <p><strong>Topic:</strong> ${newQuestion.topic}</p>
                <p>You can check it out now on the platform.</p>
                <p>Happy coding!</p>
            `
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
            } else {
                console.log('Email sent:', info.response);
            }
        });
        res.status(201).json(savedQuestion);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

app.delete('/questions/:id', authMiddleware, async (req, res) => {
    try {
        const question = await Question.findByIdAndDelete(req.params.id);
        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }
        res.json({ message: 'Question deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.put('/questions/:id', authMiddleware, async (req, res) => {
    try {
        const question = await Question.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }
        res.json(question);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// A catch-all route to serve the front-end (must be last)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});