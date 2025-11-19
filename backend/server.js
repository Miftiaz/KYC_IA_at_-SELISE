// server.js
// require('dotenv').config();
// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const jwt = require('jsonwebtoken');
// const bcrypt = require('bcryptjs');
// const PDFDocument = require('pdfkit');
// const { Readable } = require('stream');
// const AISummaryAdapter = require('./AISummaryAdapter');

import 'dotenv/config'; // replaces require('dotenv').config()
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';
import path from 'path';
import { fileURLToPath } from 'url';
import AISummaryAdapter from './AISummaryAdapter.js';
import { publishPDFTask } from './rabbitmqConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const aiGen = new AISummaryAdapter(process.env.HF_TOKEN);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve PDFs as static files
app.use('/pdfs', express.static(path.join(__dirname, 'pdfs')));

// Configuration
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// MongoDB Connection
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.log(MONGODB_URI)
  console.error('MongoDB connection error:', err);
});

// Schemas
const applicationSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  profession: { type: String, required: true },
  address: { type: String, required: true },
  idNumber: { type: String, required: true },
  idType: { type: String, required: true, enum: ['passport', 'driving_license', 'national_id'] },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  summary: { type: String, required: true },
  submittedAt: { type: Date, default: Date.now },
  processedAt: { type: Date },
  pdfGenerated: { type: Boolean, default: false }
});

const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Application = mongoose.model('Application', applicationSchema);
const Admin = mongoose.model('Admin', adminSchema);

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Initialize default admin (run once or use a seed script)
async function initializeAdmin() {
  try {
    const existingAdmin = await Admin.findOne({ username: 'admin' });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await Admin.create({
        username: 'admin',
        password: hashedPassword
      });
      console.log('Default admin created: username=admin, password=admin123');
    }
  } catch (error) {
    console.error('Error initializing admin:', error);
  }
}

initializeAdmin();

// Routes

// Submit KYC Application
app.post('/api/applications', async (req, res) => {
  try {
    const { fullName, dateOfBirth, email, phone, profession, address, idNumber, idType } = req.body;
    // Validation
    if (!fullName || !dateOfBirth || !email || !phone || !profession || !address || !idNumber || !idType) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Generate summary
    const summary = await aiGen.generate(req.body); 
    console.log("Generated summary:", summary);

    // Create application
    const application = new Application({
      fullName,
      dateOfBirth,
      email,
      phone,
      profession,
      address,
      idNumber,
      idType,
      summary
    });

    await application.save();

    res.status(201).json({
      message: 'Application submitted successfully',
      applicationId: application._id
    });
  } catch (error) {
    console.error('Error submitting application:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin Login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }

    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, admin.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin._id, username: admin.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, username: admin.username });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get All Applications (Admin only)
app.get('/api/admin/applications', authenticateToken, async (req, res) => {
  try {
    const applications = await Application.find().sort({ submittedAt: -1 });
    res.json(applications);
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve Application (Admin only)
app.put('/api/admin/applications/:id/approved', authenticateToken, async (req, res) => {
  try {
    const application = await Application.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'approved',
        processedAt: new Date()
      },
      { new: true }
    );

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    console.log("🔥 APPROVE ROUTE CALLED");


    // 🔥 Queue the PDF creation here
    await publishPDFTask(req.params.id);

    res.json({ 
      message: 'Application approved and queued for PDF generation', 
      application 
    });

  } catch (error) {
    console.error('Error approving application:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


// Reject Application (Admin only)
app.put('/api/admin/applications/:id/rejected', authenticateToken, async (req, res) => {
  try {
    const application = await Application.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'rejected', 
        processedAt: new Date() 
      },
      { new: true }
    );

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    res.json({ message: 'Application rejected', application });
  } catch (error) {
    console.error('Error rejecting application:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Generate and Download PDF (Admin only)
app.get('/api/admin/applications/:id/pdf', authenticateToken, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);

    const app = application.toObject();
    
    console.log(app.pdfPath)

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.status !== 'approved') {
      return res.status(400).json({ message: 'Application not approved yet' });
    }

    // If generated -> return URL
    if (application.pdfGenerated) {
      const pdfPath = app.pdfPath; // ensures absolute path
      console.log('Downloading PDF from:', pdfPath);
      return res.download(pdfPath, `kyc-${application._id}.pdf`);
    }

    // If not generated -> tell frontend to wait
    return res.status(202).json({
      message: 'PDF generation in progress. Please check again shortly.',
      applicationId: application._id
    });

  } catch (error) {
    console.error('Error in PDF download:', error);
    res.status(500).json({ message: 'Server error' });
  }
});



// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});

export default app;
