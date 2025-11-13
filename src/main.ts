import { Plugin, MarkdownView, Notice, addIcon } from 'obsidian';
import { VerboSettingTab } from './settings';
import { VerboModal } from './ui/modal';
import { VerboSettings, PromptItem } from './types';
import '../styles.css';
import { DEFAULT_PROMPTS } from './ui/prompts';

// In the DEFAULT_SETTINGS object
const DEFAULT_SETTINGS: VerboSettings = {
  geminiApiKey: '',
  defaultPrompt: DEFAULT_PROMPTS.general,
  includeTimestamps: true,
  maxTokens: 2048,
  selectedPromptIndex: 0,
  customPrompts: [
      { name: 'Uso General', content: DEFAULT_PROMPTS.general, isDefault: true },
      { name: 'TTS-Friendly', content: DEFAULT_PROMPTS.tts, isDefault: true },
      { name: 'Formato Sofisticado', content: DEFAULT_PROMPTS.sophisticated, isDefault: true }
  ],
  showOriginalTranscript: true,
  responseLanguage: 'es' // Default to Spanish
};

export default class VerboPlugin extends Plugin {
  settings: VerboSettings;

  async onload() {
    console.log('Cargando plugin Verbo');
    
    await this.loadSettings();
    
    // Ensure predefined prompts are always available
    this.ensurePredefinedPrompts();
    
    // Agregar ícono personalizado
    addIcon('verbo-icon', `<svg viewBox="0 0 100 100" width="100" height="100">
      <path fill="currentColor" d="M50 20 L75 40 L75 80 L25 80 L25 40 Z M40 50 L60 50 M40 60 L60 60 M40 70 L60 70"></path>
    </svg>`);

    // Agregar comando para abrir el modal
    this.addCommand({
      id: 'open-verbo-modal',
      name: 'Obtener transcripción de YouTube',
      icon: 'verbo-icon',
      callback: () => {
        new VerboModal(this.app, this).open();
      }
    });

    // Agregar botón en la barra de herramientas del editor
    this.addRibbonIcon('file-video', 'Verbo: Transcripción de YouTube', () => {
      new VerboModal(this.app, this).open();
    });

    // Agregar pestaña de configuración
    this.addSettingTab(new VerboSettingTab(this.app, this));
  }

  onunload() {
    console.log('Descargando plugin Verbo');
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
  
  // Ensure predefined prompts are always available
  ensurePredefinedPrompts() {
    // If no prompts exist, use the predefined ones
    if (!this.settings.customPrompts || this.settings.customPrompts.length === 0) {
      this.settings.customPrompts = [
        { name: 'Uso General', content: DEFAULT_PROMPTS.general, isDefault: true },
        { name: 'TTS-Friendly', content: DEFAULT_PROMPTS.tts, isDefault: true },
        { name: 'Formato Sofisticado', content: DEFAULT_PROMPTS.sophisticated, isDefault: true }
      ];
      return;
    }
    
    // Check if each predefined prompt exists
    const predefinedNames = ['Uso General', 'TTS-Friendly', 'Formato Sofisticado'];
    
    for (let i = 0; i < predefinedNames.length; i++) {
      const exists = this.settings.customPrompts.some(p => p.name === predefinedNames[i]);
      
      if (!exists) {
        // Add missing predefined prompt
        const promptContent = i === 0 ? DEFAULT_PROMPTS.general : 
                             i === 1 ? DEFAULT_PROMPTS.tts : 
                             DEFAULT_PROMPTS.sophisticated;
                             
        this.settings.customPrompts.push({
          name: predefinedNames[i],
          content: promptContent,
          isDefault: true
        });
      }
    }
  }
  
  // Load the full content of a predefined prompt
  async loadPredefinedPromptContent(promptPath: string): Promise<string> {
    try {
      // For a real plugin, you would use the adapter to read the file
      // This is a simplified version that would need to be adapted
      const response = await fetch(promptPath);
      return await response.text();
    } catch (error) {
      console.error(`Error loading prompt from ${promptPath}:`, error);
      return "Error loading predefined prompt.";
    }
  }
  
  // Reset a predefined prompt to its default content
  async resetPredefinedPrompt(index: number) {
    const prompt = this.settings.customPrompts[index];
    if (prompt && prompt.isDefault && prompt.defaultPath) {
      const content = await this.loadPredefinedPromptContent(prompt.defaultPath);
      prompt.content = content;
      await this.saveSettings();
    }
  }
}