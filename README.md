# KYC System - Know Your Customer

A modern, full-stack Know Your Customer (KYC) verification system built with React, Node.js, Express, MongoDB, and RabbitMQ. Features AI-powered application summaries, admin dashboard, and PDF generation.

## 🎯 Features

- **User KYC Application Form** - Secure form submission with personal and identification details
- **AI-Powered Summaries** - Automatic application summary generation using Hugging Face API
- **Admin Dashboard** - Three-panel management system (Pending, Approved, Rejected)
- **PDF Generation** - Automatic PDF creation for approved applications
- **Dark Theme UI** - Modern, sleek interface with gradients and glassmorphism
- **JWT Authentication** - Secure admin login with token-based authorization
- **Real-time Status Updates** - Instant application status changes
- **Responsive Design** - Works seamlessly on desktop and mobile devices

## 📋 Prerequisites

Before you begin, ensure you have installed:

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Docker** & **Docker Compose** (for RabbitMQ)
- **MongoDB Atlas Account** (or local MongoDB)
- **Hugging Face API Token**

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/Miftiaz/KYC_IA_at_-SELISE.git
cd KYC_IA_at_-SELISE
```

### 2. Backend Setup

#### Install Dependencies

```bash
cd backend
npm install
```

#### Configure Environment Variables

Create a `.env` file in the `backend` directory:

```env
PORT=3001
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>
JWT_SECRET=your_jwt_secret_key_here
RABBITMQ_URL=amqp://guest:guest@localhost:5672
HF_TOKEN=your_hugging_face_token_here
```

**Environment Variables Explanation:**
- `PORT` - Express server port (default: 3001)
- `MONGODB_URI` - MongoDB Atlas connection string
- `JWT_SECRET` - Secret key for JWT token signing
- `RABBITMQ_URL` - RabbitMQ connection URL with credentials
- `HF_TOKEN` - Your Hugging Face API token for AI summaries

#### Start RabbitMQ with Docker

```bash
# Pull and run RabbitMQ container
docker run -d --name rabbitmq -p 5672:15672 rabbitmq:management

# RabbitMQ Management UI: http://localhost:15672 (guest/guest)
```

Or using Docker Compose (if available):

```bash
docker-compose up -d rabbitmq
```

#### Start the Backend Server

```bash
npm start
```

The server will start on `http://localhost:3001`

#### Start PDF Worker (Optional - in separate terminal)

```bash
npm run worker
```

### 3. Frontend Setup

#### Install Dependencies

```bash
cd frontend
npm install
```

#### Start Development Server

```bash
npm start
```

The frontend will open at `http://localhost:3000`

## 📁 Project Structure

```
KYC_IA_at_-SELISE/
├── backend/
│   ├── server.js                 # Express API server
│   ├── pdfWorker.js             # Background PDF generation worker
│   ├── rabbitmqConfig.js        # RabbitMQ connection & config
│   ├── AISummaryAdapter.js      # Hugging Face API integration
│   ├── package.json
│   ├── .env                     # Environment variables
│   └── pdfs/                    # Generated PDF storage
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Main React component
│   │   ├── index.tsx            # React entry point
│   │   ├── index.css            # Global dark theme styles
│   │   └── react-app-env.d.ts
│   ├── public/
│   │   └── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── tsconfig.json
│
└── README.md                    # This file
```

## 🔄 Workflow

### User Application Flow

1. **User submits KYC form** from the homepage
2. **Backend processes the application:**
   - Saves to MongoDB
   - Calls AI adapter for summary generation
   - Publishes PDF task to RabbitMQ queue
3. **PDF Worker** consumes the task and generates PDF
4. **Admin reviews** application in dashboard
5. **Admin approves/rejects** the application
6. **PDF is generated** for approved applications

### Admin Flow

1. **Admin logs in** with credentials (demo: admin/admin123)
2. **Dashboard loads** with three panels (Pending/Approved/Rejected)
3. **Admin reviews** applications by expanding cards
4. **Admin takes action** (Approve/Reject)
5. **Download PDF** for approved applications

## 🔌 API Endpoints

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/applications` | Submit KYC application |

### Admin Endpoints (Requires JWT Token)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/login` | Admin login |
| GET | `/api/admin/applications` | Get all applications |
| PUT | `/api/admin/applications/:id/approved` | Approve application |
| PUT | `/api/admin/applications/:id/rejected` | Reject application |
| GET | `/api/admin/applications/:id/pdf` | Download application PDF |

## 📝 API Request/Response Examples

### Submit KYC Application

```bash
POST /api/applications
Content-Type: application/json

{
  "fullName": "John Doe",
  "dateOfBirth": "1990-05-15",
  "email": "john@example.com",
  "phone": "+1234567890",
  "profession": "Software Engineer",
  "address": "123 Main St, City, Country",
  "idType": "passport",
  "idNumber": "ABC123456"
}
```

Response:
```json
{
  "applicationId": "507f1f77bcf86cd799439011",
  "summary": "Professional Summary..."
}
```

### Admin Login

```bash
POST /api/admin/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "message": "Login successful"
}
```

## 🧪 Testing

### Run Backend Tests

```bash
cd backend
npm test
```

Tests include:
- Server health check
- Admin login authentication
- KYC application submission
- PDF generation
- Database operations

### Test Coverage

- **serv.test.js** - 3 API tests
- **pdf.test.js** - 3 PDF worker tests

All tests pass with 100% success rate.

## 🔑 Demo Credentials

**Admin Login:**
- Username: `admin`
- Password: `admin123`

## 🎨 Dark Theme Colors

The application uses a sophisticated dark theme with:
- **Primary**: Indigo (`#4f46e5`)
- **Secondary**: Purple (`#9333ea`)
- **Accent**: Pink (`#ec4899`)
- **Background**: Slate (`#0f172a` - `#1e293b`)
- **Glassmorphism effects** with backdrop blur

## 🔐 Security Features

- JWT token-based authentication
- Password hashing with bcryptjs
- Environment variable protection
- CORS configuration
- MongoDB data validation
- Secure PDF download endpoints

## 📦 Dependencies

### Backend

```json
{
  "express": "^4.x.x",
  "mongoose": "^7.x.x",
  "amqplib": "^0.10.3",
  "bcryptjs": "^2.4.3",
  "jsonwebtoken": "^9.x.x",
  "dotenv": "^16.x.x",
  "pdfkit": "^0.13.0",
  "@ai-sdk/openai": "For Hugging Face API"
}
```

### Frontend

```json
{
  "react": "^18.x.x",
  "typescript": "^5.x.x",
  "tailwindcss": "^3.x.x",
  "lucide-react": "^0.x.x"
}
```

## 🐛 Troubleshooting

### RabbitMQ Connection Issues

**Error:** `ECONNRESET` or connection refused

**Solution:**
1. Ensure Docker is running: `docker ps`
2. Check RabbitMQ container: `docker logs rabbitmq`
3. Verify RABBITMQ_URL in `.env` file
4. Restart RabbitMQ: `docker restart rabbitmq`

### MongoDB Connection Issues

**Error:** `MongooseError` or connection timeout

**Solution:**
1. Verify MongoDB Atlas connection string
2. Whitelist your IP in MongoDB Atlas
3. Check network connectivity
4. Ensure credentials are correct

### Hugging Face API Errors

**Error:** `401 Unauthorized` or invalid token

**Solution:**
1. Verify HF_TOKEN is correct in `.env`
2. Ensure no spaces around the `=` sign
3. Check token permissions on Hugging Face
4. System will use fallback summary if API fails

### PDF Generation Issues

**Error:** PDF not generating or download fails

**Solution:**
1. Ensure PDF worker is running: `npm run worker`
2. Check `/backend/pdfs` directory exists
3. Verify MongoDB has `pdfGenerated` field
4. Check RabbitMQ queue for messages

## 📊 Database Schema

### Application Collection

```javascript
{
  _id: ObjectId,
  fullName: String,
  dateOfBirth: String,
  email: String,
  phone: String,
  profession: String,
  address: String,
  idType: String,
  idNumber: String,
  status: "pending" | "approved" | "rejected",
  summary: String,
  pdfGenerated: Boolean,
  pdfPath: String,
  submittedAt: Date,
  updatedAt: Date
}
```

## 🌐 Environment Setup

### Local Development

```bash
# Start all services
docker run -d --name rabbitmq -p 5672:15672 rabbitmq:management
cd backend && npm install && npm start

# In another terminal
cd frontend && npm install && npm start
```

### Production Deployment

1. Set all environment variables
2. Use MongoDB Atlas for data
3. Deploy backend to Node.js hosting (Heroku, AWS, etc.)
4. Deploy frontend to static hosting (Vercel, Netlify, etc.)
5. Configure CORS for production domains
6. Use environment-specific configurations

## 📞 Support & Contribution

For issues, feature requests, or contributions:

1. Create an issue on GitHub
2. Fork the repository
3. Create a feature branch
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 👨‍💻 Author

Created by **Miftiaz**

Repository: [github.com/Miftiaz/KYC_IA_at_-SELISE](https://github.com/Miftiaz/KYC_IA_at_-SELISE)

---

## 🎯 Next Steps

- [ ] Set up environment variables
- [ ] Start RabbitMQ with Docker
- [ ] Run backend server
- [ ] Run frontend development server
- [ ] Test the complete workflow
- [ ] Review admin dashboard
- [ ] Test PDF generation and download

Happy coding! 🚀
