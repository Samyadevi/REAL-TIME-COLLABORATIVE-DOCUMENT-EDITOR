// server.js - Located in collaborative-editor-final/server
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io'); // Correct way to import Socket.IO Server
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Use CORS middleware for development
app.use(cors({
    origin: "http://localhost:3000", // Your React app's default development origin
    methods: ["GET", "POST"]
}));
app.use(express.json()); // Middleware to parse JSON request bodies

// MongoDB Connection
const MONGO_URI = 'mongodb://localhost:27017/document_editor_socketio'; // Using a distinct DB name
mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB connected successfully!'))
    .catch(err => console.error('MongoDB connection error:', err));

// Mongoose Document Schema and Model
const DocumentSchema = new mongoose.Schema({
    _id: String, // Use document ID as _id
    data: Object, // Store Quill delta content (Object type for rich text)
});
const Document = mongoose.model('Document', DocumentSchema);

// Initialize Socket.IO with the HTTP server
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

// HTTP Route: Get or Create a Document (for initial load)
app.get('/document/:id', async (req, res) => {
    const documentId = req.params.id;
    try {
        let document = await Document.findById(documentId);
        if (!document) {
            console.log(`Document ${documentId} not found. Creating a new one.`);
            // Create an empty document if it doesn't exist
            document = await Document.create({ _id: documentId, data: { ops: [{ insert: '' }] } });
        }
        res.json(document); // Send the document data
    } catch (error) {
        console.error('Error fetching/creating document:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Socket.IO Logic for Real-time Updates
io.on('connection', socket => {
    console.log('New client connected:', socket.id);

    socket.on('get-document', async documentId => {
        const document = await Document.findById(documentId);
        if (document) {
            socket.join(documentId); // Join a room for this document
            socket.emit('load-document', document.data); // Send initial content to this client
        } else {
            // If get-document is called and it's not found (should be handled by HTTP GET first)
            // We'll still send an empty document.
            socket.join(documentId);
            socket.emit('load-document', { ops: [{ insert: '' }] });
        }
    });

    socket.on('send-changes', async (documentId, newContent) => {
        // Broadcast changes to all other clients in the same document's room
        socket.to(documentId).emit('receive-changes', newContent);

        // Update the document in MongoDB. This simple approach overwrites,
        // which can cause data loss with true concurrent edits without OT.
        try {
            await Document.findByIdAndUpdate(documentId, { data: newContent }, { new: true, upsert: true });
        } catch (error) {
            console.error('Error saving document changes:', error);
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
    console.log('Ensure MongoDB is running on localhost:27017.');
});

// Graceful shutdown (optional but good practice)
process.on('SIGINT', () => {
    console.log('SIGINT signal received. Shutting down server...');
    server.close(() => {
        console.log('HTTP/WebSocket server closed.');
        mongoose.connection.close(() => {
            console.log('MongoDB connection closed.');
            process.exit(0);
        });
    });
});
