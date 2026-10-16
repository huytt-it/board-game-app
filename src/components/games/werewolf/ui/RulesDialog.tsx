'use client';

import { ROLE_BLURB, ROLE_NAME, ROLE_ORDER } from '@/components/games/werewolf/engine/roles.ts';
import type { WwRules } from '../types';
import Button from './Button';
import { Modal } from './Dialog';

// Màn "Luật chơi" (rules §1–§3, §5, §9 tóm tắt cho người chơi). Ai cũng mở
// được từ menu ⋯, kể cả ở sảnh. Tên vai và câu mô tả lấy từ engine.

const ON = (v: boolean) => (v ? 'Bật' : 'Tắt');

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h3 className="text-sm font-bold text-indigo-200">{title}</h3>
      {children}
    </section>
  );
}

export default function RulesDialog({ rules, onClose }: { rules: WwRules | null; onClose: () => void }) {
  return (
    <Modal title="Luật chơi" onClose={onClose} initialFocus="panel">
      <div className="space-y-4 text-sm leading-relaxed text-slate-200" data-ww-rules="">
        <p>
          Trong làng có Ma Sói ẩn mình. Ban đêm Sói cắn một người, các vai đặc biệt dùng năng lực. Ban ngày cả làng nói chuyện{' '}
          <b>ngoài đời</b> rồi bỏ phiếu trên điện thoại để treo một người. App làm quản trò: tự gọi từng bước và đếm giờ.
        </p>

        <Section title="Thắng thua">
          <ul className="list-disc space-y-1 pl-5">
            <li>Dân làng thắng khi không còn Sói nào sống.</li>
            <li>Ma Sói thắng khi số Sói còn sống bằng hoặc hơn số người còn lại.</li>
          </ul>
        </Section>

        <Section title="Các vai">
          <ul className="space-y-1.5">
            {ROLE_ORDER.map((role) => (
              <li key={role}>
                <b className={role === 'werewolf' ? 'text-rose-200' : 'text-emerald-200'}>{ROLE_NAME[role]}</b>: {ROLE_BLURB[role]}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Một vòng chơi">
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              <b>Đêm ①</b>: ai cũng chọn một người rồi bấm Xác nhận, nên màn của mọi người giống nhau. Phần riêng của vai phải giữ thẻ
              mới thấy. Bầy Sói phải thống nhất; hết giờ thì theo đa số.
            </li>
            <li>
              <b>Đêm ②</b> (ván có Phù thủy): Phù thủy cứu hoặc độc, người khác đoán Sói nhắm ai.
            </li>
            <li>
              <b>Bình minh</b>: công bố ai chết, không nói vì sao. Thợ săn chết thì được bắn ngay một người.
            </li>
            <li>
              <b>Thảo luận</b> ngoài đời, rồi <b>bỏ phiếu</b>. Hoà phiếu, hoặc số người Bỏ qua không ít hơn phiếu cao nhất, thì không
              ai bị treo.
            </li>
          </ol>
          <p className="text-slate-300">Hết giờ mà chưa làm gì thì coi như không hành động. Người chết không chọn, không bầu.</p>
        </Section>

        <Section title="Phép lịch sự">
          <ul className="list-disc space-y-1 pl-5">
            <li>Cầm máy sát người, không nhìn màn hình người khác, không chụp màn hình.</li>
            <li>Không đọc to vai hay kết quả soi. Nói dối về vai là được.</li>
            <li>Người chết giữ im lặng đến hết ván.</li>
          </ul>
        </Section>

        {rules && (
          <Section title="Cài đặt của phòng">
            <ul className="space-y-0.5 text-slate-300">
              <li>Lộ vai khi chết: {ON(rules.revealOnDeath)}</li>
              <li>Hồn ma xem hết vai: {ON(rules.ghostsSeeAll)}</li>
              <li>Sói hoà phiếu: {rules.wolfTie === 'none' ? 'Không cắn' : 'Ngẫu nhiên'}</li>
              <li>Thợ săn bị độc vẫn được bắn: {ON(rules.hunterShootsWhenPoisoned)}</li>
            </ul>
          </Section>
        )}
      </div>
      <Button block className="mt-4" onClick={onClose}>
        Đóng
      </Button>
    </Modal>
  );
}
