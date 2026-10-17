// Asset registry của Ma Sói: mọi icon và mọi lớp cảnh được gọi theo TÊN ở đây.
// Muốn thay một cái bằng ảnh vẽ (AI vẽ…), thả file vào `public/werewolf/...`
// rồi sửa đúng MỘT dòng bên dưới — xem assets/README.md.
import type { ComponentType, SVGProps } from 'react';
import type { ParticleGroup, SceneId, ScenePalette } from '../scenes/types';
import { NightFront, NightHills, NightSky, NightVillage, VILLAGE_NIGHT_PALETTE, VILLAGE_NIGHT_PARTICLES } from '../scenes/layers/village-night';
import { DawnFront, DawnHills, DawnSky, DawnVillage, DAWN_PALETTE, DAWN_PARTICLES } from '../scenes/layers/dawn';
// Icon riêng của Ma Sói (game-icons.net, xem CREDITS.md).
import WolfHead from './icons/wolf-head';
import Farmer from './icons/farmer';
import CheckedShield from './icons/checked-shield';
import Cauldron from './icons/cauldron';
import Crossbow from './icons/crossbow';
import Village from './icons/village';
import WolfHowl from './icons/wolf-howl';
import Sunrise from './icons/sunrise';
import Sun from './icons/sun';
import Gibbet from './icons/gibbet';
import Tombstone from './icons/tombstone';
import Ghost from './icons/ghost';
import HealthPotion from './icons/health-potion';
import PoisonBottle from './icons/poison-bottle';
// Icon dùng chung với Avalon.
import CrystalBall from '@/components/games/shared/icons/crystal-ball';
import Moon from '@/components/games/shared/icons/moon';
import Vote from '@/components/games/shared/icons/vote';
import CheckMark from '@/components/games/shared/icons/check-mark';
import Hourglass from '@/components/games/shared/icons/hourglass';
import SemiClosedEye from '@/components/games/shared/icons/semi-closed-eye';
import SkeletonKey from '@/components/games/shared/icons/skeleton-key';
import More from '@/components/games/shared/icons/more';
import Cancel from '@/components/games/shared/icons/cancel';
import ExitDoor from '@/components/games/shared/icons/exit-door';
import TrashCan from '@/components/games/shared/icons/trash-can';
import OpenBook from '@/components/games/shared/icons/open-book';
import AerialSignal from '@/components/games/shared/icons/aerial-signal';
import HazardSign from '@/components/games/shared/icons/hazard-sign';
import Stopwatch from '@/components/games/shared/icons/stopwatch';

export type AssetSource =
  | { kind: 'svg'; Component: ComponentType<SVGProps<SVGSVGElement>> }
  | { kind: 'image'; src: string; alt?: string }; // vd. '/werewolf/icons/werewolf.webp'

const svg = (Component: ComponentType<SVGProps<SVGSVGElement>>): AssetSource => ({ kind: 'svg', Component });

// Mỗi tên mang đúng MỘT nghĩa trong cả game.
export const ICONS = {
  // Vai (vai Ma Sói cũng là biểu tượng của phe Sói)
  werewolf: svg(WolfHead),
  villager: svg(Farmer),
  seer: svg(CrystalBall),
  guard: svg(CheckedShield),
  witch: svg(Cauldron),
  hunter: svg(Crossbow),
  'team-village': svg(Village),

  // Trò chơi, các bước
  game: svg(WolfHowl),
  night: svg(Moon),
  dawn: svg(Sunrise),
  day: svg(Sun),
  vote: svg(Vote),
  hanged: svg(Gibbet),

  // Trạng thái
  dead: svg(Tombstone),
  ghost: svg(Ghost),
  heal: svg(HealthPotion),
  poison: svg(PoisonBottle),
  check: svg(CheckMark),
  waiting: svg(Hourglass),
  hold: svg(SemiClosedEye),
  host: svg(SkeletonKey),

  // Giao diện
  more: svg(More),
  close: svg(Cancel),
  leave: svg(ExitDoor),
  delete: svg(TrashCan),
  rules: svg(OpenBook),
  offline: svg(AerialSignal),
  warning: svg(HazardSign),
  clock: svg(Stopwatch),
} satisfies Record<string, AssetSource>;

export type IconName = keyof typeof ICONS;

// ─── Cảnh ───────────────────────────────────────────────────────────
// Mỗi cảnh là một chồng lớp phủ kín khung (ảnh 1600×900 phủ màn hình, neo
// đáy-giữa; xem scenes/SceneBackdrop.tsx). Lớp nào cũng đổi được sang ảnh:
//   layers: [image('/werewolf/scenes/dawn-sky.webp'), svg(DawnHills), …]
// Cảnh `placeholder` chưa vẽ (GĐ3b): chỉ tô màu nền.

export interface SceneDef {
  /** Xa → gần. */
  layers: AssetSource[];
  palette: ScenePalette;
  particles?: readonly ParticleGroup[];
  placeholder?: boolean;
}

export const SCENES: Record<SceneId, SceneDef> = {
  'village-night': {
    layers: [svg(NightSky), svg(NightHills), svg(NightVillage), svg(NightFront)],
    palette: VILLAGE_NIGHT_PALETTE,
    particles: VILLAGE_NIGHT_PARTICLES,
  },
  dawn: {
    layers: [svg(DawnSky), svg(DawnHills), svg(DawnVillage), svg(DawnFront)],
    palette: DAWN_PALETTE,
    particles: DAWN_PARTICLES,
  },
  // GĐ3b vẽ nốt; tạm thời chỉ là nền màu chủ đạo của cảnh.
  day: { layers: [], palette: { base: '#1f2440', accent: '#f1d08a' }, placeholder: true },
  gallows: { layers: [], palette: { base: '#1d1a30', accent: '#c9a26a' }, placeholder: true },
  'end-village': { layers: [], palette: { base: '#1d2a33', accent: '#f1d08a' }, placeholder: true },
  'end-wolves': { layers: [], palette: { base: '#1c1426', accent: '#d9534f' }, placeholder: true },
};
