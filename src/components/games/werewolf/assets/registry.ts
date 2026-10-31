// Asset registry của Ma Sói: mọi icon và mọi lớp cảnh được gọi theo TÊN ở đây.
// Muốn thay một cái bằng ảnh vẽ (AI vẽ…), thả file vào `public/werewolf/...`
// rồi sửa đúng MỘT dòng bên dưới — xem assets/README.md.
import type { ComponentType, SVGProps } from 'react';
import type { LayerMotion, ParticleGroup, SceneId, SceneIntro, ScenePalette, SceneTint } from '../scenes/types';
import { NightFront, NightHills, NightMoon, NightSky, NightVillage, VILLAGE_NIGHT_PALETTE, VILLAGE_NIGHT_PARTICLES } from '../scenes/layers/village-night';
import { DawnClouds, DawnFront, DawnHills, DawnSky, DawnSun, DawnVillage, DAWN_PALETTE, DAWN_PARTICLES } from '../scenes/layers/dawn';
import { DayFront, DayHills, DaySky, DayVillage, DAY_PALETTE, DAY_PARTICLES } from '../scenes/layers/day';
import { GallowsCrowd, GallowsSky, GallowsStage, GallowsVillage, GALLOWS_PALETTE, GALLOWS_PARTICLES } from '../scenes/layers/gallows';
import { EndVillageFront, EndVillageSky, EndVillageTown, END_VILLAGE_PALETTE, END_VILLAGE_PARTICLES } from '../scenes/layers/end-village';
import { EndWolvesFront, EndWolvesHill, EndWolvesSky, EndWolvesVillage, END_WOLVES_PALETTE, END_WOLVES_PARTICLES } from '../scenes/layers/end-wolves';
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
// Vai mở rộng + màn kết thúc của phe mới (GĐ5b, người dùng cho tải 2026-10-31).
import Beard from './icons/beard';
import WerewolfFigure from './icons/werewolf';
import Cowled from './icons/cowled';
import Shrug from './icons/shrug';
import CupidonArrow from './icons/cupidon-arrow';
import PawPrint from './icons/paw-print';
import NestedHearts from './icons/nested-hearts';
import BrokenHeart from './icons/broken-heart';
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
  // Vai mở rộng (rules §11)
  elder: svg(Beard),
  lycan: svg(WerewolfFigure),
  minion: svg(Cowled),
  tanner: svg(Shrug),
  cupid: svg(CupidonArrow),
  wolfcub: svg(PawPrint),
  'team-village': svg(Village),
  // Phe Tình nhân (cặp đôi khác phe, rules §11.5): màn kết thúc, cặp đôi trong thẻ giữ.
  lovers: svg(NestedHearts),

  // Trò chơi, các bước
  game: svg(WolfHowl),
  night: svg(Moon),
  dawn: svg(Sunrise),
  day: svg(Sun),
  vote: svg(Vote),
  hanged: svg(Gibbet),

  // Trạng thái
  dead: svg(Tombstone),
  /** Chết theo người yêu (nhật ký ở màn kết thúc / tờ hồn ma). */
  heartbreak: svg(BrokenHeart),
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
//   layers: [{ kind: 'image', src: '/werewolf/scenes/dawn-sky.webp' }, svg(DawnHills), …]

/** Một lớp cảnh; `motion`: lớp chuyển động lúc bước bắt đầu (GĐ4, xem scenes/types.ts). */
export type SceneLayerDef = AssetSource & { motion?: LayerMotion };

export interface SceneDef {
  /** Xa → gần. */
  layers: SceneLayerDef[];
  /** Hiệu ứng cả cảnh lúc bước bắt đầu (GĐ4). */
  intro?: SceneIntro;
  /** Đổi bảng màu của các lớp (GĐ5b, cảnh kết thúc của phe mới). */
  tint?: SceneTint;
  palette: ScenePalette;
  particles?: readonly ParticleGroup[];
}

export const SCENES: Record<SceneId, SceneDef> = {
  'village-night': {
    layers: [svg(NightSky), { ...svg(NightMoon), motion: 'rise' }, svg(NightHills), svg(NightVillage), svg(NightFront)],
    palette: VILLAGE_NIGHT_PALETTE,
    particles: VILLAGE_NIGHT_PARTICLES,
  },
  dawn: {
    layers: [svg(DawnSky), { ...svg(DawnSun), motion: 'rise' }, svg(DawnClouds), svg(DawnHills), svg(DawnVillage), svg(DawnFront)],
    intro: 'brighten',
    palette: DAWN_PALETTE,
    particles: DAWN_PARTICLES,
  },
  day: {
    layers: [svg(DaySky), svg(DayHills), svg(DayVillage), svg(DayFront)],
    palette: DAY_PALETTE,
    particles: DAY_PARTICLES,
  },
  gallows: {
    layers: [svg(GallowsSky), svg(GallowsVillage), svg(GallowsStage), svg(GallowsCrowd)],
    palette: GALLOWS_PALETTE,
    particles: GALLOWS_PARTICLES,
  },
  'end-village': {
    layers: [svg(EndVillageSky), svg(EndVillageTown), svg(EndVillageFront)],
    palette: END_VILLAGE_PALETTE,
    particles: END_VILLAGE_PARTICLES,
  },
  'end-wolves': {
    layers: [svg(EndWolvesSky), svg(EndWolvesHill), svg(EndWolvesVillage), svg(EndWolvesFront)],
    palette: END_WOLVES_PALETTE,
    particles: END_WOLVES_PARTICLES,
  },
  // Hai phe của vai mở rộng (GĐ5b): dùng lại lớp vẽ của cảnh có sẵn, đổi bảng màu
  // bằng một lớp `tint` (không thêm hình vẽ mới).
  // Kẻ chán đời thắng: giàn treo lúc chạng vạng, nhuộm màu đất sét / tro.
  'end-tanner': {
    layers: [svg(GallowsSky), svg(GallowsVillage), svg(GallowsStage), svg(GallowsCrowd)],
    tint: { color: '#b98a5e', blend: 'color', opacity: 0.55 },
    palette: { base: '#221c19', accent: GALLOWS_PALETTE.accent },
    particles: [{ kind: 'mote', count: 6, color: '#d9c2a6', area: [520, 380, 1080, 640], size: 2 }],
  },
  // Tình nhân thắng: buổi sáng ngày hội của làng (dây cờ), nhuộm hồng.
  'end-lovers': {
    layers: [svg(EndVillageSky), svg(EndVillageTown), svg(EndVillageFront)],
    tint: { color: '#d9789a', blend: 'color', opacity: 0.5 },
    palette: { base: '#2c2134', accent: END_VILLAGE_PALETTE.accent },
    particles: [{ kind: 'mote', count: 10, color: '#f6c9d8', area: [380, 330, 1220, 660], size: 3 }],
  },
};
