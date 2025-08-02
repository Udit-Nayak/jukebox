import { apiService } from './api';
import {
  Room,
  RoomResponse,
  CreateRoomRequest,
  JoinRoomRequest,
  QueueResponse,
  CurrentVideoResponse,
  SyncResponse,
  RoomMember,
} from '../types';

class RoomService {
  // Create a new room
  async createRoom(roomData: CreateRoomRequest): Promise<Room> {
    const response = await apiService.post<{ room: Room }>('/api/rooms', roomData);
    
    if (response.success && response.data) {
      return response.data.room;
    }

    throw new Error(response.error || 'Failed to create room');
  }

  // Join an existing room
  async joinRoom(joinData: JoinRoomRequest): Promise<Room> {
    const response = await apiService.post<{ room: Room }>('/api/rooms/join', joinData);
    
    if (response.success && response.data) {
      return response.data.room;
    }

    throw new Error(response.error || 'Failed to join room');
  }

  // Get room details
  async getRoomDetails(roomId: string): Promise<RoomResponse> {
    const response = await apiService.get<RoomResponse>(`/api/rooms/${roomId}`);
    
    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to get room details');
  }

  // Leave a room
  async leaveRoom(roomId: string): Promise<void> {
    const response = await apiService.post(`/api/rooms/${roomId}/leave`);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to leave room');
    }
  }

  // Close room (admin only)
  async closeRoom(roomId: string): Promise<void> {
    const response = await apiService.post(`/api/rooms/${roomId}/close`);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to close room');
    }
  }

  // Get current queue
  async getRoomQueue(roomId: string): Promise<QueueResponse> {
    const response = await apiService.get<QueueResponse>(`/api/rooms/${roomId}/queue`);
    
    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to get room queue');
  }

  // Get current playing video
  async getCurrentVideo(roomId: string): Promise<CurrentVideoResponse> {
    const response = await apiService.get<CurrentVideoResponse>(`/api/rooms/${roomId}/current`);
    
    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to get current video');
  }

  // Play next video (admin only)
  async playNextVideo(roomId: string): Promise<void> {
    const response = await apiService.post(`/api/rooms/${roomId}/next`);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to play next video');
    }
  }

  // Get room members
  async getRoomMembers(roomId: string): Promise<RoomMember[]> {
    const response = await apiService.get<{ members: RoomMember[]; count: number }>(`/api/rooms/${roomId}/members`);
    
    if (response.success && response.data) {
      return response.data.members;
    }

    throw new Error(response.error || 'Failed to get room members');
  }

  // Get sync data for polling (real-time updates)
  async getSyncData(roomId: string, lastUpdate: number = 0): Promise<SyncResponse> {
    const response = await apiService.get<SyncResponse>(`/api/rooms/${roomId}/sync`, {
      last_update: lastUpdate
    });
    
    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to get sync data');
  }

  // Validate room code format
  isValidRoomCode(roomCode: string): boolean {
    // Room codes should be 6 characters
    return /^[A-Z0-9]{6}$/.test(roomCode.toUpperCase());
  }

  // Format room code for display
  formatRoomCode(roomCode: string): string {
    return roomCode.toUpperCase();
  }

  // Check if user is room admin
  isRoomAdmin(room: Room, userId: string): boolean {
    return room.admin_id === userId;
  }

  // Get room capacity info
  getRoomCapacityInfo(room: Room): { current: number; max: number; percentage: number; isFull: boolean } {
    const current = room.current_participants;
    const max = room.max_participants;
    const percentage = Math.round((current / max) * 100);
    const isFull = current >= max;

    return { current, max, percentage, isFull };
  }

  // Check if room is active and joinable
  isRoomJoinable(room: Room): boolean {
    return room.is_active && room.current_participants < room.max_participants;
  }

  // Get room status text
  getRoomStatus(room: Room): string {
    if (!room.is_active) return 'Inactive';
    if (room.current_participants >= room.max_participants) return 'Full';
    return 'Active';
  }

  // Get room status color class
  getRoomStatusColor(room: Room): string {
    if (!room.is_active) return 'text-gray-500';
    if (room.current_participants >= room.max_participants) return 'text-red-500';
    return 'text-green-500';
  }
}

export const roomService = new RoomService();
export default roomService;