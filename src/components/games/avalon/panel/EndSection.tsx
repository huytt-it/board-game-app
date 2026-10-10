import { useId, useState, type CSSProperties, type ReactNode } from 'react';
import type { Player } from '@/types/player';
import { AvalonRole, type AvalonGameData, type AvalonGameState, type AvalonQuestRecord, type AvalonTeam } from '../types';
import { ROLE_NAMES_VI, ROLE_TEAM, TEAM_NAME_VI, VOTE_TRACK_LIMIT } from '../constants';
import { TEAM_ICON_NAME } from '../presentation';
import { useCue } from '../hooks/useCue';
import type { useEndReveal } from '../hooks/useEndReveal';
import { usePhaseTimeline } from '../hooks/usePhaseTimeline';
import { END, endTimeline } from '../table/timelines';
import { AssassinRevealOverlay } from './AssassinRevealOverlay';
import { endReason, endReasonText, type EndReason } from './endGame';
import AvIcon from '../assets/AvIcon';
import ActionDock from '../ui/ActionDock';
import AvButton from '../ui/AvButton';
import EndSparks from '../ui/EndSparks';
import GlassPanel from '../ui/GlassPanel';
import PlayerAvatar from '../ui/PlayerAvatar';
import RoleEmblem from '../ui/RoleEmblem';
import JourneyStrip from '../scenes/JourneyStrip';
import { getJourney, journeyKey } from '../scenes/journey';
import { sceneLine } from '../scenes/narration';
import { SCENE_NAMES_VI } from '../scenes/types';

const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

// Text colour of a team on the dark glass (public information here).
const TEAM_TEXT: Record<AvalonTeam, string> = {
  good: 'text-(--av-good-light)',
  evil: 'text-(--av-evil-light)',
};

// The end of the game (ux-plan GĐ5, slimmed in GĐ7b). Everything here is
// public — the winner, every role — so team colours are fine.
//
// By default only: the personal banner ("Bạn thắng!" / "Bạn thua…" and one
// line of why), the table turning over to the roles, and the buttons. The
// story of the game — the Assassin's stab, the journey quest by quest, every
// role — is ONE folded part, "Diễn biến ván".
//
// Timeline (table/timelines.ts END), on the phase clock from the reveal moment
// R (hooks/useEndReveal): when the Assassin struck, the overlay plays first
// and R = its end (7.95 s), otherwise R = 0. From R: the banner and the
// winners' sparks / embers (3 s); the seats on the table turn over to their
// roles one by one (RoundTable `revealAll`); the "Diễn biến ván" toggle
// follows. A reload after that lands on the final frame.
export function EndSection({
  state,
  myPlayer,
  gamePlayers,
  roomId,
  reveal,
  onPlayAgain,
  onLeaveRoom,
  isHost,
}: {
  state: AvalonGameState;
  myPlayer: Player;
  gamePlayers: Player[];
  roomId: string;
  reveal: ReturnType<typeof useEndReveal>;
  onPlayAgain?: () => void;
  onLeaveRoom?: () => void;
  isHost?: boolean;
}) {
  const startedAt = state.phaseStartedAt ?? 0;
  const { revealAt, assassination, skipped, skipOverlay } = reveal;
  const { stage } = usePhaseTimeline(startedAt, endTimeline(revealAt));
  const winner: AvalonTeam = state.winner === 'good' ? 'good' : 'evil';
  const target = state.merlinTargetId ? gamePlayers.find((p) => p.id === state.merlinTargetId) : undefined;
  const targetRole = (target?.gameData as Partial<AvalonGameData> | undefined)?.role ?? null;

  // The game's last buttons, under the thumb (desktop: right under the banner).
  // Only the host can start over; the others see that they are waiting for them.
  const dock = (onPlayAgain || onLeaveRoom) && (
    <ActionDock>
      <div className={`grid gap-2 ${onPlayAgain && onLeaveRoom ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {onPlayAgain &&
          (isHost === false ? (
            <div
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-(--av-raised) px-3 text-sm font-semibold text-(--av-text-2)"
              title="Chỉ chủ phòng mới có thể bắt đầu ván mới"
              data-end-waiting-host=""
            >
              <AvIcon name="waiting" /> Chờ chủ phòng
            </div>
          ) : (
            <AvButton variant="primary" icon="new-game" onClick={onPlayAgain} title="Chơi tiếp ván mới với cùng bàn" className="whitespace-nowrap">
              Chơi ván mới
            </AvButton>
          ))}
        {/* A quiet row, no frame (the host's "Xoá phòng" reads red, as in the "⋯"
            menu) — on glass: on a desktop the dock sits right on the scene. */}
        {onLeaveRoom && (
          <AvButton
            variant="ghost"
            danger={isHost}
            block
            align="center"
            icon={isHost ? 'delete' : 'leave'}
            onClick={onLeaveRoom}
            className="whitespace-nowrap bg-(color:--av-glass-bg)"
          >
            {isHost ? 'Xoá phòng' : 'Thoát phòng'}
          </AvButton>
        )}
      </div>
    </ActionDock>
  );

  return (
    // A flex column, so the dock's spacer (order-last) stays at the very end
    // on phones while the dock itself sits under the banner on desktop.
    <div className="flex flex-col gap-3" data-anim-stage={stage} data-end-reveal-at={revealAt}>
      {assassination && !skipped && target && (
        <AssassinRevealOverlay target={target} targetRole={targetRole} startedAt={startedAt} onSkip={skipOverlay} />
      )}
      {stage === 'reveal' && <EndSparks winner={winner} startedAt={startedAt} at={revealAt} />}
      {/* Keyed by R: skipping the overlay restarts the story from now. */}
      <EndStory
        key={revealAt}
        state={state}
        myPlayer={myPlayer}
        gamePlayers={gamePlayers}
        roomId={roomId}
        revealAt={revealAt}
        revealed={stage !== 'overlay'}
        winner={winner}
        target={target}
        targetRole={targetRole}
        dock={dock}
      />
    </div>
  );
}

function EndStory({
  state,
  myPlayer,
  gamePlayers,
  roomId,
  revealAt,
  revealed,
  winner,
  target,
  targetRole,
  dock,
}: {
  state: AvalonGameState;
  myPlayer: Player;
  gamePlayers: Player[];
  roomId: string;
  revealAt: number;
  revealed: boolean;
  winner: AvalonTeam;
  target: Player | undefined;
  targetRole: AvalonRole | null;
  dock: ReactNode;
}) {
  const cue = useCue(state.phaseStartedAt ?? 0);
  // `ms` after the reveal moment.
  const at = (ms: number): CSSProperties => ({ animationDelay: cue(revealAt + ms) });
  // "Diễn biến ván" is folded by default; opening it is this screen's business only.
  const [open, setOpen] = useState(false);
  const storyId = useId();

  const myData = myPlayer.gameData as Partial<AvalonGameData>;
  const won = myData.team ? myData.team === winner : null;
  const reason = endReason(state, gamePlayers);
  const reasonText = endReasonText(reason, target?.name);
  const headline = won === null ? `${TEAM_NAME_VI[winner]} thắng!` : won ? 'Bạn thắng!' : 'Bạn thua…';
  // The end scene's line of narration opens the story (SceneTitle leaves the
  // end scenes alone).
  const narration = sceneLine(winner === 'good' ? 'end-good' : 'end-evil', journeyKey(state, roomId));

  return (
    <>
      <GlassPanel
        tone={winner}
        className="av-rise relative overflow-hidden p-5 text-center [@media(max-height:700px)]:pt-3"
        style={at(0)}
        data-end-banner={won === null ? 'none' : won ? 'won' : 'lost'}
      >
        {/* On a short phone the banner sits just above the dock: no big icon. */}
        <span className="block [@media(max-height:700px)]:hidden">
          <AvIcon name={TEAM_ICON_NAME[winner]} size={40} className={`mb-1 ${TEAM_TEXT[winner]}`} />
        </span>
        <h2
          className={`av-display av-banner-in text-5xl font-black leading-tight [@media(max-height:700px)]:text-4xl ${won === false ? 'text-(--av-text)' : 'text-(--av-gold)'}`}
          style={at(100)}
        >
          {headline}
        </h2>
        {won !== null && (
          <p className={`mt-1 text-base font-bold ${TEAM_TEXT[winner]}`}>{TEAM_NAME_VI[winner]} thắng</p>
        )}
        <p className="mx-auto mt-2 max-w-sm text-balance text-sm leading-snug text-(--av-text-2)" data-end-reason={reason}>
          {reasonText}
        </p>
        <span className="sr-only" aria-live="polite">
          {revealed ? `${headline} ${TEAM_NAME_VI[winner]} thắng. ${reasonText}` : ''}
        </span>
      </GlassPanel>

      {dock}

      <div className="av-rise" style={at(END.summaryAt)}>
        {/* Folded by default: a quiet row on glass, no frame. */}
        <AvButton
          variant="ghost"
          block
          icon="details"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={storyId}
          className="bg-(color:--av-glass-bg)"
          data-end-story-toggle=""
        >
          <span className="flex-1 text-left">Diễn biến ván</span>
          {/* A drawn chevron: down when folded, up when open. */}
          <span
            aria-hidden
            className={`mr-1 size-2 border-b-2 border-r-2 border-current transition-transform ${open ? '-rotate-135 translate-y-0.5' : 'rotate-45 -translate-y-0.5'}`}
          />
        </AvButton>
      </div>

      {open && (
        <GlassPanel id={storyId} className="p-4" data-end-story="">
          <p className="text-balance text-sm italic leading-snug text-(--av-text-2)">{narration}</p>
          {target && <StabRow target={target} role={targetRole} />}
          <JourneySummary state={state} gamePlayers={gamePlayers} roomId={roomId} reason={reason} />
          <RolesList state={state} gamePlayers={gamePlayers} myPlayerId={myPlayer.id} />
        </GlassPanel>
      )}
    </>
  );
}

// Who the Assassin struck and what they really were (the overlay's story, and
// its stand-in when motion is reduced). A row of the story, no frame.
function StabRow({ target, role }: { target: Player; role: AvalonRole | null }) {
  const found = role === AvalonRole.Merlin;
  return (
    <div className="mt-4 flex items-center gap-3 border-t border-(--av-line) pt-4" data-end-stab={found ? 'found' : 'missed'}>
      <PlayerAvatar player={target} size="lg" aim="assassin" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-(--av-text-3)">
          <AvIcon name="assassinate" /> Sát Thủ đâm
        </p>
        <p className="truncate text-base font-bold text-(--av-text)">{target.name}</p>
        {role ? (
          <p className={`mt-0.5 flex items-center gap-1 text-xs font-semibold ${TEAM_TEXT[ROLE_TEAM[role]]}`}>
            <RoleEmblem role={role} size="xs" /> {ROLE_NAMES_VI[role]}
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-(--av-text-3)">(không rõ vai)</p>
        )}
      </div>
      <span
        className={`av-display shrink-0 rounded-xl border-[3px] border-double bg-black/40 px-2.5 py-0.5 text-xl uppercase tracking-wider ${
          found ? 'border-(--av-evil-light) text-(--av-evil-light)' : 'border-(--av-good-light) text-(--av-good-light)'
        }`}
      >
        {found ? 'Trúng' : 'Trật'}
      </span>
    </div>
  );
}

// The journey, quest by quest: where it went, who led, who went, the votes on
// the approved team, the result and the fail cards. Only what the state keeps
// (quests[] of approved teams); rejected proposals are not stored, so none are
// made up — except the plain fact that the game ended on five rejections.
function JourneySummary({
  state,
  gamePlayers,
  roomId,
  reason,
}: {
  state: AvalonGameState;
  gamePlayers: Player[];
  roomId: string;
  reason: EndReason;
}) {
  const journey = getJourney(state, roomId);
  const successes = state.quests.filter((q) => q.result === 'success').length;
  const failures = state.quests.filter((q) => q.result === 'fail').length;
  const nameOf = (id: string) => gamePlayers.find((p) => p.id === id)?.name;

  return (
    <section className="mt-4 border-t border-(--av-line) pt-4" data-end-journey="">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold text-(--av-text)">Hành trình</h3>
        <p className="text-xs font-semibold">
          <span className="text-(--av-good-light)">{successes} thành công</span>
          <span className="text-(--av-text-2)"> · </span>
          <span className="text-(--av-evil-light)">{failures} thất bại</span>
        </p>
      </div>
      <JourneyStrip state={state} roomId={roomId} final />
      <ol className="mt-3 divide-y divide-(--av-line)">
        {state.quests.map((q, i) => (
          <QuestLogRow
            key={i}
            index={i}
            quest={q}
            location={SCENE_NAMES_VI[journey[i]]}
            nameOf={nameOf}
            stuck={reason === 'rejected' && q.result === null && i === state.currentQuest}
          />
        ))}
      </ol>
    </section>
  );
}

function QuestLogRow({
  index,
  quest,
  location,
  nameOf,
  stuck,
}: {
  index: number;
  quest: AvalonQuestRecord;
  location: string;
  nameOf: (id: string) => string | undefined;
  stuck: boolean;
}) {
  const played = quest.result !== null;
  const success = quest.result === 'success';
  const leader = quest.leaderId ? nameOf(quest.leaderId) : undefined;
  const team = quest.teamIds.map(nameOf).filter((n): n is string => !!n);

  return (
    <li className="flex gap-3 py-2.5" data-quest-log={played ? (success ? 'success' : 'fail') : stuck ? 'rejected' : 'unplayed'}>
      <span
        className={`av-display w-7 shrink-0 text-center text-xl leading-6 ${
          played ? (success ? 'text-(--av-good-light)' : 'text-(--av-evil-light)') : 'text-(--av-text-3)'
        }`}
      >
        {ROMAN[index]}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={`min-w-0 flex-1 truncate text-sm font-semibold ${played ? 'text-(--av-text)' : 'text-(--av-text-2)'}`}>{location}</p>
          {played && (
            <span className={`inline-flex shrink-0 items-center gap-1 text-xs font-semibold ${success ? 'text-(--av-good-light)' : 'text-(--av-evil-light)'}`}>
              <AvIcon name={success ? 'quest-success' : 'quest-fail'} /> {success ? 'Thành công' : 'Thất bại'}
            </span>
          )}
        </div>
        {played ? (
          <>
            <p className="mt-1 text-xs leading-snug text-(--av-text-2)">
              {leader && (
                <span className="mr-2 inline-flex items-center gap-1 whitespace-nowrap">
                  <AvIcon name="leader" className="text-(--av-gold)" /> {leader}
                </span>
              )}
              {team.length > 0 && (
                <span>
                  <AvIcon name="team" className="mr-1 text-(--av-text-3)" />
                  {team.join(', ')}
                </span>
              )}
            </p>
            <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-(--av-text-2)">
              {quest.approveCount !== undefined && (
                <span>
                  <AvIcon name="vote-approve" /> {quest.approveCount} đồng ý
                </span>
              )}
              {quest.rejectCount !== undefined && (
                <span>
                  <AvIcon name="vote-reject" /> {quest.rejectCount} từ chối
                </span>
              )}
              <span className={quest.failCount > 0 ? 'text-(--av-evil-light)' : ''}>
                <AvIcon name="quest-fail" /> {quest.failCount} lá Quỷ
              </span>
            </p>
          </>
        ) : (
          <p className="mt-0.5 text-xs italic text-(--av-text-3)">
            {stuck ? `Đội bị bác ${VOTE_TRACK_LIMIT} lần liên tiếp — không đi được` : 'Chưa đi tới'}
          </p>
        )}
      </div>
    </li>
  );
}

// Every role, in seat order (the table shows the same, as shields).
function RolesList({ state, gamePlayers, myPlayerId }: { state: AvalonGameState; gamePlayers: Player[]; myPlayerId: string }) {
  return (
    <section className="mt-4 border-t border-(--av-line) pt-4" data-end-roles="">
      <h3 className="text-base font-semibold text-(--av-text)">Vai của mọi người</h3>
      <ul className="mt-1 divide-y divide-(--av-line)">
        {gamePlayers.map((p) => {
          const data = p.gameData as Partial<AvalonGameData>;
          const role = data.role;
          const team = data.team;
          return (
            <li key={p.id} className="flex items-center gap-3 py-2.5">
              {role ? <RoleEmblem role={role} size="sm" /> : <AvIcon name="roles" size={30} className="text-(--av-text-3)" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-(--av-text)">
                  {p.name}
                  {p.id === myPlayerId && <span className="ml-1 text-xs text-(--av-text-2)">(bạn)</span>}
                  {p.id === state.merlinTargetId && (
                    <span className="ml-1 text-xs text-(--av-evil-light)" title="Bị Sát Thủ đâm">
                      <AvIcon name="assassinate" />
                    </span>
                  )}
                </p>
                {role && <p className={`truncate text-xs font-semibold ${team ? TEAM_TEXT[team] : 'text-(--av-text-2)'}`}>{ROLE_NAMES_VI[role]}</p>}
              </div>
              {team && <span className={`shrink-0 text-xs font-semibold ${TEAM_TEXT[team]}`}>{TEAM_NAME_VI[team]}</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
