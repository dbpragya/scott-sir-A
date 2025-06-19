const multer = require('multer');
const path = require('path');

// Set up storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/profile-pictures'); 
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); 
  }
});

// Set up file filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|jfif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  if (extname) {
    return cb(null, true);
  } else {
    cb(new Error('Error: Only image files (jpeg, jpg, png, jfif) are allowed!'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },  // 2MB file size limit
}).single('profilePicture');

function handleMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({status: false, message: 'File size exceeds the 2MB limit!' });
    }
    return res.status(400).json({status: false, message: `Multer message: ${err.message}` });
  } else if (err) {
    return res.status(400).json({status: false, message: err.message });
  }
  next();
}

module.exports = { upload, handleMulterError };
