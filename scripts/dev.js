const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ruta al directorio de plugins de Obsidian
const PLUGIN_DIR = 'g:\\Mi unidad\\Mis Notas\\.obsidian\\plugins\\verbo';

// Ejecutar esbuild en modo watch
const esbuild = exec('npm run dev', { cwd: PLUGIN_DIR });

esbuild.stdout.on('data', (data) => {
  console.log(`esbuild: ${data}`);
});

esbuild.stderr.on('data', (data) => {
  console.error(`esbuild error: ${data}`);
});

console.log('Watching for changes...');