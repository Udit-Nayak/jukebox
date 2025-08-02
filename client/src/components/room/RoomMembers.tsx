import React from 'react';
import { RoomMember } from '../../types';
import { Card } from '../ui/Button';
import { Badge } from '../ui/Button';
import clsx from 'clsx';

interface RoomMembersProps {
  members: RoomMember[];
  adminId: string;
  currentUserId: string;
  isLoading?: boolean;
}

export const RoomMembers: React.FC<RoomMembersProps> = ({
  members = [], // Default to empty array
  adminId,
  currentUserId,
  isLoading = false
}) => {
  // Filter out invalid members and add safety checks
  const validMembers = members.filter(member => 
    member && 
    member.user_id && 
    member.username
  );

  const sortedMembers = [...validMembers].sort((a, b) => {
    // Admin first
    if (a.user_id === adminId) return -1;
    if (b.user_id === adminId) return 1;
    
    // Current user second
    if (a.user_id === currentUserId) return -1;
    if (b.user_id === currentUserId) return 1;
    
    // Then by join time
    return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
  });

  const formatJoinTime = (joinedAt: string) => {
    try {
      const date = new Date(joinedAt);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 1) return 'Just joined';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
      return date.toLocaleDateString();
    } catch (error) {
      return 'Recently';
    }
  };

  const getInitials = (username: string) => {
    if (!username || typeof username !== 'string') {
      return '?';
    }
    return username.charAt(0).toUpperCase();
  };

  const getAvatarColor = (userId: string) => {
    // Add safety check for userId
    if (!userId || typeof userId !== 'string') {
      return 'bg-gray-500'; // Default color
    }

    // Generate consistent color based on user ID
    const colors = [
      'bg-red-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-orange-500',
    ];
    
    // Safe hash function
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return colors[Math.abs(hash) % colors.length];
  };

  if (isLoading) {
    return (
      <Card>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3 mt-1"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          Members ({validMembers.length})
        </h3>
        <div className="flex items-center space-x-1">
          <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-xs text-green-600 font-medium">Live</span>
        </div>
      </div>

      {validMembers.length === 0 ? (
        <div className="text-center py-6">
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
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
            />
          </svg>
          <p className="mt-2 text-sm text-gray-500">No members in room</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin">
          {sortedMembers.map((member) => (
            <div
              key={member.user_id}
              className={clsx(
                'flex items-center space-x-3 p-3 rounded-lg transition-colors',
                member.user_id === currentUserId
                  ? 'bg-blue-50 border border-blue-200'
                  : 'hover:bg-gray-50'
              )}
            >
              {/* Avatar */}
              <div
                className={clsx(
                  'flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-white font-medium',
                  getAvatarColor(member.user_id)
                )}
              >
                {getInitials(member.username)}
              </div>

              {/* Member Info */}
              <div className="flex-grow min-w-0">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {member.username || 'Unknown User'}
                  </p>
                  
                  {member.user_id === adminId && (
                    <Badge variant="warning" size="sm">
                      Admin
                    </Badge>
                  )}
                  
                  {member.user_id === currentUserId && (
                    <Badge variant="info" size="sm">
                      You
                    </Badge>
                  )}
                </div>
                
                <p className="text-xs text-gray-500">
                  {member.joined_at ? formatJoinTime(member.joined_at) : 'Recently joined'}
                </p>
              </div>

              {/* Status Indicator */}
              <div className="flex-shrink-0">
                <div className="h-2 w-2 bg-green-400 rounded-full"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Member Stats */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {validMembers.length}
            </div>
            <div className="text-xs text-gray-500">Total Members</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-green-600">
              {validMembers.length}
            </div>
            <div className="text-xs text-gray-500">Online Now</div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default RoomMembers;