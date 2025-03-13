const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const archiver = require('archiver');

// Asegúrate de instalar archiver: npm install archiver --save-dev

// Directorio del plugin
const PLUGIN_DIR = 'g:\\Mi unidad\\Mis Notas\\.obsidian\\plugins\\verbo';

// Construir el plugin
console.log('Construyendo el plugin...');
execSync('npm run build', { cwd: PLUGIN_DIR, stdio: 'inherit' });

// Leer la versión del manifest
const manifest = JSON.parse(fs.readFileSync(path.join(PLUGIN_DIR, 'manifest.json'), 'utf8'));
const version = manifest.version;

// Crear directorio de salida si no existe
const outDir = path.join(PLUGIN_DIR, 'dist');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir);
}

// Nombre del archivo zip
const zipName = `verbo-${version}.zip`;
const zipPath = path.join(outDir, zipName);

// Crear el archivo zip
console.log(`Empaquetando el plugin en ${zipPath}...`);
const output = fs.createWriteStream(zipPath);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log(`Empaquetado completado: ${archive.pointer()} bytes totales`);
  console.log(`El plugin ha sido empaquetado en: ${zipPath}`);
});

archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);

// Archivos a incluir en el zip
const filesToInclude = [
  'main.js',
  'manifest.json',
  'styles.css',
  'README.md',
  'LICENSE'
];

// Añadir los archivos al zip
filesToInclude.forEach(file => {
  const filePath = path.join(PLUGIN_DIR, file);
  if (fs.existsSync(filePath)) {
    archive.file(filePath, { name: file });
  } else {
    console.warn(`Advertencia: El archivo ${file} no existe y no será incluido.`);
  }
});

// Finalizar el archivo
archive.finalize();