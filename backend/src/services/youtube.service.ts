import axios from 'axios';
import { YouTubeVideoInfo } from '../types';

export class YouTubeService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.YOUTUBE_API_KEY || '';
  }

  // Extract video ID from various YouTube URL formats
  extractVideoId(url: string): string | null {
    const patterns = [
      // Standard YouTube URLs
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      // YouTube shorts
      /youtube\.com\/shorts\/([^&\n?#]+)/,
      // Just the video ID
      /^[a-zA-Z0-9_-]{11}$/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  // Get video information using YouTube API
  async getVideoInfo(videoId: string): Promise<YouTubeVideoInfo | null> {
    if (!this.apiKey) {
      // Fallback: return basic info without API
      return this.getBasicVideoInfo(videoId);
    }

    try {
      const response = await axios.get(
        `https://www.googleapis.com/youtube/v3/videos`,
        {
          params: {
            id: videoId,
            part: 'snippet,contentDetails',
            key: this.apiKey
          }
        }
      );

      if (response.data.items && response.data.items.length > 0) {
        const video = response.data.items[0];
        const snippet = video.snippet;
        const contentDetails = video.contentDetails;

        return {
          video_id: videoId,
          title: snippet.title,
          thumbnail_url: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || '',
          duration: this.parseDuration(contentDetails.duration)
        };
      }

      return null;
    } catch (error) {
      console.error('YouTube API error:', error);
      // Fallback to basic info
      return this.getBasicVideoInfo(videoId);
    }
  }

  // Fallback method when API is not available
  private getBasicVideoInfo(videoId: string): YouTubeVideoInfo {
    return {
      video_id: videoId,
      title: 'YouTube Video', // Default title
      thumbnail_url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      duration: 0 // Unknown duration
    };
  }

  // Parse YouTube duration format (PT4M13S) to seconds
  private parseDuration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const [, hours = '0', minutes = '0', seconds = '0'] = match;
    return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);
  }

  // Validate if a YouTube video exists and is playable
  async validateVideo(videoId: string): Promise<boolean> {
    if (!this.apiKey) {
      // Basic validation - check if ID format is correct
      return /^[a-zA-Z0-9_-]{11}$/.test(videoId);
    }

    try {
      const response = await axios.get(
        `https://www.googleapis.com/youtube/v3/videos`,
        {
          params: {
            id: videoId,
            part: 'status',
            key: this.apiKey
          }
        }
      );

      if (response.data.items && response.data.items.length > 0) {
        const video = response.data.items[0];
        return video.status.uploadStatus === 'processed' && 
               video.status.privacyStatus === 'public';
      }

      return false;
    } catch (error) {
      console.error('YouTube validation error:', error);
      return false;
    }
  }

  // Search YouTube videos (if API key is available)
  async searchVideos(query: string, maxResults: number = 10): Promise<YouTubeVideoInfo[]> {
    if (!this.apiKey) {
      return [];
    }

    try {
      const response = await axios.get(
        `https://www.googleapis.com/youtube/v3/search`,
        {
          params: {
            q: query,
            part: 'snippet',
            type: 'video',
            maxResults,
            key: this.apiKey
          }
        }
      );

      const videoIds = response.data.items.map((item: any) => item.id.videoId);
      
      // Get detailed info for each video
      const detailsResponse = await axios.get(
        `https://www.googleapis.com/youtube/v3/videos`,
        {
          params: {
            id: videoIds.join(','),
            part: 'snippet,contentDetails',
            key: this.apiKey
          }
        }
      );

      return detailsResponse.data.items.map((video: any) => ({
        video_id: video.id,
        title: video.snippet.title,
        thumbnail_url: video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.default?.url || '',
        duration: this.parseDuration(video.contentDetails.duration)
      }));
    } catch (error) {
      console.error('YouTube search error:', error);
      return [];
    }
  }

  // Generate embed URL
  getEmbedUrl(videoId: string, autoplay: boolean = false): string {
    const params = new URLSearchParams();
    if (autoplay) {
      params.append('autoplay', '1');
    }
    params.append('enablejsapi', '1');
    params.append('origin', process.env.CORS_ORIGIN || 'http://localhost:3000');
    
    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
  }

  // Get thumbnail URL
  getThumbnailUrl(videoId: string, quality: 'high' | 'medium' | 'default' = 'high'): string {
    const qualityMap = {
      high: 'hqdefault',
      medium: 'mqdefault', 
      default: 'default'
    };
    
    return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
  }
}

export const youtubeService = new YouTubeService();