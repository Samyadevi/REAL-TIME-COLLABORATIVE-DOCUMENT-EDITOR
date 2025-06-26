// src/App.js - Located in collaborative-editor-final/client/src
import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import Quill from 'quill';
import 'quill/dist/quill.snow.css'; // Import Quill's default CSS
import { io } from 'socket.io-client'; // Import Socket.IO client library
import './App.css'; // Your custom CSS for the app

// Define Quill toolbar options
const TOOLBAR_OPTIONS = [
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    [{ font: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ script: 'sub' }, { script: 'super' }],
    [{ align: [] }],
    ['image', 'blockquote', 'code-block'],
    ['clean'],
];

function App() {
    const { id: documentId } = useParams(); // Get document ID from URL parameter
    const editorRef = useRef(null); // Ref to attach Quill editor to a div
    const [socket, setSocket] = useState(); // State for Socket.IO client instance
    const [quill, setQuill] = useState(); // State for Quill editor instance

    // Effect 1: Initialize Socket.IO connection when component mounts
    useEffect(() => {
        const s = io("http://localhost:5000"); // Connect to your backend Socket.IO server
        setSocket(s);

        // Cleanup: Disconnect socket when component unmounts
        return () => {
            s.disconnect();
        };
    }, []); // Empty dependency array means this runs once on mount

    // Effect 2: Initialize Quill Editor when socket is ready
    useEffect(() => {
        if (!editorRef.current || !socket) return; // Ensure editor div and socket are available

        const q = new Quill(editorRef.current, {
            theme: 'snow',
            modules: { toolbar: TOOLBAR_OPTIONS },
        });
        q.disable(); // Disable editor initially
        q.setText('Loading document...');
        setQuill(q); // Store Quill instance in state

        // Cleanup: Remove Quill event listener when effect re-runs or unmounts
        return () => {
            q.off('text-change'); // Remove the handler for text-change
        };
    }, [socket]); // Re-run this effect when 'socket' state changes (i.e., when socket is initialized)

    // Effect 3: Handle initial document loading from server via Socket.IO
    useEffect(() => {
        if (!socket || !quill || !documentId) return; // Ensure socket, quill, and documentId are ready

        // Listen for the 'load-document' event from the server
        socket.once('load-document', documentData => {
            // Set Quill's content. If documentData is empty/null, set an empty document.
            quill.setContents(documentData || { ops: [{ insert: '' }] });
            quill.enable(); // Enable the editor for user input
        });

        // Emit 'get-document' to request the document from the server
        socket.emit('get-document', documentId);
    }, [socket, quill, documentId]); // Re-run if socket, quill, or documentId changes

    // Effect 4: Send Quill text changes to the server
    useEffect(() => {
        if (!socket || !quill) return;

        const handler = (delta, oldDelta, source) => {
            if (source === 'user') { // Only send changes made by the user
                // Send the entire current content of the Quill editor
                socket.emit('send-changes', documentId, quill.getContents());
            }
        };
        quill.on('text-change', handler); // Attach the handler to Quill's text-change event

        // Cleanup: Remove the event listener
        return () => {
            quill.off('text-change', handler);
        };
    }, [socket, quill, documentId]); // Re-run if socket, quill, or documentId changes

    // Effect 5: Receive changes from other clients (or server) and apply to Quill
    useEffect(() => {
        if (!socket || !quill) return;

        const handler = newContent => {
            // Apply the received new content (full document) to Quill
            quill.setContents(newContent);
        };
        socket.on('receive-changes', handler); // Listen for 'receive-changes' from server

        // Cleanup: Remove the event listener
        return () => {
            socket.off('receive-changes', handler);
        };
    }, [socket, quill]); // Re-run if socket or quill changes

   // ... (inside the App function, before the final return)

    return (
        <div className="container">
            {/* ADD THIS LINE FOR THE TITLE */}
            <h1 className="document-title">Real-time Collaborative Document</h1>
            <div className="editor-wrapper">
                <div className="editor" ref={editorRef}></div>
            </div>
        </div>
    );
}

export default App;
