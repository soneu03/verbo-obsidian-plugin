import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { VerboSettings } from './types';

export async function processTranscriptWithAI(transcript: string, prompt: string, settings: VerboSettings): Promise<string> {
  try {
    if (!settings.geminiApiKey) {
      throw new Error('API Key de Google Gemini no configurada');
    }

    // Initialize the Generative AI API with your API key
    const genAI = new GoogleGenerativeAI(settings.geminiApiKey);

    // For text-only input, use the gemini model
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro",
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: settings.maxTokens,
        stopSequences: []
      }
    });

    // Prepare the prompt with the transcript
    // Limit transcript size if it's too large to prevent token limit issues
    let processableTranscript = transcript;
    if (transcript.length > 25000) {
      processableTranscript = transcript.substring(0, 25000) + 
        "\n\n[Transcripción truncada debido a su longitud. Procesa la parte mostrada.]";
    }
    
    const fullPrompt = `${prompt}\n\nTranscripción:\n${processableTranscript}`;

    // Generate content
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    let text = response.text();
    
    // Check if response seems truncated and add a note
    if (text.endsWith('...') || text.length < 100) {
      text += "\n\n[Nota: La respuesta parece estar truncada debido a limitaciones de tokens.]";
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