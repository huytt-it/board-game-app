'use client';

import { useState } from 'react';
import { EXTRA_ROLES, ROLE_BLURB, ROLE_NAME, ROLE_ORDER } from '@/components/games/werewolf/engine/roles.ts';
import type { WwRole, WwRules } from '../types';
import { roleText } from '../panel/shared';
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

function RoleList({ roles }: { roles: readonly WwRole[] }) {
  return (
    <ul className="space-y-1.5">
      {roles.map((role) => (
        <li key={role} className="flex gap-2" data-ww-rules-role={role}>
          <WwIcon name={role} size={18} className={`mt-0.5 shrink-0 ${roleText(role)}`} />
          <span>
            <b className={roleText(role)}>{ROLE_NAME[role]}</b>: {ROLE_BLURB[role]}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Vai mở rộng (rules §11): các vai đang bật trong phòng / ván trước, rồi nút xem
 * cả 6. `counts`: bộ vai của phòng (sảnh) hoặc của ván (công khai).
 */
function ExtraRoles({ counts }: { counts: Partial<Record<WwRole, number>> | null }) {
  const on = EXTRA_ROLES.filter((r) => (counts?.[r] ?? 0) > 0);
  const [all, setAll] = useState(false);
  const rest = EXTRA_ROLES.filter((r) => !on.includes(r));
  return (
    <Section title="Vai mở rộng" icon="cupid">
      {on.length > 0 ? <RoleList roles={on} /> : <p>{counts ? 'Phòng này không bật vai mở rộng nào.' : 'Chủ phòng bật từng vai ở sảnh, mỗi vai tối đa 1 người.'}</p>}
      {all ? (
        rest.length > 0 && <RoleList roles={rest} />
      ) : (
        rest.length > 0 && (
          <Button variant="ghost" block align="start" onClick={() => setAll(true)}>
            {on.length > 0 ? `Xem ${rest.length} vai mở rộng còn lại` : 'Xem cả 6 vai mở rộng'}
          </Button>
        )
      )}
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <b className="text-(--ww-text)">Sói</b> là Ma Sói và Sói con; Tay sai thuộc phe Sói nhưng không cắn, không được tính là Sói khi đếm.
        </li>
        <li>
          <b className="text-(--ww-text)">Cặp đôi</b> của Cupid: một người chết thì người kia chết theo ngay. Hai người khác phe thành phe{' '}
          <b className="text-(--ww-lovers-light)">Tình nhân</b>, thắng khi chỉ còn hai người họ. Sáng ngày 1, ai cũng nên giữ “Vai của tôi” (menu ⋯)
          để xem mình có được ghép đôi không.
        </li>
        <li>
          <b className="text-(--ww-tanner-light)">Kẻ chán đời</b> bị treo thì thắng một mình, ván kết thúc ngay.
        </li>
        <li>Sói con chết thì đêm sau bầy được cắn 2 người; Phù thủy chỉ cứu được một.</li>
      </ul>
    </Section>
  );
}

export default function RulesDialog({
  rules,
  counts = null,
  onClose,
}: {
  rules: WwRules | null;
  /** Bộ vai của phòng / ván (công khai), để mục "Vai mở rộng" nêu các vai đang bật trước. */
  counts?: Partial<Record<WwRole, number>> | null;
  onClose: () => void;
}) {
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
                <WwIcon name={role} size={18} className={`mt-0.5 ${roleText(role)}`} />
                <span>
                  <b className={roleText(role)}>{ROLE_NAME[role]}</b>: {ROLE_BLURB[role]}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <ExtraRoles counts={counts} />

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
