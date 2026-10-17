'use client';

import type { ReactNode } from 'react';
import type { Player } from '@/types/player';
import { ROLE_ORDER } from '@/components/games/werewolf/engine/roles.ts';
import WwIcon from './assets/WwIcon';
import { ICONS, SCENES, type IconName } from './assets/registry';
import { SCENE_IDS, SCENE_NAMES_VI, type SceneId } from './scenes/types';
import Button from './ui/Button';
import Chip from './ui/Chip';
import Panel from './ui/Panel';
import { DoneMark, MyRoleBody } from './panel/DealPanel';
import { HoldCard, MeMark, PhaseHeader, PlayerTile, RoleLine, RoleTag, Seat, avatarColor } from './panel/shared';
import type { WwRole } from './types';

// Bảng phong cách của GĐ3a (WerewolfPreview → "Bảng phong cách"): token, thang
// chữ, mọi biến thể của bộ UI nhỏ, ô người chơi, thẻ giữ, icon và cảnh trên một
// trang — chuẩn cho mọi màn của Ma Sói.

const TOKENS: { name: string; note: string }[] = [
  { name: '--ww-ink', note: 'mực đêm: nền đặc, chữ trên nút' },
  { name: '--ww-glass-bg', note: 'khung (kính tối)' },
  { name: '--ww-raised', note: 'mặt nổi: ô, thẻ giữ' },
  { name: '--ww-raised-hi', note: 'mặt nổi đang chọn' },
  { name: '--ww-line', note: 'viền mảnh duy nhất' },
  { name: '--ww-text', note: 'chữ chính (ánh trăng)' },
  { name: '--ww-text-2', note: 'chữ phụ' },
  { name: '--ww-text-3', note: 'chú thích (≥ 4,5 : 1)' },
  { name: '--ww-accent', note: 'màu nhấn duy nhất (đèn lồng)' },
  { name: '--ww-moon', note: 'trăng: icon trang trí' },
  { name: '--ww-wolf', note: 'phe Sói — công khai; nguy hiểm' },
  { name: '--ww-village', note: 'phe Dân — công khai' },
];

const NAMES = ['Lan', 'Minh', 'Hùng', 'Mai', 'Tú', 'Hoa', 'Khoa', 'Quân', 'Vy', 'Đức'];
const player = (i: number, role: WwRole = 'villager'): Player => ({
  id: `p${i + 1}`,
  name: NAMES[i],
  isAlive: true,
  isHost: i === 0,
  joinedAt: new Date(0),
  gameData: { role },
});

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-base font-semibold text-(--ww-text)">{title}</h3>
      {children}
    </section>
  );
}

function SceneThumb({ id }: { id: SceneId }) {
  const def = SCENES[id];
  return (
    <figure className="space-y-1.5">
      <div className="relative aspect-video overflow-hidden rounded-xl border border-(--ww-line)" style={{ backgroundColor: def.palette.base }}>
        {def.layers.map((l, i) => {
          if (l.kind !== 'svg') return null;
          const Svg = l.Component;
          return <Svg key={i} className="absolute inset-0 h-full w-full" />;
        })}
      </div>
      <figcaption className="text-xs text-(--ww-text-2)">{SCENE_NAMES_VI[id]}</figcaption>
    </figure>
  );
}

const noop = {};

export default function StyleBoard() {
  const ps = NAMES.map((_, i) => player(i));
  return (
    // Lớp tối phủ cảnh: bảng phong cách là trang tham chiếu, không phải một màn của ván.
    <div className="space-y-8 rounded-2xl bg-(--ww-ink)/90 p-4 pb-16" data-ww-style-board="">
      <Panel className="space-y-1 p-4">
        <h2 className="ww-display text-3xl text-(--ww-text)">Bảng phong cách</h2>
        <p className="text-sm text-(--ww-text-2)">
          Đêm xanh tím, chữ ánh trăng, một màu nhấn (đèn lồng). Màu phe chỉ cho thông tin công khai. Mỗi màn: một tiêu đề, một câu, một việc.
        </p>
      </Panel>

      <Section title="Màu">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {TOKENS.map((t) => (
            <div key={t.name} className="space-y-1.5">
              <div className="h-12 rounded-xl border border-(--ww-line)" style={{ background: `var(${t.name})` }} />
              <p className="text-xs font-semibold text-(--ww-text)">{t.name}</p>
              <p className="text-xs text-(--ww-text-3)">{t.note}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 pt-1" aria-label="Màu avatar">
          {NAMES.map((n, i) => (
            <span
              key={n}
              className="flex size-9 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: avatarColor(`p${i + 1}`) }}
            >
              {n[0]}
            </span>
          ))}
        </div>
        <p className="text-xs text-(--ww-text-3)">Avatar: bảng &quot;giấy nhuộm&quot; trầm, cùng độ sáng; không đỏ / xanh lá thuần; chữ trắng ≥ 5,7 : 1.</p>
      </Section>

      <Section title="Chữ">
        <Panel className="space-y-2 p-4">
          <p className="ww-display text-3xl text-(--ww-text)">Đêm 1 · Sáng ngày 1 · Phòng chờ</p>
          <p className="text-base font-semibold text-(--ww-text)">Tiêu đề khung 16 — Bộ vai, Luật, Thời gian</p>
          <p className="text-sm text-(--ww-text-2)">Thân 14 — một câu trạng thái hoặc hướng dẫn: Ai cũng chọn một người rồi bấm Xác nhận.</p>
          <p className="text-xs text-(--ww-text-3)">Chú thích 12 — không có chữ nhỏ hơn.</p>
        </Panel>
      </Section>

      <Section title="Tiêu đề bước + đồng hồ">
        <Panel className="grid gap-4 p-4 sm:grid-cols-2">
          <PhaseHeader title="Đêm 1" remaining={44_000}>
            Ai cũng chọn một người rồi bấm Xác nhận.
          </PhaseHeader>
          <PhaseHeader title="Xem vai" remaining={8_000}>
            Còn ≤ 10 giây: đồng hồ chuyển màu cảnh báo.
          </PhaseHeader>
        </Panel>
      </Section>

      <Section title="Nút">
        <Panel className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" icon="check">
              Xác nhận
            </Button>
            <Button variant="secondary" icon="rules">
              Luật chơi
            </Button>
            <Button variant="danger" icon="delete">
              Xoá phòng
            </Button>
            <Button variant="ghost">Huỷ</Button>
            <Button variant="ghost" icon="more" aria-label="Menu" />
            <Button variant="ghost" icon="close" aria-label="Mời ra" />
          </div>
          <div className="grid max-w-md gap-3">
            <Button variant="primary" size="lg" block>
              Cỡ lg (thanh nút đáy)
            </Button>
            <Button variant="primary" size="lg" block disabled>
              Đang khoá
            </Button>
          </div>
        </Panel>
      </Section>

      <Section title="Nhãn">
        <Panel className="flex flex-wrap items-center gap-2 p-4">
          <Chip icon="waiting">Trung tính</Chip>
          <Chip tone="accent" icon="night">
            Nhấn
          </Chip>
          <RoleTag role="werewolf" />
          <RoleTag role="seer" />
          <MeMark />
          <DoneMark />
          <span className="flex items-center gap-1.5 text-sm font-semibold text-(--ww-accent)">
            <WwIcon name="waiting" size={16} />
            Chưa xác nhận
          </span>
          <span className="flex items-center gap-1.5 text-sm font-semibold text-(--ww-text-2)">
            <WwIcon name="check" size={16} />
            Đã xác nhận
          </span>
        </Panel>
      </Section>

      <Section title="Khung">
        <div className="grid gap-3 sm:grid-cols-4">
          {(['neutral', 'accent', 'wolf', 'village'] as const).map((tone) => (
            <Panel key={tone} tone={tone} className="p-4">
              <p className="text-base font-semibold text-(--ww-text)">{tone}</p>
              <p className="mt-1 text-xs text-(--ww-text-3)">
                {tone === 'neutral' ? 'mặc định' : tone === 'accent' ? 'đang chờ bạn' : 'kết quả công khai (màn kết thúc)'}
              </p>
            </Panel>
          ))}
        </div>
      </Section>

      <Section title="Ô người chơi (lưới chọn) và ghế (chỉ xem)">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <PlayerTile player={ps[0]} label="thường" />
          <PlayerTile player={ps[1]} label="đang chọn" selected />
          <PlayerTile player={ps[2]} label="bạn" mark={<MeMark />} />
          <PlayerTile player={ps[3]} label="vai đã lộ" role="hunter" />
          <PlayerTile player={ps[4]} label="khoá (người xem đã chết)" disabled />
          <Seat player={ps[5]} />
          <Seat player={ps[6]} mark={<DoneMark />} />
          <Seat player={ps[7]} sub={<span className="block text-xs font-normal text-(--ww-text-3)">bạn · chủ phòng</span>} />
          <Seat player={ps[8]} dead sub={<RoleLine role="werewolf" />} />
          <Seat player={ps[9]} dead />
        </div>
        <p className="text-xs text-(--ww-text-3)">
          Không viền, mặt nổi đặc; chỉ ô đang chọn có vòng đèn lồng. Người chết: bia mộ, tên gạch, vai đã lộ bằng chữ nhỏ màu phe.
        </p>
      </Section>

      <Section title="Thẻ giữ để xem">
        <div className="grid gap-3 sm:grid-cols-2">
          <HoldCard held={false} bind={noop} className="h-48">
            {() => null}
          </HoldCard>
          <HoldCard held bind={noop} className="h-48">
            {() => <MyRoleBody ctx={{ me: ps[0], myData: { role: 'seer' }, players: ps, table: { seatOrder: ps.map((p) => p.id), roles: {}, deaths: [] } }} />}
          </HoldCard>
        </div>
        <p className="text-xs text-(--ww-text-3)">Đóng: giống hệt nhau với mọi vai. Mở (đang giữ): huy hiệu vai trung tính, phe chỉ bằng chữ nhỏ.</p>
      </Section>

      <Section title="Icon (registry)">
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-10">
          {(Object.keys(ICONS) as IconName[]).map((name) => (
            <div key={name} className="flex flex-col items-center gap-1 rounded-xl bg-(--ww-raised) px-1 py-2 text-center">
              <WwIcon name={name} size={28} className={ROLE_ORDER.includes(name as WwRole) ? 'text-(--ww-moon)' : 'text-(--ww-text-2)'} />
              <span className="w-full truncate text-xs text-(--ww-text-3)">{name}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-(--ww-text-3)">game-icons.net (Lorc, Delapouite, Carl Olsen, Sbed), CC BY 3.0 — xem assets/CREDITS.md.</p>
      </Section>

      <Section title="Cảnh (theo phase, giống nhau với mọi vai)">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SCENE_IDS.map((id) => (
            <SceneThumb key={id} id={id} />
          ))}
        </div>
      </Section>
    </div>
  );
}
