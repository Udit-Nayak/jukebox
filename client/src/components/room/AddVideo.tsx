import React, { useState } from 'react';
import { videoService } from '../../services/video.service';
import { Button } from '../ui/Button';
import { Input } from '../ui/Button';
import { Card } from '../ui/Button';
import { LoadingSpinner } from '../ui/Button';

interface AddVideoProps {
  roomId: string;
  onVideoAdded: () => void;
}

export const AddVideo: React.FC<AddVideoProps> = ({ roomId, onVideoAdded }) => {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');
  const [previewInfo, setPreviewInfo] = useState<any>(null);

  const handleUrlChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setYoutubeUrl(url);
    setError('');
    setPreviewInfo(null);

    if (!url.trim()) return;

    // Basic format validation
    if (!videoService.isValidYouTubeUrl(url)) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    // Validate video exists and get info
    setIsValidating(true);
    try {
      const validation = await videoService.validateYouTubeUrl(url);
      
      if (validation.is_valid && validation.video_info) {
        setPreviewInfo(validation.video_info);
      } else {
        setError('Video not found or unavailable');
      }
    } catch (error: any) {
      setError('Unable to validate video');
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!youtubeUrl.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }

    if (!videoService.isValidYouTubeUrl(youtubeUrl)) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    setIsAdding(true);
    setError('');

    try {
      await videoService.addVideoToQueue({
        youtube_url: youtubeUrl,
        room_id: roomId
      });

      // Clear form and notify parent
      setYoutubeUrl('');
      setPreviewInfo(null);
      onVideoAdded();
    } catch (error: any) {
      setError(error.message || 'Failed to add video');
    } finally {
      setIsAdding(false);
    }
  };

  const clearForm = () => {
    setYoutubeUrl('');
    setPreviewInfo(null);
    setError('');
  };

  return (
    <Card>
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900">Add Video to Queue</h3>
        <p className="mt-1 text-sm text-gray-500">
          Paste a YouTube URL to add a video to the queue
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        <div className="relative">
          <Input
            label="YouTube URL"
            value={youtubeUrl}
            onChange={handleUrlChange}
            placeholder="https://www.youtube.com/watch?v=..."
            fullWidth
            disabled={isAdding}
          />
          
          {isValidating && (
            <div className="absolute right-3 top-8">
              <LoadingSpinner size="sm" />
            </div>
          )}
        </div>

        {/* Video Preview */}
        {previewInfo && (
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex items-start space-x-4">
              <img
                src={previewInfo.thumbnail_url}
                alt={previewInfo.title}
                className="w-32 h-24 object-cover rounded"
                onError={(e) => {
                  e.currentTarget.src = videoService.getThumbnailUrl(previewInfo.video_id, 'default');
                }}
              />
              <div className="flex-grow min-w-0">
                <h4 className="text-sm font-medium text-gray-900 line-clamp-2">
                  {previewInfo.title}
                </h4>
                <div className="mt-1 text-xs text-gray-500">
                  Duration: {videoService.formatDuration(previewInfo.duration)}
                </div>
                <div className="mt-2 flex items-center space-x-2">
                  <div className="h-2 w-2 bg-green-400 rounded-full"></div>
                  <span className="text-xs text-green-600 font-medium">
                    Ready to add
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex space-x-3">
          <Button
            type="submit"
            loading={isAdding}
            disabled={!previewInfo || isValidating}
            className="flex-grow"
          >
            {isAdding ? 'Adding...' : 'Add to Queue'}
          </Button>
          
          {(youtubeUrl || previewInfo) && (
            <Button
              type="button"
              variant="ghost"
              onClick={clearForm}
              disabled={isAdding}
            >
              Clear
            </Button>
          )}
        </div>
      </form>

      {/* Help text */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <div className="text-sm text-blue-700">
          <p className="font-medium mb-1">Supported formats:</p>
          <ul className="text-xs space-y-1">
            <li>• https://www.youtube.com/watch?v=VIDEO_ID</li>
            <li>• https://youtu.be/VIDEO_ID</li>
            <li>• https://www.youtube.com/shorts/VIDEO_ID</li>
          </ul>
        </div>
      </div>
    </Card>
  );
};

export default AddVideo;