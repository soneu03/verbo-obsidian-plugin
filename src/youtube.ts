import { request } from 'obsidian';
import { parse } from 'node-html-parser';

const YOUTUBE_TITLE_REGEX = new RegExp(
  /<meta\s+name="title"\s+content="([^"]*)">/,
);

export async function getVideoId(url: string): Promise<string | null> {
  // Extract video ID from various YouTube URL formats
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

export async function getTranscript(videoId: string, includeTimestamps: boolean = true): Promise<string> {
  try {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    
    // Fetch the video page
    const videoPageBody = await request(url);
    const parsedBody = parse(videoPageBody);

    // Extract scripts from the page
    const scripts = parsedBody.getElementsByTagName("script");
    const playerScript = scripts.find((script) =>
      script.textContent.includes("var ytInitialPlayerResponse = {"),
    );

    if (!playerScript) {
      throw new Error('No se pudo encontrar la información del video');
    }

    // Extract player data
    const dataString =
      playerScript.textContent
        ?.split("var ytInitialPlayerResponse = ")?.[1]
        ?.split("};")?.[0] + "}";

    const data = JSON.parse(dataString.trim());
    const availableCaptions =
      data?.captions?.playerCaptionsTracklistRenderer
        ?.captionTracks || [];

    if (!availableCaptions.length) {
      throw new Error('No se encontró transcripción para este video');
    }

    // Get the first available caption track
    const captionTrack = availableCaptions[0];
    const captionsUrl = captionTrack?.baseUrl;
    const fixedCaptionsUrl = captionsUrl.startsWith("https://")
      ? captionsUrl
      : "https://www.youtube.com" + captionsUrl;

    // Fetch and parse the captions XML
    const resXML = await request(fixedCaptionsUrl).then((xml) =>
      parse(xml),
    );

    const chunks = resXML.getElementsByTagName("text");
    
    // Format the transcript
    let transcript = chunks.map((cue: any) => {
      const text = cue.textContent
        .replaceAll("&#39;", "'")
        .replaceAll("&amp;", "&")
        .replaceAll("&quot;", '"')
        .replaceAll("&apos;", "'")
        .replaceAll("&lt;", "<")
        .replaceAll("&gt;", ">");
      
      if (includeTimestamps) {
        const seconds = parseFloat(cue.attributes.start);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        const timestamp = `[${minutes}:${remainingSeconds.toString().padStart(2, '0')}]`;
        return `${timestamp} ${text}`;
      }
      return text;
    }).join('\n');
    
    // Clean up line breaks when timestamps are disabled
    if (!includeTimestamps) {
      // Join all lines and then split by sentence-ending punctuation followed by space
      transcript = transcript
        .replace(/\n/g, ' ')  // Replace all line breaks with spaces
        .replace(/\s+/g, ' ') // Replace multiple spaces with a single space
        .trim();              // Trim leading/trailing spaces
    }
    
    return transcript;
  } catch (error) {
    console.error('Error al obtener la transcripción:', error);
    throw new Error('No se pudo obtener la transcripción del video');
  }
}

export async function getVideoTitle(videoId: string): Promise<string | null> {
  try {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    
    // Fetch the video page
    const videoPageBody = await request(url);
    
    // Extract title using regex
    const titleMatch = videoPageBody.match(YOUTUBE_TITLE_REGEX);
    if (titleMatch) {
      return titleMatch[1];
    }
    
    return null;
  } catch (error) {
    console.error('Error al obtener el título del video:', error);
    return null;
  }
}