'use client';

import { ROLE_BLURB, ROLE_NAME, ROLE_ORDER } from '@/components/games/werewolf/engine/roles.ts';
import type { WwRules } from '../types';
import WwIcon, { type IconName } from '../assets/WwIcon';
import Button from './Button';
import { Modal } from './Dialog';

// Màn "Luật chơi" (rules §1–§3, §5, §9 tóm tắt cho người chơi). Ai cũng mở
// được từ menu ⋯, kể cả ở sảnh. Tên vai và câu mô tả lấy từ engine.

const ON = (v: boolean) => (v ? 'Bật' : 'Tắt');

function Section({ title, icon, children }: { title: string; icon: IconName; children: React.ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h3 className="flex items-center gap-1.5 text-base font-semibold text-(--ww-text)">
        <WwIcon name={icon} size={18} className="text-(--ww-text-3)" />
        {title}
      </h3>
      {children}
    </section>
  );
}

export default function RulesDialog({ rules, onClose }: { rules: WwRules | null; onClose: () => void }) {
  return (
    <Modal title="Luật chơi" onClose={onClose} initialFocus="panel">
      <div className="space-y-4 text-sm leading-relaxed text-(--ww-text-2)" data-ww-rules="">
        <p>
          Trong làng có Ma Sói ẩn mình. Ban đêm Sói cắn một người, các vai đặc biệt dùng năng lực. Ban ngày cả làng nói chuyện{' '}
          <b className="text-(--ww-text)">ngoài đời</b> rồi bỏ phiếu trên điện thoại để treo một người. App làm quản trò: tự gọi từng bước và đếm giờ.
        </p>

        <Section title="Thắng thua" icon="team-village">
          <ul className="list-disc space-y-1 pl-5">
            <li>Dân làng thắng khi không còn Sói nào sống.</li>
            <li>Ma Sói thắng khi số Sói còn sống bằng hoặc hơn số người còn lại.</li>
          </ul>
        </Section>

        <Section title="Các vai" icon="werewolf">
          <ul className="space-y-1.5">
            {ROLE_ORDER.map((role) => (
              <li key={role} className="flex gap-2">
                <WwIcon name={role} size={18} className={`mt-0.5 ${role === 'werewolf' ? 'text-(--ww-wolf-light)' : 'text-(--ww-village-light)'}`} />
                <span>
                  <b className={role === 'werewolf' ? 'text-(--ww-wolf-light)' : 'text-(--ww-village-light)'}>{ROLE_NAME[role]}</b>: {ROLE_BLURB[role]}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Một vòng chơi" icon="night">
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              <b className="text-(--ww-text)">Đêm ①</b>: ai cũng chọn một người rồi bấm Xác nhận, nên màn của mọi người giống nhau. Phần riêng của vai phải giữ thẻ
              mới thấy. Bầy Sói phải thống nhất; hết giờ thì theo đa số.
            </li>
            <li>
              <b className="text-(--ww-text)">Đêm ②</b> (ván có Phù thủy): Phù thủy cứu hoặc độc, người khác đoán Sói nhắm ai.
            </li>
            <li>
              <b className="text-(--ww-text)">Bình minh</b>: công bố ai chết, không nói vì sao. Thợ săn chết thì được bắn ngay một người.
            </li>
            <li>
              <b className="text-(--ww-text)">Thảo luận</b> ngoài đời, rồi <b className="text-(--ww-text)">bỏ phiếu</b>. Hoà phiếu, hoặc số người Bỏ qua không ít hơn phiếu cao nhất, thì không
              ai bị treo.
            </li>
          </ol>
          <p>Hết giờ mà chưa làm gì thì coi như không hành động. Người chết không chọn, không bầu.</p>
        </Section>

        <Section title="Phép lịch sự" icon="hold">
          <ul className="list-disc space-y-1 pl-5">
            <li>Cầm máy sát người, không nhìn màn hình người khác, không chụp màn hình.</li>
            <li>Không đọc to vai hay kết quả soi. Nói dối về vai là được.</li>
            <li>Người chết giữ im lặng đến hết ván.</li>
          </ul>
        </Section>

        {rules && (
          <Section title="Cài đặt của phòng" icon="host">
            <ul className="space-y-0.5">
              <li>Lộ vai khi chết: {ON(rules.revealOnDeath)}</li>
              <li>Hồn ma xem hết vai: {ON(rules.ghostsSeeAll)}</li>
              <li>Sói hoà phiếu: {rules.wolfTie === 'none' ? 'Không cắn' : 'Ngẫu nhiên'}</li>
              <li>Thợ săn bị độc vẫn được bắn: {ON(rules.hunterShootsWhenPoisoned)}</li>
            </ul>
          </Section>
        )}

        <p className="text-xs text-(--ww-text-3)">Icon: Lorc, Delapouite, Carl Olsen, Sbed — game-icons.net, CC BY 3.0.</p>
      </div>
      <Button block className="mt-4" onClick={onClose}>
        Đóng
      </Button>
    </Modal>
  );
}
