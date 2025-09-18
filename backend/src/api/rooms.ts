import { Router, Request, Response } from 'express';
import { roomService } from '../services/RoomService';
import { messageService } from '../services/MessageService';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Get all public rooms
router.get('/public', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const rooms = await roomService.getPublicRooms(limit, offset);

    res.json({
      rooms,
      pagination: {
        limit,
        offset,
        hasMore: rooms.length === limit
      }
    });

  } catch (error) {
    console.error('Error fetching public rooms:', error);
    res.status(500).json({
      error: 'fetch_failed',
      message: 'Failed to fetch public rooms'
    });
  }
});

// Get user's rooms
router.get('/my', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const rooms = await roomService.getUserRooms(userId);

    res.json({ rooms });

  } catch (error) {
    console.error('Error fetching user rooms:', error);
    res.status(500).json({
      error: 'fetch_failed',
      message: 'Failed to fetch user rooms'
    });
  }
});

// Get specific room details
router.get('/:roomId', async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const userId = (req as any).user.userId;

    const room = await roomService.getRoomById(roomId, userId);

    if (!room) {
      return res.status(404).json({
        error: 'room_not_found',
        message: 'Room not found'
      });
    }

    // Check if user has access to this room
    if (room.type === 'private' && !room.membership) {
      return res.status(403).json({
        error: 'access_denied',
        message: 'You do not have access to this room'
      });
    }

    res.json({ room });

  } catch (error) {
    console.error('Error fetching room:', error);
    res.status(500).json({
      error: 'fetch_failed',
      message: 'Failed to fetch room details'
    });
  }
});

// Create new room
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { id, name, description, type, settings } = req.body;

    // Validation
    if (!id || !name || !type) {
      return res.status(400).json({
        error: 'missing_fields',
        message: 'Room ID, name, and type are required'
      });
    }

    if (!['public', 'private'].includes(type)) {
      return res.status(400).json({
        error: 'invalid_type',
        message: 'Room type must be public or private'
      });
    }

    // Validate room ID format
    if (!/^[a-z0-9-]+$/.test(id)) {
      return res.status(400).json({
        error: 'invalid_room_id',
        message: 'Room ID must contain only lowercase letters, numbers, and hyphens'
      });
    }

    const room = await roomService.createRoom({
      id,
      name,
      description,
      type,
      settings
    }, userId);

    res.status(201).json({
      message: 'Room created successfully',
      room
    });

  } catch (error) {
    console.error('Error creating room:', error);

    if (error instanceof Error && error.message.includes('duplicate key')) {
      return res.status(409).json({
        error: 'room_exists',
        message: 'A room with this ID already exists'
      });
    }

    res.status(500).json({
      error: 'creation_failed',
      message: 'Failed to create room'
    });
  }
});

// Update room
router.put('/:roomId', async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const userId = (req as any).user.userId;
    const { name, description, settings } = req.body;

    const room = await roomService.updateRoom(roomId, userId, {
      name,
      description,
      settings
    });

    res.json({
      message: 'Room updated successfully',
      room
    });

  } catch (error) {
    console.error('Error updating room:', error);
    res.status(500).json({
      error: 'update_failed',
      message: error instanceof Error ? error.message : 'Failed to update room'
    });
  }
});

// Join room
router.post('/:roomId/join', async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const userId = (req as any).user.userId;

    const membership = await roomService.joinRoom(userId, roomId);

    res.json({
      message: 'Successfully joined room',
      membership
    });

  } catch (error) {
    console.error('Error joining room:', error);
    res.status(400).json({
      error: 'join_failed',
      message: error instanceof Error ? error.message : 'Failed to join room'
    });
  }
});

// Leave room
router.post('/:roomId/leave', async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const userId = (req as any).user.userId;

    await roomService.leaveRoom(userId, roomId);

    res.json({
      message: 'Successfully left room'
    });

  } catch (error) {
    console.error('Error leaving room:', error);
    res.status(400).json({
      error: 'leave_failed',
      message: error instanceof Error ? error.message : 'Failed to leave room'
    });
  }
});

// Get room participants
router.get('/:roomId/participants', async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const userId = (req as any).user.userId;

    // Check if user is member of the room
    const room = await roomService.getRoomById(roomId, userId);
    if (!room || !room.membership) {
      return res.status(403).json({
        error: 'access_denied',
        message: 'You must be a member of this room to view participants'
      });
    }

    const participants = await roomService.getRoomParticipants(roomId);

    res.json({ participants });

  } catch (error) {
    console.error('Error fetching participants:', error);
    res.status(500).json({
      error: 'fetch_failed',
      message: 'Failed to fetch room participants'
    });
  }
});

// Get room message history
router.get('/:roomId/messages', async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const userId = (req as any).user.userId;
    const limit = parseInt(req.query.limit as string) || 50;
    const cursor = req.query.cursor as string;

    const messageHistory = await messageService.getMessageHistory(
      roomId,
      userId,
      limit,
      cursor
    );

    res.json(messageHistory);

  } catch (error) {
    console.error('Error fetching message history:', error);
    res.status(500).json({
      error: 'fetch_failed',
      message: error instanceof Error ? error.message : 'Failed to fetch message history'
    });
  }
});

// Update room membership (admin only)
router.put('/:roomId/members/:memberId', async (req: Request, res: Response) => {
  try {
    const { roomId, memberId } = req.params;
    const userId = (req as any).user.userId;
    const { role, notifications } = req.body;

    const membership = await roomService.updateMembership(
      roomId,
      memberId,
      { role, notifications },
      userId
    );

    res.json({
      message: 'Membership updated successfully',
      membership
    });

  } catch (error) {
    console.error('Error updating membership:', error);
    res.status(400).json({
      error: 'update_failed',
      message: error instanceof Error ? error.message : 'Failed to update membership'
    });
  }
});

export default router;