// Scene ids. A scene is the paper-cut backdrop behind the whole Avalon screen;
// every device shows the same one (see getScene.ts). Display-only data.

// Scenes tied to a fixed moment of the game.
export const FIXED_SCENE_IDS = [
  'hall', // lobby, lineup, role reveal
  'night', // night reveals
  'camp', // discussion between quests
  'lake', // Lady of the Lake
  'blood-moon', // assassination
  'end-good',
  'end-evil',
] as const;

// The pool of quest locations. Each game shuffles it and takes 5 (journey.ts),
// so the order changes from game to game but is the same on every device.
export const LOCATION_IDS = ['forest', 'mountain', 'sea', 'ruins', 'chapel', 'marsh', 'cave'] as const;

export type FixedSceneId = (typeof FIXED_SCENE_IDS)[number];
export type LocationId = (typeof LOCATION_IDS)[number];
export type SceneId = FixedSceneId | LocationId;

export const SCENE_IDS: readonly SceneId[] = [...FIXED_SCENE_IDS, ...LOCATION_IDS];

// Vietnamese display names (Preview, and the scene titles of GĐ2b).
export const SCENE_NAMES_VI: Record<SceneId, string> = {
  hall: 'Đại sảnh Camelot',
  night: 'Đêm Camelot',
  camp: 'Lửa trại',
  lake: 'Hồ Avalon',
  'blood-moon': 'Trăng máu',
  'end-good': 'Bình minh Camelot',
  'end-evil': 'Camelot chìm lửa',
  forest: 'Rừng Broceliande',
  mountain: 'Đèo núi tuyết',
  sea: 'Biển Tintagel',
  ruins: 'Phế tích',
  chapel: 'Nhà nguyện Chén Thánh',
  marsh: 'Đầm lầy sương',
  cave: 'Hang rồng',
};

export interface ScenePalette {
  /** Dominant colour: fills the screen behind the layers, and is the whole
   *  look of a placeholder scene. */
  base: string;
  /** Brightest colour of the scene (torches, moon, fire…), for reference. */
  accent: string;
}

// Ambient particles (fireflies, embers…), drawn as HTML on top of the layers.
// Positions are in scene units (the 1600×900 viewBox), so they line up with the
// art whatever the screen shape. Decorative only: hidden with reduced motion.
export type ParticleKind =
  | 'firefly' // wanders and blinks
  | 'ember' // rises and fades
  | 'twinkle' // stays put, blinks
  | 'mote' // slow drifting dust
  | 'flicker'; // a soft glow that wavers (torch, fire)

export interface ParticleGroup {
  kind: ParticleKind;
  count: number;
  color: string;
  /** Area the particles are scattered over: [x0, y0, x1, y1] in scene units. */
  area: readonly [number, number, number, number];
  /** Particle diameter in px (default per kind). */
  size?: number;
}

export interface SceneResult {
  id: SceneId;
  /** Quest locations only: the dangerous 4th quest (2 fails needed) gets a storm (drawn in GĐ2b). */
  storm: boolean;
  /** The quest location being played — or, during discussion, the next one. */
  location: LocationId | null;
}
