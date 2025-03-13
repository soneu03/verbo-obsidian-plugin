import { App, PluginSettingTab, Setting, ButtonComponent, TextAreaComponent, Modal, Notice } from 'obsidian';
import { VerboSettings, PromptItem } from './types';
import VerboPlugin from './main';

export class VerboSettingTab extends PluginSettingTab {
  plugin: VerboPlugin;

  constructor(app: App, plugin: VerboPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Configuración de Verbo' });

    // API Key setting
    new Setting(containerEl)
      .setName('API Key de Google Gemini')
      .setDesc('Ingresa tu API key de Google Gemini para procesar las transcripciones')
      .addText(text => text
        .setPlaceholder('API Key')
        .setValue(this.plugin.settings.geminiApiKey)
        .onChange(async (value) => {
          this.plugin.settings.geminiApiKey = value;
          await this.plugin.saveSettings();
        }));

    // Prompt management section
    containerEl.createEl('h3', { text: 'Gestión de Prompts' });

    // Prompt selector
    new Setting(containerEl)
      .setName('Seleccionar prompt')
      .setDesc('Elige un prompt predefinido o personalizado para procesar las transcripciones')
      .addDropdown(dropdown => {
        // Add all prompts to dropdown
        this.plugin.settings.customPrompts.forEach((prompt, index) => {
          dropdown.addOption(index.toString(), prompt.name + (prompt.isDefault ? ' (Predefinido)' : ''));
        });
        
        dropdown.setValue(this.plugin.settings.selectedPromptIndex.toString());
        dropdown.onChange(async (value) => {
          const index = parseInt(value);
          this.plugin.settings.selectedPromptIndex = index;
          this.plugin.settings.defaultPrompt = this.plugin.settings.customPrompts[index].content;
          await this.plugin.saveSettings();
          this.display(); // Refresh the display to update the prompt editor
        });
      });

    const selectedPrompt = this.plugin.settings.customPrompts[this.plugin.settings.selectedPromptIndex];
    const isPredefined = selectedPrompt?.isDefault || false;

    // Prompt name editor
    new Setting(containerEl)
      .setName('Nombre del prompt')
      .setDesc('Edita el nombre del prompt seleccionado')
      .addText(text => {
        text.setValue(selectedPrompt?.name || '')
          .setDisabled(isPredefined) // Disable editing for predefined prompts
          .onChange(async (value) => {
            if (!isPredefined && selectedPrompt) {
              selectedPrompt.name = value;
              await this.plugin.saveSettings();
            }
          });
      });

    // Prompt content editor
    const promptEditorContainer = containerEl.createDiv();
    promptEditorContainer.addClass('verbo-prompt-editor');
    
    const promptEditorHeader = new Setting(promptEditorContainer)
      .setName('Contenido del prompt')
      .setDesc('Edita el contenido del prompt seleccionado');
    
    // Add reset button for predefined prompts
    if (isPredefined) {
      promptEditorHeader.addButton(button => button
        .setButtonText('Restaurar predeterminado')
        .onClick(async () => {
          await this.plugin.resetPredefinedPrompt(this.plugin.settings.selectedPromptIndex);
          this.display(); // Refresh the display
          new Notice('Prompt restaurado a su contenido predeterminado');
        }));
    }
    
    // Add the text area for editing
    const textAreaContainer = promptEditorContainer.createDiv();
    textAreaContainer.addClass('verbo-prompt-textarea');
    
    const textArea = new TextAreaComponent(textAreaContainer);
    textArea
      .setValue(selectedPrompt?.content || '')
      .onChange(async (value) => {
        if (selectedPrompt) {
          selectedPrompt.content = value;
          if (this.plugin.settings.selectedPromptIndex === this.plugin.settings.selectedPromptIndex) {
            this.plugin.settings.defaultPrompt = value;
          }
          await this.plugin.saveSettings();
        }
      });
    
    textArea.inputEl.rows = 10;
    textArea.inputEl.cols = 80;
    textArea.inputEl.addClass('verbo-prompt-textarea-input');

    // Prompt management buttons
    const promptButtonsContainer = containerEl.createDiv();
    promptButtonsContainer.addClass('verbo-prompt-buttons');
    
    // Add new prompt button
    new Setting(promptButtonsContainer)
      .setName('Gestionar prompts')
      .addButton(button => button
        .setButtonText('Añadir nuevo prompt')
        .onClick(async () => {
          const newPrompt: PromptItem = {
            name: 'Nuevo prompt',
            content: 'Ingresa aquí tu prompt personalizado:',
            isDefault: false
          };
          
          this.plugin.settings.customPrompts.push(newPrompt);
          this.plugin.settings.selectedPromptIndex = this.plugin.settings.customPrompts.length - 1;
          this.plugin.settings.defaultPrompt = newPrompt.content;
          await this.plugin.saveSettings();
          this.display(); // Refresh to show the new prompt
          new Notice('Nuevo prompt añadido');
        }))
      .addButton(button => button
        .setButtonText('Eliminar prompt')
        .setDisabled(isPredefined) // Disable delete for predefined prompts
        .onClick(async () => {
          if (isPredefined) {
            new Notice('No se pueden eliminar los prompts predefinidos');
            return;
          }
          
          const index = this.plugin.settings.selectedPromptIndex;
          this.plugin.settings.customPrompts.splice(index, 1);
          
          // Select the first prompt if the deleted one was selected
          if (this.plugin.settings.customPrompts.length > 0) {
            this.plugin.settings.selectedPromptIndex = 0;
            this.plugin.settings.defaultPrompt = this.plugin.settings.customPrompts[0].content;
          }
          
          await this.plugin.saveSettings();
          this.display(); // Refresh to update the list
          new Notice('Prompt eliminado');
        }));

    // Other settings
    containerEl.createEl('h3', { text: 'Otras configuraciones' });
    
    new Setting(containerEl)
      .setName('Incluir marcas de tiempo')
      .setDesc('Incluir marcas de tiempo en la transcripción original')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.includeTimestamps)
        .onChange(async (value) => {
          this.plugin.settings.includeTimestamps = value;
          await this.plugin.saveSettings();
        }));
        
    new Setting(containerEl)
      .setName('Mostrar transcripción original')
      .setDesc('Incluir la transcripción original en la nota generada')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showOriginalTranscript)
        .onChange(async (value) => {
          this.plugin.settings.showOriginalTranscript = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Máximo de tokens')
      .setDesc('Número máximo de tokens para la respuesta de la IA')
      .addSlider(slider => slider
        .setLimits(256, 4096, 256)
        .setValue(this.plugin.settings.maxTokens)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.maxTokens = value;
          await this.plugin.saveSettings();
        }));
        
    // Add some CSS for the prompt editor
    this.addCustomStyles();
  }
  
  addCustomStyles() {
    // Add custom CSS for the prompt editor
    const customCSS = `
      .verbo-prompt-editor {
        margin-top: 1em;
        margin-bottom: 1em;
      }
      
      .verbo-prompt-textarea {
        margin-top: 0.5em;
        width: 100%;
      }
      
      .verbo-prompt-textarea-input {
        width: 100%;
        font-family: monospace;
        resize: vertical;
      }
      
      .verbo-prompt-buttons {
        margin-top: 1em;
        margin-bottom: 1em;
      }
    `;
    
    // Add the styles to the document
    const styleEl = document.createElement('style');
    styleEl.textContent = customCSS;
    document.head.appendChild(styleEl);
  }
}
