// pdfWorker.js
import 'dotenv/config';
import mongoose from 'mongoose';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { consumePDFTasks } from './rabbitmqConfig.js';

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('PDF Worker: Connected to MongoDB');
}).catch((err) => {
  console.error('PDF Worker: MongoDB connection error:', err);
  process.exit(1);
});

// Schema
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
  pdfGenerated: { type: Boolean, default: false },
  pdfPath: { type: String }
});

const Application = mongoose.model('Application', applicationSchema);

// Create pdfs directory if it doesn't exist
const pdfDir = path.join(process.cwd(), 'pdfs');
if (!fs.existsSync(pdfDir)) {
  fs.mkdirSync(pdfDir, { recursive: true });
}

// Generate PDF function
async function generatePDF(applicationId) {
  try {
    const application = await Application.findById(applicationId);

    if (!application) {
      console.error(`Application ${applicationId} not found`);
      return;
    }

    if (application.status !== 'approved') {
      console.log(`Application ${applicationId} is not approved, skipping PDF generation`);
      return;
    }

    const pdfFileName = `kyc-${applicationId}.pdf`;
    const pdfPath = path.join(pdfDir, pdfFileName);

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(pdfPath);

    doc.pipe(stream);

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

    // Update application with PDF path and generated flag
    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    await Application.findByIdAndUpdate(
      applicationId,
      { 
        pdfGenerated: true,
        pdfPath: pdfPath.replace(/\\/g, '/') 
      }
    );

    console.log(`PDF generated successfully for application ${applicationId}: ${pdfPath}`);
  } catch (error) {
    console.error(`Error generating PDF for application ${applicationId}:`, error);
  }
}

// Start worker
async function startWorker() {
  try {
    console.log('Starting PDF Worker...');
    let isConnected = false;
    
    while (!isConnected) {
      try {
        await consumePDFTasks(async (task) => {
          console.log(`Processing PDF task for application ${task.applicationId}`);
          await generatePDF(task.applicationId);
        });
        isConnected = true;
      } catch (error) {
        console.error('PDF Worker error:', error.message);
        console.log('Retrying in 5 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  } catch (error) {
    console.error('PDF Worker fatal error:', error);
    process.exit(1);
  }
}

startWorker();
