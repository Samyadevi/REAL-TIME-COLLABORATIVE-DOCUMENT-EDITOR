// src/index.js - Located in collaborative-editor-final/client/src
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import { v4 as uuidV4 } from 'uuid'; // For generating unique IDs

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <Router>
      <Routes>
        {/* Redirects to a new unique document ID when accessing the root path */}
        <Route path="/" element={<Navigate to={`/documents/${uuidV4()}`} replace />} />
        {/* Route for displaying and editing a specific document by ID */}
        <Route path="/documents/:id" element={<App />} />
      </Routes>
    </Router>
  </React.StrictMode>
);
