import React, { useEffect, useRef } from 'react';
import { QueueVideo } from '../../types';
import { videoService } from '../../services/video.service';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Button';

interface CurrentVideoProps {
  video: QueueVideo | null;
  isAdmin: boolean;
  onNext: () => void;
  isNextLoading: boolean;
}

export const CurrentVideo: React.FC<CurrentVideoProps> = ({
  video,
  isAdmin,
  onNext,
  isNextLoading
}) => {
  const playerRef = useRef<HTMLIFrameElement>(null);

  // YouTube Player API integration (optional - for better control)
  useEffect(() => {
    if (video && isAdmin) {
      // Only admin device should autoplay
      const iframe = playerRef.current;
      if (iframe) {
        // You could integrate YouTube Player API here for better control
        // For now, we'll use the basic embed with autoplay
      }
    }
  }, [video, isAdmin]);

  if (!video) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8">
        <div className="text-center">
          <div className="mx-auto h-24 w-24 bg-gray-100 rounded-full flex items-center justify-center">
            <svg
              className="h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M14.25 9.75v-4.5m0 4.5h4.5m-4.5 0L18 5.25M9.75 14.25v4.5m0-4.5h-4.5m4.5 0L5.25 18.75"
              />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No video playing</h3>
          <p className="mt-2 text-gray-500">
            Add videos to the queue and they'll appear here
          </p>
        </div>
      </div>
    );
  }

  const embedUrl = videoService.getEmbedUrl(video.youtube_video_id, isAdmin);
  const watchUrl = videoService.getWatchUrl(video.youtube_video_id);

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      {/* Video Player */}
      <div className="youtube-embed">
        <iframe
          ref={playerRef}
          src={embedUrl}
          title={video.title}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      {/* Video Info */}
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-grow min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <Badge variant="success" size="sm">
                Now Playing
              </Badge>
              {isAdmin && (
                <Badge variant="info" size="sm">
                  Admin View
                </Badge>
              )}
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {video.title}
            </h2>
            
            <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
              <span>Added by {video.added_by_username}</span>
              {video.duration && (
                <>
                  <span>•</span>
                  <span>{videoService.formatDuration(video.duration)}</span>
                </>
              )}
              <span>•</span>
              <span>{video.net_votes} net votes</span>
            </div>

            {/* Vote Display */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-gray-600">{video.upvotes}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <svg className="h-4 w-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-gray-600">{video.downvotes}</span>
              </div>

              {(video.upvotes + video.downvotes) > 0 && (
                <div className="flex-grow max-w-48">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${videoService.getVotePercentage(video.upvotes, video.downvotes)}%` 
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Admin Controls */}
          {isAdmin && (
            <div className="flex-shrink-0 ml-4">
              <div className="space-y-2">
                <Button
                  onClick={onNext}
                  loading={isNextLoading}
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 15.707a1 1 0 010-1.414L10.586 8 4.293 1.707a1 1 0 111.414-1.414l7 7a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Next</span>
                </Button>
                
                <a
                  href={watchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button variant="ghost" size="sm" fullWidth>
                    Open in YouTube
                  </Button>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Non-admin message */}
        {!isAdmin && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-start">
              <svg className="h-5 w-5 text-blue-400 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="text-sm text-blue-700">
                <p className="font-medium">Viewer Mode</p>
                <p>You can see what's playing, but only the room admin controls playback.</p>
              </div>
            </div>
          </div>
        )}

        {/* External link for mobile users */}
        <div className="mt-4 text-center">
          <a
            href={watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-700 underline"
          >
            Watch on YouTube →
          </a>
        </div>
      </div>
    </div>
  );
};

export default CurrentVideo;