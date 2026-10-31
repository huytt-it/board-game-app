'use client';

import { useState } from 'react';
import type { Player } from '@/types/player';
import { useHold } from '@/components/games/shared/hooks/useHold';
import { MyRoleBody } from '../panel/DealPanel';
import { Avatar, HoldCard, nameOf, type PanelCtx } from '../panel/shared';
import type { WwRole, WwRules } from '../types';
import Button from './Button';
import { Modal } from './Dialog';
import RulesDialog from './RulesDialog';

type MenuCtx = Pick<PanelCtx, 'me' | 'myData' | 'players' | 'table'> & { state?: Pick<PanelCtx['state'], 'phase' | 'round'> };

/**
 * "Vai của tôi": giữ để xem vai, đồng đội Sói, kết quả soi các đêm (Tiên tri),
 * và phần của vai mở rộng (bầy Sói của Tay sai, mạng phụ, cặp đôi từ Bình minh 1).
 */
function MyRoleDialog({ ctx, onClose }: { ctx: MenuCtx; onClose: () => void }) {
  const { held, bind } = useHold();
  const looks = ctx.myData.seerLog ?? [];
  return (
    <Modal title="Vai của tôi" onClose={onClose}>
      <HoldCard held={held} bind={bind} className="h-64" hint="Che màn hình rồi hãy giữ.">
        {() => (
          <div className="text-left">
            <MyRoleBody ctx={ctx} />
            {ctx.myData.role === 'seer' && (
              <ul className="mt-2 space-y-0.5 text-xs">
                {looks.length === 0 && <li className="text-(--ww-text-3)">Chưa soi ai.</li>}
                {looks.map((l) => (
                  <li key={l.round}>
                    Đêm {l.round}: {nameOf(ctx.players, l.targetId)} —{' '}
                    <span className={l.isWolf ? 'text-(--ww-wolf-light)' : 'text-(--ww-village-light)'}>{l.isWolf ? 'LÀ SÓI' : 'không phải Sói'}</span>
                  </li>
                ))}
              </ul>
            )}
            {ctx.myData.role === 'guard' && ctx.myData.guardLast && (
              <p className="mt-2 text-xs text-(--ww-text-2)">Đêm trước bạn che {nameOf(ctx.players, ctx.myData.guardLast)}.</p>
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
      <p className="mb-3 text-sm text-(--ww-text-2)">
        Dành cho người bỏ về hẳn. Người đó tính là đã chết (rời làng), lộ vai theo cài đặt; Thợ săn rời làng thì không được bắn.
      </p>
      {candidates.length === 0 ? (
        <p className="text-sm text-(--ww-text-3)">Không còn ai khác trong làng.</p>
      ) : (
        <ul className="space-y-1.5" data-ww-leave-list="">
          {candidates.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                data-player-id={p.id}
                className="flex min-h-12 w-full items-center gap-2.5 rounded-xl bg-(--ww-raised) px-3 text-left text-sm font-semibold text-(--ww-text) hover:bg-(--ww-raised-hi)"
                onClick={() => onPick(p)}
              >
                <Avatar name={p.name} id={p.id} />
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
  counts = null,
  leaveCandidates = null,
  onLeaveVillage,
  onLeave,
  onDelete,
}: {
  /** Có khi đang trong ván (để mở "Vai của tôi"). */
  ctx: MenuCtx | null;
  isHost: boolean;
  inGame: boolean;
  /** Luật tuỳ chọn của ván (hoặc của phòng ở sảnh), cho màn "Luật chơi". */
  rules: WwRules | null;
  /** Bộ vai của ván (hoặc của phòng ở sảnh), công khai: "Luật chơi" nêu vai mở rộng đang bật. */
  counts?: Partial<Record<WwRole, number>> | null;
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
  return (
    <>
      <Button variant="ghost" icon="more" aria-label="Menu" aria-haspopup="dialog" onClick={() => setOpen(true)} />
      {open && (
        <Modal title="Menu" onClose={() => setOpen(false)} initialFocus="panel">
          <div className="space-y-1">
            {ctx && ctx.myData.role && (
              <Button
                variant="ghost"
                block
                align="start"
                icon="hold"
                onClick={() => {
                  setOpen(false);
                  setShowRole(true);
                }}
              >
                Vai của tôi
              </Button>
            )}
            <Button
              variant="ghost"
              block
              align="start"
              icon="rules"
              onClick={() => {
                setOpen(false);
                setShowRules(true);
              }}
            >
              Luật chơi
            </Button>
            {leaveCandidates && onLeaveVillage && (
              <Button
                variant="ghost"
                block
                align="start"
                icon="dead"
                onClick={() => {
                  setOpen(false);
                  setShowLeave(true);
                }}
              >
                Cho rời làng…
              </Button>
            )}
            {!isHost && (
              <Button
                variant="ghost"
                block
                align="start"
                icon="leave"
                onClick={() => {
                  setOpen(false);
                  onLeave();
                }}
              >
                {inGame ? 'Thoát khỏi ván' : 'Rời phòng'}
              </Button>
            )}
            {isHost && (
              <Button
                variant="ghost"
                block
                align="start"
                icon="delete"
                danger
                onClick={() => {
                  setOpen(false);
                  onDelete();
                }}
              >
                Xoá phòng
              </Button>
            )}
          </div>
        </Modal>
      )}
      {showRole && ctx && <MyRoleDialog ctx={ctx} onClose={() => setShowRole(false)} />}
      {showRules && <RulesDialog rules={rules} counts={counts} onClose={() => setShowRules(false)} />}
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
