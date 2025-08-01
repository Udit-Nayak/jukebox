import redisClient from '../config/redis';
import { QueueVideo, RedisKeys } from '../types';

export class RedisService {
  private keys: RedisKeys = {
    ROOM_QUEUE: (roomId: string) => `room:${roomId}:queue`,
    ROOM_VOTES: (roomId: string) => `room:${roomId}:votes`,
    ROOM_CURRENT: (roomId: string) => `room:${roomId}:current`,
    ROOM_MEMBERS: (roomId: string) => `room:${roomId}:members`,
    USER_VOTES: (userId: string) => `user:${userId}:votes`,
    LAST_UPDATE: (roomId: string) => `room:${roomId}:last_update`,
  };

  // Queue Management
  async updateRoomQueue(roomId: string, videos: QueueVideo[]): Promise<void> {
    const key = this.keys.ROOM_QUEUE(roomId);
    const pipeline = redisClient.multi();
    
    // Clear existing queue
    pipeline.del(key);
    
    // Add videos with scores (net_votes for sorting)
    if (videos.length > 0) {
      const videoData: Record<string, number> = {};
      videos.forEach(video => {
        videoData[JSON.stringify(video)] = video.net_votes;
      });
      pipeline.zAdd(key, Object.entries(videoData).map(([member, score]) => ({
        score,
        value: member
      })));
    }
    
    // Set expiration (24 hours)
    pipeline.expire(key, 86400);
    
    // Update last modification timestamp
    pipeline.set(this.keys.LAST_UPDATE(roomId), Date.now().toString());
    pipeline.expire(this.keys.LAST_UPDATE(roomId), 86400);
    
    await pipeline.exec();
  }

  async getRoomQueue(roomId: string): Promise<QueueVideo[]> {
    const key = this.keys.ROOM_QUEUE(roomId);
    
    // Get videos sorted by score (highest first) - Use zRange with REV option
    const videos = await redisClient.zRange(key, 0, -1, { REV: true });
    
    return videos.map((videoStr: string) => JSON.parse(videoStr) as QueueVideo);
  }

  // Current Video Management
  async setCurrentVideo(roomId: string, video: QueueVideo | null): Promise<void> {
    const key = this.keys.ROOM_CURRENT(roomId);
    
    if (video) {
      await redisClient.setEx(key, 86400, JSON.stringify(video));
    } else {
      await redisClient.del(key);
    }
    
    // Update timestamp
    await redisClient.setEx(this.keys.LAST_UPDATE(roomId), 86400, Date.now().toString());
  }

  async getCurrentVideo(roomId: string): Promise<QueueVideo | null> {
    const key = this.keys.ROOM_CURRENT(roomId);
    const videoStr = await redisClient.get(key);
    
    return videoStr ? JSON.parse(videoStr) as QueueVideo : null;
  }

  // Vote Management
  async updateVideoVote(roomId: string, videoId: string, userId: string, oldVote: number | null, newVote: number): Promise<void> {
    const pipeline = redisClient.multi();
    
    // Update user's vote record
    const userVotesKey = this.keys.USER_VOTES(userId);
    if (newVote === 0) {
      pipeline.hDel(userVotesKey, videoId);
    } else {
      pipeline.hSet(userVotesKey, videoId, newVote.toString());
    }
    pipeline.expire(userVotesKey, 86400);
    
    // Update vote counts for the video
    const votesKey = this.keys.ROOM_VOTES(roomId);
    
    if (oldVote !== null) {
      // Remove old vote
      if (oldVote === 1) {
        pipeline.hIncrBy(votesKey, `${videoId}:upvotes`, -1);
      } else {
        pipeline.hIncrBy(votesKey, `${videoId}:downvotes`, -1);
      }
    }
    
    if (newVote !== 0) {
      // Add new vote
      if (newVote === 1) {
        pipeline.hIncrBy(votesKey, `${videoId}:upvotes`, 1);
      } else {
        pipeline.hIncrBy(votesKey, `${videoId}:downvotes`, 1);
      }
    }
    
    pipeline.expire(votesKey, 86400);
    
    // Update timestamp
    pipeline.setEx(this.keys.LAST_UPDATE(roomId), 86400, Date.now().toString());
    
    await pipeline.exec();
  }

  async getVideoVotes(roomId: string, videoId: string): Promise<{ upvotes: number; downvotes: number }> {
    const votesKey = this.keys.ROOM_VOTES(roomId);
    
    const [upvotes, downvotes] = await Promise.all([
      redisClient.hGet(votesKey, `${videoId}:upvotes`),
      redisClient.hGet(votesKey, `${videoId}:downvotes`)
    ]);
    
    return {
      upvotes: parseInt(upvotes || '0'),
      downvotes: parseInt(downvotes || '0')
    };
  }

  async getUserVote(userId: string, videoId: string): Promise<number | null> {
    const userVotesKey = this.keys.USER_VOTES(userId);
    const vote = await redisClient.hGet(userVotesKey, videoId);
    
    return vote ? parseInt(vote) : null;
  }

  // Room Members Management
  async addRoomMember(roomId: string, userId: string, username: string): Promise<void> {
    const key = this.keys.ROOM_MEMBERS(roomId);
    const memberData = JSON.stringify({ userId, username, joinedAt: Date.now() });
    
    await redisClient.hSet(key, userId, memberData);
    await redisClient.expire(key, 86400);
  }

  async removeRoomMember(roomId: string, userId: string): Promise<void> {
    const key = this.keys.ROOM_MEMBERS(roomId);
    await redisClient.hDel(key, userId);
  }

  async getRoomMembers(roomId: string): Promise<Array<{ userId: string; username: string; joinedAt: number }>> {
    const key = this.keys.ROOM_MEMBERS(roomId);
    const members = await redisClient.hGetAll(key);
    
    return Object.values(members).map(memberStr => JSON.parse(memberStr));
  }

  // Utility methods
  async getLastUpdate(roomId: string): Promise<number> {
    const timestamp = await redisClient.get(this.keys.LAST_UPDATE(roomId));
    return timestamp ? parseInt(timestamp) : 0;
  }

  async clearRoomData(roomId: string): Promise<void> {
    const pipeline = redisClient.multi();
    
    pipeline.del(this.keys.ROOM_QUEUE(roomId));
    pipeline.del(this.keys.ROOM_VOTES(roomId));
    pipeline.del(this.keys.ROOM_CURRENT(roomId));
    pipeline.del(this.keys.ROOM_MEMBERS(roomId));
    pipeline.del(this.keys.LAST_UPDATE(roomId));
    
    await pipeline.exec();
  }

  // Health check
  async ping(): Promise<string> {
    return await redisClient.ping();
  }
}

export const redisService = new RedisService();