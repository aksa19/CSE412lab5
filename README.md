# Portfolio Generator

A professional web application for generating portfolios/resumes with PDF export functionality.

## Features

- **User Authentication**: Secure registration and login system
- **Portfolio Creation**: Comprehensive form with multiple sections:
  - Personal Information (name, contact, photo, bio)
  - Skills (soft skills and technical skills)
  - Academic Background (optional)
  - Work Experience
  - Projects & Publications (optional)
- **PDF Generation**: Export your portfolio as a professional PDF
- **Save & Load**: Save your progress and continue later
- **Modern UI**: Beautiful, responsive design

## Installation

1. Install dependencies:
```bash
npm install
```

## Running the Application

1. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

2. Open your browser and navigate to:
```
http://localhost:3000
```

## Usage

1. **Register**: Create a new account with your email and password
2. **Login**: Access your account with your credentials
3. **Create Portfolio**: Fill in the portfolio form with your information
4. **Save Progress**: Click "Save Progress" to save your work without generating PDF
5. **Generate PDF**: Click "Generate PDF" to create and download your portfolio PDF

## Project Structure

```
portfolio-generator/
├── server.js          # Express server and routes
├── database.js        # Database setup and operations
├── package.json       # Dependencies and scripts
├── public/            # Frontend files
│   ├── index.html     # Home page
│   ├── login.html     # Login page
│   ├── register.html  # Registration page
│   ├── portfolio.html # Portfolio form
│   ├── styles.css     # Styling
│   ├── auth.js        # Authentication logic
│   └── portfolio.js   # Portfolio form logic
└── uploads/           # Uploaded photos (created automatically)
```

## Technologies Used

- **Backend**: Node.js, Express.js
- **Database**: SQLite (better-sqlite3)
- **Authentication**: Session-based with bcryptjs
- **PDF Generation**: Puppeteer
- **File Upload**: Multer
- **Frontend**: HTML, CSS, JavaScript

## Notes

- The database file (`portfolio.db`) will be created automatically on first run
- Uploaded photos are stored in the `uploads/` directory
- Session cookies are used for authentication (24-hour expiration)

