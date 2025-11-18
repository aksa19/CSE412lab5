const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const multer = require('multer');
const { userOperations, portfolioOperations } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Session configuration
app.use(session({
  secret: 'portfolio-generator-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'photo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only .jpg, .jpeg, and .png files are allowed'));
    }
  }
});

// Authentication middleware
function requireAuth(req, res, next) {
  if (req.session.userId) {
    next();
  } else {
    res.status(401).json({ success: false, error: 'Authentication required' });
  }
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/portfolio', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'portfolio.html'));
});

// Authentication routes
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required' });
  }

  const result = await userOperations.create(email, password);
  
  if (result.success) {
    req.session.userId = result.id;
    res.json({ success: true, message: 'Registration successful' });
  } else {
    res.status(400).json(result);
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required' });
  }

  const result = await userOperations.verifyCredentials(email, password);
  
  if (result.success) {
    req.session.userId = result.user.id;
    res.json({ success: true, message: 'Login successful' });
  } else {
    res.status(401).json(result);
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true, message: 'Logged out successfully' });
});

app.get('/api/check-auth', (req, res) => {
  if (req.session.userId) {
    res.json({ authenticated: true, userId: req.session.userId });
  } else {
    res.json({ authenticated: false });
  }
});

// Portfolio routes
app.get('/api/portfolio', requireAuth, async (req, res) => {
  const portfolio = await portfolioOperations.getByUserId(req.session.userId);
  if (portfolio) {
    res.json({ success: true, portfolio });
  } else {
    res.json({ success: true, portfolio: null });
  }
});

app.post('/api/portfolio', requireAuth, upload.single('photo'), async (req, res) => {
  const portfolioData = {
    fullName: req.body.fullName,
    contactInfo: req.body.contactInfo,
    photoPath: req.file ? `/uploads/${req.file.filename}` : req.body.existingPhotoPath,
    bio: req.body.bio,
    softSkills: req.body.softSkills ? JSON.parse(req.body.softSkills) : [],
    technicalSkills: req.body.technicalSkills ? JSON.parse(req.body.technicalSkills) : [],
    academicBackground: req.body.academicBackground ? JSON.parse(req.body.academicBackground) : [],
    workExperience: req.body.workExperience ? JSON.parse(req.body.workExperience) : [],
    projectsPublications: req.body.projectsPublications ? JSON.parse(req.body.projectsPublications) : []
  };

  const result = await portfolioOperations.save(req.session.userId, portfolioData);
  
  if (result.success) {
    res.json(result);
  } else {
    res.status(500).json(result);
  }
});

app.post('/api/portfolio/save', requireAuth, upload.single('photo'), async (req, res) => {
  const portfolioData = {
    fullName: req.body.fullName,
    contactInfo: req.body.contactInfo,
    photoPath: req.file ? `/uploads/${req.file.filename}` : req.body.existingPhotoPath,
    bio: req.body.bio,
    softSkills: req.body.softSkills ? JSON.parse(req.body.softSkills) : [],
    technicalSkills: req.body.technicalSkills ? JSON.parse(req.body.technicalSkills) : [],
    academicBackground: req.body.academicBackground ? JSON.parse(req.body.academicBackground) : [],
    workExperience: req.body.workExperience ? JSON.parse(req.body.workExperience) : [],
    projectsPublications: req.body.projectsPublications ? JSON.parse(req.body.projectsPublications) : []
  };

  const result = await portfolioOperations.save(req.session.userId, portfolioData);
  res.json(result);
});

// PDF generation route
app.post('/api/portfolio/generate-pdf', requireAuth, async (req, res) => {
  try {
    const portfolio = await portfolioOperations.getByUserId(req.session.userId);
    if (!portfolio) {
      return res.status(404).json({ success: false, error: 'Portfolio not found' });
    }

    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Generate HTML for PDF
    const htmlContent = generatePortfolioHTML(portfolio);
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
    });

    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="portfolio-${Date.now()}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate PDF' });
  }
});

function generatePortfolioHTML(portfolio) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          text-align: center;
          border-bottom: 3px solid #4CAF50;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header h1 {
          color: #4CAF50;
          margin: 10px 0;
        }
        .photo {
          width: 150px;
          height: 150px;
          border-radius: 50%;
          object-fit: cover;
          margin: 20px auto;
          display: block;
        }
        .section {
          margin-bottom: 30px;
        }
        .section h2 {
          color: #4CAF50;
          border-bottom: 2px solid #4CAF50;
          padding-bottom: 5px;
        }
        .contact-info {
          text-align: center;
          margin: 10px 0;
        }
        .bio {
          text-align: justify;
          margin: 15px 0;
        }
        .skills {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .skill-tag {
          background-color: #e8f5e9;
          padding: 5px 15px;
          border-radius: 20px;
          display: inline-block;
          margin: 5px;
        }
        .experience-item, .academic-item, .project-item {
          margin-bottom: 20px;
          padding: 15px;
          background-color: #f9f9f9;
          border-left: 4px solid #4CAF50;
        }
        .item-title {
          font-weight: bold;
          color: #2e7d32;
          margin-bottom: 5px;
        }
        .item-duration {
          color: #666;
          font-style: italic;
          margin-bottom: 10px;
        }
        ul {
          margin: 10px 0;
          padding-left: 20px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        ${portfolio.photo_path ? `<img src="file://${path.join(__dirname, portfolio.photo_path.replace(/^\//, ''))}" class="photo" alt="Profile Photo">` : ''}
        <h1>${portfolio.full_name || 'Portfolio'}</h1>
        ${portfolio.contact_info ? `<div class="contact-info">${portfolio.contact_info}</div>` : ''}
      </div>

      ${portfolio.bio ? `
      <div class="section">
        <h2>Bio</h2>
        <div class="bio">${portfolio.bio}</div>
      </div>
      ` : ''}

      ${(portfolio.softSkills && portfolio.softSkills.length > 0) || (portfolio.technicalSkills && portfolio.technicalSkills.length > 0) ? `
      <div class="section">
        <h2>Skills</h2>
        ${portfolio.softSkills && portfolio.softSkills.length > 0 ? `
          <h3>Soft Skills</h3>
          <div class="skills">
            ${portfolio.softSkills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
          </div>
        ` : ''}
        ${portfolio.technicalSkills && portfolio.technicalSkills.length > 0 ? `
          <h3>Technical Skills</h3>
          <div class="skills">
            ${portfolio.technicalSkills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
          </div>
        ` : ''}
      </div>
      ` : ''}

      ${portfolio.academicBackground && portfolio.academicBackground.length > 0 ? `
      <div class="section">
        <h2>Academic Background</h2>
        ${portfolio.academicBackground.map(academic => `
          <div class="academic-item">
            <div class="item-title">${academic.institute || ''} - ${academic.degree || ''}</div>
            <div class="item-duration">${academic.year || ''} ${academic.grade ? '- Grade: ' + academic.grade : ''}</div>
          </div>
        `).join('')}
      </div>
      ` : ''}

      ${portfolio.workExperience && portfolio.workExperience.length > 0 ? `
      <div class="section">
        <h2>Work Experience</h2>
        ${portfolio.workExperience.map(exp => `
          <div class="experience-item">
            <div class="item-title">${exp.companyName || ''}</div>
            <div class="item-duration">${exp.duration || ''}</div>
            ${exp.responsibilities ? `
              <div>
                <strong>Responsibilities:</strong>
                <ul>
                  ${Array.isArray(exp.responsibilities) ? 
                    exp.responsibilities.map(resp => `<li>${resp}</li>`).join('') :
                    `<li>${exp.responsibilities}</li>`
                  }
                </ul>
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
      ` : ''}

      ${portfolio.projectsPublications && portfolio.projectsPublications.length > 0 ? `
      <div class="section">
        <h2>Projects & Publications</h2>
        ${portfolio.projectsPublications.map(project => `
          <div class="project-item">
            <div class="item-title">${project.title || ''}</div>
            ${project.description ? `<div>${project.description}</div>` : ''}
          </div>
        `).join('')}
      </div>
      ` : ''}
    </body>
    </html>
  `;
}

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

