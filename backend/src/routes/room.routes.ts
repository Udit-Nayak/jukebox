import { Router, Request, Response } from 'express';
import { roomService } from '../services/room.service';
import { redisService } from '../services/redis.service';
import { authenticateToken, requireRoomAdmin } from '../middleware/auth.middleware';
import { validateRequest, validateParams, roomSchemas, paramSchemas } from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for room operations
const roomLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    success: false,
    error: 'Too many requests, please try again later'
  }
});

const createRoomLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 room creations per hour
  message: {
    success: false,
    error: 'Too many room creation attempts, please try again later'
  }
});

// Apply general rate limiting
router.use(roomLimiter);

// POST /api/rooms - Create a new room
router.post('/',
  createRoomLimiter,
  authenticateToken,
  validateRequest(roomSchemas.createRoom),
  asyncHandler(async (req: Request, res: Response) => {
    const { name } = req.body;
    const userId = req.user!.id;

    const room = await roomService.createRoom(userId, name);

    return res.status(201).json({
      success: true,
      data: {
        room: {
          id: room.id,
          room_code: room.room_code,
          name: room.name,
          admin_id: room.admin_id,
          is_active: room.is_active,
          max_participants: room.max_participants,
          current_participants: room.current_participants,
          created_at: room.created_at
        }
      },
      message: 'Room created successfully'
    });
  })
);

// POST /api/rooms/join - Join a room
router.post('/join',
  authenticateToken,
  validateRequest(roomSchemas.joinRoom),
  asyncHandler(async (req: Request, res: Response) => {
    const { room_code } = req.body;
    const userId = req.user!.id;

    const room = await roomService.joinRoom(userId, room_code);

    return res.json({
      success: true,
      data: {
        room: {
          id: room.id,
          room_code: room.room_code,
          name: room.name,
          admin_id: room.admin_id,
          is_active: room.is_active,
          max_participants: room.max_participants,
          current_participants: room.current_participants
        }
      },
      message: 'Joined room successfully'
    });
  })
);

// GET /api/rooms/:roomId - Get room details
router.get('/:roomId',
  authenticateToken,
  validateParams(paramSchemas.roomId),
  asyncHandler(async (req: Request, res: Response) => {
    const { roomId } = req.params;

    const room = await roomService.getRoomById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    const [currentVideo, queue, members] = await Promise.all([
      roomService.getCurrentVideo(roomId),
      roomService.getRoomQueue(roomId),
      redisService.getRoomMembers(roomId)
    ]);

    return res.json({
      success: true,
      data: {
        room: {
          id: room.id,
          room_code: room.room_code,
          name: room.name,
          admin_id: room.admin_id,
          is_active: room.is_active,
          max_participants: room.max_participants,
          current_participants: room.current_participants
        },
        current_video: currentVideo,
        queue: queue.map(video => ({
          ...video,
          user_vote: null // Will be populated by frontend polling
        })),
        members: members,
        is_admin: room.admin_id === req.user!.id
      }
    });
  })
);

// POST /api/rooms/:roomId/leave - Leave a room
router.post('/:roomId/leave',
  authenticateToken,
  validateParams(paramSchemas.roomId),
  asyncHandler(async (req: Request, res: Response) => {
    const { roomId } = req.params;
    const userId = req.user!.id;

    await roomService.leaveRoom(userId, roomId);

    return res.json({
      success: true,
      message: 'Left room successfully'
    });
  })
);

// POST /api/rooms/:roomId/close - Close room (admin only)
router.post('/:roomId/close',
  authenticateToken,
  validateParams(paramSchemas.roomId),
  requireRoomAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { roomId } = req.params;
    const userId = req.user!.id;

    await roomService.closeRoom(roomId, userId);

    return res.json({
      success: true,
      message: 'Room closed successfully'
    });
  })
);

// GET /api/rooms/:roomId/queue - Get current queue
router.get('/:roomId/queue',
  authenticateToken,
  validateParams(paramSchemas.roomId),
  asyncHandler(async (req: Request, res: Response) => {
    const { roomId } = req.params;
    const userId = req.user!.id;

    const queue = await roomService.getRoomQueue(roomId);
    
    // Add user vote information to each video
    const queueWithVotes = await Promise.all(
      queue.map(async (video) => {
        const userVote = await roomService.getUserVote(userId, video.id);
        return {
          ...video,
          user_vote: userVote
        };
      })
    );

    return res.json({
      success: true,
      data: {
        queue: queueWithVotes,
        last_update: await redisService.getLastUpdate(roomId)
      }
    });
  })
);

// GET /api/rooms/:roomId/current - Get currently playing video
router.get('/:roomId/current',
  authenticateToken,
  validateParams(paramSchemas.roomId),
  asyncHandler(async (req: Request, res: Response) => {
    const { roomId } = req.params;

    const currentVideo = await roomService.getCurrentVideo(roomId);

    return res.json({
      success: true,
      data: {
        current_video: currentVideo,
        last_update: await redisService.getLastUpdate(roomId)
      }
    });
  })
);

// POST /api/rooms/:roomId/next - Play next video (admin only)
router.post('/:roomId/next',
  authenticateToken,
  validateParams(paramSchemas.roomId),
  requireRoomAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { roomId } = req.params;
    const userId = req.user!.id;

    const nextVideo = await roomService.playNextVideo(roomId, userId);

    return res.json({
      success: true,
      data: {
        next_video: nextVideo
      },
      message: nextVideo ? 'Playing next video' : 'No more videos in queue'
    });
  })
);

// GET /api/rooms/:roomId/members - Get room members
router.get('/:roomId/members',
  authenticateToken,
  validateParams(paramSchemas.roomId),
  asyncHandler(async (req: Request, res: Response) => {
    const { roomId } = req.params;

    const members = await redisService.getRoomMembers(roomId);

    return res.json({
      success: true,
      data: {
        members: members.map(member => ({
          user_id: member.userId,
          username: member.username,
          joined_at: new Date(member.joinedAt)
        })),
        count: members.length
      }
    });
  })
);

// GET /api/rooms/:roomId/sync - Get sync data for polling
router.get('/:roomId/sync',
  authenticateToken,
  validateParams(paramSchemas.roomId),
  asyncHandler(async (req: Request, res: Response) => {
    const { roomId } = req.params;
    const userId = req.user!.id;
    const lastUpdate = parseInt(req.query.last_update as string || '0');

    const currentLastUpdate = await redisService.getLastUpdate(roomId);
    
    // Only send data if there are updates
    if (currentLastUpdate <= lastUpdate) {
      return res.json({
        success: true,
        data: {
          has_updates: false,
          last_update: currentLastUpdate
        }
      });
    }

    const [currentVideo, queue, members] = await Promise.all([
      roomService.getCurrentVideo(roomId),
      roomService.getRoomQueue(roomId),
      redisService.getRoomMembers(roomId)
    ]);

    // Add user vote information to queue
    const queueWithVotes = await Promise.all(
      queue.map(async (video) => {
        const userVote = await roomService.getUserVote(userId, video.id);
        return {
          ...video,
          user_vote: userVote
        };
      })
    );

    return res.json({
      success: true,
      data: {
        has_updates: true,
        current_video: currentVideo,
        queue: queueWithVotes,
        members: members.map(member => ({
          user_id: member.userId,
          username: member.username,
          joined_at: new Date(member.joinedAt)
        })),
        members_count: members.length,
        last_update: currentLastUpdate
      }
    });
  })
);

export default router;