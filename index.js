require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const multer = require('multer');
const AWS = require('aws-sdk');
const app = express();

// Setup view engine and static files
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Setup session
app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: true
}));

// Ensure AWS credentials and bucket name are present in environment variables
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_BUCKET_NAME) {
  console.error('AWS credentials or bucket name missing in environment variables!');
  process.exit(1); // Exit if AWS credentials are missing
}

// AWS S3 Configuration
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION 
});

// User credentials 
const validUsername = "user";
const validPin = "7777";

// Multer setup for file upload with validations
const allowedFileTypes = /jpg|jpeg|png|gif|pdf/;  
const maxFileSize = 10 * 1024 * 1024;  

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: maxFileSize },
  fileFilter: (req, file, cb) => {
    const extname = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedFileTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      return cb(new Error('Invalid file type. Only images and PDFs are allowed.'));
    }
  }
});

// Render the login page
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// Handle login submission
app.post('/login', (req, res) => {
  const { username, pin } = req.body;
  if (username === validUsername && pin === validPin) {
    req.session.username = username;
    res.redirect('/upload');
  } else {
    res.render('login', { error: 'Invalid username or PIN!' });
  }
});

// Home page (requires authentication)
app.get('/', (req, res) => {
  if (!req.session.username) {
    return res.redirect('/login');
  }
  res.render('index', { title: "Welcome to AWS S3 File Upload", username: req.session.username });
});

// File Upload page (only accessible after login)
app.get('/upload', (req, res) => {
  if (!req.session.username) {
    return res.redirect('/login');
  }
  res.render('upload', { username: req.session.username });
});

// File upload handling with progress bar
app.post('/upload', upload.array('files', 5), (req, res) => {
  if (!req.session.username) {
    return res.redirect('/login');
  }

  const files = req.files;
  if (!files || files.length === 0) {
    return res.status(400).send('No files uploaded');
  }

  let uploadedFiles = [];
  let failedFiles = [];

  files.forEach((file, index) => {
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `${Date.now()}_${file.originalname}`,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read'
    };

    s3.upload(params, (err, data) => {
      if (err) {
        failedFiles.push(file.originalname);
      } else {
        uploadedFiles.push({ name: file.originalname, url: data.Location });
      }

      if (index === files.length - 1) {
        res.render('uploadStatus', { uploadedFiles, failedFiles });
      }
    });
  });
});

// File Deletion Route
app.post('/delete', (req, res) => {
  const { fileKey } = req.body;
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileKey
  };

  s3.deleteObject(params, (err, data) => {
    if (err) {
      return res.status(500).send('Error deleting file from S3');
    }
    res.send(`File ${fileKey} deleted successfully`);
  });
});

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});