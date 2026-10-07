'use client';

import type { Player } from '@/types/player';
import { AvalonRole, type AvalonGameData, type AvalonGameState, type QuestCard, type TeamVote } from './types';
import { VOTE_TRACK_LIMIT, questNeedsTwoFails } from './constants';
import RoundTable from './RoundTable';
import AvIcon from './assets/AvIcon';
import GlassPanel from './ui/GlassPanel';
import { PhaseChip } from './panel/shared';
import { PlayerRoster } from './panel/PlayerRoster';
import { LineupPreviewSection } from './panel/LineupPreviewSection';
import { RoleRevealWaitingSection } from './panel/RoleRevealWaitingSection';
import { NightEvilsSection, NightMerlinSection, NightPercivalSection } from './panel/NightSections';
import { TeamBuildSection } from './panel/TeamBuildSection';
import { TeamVoteSection } from './panel/TeamVoteSection';
import { TeamVoteResultSection } from './panel/TeamVoteResultSection';
import { QuestPlaySection } from './panel/QuestPlaySection';
import { QuestResultSection } from './panel/QuestResultSection';
import { DiscussionSection } from './panel/DiscussionSection';
import { LadySection } from './panel/LadySection';
import { AssassinSection } from './panel/AssassinSection';
import { EndSection } from './panel/EndSection';

interface PlayerPanelProps {
  state: AvalonGameState;
  myPlayer: Player;
  players: Player[];
  playerCount: number;
  onProposedTeamChange: (teamIds: string[]) => void;
  onSubmitTeam: () => void;
  onCastVote: (vote: TeamVote) => void;
  onPlayQuestCard: (card: QuestCard) => void;
  onLadyInspect: (targetId: string) => void;
  onLadyConfirm: () => void;
  onLadyShow: (card: 'good' | 'evil') => void;
  onLadyFinish: () => void;
  onAssassinate: (targetId: string, callerId?: string) => void;
  onSetAssassinChoice?: (targetId: string | null, callerId?: string) => void;
  onShowMyRole: () => void;
  onShowRolePreview?: () => void;
  onAckRole: () => void;
  onAckDiscussion: () => void;
  onPlayAgain?: () => void;
  onLeaveRoom?: () => void;
  isHost?: boolean;
}

export default function PlayerPanel(props: PlayerPanelProps) {
  const {
    state,
    myPlayer,
    players,
    playerCount,
    onShowMyRole,
  } = props;

  const myData = myPlayer.gameData as Partial<AvalonGameData>;
  const myRole = myData.role;
  const myTeam = myData.team;
  const isLeader = state.currentLeaderId === myPlayer.id;
  const gamePlayers = players;
  const onTeam = state.proposedTeam.includes(myPlayer.id);

  const teamSize = state.quests[state.currentQuest]?.teamSize ?? 0;

  const showRoundTable = state.phase !== 'lineup-preview' && state.phase !== 'role-reveal';
  const isAssassin = myRole === AvalonRole.Assassin;

  // Hint trong PlayerRoster / RoundTable (Đồng đội Quỷ, Quỷ bạn thấy, Merlin/
  // Morgana...) chỉ được hiện diện sau khi xong tất cả night-reveals — tức là
  // từ 'team-build' trở đi. Trong lineup-preview / role-reveal / night-* mỗi
  // người vẫn được phân vai trong gameData nên nếu không gate, sidebar sẽ lộ
  // luôn ai đồng đội mình trước cả khi vào đêm.
  const hintsVisible =
    state.phase !== 'lineup-preview' &&
    state.phase !== 'role-reveal' &&
    !state.phase.startsWith('night-');
  const safeViewerRole = hintsVisible ? myRole : undefined;

  // Toggle pick handler: cùng logic với grid trong TeamBuildSection — Leader bấm
  // avatar trên bàn để add/remove. Khi đã đầy size, chọn thêm sẽ thay người đầu.
  const handleTablePick = (id: string) => {
    if (!isLeader || state.phase !== 'team-build') return;
    const team = state.proposedTeam;
    if (team.includes(id)) {
      props.onProposedTeamChange(team.filter((x) => x !== id));
    } else if (team.length < teamSize) {
      props.onProposedTeamChange([...team, id]);
    } else {
      props.onProposedTeamChange([...team.slice(1), id]);
    }
  };

  const handleAssassinTablePick = (id: string) => {
    if (!isAssassin || state.phase !== 'assassinate') return;
    if (props.onSetAssassinChoice) {
      props.onSetAssassinChoice(id, myPlayer.id);
    }
  };

  // Slim top bar — phase + reject counter + "my role" button — kept short so the
  // round table fits in the viewport without scroll on lg+. The role button is
  // deliberately neutral (no role icon, name or team colour): a neighbour
  // glancing at the screen must not learn the viewer's team. Nearly opaque and
  // without blur: the scene behind it moves.
  const topBar = (
    <div className="bg-(color:--av-bar-bg) border-b border-white/10">
      <div className="flex items-center gap-2 px-4 py-2">
        <PhaseChip phase={state.phase} />
        <span className="text-xs text-slate-400 hidden sm:inline">
          Quest {state.currentQuest + 1}/5
        </span>
        {myRole && myTeam && state.phase !== 'lineup-preview' && state.phase !== 'role-reveal' && (
          <div className="ml-auto flex items-center gap-1.5">
            {props.onShowRolePreview && (
              <button
                onClick={props.onShowRolePreview}
                className="flex items-center gap-1 whitespace-nowrap rounded-full border border-fuchsia-500/30 bg-fuchsia-950/40 text-fuchsia-200 px-2 py-1 text-[11px] font-bold active:opacity-75 hover:bg-fuchsia-900/40 sm:px-2.5"
                title="Xem lại các vai trong ván"
                aria-label="Các vai trong ván"
              >
                <AvIcon name="roles" size={14} />
                <span className="hidden sm:inline">Các vai</span>
              </button>
            )}
            <button
              onClick={onShowMyRole}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-(--av-parchment)/25 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-(--av-parchment) active:opacity-75 hover:bg-white/10"
              title="Xem vai của tôi"
            >
              <AvIcon name="eye" size={15} />
              <span>Vai của tôi</span>
            </button>
          </div>
        )}
        <span
          className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-black ${!(myRole && myTeam) ? 'ml-auto' : ''
            } ${state.voteRejectStreak >= 4
              ? 'bg-(--av-evil)/20 text-(--av-evil-light) border border-(--av-evil)/45'
              : state.voteRejectStreak >= 3
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-white/5 text-slate-400 border border-white/10'
            }`}
          title="Số lần đội bị từ chối liên tiếp (5 lần → Phe Quỷ thắng)"
        >
          <AvIcon name="candle-out" size={12} /> {state.voteRejectStreak}/{VOTE_TRACK_LIMIT}
        </span>
      </div>
      {isLeader && state.phase !== 'role-reveal' && state.phase !== 'end' && (
        <div className="bg-amber-500/10 border-t border-amber-500/30 px-4 py-1 text-center">
          <span className="text-[11px] font-black text-(--av-leader)">
            <AvIcon name="leader" /> Bạn là Leader
          </span>
        </div>
      )}
    </div>
  );

  // The phase-specific section panel. Rendered exactly ONCE (see the layout
  // below) so its timers and local state never run twice.
  const phaseSection = (
    <div className="space-y-3">
      {(state.phase === 'team-build' ||
        state.phase === 'team-vote' ||
        state.phase === 'quest-play') &&
        questNeedsTwoFails(playerCount, state.currentQuest) && (
          <GlassPanel tone="evil" emphasis className="p-3 flex items-start gap-3">
            <AvIcon name="warning" size={24} className="text-(--av-evil-light)" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-(--av-evil-light) uppercase tracking-wider">
                Quest {state.currentQuest + 1} — Luật đặc biệt
              </p>
              <p className="mt-1 text-xs text-slate-200 leading-relaxed">
                Cần <strong className="text-(--av-evil-light)">≥ 2 lá Phe Quỷ</strong> để Quest này thất bại.
                1 lá Phe Quỷ đơn lẻ vẫn coi như Phe Người thắng Quest.
              </p>
            </div>
          </GlassPanel>
        )}

      {state.phase === 'lineup-preview' && (
        <LineupPreviewSection
          state={state}
          myPlayer={myPlayer}
          gamePlayers={gamePlayers}
          onAckRole={props.onAckRole}
        />
      )}

      {state.phase === 'role-reveal' && (
        <RoleRevealWaitingSection
          state={state}
          myPlayer={myPlayer}
          gamePlayers={gamePlayers}
          onShowMyRole={onShowMyRole}
        />
      )}

      {state.phase === 'night-evils' && (
        <NightEvilsSection
          state={state}
          myPlayer={myPlayer}
          myRole={myRole}
          myTeam={myTeam}
          gamePlayers={gamePlayers}
          onAckRole={props.onAckRole}
        />
      )}

      {state.phase === 'night-merlin' && (
        <NightMerlinSection
          state={state}
          myPlayer={myPlayer}
          myRole={myRole}
          gamePlayers={gamePlayers}
          onAckRole={props.onAckRole}
        />
      )}

      {state.phase === 'night-percival' && (
        <NightPercivalSection
          state={state}
          myPlayer={myPlayer}
          myRole={myRole}
          gamePlayers={gamePlayers}
          onAckRole={props.onAckRole}
        />
      )}

      {state.phase === 'team-build' && (
        <TeamBuildSection
          isLeader={isLeader}
          state={state}
          gamePlayers={gamePlayers}
          teamSize={teamSize}
          myPlayerId={myPlayer.id}
          onProposedTeamChange={props.onProposedTeamChange}
          onSubmitTeam={props.onSubmitTeam}
        />
      )}

      {state.phase === 'team-vote' && (
        <TeamVoteSection
          state={state}
          myPlayer={myPlayer}
          gamePlayers={gamePlayers}
          onCastVote={props.onCastVote}
        />
      )}

      {state.phase === 'team-vote-result' && (
        <TeamVoteResultSection state={state} gamePlayers={gamePlayers} />
      )}

      {state.phase === 'quest-play' && (
        <QuestPlaySection
          state={state}
          myPlayer={myPlayer}
          myTeam={myTeam}
          onTeam={onTeam}
          gamePlayers={gamePlayers}
          onPlayQuestCard={props.onPlayQuestCard}
        />
      )}

      {state.phase === 'quest-result' && (
        <QuestResultSection state={state} playerCount={playerCount} />
      )}

      {state.phase === 'discussion' && (
        <DiscussionSection
          state={state}
          myPlayer={myPlayer}
          gamePlayers={gamePlayers}
          onAckDiscussion={props.onAckDiscussion}
        />
      )}

      {state.phase === 'lady-of-lake' && (
        <LadySection
          state={state}
          myPlayer={myPlayer}
          myTeam={myTeam}
          gamePlayers={gamePlayers}
          onLadyInspect={props.onLadyInspect}
          onLadyConfirm={props.onLadyConfirm}
          onLadyShow={props.onLadyShow}
          onLadyFinish={props.onLadyFinish}
        />
      )}

      {state.phase === 'assassinate' && (
        <AssassinSection
          state={state}
          myPlayer={myPlayer}
          myRole={myRole}
          gamePlayers={gamePlayers}
          onAssassinate={props.onAssassinate}
          onSetAssassinChoice={props.onSetAssassinChoice}
        />
      )}

      {state.phase === 'end' && (
        <EndSection
          state={state}
          myRole={myRole}
          gamePlayers={gamePlayers}
          onPlayAgain={props.onPlayAgain}
          onLeaveRoom={props.onLeaveRoom}
          isHost={props.isHost}
        />
      )}
    </div>
  );

  // No background of its own: the scene (SceneBackdrop, rendered by the
  // container from getScene) shows through, the same on every screen. The old
  // blue/red gradient told a neighbour the viewer's team (B10).
  return (
    <div className="min-h-dvh">
      <div className="sticky top-0 z-20">{topBar}</div>

      {/* ONE DOM for every breakpoint.
          < lg : a single column — table first, then the phase section.
          lg+  : fixed-viewport 3 columns — roster | table (no scroll) | section.
                 With no table yet (lineup-preview / role-reveal) the section
                 takes the middle column instead. */}
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:max-w-xl md:max-w-2xl lg:grid lg:h-[calc(100dvh-44px)] lg:max-w-[1500px] lg:grid-cols-[300px_minmax(0,1fr)_340px] lg:py-0 lg:pb-0 xl:grid-cols-[340px_minmax(0,1fr)_380px]">
        <aside className="hidden overflow-y-auto py-4 pr-1 lg:block">
          <PlayerRoster
            gamePlayers={gamePlayers}
            state={state}
            myPlayerId={myPlayer.id}
            showVoteStatus={state.phase === 'team-vote'}
            title="Danh sách người chơi"
            compact
            viewerRole={safeViewerRole}
          />
        </aside>

        {showRoundTable ? (
          <>
            <div className="min-w-0 lg:flex lg:items-start lg:justify-center lg:overflow-hidden lg:py-4">
              <div className="flex w-full items-start justify-center">
                <RoundTable
                  players={gamePlayers}
                  state={state}
                  myPlayerId={myPlayer.id}
                  viewerRole={safeViewerRole}
                  playerCount={playerCount}
                  onTogglePick={handleTablePick}
                  canPick={isLeader && state.phase === 'team-build'}
                  pickedTeamSize={state.proposedTeam.length}
                  pickedTeamLimit={teamSize}
                  onAssassinPick={handleAssassinTablePick}
                  canAssassinPick={isAssassin && state.phase === 'assassinate'}
                />
              </div>
            </div>

            <div data-phase-section className="lg:overflow-y-auto lg:py-4 lg:pl-1">
              {phaseSection}
            </div>
          </>
        ) : (
          <div className="min-w-0 lg:flex lg:items-start lg:justify-center lg:overflow-hidden lg:py-4">
            <div data-phase-section className="w-full lg:max-h-full lg:max-w-xl lg:overflow-y-auto">
              {phaseSection}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
