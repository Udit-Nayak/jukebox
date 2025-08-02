import React from 'react';
import { QueueVideo } from '../../types';
import { videoService } from '../../services/video.service';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Button';
import { LoadingSpinner } from '../ui/Button';
import clsx from 'clsx';

interface VideoQueueProps {
  videos: QueueVideo[];
  isLoading: boolean;
  onVote: (videoId: string, voteType: 1 | -1) => void;
  onRemoveVote: (videoId: string) => void;
  currentUserId: string;
}

export const VideoQueue: React.FC<VideoQueueProps> = ({
  videos,
  isLoading,
  onVote,
  onRemoveVote,
  currentUserId
}) => {
  const queueVideos = videoService.filterVideosByStatus(videos, 'queue');
  const sortedVideos = videoService.sortVideosByVotes(queueVideos);

  const handleVote = async (video: QueueVideo, voteType: 1 | -1) => {
    if (video.user_vote === voteType) {
      // Remove vote if clicking the same vote type
      onRemoveVote(video.id);
    } else {
      // Add or change vote
      onVote(video.id, voteType);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (sortedVideos.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No videos in queue</h3>
        <p className="mt-1 text-sm text-gray-500">
          Add some videos to get the party started!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          Queue ({sortedVideos.length})
        </h3>
        <Badge variant="info" size="sm">
          Sorted by votes
        </Badge>
      </div>

      <div className="space-y-3">
        {sortedVideos.map((video, index) => (
          <VideoQueueItem
            key={video.id}
            video={video}
            position={index + 1}
            onVote={(voteType) => handleVote(video, voteType)}
            canVote={videoService.canVoteOnVideo(video)}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </div>
  );
};

// Individual Video Queue Item Component
interface VideoQueueItemProps {
  video: QueueVideo;
  position: number;
  onVote: (voteType: 1 | -1) => void;
  canVote: boolean;
  currentUserId: string;
}

const VideoQueueItem: React.FC<VideoQueueItemProps> = ({
  video,
  position,
  onVote,
  canVote,
  currentUserId
}) => {
  const voteInfo = videoService.getVoteDisplayInfo(video);
  const positionColor = videoService.getPositionColorClass(video.net_votes);
  const isOwnVideo = video.added_by === currentUserId;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start space-x-4">
        {/* Position Number */}
        <div className={clsx(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
          position <= 3 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'
        )}>
          {position}
        </div>

        {/* Thumbnail */}
        <div className="flex-shrink-0">
          <img
            src={video.thumbnail_url || videoService.getThumbnailUrl(video.youtube_video_id)}
            alt={video.title}
            className="w-20 h-15 object-cover rounded"
            onError={(e) => {
              e.currentTarget.src = videoService.getThumbnailUrl(video.youtube_video_id, 'default');
            }}
          />
        </div>

        {/* Video Info */}
        <div className="flex-grow min-w-0">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-grow">
              <h4 className="text-sm font-medium text-gray-900 truncate">
                {video.title}
              </h4>
              <div className="mt-1 flex items-center space-x-2 text-xs text-gray-500">
                <span>Added by {video.added_by_username}</span>
                {video.duration && (
                  <>
                    <span>•</span>
                    <span>{videoService.formatDuration(video.duration)}</span>
                  </>
                )}
                {isOwnVideo && (
                  <>
                    <span>•</span>
                    <Badge variant="info" size="sm">Your video</Badge>
                  </>
                )}
              </div>
            </div>

            {/* Vote Score */}
            <div className="flex-shrink-0 text-right">
              <div className={clsx('text-lg font-bold', positionColor)}>
                {video.net_votes > 0 ? '+' : ''}{video.net_votes}
              </div>
              <div className="text-xs text-gray-500">
                {voteInfo.voteText}
              </div>
            </div>
          </div>

          {/* Vote Buttons */}
          {canVote && (
            <div className="mt-3 flex items-center space-x-2">
              <Button
                size="sm"
                variant={video.user_vote === 1 ? 'primary' : 'ghost'}
                onClick={() => onVote(1)}
                className="flex items-center space-x-1"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span>{video.upvotes}</span>
              </Button>

              <Button
                size="sm"
                variant={video.user_vote === -1 ? 'danger' : 'ghost'}
                onClick={() => onVote(-1)}
                className="flex items-center space-x-1"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>{video.downvotes}</span>
              </Button>

              {voteInfo.totalVotes > 0 && (
                <div className="flex-grow">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${voteInfo.percentage}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {!canVote && (
            <div className="mt-3">
              <Badge variant="default" size="sm">
                {videoService.getVideoStatus(video)}
              </Badge>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoQueue;