# Verbo - Plugin de Obsidian para Transcripciones de YouTube con IA

Verbo es un plugin para Obsidian que te permite obtener transcripciones de videos de YouTube y procesarlas con inteligencia artificial (Google Gemini) para mejorar su legibilidad y extraer información clave.

## Características

- Obtiene transcripciones de videos de YouTube directamente desde Obsidian
- Procesa las transcripciones con Google Gemini AI para resumir, estructurar o analizar el contenido
- Opción para incluir marcas de tiempo en la transcripción original
- Interfaz intuitiva con pestañas para ver tanto la transcripción original como la procesada
- Inserta el resultado en la nota actual o crea una nueva nota con el contenido

## Instalación

### Método manual

1. Descarga el último release desde la [página de releases](https://github.com/tu-usuario/verbo/releases)
2. Extrae el archivo zip en la carpeta de plugins de Obsidian: `<vault>/.obsidian/plugins/`
3. Reinicia Obsidian
4. Habilita el plugin en Configuración > Plugins de comunidad

### Desde el repositorio de plugins de Obsidian (próximamente)

1. Abre Obsidian
2. Ve a Configuración > Plugins de comunidad > Explorar
3. Busca "Verbo"
4. Haz clic en "Instalar"
5. Habilita el plugin

## Configuración

1. Obtén una API Key de Google Gemini desde [Google AI Studio](https://ai.google.dev/)
2. En Obsidian, ve a Configuración > Plugins de comunidad > Verbo > Configuración
3. Ingresa tu API Key de Google Gemini
4. Personaliza el prompt predeterminado y otras opciones según tus preferencias

## Uso

1. Haz clic en el ícono de Verbo en la barra lateral o usa el comando "Obtener transcripción de YouTube"
2. Ingresa la URL del video de YouTube
3. Opcionalmente, personaliza el prompt para la IA
4. Haz clic en "Procesar"
5. Revisa la transcripción original y el texto procesado
6. Inserta el resultado en la nota actual o crea una nueva nota

## Licencia

Este proyecto está licenciado bajo [MIT License](LICENSE).

## Soporte

Si encuentras algún problema o tienes sugerencias, por favor [abre un issue](https://github.com/tu-usuario/verbo/issues) en el repositorio.