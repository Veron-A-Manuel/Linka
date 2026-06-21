const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Garantir que as pastas existem
const directoriaUpload = path.join(process.cwd(), 'uploads/produtos');
if (!fs.existsSync(directoriaUpload)) {
  fs.mkdirSync(directoriaUpload, { recursive: true });
}

// Configuração de armazenamento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, directoriaUpload);
  },
  filename: (req, file, cb) => {
    const nomeUnico = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, nomeUnico);
  }
});

// Filtro: imagens + vídeos
const fileFilter = (req, file, cb) => {
  const tiposPermitidos = /jpeg|jpg|png|webp|mp4|webm|quicktime/;
  const mimetype = tiposPermitidos.test(file.mimetype);
  const extname = tiposPermitidos.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Tipo de ficheiro não suportado. Use imagens (JPG, PNG, WEBP) ou vídeos (MP4, WebM).'));
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB (vídeos até 30s)
    files: 6 // Máximo 5 imagens + 1 vídeo
  },
  fileFilter: fileFilter
});

module.exports = upload;
