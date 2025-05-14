const multer = require('multer');
const path = require('path');

// Set the storage engine
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/profile-pictures'); // Save to this folder
  },
  filename: function (req, file, cb) {
    // Use original filename and add timestamp to avoid name conflicts
    cb(null, Date.now() + path.extname(file.originalname)); // e.g. 1633024872912.jpg
  }
});

// File filter to accept only image files
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb('Error: Only image files are allowed!');
  }
};

// Initialize multer with storage and file filter
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 } // Max file size: 2MB
}).single('profilePicture'); // 'profilePicture' is the field name for the uploaded file

module.exports = upload;
