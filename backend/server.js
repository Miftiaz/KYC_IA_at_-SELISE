// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const PDFDocument = require('pdfkit');
const { Readable } = require('stream');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

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

// Helper function to generate application summary
function generateSummary(data) {
  const age = new Date().getFullYear() - new Date(data.dateOfBirth).getFullYear();
  return `${data.fullName}, aged ${age}, is a ${data.profession} residing at ${data.address}. ` +
         `Contact details: ${data.email}, ${data.phone}. ` +
         `Identity verified via ${data.idType.replace('_', ' ')} (${data.idNumber}).`;
}

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
    const summary = generateSummary(req.body);

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
        processedAt: new Date(),
        pdfGenerated: true 
      },
      { new: true }
    );

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    res.json({ message: 'Application approved', application });
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

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.status !== 'approved') {
      return res.status(400).json({ message: 'Only approved applications can generate PDFs' });
    }

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=kyc-${application._id}.pdf`);

    // Pipe PDF to response
    doc.pipe(res);

    // Add content to PDF
    doc.fontSize(20).text('KYC Application Document', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Application ID: ${application._id}`);
    doc.text(`Status: ${application.status.toUpperCase()}`, { underline: true });
    doc.moveDown();

    doc.fontSize(14).text('Personal Information', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11);
    doc.text(`Full Name: ${application.fullName}`);
    doc.text(`Date of Birth: ${new Date(application.dateOfBirth).toLocaleDateString()}`);
    doc.text(`Email: ${application.email}`);
    doc.text(`Phone: ${application.phone}`);
    doc.text(`Profession: ${application.profession}`);
    doc.text(`Address: ${application.address}`);
    doc.moveDown();

    doc.fontSize(14).text('Identification', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11);
    doc.text(`ID Type: ${application.idType.replace('_', ' ').toUpperCase()}`);
    doc.text(`ID Number: ${application.idNumber}`);
    doc.moveDown();

    doc.fontSize(14).text('Summary', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11);
    doc.text(application.summary, { align: 'justify' });
    doc.moveDown();

    doc.fontSize(10).text(`Submitted: ${new Date(application.submittedAt).toLocaleString()}`);
    doc.text(`Processed: ${new Date(application.processedAt).toLocaleString()}`);
    doc.moveDown(2);

    doc.fontSize(9).text('This document is generated automatically and contains verified information.', {
      align: 'center',
      color: 'gray'
    });

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ message: 'Error generating PDF' });
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

module.exports = app;