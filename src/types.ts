import { VideoMetadata } from './youtube';

export interface VerboSettings {
  geminiApiKey: string;
  defaultPrompt: string;
  includeTimestamps: boolean;
  maxTokens: number;
  selectedPromptIndex: number;
  customPrompts: PromptItem[];
  showOriginalTranscript: boolean;
  responseLanguage: string; // New setting for response language
}

export interface PromptItem {
  name: string;
  content: string;
  isDefault?: boolean;
  defaultPath?: string;
}

export interface ProcessedTranscript {
  original: string;
  processed: string;
  videoId: string;
  videoTitle: string | undefined;
  videoMetadata?: VideoMetadata; // Add this line
}