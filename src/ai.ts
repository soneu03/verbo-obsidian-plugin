import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { VerboSettings } from './types';
import { VideoMetadata } from './youtube';

export async function processTranscriptWithAI(
  transcript: string, 
  prompt: string, 
  settings: VerboSettings,
  videoMetadata?: VideoMetadata
): Promise<string> {
  try {
    if (!settings.geminiApiKey) {
      throw new Error('API Key de Google Gemini no configurada');
    }

    // Initialize the Generative AI API with your API key
    const genAI = new GoogleGenerativeAI(settings.geminiApiKey);

    // For text-only input, use the gemini model
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        // Lower temperature for more deterministic/output-stable responses
        temperature: 0.2,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: settings.maxTokens,
        stopSequences: []
      }
    });

    // Use the transcript as is without length checking
    const processableTranscript = transcript;

    // Pre-check: Validate that transcript is not empty before calling the model
    if (!processableTranscript || processableTranscript.trim().length === 0) {
      console.error('[Verbo] Transcript validation failed: empty or whitespace-only content');
      throw new Error('Transcripción vacía: no se proporcionó contenido para procesar. Verifica que el video tiene subtítulos disponibles.');
    }

    console.log(`[Verbo] Processing transcript (${processableTranscript.length} chars) with model gemini-2.5-flash`);
    
    // Add language instruction based on user's selection
    let languageInstruction = '';
    switch (settings.responseLanguage) {
      case 'en':
        languageInstruction = 'Please respond in English.';
        break;
      case 'fr':
        languageInstruction = 'Veuillez répondre en français.';
        break;
      case 'de':
        languageInstruction = 'Bitte antworten Sie auf Deutsch.';
        break;
      case 'it':
        languageInstruction = 'Per favore, rispondi in italiano.';
        break;
      case 'pt':
        languageInstruction = 'Por favor, responda em português.';
        break;
      case 'es':
      default:
        languageInstruction = 'Por favor, responde en español.';
        break;
    }
    
    // Include the language instruction in the prompt and make the instruction
    // explicit so the model processes the transcript between markers and
    // returns only the processed Markdown text (do not repeat the prompt).
    const fullPrompt = [
      prompt,
      languageInstruction,
      'INSTRUCCIONES: Procesa la transcripción que aparece entre las etiquetas "###TRANSCRIPCION_START###" y "###TRANSCRIPCION_END###".',
      'DEVUELVE SOLO el texto procesado en Markdown. NO repitas ni expliques estas instrucciones ni el prompt.',
      '###TRANSCRIPCION_START###',
      processableTranscript,
      '###TRANSCRIPCION_END###',
      'RESPUESTA:'
    ].join('\n\n');

    // Generate content
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    let text = response.text();
    
    // Check if response seems truncated and add a note
    if (text.endsWith('...') || text.length < 100) {
      text += "\n\n[Nota: La respuesta parece estar truncada debido a limitaciones de tokens.]";
    }
    
    // Add YAML frontmatter with video metadata if available
    if (videoMetadata) {
      // Format the date if it exists
      const formattedDate = videoMetadata.publishDate ? 
        new Date(videoMetadata.publishDate).toISOString().split('T')[0] : 
        '';
      
      // Create YAML frontmatter
      const yamlFrontmatter = `---
title: "${videoMetadata.title?.replace(/"/g, '\\"') || 'Transcripción de YouTube'}"
channel: "${videoMetadata.channelName?.replace(/"/g, '\\"') || 'Canal desconocido'}"
date: ${formattedDate}
link: "https://www.youtube.com/watch?v=${videoMetadata.id}"
duration: "${videoMetadata.duration || ''}"
views: "${videoMetadata.viewCount || ''}"
tags: [youtube, transcripción]
---

`;
      
      // Add frontmatter only if it doesn't already exist
      if (!text.startsWith('---')) {
        text = yamlFrontmatter + text;
      }
    }
    
    return text;
  } catch (error) {
    console.error('Error al procesar con IA:', error);
    
    // Provide more specific error messages
    if (error.message.includes('token limit')) {
      throw new Error('La transcripción es demasiado larga para ser procesada. Intenta con un video más corto.');
    } else if (error.message.includes('quota')) {
      throw new Error('Se ha excedido la cuota de la API de Google Gemini. Intenta más tarde.');
    } else {
      throw new Error(`Error al procesar con IA: ${error.message}`);
    }
  }
}