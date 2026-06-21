const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const ErroApp = require('../utils/erro-app');

// ============================================================
// LINKA — Configuração do Multer (Upload de Imagens e Vídeos)
// ============================================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const extensao = path.extname(file.originalname);
    cb(null, `${uuidv4()}${extensao}`);
  }
});

const fileFilter = (req, file, cb) => {
  const tiposPermitidos = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
    'video/mp4', 'video/webm', 'video/quicktime'
  ];

  if (tiposPermitidos.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ErroApp('Tipo de ficheiro não suportado. Use imagens (JPG, PNG, WEBP) ou vídeos (MP4, WebM).', 400), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB (vídeos até 30s)
  }
});

module.exports = upload;
