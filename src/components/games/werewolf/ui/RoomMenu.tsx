'use client';

import { useState } from 'react';
import type { Player } from '@/types/player';
import { useHold } from '@/components/games/shared/hooks/useHold';
import { MyRoleBody } from '../panel/DealPanel';
import { Avatar, HoldCard, nameOf, type PanelCtx } from '../panel/shared';
import type { WwRules } from '../types';
import Button from './Button';
import { Modal } from './Dialog';
import RulesDialog from './RulesDialog';

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

/** Chủ phòng chọn người cho rời làng (người còn sống, trừ mình). Hộp xác nhận do Board hỏi. */
function LeaveDialog({ candidates, onPick, onClose }: { candidates: Player[]; onPick: (p: Player) => void; onClose: () => void }) {
  return (
    <Modal title="Cho rời làng" onClose={onClose} initialFocus="panel">
      <p className="mb-3 text-sm text-slate-300">
        Dành cho người bỏ về hẳn. Người đó tính là đã chết (rời làng), lộ vai theo cài đặt; Thợ săn rời làng thì không được bắn.
      </p>
      {candidates.length === 0 ? (
        <p className="text-sm text-slate-400">Không còn ai khác trong làng.</p>
      ) : (
        <ul className="space-y-1.5" data-ww-leave-list="">
          {candidates.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                data-player-id={p.id}
                className="flex min-h-11 w-full items-center gap-2 rounded-xl bg-slate-800 px-3 text-left text-sm font-semibold text-slate-100 hover:bg-slate-700"
                onClick={() => onPick(p)}
              >
                <Avatar name={p.name} />
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <Button block className="mt-3" onClick={onClose}>
        Huỷ
      </Button>
    </Modal>
  );
}

/** Menu ⋯ của thanh trên: giống nhau với mọi vai. */
export default function RoomMenu({
  ctx,
  isHost,
  inGame,
  rules,
  leaveCandidates = null,
  onLeaveVillage,
  onLeave,
  onDelete,
}: {
  /** Có khi đang trong ván (để mở "Vai của tôi"). */
  ctx: Pick<PanelCtx, 'me' | 'myData' | 'players' | 'table'> | null;
  isHost: boolean;
  inGame: boolean;
  /** Luật tuỳ chọn của ván (hoặc của phòng ở sảnh), cho màn "Luật chơi". */
  rules: WwRules | null;
  /** Chủ phòng, giữa ván: người còn sống có thể cho rời làng. null = ẩn mục này. */
  leaveCandidates?: Player[] | null;
  onLeaveVillage?: (id: string, name: string) => void;
  onLeave: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [showRole, setShowRole] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showLeave, setShowLeave] = useState(false);
  const item = 'flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm font-semibold hover:bg-slate-800';
  return (
    <>
      <Button variant="ghost" icon="more" aria-label="Menu" aria-haspopup="dialog" onClick={() => setOpen(true)} />
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
            <button
              type="button"
              className={`${item} text-slate-100`}
              onClick={() => {
                setOpen(false);
                setShowRules(true);
              }}
            >
              Luật chơi
            </button>
            {leaveCandidates && onLeaveVillage && (
              <button
                type="button"
                className={`${item} text-slate-100`}
                onClick={() => {
                  setOpen(false);
                  setShowLeave(true);
                }}
              >
                Cho rời làng…
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
      {showRules && <RulesDialog rules={rules} onClose={() => setShowRules(false)} />}
      {showLeave && leaveCandidates && onLeaveVillage && (
        <LeaveDialog
          candidates={leaveCandidates}
          onClose={() => setShowLeave(false)}
          onPick={(p) => {
            setShowLeave(false);
            onLeaveVillage(p.id, p.name);
          }}
        />
      )}
    </>
  );
}
