'use client';

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeDisplayProps {
  roomId: string;
  roomCode: string;
  gameType: string;
}

export default function QRCodeDisplay({ roomId, roomCode, gameType }: QRCodeDisplayProps) {
  // Use current browser origin for dynamic domain support
  const [appUrl, setAppUrl] = useState('');

  useEffect(() => {
    setAppUrl(window.location.origin);
  }, []);

  const roomUrl = appUrl ? `${appUrl}/room/${gameType}/${roomId}` : '';

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
  };

  const copyLink = () => {
    if (roomUrl) navigator.clipboard.writeText(roomUrl);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* QR Code */}
      <div className="rounded-2xl bg-white p-4 shadow-lg shadow-purple-500/10">
        {roomUrl ? (
          <QRCodeSVG
            value={roomUrl}
            size={180}
            bgColor="#ffffff"
            fgColor="#1e1b4b"
            level="M"
            includeMargin={false}
          />
        ) : (
          <div className="flex h-[180px] w-[180px] items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-900 border-t-transparent" />
          </div>
        )}
      </div>

      {/* Room Code */}
      <div className="text-center">
        <p className="mb-1 text-xs font-medium uppercase tracking-widest text-slate-500">
          Room Code
        </p>
        <div className="flex items-center gap-2">
          <span
            className="font-mono text-3xl font-black tracking-[0.3em] text-white"
            id="room-code-display"
          >
            {roomCode}
          </span>
          <button
            onClick={copyCode}
            className="rounded-lg p-2 text-slate-400 transition-all hover:bg-white/10 hover:text-purple-400"
            title="Copy code"
            id="copy-code-btn"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Share Link */}
      <button
        onClick={copyLink}
        disabled={!roomUrl}
        className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-sm text-slate-300 transition-all hover:bg-white/10 hover:text-white disabled:opacity-40"
        id="copy-link-btn"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        Copy invite link
      </button>
    </div>
  );
}
