// Asset registry: every Avalon icon and every scene layer is looked up here by
// name. To swap one for a drawn image, drop the file in `public/avalon/...` and
// change its ONE line below — see assets/README.md.
import type { ComponentType, SVGProps } from 'react';
import type { ParticleGroup, SceneId, ScenePalette } from '../scenes/types';
import { HallArcade, HallBack, HallFloor, HallTable, HALL_PALETTE, HALL_PARTICLES } from '../scenes/layers/hall';
import { NightCastle, NightFront, NightHills, NightSky, NIGHT_PALETTE, NIGHT_PARTICLES } from '../scenes/layers/night';
import { CampFire, CampSky, CampTents, CampTreeline, CAMP_PALETTE, CAMP_PARTICLES } from '../scenes/layers/camp';
import { ForestFar, ForestMist, ForestNear, ForestSky, FOREST_PALETTE, FOREST_PARTICLES } from '../scenes/layers/forest';
import PointyHat from './icons/pointy-hat';
import TemplarShield from './icons/templar-shield';
import VisoredHelm from './icons/visored-helm';
import CrownedSkull from './icons/crowned-skull';
import CrystalBall from './icons/crystal-ball';
import Owl from './icons/owl';
import PlainDagger from './icons/plain-dagger';
import Hood from './icons/hood';
import QueenCrown from './icons/queen-crown';
import Waves from './icons/waves';
import SkeletonKey from './icons/skeleton-key';
import HolyGrail from './icons/holy-grail';
import PouringChalice from './icons/pouring-chalice';
import FlyingFlag from './icons/flying-flag';
import TatteredBanner from './icons/tattered-banner';
import CandleLight from './icons/candle-light';
import CandleOut from './icons/candle-out';
import Lion from './icons/lion';
import DevilMask from './icons/devil-mask';
import Uncertainty from './icons/uncertainty';
import Moon from './icons/moon';
import Campfire from './icons/campfire';
import Vote from './icons/vote';
import ScrollUnfurled from './icons/scroll-unfurled';
import Backstab from './icons/backstab';
import Castle from './icons/castle';
import DramaMasks from './icons/drama-masks';
import WaxSeal from './icons/wax-seal';
import UpCard from './icons/up-card';
import CrossedSwords from './icons/crossed-swords';
import RoundTableIcon from './icons/round-table';
import Cog from './icons/cog';
import OpenBook from './icons/open-book';
import Spyglass from './icons/spyglass';
import TrashCan from './icons/trash-can';
import ExitDoor from './icons/exit-door';
import AerialSignal from './icons/aerial-signal';
import Cancel from './icons/cancel';
import MagnifyingGlass from './icons/magnifying-glass';
import Stopwatch from './icons/stopwatch';
import HazardSign from './icons/hazard-sign';
import Hourglass from './icons/hourglass';
import SemiClosedEye from './icons/semi-closed-eye';
import Crosshair from './icons/crosshair';
import CheckMark from './icons/check-mark';
import Padlock from './icons/padlock';
import LightBulb from './icons/light-bulb';
import ClockwiseRotation from './icons/clockwise-rotation';

export type AssetSource =
  | { kind: 'svg'; Component: ComponentType<SVGProps<SVGSVGElement>> }
  | { kind: 'image'; src: string; alt?: string }; // e.g. '/avalon/icons/merlin.webp'

const svg = (Component: ComponentType<SVGProps<SVGSVGElement>>): AssetSource => ({
  kind: 'svg',
  Component,
});

// Each name carries exactly ONE meaning across the whole game (e.g. `leader` is
// only ever the Leader token, never Mordred or the reject track).
export const ICONS = {
  // Roles
  merlin: svg(PointyHat),
  percival: svg(TemplarShield),
  'loyal-servant': svg(VisoredHelm),
  mordred: svg(CrownedSkull),
  morgana: svg(CrystalBall),
  oberon: svg(Owl),
  assassin: svg(PlainDagger),
  minion: svg(Hood),

  // Tokens, cards, teams
  leader: svg(QueenCrown),
  lady: svg(Waves),
  host: svg(SkeletonKey),
  'quest-success': svg(HolyGrail),
  'quest-fail': svg(PouringChalice),
  'vote-approve': svg(FlyingFlag),
  'vote-reject': svg(TatteredBanner),
  'candle-lit': svg(CandleLight),
  'candle-out': svg(CandleOut),
  'team-good': svg(Lion),
  'team-evil': svg(DevilMask),
  unknown: svg(Uncertainty),

  // Phases
  night: svg(Moon),
  discussion: svg(Campfire),
  vote: svg(Vote),
  quest: svg(ScrollUnfurled),
  assassinate: svg(Backstab),
  end: svg(Castle),
  roles: svg(DramaMasks),
  seal: svg(WaxSeal),
  'card-play': svg(UpCard),
  team: svg(CrossedSwords),
  avalon: svg(RoundTableIcon),

  // Interface
  settings: svg(Cog),
  guide: svg(OpenBook),
  preview: svg(Spyglass),
  delete: svg(TrashCan),
  leave: svg(ExitDoor),
  offline: svg(AerialSignal),
  close: svg(Cancel),
  details: svg(MagnifyingGlass),
  clock: svg(Stopwatch),
  warning: svg(HazardSign),
  waiting: svg(Hourglass),
  eye: svg(SemiClosedEye),
  target: svg(Crosshair),
  check: svg(CheckMark),
  lock: svg(Padlock),
  tip: svg(LightBulb),
  'new-game': svg(ClockwiseRotation),
} satisfies Record<string, AssetSource>;

export type IconName = keyof typeof ICONS;

// ─── Scenes (GĐ2) ────────────────────────────────────────────────────
// Each scene is a stack of full-frame layers, far → near, all framed the same
// way (a 1600×900 picture that covers the screen, anchored bottom-centre; see
// scenes/SceneBackdrop.tsx). Any layer can be an SVG component or an image:
//   layers: [image('/avalon/scenes/forest-sky.webp'), svg(ForestFar), …]
// A scene not drawn yet is a `placeholder`: a flat field of its base colour.

export interface SceneDef {
  /** Far → near. */
  layers: AssetSource[];
  palette: ScenePalette;
  /** Ambient particles drawn over the layers (≤ 20 per scene). */
  particles?: readonly ParticleGroup[];
  placeholder?: true;
}

const placeholder = (base: string, accent: string): SceneDef => ({
  layers: [],
  palette: { base, accent },
  placeholder: true,
});

export const SCENES: Record<SceneId, SceneDef> = {
  hall: {
    layers: [svg(HallBack), svg(HallArcade), svg(HallFloor), svg(HallTable)],
    palette: HALL_PALETTE,
    particles: HALL_PARTICLES,
  },
  night: {
    layers: [svg(NightSky), svg(NightHills), svg(NightCastle), svg(NightFront)],
    palette: NIGHT_PALETTE,
    particles: NIGHT_PARTICLES,
  },
  camp: {
    layers: [svg(CampSky), svg(CampTreeline), svg(CampTents), svg(CampFire)],
    palette: CAMP_PALETTE,
    particles: CAMP_PARTICLES,
  },
  forest: {
    layers: [svg(ForestSky), svg(ForestFar), svg(ForestMist), svg(ForestNear)],
    palette: FOREST_PALETTE,
    particles: FOREST_PARTICLES,
  },

  // Not drawn yet (GĐ2b): base colours from ux-plan Phụ lục C.
  lake: placeholder('#132a33', '#d6dee3'),
  'blood-moon': placeholder('#1a0d10', '#8f2a2a'),
  'end-good': placeholder('#5d6a8c', '#ffd98a'),
  'end-evil': placeholder('#140a0a', '#e0663a'),
  mountain: placeholder('#1f2833', '#e8eef4'),
  sea: placeholder('#2b2140', '#e0913a'),
  ruins: placeholder('#1c1a26', '#e6e0ff'),
  chapel: placeholder('#2a2210', '#e3b341'),
  marsh: placeholder('#1a2420', '#9fe3c8'),
  cave: placeholder('#120d0b', '#e3b341'),
};
