// Cảnh nền của Ma Sói: một bức cắt giấy phía sau cả màn hình. Cảnh chỉ phụ
// thuộc phase (thông tin công khai), nên mọi máy, mọi vai thấy cùng một cảnh
// (plan §2.3, §8 "Bổ sung cho GĐ3" mục 1). Chỉ là dữ liệu hiển thị.

export const SCENE_IDS = [
  'village-night', // sảnh, xem vai, Đêm ①, Đêm ②
  'dawn', // bình minh
  'day', // thảo luận, bỏ phiếu, Thợ săn sau bình minh
  'gallows', // kết quả phiếu, Thợ săn sau khi treo
  'end-village', // Dân thắng
  'end-wolves', // Sói thắng
  'end-tanner', // Kẻ chán đời thắng (giàn treo, đổi bảng màu)
  'end-lovers', // Tình nhân thắng (làng ngày hội, đổi bảng màu)
] as const;

export type SceneId = (typeof SCENE_IDS)[number];

export const SCENE_NAMES_VI: Record<SceneId, string> = {
  'village-night': 'Làng ban đêm',
  dawn: 'Bình minh',
  day: 'Làng ban ngày',
  gallows: 'Giàn treo',
  'end-village': 'Dân làng thắng',
  'end-wolves': 'Bầy Sói thắng',
  'end-tanner': 'Kẻ chán đời thắng',
  'end-lovers': 'Tình nhân thắng',
};

export interface ScenePalette {
  /** Màu chủ đạo: tô kín màn hình phía sau các lớp (và lúc lớp ảnh đang tải). */
  base: string;
  /** Màu sáng nhất của cảnh (trăng, mặt trời, đèn), để tham khảo. */
  accent: string;
}

/**
 * Chuyển động của cảnh theo đồng hồ chung của bước (GĐ4, scenes/timelines.ts),
 * chạy một lần lúc bước bắt đầu (getSceneMotion), khung tĩnh = khung cuối:
 * - lớp `rise`: mặt trời / trăng nhô lên sau đồi;
 * - cảnh `brighten`: trời sáng dần (lớp tối mờ đi).
 */
export type LayerMotion = 'rise';
export type SceneIntro = 'brighten';

/**
 * Đổi bảng màu của một cảnh có sẵn (GĐ5b: hai cảnh kết thúc của phe mới dùng lại
 * lớp vẽ của cảnh khác): một lớp màu phẳng phủ lên các lớp cảnh với
 * `mix-blend-mode` (`color` giữ độ sáng, thay sắc). Nằm dưới hạt hiệu ứng.
 */
export interface SceneTint {
  color: string;
  blend: 'color' | 'soft-light';
  opacity: number;
}

/** Hạt hiệu ứng vẽ bằng HTML trên các lớp; toạ độ theo khung cảnh 1600×900. Ẩn khi giảm chuyển động. */
export type ParticleKind =
  | 'twinkle' // đứng yên, nhấp nháy (sao)
  | 'firefly' // bay lượn, nhấp nháy (đom đóm)
  | 'mote' // bụi trôi chậm trong nắng
  | 'flicker'; // quầng sáng run rẩy (cửa sổ, đèn)

export interface ParticleGroup {
  kind: ParticleKind;
  count: number;
  color: string;
  /** Vùng rải hạt: [x0, y0, x1, y1] theo đơn vị cảnh. */
  area: readonly [number, number, number, number];
  /** Đường kính (px); mặc định theo loại. */
  size?: number;
}
