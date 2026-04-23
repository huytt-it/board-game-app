'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useRoom } from '@/hooks/useRoom';
import Modal from './Modal';
import LoadingSpinner from './LoadingSpinner';
import type { GameRegistryEntry } from '@/lib/gameRegistry';
import type { RoomConfig } from '@/types/room';

interface RoomEntryProps {
  game: GameRegistryEntry;
  isOpen: boolean;
  onClose: () => void;
}

type Mode = 'choose' | 'create' | 'join';

export default function RoomEntry({ game, isOpen, onClose }: RoomEntryProps) {
  const router = useRouter();
  const { playerId, isLoading: authLoading } = useAuth();
  const { createRoom, joinRoom } = useRoom();

  const [mode, setMode] = useState<Mode>('choose');
  const [displayName, setDisplayName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!playerId || !displayName.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const config: RoomConfig = { maxPlayers: game.maxPlayers };
      const roomId = await createRoom(playerId, displayName.trim(), game.key, config);
      router.push(`/room/${game.key}/${roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoin = async () => {
    if (!playerId || !displayName.trim() || !roomCode.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const roomId = await joinRoom(roomCode.trim().toUpperCase(), playerId, displayName.trim());
      router.push(`/room/${game.key}/${roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setMode('choose');
    setError(null);
    setDisplayName('');
    setRoomCode('');
    onClose();
  };

  if (authLoading) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Loading...">
        <LoadingSpinner text="Initializing..." />
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={game.label}>
      <div className="space-y-5">
        {/* Game icon and info */}
        <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
          <span className="text-3xl">{game.icon}</span>
          <div>
            <p className="font-semibold text-white">{game.label}</p>
            <p className="text-xs text-slate-400">{game.minPlayers}–{game.maxPlayers} players</p>
          </div>
        </div>

        {/* Display Name (always shown) */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="display-name-input">
            Display Name
          </label>
          <input
            id="display-name-input"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter your name..."
            maxLength={20}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 outline-none transition-all focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          />
        </div>

        {/* Mode selection */}
        {mode === 'choose' && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setMode('create')}
              disabled={!displayName.trim()}
              className="rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-3 font-semibold text-white transition-all hover:from-purple-500 hover:to-purple-600 hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-40 disabled:cursor-not-allowed"
              id="create-room-btn"
            >
              <div className="mb-1 text-2xl">🎲</div>
              Create Room
            </button>
            <button
              onClick={() => setMode('join')}
              disabled={!displayName.trim()}
              className="rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-700 px-4 py-3 font-semibold text-white transition-all hover:from-cyan-500 hover:to-cyan-600 hover:shadow-lg hover:shadow-cyan-500/25 disabled:opacity-40 disabled:cursor-not-allowed"
              id="join-room-btn"
            >
              <div className="mb-1 text-2xl">🔗</div>
              Join Room
            </button>
          </div>
        )}

        {/* Create Room confirmation */}
        {mode === 'create' && (
          <div className="space-y-3">
            <p className="text-sm text-slate-400">
              You will be the <span className="font-semibold text-purple-400">Storyteller</span> (Host) for this game.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setMode('choose')}
                className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-slate-300 transition-all hover:bg-white/5"
              >
                Back
              </button>
              <button
                onClick={handleCreate}
                disabled={isSubmitting || !displayName.trim()}
                className="flex-1 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-3 font-semibold text-white transition-all hover:from-purple-500 hover:to-purple-600 disabled:opacity-40"
                id="confirm-create-btn"
              >
                {isSubmitting ? 'Creating...' : 'Create Game'}
              </button>
            </div>
          </div>
        )}

        {/* Join Room form */}
        {mode === 'join' && (
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="room-code-input">
                Room Code
              </label>
              <input
                id="room-code-input"
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="XXXXXX"
                maxLength={6}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center font-mono text-2xl tracking-[0.3em] text-white placeholder-slate-500 outline-none transition-all focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setMode('choose')}
                className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-slate-300 transition-all hover:bg-white/5"
              >
                Back
              </button>
              <button
                onClick={handleJoin}
                disabled={isSubmitting || !displayName.trim() || roomCode.length < 6}
                className="flex-1 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-700 px-4 py-3 font-semibold text-white transition-all hover:from-cyan-500 hover:to-cyan-600 disabled:opacity-40"
                id="confirm-join-btn"
              >
                {isSubmitting ? 'Joining...' : 'Join Game'}
              </button>
            </div>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
