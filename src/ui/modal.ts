import { App, Modal, Setting, Notice, ButtonComponent, DropdownComponent } from 'obsidian';
import VerboPlugin from '../main';
import { getVideoId, getTranscript, getVideoTitle } from '../youtube';
import { processTranscriptWithAI } from '../ai';
import { ProcessedTranscript } from '../types';
import { VerboResultView } from './view';

export class VerboModal extends Modal {
  plugin: VerboPlugin;
  youtubeUrl: string = '';
  customPrompt: string = '';
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
          this.customPrompt = this.plugin.settings.customPrompts[this.selectedPromptIndex].content;
        });
      });

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
          const videoTitle = await getVideoTitle(videoId);
          
          // Use the selected prompt from the dropdown
          const promptContent = this.plugin.settings.customPrompts[this.selectedPromptIndex].content;
          
          // Check if transcript is too long and might cause truncation
          if (transcript.length > 15000) {
            new Notice('La transcripción es muy larga. Procesando en modo optimizado...');
          }
          
          let processedText = await processTranscriptWithAI(transcript, promptContent, this.plugin.settings);
          
          // Check for potential truncation
          if (processedText.endsWith('...') || 
              processedText.length < 100 || 
              processedText.includes('[truncated]')) {
            new Notice('La respuesta parece estar truncada. Intentando nuevamente con un enfoque diferente...');
            
            // Try processing with a higher token limit or by splitting the transcript
            const updatedSettings = {...this.plugin.settings, maxTokens: 4096};
            processedText = await processTranscriptWithAI(
              transcript.substring(0, 12000), // Process first part of transcript
              promptContent + " (Nota: Procesa solo la primera parte de la transcripción)",
              updatedSettings
            );
          }
    
          const result: ProcessedTranscript = {
            original: transcript,
            processed: processedText,
            videoId: videoId,
            videoTitle: videoTitle || undefined
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