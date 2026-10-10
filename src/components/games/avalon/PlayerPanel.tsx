'use client';

import type { Player } from '@/types/player';
import { AvalonRole, type AvalonGameData, type AvalonGameState, type QuestCard, type TeamVote } from './types';
import RoundTable from './RoundTable';
import AvButton from './ui/AvButton';
import RoomMenu from './ui/RoomMenu';
import { useHold } from './hooks/useHold';
import { useEndReveal } from './hooks/useEndReveal';
import { PhaseChip } from './panel/shared';
import { needsMyAction } from './panel/myTurn';
import { MyTurnContext, useTurnTitle } from './ui/MyTurn';
import { LineupPreviewSection } from './panel/LineupPreviewSection';
import { RoleRevealWaitingSection } from './panel/RoleRevealWaitingSection';
import { NightSection, nightSight, type NightPhase } from './panel/NightSections';
import { TeamBuildSection } from './panel/TeamBuildSection';
import { TeamVoteSection } from './panel/TeamVoteSection';
import { TeamVoteResultSection } from './panel/TeamVoteResultSection';
import { QuestPlaySection } from './panel/QuestPlaySection';
import { QuestResultSection } from './panel/QuestResultSection';
import { DiscussionSection } from './panel/DiscussionSection';
import { LadySection } from './panel/LadySection';
import { AssassinSection } from './panel/AssassinSection';
import { EndSection } from './panel/EndSection';
import SceneTitle from './scenes/SceneTitle';
import { getScene } from './scenes/getScene';
import { journeyKey } from './scenes/journey';

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
  /** Seeds the journey when the seat order is empty (getJourney). */
  roomId?: string;
  /** Player ids in the order they joined the room (lineup-preview: the seats
   *  slide from there to the seat order). */
  joinOrder?: readonly string[];
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

  // "Các vai" / "Vai của tôi" sit in the top bar from the night on.
  const hasRoleButtons = !!(myRole && myTeam) && state.phase !== 'lineup-preview' && state.phase !== 'role-reveal';

  const isAssassin = myRole === AvalonRole.Assassin;

  // Hint trên ghế của RoundTable (Đồng đội Quỷ, Quỷ bạn thấy, Merlin/
  // Morgana...) chỉ được hiện diện sau khi xong tất cả night-reveals — tức là
  // từ 'team-build' trở đi. Trong lineup-preview / role-reveal / night-* mỗi
  // người vẫn được phân vai trong gameData nên nếu không gate, sidebar sẽ lộ
  // luôn ai đồng đội mình trước cả khi vào đêm.
  const hintsVisible =
    state.phase !== 'lineup-preview' &&
    state.phase !== 'role-reveal' &&
    !state.phase.startsWith('night-');
  const safeViewerRole = hintsVisible ? myRole : undefined;

  // Toggle pick handler — Leader bấm
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

  // Night: every screen shows the same veil and dock; only while the viewer
  // holds the night card does their own screen show what the call lets them
  // see, and light those seats on the table (panel/NightSections).
  const night = state.phase.startsWith('night-') ? (state.phase as NightPhase) : null;
  const nightHold = useHold(state.phase);
  const sight = night ? nightSight(night, myPlayer, gamePlayers) : null;
  const glowIds = sight && sight.active && nightHold.held ? sight.seen.map((p) => p.id) : undefined;

  // End: the moment the roles turn over on the table and the end screen
  // tells who won — after the assassination overlay, if there is one.
  const endReveal = useEndReveal(state);

  // "Đến lượt bạn": a gold edge around the dock and a "● " in the tab title
  // while the table waits for the viewer. Never at night (panel/myTurn.ts).
  const myTurn = needsMyAction(state, myPlayer);
  useTurnTitle(myTurn);

  const handleAssassinTablePick = (id: string) => {
    if (!isAssassin || state.phase !== 'assassinate') return;
    if (props.onSetAssassinChoice) {
      props.onSetAssassinChoice(id, myPlayer.id);
    }
  };

  // The Lady aims by tapping a seat (the same onLadyInspect as the old list:
  // it moves her gaze and resets the clock), until she has looked.
  const isLadyHolder = state.ladyHolderId === myPlayer.id;
  const canLadyPick = isLadyHolder && state.phase === 'lady-of-lake' && state.ladyShownCard === null;
  const handleLadyTablePick = (id: string) => {
    if (!canLadyPick || id === state.ladyTargetId) return;
    props.onLadyInspect(id);
  };

  // The name of a new scene, shown on the table's free band for ~2.5 s (scenes/SceneTitle).
  const roomId = props.roomId ?? '';
  const sceneTitle = (
    <SceneTitle
      scene={getScene(state, roomId, playerCount)}
      startedAt={state.phaseStartedAt ?? null}
      quest={state.currentQuest}
      seedKey={journeyKey(state, roomId)}
    />
  );

  // Slim top bar (ux-plan 8b): the phase chip on the left, "Vai của tôi" and
  // the "⋯" menu ("Các vai trong ván", Rời / Xoá phòng) on the right. The
  // reject count (the candles), the quest number (the lit tile) and the
  // Leader (the crown) live on the table only. The role button is
  // deliberately neutral (no role icon, name or team colour): a neighbour
  // glancing at the screen must not learn the viewer's team. Nearly opaque
  // and without blur: the scene behind it moves.
  const topBar = (
    <div className="h-11 border-b border-(--av-line) bg-(color:--av-bar-bg)">
      <div className="@container flex h-full items-center gap-1.5 px-4">
        <PhaseChip phase={state.phase} compact={hasRoleButtons} turn={myTurn} />
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {hasRoleButtons && (
            <AvButton variant="ghost" icon="eye" onClick={onShowMyRole} title="Xem vai của tôi">
              Vai của tôi
            </AvButton>
          )}
          <RoomMenu
            onShowRoles={hasRoleButtons ? props.onShowRolePreview : undefined}
            onLeaveRoom={props.onLeaveRoom}
            isHost={props.isHost}
          />
        </div>
      </div>
    </div>
  );

  // The phase-specific section panel. Rendered exactly ONCE (see the layout
  // below) so its timers and local state never run twice.
  const phaseSection = (
    <div className="space-y-3">
      {/* The two-fail rule is one line inside the panels of the quest that
          has it (team-build, team-vote, quest-play, quest-result). */}
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

      {night && (
        // Keyed by turn: "Tiếp tục" of a player who is not called is local.
        <NightSection
          key={night}
          state={state}
          phase={night}
          myPlayer={myPlayer}
          gamePlayers={gamePlayers}
          held={nightHold.held}
          holdBind={nightHold.bind}
          onAckRole={props.onAckRole}
        />
      )}

      {state.phase === 'team-build' && (
        <TeamBuildSection
          isLeader={isLeader}
          state={state}
          gamePlayers={gamePlayers}
          teamSize={teamSize}
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
          gamePlayers={gamePlayers}
          onLadyConfirm={props.onLadyConfirm}
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
        />
      )}

      {state.phase === 'end' && (
        <EndSection
          state={state}
          myPlayer={myPlayer}
          gamePlayers={gamePlayers}
          roomId={roomId}
          reveal={endReveal}
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
    <div className="min-h-dvh" data-phase={state.phase} data-phase-started-at={state.phaseStartedAt}>
      <p className="sr-only" role="status" aria-live="polite" data-turn-announce="">
        {myTurn ? 'Đến lượt bạn' : ''}
      </p>
      <div className="sticky top-0 z-20">{topBar}</div>

      {/* ONE DOM for every breakpoint.
          < lg : a single column — table first, then the phase section.
          lg+  : fixed-viewport 2 columns — table (no scroll) | section. The
                 seats on the table are the player list; there is no roster. */}
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:max-w-xl md:max-w-2xl lg:grid lg:h-[calc(100dvh-2.75rem)] lg:max-w-[1400px] lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6 lg:py-0 lg:pb-0 xl:grid-cols-[minmax(0,1fr)_400px]">
        {/* The table is there from the line-up on: the seats are shuffled
            and the crown is spun on it (lineup-preview). */}
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
              onLadyPick={handleLadyTablePick}
              canLadyPick={canLadyPick}
              sceneTitle={sceneTitle}
              joinOrder={props.joinOrder}
              glowIds={glowIds}
              revealAll={state.phase === 'end' ? endReveal.revealAt : undefined}
            />
          </div>
        </div>

        <div data-phase-section className="lg:overflow-y-auto lg:py-4 lg:pl-1">
          {/* The dock sits in the section: it blinks when the table waits for you. */}
          <MyTurnContext.Provider value={myTurn}>{phaseSection}</MyTurnContext.Provider>
        </div>
      </div>
    </div>
  );
}
