import { App, Modal, Setting, Notice, ButtonComponent, DropdownComponent } from 'obsidian';
import VerboPlugin from '../main';
import { getVideoId, getTranscript, getVideoTitle, getVideoMetadata, VideoMetadata } from '../youtube';
import { processTranscriptWithAI } from '../ai';
import { ProcessedTranscript } from '../types';
import { VerboResultView } from './view';

export class VerboModal extends Modal {
  plugin: VerboPlugin;
  youtubeUrl: string = '';
  selectedPromptIndex: number;
  isProcessing: boolean = false;

  constructor(app: App, plugin: VerboPlugin) {
    super(app);
    this.plugin = plugin;
    this.selectedPromptIndex = this.plugin.settings.selectedPromptIndex;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: 'Verbo: Transcripción de YouTube' });
  
    // URL input with more space
    new Setting(contentEl)
      .setName('URL de YouTube')
      .setDesc('Ingresa la URL del video de YouTube')
      .addText(text => text
        .setPlaceholder('https://www.youtube.com/watch?v=...')
        .onChange(value => {
          this.youtubeUrl = value;
        })
        .inputEl.style.width = '100%');
  
    // Prompt selector dropdown
    new Setting(contentEl)
      .setName('Seleccionar prompt')
      .setDesc('Elige el tipo de procesamiento para la transcripción')
      .addDropdown(dropdown => {
        // Add all prompts to dropdown
        this.plugin.settings.customPrompts.forEach((prompt, index) => {
          dropdown.addOption(index.toString(), prompt.name);
        });
        
        dropdown.setValue(this.selectedPromptIndex.toString());
        dropdown.onChange(value => {
          this.selectedPromptIndex = parseInt(value);
        });
      });
  
    // Add checkbox for including original transcript
    new Setting(contentEl)
      .setName('Incluir transcripción original')
      .setDesc('Incluir la transcripción original en el resultado')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showOriginalTranscript)
        .onChange(value => {
          // Temporarily override the global setting for this session
          this.plugin.settings.showOriginalTranscript = value;
        })
      );
  
    const buttonContainer = contentEl.createDiv();
    buttonContainer.addClass('verbo-button-container');
  
    const processButton = new ButtonComponent(buttonContainer)
      .setButtonText('Procesar')
      .setCta()
      .onClick(async () => {
        if (this.isProcessing) return;
        
        if (!this.youtubeUrl) {
          new Notice('Por favor, ingresa una URL de YouTube válida');
          return;
        }

        this.isProcessing = true;
        processButton.setButtonText('Procesando...').setDisabled(true);

        try {
          const videoId = await getVideoId(this.youtubeUrl);
          
          if (!videoId) {
            throw new Error('URL de YouTube inválida');
          }

          const transcript = await getTranscript(videoId, this.plugin.settings.includeTimestamps);
          const metadata = await getVideoMetadata(videoId);
          
          // Use the selected prompt from the dropdown
          const promptContent = this.plugin.settings.customPrompts[this.selectedPromptIndex].content;
          
          // Pass the metadata to the AI processing function
          const processedText = await processTranscriptWithAI(
            transcript, 
            promptContent, 
            this.plugin.settings,
            metadata
          );
          
          const result: ProcessedTranscript = {
            original: transcript,
            processed: processedText,
            videoId: videoId,
            videoTitle: metadata.title,
            videoMetadata: metadata
          };
          
          this.close();
          new VerboResultView(this.app, this.plugin, result).open();
        } catch (error) {
          console.error('Error en el procesamiento:', error);
          new Notice(`Error: ${error.message}`);
          processButton.setButtonText('Procesar').setDisabled(false);
          this.isProcessing = false;
        }
      });

    const cancelButton = new ButtonComponent(buttonContainer)
      .setButtonText('Cancelar')
      .onClick(() => {
        this.close();
      });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}