'use client';

import { useState } from 'react';
import { useHold } from '@/components/games/shared/hooks/useHold';
import { MyRoleBody } from '../panel/DealPanel';
import { HoldCard, nameOf, type PanelCtx } from '../panel/shared';
import Button from './Button';
import { Modal } from './Dialog';

/** "Vai của tôi": giữ để xem vai, đồng đội Sói, kết quả soi các đêm (Tiên tri). */
function MyRoleDialog({ ctx, onClose }: { ctx: Pick<PanelCtx, 'me' | 'myData' | 'players' | 'table'>; onClose: () => void }) {
  const { held, bind } = useHold();
  const looks = ctx.myData.seerLog ?? [];
  return (
    <Modal title="Vai của tôi" onClose={onClose}>
      <HoldCard held={held} bind={bind} className="h-56" hint="Che màn hình rồi hãy giữ.">
        {() => (
          <div className="text-left">
            <MyRoleBody ctx={ctx} />
            {ctx.myData.role === 'seer' && (
              <ul className="mt-2 space-y-0.5 text-xs">
                {looks.length === 0 && <li className="text-slate-400">Chưa soi ai.</li>}
                {looks.map((l) => (
                  <li key={l.round}>
                    Đêm {l.round}: {nameOf(ctx.players, l.targetId)} — {l.isWolf ? 'LÀ SÓI' : 'không phải Sói'}
                  </li>
                ))}
              </ul>
            )}
            {ctx.myData.role === 'guard' && ctx.myData.guardLast && (
              <p className="mt-2 text-xs text-slate-300">Đêm trước bạn che {nameOf(ctx.players, ctx.myData.guardLast)}.</p>
            )}
          </div>
        )}
      </HoldCard>
      <Button block className="mt-3" onClick={onClose}>
        Đóng
      </Button>
    </Modal>
  );
}

/** Menu ⋯ của thanh trên: giống nhau với mọi vai. */
export default function RoomMenu({
  ctx,
  isHost,
  inGame,
  onLeave,
  onDelete,
}: {
  /** Có khi đang trong ván (để mở "Vai của tôi"). */
  ctx: Pick<PanelCtx, 'me' | 'myData' | 'players' | 'table'> | null;
  isHost: boolean;
  inGame: boolean;
  onLeave: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [showRole, setShowRole] = useState(false);
  const item = 'flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm font-semibold hover:bg-slate-800';
  return (
    <>
      <button
        type="button"
        aria-label="Menu"
        aria-haspopup="dialog"
        className="flex size-11 items-center justify-center rounded-xl text-xl text-slate-200 hover:bg-slate-800"
        onClick={() => setOpen(true)}
      >
        ⋯
      </button>
      {open && (
        <Modal title="Menu" onClose={() => setOpen(false)} initialFocus="panel">
          <div className="space-y-1">
            {ctx && ctx.myData.role && (
              <button
                type="button"
                className={`${item} text-slate-100`}
                onClick={() => {
                  setOpen(false);
                  setShowRole(true);
                }}
              >
                Vai của tôi
              </button>
            )}
            {!isHost && (
              <button
                type="button"
                className={`${item} text-slate-100`}
                onClick={() => {
                  setOpen(false);
                  onLeave();
                }}
              >
                {inGame ? 'Thoát khỏi ván' : 'Rời phòng'}
              </button>
            )}
            {isHost && (
              <button
                type="button"
                className={`${item} text-rose-300`}
                onClick={() => {
                  setOpen(false);
                  onDelete();
                }}
              >
                Xoá phòng
              </button>
            )}
          </div>
        </Modal>
      )}
      {showRole && ctx && <MyRoleDialog ctx={ctx} onClose={() => setShowRole(false)} />}
    </>
  );
}
