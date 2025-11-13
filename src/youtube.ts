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

// Add this new interface to store video metadata
export interface VideoMetadata {
  id: string;
  title: string;
  channelName: string;
  publishDate: string;
  description: string;
  duration: string;
  viewCount: string;
}

export async function getVideoMetadata(videoId: string): Promise<VideoMetadata> {
  try {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    
    // Fetch the video page
    const videoPageBody = await request(url);
    const parsedBody = parse(videoPageBody);

    // Extract title
    const titleMatch = videoPageBody.match(/<meta\s+name="title"\s+content="([^"]*)">/);
    const title = titleMatch ? titleMatch[1] : "Unknown Title";
    
    // Extract channel name
    const channelMatch = videoPageBody.match(/<link\s+itemprop="name"\s+content="([^"]*)">/);
    const channelName = channelMatch ? channelMatch[1] : "Unknown Channel";
    
    // Extract publish date
    const dateMatch = videoPageBody.match(/<meta\s+itemprop="datePublished"\s+content="([^"]*)">/);
    const publishDate = dateMatch ? dateMatch[1] : "Unknown Date";
    
    // Extract description
    const descriptionMatch = videoPageBody.match(/<meta\s+name="description"\s+content="([^"]*)">/);
    const description = descriptionMatch ? descriptionMatch[1] : "No description available";
    
    // Extract duration
    const durationMatch = videoPageBody.match(/<meta\s+itemprop="duration"\s+content="([^"]*)">/);
    const duration = durationMatch ? durationMatch[1].replace("PT", "").replace("H", "h ").replace("M", "m ").replace("S", "s") : "Unknown Duration";
    
    // Extract view count
    const viewCountMatch = videoPageBody.match(/<meta\s+itemprop="interactionCount"\s+content="([^"]*)">/);
    const viewCount = viewCountMatch ? viewCountMatch[1] : "Unknown Views";
    
    return {
      id: videoId,
      title,
      channelName,
      publishDate,
      description,
      duration,
      viewCount
    };
  } catch (error) {
    console.error('Error al obtener metadatos del video:', error);
    return {
      id: videoId,
      title: "Unknown Title",
      channelName: "Unknown Channel",
      publishDate: "Unknown Date",
      description: "No description available",
      duration: "Unknown Duration",
      viewCount: "Unknown Views"
    };
  }
}

// Update the existing getVideoTitle function to use the metadata function
export async function getVideoTitle(videoId: string): Promise<string | null> {
  try {
    const metadata = await getVideoMetadata(videoId);
    return metadata.title;
  } catch (error) {
    console.error('Error al obtener el título del video:', error);
    return null;
  }
}