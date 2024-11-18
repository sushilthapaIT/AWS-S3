const AWS = require('aws-sdk');

// Set up AWS credentials 
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,          
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,  
  region: process.env.AWS_REGION       
});

const s3 = new AWS.S3();

// Function to upload a file to S3
function uploadFileToS3(fileBuffer, fileName, mimeType, bucketName) {
  const params = {
    Bucket: bucketName, 
    // Use timestamp to avoid name conflict
    Key: `${Date.now()}_${fileName}`, 
    Body: fileBuffer,
    ContentType: mimeType,
    ACL: 'public-read' 
  };

  return new Promise((resolve, reject) => {
    s3.upload(params, (err, data) => {
      if (err) {
        //console.error("Error uploading file:", err);
        return reject(err); 
      }
      resolve(data); 
    });
  });
}

module.exports = {
  uploadFileToS3
};