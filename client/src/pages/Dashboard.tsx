import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CreateRoom, JoinRoom } from '../components/room/CreateRoom';
import { Card } from '../components/ui/Button';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Button';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  const handleRoomSuccess = (roomId: string) => {
    navigate(`/room/${roomId}`);
  };

  const quickActions = [
    {
      title: 'Create Room',
      description: 'Start a new music room and invite friends',
      icon: (
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      color: 'bg-blue-500',
      action: () => setShowCreateModal(true)
    },
    {
      title: 'Join Room',
      description: 'Join an existing room with a room code',
      icon: (
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
        </svg>
      ),
      color: 'bg-green-500',
      action: () => setShowJoinModal(true)
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.username}!
        </h1>
        <p className="mt-2 text-gray-600">
          Create a room or join friends to start sharing music together.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {quickActions.map((action, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer" padding="lg">
            <div onClick={action.action} className="text-center">
              <div className={`mx-auto h-16 w-16 ${action.color} rounded-full flex items-center justify-center text-white mb-4`}>
                {action.icon}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {action.title}
              </h3>
              <p className="text-gray-600 mb-4">
                {action.description}
              </p>
              <Button>
                {action.title}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Features Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <div className="text-center p-6">
            <div className="mx-auto h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Collaborative Playlists
            </h3>
            <p className="text-sm text-gray-500">
              Everyone can add songs and vote on favorites
            </p>
          </div>
        </Card>

        <Card>
          <div className="text-center p-6">
            <div className="mx-auto h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Real-time Updates
            </h3>
            <p className="text-sm text-gray-500">
              See changes instantly as friends add and vote
            </p>
          </div>
        </Card>

        <Card>
          <div className="text-center p-6">
            <div className="mx-auto h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-5-9h2a3 3 0 013 3v1M9 3h2a3 3 0 013 3v1" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              YouTube Integration
            </h3>
            <p className="text-sm text-gray-500">
              Direct integration with YouTube videos
            </p>
          </div>
        </Card>
      </div>

      {/* Modals */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Room"
        maxWidth="md"
      >
        <CreateRoom onSuccess={handleRoomSuccess} />
      </Modal>

      <Modal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        title="Join Room"
        maxWidth="md"
      >
        <JoinRoom onSuccess={handleRoomSuccess} />
      </Modal>
    </div>
  );
};

export default Dashboard;