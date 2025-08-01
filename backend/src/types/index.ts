export interface User {
  id: string;
  username: string;
  email?: string;
  role: 'admin' | 'user';
  created_at: Date;
  updated_at: Date;
}

export interface Room {
  id: string;
  room_code: string;
  name: string;
  admin_id: string;
  is_active: boolean;
  max_participants: number;
  current_participants: number;
  current_video_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface QueueVideo {
  id: string;
  room_id: string;
  youtube_video_id: string;
  title: string;
  thumbnail_url?: string;
  duration?: number;
  added_by: string;
  upvotes: number;
  downvotes: number;
  net_votes: number;
  is_played: boolean;
  is_current: boolean;
  position_in_queue?: number;
  added_at: Date;
  played_at?: Date;
  added_by_username?: string;
}

export interface VideoVote {
  id: string;
  video_id: string;
  user_id: string;
  vote_type: 1 | -1; // 1 for upvote, -1 for downvote
  created_at: Date;
  updated_at: Date;
}

export interface RoomMember {
  id: string;
  room_id: string;
  user_id: string;
  joined_at: Date;
  is_active: boolean;
}

// Request/Response types
export interface AuthRequest {
  username: string;
  password: string;
  email?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface CreateRoomRequest {
  name: string;
}

export interface JoinRoomRequest {
  room_code: string;
}

export interface AddVideoRequest {
  youtube_url: string;
  room_id: string;
}

export interface VoteRequest {
  video_id: string;
  vote_type: 1 | -1;
}

export interface RoomResponse {
  room: Room;
  current_video?: QueueVideo;
  queue: QueueVideo[];
  members_count: number;
}

// Redis keys structure
export interface RedisKeys {
  ROOM_QUEUE: (roomId: string) => string;
  ROOM_VOTES: (roomId: string) => string;
  ROOM_CURRENT: (roomId: string) => string;
  ROOM_MEMBERS: (roomId: string) => string;
  USER_VOTES: (userId: string) => string;
  LAST_UPDATE: (roomId: string) => string;
}

// YouTube video info
export interface YouTubeVideoInfo {
  video_id: string;
  title: string;
  thumbnail_url: string;
  duration: number;
}

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}