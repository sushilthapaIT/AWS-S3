const express = require('express');
const multer = require('multer');
const AWS = require('aws-sdk');
const { authenticate } = require('../project/middleware/auth');
require('dotenv').config();

const router = express.Router();

// AWS S3 Configuration
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
});

// Multer setup for file handling
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', authenticate, upload.single('file'), async (req, res) => {
    try {
        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: `${Date.now()}_${req.file.originalname}`,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
        };

        const result = await s3.upload(params).promise();
        res.status(200).json({ success: true, url: result.Location });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;