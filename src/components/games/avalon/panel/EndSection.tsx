import type { CSSProperties, ReactNode } from 'react';
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

// The end of the game (ux-plan GĐ5). Everything here is public — the winner,
// every role — so team colours are fine.
//
// Timeline (table/timelines.ts END), on the phase clock from the reveal moment
// R (hooks/useEndReveal): when the Assassin struck, the overlay plays first
// and R = its end (7.95 s), otherwise R = 0. From R: the personal banner
// ("Bạn thắng!" / "Bạn thua…") and the winners' sparks / embers (3 s); the
// seats on the table turn over to their roles one by one (RoundTable
// `revealAll`); the assassination card, the journey summary and the roles
// list follow. A reload after that lands on the final frame.
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
  // One line each, so the dock stays low and a short phone still sees the
  // banner above it.
  const dock = (onPlayAgain || onLeaveRoom) && (
    <ActionDock>
      <div className={`grid gap-2 ${onPlayAgain && onLeaveRoom ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {onPlayAgain && (
          <button
            onClick={onPlayAgain}
            disabled={isHost === false}
            className="whitespace-nowrap rounded-2xl bg-(--av-gold) px-2 py-3 text-sm font-black text-(--av-ink) shadow-lg shadow-black/40 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-300 disabled:shadow-none"
            title={isHost === false ? 'Chỉ chủ phòng mới có thể bắt đầu ván mới' : 'Chơi tiếp ván mới với cùng bàn'}
          >
            {isHost === false ? (
              <>
                <AvIcon name="waiting" /> Chờ chủ phòng
              </>
            ) : (
              <>
                <AvIcon name="new-game" /> Chơi ván mới
              </>
            )}
          </button>
        )}
        {onLeaveRoom && (
          <button
            onClick={onLeaveRoom}
            className="whitespace-nowrap rounded-2xl border border-white/15 bg-(color:--av-glass-bg) px-2 py-3 text-sm font-black text-slate-200 hover:bg-white/10 active:scale-[0.98]"
          >
            <AvIcon name={isHost ? 'delete' : 'leave'} /> {isHost ? 'Xoá phòng' : 'Thoát phòng'}
          </button>
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

  const myData = myPlayer.gameData as Partial<AvalonGameData>;
  const won = myData.team ? myData.team === winner : null;
  const reason = endReason(state, gamePlayers);
  const reasonText = endReasonText(reason, target?.name);
  const headline = won === null ? `${TEAM_NAME_VI[winner]} thắng!` : won ? 'Bạn thắng!' : 'Bạn thua…';
  // The end scene's line of narration (SceneTitle leaves it to the banner).
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
          <AvIcon name={TEAM_ICON_NAME[winner]} size={44} className={`mb-1 ${TEAM_TEXT[winner]}`} />
        </span>
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-300">Ván đấu kết thúc</p>
        <h2
          className={`av-display av-banner-in mt-1 text-5xl leading-tight [@media(max-height:700px)]:text-4xl ${won === false ? 'text-slate-100' : 'text-(--av-gold)'}`}
          style={at(100)}
        >
          {headline}
        </h2>
        {won !== null && (
          <p className={`mt-1 text-base font-black ${TEAM_TEXT[winner]}`}>
            <AvIcon name={TEAM_ICON_NAME[winner]} /> {TEAM_NAME_VI[winner]} thắng
          </p>
        )}
        <p className="mx-auto mt-2 max-w-sm text-balance text-sm italic leading-snug text-slate-300">{narration}</p>
        <p className="mt-2 text-sm font-bold leading-snug text-slate-100" data-end-reason={reason}>
          {reasonText}
        </p>
        {myData.role && (
          <p className="mt-3 text-xs text-slate-300">
            Vai của bạn:{' '}
            <span className="inline-flex items-center gap-1 align-middle font-bold text-white">
              <RoleEmblem role={myData.role} size="xs" /> {ROLE_NAMES_VI[myData.role]}
            </span>
          </p>
        )}
        <span className="sr-only" aria-live="polite">
          {revealed ? `${headline} ${TEAM_NAME_VI[winner]} thắng. ${reasonText}` : ''}
        </span>
      </GlassPanel>

      {dock}

      {target && <StabCard target={target} role={targetRole} style={at(END.stabAt)} stampStyle={at(END.stabAt + 300)} />}

      <JourneySummary state={state} gamePlayers={gamePlayers} roomId={roomId} reason={reason} at={at} />

      <RolesList state={state} gamePlayers={gamePlayers} myPlayerId={myPlayer.id} style={at(END.rolesAt)} />
    </>
  );
}

// Who the Assassin struck and what they really were — also the static
// stand-in for the overlay when motion is reduced (ux-plan GĐ5).
function StabCard({
  target,
  role,
  style,
  stampStyle,
}: {
  target: Player;
  role: AvalonRole | null;
  style: CSSProperties;
  stampStyle: CSSProperties;
}) {
  const found = role === AvalonRole.Merlin;
  return (
    // overflow-hidden: before it lands, the stamp is 2.4× its size (av-stamp)
    // and would stick out of the page — a phone then widens the layout and
    // the dock drops off the screen.
    <GlassPanel
      tone={found ? 'evil' : 'good'}
      className="av-rise flex items-center gap-3 overflow-hidden p-4"
      style={style}
      data-end-stab={found ? 'found' : 'missed'}
    >
      <PlayerAvatar player={target} size="lg" aim="assassin" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">
          <AvIcon name="assassinate" /> Sát Thủ đâm
        </p>
        <p className="truncate text-base font-black text-white">{target.name}</p>
        {role ? (
          <p className={`mt-0.5 flex items-center gap-1 text-xs font-bold ${TEAM_TEXT[ROLE_TEAM[role]]}`}>
            <RoleEmblem role={role} size="xs" /> {ROLE_NAMES_VI[role]}
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-slate-300">(không rõ vai)</p>
        )}
      </div>
      <span
        className={`av-stamp av-display shrink-0 rounded-lg border-[3px] border-double bg-black/40 px-2.5 py-0.5 text-xl uppercase tracking-wider ${
          found ? 'border-(--av-evil-light) text-(--av-evil-light)' : 'border-(--av-good-light) text-(--av-good-light)'
        }`}
        style={stampStyle}
      >
        {found ? 'Trúng' : 'Trật'}
      </span>
    </GlassPanel>
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
  at,
}: {
  state: AvalonGameState;
  gamePlayers: Player[];
  roomId: string;
  reason: EndReason;
  at: (ms: number) => CSSProperties;
}) {
  const journey = getJourney(state, roomId);
  const successes = state.quests.filter((q) => q.result === 'success').length;
  const failures = state.quests.filter((q) => q.result === 'fail').length;
  const nameOf = (id: string) => gamePlayers.find((p) => p.id === id)?.name;

  return (
    <GlassPanel className="p-4" data-end-journey="">
      <div className="av-rise" style={at(END.summaryAt)}>
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h3 className="av-display text-xl text-white">Hành trình</h3>
          <p className="text-[11px] font-bold">
            <span className="text-(--av-good-light)">{successes} thành công</span>
            <span className="text-slate-400"> · </span>
            <span className="text-(--av-evil-light)">{failures} thất bại</span>
          </p>
        </div>
        <JourneyStrip state={state} roomId={roomId} final />
      </div>
      <ol className="mt-3 divide-y divide-white/5">
        {state.quests.map((q, i) => (
          <QuestLogRow
            key={i}
            index={i}
            quest={q}
            location={SCENE_NAMES_VI[journey[i]]}
            nameOf={nameOf}
            stuck={reason === 'rejected' && q.result === null && i === state.currentQuest}
            style={at(END.summaryAt + 200 + END.legGapMs * i)}
          />
        ))}
      </ol>
    </GlassPanel>
  );
}

function QuestLogRow({
  index,
  quest,
  location,
  nameOf,
  stuck,
  style,
}: {
  index: number;
  quest: AvalonQuestRecord;
  location: string;
  nameOf: (id: string) => string | undefined;
  stuck: boolean;
  style: CSSProperties;
}) {
  const played = quest.result !== null;
  const success = quest.result === 'success';
  const leader = quest.leaderId ? nameOf(quest.leaderId) : undefined;
  const team = quest.teamIds.map(nameOf).filter((n): n is string => !!n);

  return (
    <li className="av-rise flex gap-3 py-2.5" style={style} data-quest-log={played ? (success ? 'success' : 'fail') : stuck ? 'rejected' : 'unplayed'}>
      <span
        className={`av-display w-7 shrink-0 text-center text-xl leading-6 ${
          played ? (success ? 'text-(--av-good-light)' : 'text-(--av-evil-light)') : 'text-slate-400'
        }`}
      >
        {ROMAN[index]}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={`min-w-0 flex-1 truncate text-sm font-bold ${played ? 'text-white' : 'text-slate-300'}`}>{location}</p>
          {played && (
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-black ${
                success
                  ? 'border-(--av-good)/50 bg-(--av-good)/15 text-(--av-good-light)'
                  : 'border-(--av-evil)/50 bg-(--av-evil)/15 text-(--av-evil-light)'
              }`}
            >
              <AvIcon name={success ? 'quest-success' : 'quest-fail'} /> {success ? 'Thành công' : 'Thất bại'}
            </span>
          )}
        </div>
        {played ? (
          <>
            <p className="mt-1 text-[11px] leading-snug text-slate-300">
              {leader && (
                <span className="mr-2 inline-flex items-center gap-1 whitespace-nowrap">
                  <AvIcon name="leader" className="text-(--av-gold)" /> {leader}
                </span>
              )}
              {team.length > 0 && (
                <span>
                  <AvIcon name="team" className="mr-1 text-slate-400" />
                  {team.join(', ')}
                </span>
              )}
            </p>
            <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] font-bold">
              {quest.approveCount !== undefined && (
                <span className="text-(--av-approve-light)">
                  <AvIcon name="vote-approve" /> {quest.approveCount} đồng ý
                </span>
              )}
              {quest.rejectCount !== undefined && (
                <span className="text-(--av-reject-light)">
                  <AvIcon name="vote-reject" /> {quest.rejectCount} từ chối
                </span>
              )}
              <span className={quest.failCount > 0 ? 'text-(--av-evil-light)' : 'text-slate-300'}>
                <AvIcon name="quest-fail" /> {quest.failCount} lá Quỷ
              </span>
            </p>
          </>
        ) : (
          <p className="mt-0.5 text-[11px] italic text-slate-400">
            {stuck ? `Đội bị bác ${VOTE_TRACK_LIMIT} lần liên tiếp — không đi được` : 'Chưa đi tới'}
          </p>
        )}
      </div>
    </li>
  );
}

// Every role, in seat order (the table shows the same, as shields).
function RolesList({
  state,
  gamePlayers,
  myPlayerId,
  style,
}: {
  state: AvalonGameState;
  gamePlayers: Player[];
  myPlayerId: string;
  style: CSSProperties;
}) {
  return (
    <GlassPanel className="av-rise overflow-hidden" style={style} data-end-roles="">
      <div className="border-b border-white/10 px-4 py-3">
        <h3 className="av-display text-xl text-white">
          <AvIcon name="roles" /> Vai của mọi người
        </h3>
      </div>
      <ul className="divide-y divide-white/5">
        {gamePlayers.map((p) => {
          const data = p.gameData as Partial<AvalonGameData>;
          const role = data.role;
          const team = data.team;
          return (
            <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
              {role ? <RoleEmblem role={role} size="sm" /> : <AvIcon name="roles" size={30} className="text-slate-500" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-white">
                  {p.name}
                  {p.id === myPlayerId && <span className="ml-1 text-[11px] font-bold text-(--av-parchment)">(bạn)</span>}
                  {p.id === state.merlinTargetId && (
                    <span className="ml-1 text-[11px] font-bold text-(--av-evil-light)" title="Bị Sát Thủ đâm">
                      <AvIcon name="assassinate" />
                    </span>
                  )}
                </p>
                {role && <p className={`truncate text-xs font-bold ${team ? TEAM_TEXT[team] : 'text-slate-300'}`}>{ROLE_NAMES_VI[role]}</p>}
              </div>
              {team && (
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                    team === 'good' ? 'bg-(--av-good)/20 text-(--av-good-light)' : 'bg-(--av-evil)/20 text-(--av-evil-light)'
                  }`}
                >
                  {TEAM_NAME_VI[team]}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </GlassPanel>
  );
}
