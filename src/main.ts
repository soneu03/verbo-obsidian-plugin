import { Plugin, MarkdownView, Notice, addIcon } from 'obsidian';
import { VerboSettingTab } from './settings';
import { VerboModal } from './ui/modal';
import { VerboSettings, PromptItem } from './types';
import '../styles.css';

// Predefined prompts
const PREDEFINED_PROMPTS: PromptItem[] = [
  {
    name: "General Use",
    content: "Resume esta transcripción manteniendo los puntos clave:",
    isDefault: true,
    defaultPath: "src/ui/General use prompt.txt"
  },
  {
    name: "TTS-Friendly",
    content: "Convierte esta transcripción en un formato optimizado para Text-to-Speech:",
    isDefault: true,
    defaultPath: "src/ui/To-Speech_prompt.txt"
  },
  {
    name: "Sophisticated Format",
    content: "Transforma esta transcripción en un documento Markdown profesional y estructurado:",
    isDefault: true,
    defaultPath: "src/ui/Sofisticated_prompt.txt"
  }
];

const DEFAULT_SETTINGS: VerboSettings = {
  geminiApiKey: '',
  defaultPrompt: PREDEFINED_PROMPTS[0].content,
  includeTimestamps: true,
  maxTokens: 1024,
  selectedPromptIndex: 0,
  customPrompts: PREDEFINED_PROMPTS,
  showOriginalTranscript: true // Default to showing the original transcript
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
      this.settings.customPrompts = [...PREDEFINED_PROMPTS];
      return;
    }
    
    // Check if each predefined prompt exists
    for (const predefined of PREDEFINED_PROMPTS) {
      const exists = this.settings.customPrompts.some(
        p => p.isDefault && p.defaultPath === predefined.defaultPath
      );
      
      if (!exists) {
        // Add missing predefined prompt
        this.settings.customPrompts.push(predefined);
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