import pool from '../config/database';
import { redisService } from './redis.service';
import { youtubeService } from './youtube.service';
import { Room, QueueVideo, RoomMember, YouTubeVideoInfo } from '../types';

export class RoomService {
  // Create a new room
  async createRoom(adminId: string, name: string): Promise<Room> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Generate unique room code
      let roomCode: string;
      let isUnique = false;
      
      do {
        const result = await client.query('SELECT generate_room_code() as code');
        roomCode = result.rows[0].code;
        
        const existing = await client.query(
          'SELECT id FROM rooms WHERE room_code = $1',
          [roomCode]
        );
        
        isUnique = existing.rows.length === 0;
      } while (!isUnique);

      // Create room
      const roomResult = await client.query(
        `INSERT INTO rooms (room_code, name, admin_id, current_participants) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [roomCode, name, adminId, 1]
      );

      const room = roomResult.rows[0] as Room;

      // Add admin as room member
      await client.query(
        `INSERT INTO room_members (room_id, user_id) VALUES ($1, $2)`,
        [room.id, adminId]
      );

      // Add admin to Redis room members
      const adminUser = await client.query(
        'SELECT username FROM users WHERE id = $1',
        [adminId]
      );
      
      await redisService.addRoomMember(room.id, adminId, adminUser.rows[0].username);

      await client.query('COMMIT');
      return room;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Join an existing room
  async joinRoom(userId: string, roomCode: string): Promise<Room> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Find room by code
      const roomResult = await client.query(
        'SELECT * FROM rooms WHERE room_code = $1 AND is_active = true',
        [roomCode]
      );

      if (roomResult.rows.length === 0) {
        throw new Error('Room not found or inactive');
      }

      const room = roomResult.rows[0] as Room;

      // Check if room is full
      if (room.current_participants >= room.max_participants) {
        throw new Error('Room is full');
      }

      // Check if user is already in room
      const existingMember = await client.query(
        'SELECT id FROM room_members WHERE room_id = $1 AND user_id = $2 AND is_active = true',
        [room.id, userId]
      );

      let isNewMember = existingMember.rows.length === 0;

      if (isNewMember) {
        // Add user to room
        await client.query(
          `INSERT INTO room_members (room_id, user_id) VALUES ($1, $2)`,
          [room.id, userId]
        );

        // Update participant count
        await client.query(
          `UPDATE rooms SET current_participants = current_participants + 1 
           WHERE id = $1`,
          [room.id]
        );
      } else {
        // Reactivate existing member
        await client.query(
          `UPDATE room_members SET is_active = true, joined_at = CURRENT_TIMESTAMP 
           WHERE room_id = $1 AND user_id = $2`,
          [room.id, userId]
        );
      }

      // Add to Redis room members
      const userResult = await client.query(
        'SELECT username FROM users WHERE id = $1',
        [userId]
      );
      
      await redisService.addRoomMember(room.id, userId, userResult.rows[0].username);

      await client.query('COMMIT');

      // Return updated room data
      const updatedRoom = await this.getRoomById(room.id);
      return updatedRoom!;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Leave a room
  async leaveRoom(userId: string, roomId: string): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Check if user is in room
      const memberResult = await client.query(
        'SELECT * FROM room_members WHERE room_id = $1 AND user_id = $2 AND is_active = true',
        [roomId, userId]
      );

      if (memberResult.rows.length === 0) {
        throw new Error('User not in room');
      }

      // Deactivate membership
      await client.query(
        `UPDATE room_members SET is_active = false 
         WHERE room_id = $1 AND user_id = $2`,
        [roomId, userId]
      );

      // Update participant count
      await client.query(
        `UPDATE rooms SET current_participants = current_participants - 1 
         WHERE id = $1`,
        [roomId]
      );

      // Remove from Redis
      await redisService.removeRoomMember(roomId, userId);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Get room by ID
  async getRoomById(roomId: string): Promise<Room | null> {
    const client = await pool.connect();

    try {
      const result = await client.query(
        'SELECT * FROM rooms WHERE id = $1',
        [roomId]
      );

      return result.rows.length > 0 ? result.rows[0] as Room : null;
    } finally {
      client.release();
    }
  }

  // Get room by code
  async getRoomByCode(roomCode: string): Promise<Room | null> {
    const client = await pool.connect();

    try {
      const result = await client.query(
        'SELECT * FROM rooms WHERE room_code = $1 AND is_active = true',
        [roomCode]
      );

      return result.rows.length > 0 ? result.rows[0] as Room : null;
    } finally {
      client.release();
    }
  }

  // Add video to queue
  async addVideoToQueue(roomId: string, userId: string, youtubeUrl: string): Promise<QueueVideo> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Extract video ID
      const videoId = youtubeService.extractVideoId(youtubeUrl);
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }

      // Get video info
      const videoInfo = await youtubeService.getVideoInfo(videoId);
      if (!videoInfo) {
        throw new Error('Could not fetch video information');
      }

      // Check if video already exists in queue
      const existingVideo = await client.query(
        'SELECT id FROM queue_videos WHERE room_id = $1 AND youtube_video_id = $2 AND is_played = false',
        [roomId, videoId]
      );

      if (existingVideo.rows.length > 0) {
        throw new Error('Video already in queue');
      }

      // Insert video into queue
      const result = await client.query(
        `INSERT INTO queue_videos 
         (room_id, youtube_video_id, title, thumbnail_url, duration, added_by, net_votes) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING *`,
        [roomId, videoId, videoInfo.title, videoInfo.thumbnail_url, videoInfo.duration, userId, 0]
      );

      const queueVideo = result.rows[0] as QueueVideo;

      // Update Redis queue
      await this.syncQueueToRedis(roomId);

      await client.query('COMMIT');
      return queueVideo;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Vote on a video
// Vote on a video
  async voteVideo(userId: string, videoId: string, voteType: 1 | -1): Promise<QueueVideo> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get video and room info
      const videoResult = await client.query(
        `SELECT qv.*, r.id as room_id FROM queue_videos qv 
         JOIN rooms r ON qv.room_id = r.id 
         WHERE qv.id = $1 AND qv.is_played = false`,
        [videoId]
      );

      if (videoResult.rows.length === 0) {
        throw new Error('Video not found or already played');
      }

      const video = videoResult.rows[0];

      // Check existing vote
      const existingVoteResult = await client.query(
        'SELECT vote_type FROM video_votes WHERE video_id = $1 AND user_id = $2',
        [videoId, userId]
      );

      const oldVote = existingVoteResult.rows.length > 0 ? existingVoteResult.rows[0].vote_type : null;

      // Calculate vote changes
      let upvoteChange = 0;
      let downvoteChange = 0;
      let finalVoteType: number = voteType;

      if (oldVote === null) {
        // New vote
        if (voteType === 1) upvoteChange = 1;
        else downvoteChange = 1;
      } else if (oldVote !== voteType) {
        // Changing vote
        if (oldVote === 1) upvoteChange = -1;
        else downvoteChange = -1;
        
        if (voteType === 1) upvoteChange += 1;
        else downvoteChange += 1;
      } else {
        // Same vote - remove it
        if (oldVote === 1) upvoteChange = -1;
        else downvoteChange = -1;
        finalVoteType = 0; // Remove vote
      }

      // Update or insert vote
      if (finalVoteType === 0) {
        await client.query(
          'DELETE FROM video_votes WHERE video_id = $1 AND user_id = $2',
          [videoId, userId]
        );
      } else {
        await client.query(
          `INSERT INTO video_votes (video_id, user_id, vote_type) 
           VALUES ($1, $2, $3) 
           ON CONFLICT (video_id, user_id) 
           DO UPDATE SET vote_type = $3, updated_at = CURRENT_TIMESTAMP`,
          [videoId, userId, finalVoteType]
        );
      }

      // Update video vote counts
      await client.query(
        `UPDATE queue_videos 
         SET upvotes = upvotes + $1, 
             downvotes = downvotes + $2, 
             net_votes = upvotes + $1 - (downvotes + $2)
         WHERE id = $3`,
        [upvoteChange, downvoteChange, videoId]
      );

      // Update Redis vote counts
      await redisService.updateVideoVote(video.room_id, videoId, userId, oldVote, finalVoteType);

      // Sync queue to Redis (to update ordering)
      await this.syncQueueToRedis(video.room_id);

      await client.query('COMMIT');

      // Return updated video
      const updatedVideoResult = await client.query(
        'SELECT * FROM queue_videos WHERE id = $1',
        [videoId]
      );

      return updatedVideoResult.rows[0] as QueueVideo;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  // Get current queue for a room
  async getRoomQueue(roomId: string): Promise<QueueVideo[]> {
    // Try Redis first
    const redisQueue = await redisService.getRoomQueue(roomId);
    if (redisQueue.length > 0) {
      return redisQueue;
    }

    // Fallback to database
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT qv.*, u.username as added_by_username 
         FROM queue_videos qv 
         JOIN users u ON qv.added_by = u.id 
         WHERE qv.room_id = $1 AND qv.is_played = false 
         ORDER BY qv.net_votes DESC, qv.added_at ASC`,
        [roomId]
      );

      const queue = result.rows as QueueVideo[];
      
      // Update Redis
      if (queue.length > 0) {
        await redisService.updateRoomQueue(roomId, queue);
      }

      return queue;
    } finally {
      client.release();
    }
  }

  // Get current playing video
  async getCurrentVideo(roomId: string): Promise<QueueVideo | null> {
    // Try Redis first
    const redisVideo = await redisService.getCurrentVideo(roomId);
    if (redisVideo) {
      return redisVideo;
    }

    // Fallback to database
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT qv.*, u.username as added_by_username 
         FROM queue_videos qv 
         JOIN users u ON qv.added_by = u.id 
         WHERE qv.room_id = $1 AND qv.is_current = true`,
        [roomId]
      );

      const currentVideo = result.rows.length > 0 ? result.rows[0] as QueueVideo : null;
      
      // Update Redis
      if (currentVideo) {
        await redisService.setCurrentVideo(roomId, currentVideo);
      }

      return currentVideo;
    } finally {
      client.release();
    }
  }

  // Move to next video in queue
  async playNextVideo(roomId: string, adminId: string): Promise<QueueVideo | null> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Verify admin permission
      const room = await client.query(
        'SELECT admin_id FROM rooms WHERE id = $1',
        [roomId]
      );

      if (room.rows.length === 0 || room.rows[0].admin_id !== adminId) {
        throw new Error('Unauthorized: Only room admin can control playback');
      }

      // Mark current video as played
      await client.query(
        `UPDATE queue_videos 
         SET is_current = false, is_played = true, played_at = CURRENT_TIMESTAMP 
         WHERE room_id = $1 AND is_current = true`,
        [roomId]
      );

      // Get next video (highest votes, then oldest)
      const nextVideoResult = await client.query(
        `SELECT qv.*, u.username as added_by_username 
         FROM queue_videos qv 
         JOIN users u ON qv.added_by = u.id 
         WHERE qv.room_id = $1 AND qv.is_played = false 
         ORDER BY qv.net_votes DESC, qv.added_at ASC 
         LIMIT 1`,
        [roomId]
      );

      let nextVideo: QueueVideo | null = null;

      if (nextVideoResult.rows.length > 0) {
        // Mark next video as current
        await client.query(
          'UPDATE queue_videos SET is_current = true WHERE id = $1',
          [nextVideoResult.rows[0].id]
        );

        nextVideo = nextVideoResult.rows[0] as QueueVideo;
        nextVideo.is_current = true;
      }

      // Update room's current video
      await client.query(
        'UPDATE rooms SET current_video_id = $1 WHERE id = $2',
        [nextVideo?.id || null, roomId]
      );

      // Update Redis
      await redisService.setCurrentVideo(roomId, nextVideo);
      await this.syncQueueToRedis(roomId);

      await client.query('COMMIT');
      return nextVideo;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Sync database queue to Redis
  private async syncQueueToRedis(roomId: string): Promise<void> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT qv.*, u.username as added_by_username 
         FROM queue_videos qv 
         JOIN users u ON qv.added_by = u.id 
         WHERE qv.room_id = $1 AND qv.is_played = false 
         ORDER BY qv.net_votes DESC, qv.added_at ASC`,
        [roomId]
      );

      await redisService.updateRoomQueue(roomId, result.rows as QueueVideo[]);
    } finally {
      client.release();
    }
  }

  // Close room (admin only)
  async closeRoom(roomId: string, adminId: string): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Verify admin permission
      const room = await client.query(
        'SELECT admin_id FROM rooms WHERE id = $1',
        [roomId]
      );

      if (room.rows.length === 0 || room.rows[0].admin_id !== adminId) {
        throw new Error('Unauthorized: Only room admin can close room');
      }

      // Deactivate room
      await client.query(
        'UPDATE rooms SET is_active = false WHERE id = $1',
        [roomId]
      );

      // Deactivate all members
      await client.query(
        'UPDATE room_members SET is_active = false WHERE room_id = $1',
        [roomId]
      );

      // Clear Redis data
      await redisService.clearRoomData(roomId);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Get user's vote for a video
  async getUserVote(userId: string, videoId: string): Promise<number | null> {
    // Try Redis first
    const redisVote = await redisService.getUserVote(userId, videoId);
    if (redisVote !== null) {
      return redisVote;
    }

    // Fallback to database
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT vote_type FROM video_votes WHERE video_id = $1 AND user_id = $2',
        [videoId, userId]
      );

      return result.rows.length > 0 ? result.rows[0].vote_type : null;
    } finally {
      client.release();
    }
  }
}

export const roomService = new RoomService();