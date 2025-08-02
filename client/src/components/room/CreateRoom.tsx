import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { roomService } from '../../services/room.service';
import { Button } from '../ui/Button';
import { Input } from '../ui/Button';
import { Card } from '../ui/Button';

interface CreateRoomProps {
  onSuccess?: (roomId: string) => void;
}

export const CreateRoom: React.FC<CreateRoomProps> = ({ onSuccess }) => {
  const [roomName, setRoomName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!roomName.trim()) {
      setError('Room name is required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const room = await roomService.createRoom({ name: roomName.trim() });
      
      if (onSuccess) {
        onSuccess(room.id);
      } else {
        navigate(`/room/${room.id}`);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to create room');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Create New Room</h2>
        <p className="mt-2 text-gray-600">
          Create a room where friends can add and vote on music
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        <Input
          label="Room Name"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          placeholder="Enter room name"
          fullWidth
          maxLength={100}
        />

        <Button
          type="submit"
          loading={isLoading}
          fullWidth
          size="lg"
        >
          Create Room
        </Button>
      </form>
    </Card>
  );
};

// Join Room Component
interface JoinRoomProps {
  onSuccess?: (roomId: string) => void;
}

export const JoinRoom: React.FC<JoinRoomProps> = ({ onSuccess }) => {
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (value.length <= 6) {
      setRoomCode(value);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!roomCode.trim()) {
      setError('Room code is required');
      return;
    }

    if (roomCode.length !== 6) {
      setError('Room code must be 6 characters');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const room = await roomService.joinRoom({ room_code: roomCode });
      
      if (onSuccess) {
        onSuccess(room.id);
      } else {
        navigate(`/room/${room.id}`);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to join room');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Join Room</h2>
        <p className="mt-2 text-gray-600">
          Enter the 6-character room code to join
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        <div>
          <Input
            label="Room Code"
            value={roomCode}
            onChange={handleChange}
            placeholder="ABC123"
            fullWidth
            className="text-center text-lg font-mono tracking-widest"
            maxLength={6}
          />
          <p className="mt-1 text-xs text-gray-500 text-center">
            Enter the 6-character code (letters and numbers)
          </p>
        </div>

        <Button
          type="submit"
          loading={isLoading}
          fullWidth
          size="lg"
          disabled={roomCode.length !== 6}
        >
          Join Room
        </Button>
      </form>
    </Card>
  );
};

// Room Details Component
interface RoomDetailsProps {
  room: any; // Replace with proper Room type
  isAdmin: boolean;
  onLeave: () => void;
  onClose?: () => void;
}

export const RoomDetails: React.FC<RoomDetailsProps> = ({
  room,
  isAdmin,
  onLeave,
  onClose
}) => {
  const [isLeaving, setIsLeaving] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const handleLeave = async () => {
    setIsLeaving(true);
    try {
      await onLeave();
    } finally {
      setIsLeaving(false);
    }
  };

  const handleClose = async () => {
    if (!onClose) return;
    
    setIsClosing(true);
    try {
      await onClose();
    } finally {
      setIsClosing(false);
    }
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(room.room_code);
    // You could add a toast notification here
  };

  return (
    <Card>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{room.name}</h1>
          <div className="mt-2 flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-gray-600">Room Code:</span>
              <button
                onClick={copyRoomCode}
                className="font-mono text-lg font-bold text-blue-600 hover:text-blue-700 transition-colors"
                title="Click to copy"
              >
                {room.room_code}
              </button>
            </div>
            <div className="flex items-center space-x-1">
              <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
              </svg>
              <span className="text-sm text-gray-600">
                {room.current_participants} / {room.max_participants} members
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-2">
          {isAdmin && onClose && (
            <Button
              variant="danger"
              size="sm"
              onClick={handleClose}
              loading={isClosing}
            >
              Close Room
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleLeave}
            loading={isLeaving}
          >
            Leave Room
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {room.current_participants}
          </div>
          <div className="text-sm text-blue-700">Active Members</div>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {room.is_active ? 'Active' : 'Inactive'}
          </div>
          <div className="text-sm text-green-700">Room Status</div>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">
            {isAdmin ? 'Admin' : 'Member'}
          </div>
          <div className="text-sm text-purple-700">Your Role</div>
        </div>
      </div>

      {isAdmin && (
        <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-yellow-800">
              You are the room admin. You can control video playback and manage the room.
            </span>
          </div>
        </div>
      )}
    </Card>
  );
};