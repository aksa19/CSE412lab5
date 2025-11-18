const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'portfolio.db');
const db = new sqlite3.Database(dbPath);

// Promisify database methods with proper handling
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Initialize database
db.serialize(() => {
  // Create users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create portfolios table
  db.run(`
    CREATE TABLE IF NOT EXISTS portfolios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      full_name TEXT,
      contact_info TEXT,
      photo_path TEXT,
      bio TEXT,
      soft_skills TEXT,
      technical_skills TEXT,
      academic_background TEXT,
      work_experience TEXT,
      projects_publications TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
});

// Helper function to hash password
function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

// Helper function to verify password
function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

// User operations
const userOperations = {
  create: async (email, password) => {
    try {
      const hashedPassword = hashPassword(password);
      const result = await dbRun('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashedPassword]);
      return { success: true, id: result.lastID };
    } catch (error) {
      if (error.message && error.message.includes('UNIQUE constraint failed')) {
        return { success: false, error: 'Email already exists' };
      }
      return { success: false, error: error.message };
    }
  },

  findByEmail: async (email) => {
    try {
      const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
      return user;
    } catch (error) {
      return null;
    }
  },

  verifyCredentials: async (email, password) => {
    const user = await userOperations.findByEmail(email);
    if (!user) {
      return { success: false, error: 'Invalid credentials' };
    }
    if (verifyPassword(password, user.password)) {
      return { success: true, user: { id: user.id, email: user.email } };
    }
    return { success: false, error: 'Invalid credentials' };
  }
};

// Portfolio operations
const portfolioOperations = {
  save: async (userId, portfolioData) => {
    try {
      const existing = await portfolioOperations.getByUserId(userId);
      if (existing) {
        await dbRun(`
          UPDATE portfolios 
          SET full_name = ?, contact_info = ?, photo_path = ?, bio = ?,
              soft_skills = ?, technical_skills = ?, academic_background = ?,
              work_experience = ?, projects_publications = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?
        `, [
          portfolioData.fullName,
          portfolioData.contactInfo,
          portfolioData.photoPath,
          portfolioData.bio,
          JSON.stringify(portfolioData.softSkills || []),
          JSON.stringify(portfolioData.technicalSkills || []),
          JSON.stringify(portfolioData.academicBackground || []),
          JSON.stringify(portfolioData.workExperience || []),
          JSON.stringify(portfolioData.projectsPublications || []),
          userId
        ]);
        return { success: true, message: 'Portfolio updated successfully' };
      } else {
        await dbRun(`
          INSERT INTO portfolios 
          (user_id, full_name, contact_info, photo_path, bio, soft_skills, 
           technical_skills, academic_background, work_experience, projects_publications)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          userId,
          portfolioData.fullName,
          portfolioData.contactInfo,
          portfolioData.photoPath,
          portfolioData.bio,
          JSON.stringify(portfolioData.softSkills || []),
          JSON.stringify(portfolioData.technicalSkills || []),
          JSON.stringify(portfolioData.academicBackground || []),
          JSON.stringify(portfolioData.workExperience || []),
          JSON.stringify(portfolioData.projectsPublications || [])
        ]);
        return { success: true, message: 'Portfolio saved successfully' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  getByUserId: async (userId) => {
    try {
      const portfolio = await dbGet('SELECT * FROM portfolios WHERE user_id = ?', [userId]);
      if (portfolio) {
        return {
          ...portfolio,
          softSkills: JSON.parse(portfolio.soft_skills || '[]'),
          technicalSkills: JSON.parse(portfolio.technical_skills || '[]'),
          academicBackground: JSON.parse(portfolio.academic_background || '[]'),
          workExperience: JSON.parse(portfolio.work_experience || '[]'),
          projectsPublications: JSON.parse(portfolio.projects_publications || '[]')
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  }
};

module.exports = { db, userOperations, portfolioOperations };
