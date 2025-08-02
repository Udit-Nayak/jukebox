import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useRoomPolling } from '../hooks/usePolling';
import { roomService } from '../services/room.service';
import { videoService } from '../services/video.service';
import { RoomResponse, SyncResponse } from '../types';

// Components
import { RoomDetails } from '../components/room/CreateRoom';
import { CurrentVideo } from '../components/room/CurrentVideo';
import { VideoQueue } from '../components/room/VideoQueue';
import { AddVideo } from '../components/room/AddVideo';
import { RoomMembers } from '../components/room/RoomMembers';
import { LoadingSpinner } from '../components/ui/Button';
import { Toast } from '../components/ui/Button';

const Room: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  // State
  const [roomData, setRoomData] = useState<RoomResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [isNextLoading, setIsNextLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info'; visible: boolean }>({
    message: '',
    type: 'info',
    visible: false
  });

  // Show toast notification
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 4000);
  };

  // Load initial room data
  const loadRoomData = useCallback(async () => {
    if (!roomId) return;

    try {
      const data = await roomService.getRoomDetails(roomId);
      setRoomData(data);
      setError('');
    } catch (error: any) {
      setError(error.message || 'Failed to load room');
      if (error.message.includes('not found')) {
        navigate('/dashboard');
      }
    } finally {
      setIsLoading(false);
    }
  }, [roomId, navigate]);

  // Handle sync updates from polling
  const handleSyncUpdate = useCallback((syncData: SyncResponse) => {
    if (!roomData || !syncData.has_updates) return;

    setRoomData(prev => {
      if (!prev) return prev;

      return {
        ...prev,
        current_video: syncData.current_video || prev.current_video,
        queue: syncData.queue || prev.queue,
        members: syncData.members || prev.members,
        members_count: syncData.members_count || prev.members_count
      };
    });
  }, [roomData]);

  // Set up polling for real-time updates
useRoomPolling(roomId || null, handleSyncUpdate, {
  interval: 5000, // Change to 5 seconds
  enabled: !!roomId && !!roomData
});
  // Vote on video
  const handleVote = async (videoId: string, voteType: 1 | -1) => {
    try {
      const updatedVideo = await videoService.voteVideo({ video_id: videoId, vote_type: voteType });
      
      // Update local state
      setRoomData(prev => {
        if (!prev) return prev;
        
        return {
          ...prev,
          queue: prev.queue.map(video => 
            video.id === videoId 
              ? { ...video, ...updatedVideo, user_vote: voteType }
              : video
          )
        };
      });

      showToast(`Video ${voteType === 1 ? 'upvoted' : 'downvoted'}!`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to vote', 'error');
    }
  };

  // Remove vote
  const handleRemoveVote = async (videoId: string) => {
    try {
      const updatedVideo = await videoService.removeVote(videoId);
      
      // Update local state
      setRoomData(prev => {
        if (!prev) return prev;
        
        return {
          ...prev,
          queue: prev.queue.map(video => 
            video.id === videoId 
              ? { ...video, ...updatedVideo, user_vote: null }
              : video
          )
        };
      });

      showToast('Vote removed!', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to remove vote', 'error');
    }
  };

  // Play next video (admin only)
  const handlePlayNext = async () => {
    if (!roomData?.is_admin) return;

    setIsNextLoading(true);
    try {
      await roomService.playNextVideo(roomId!);
      // Polling will update the current video
      showToast('Playing next video!', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to play next video', 'error');
    } finally {
      setIsNextLoading(false);
    }
  };

  // Handle video added
  const handleVideoAdded = () => {
    showToast('Video added to queue!', 'success');
    // Polling will update the queue
  };

  // Leave room
  const handleLeaveRoom = async () => {
    try {
      await roomService.leaveRoom(roomId!);
      navigate('/dashboard');
      showToast('Left room successfully', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to leave room', 'error');
    }
  };

  // Close room (admin only)
  const handleCloseRoom = async () => {
    if (!roomData?.is_admin) return;

    if (window.confirm('Are you sure you want to close this room? This cannot be undone.')) {
      try {
        await roomService.closeRoom(roomId!);
        navigate('/dashboard');
        showToast('Room closed successfully', 'success');
      } catch (error: any) {
        showToast(error.message || 'Failed to close room', 'error');
      }
    }
  };

  // Load data on mount
  useEffect(() => {
    loadRoomData();
  }, [loadRoomData]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Error state
  if (error || !roomData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">Room Error</h2>
          <p className="mt-2 text-gray-600">{error || 'Room not found'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Room Header */}
      <div className="mb-8">
        <RoomDetails
          room={roomData.room}
          isAdmin={roomData.is_admin}
          onLeave={handleLeaveRoom}
          onClose={roomData.is_admin ? handleCloseRoom : undefined}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Current Video & Queue */}
        <div className="lg:col-span-2 space-y-8">
          {/* Current Video */}
          <CurrentVideo
            video={roomData.current_video || null}
            isAdmin={roomData.is_admin}
            onNext={handlePlayNext}
            isNextLoading={isNextLoading}
          />

          {/* Add Video */}
          <AddVideo
            roomId={roomId!}
            onVideoAdded={handleVideoAdded}
          />

          {/* Video Queue */}
          <VideoQueue
            videos={roomData.queue}
            isLoading={false}
            onVote={handleVote}
            onRemoveVote={handleRemoveVote}
            currentUserId={user!.id}
          />
        </div>

        {/* Right Column - Room Members */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <RoomMembers
              members={roomData.members}
              adminId={roomData.room.admin_id}
              currentUserId={user!.id}
            />
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.visible}
        onClose={() => setToast(prev => ({ ...prev, visible: false }))}
      />
    </div>
  );
};

export default Room;