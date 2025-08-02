// User types
export interface User {
  id: string;
  username: string;
  email?: string;
  role: 'admin' | 'user';
  created_at: string;
  updated_at: string;
}

// Room types
export interface Room {
  id: string;
  room_code: string;
  name: string;
  admin_id: string;
  is_active: boolean;
  max_participants: number;
  current_participants: number;
  current_video_id?: string;
  created_at: string;
  updated_at: string;
}

// Video types
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
  added_at: string;
  played_at?: string;
  added_by_username?: string;
  user_vote?: number | null; // User's current vote on this video
}

export interface VideoVote {
  id: string;
  video_id: string;
  user_id: string;
  vote_type: 1 | -1;
  created_at: string;
  updated_at: string;
}

// Room member types
export interface RoomMember {
  user_id: string;
  username: string;
  joined_at: string;
}

// Request/Response types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email?: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    token: string;
    user: User;
  };
  message?: string;
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

// API Response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Room response types
export interface RoomResponse {
  room: Room;
  current_video?: QueueVideo;
  queue: QueueVideo[];
  members: RoomMember[];
  members_count: number;
  is_admin: boolean;
}

export interface QueueResponse {
  queue: QueueVideo[];
  last_update: number;
}

export interface CurrentVideoResponse {
  current_video: QueueVideo | null;
  last_update: number;
}

export interface SyncResponse {
  has_updates: boolean;
  current_video?: QueueVideo | null;
  queue?: QueueVideo[];
  members?: RoomMember[];
  members_count?: number;
  last_update: number;
}

// YouTube types
export interface YouTubeVideoInfo {
  video_id: string;
  title: string;
  thumbnail_url: string;
  duration: number;
}

export interface VideoValidationResponse {
  is_valid: boolean;
  video_id: string;
  video_info: YouTubeVideoInfo | null;
}

// UI State types
export interface LoadingState {
  isLoading: boolean;
  error?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface RoomState {
  room: Room | null;
  currentVideo: QueueVideo | null;
  queue: QueueVideo[];
  members: RoomMember[];
  isAdmin: boolean;
  lastUpdate: number;
  isLoading: boolean;
  error?: string;
}

// Polling types
export interface PollingConfig {
  interval: number;
  enabled: boolean;
}

// Form types
export interface FormErrors {
  [key: string]: string;
}

// Navigation types
export interface NavigationItem {
  name: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  current?: boolean;
}