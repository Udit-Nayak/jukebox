import { apiService } from './api';
import {
  QueueVideo,
  AddVideoRequest,
  VoteRequest,
  VideoValidationResponse,
} from '../types';

class VideoService {
  // Add video to queue
  async addVideoToQueue(videoData: AddVideoRequest): Promise<QueueVideo> {
    const response = await apiService.post<{ video: QueueVideo }>('/api/videos/add', videoData);
    
    if (response.success && response.data) {
      return response.data.video;
    }

    throw new Error(response.error || 'Failed to add video to queue');
  }

  // Vote on a video
  async voteVideo(voteData: VoteRequest): Promise<QueueVideo> {
    const response = await apiService.post<{ video: QueueVideo }>('/api/videos/vote', voteData);
    
    if (response.success && response.data) {
      return response.data.video;
    }

    throw new Error(response.error || 'Failed to vote on video');
  }

  // Remove vote from video
  async removeVote(videoId: string): Promise<QueueVideo> {
    const response = await apiService.delete<{ video: QueueVideo }>(`/api/videos/${videoId}/vote`);
    
    if (response.success && response.data) {
      return response.data.video;
    }

    throw new Error(response.error || 'Failed to remove vote');
  }

  // Get user's vote for a video
  async getUserVote(videoId: string): Promise<number | null> {
    const response = await apiService.get<{ user_vote: number | null }>(`/api/videos/${videoId}/votes`);
    
    if (response.success && response.data) {
      return response.data.user_vote;
    }

    return null;
  }

  // Validate YouTube URL
  async validateYouTubeUrl(youtubeUrl: string): Promise<VideoValidationResponse> {
    const response = await apiService.post<VideoValidationResponse>('/api/videos/validate', {
      youtube_url: youtubeUrl
    });
    
    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to validate YouTube URL');
  }

  // Extract video ID from YouTube URL
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

  // Check if URL is a valid YouTube URL format
  isValidYouTubeUrl(url: string): boolean {
    return this.extractVideoId(url) !== null;
  }

  // Generate YouTube thumbnail URL
  getThumbnailUrl(videoId: string, quality: 'high' | 'medium' | 'default' = 'high'): string {
    const qualityMap = {
      high: 'hqdefault',
      medium: 'mqdefault',
      default: 'default'
    };
    
    return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
  }

  // Generate YouTube embed URL
  getEmbedUrl(videoId: string, autoplay: boolean = false): string {
    const params = new URLSearchParams();
    if (autoplay) {
      params.append('autoplay', '1');
    }
    params.append('enablejsapi', '1');
    params.append('origin', window.location.origin);
    
    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
  }

  // Generate YouTube watch URL
  getWatchUrl(videoId: string): string {
    return `https://www.youtube.com/watch?v=${videoId}`;
  }

  // Format duration from seconds to MM:SS or HH:MM:SS
  formatDuration(seconds: number): string {
    if (seconds === 0) return '00:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // Calculate net vote percentage
  getVotePercentage(upvotes: number, downvotes: number): number {
    const total = upvotes + downvotes;
    if (total === 0) return 0;
    return Math.round((upvotes / total) * 100);
  }

  // Get vote display info
  getVoteDisplayInfo(video: QueueVideo): {
    percentage: number;
    totalVotes: number;
    netVotes: number;
    voteText: string;
  } {
    const totalVotes = video.upvotes + video.downvotes;
    const percentage = this.getVotePercentage(video.upvotes, video.downvotes);
    const netVotes = video.net_votes;
    
    let voteText = '';
    if (totalVotes === 0) {
      voteText = 'No votes yet';
    } else if (totalVotes === 1) {
      voteText = '1 vote';
    } else {
      voteText = `${totalVotes} votes`;
    }

    return { percentage, totalVotes, netVotes, voteText };
  }

  // Get video position color class based on net votes
  getPositionColorClass(netVotes: number): string {
    if (netVotes > 3) return 'text-green-600';
    if (netVotes > 0) return 'text-green-500';
    if (netVotes === 0) return 'text-gray-500';
    if (netVotes > -3) return 'text-orange-500';
    return 'text-red-500';
  }

  // Check if video can be voted on
  canVoteOnVideo(video: QueueVideo): boolean {
    return !video.is_played && !video.is_current;
  }

  // Get video status text
  getVideoStatus(video: QueueVideo): string {
    if (video.is_current) return 'Now Playing';
    if (video.is_played) return 'Played';
    return 'In Queue';
  }

  // Get video status color class
  getVideoStatusColor(video: QueueVideo): string {
    if (video.is_current) return 'text-blue-600 bg-blue-100';
    if (video.is_played) return 'text-gray-500 bg-gray-100';
    return 'text-green-600 bg-green-100';
  }

  // Sort videos by net votes (for client-side sorting)
  sortVideosByVotes(videos: QueueVideo[]): QueueVideo[] {
    return [...videos].sort((a, b) => {
      // First sort by net votes (descending)
      if (b.net_votes !== a.net_votes) {
        return b.net_votes - a.net_votes;
      }
      // Then by added time (ascending - first added first)
      return new Date(a.added_at).getTime() - new Date(b.added_at).getTime();
    });
  }

  // Filter videos by status
  filterVideosByStatus(videos: QueueVideo[], status: 'queue' | 'current' | 'played'): QueueVideo[] {
    switch (status) {
      case 'current':
        return videos.filter(v => v.is_current);
      case 'played':
        return videos.filter(v => v.is_played);
      case 'queue':
      default:
        return videos.filter(v => !v.is_played && !v.is_current);
    }
  }
}

export const videoService = new VideoService();
export default videoService;