import { App, Modal, ButtonComponent, MarkdownRenderer, MarkdownView, Notice } from 'obsidian';
import VerboPlugin from '../main';
import { ProcessedTranscript } from '../types';

export class VerboResultView extends Modal {
  plugin: VerboPlugin;
  result: ProcessedTranscript;

  constructor(app: App, plugin: VerboPlugin, result: ProcessedTranscript) {
    super(app);
    this.plugin = plugin;
    this.result = result;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.addClass('verbo-result-view');

    // Título del video
    if (this.result.videoTitle) {
      contentEl.createEl('h2', { text: this.result.videoTitle });
    } else {
      contentEl.createEl('h2', { text: 'Resultado del procesamiento' });
    }

    // Enlace al video
    const videoLink = contentEl.createEl('a', { 
      text: 'Ver video original en YouTube',
      href: `https://www.youtube.com/watch?v=${this.result.videoId}`
    });
    videoLink.setAttribute('target', '_blank');
    contentEl.createEl('hr');

    // Contenedor de pestañas
    const tabContainer = contentEl.createDiv();
    tabContainer.addClass('verbo-tabs');

    // Botones de pestañas
    const tabButtons = tabContainer.createDiv();
    tabButtons.addClass('verbo-tab-buttons');

    const processedTab = tabButtons.createEl('button', { text: 'Procesado' });
    processedTab.addClass('verbo-tab-button');
    processedTab.addClass('active');

    const originalTab = tabButtons.createEl('button', { text: 'Transcripción Original' });
    originalTab.addClass('verbo-tab-button');

    // Contenido de pestañas
    const tabContent = tabContainer.createDiv();
    tabContent.addClass('verbo-tab-content');

    // Pestaña de contenido procesado
    const processedContent = tabContent.createDiv();
    processedContent.addClass('verbo-tab-pane');
    processedContent.addClass('active');
    MarkdownRenderer.renderMarkdown(
      this.result.processed,
      processedContent,
      '',
      this.plugin
    );

    // Pestaña de transcripción original
    const originalContent = tabContent.createDiv();
    originalContent.addClass('verbo-tab-pane');
    originalContent.setText(this.result.original);

    // Funcionalidad de cambio de pestañas
    processedTab.addEventListener('click', () => {
      processedTab.addClass('active');
      originalTab.removeClass('active');
      processedContent.addClass('active');
      originalContent.removeClass('active');
    });

    originalTab.addEventListener('click', () => {
      originalTab.addClass('active');
      processedTab.removeClass('active');
      originalContent.addClass('active');
      processedContent.removeClass('active');
    });

    // Botones de acción
    const buttonContainer = contentEl.createDiv();
    buttonContainer.addClass('verbo-button-container');

    // Botón para insertar en la nota actual
    const insertButton = new ButtonComponent(buttonContainer)
      .setButtonText('Insertar en nota actual')
      .setCta()
      .onClick(() => {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView) {
          const editor = activeView.editor;
          const cursor = editor.getCursor();
          
          // Crear contenido a insertar
          const contentArray = [
            `## ${this.result.videoTitle || 'Transcripción de YouTube'}`,
            `[Ver video](https://www.youtube.com/watch?v=${this.result.videoId})`,
            '',
            this.result.processed,
            ''
          ];
          
          // Only add the original transcript if the setting is enabled
          if (this.plugin.settings.showOriginalTranscript) {
            contentArray.push(
              '---',
              '> [!info] Transcripción original',
              '> ```',
              this.result.original.split('\n').map(line => `> ${line}`).join('\n'),
              '> ```'
            );
          }
          
          const content = contentArray.join('\n');
          editor.replaceRange(content, cursor);
          this.close();
        } else {
          new Notice('No hay una nota abierta para insertar el contenido');
        }
      });

    // Botón para crear nueva nota
    const newNoteButton = new ButtonComponent(buttonContainer)
      .setButtonText('Crear nueva nota')
      .onClick(() => {
        this.createNote(); // Use the createNote method instead of inline implementation
      });

    // Botón para cerrar
    const closeButton = new ButtonComponent(buttonContainer)
      .setButtonText('Cerrar')
      .onClick(() => {
        this.close();
      });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

  async createNote() {
    try {
      const activeFolder = this.app.vault.getAbstractFileByPath(
        this.app.workspace.getActiveFile()?.parent?.path || "/"
      );
      
      const folderPath = activeFolder ? activeFolder.path : "";
      
      // Sanitize the title for use as a filename
      let fileName = this.result.videoTitle || `YouTube Transcript ${this.result.videoId}`;
      fileName = this.sanitizeFileName(fileName);
      
      // Create the full note content
      const contentArray = [
        `# ${this.result.videoTitle || `YouTube Transcript ${this.result.videoId}`}`,
        `[Ver video](https://www.youtube.com/watch?v=${this.result.videoId})`,
        '',
        this.result.processed,
        ''
      ];
  
      // Only add the original transcript if the setting is enabled
      if (this.plugin.settings.showOriginalTranscript) {
        contentArray.push(
          '---',
          '> [!info] Transcripción original',
          '> ```',
          this.result.original.split('\n').map(line => `> ${line}`).join('\n'),
          '> ```'
        );
      }
      
      // Convert the array to a string
      const noteContent = contentArray.join('\n');
      
      // Create the note in the vault
      const filePath = `${folderPath ? folderPath + "/" : ""}${fileName}.md`;
      const file = await this.app.vault.create(filePath, noteContent);
      
      // Open the newly created note
      const leaf = this.app.workspace.getLeaf(false);
      await leaf.openFile(file);
      
      this.close();
      new Notice('Nota creada exitosamente');
    } catch (error) {
      console.error('Error al crear la nota:', error);
      new Notice(`Error al crear la nota: ${error.message}`);
    }
  }
  
  // Add this new method to sanitize file names
  sanitizeFileName(fileName: string): string {
    // Replace invalid characters with safe alternatives
    return fileName
      .replace(/[*"\\/<>:|?]/g, '-') // Replace invalid chars with hyphens
      .replace(/\s+/g, ' ')          // Replace multiple spaces with single space
      .trim();                        // Remove leading/trailing spaces
  }
}