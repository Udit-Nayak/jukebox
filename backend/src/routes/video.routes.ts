import { Router, Request, Response } from 'express';
import { roomService } from '../services/room.service';
import { youtubeService } from '../services/youtube.service';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateRequest, validateParams, roomSchemas, paramSchemas, querySchemas, validateQuery } from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for video operations
const videoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per window
  message: {
    success: false,
    error: 'Too many requests, please try again later'
  }
});

const addVideoLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 video additions per minute
  message: {
    success: false,
    error: 'Too many video additions, please slow down'
  }
});

const voteLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 votes per minute
  message: {
    success: false,
    error: 'Too many votes, please slow down'
  }
});

// Apply general rate limiting
router.use(videoLimiter);

// POST /api/videos/add - Add video to queue
router.post('/add',
  addVideoLimiter,
  authenticateToken,
  validateRequest(roomSchemas.addVideo),
  asyncHandler(async (req: Request, res: Response) => {
    const { youtube_url, room_id } = req.body;
    const userId = req.user!.id;

    // Verify user is in the room
    const room = await roomService.getRoomById(room_id);
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    if (!room.is_active) {
      return res.status(400).json({
        success: false,
        error: 'Room is not active'
      });
    }

    try {
      const video = await roomService.addVideoToQueue(room_id, userId, youtube_url);

      return res.status(201).json({
        success: true,
        data: {
          video: {
            id: video.id,
            youtube_video_id: video.youtube_video_id,
            title: video.title,
            thumbnail_url: video.thumbnail_url,
            duration: video.duration,
            upvotes: video.upvotes,
            downvotes: video.downvotes,
            net_votes: video.net_votes,
            added_by: video.added_by,
            added_at: video.added_at
          }
        },
        message: 'Video added to queue successfully'
      });
    } catch (error: any) {
      if (error.message === 'Invalid YouTube URL') {
        return res.status(400).json({
          success: false,
          error: 'Invalid YouTube URL format'
        });
      }
      if (error.message === 'Video already in queue') {
        return res.status(409).json({
          success: false,
          error: 'This video is already in the queue'
        });
      }
      if (error.message === 'Could not fetch video information') {
        return res.status(400).json({
          success: false,
          error: 'Could not fetch video information. Please check the URL.'
        });
      }
      throw error;
    }
  })
);

// POST /api/videos/vote - Vote on a video
router.post('/vote',
  voteLimiter,
  authenticateToken,
  validateRequest(roomSchemas.vote),
  asyncHandler(async (req: Request, res: Response) => {
    const { video_id, vote_type } = req.body;
    const userId = req.user!.id;

    try {
      const updatedVideo = await roomService.voteVideo(userId, video_id, vote_type);

      return res.json({
        success: true,
        data: {
          video: {
            id: updatedVideo.id,
            upvotes: updatedVideo.upvotes,
            downvotes: updatedVideo.downvotes,
            net_votes: updatedVideo.net_votes
          }
        },
        message: `Video ${vote_type === 1 ? 'upvoted' : 'downvoted'} successfully`
      });
    } catch (error: any) {
      if (error.message === 'Video not found or already played') {
        return res.status(404).json({
          success: false,
          error: 'Video not found or already played'
        });
      }
      throw error;
    }
  })
);

// GET /api/videos/:videoId - Get video details
router.get('/:videoId',
  authenticateToken,
  validateParams(paramSchemas.videoId),
  asyncHandler(async (req: Request, res: Response) => {
    const { videoId } = req.params;
    const userId = req.user!.id;

    // This would need a new service method to get video by ID
    // For now, return basic structure
    return res.json({
      success: true,
      data: {
        video: {
          id: videoId,
          // ... other video details
        },
        user_vote: await roomService.getUserVote(userId, videoId)
      }
    });
  })
);

// GET /api/videos/:videoId/votes - Get vote details for a video
router.get('/:videoId/votes',
  authenticateToken,
  validateParams(paramSchemas.videoId),
  asyncHandler(async (req: Request, res: Response) => {
    const { videoId } = req.params;
    const userId = req.user!.id;

    const userVote = await roomService.getUserVote(userId, videoId);

    return res.json({
      success: true,
      data: {
        user_vote: userVote,
        video_id: videoId
      }
    });
  })
);

// DELETE /api/videos/:videoId/vote - Remove vote from video
router.delete('/:videoId/vote',
  authenticateToken,
  validateParams(paramSchemas.videoId),
  asyncHandler(async (req: Request, res: Response) => {
    const { videoId } = req.params;
    const userId = req.user!.id;

    // Get current vote to determine what to remove
    const currentVote = await roomService.getUserVote(userId, videoId);
    
    if (!currentVote) {
      return res.status(400).json({
        success: false,
        error: 'No vote to remove'
      });
    }

    // Vote with the same type removes the vote
    const updatedVideo = await roomService.voteVideo(userId, videoId, currentVote as 1 | -1);

    return res.json({
      success: true,
      data: {
        video: {
          id: updatedVideo.id,
          upvotes: updatedVideo.upvotes,
          downvotes: updatedVideo.downvotes,
          net_votes: updatedVideo.net_votes
        }
      },
      message: 'Vote removed successfully'
    });
  })
);

// // GET /api/videos/search - Search YouTube videos
// router.get('/search',
//   authenticateToken,
//   validateQuery(querySchemas.search),
//   asyncHandler(async (req: Request, res: Response) => {
//     const { q, limit } = req.query;

//     try {
//       const limitNumber = limit ? parseInt(limit as string, 10) : undefined;
//       const videos = await youtubeService.searchVideos(q as string, limitNumber);

//       return res.json({
//         success: true,
//         data: {
//           videos: videos.map(video => ({
//             video_id: video.video_id,
//             title: video.title,
//             thumbnail_url: video.thumbnail_url,
//             duration: video.duration,
//             embed_url: youtubeService.getEmbedUrl(video.video_id),
//             youtube_url: `https://www.youtube.com/watch?v=${video.video_id}`
//           })),
//           query: q,
//           count: videos.length
//         }
//       });
//     } catch (error) {
//       return res.status(500).json({
//         success: false,
//         error: 'Failed to search videos'
//       });
//     }
//   })
// );

// // GET /api/videos/info/:videoId - Get YouTube video info
// router.get('/info/:videoId',
//   authenticateToken,
//   asyncHandler(async (req: Request, res: Response) => {
//     const { videoId } = req.params;

//     try {
//       // Extract video ID if full URL is provided
//       const extractedId = youtubeService.extractVideoId(videoId);
//       const finalVideoId = extractedId || videoId;

//       const videoInfo = await youtubeService.getVideoInfo(finalVideoId);

//       if (!videoInfo) {
//         return res.status(404).json({
//           success: false,
//           error: 'Video not found or unavailable'
//         });
//       }

//       return res.json({
//         success: true,
//         data: {
//           video: {
//             video_id: videoInfo.video_id,
//             title: videoInfo.title,
//             thumbnail_url: videoInfo.thumbnail_url,
//             duration: videoInfo.duration,
//             embed_url: youtubeService.getEmbedUrl(videoInfo.video_id),
//             youtube_url: `https://www.youtube.com/watch?v=${videoInfo.video_id}`
//           }
//         }
//       });
//     } catch (error) {
//       return res.status(500).json({
//         success: false,
//         error: 'Failed to fetch video information'
//       });
//     }
//   })
// );

// POST /api/videos/validate - Validate YouTube URL
router.post('/validate',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { youtube_url } = req.body;

    if (!youtube_url) {
      return res.status(400).json({
        success: false,
        error: 'YouTube URL is required'
      });
    }

    const videoId = youtubeService.extractVideoId(youtube_url);

    if (!videoId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid YouTube URL format'
      });
    }

    try {
      const isValid = await youtubeService.validateVideo(videoId);
      const videoInfo = isValid ? await youtubeService.getVideoInfo(videoId) : null;

      return res.json({
        success: true,
        data: {
          is_valid: isValid,
          video_id: videoId,
          video_info: videoInfo ? {
            title: videoInfo.title,
            thumbnail_url: videoInfo.thumbnail_url,
            duration: videoInfo.duration
          } : null
        }
      });
    } catch (error) {
      return res.json({
        success: true,
        data: {
          is_valid: false,
          video_id: videoId,
          video_info: null
        }
      });
    }
  })
);

export default router;