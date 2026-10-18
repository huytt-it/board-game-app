# Kế hoạch phát triển Ma Sói (không quản trò)

> **Tài liệu điều phối.** Session "nhạc trưởng" viết và giữ file này. Mỗi giai đoạn (GĐ) do một session thực thi riêng làm, đúng phạm vi ghi bên dưới.
> **Luật chơi chi tiết ở [`rules.md`](rules.md)**. Đó là nguồn sự thật cho engine, test và màn "Luật chơi". Trong file này, "rules §x" là mục x của `rules.md`.
> Số liệu và đường dẫn trích theo commit `d0fbb4db` (`main` sau PR #62).

---

## 0. Cách làm việc

### Vai trò
- **Nhạc trưởng** (session lập kế hoạch, 2026-10-10/11): giữ kế hoạch, review từng GĐ, cập nhật file này và memory, chỉnh brief cho GĐ kế tiếp.
- **Người thực thi** (session mới, có thể là model khác): làm **một** GĐ, đúng phạm vi.

### Quy trình cho người thực thi
1. Đọc hết file này và `rules.md`. Đọc `AGENTS.md`: bản Next.js trong repo có nhiều thay đổi lớn, nên đọc hướng dẫn trong `node_modules/next/dist/docs/` trước khi dùng API của Next.
2. Làm trực tiếp trên branch tích hợp **`dev-werewolf`**:
   - `git switch dev-werewolf`. Nếu git báo branch đang được checkout ở worktree khác thì **dừng lại và báo người dùng**.
   - Kiểm tra working tree sạch.
   - Ghi lại `git rev-parse --short HEAD`: đó là điểm bắt đầu của GĐ.
3. Chỉ làm trong phạm vi của GĐ. **Dừng lại và hỏi người dùng** nếu cần:
   - sửa logic-core của Avalon (§2.1);
   - sửa file dùng chung ngoài danh sách cho phép của GĐ;
   - thêm dependency;
   - đổi luật trong `rules.md`.
4. Chạy kiểm thử ở §11 và nghiệm thu của GĐ.
5. Cập nhật §12 (Nhật ký tiến độ): trạng thái, commit đầu → cuối, các điểm lệch kế hoạch, việc còn dở, số đo.
6. Commit lên `dev-werewolf` với message `feat(werewolf): GĐ<N> — <tóm tắt>`. Nếu chia nhỏ thì mọi commit đều mang `GĐ<N>`. **Không push**, trừ khi người dùng bảo.
7. Báo cáo cho người dùng:
   - đã làm gì;
   - lệch kế hoạch ở đâu;
   - kết quả kiểm thử (kèm ảnh 375px và 1440px nếu có UI);
   - khoảng commit để nhạc trưởng review (`git diff <đầu>..<cuối>`).

**Về review và merge:**
- Nhạc trưởng review theo khoảng commit. GĐ nào hỏng thì dùng `git revert`, không viết lại lịch sử.
- Các GĐ làm **tuần tự**, không song song.
- **Mốc PR:** sau GĐ2 (chơi được đủ vai) và sau GĐ4 (đẹp + hoạt cảnh). Push `dev-werewolf` rồi mở PR `dev-werewolf` → `main`. Người dùng tự merge (squash).
- Sau mỗi lần squash-merge: kiểm tra `git diff origin/main dev-werewolf` rỗng rồi chạy `git merge -s ours origin/main` trên `dev-werewolf`, để PR sau không bị xung đột.

### Prompt mẫu để mở session thực thi
```
Bạn là người thực thi GĐ<N> của kế hoạch src/components/games/werewolf/docs/plan.md.
Đọc toàn bộ plan.md (bắt buộc §0 "Cách làm việc", §2 "Luật kỹ thuật", §4 "Kiến trúc đích" và mục GĐ<N>),
toàn bộ rules.md và AGENTS.md. Làm đúng phạm vi GĐ<N> trên branch dev-werewolf (git switch dev-werewolf).
Không sửa logic-core Avalon, không thêm dependency, không đổi luật nếu chưa hỏi người dùng.
Xong thì chạy kiểm thử (§11 + nghiệm thu của GĐ<N>), cập nhật §12 (Nhật ký tiến độ), commit (không push)
và báo cáo bằng tiếng Việt: đã làm gì, lệch kế hoạch chỗ nào, kết quả kiểm thử, khoảng commit để review.
```

**Gợi ý model:**
- GĐ0 (luật → code + test, cần chính xác): Opus.
- GĐ1, GĐ2 (máy trạng thái, nhiều race): Opus.
- GĐ3 (vẽ, bộ nhận diện): Opus.
- GĐ4 (hoạt cảnh): Opus hoặc Sonnet.

---

## 1. Quyết định đã chốt (người dùng, 2026-10-11)

| Chủ đề | Quyết định |
|---|---|
| Số người | 5–10 ở v1. **Nâng lên 5–12** (người dùng, 2026-10-17), cùng lúc thêm vai mở rộng. |
| Bộ vai v1 | Ma Sói, Dân làng, Tiên tri, Bảo vệ, Phù thủy, Thợ săn. |
| Vai mở rộng (v2) | Già làng, Người hoá sói, Tay sai, Kẻ chán đời, Cupid, Sói con (người dùng chọn 2026-10-17). **Mặc định tắt, chủ phòng bật từng vai.** Bộ mặc định 5–12 người chỉ dùng 6 vai gốc. Luật ở rules §11. |
| Lộ vai khi chết | Mặc định **bật**, chủ phòng tắt được. |
| Hồn ma xem hết vai | **Chủ phòng bật/tắt**, mặc định bật. |
| Hoà phiếu ban ngày | Không ai bị treo. |
| Bầy Sói chọn khác nhau | **Phải có cơ chế thống nhất**: thấy lựa chọn của nhau ngay lập tức, đổi đến khi thống nhất. Hết giờ thì theo đa số. Hoà thì theo cài đặt "Ngẫu nhiên" (mặc định) / "Không cắn" (rules §5.3). |
| Thời gian các bước | **Chủ phòng cài trong phòng** (nút −/+), cố định khi bắt đầu ván, theo mẫu Avalon GĐ8 (rules §8.3). |
| Dân làng ban đêm | Chọn "người mình nghi", không ảnh hưởng luật, chỉ hiện trong tổng kết. |
| Âm thanh | Không có trong v1. |
| Phong cách | Như Avalon (paper-cut, icon game-icons.net qua asset registry), bảng màu riêng cho đêm/trăng. |
| Chống gian lận | Tin client như Avalon: mọi máy đọc được dữ liệu ván. Phù hợp nhóm bạn bè. |
| Ngôn ngữ | Tiếng Việt. |

---

## 2. Luật kỹ thuật bất di bất dịch

### 2.1 Không đụng logic-core của Avalon
`avalon/useAvalon.ts`, `avalon/types.ts`, `avalon/constants.ts` và các timer tự chuyển phase trong `avalon/AvalonBoard.tsx` **không được sửa**.

Ngoại lệ duy nhất: ở GĐ1 được **chuyển** một số hook UI thuần sang thư mục dùng chung (§6). Khi chuyển chỉ được đổi đường import, không đổi hành vi.

### 2.2 Máy trạng thái kiểu Avalon
- **Mọi lần đổi phase** đi qua `advance(patch, { expect, expectPlayerData, playerData, status })`. Hàm này gọi `gameStorage.casGameState` với `{ phase, phaseStartedAt, ...expect }`. Mọi dữ liệu mà quyết định dựa vào (phiếu, lựa chọn đêm, acks) phải nằm trong `expect` / `expectPlayerData`.
- **Thay đổi trong một phase** (ack, phiếu ngày) đi qua `updateInPhase(phase, patch)`.
- **Lựa chọn đồng thời của nhiều người** (lựa chọn đêm, quyết định của Phù thủy) ghi vào `players/<id>.gameData` của chính người đó, giống `questCard` của Avalon, không dồn vào doc phòng. Khi chốt thì dùng `expectPlayerData`.
- **Mọi máy chạy timer** bằng `arm(delay, fn)`: chủ phòng chạy ngay, máy khác chờ thêm `TAKEOVER_MS` (2500 ms). CAS bảo đảm chỉ một lần ghi thắng.
- Đồng hồ là `serverNow()`, không dùng `Date.now()` cho hạn chót.
- Thời lượng của ván được chép từ `room.config.phaseSeconds` vào `state.timeouts` lúc bắt đầu ván. Chỉ có **một** hàm đọc là `phaseTimeoutMs(state, phase?)` (mẫu: `avalon/types.ts` GĐ8).
- Nguồn sự thật về sống/chết là `state.deaths`, ghi trong **cùng transaction** với lần đổi phase. Không dùng `Player.isAlive`.
- Mọi thứ ngẫu nhiên (xáo ghế, hoà phiếu Sói) được tính ở client thực hiện CAS và ghi vào state. Các client khác không tự tính lại.

### 2.3 Riêng tư (bàn ngồi gần nhau)
- **Màn đêm nhìn từ xa phải giống nhau** với mọi vai: cùng bố cục, cùng lưới người chơi, cùng nút, cùng thời lượng. Phần riêng của vai (chữ hướng dẫn, đồng đội Sói và lựa chọn của họ, kết quả soi, người bị nhắm mà Phù thủy thấy) chỉ hiện khi **giữ để xem** (`useHold`).
- **Thời lượng và thứ tự không được phụ thuộc thông tin ẩn:**
  - bước Phù thủy luôn chạy nếu ván có Phù thủy;
  - người chết được công bố theo thứ tự ghế;
  - nguyên nhân chết chỉ hiện ở màn kết thúc.
- Không rung hay âm thanh riêng cho một vai nào. Không có tín hiệu "đến lượt bạn" ban đêm, vì ai cũng có lượt.
- Không lưu danh sách vai theo thứ tự ghế. Dùng `roleCounts` (bài học `roleLineup` của Avalon).
- Tiêu đề tab, `aria-label` và DOM ẩn không được chứa thông tin riêng. Phần riêng chỉ render khi đang giữ.

### 2.4 Engine thuần
- `werewolf/engine/` **không** import React, Firebase hay alias `@/`.
- Chỉ dùng **cú pháp TS xoá được**: không `enum`, không `namespace`, không parameter properties. Dùng union string.
- Import tương đối **có đuôi `.ts`**, để `node --test` (Node 24, type stripping) chạy thẳng mà không cần dependency.
- Hàm ngẫu nhiên được **truyền vào** (`rng: () => number`) để test được.
- Engine không biết đến thời gian thực. Nó nhận dữ liệu, trả về quyết định (người chết, phase kế, người thắng, mục nhật ký).

### 2.5 Hoạt cảnh (GĐ4)
- Là hàm thuần của `state` + `phaseStartedAt` + `serverNow()`: các máy đồng bộ, reload thì tiếp tục đúng chỗ, không phát lại.
- Không chặn bước có giờ.
- Có `prefers-reduced-motion`.
- Không tạo khác biệt nhìn thấy được giữa các vai.

### 2.6 Giữ nhỏ
- ≤ 12 người (Ma Sói; các game khác của app vẫn ≤ 10).
- Không presence system, không bầu lại host, không server trọng tài.
- Không dùng `alert` / `confirm` gốc của trình duyệt.
- Giao diện tiếng Việt, ưu tiên điện thoại (375px, không cuộn ngang, chạm ≥ 44px).

---

## 3. Bản đồ code hiện tại (commit `d0fbb4db`)

| Chỗ | Dùng thế nào |
|---|---|
| `src/lib/gameRegistry.ts` | Mục `werewolf` đang `enabled: false, component: null`, 6–18 người. GĐ1 bật lên, đổi thành 5–10 người, mô tả tiếng Việt, `dynamic(() => import('@/components/games/werewolf/WerewolfBoard'))`. |
| `src/types/room.ts` | `GameType` đã có `'werewolf'`. `RoomStatus` gồm `lobby / day / night / voting / end`. |
| `src/app/room/[gameType]/[roomId]/page.tsx` | Avalon có nhánh riêng (`AvalonJoinScreen`, layout không padding). Ma Sói dùng màn join chung ở GĐ1, thêm nhánh riêng ở GĐ3. |
| `src/services/database/IGameStorage.ts` | `casGameState(roomId, expected, patch, { status, playerData, expectPlayerData })`, `clearGameData`, `resetRoom`. |
| `src/lib/serverClock.ts` | `serverNow()`. |
| `src/hooks/useRoom.ts`, `useWakeLock.ts` | `leaveRoom`, `deleteRoom`, `resetRoom`, `updateConfig`. Giữ màn hình sáng khi đang chơi. |
| `avalon/useAvalon.ts` | **Mẫu** cho `advance`, `updateInPhase`, `readState`, `readConfig`, `timeoutsFor`. Chép mẫu, không import. |
| `avalon/AvalonBoard.tsx` | **Mẫu** cho `arm`, `TAKEOVER_MS`, `everyoneIn`, `remainingMs`, thông báo offline, `act()` (báo lỗi khi gửi thất bại), xoá phòng / rời / chơi lại. |
| `avalon/types.ts` (GĐ8) | **Mẫu** cho `PHASE_SECONDS_LIMITS`, `TIMED_PHASES`, `phaseTimeoutMs`. |
| `avalon/RoomSettings.tsx` | **Mẫu** cho stepper −/+ và các hàng bật/tắt. |
| `avalon/hooks/` | `useHold`, `useDialog`, `useReducedMotion`, `useCue`, `usePhaseTimeline` là hook thuần, không phụ thuộc Avalon, nên được chuyển sang dùng chung (GĐ1). `usePhaseClock` và `useConfirm`/`ConfirmDialog`/`Modal` gắn với kiểu dữ liệu và style của Avalon, nên Ma Sói viết bản riêng. |
| `avalon/AvalonPreview.tsx` | **Mẫu** cho harness xem từng màn bằng state giả, không cần Firebase. Đây là cơ sở cho mọi ảnh chụp và cặp ảnh riêng tư. |

**Bài học từ Avalon, áp dụng từ đầu:**
- Mỗi phase một file panel. `PlayerPanel` của Avalon từng phình tới gần 3.000 dòng.
- Giữ một màu nhấn, ít khung viền, "mỗi màn một câu, một việc" (Avalon GĐ7).
- Kiểm tra quyền riêng tư bằng cặp ảnh (cùng thời điểm, chỉ khác vai). Kiểm tra va chạm ở 320–390px với 5–10 người.

---

## 4. Kiến trúc đích

### 4.1 Thư mục
```
src/components/games/werewolf/
  WerewolfBoard.tsx      khung + timer tự chuyển phase + menu ⋯ (rời / xoá / luật / vai của tôi)
  WerewolfPreview.tsx    harness state giả (GĐ1 dựng, GĐ3–4 dùng để chụp ảnh)
  useWerewolf.ts         advance / updateInPhase + các hành động (gọi engine để quyết định)
  types.ts               WwPhase, WerewolfGameState, WerewolfGameData, WerewolfRoomConfig,
                         PHASE_SECONDS_LIMITS, phaseTimeoutMs
  engine/                hàm thuần (§2.4) + *.test.ts
    roles.ts             định nghĩa vai, tên/mô tả tiếng Việt, điểm cân bằng, preset theo số người,
                         validateSetup, dealRoles(seatIds, counts, rng)
    night.ts             tallyWolves, validTargets, resolveNight
    day.ts               tallyDayVote
    win.ts               checkWinner
    flow.ts              afterNight / afterDawn / afterVote / afterHunter: quyết định phase kế
    log.ts               dựng mục "Diễn biến ván"
    types.ts  table.ts  random.ts  testkit.ts   (thêm ở GĐ0: kiểu dùng chung, ai sống / ai là Sói,
                         shuffle / pickOne, đồ nghề cho test)
  panel/                 mỗi phase một file: Lobby, Deal, Night, Witch, Dawn, Hunter, Talk, Vote, VoteResult, End
  ui/  assets/  scenes/  (GĐ3)
  docs/plan.md  docs/rules.md
src/components/games/shared/hooks/   useHold, useDialog, useReducedMotion, useCue, usePhaseTimeline (chuyển từ Avalon, GĐ1)
```

### 4.2 Phase và `room.status`

| Phase | Ý nghĩa | `room.status` | Kết thúc khi | Sang |
|---|---|---|---|---|
| (sảnh) | chưa có `gameState` | `lobby` | chủ phòng bấm Bắt đầu | `deal` |
| `deal` | xem vai | `night` | mọi người đã xem / hết giờ | `night` |
| `night` | Đêm ① | `night` | mọi người còn sống đã xác nhận **và** bầy Sói thống nhất / hết giờ | `night-witch` (ván có Phù thủy) hoặc `dawn` |
| `night-witch` | Đêm ② | `night` | mọi người còn sống đã xác nhận / hết giờ | `dawn` |
| `dawn` | công bố đêm qua (8 giây) | `day` | hết giờ | `hunter` / `end` / `day-talk` |
| `hunter` | Thợ săn bắn | `day` | đã bắn / bỏ / hết giờ | `end` / `day-talk` (sau bình minh) / `night` (sau khi treo) |
| `day-talk` | thảo luận | `day` | mọi người còn sống sẵn sàng / hết giờ | `day-vote` |
| `day-vote` | bỏ phiếu | `voting` | mọi người còn sống đã bầu / hết giờ | `vote-result` |
| `vote-result` | công bố (8 giây) | `voting` | hết giờ | `hunter` / `end` / `night` |
| `end` | kết thúc | `end` | chủ phòng chơi lại / xoá | sảnh |

- **Kết quả đêm được tính lúc chuyển phase:**
  - `night → night-witch`: chốt `attack` (tallyWolves).
  - `night-witch → dawn`, hoặc `night → dawn` khi ván không có Phù thủy: chạy `resolveNight`, ghi `deaths`, bình thuốc, `guardLast`, nhật ký.
- **Cho rời làng** (rules §7) chạy được ở mọi phase. Thực hiện bằng một CAS riêng: thêm vào `deaths`, rồi nếu `checkWinner` có kết quả thì chuyển sang `end`.

### 4.3 Dữ liệu (phác thảo; người thực thi GĐ0/GĐ1 được chỉnh nhưng phải ghi lại ở §12)
```ts
type WwRole = 'werewolf' | 'villager' | 'seer' | 'guard' | 'witch' | 'hunter';
type WwTeam = 'wolves' | 'village';
type WwPhase = 'deal' | 'night' | 'night-witch' | 'dawn' | 'hunter'
             | 'day-talk' | 'day-vote' | 'vote-result' | 'end';
type DeathCause = 'wolf' | 'poison' | 'vote' | 'hunter' | 'left';

interface WwDeath { id: string; round: number; cause: DeathCause } // cause chỉ hiện ở màn kết thúc

interface WwRules {
  revealOnDeath: boolean;            // mặc định true
  ghostsSeeAll: boolean;             // mặc định true
  wolfTie: 'random' | 'none';        // mặc định 'random'
  hunterShootsWhenPoisoned: boolean; // mặc định false
}

// room.config (chủ phòng chỉnh ở sảnh)
interface WerewolfRoomConfig {
  roleCounts?: Partial<Record<WwRole, number>>;   // thiếu thì dùng preset theo số người
  rules?: Partial<WwRules>;
  phaseSeconds?: Partial<Record<TimedPhase, number>>;
}

// room.gameState
interface WerewolfGameState {
  phase: WwPhase;
  phaseStartedAt: number;
  round: number;                     // đêm 1 / ngày 1 = 1; tăng khi vào `night`
  seatOrder: string[];
  roleCounts: Partial<Record<WwRole, number>>;    // KHÔNG lưu theo ghế
  rules: WwRules;                    // chép từ config lúc bắt đầu, cố định cả ván
  timeouts: Partial<Record<WwPhase, number>>;     // chép từ config lúc bắt đầu, cố định cả ván
  deaths: WwDeath[];                 // nguồn sự thật sống/chết
  acks: Record<string, boolean>;     // đã xem vai / sẵn sàng bỏ phiếu (reset mỗi phase dùng tới)
  attack: string | null;             // người bị Sói nhắm đêm nay (chốt khi hết Đêm ①)
  dawnDeaths: string[];              // người chết đêm qua, theo thứ tự ghế
  dayVotes: Record<string, string>;  // voterId -> targetId | 'skip'
  lastVote: { executedId: string | null } | null;
  hunter: { hunterId: string; after: 'dawn' | 'vote' } | null;
  winner: WwTeam | null;
  endReason: string | null;
  log: WwLogEntry[];                 // "Diễn biến ván" (chỉ hiện đầy đủ ở màn kết thúc)
}

// players/<id>.gameData
interface WerewolfGameData extends BaseGameData {
  role: WwRole;
  team: WwTeam;
  nightPick?: { round: number; targetId: string | null; confirmed: boolean };   // Đêm ①
  witchPick?: { round: number; heal: boolean; poisonId: string | null;           // Đêm ② (Phù thủy)
                guessId: string | null; confirmed: boolean };                    // hoặc đoán (người khác)
  potions?: { heal: boolean; poison: boolean };   // Phù thủy: bình còn lại
  guardLast?: string | null;                       // Bảo vệ: người đã che đêm trước
  seerLog?: Array<{ round: number; targetId: string; isWolf: boolean }>;  // ghi lúc Xác nhận
}
```
Lựa chọn có `round` để lựa chọn của đêm trước không bị tính nhầm sang đêm sau. Nhờ vậy không phải xoá chúng trong transaction đổi phase.

### 4.4 Cài đặt phòng
- **Bộ vai:** preset theo số người. Chỉnh số Sói và từng vai đặc biệt bằng nút −/+. **Dân làng = phần còn lại**, tự tính, không có stepper (GĐ1, nhạc trưởng chấp nhận). Có điểm cân bằng, nhãn "cân" khi |điểm| ≤ 2, cảnh báo khi lệch quá ±6. Bắt đầu ván thì kiểm tra bằng `validateSetup` (rules §4, E28).
- **Luật:** 4 hàng bật/tắt hoặc chọn (rules §8.2).
- **Thời gian:** 6 stepper (rules §8.3). `TimedPhase = 'deal' | 'night' | 'night-witch' | 'hunter' | 'day-talk' | 'day-vote'`.
- Người không phải chủ phòng thấy cài đặt ở dạng chỉ đọc.

---

## 5. GĐ0 — Luật thành code: engine thuần + test (chưa có UI)

### Việc cần làm
- `tsconfig.json`: thêm `"allowImportingTsExtensions": true`. An toàn vì đã có `noEmit: true`. Không đổi gì khác.
- `package.json`: thêm script `"test:werewolf": "node --test \"src/components/games/werewolf/engine/**/*.test.ts\""`. Không thêm dependency. Node ≥ 23.6 tự bỏ type; máy hiện có Node 24.13.
- `engine/roles.ts`, `night.ts`, `day.ts`, `win.ts`, `flow.ts`, `log.ts` theo §4.1 và `rules.md`.
- Test `engine/*.test.ts` (`node:test` + `node:assert/strict`):
  - **mỗi mã E1–E28 trong rules §10 có ít nhất một test, tên test bắt đầu bằng mã đó**;
  - thêm test cho preset 5–10 người (tổng đúng, hợp lệ, điểm như bảng rules §4), `dealRoles` (đúng số lượng mỗi vai, rng cố định cho kết quả cố định), và luồng phase kế ở `flow.ts` cho mọi hàng của bảng §4.2.
- Kiểu dữ liệu dùng chung với UI (`WwRole`, `WwTeam`, `DeathCause`, …) đặt trong `engine/` để engine không phụ thuộc `types.ts`. `types.ts` (GĐ1) sẽ import ngược lại.

### Không làm
React, Firebase, registry, UI, Avalon.

### Nghiệm thu
- `npm run test:werewolf` xanh. Báo cáo ghi số test và danh sách mã E đã phủ.
- `npx tsc --noEmit` sạch.
- `npx eslint src/components/games/werewolf` sạch.
- `npm run build` vẫn chạy được.
- `grep -rE "from '(react|firebase|@/)" src/components/games/werewolf/engine` không ra kết quả.

---

## 6. GĐ1 — Bản chơi được với 4 vai (Sói, Dân, Tiên tri, Bảo vệ)

### Việc cần làm
- **Rút hook dùng chung (commit riêng, làm trước):**
  - `git mv` `useHold`, `useDialog`, `useReducedMotion`, `useCue`, `usePhaseTimeline` từ `avalon/hooks/` sang `src/components/games/shared/hooks/`;
  - sửa đường import trong Avalon, không đổi gì khác;
  - nghiệm thu: `tsc` + `npx eslint src/components/games` (không thêm lỗi so với baseline) + `npm run build` + mở `AvalonPreview` thấy vài màn vẫn đúng.
- `types.ts` theo §4.3. `PHASE_SECONDS_LIMITS` theo rules §8.3. `phaseTimeoutMs`.
- `useWerewolf.ts`: `advance`, `updateInPhase`, `startGame`, `ackDeal`, `pickNight`, `confirmNight`, `resolveNightPhase`, `proceedAfterDawn`, `readyToVote`, `castDayVote`, `resolveDayVote`, `proceedAfterVoteResult`, `restart`. Mọi quyết định gọi engine.
- `WerewolfBoard.tsx`: timer cho mọi phase (§4.2), thông báo offline, `useWakeLock`, menu ⋯ (Rời / Xoá phòng / Vai của tôi).
- `panel/`:
  - Sảnh: ghế, cài đặt (bộ vai + luật + thời gian; Phù thủy và Thợ săn để mờ, ghi "GĐ2"), nút Bắt đầu chỉ cho chủ phòng;
  - Xem vai: giữ để xem, Sói thấy đồng đội;
  - Đêm ①: màn đồng nhất §2.3, Sói thấy lựa chọn của bầy và trạng thái thống nhất khi giữ;
  - Bình minh, Thảo luận, Bỏ phiếu, Kết quả phiếu;
  - Kết thúc: lật vai, "Diễn biến ván" dạng danh sách đơn giản, chơi lại.
- Giao diện ở mức tối thiểu: Tailwind, nền tối, chữ rõ, nút ≥ 44px. **Chưa** có cảnh hay hoạt cảnh, nhưng **cấu trúc màn đêm đã phải đồng nhất**.
- `WerewolfPreview.tsx` + một trang harness tạm (không commit) để xem từng phase × vai bằng state giả.
- `gameRegistry.ts`: bật Ma Sói, 5–10 người, mô tả tiếng Việt.

### Không làm
Phù thủy, Thợ săn, cho rời làng (GĐ2). Cảnh, icon, hoạt cảnh, màn join riêng (GĐ3–4).

### Nghiệm thu
- Engine test vẫn xanh. `tsc`, eslint (thư mục werewolf sạch), `build` đều qua.
- **Ván thật** bằng bot qua CDP, 6–7 cửa sổ (`localhost`, `127.0.0.1`, `a`–`e.localhost`), bản build production. Chạy ít nhất 2 ván: một ván Dân thắng (bot Sói chọn bừa, Dân bầu đúng Sói nhờ đọc vai qua CDP), một ván Sói thắng.
- **Không lần nào hai cửa sổ thấy phase khác nhau quá 1 giây**, trừ lúc vừa chuyển phase.
- Đóng cửa sổ chủ phòng giữa Đêm ① thì ván vẫn chạy tiếp (các máy khác tiếp quản sau 2,5 giây).
- Reload một cửa sổ giữa đêm thì khôi phục đúng lựa chọn và đúng đồng hồ.
- Hai Sói chọn khác nhau: đêm không kết thúc sớm; hết giờ thì áp dụng đa số / hoà đúng cài đặt.
- Ảnh 375px của mọi màn trong harness.
- **Cặp ảnh riêng tư màn Đêm ①** (Sói / Dân / Tiên tri / Bảo vệ, cùng thời điểm, không giữ): chênh lệch ≈ 0, đo như cách của Avalon.
- Dọn mọi phòng thử khỏi Firestore.

#### Bổ sung cho GĐ1 (nhạc trưởng, sau review GĐ0, 2026-10-11)

1. **Dùng engine, không viết lại luật.**
   - Mọi quyết định (ai được chọn ai, kết thúc sớm, phase kế, người chết, thắng thua, nhật ký) đều gọi API engine liệt kê ở §12.1.
   - `useWerewolf` chỉ làm ba việc: đọc dữ liệu, gọi engine, ghi `Step` trả về trong **một** CAS.
   - `werewolf/types.ts` import kiểu từ `engine/types.ts`, không định nghĩa lại.
2. **Import engine:** nhạc trưởng đã thử bằng trang tạm. Turbopack build và prerender được với `import … from '@/components/games/werewolf/engine/flow.ts'` (alias + đuôi `.ts`). Code UI import theo đúng cách này.
3. **Dựng `WwTable`:**
   - `seatOrder` và `deaths` lấy từ state;
   - `roles` dựng từ `players/<id>.gameData.role` của mọi ghế.
   - GĐ1 **chỉ cho kick ở sảnh**. Giữa ván không xoá doc player nào: rời phòng giữa ván = đóng tab, như Avalon. Thiếu doc của một ghế thì `isWolf` sai và kiểm tra thắng sai, nên không được để xảy ra. GĐ2 thêm "Cho rời làng".
4. **CAS của từng lần chuyển phase.** `expect` / `expectPlayerData` phải chứa đúng dữ liệu mà quyết định dựa vào:

   | Chuyển | `expect` / `expectPlayerData` | Ghi |
   |---|---|---|
   | `deal → night` | `acks` (khi kết thúc sớm) | `round`, `acks: {}` |
   | `night → dawn` (GĐ1 chưa có Phù thủy) | `nightPick` của **mọi người còn sống**, `guardLast` của Bảo vệ | `attack`, `deaths`, `dawnDeaths`, `log`. `playerData`: `guardLast` mới của Bảo vệ |
   | `night → night-witch` (GĐ2) | như trên | `attack`, `log` |
   | `night-witch → dawn` (GĐ2) | `nightPick` của Bảo vệ, `witchPick` của mọi người còn sống, `potions`, `guardLast` | `deaths`, `dawnDeaths`, `log`. `playerData`: `potions`, `guardLast` |
   | `day-talk → day-vote` | `acks` (khi kết thúc sớm) | `acks: {}`, `dayVotes: {}` |
   | `day-vote → vote-result` | `dayVotes` | `deaths`, `lastVote`, `log` |
   | `dawn` / `vote-result` / `hunter → …` | `deaths` | theo `Step` |

   - UI khoá lựa chọn khi đồng hồ về 0. Một lần ghi đến muộn làm CAS thất bại thì effect tự chạy lại với dữ liệu mới, như Avalon.
   - **Lựa chọn của người chơi:**
     - ghi vào `gameData` của chính người đó (`nightPick` có `round`);
     - luôn đọc qua `pickFor`;
     - không cần xoá giữa các đêm;
     - chơi lại thì dùng `clearGameData`.
5. **Bộ vai ở GĐ1 (4 vai):**
   - `presetFor(n)` rồi đổi `witch` và `hunter` thành `villager`. Đây là hàm tạm trong UI, ghi chú "xoá ở GĐ2".
   - Stepper Phù thủy và Thợ săn để mờ.
   - Bắt đầu ván vẫn đi qua `startGame` (tức `validateSetup`).
6. **Cảnh báo cân bằng** (người dùng chốt ±6): thêm `BALANCE_WARN = 6` và `balanceWarning(counts)` vào `engine/roles.ts`, kèm test. Được phép sửa engine cho việc này. Sảnh luôn hiện điểm và một nhãn "lợi Dân / cân / lợi Sói". Lệch quá ±6 thì hiện cảnh báo, không chặn.
7. **Màn Đêm ① đồng nhất** (§2.3):
   - Lưới là **mọi người còn sống**. Khi không giữ, màn giống hệt nhau với mọi vai: không làm mờ hay khoá ô theo vai.
   - `validTargets` chỉ dùng khi chạm hoặc khi giữ. Chạm ô không hợp lệ thì không đổi gì, chỉ hiện một dòng nhỏ **trong khung giữ-để-xem**.
   - Sau Xác nhận, mọi vai hiện cùng một trạng thái "Đã xác nhận". Sói muốn đổi thì giữ để mở khung bầy và đổi trong đó. Khung bầy gồm lựa chọn của đồng đội và "Bầy chưa thống nhất: …" (`wolfStatus`).
   - "Chưa xác nhận" phải hiện rõ với mọi vai, vì Tiên tri và Bảo vệ chưa Xác nhận thì không có tác dụng (rules §5.2).
8. **Tiên tri:** lúc Xác nhận thì gọi `seerLook` và ghi `seerLog` cùng một lần ghi với `nightPick.confirmed`. Kết quả chỉ hiện khi giữ, xem lại được trong "Vai của tôi".
9. **Nhật ký `state.log`** chỉ hiện ở màn `end`. GĐ2 thêm hồn ma.
10. **Kiểm thử:**
    - thêm `npm run test:werewolf` vào mọi lần kiểm thử;
    - với phần rút hook sang `shared/`: chạy `npx eslint src/components/games` so với baseline trước khi chuyển, và xem lại 3–4 màn `AvalonPreview` (vai, ban đêm, bỏ phiếu đội, kết thúc).

---

## 7. GĐ2 — Đủ bộ vai v1 và luật tuỳ chọn

### Việc cần làm
- **Phù thủy:** phase `night-witch`, panel giữ để xem người bị nhắm, Cứu / Độc / Không làm gì, người khác đoán nạn nhân. Bình thuốc lưu ở `gameData.potions`.
- **Thợ săn:** phase `hunter`, chạy cả sau bình minh lẫn sau khi treo, có tuỳ chọn bị độc vẫn bắn.
- Đủ 4 luật tuỳ chọn (rules §8.2):
  - lộ vai khi chết: tắt thì chỉ lật vai lúc kết thúc;
  - hồn ma xem hết vai: bật thì người chết thấy vai và lựa chọn đêm theo thời gian thực;
  - Sói hoà phiếu;
  - Thợ săn bị độc vẫn bắn.
- **Cho rời làng** (rules §7, E25): ở menu của chủ phòng, có xác nhận.
- Màn **"Luật chơi"**: tóm tắt ngắn gọn từ `rules.md` cho người chơi, gồm vai, vòng chơi, phép lịch sự ngoài đời.
- "Diễn biến ván" đầy đủ: cứu, độc, che, soi, đoán, nghi ngờ.

### Nghiệm thu
- Engine test xanh (thêm test nếu có ca mới).
- Ván thật 8–10 cửa sổ có Phù thủy và Thợ săn. Kịch bản bằng bot gồm:
  - Phù thủy cứu (E1, E2);
  - Phù thủy độc;
  - Thợ săn bị cắn rồi bắn;
  - Thợ săn bị treo rồi bắn;
  - Sói hoà phiếu với cả hai cài đặt;
  - hồn ma bật và tắt;
  - lộ vai khi chết tắt;
  - cho rời làng.
- Cặp ảnh riêng tư Đêm ② (Phù thủy / người khác) ≈ 0 khi không giữ.
- **Mốc PR #1:** push `dev-werewolf`, mở PR → `main` (sau khi nhạc trưởng review).

#### Bổ sung cho GĐ2 (nhạc trưởng, sau review GĐ1, 2026-10-11)

0. **Commit đầu tiên: sửa adapter** (người dùng đồng ý 2026-10-11, file dùng chung).
   - Trong `firebaseAdapter.casGameState`, chỉ gọi `tx.update(roomRef, …)` khi `patch` có ít nhất một khoá hoặc có `opts.status`.
   - Khi chỉ ghi `playerData` thì vẫn **đọc** doc phòng để kiểm `expected`, nhưng không ghi nó. Không đổi chữ ký hàm. Thêm một dòng ghi chú trong `IGameStorage.ts`.
   - Commit riêng: `fix(storage): GĐ2 — …`.
   - Kiểm tra:
     - `tsc` + build;
     - một ván Avalon 5 cửa sổ bằng bot (memory `avalon-ux-test-recipes`), chạy qua ít nhất một quest có lá bài (`playQuestCard` đi đường này);
     - ván Ma Sói 7 cửa sổ: cả bàn chọn cùng lúc ở Đêm ① vẫn 0 lỗi gửi.
   - Giữ `retryOnContention`: acks và phiếu ngày vẫn ghi doc phòng.
1. **Bỏ phần tạm của GĐ1:**
   - `GD1_DISABLED_ROLES`, `GD1_DISABLED_PHASES`;
   - phần ép Phù thủy / Thợ săn = 0 trong `lobbyCounts`;
   - nhánh "Bước này có ở GĐ2" trong `PhaseView`;
   - nhãn "GĐ2" ở sảnh.

   Bộ mặc định lấy nguyên `presetFor`.
2. **Đêm ② (`night-witch`):**
   - **Chuyển phase:** `resolveNightPhase` nhận nhánh `night-witch` của `afterNight` và ghi `attack` + `log`, với `expect` như bảng mục 4 phần GĐ1. `night-witch → dawn` dùng `afterNightWitch`. Trong `playerData` ghi `potions` của Phù thủy và `guardLast` của Bảo vệ. Kết thúc sớm bằng `witchDone`.
   - **Lưu lựa chọn:** vào `gameData.witchPick` của chính người đó (có `round`), giống `nightPick`.
   - **Ràng buộc thiết kế màn:**
     - (a) Khi không giữ thì màn giống hệt nhau với mọi người: cùng câu, cùng lưới mọi người còn sống, cùng nút Xác nhận, cùng dòng "Chưa / Đã xác nhận".
     - (b) **Ai cũng Xác nhận được mà không cần chọn ai.** Vì thế "Phù thủy không làm gì" trông giống "người khác không đoán".
     - (c) Người bị nhắm (`state.attack`), công tắc Cứu và việc chọn người để Độc **chỉ hiện và chỉ thao tác được khi giữ**. Không được để một lần chạm lưới lúc không giữ thành ra độc người.
     - (d) Kiểm quyết định bằng `validateWitchPick`, lý do lỗi hiện trong thẻ giữ.
     - (e) Người khác: chạm lưới là "đoán Sói nhắm ai" (`guessId`).
   - Cặp ảnh riêng tư (Phù thủy so với người khác: chưa chọn / đã chọn / đã xác nhận, khi không giữ) phải ≈ 0.
3. **Thợ săn (`hunter`):**
   - Thêm timer cho phase `hunter` (`timeouts.hunter`). Hết giờ thì `afterHunter(…, null)`.
   - Thợ săn chọn người trong lưới rồi bấm "Bắn" (có hộp xác nhận; bước này công khai nên không sao) hoặc "Không bắn".
   - Lần bấm gọi thẳng CAS chuyển phase với `afterHunter(table, round, state.hunter, shotId)` và `expect { hunter, deaths }`. Không cần lưu lựa chọn riêng.
   - Người khác thấy "Thợ săn {tên} đang ngắm…" và đồng hồ.
   - `proceedAfterDawn` / `proceedAfterVoteResult` đã ghi `state.hunter` theo `Step`. Kiểm `PHASE_STATUS.hunter`.
4. **Cho rời làng:**
   - Nằm trong menu ⋯ của chủ phòng: chọn một người còn sống, có hộp xác nhận.
   - **Không dùng `advance` / `applyStep`**, vì chúng đặt lại `phaseStartedAt` và làm đồng hồ của bước đang chạy bị reset. Dùng một `casGameState` riêng:
     - `expected { phase, phaseStartedAt, deaths }`;
     - patch `{ deaths, log }`, giữ nguyên `phase` / `phaseStartedAt`;
     - nếu `applyLeave` trả `winner` thì patch thêm `phase: 'end'`, `phaseStartedAt: serverNow()`, `winner`, `endReason`, và `status: 'end'`.
   - Người đã rời làng mà mở lại link thì thấy màn của người chết.
5. **Hồn ma (`ghostsSeeAll`):**
   - Bật: người chết (kể cả người rời làng) thấy vai trên mọi ô, lựa chọn đêm của mọi người theo thời gian thực (bầy Sói, Tiên tri, Bảo vệ, Phù thủy), và "Diễn biến ván" tới lúc hiện tại.
   - Tắt: chỉ thông tin công khai và vai của mình.
   - Người còn sống **không bao giờ** thấy các phần này.
6. **Lộ vai khi chết tắt:** đã có (`revealedRole`). Rà lại mọi chỗ hiện vai: Bình minh, Kết quả, danh sách Thảo luận / Bỏ phiếu, menu, hồn ma.
7. **Màn "Luật chơi":**
   - Nằm trong menu ⋯, ai cũng mở được, kể cả ở sảnh.
   - Tóm tắt rules §1–§3, vòng chơi §5 (thật ngắn) và §9. Không chép nguyên văn.
   - Lấy tên vai và câu mô tả từ `ROLE_NAME` / `ROLE_BLURB`.
8. **Đã biết, chấp nhận:**
   - Sói đổi lựa chọn sau khi Xác nhận thì dòng "Đã xác nhận" của Sói đó thành "Chưa xác nhận". Chỉ Sói làm được việc này, và phải giữ thẻ, nên rất hiếm. Không cần sửa.
   - Màn 1440px và dải nền của thanh nút đáy để GĐ3 lo.
9. **Bot:**
   - Chép bộ bot của GĐ1 từ scratchpad `049e3be0-69df-4392-807f-aad3c8e3e7d0/scratchpad` (`game.mjs`, `bot.js`, `cdp.mjs`, `pairs.mjs`, `held.mjs`, `grid.mjs`) sang scratchpad của mình.
   - Ván 9–10 người: thêm origin `f`–`h.localhost`.
   - Mỗi kịch bản ở phần Nghiệm thu là một lần chạy riêng, ≤ 3 phút.

---

## 7b. GĐ2b — Hồn ma "giữ để xem" (thêm sau review GĐ2, 2026-10-16)

**Lý do.** Ở GĐ2, hồn ma thấy vai của mọi người hiện thẳng trên ô và trong khung "Hồn ma". Ngồi chung bàn, người còn sống liếc sang máy người chết là thấy hết. Người dùng chọn sửa **trước PR #1** (rules §6).

### Việc cần làm
- **Mọi thông tin riêng của hồn ma chỉ render khi đang giữ thẻ**, gồm:
  - vai của mọi người;
  - lựa chọn ban đêm theo thời gian thực (bầy Sói, Tiên tri, Bảo vệ, Phù thủy, người nghi / đoán);
  - "Diễn biến ván đến giờ".
- **Ô trong lưới không hiện vai cho hồn ma nữa.** `shownRole` chỉ còn trả vai đã lộ khi chết (`revealedRole`).
- Gom mọi thứ của hồn ma vào **một thẻ giữ** trong `GhostPanel`:
  - danh sách vai gọn (tên + vai, theo ghế);
  - lựa chọn của bước hiện tại;
  - nhật ký: đọc được trên 375px khi đang giữ. Nếu dài thì chỉ hiện vòng hiện tại và vòng trước, đầy đủ ở màn kết thúc. Người thực thi tự chọn cách trình bày, ghi lại ở §12.
- **Khi không giữ, màn của người chết luôn giống nhau**, dù vai gì, dù "Hồn ma xem hết vai" bật hay tắt:
  - cùng câu `DeadNote` (bỏ câu riêng "Hồn ma thấy vai…" ra khỏi phần không giữ);
  - cùng một thẻ "Nhấn giữ để xem".
  - Giữ thẻ thì: luật bật → thông tin hồn ma; luật tắt → chỉ vai của mình.
- Giữ nguyên `shotPending`: Thợ săn chưa xong lượt bắn thì giữ thẻ chỉ thấy vai của mình.
- Thẻ giữ của người chết dùng chung ở mọi phase có người chết nhìn vào: Đêm ①, Đêm ②, Bình minh, Thợ săn, Thảo luận, Bỏ phiếu, Kết quả.

### Không làm
Không đổi luật, engine, logic chuyển phase hay giao diện của người còn sống. GĐ3 sẽ làm lại giao diện.

### Nghiệm thu
- `npm run test:werewolf`, `tsc`, eslint werewolf, `build` đều qua.
- **Cặp ảnh riêng tư của người chết, khi không giữ**, ở mỗi phase trên:
  - người chết là Sói so với người chết là Dân / Tiên tri / Thợ săn (đã bắn);
  - và hồn ma bật so với tắt.
  - Tất cả ≈ 0.
- Ảnh 375px khi đang giữ: hồn ma bật (danh sách vai + lựa chọn đêm + nhật ký đọc được) và hồn ma tắt (chỉ vai của mình).
- Một ván thật ngắn (kịch bản `ghostleave` của GĐ2, đổi bot cho phù hợp): lấy mẫu liên tục, **không cửa sổ nào render vai của người khác khi không giữ** cho tới màn kết thúc.
- Sau review: **mốc PR #1** (người dùng đã đồng ý cho nhạc trưởng push `dev-werewolf` và mở PR vào `main`).

---

## 8. GĐ3 — Bộ nhận diện và cảnh

### Việc cần làm
- Asset registry theo tên, giống `avalon/assets/registry.ts`, để sau này thay bằng ảnh vẽ AI.
- Icon game-icons.net (CC BY 3.0, ghi công trong `assets/CREDITS.md`): sói, tiên tri (quả cầu), khiên, bình thuốc, nỏ/súng săn, dân làng, mặt trăng, mặt trời, giá treo hoặc dây, đầu lâu.
- Bảng màu: đêm (xanh tím, ánh trăng bạc), ngày (vàng ấm), một màu nhấn (học GĐ7 Avalon: một màu nhấn, 3 mức bo góc, không dùng lớp màu palette lẻ).
- Cảnh paper-cut: làng ban đêm, bình minh, làng ban ngày, giàn treo (kết quả phiếu), kết thúc Dân thắng, kết thúc Sói thắng.
- Thẻ vai, avatar, bàn tròn (ghế theo `seatOrder`, người chết hiện mờ hoặc bia mộ), màn join riêng (nhánh trong `page.tsx` giống Avalon).
- "Mỗi màn một câu, một việc".

### Nghiệm thu
- Ảnh 375px và 1440px của mọi màn.
- Tương phản chữ ≥ 4.5:1 đo trên pixel thật.
- Không va chạm giữa ghế và nhãn ở 320–390px với 5–10 người.
- Cặp ảnh riêng tư (Đêm ①, Đêm ②, Xem vai khi không giữ) ≈ 0.
- Ghi kích thước chunk Ma Sói (gzip).

#### Bổ sung cho GĐ3 (nhạc trưởng, sau PR #1, 2026-10-16)

**Chia làm hai phần, giống Avalon GĐ7.**
- **GĐ3a — Nền thiết kế + 4 màn mẫu.**
  - Thứ tự làm: token màu / chữ / bo góc, rồi bộ UI nhỏ (nút, khung, chip, ô người chơi, thẻ giữ), rồi icon qua asset registry, rồi 2 cảnh (làng ban đêm, bình minh).
  - Áp lên 4 màn mẫu: **Sảnh, Xem vai, Đêm ①, Bình minh**.
  - Làm một **bảng phong cách** trong `WerewolfPreview`, kèm ảnh trước / sau ở 375px và 1440px.
  - Xong thì **DỪNG lại, báo người dùng duyệt hướng hình ảnh**. Chưa duyệt thì không làm GĐ3b.
- **GĐ3b — Áp cho mọi màn còn lại.**
  - Gồm Đêm ②, Thợ săn, Thảo luận, Bỏ phiếu, Kết quả, Kết thúc, thẻ / tờ hồn ma, menu, Luật chơi, màn join riêng.
  - Thêm các cảnh còn lại.
  - Quét sạch lớp màu Tailwind lẻ.

**Ràng buộc:**
1. **Riêng tư phải giữ nguyên sau khi đổi giao diện.**
   - Cảnh, màu nền, hoạt hoạ nhẹ và icon **giống nhau với mọi người xem**. Không có cảnh, màu, viền hay icon nào đổi theo vai.
   - Chạy lại toàn bộ cặp ảnh riêng tư của GĐ1–GĐ2b sau mỗi phần (Đêm ①, Đêm ②, Xem vai, màn người chết khi không giữ, hồn ma bật / tắt): phải ≈ 0.
   - Tờ hồn ma giữ đúng ba điều ở §12.7:
     - không có DOM khi không giữ;
     - chặn pointer nổi bọt lên thẻ;
     - thẻ đóng giống hệt nhau.
2. **Học từ Avalon GĐ7:**
   - một màu nhấn, 3 mức bo góc;
   - không dùng lớp màu palette lẻ của Tailwind; không dùng `text-[Npx]` (GĐ1–GĐ2b có vài chỗ `text-[13px]` / `text-[10px]`, thay bằng token);
   - mỗi màn một câu, một việc;
   - đo số chữ của từng màn trước và sau (cách đo trong memory `avalon-ux-test-recipes`, phần GĐ7a / 7b).
3. **CSS riêng:** `werewolf.css`, chỉ `WerewolfBoard` (và trang harness) import, giống `avalon.css`. Token đặt tên `--ww-*`. Không sửa token hay component của Avalon.
4. **Dùng lại phần vẽ của Avalon:**
   - Được import các hàm vẽ thuần, không phụ thuộc dữ liệu Avalon. Ví dụ `avalon/scenes/paper.tsx`: chỉ phụ thuộc `mulberry32` của `journey.ts`.
   - Nếu cần nhiều, hãy chuyển sang `games/shared/` bằng `git mv` và chỉ đổi đường import (như GĐ1), làm thành commit riêng. Ghi lại ở §12.
   - Không thêm dependency.
5. **Bàn tròn:**
   - Ghế theo `seatOrder`. Người chết hiện mờ hoặc bia mộ.
   - Dấu "đã xác nhận / đã bầu / sẵn sàng" công khai và **như nhau với mọi vai**.
   - Kiểm va chạm ghế / nhãn ở 320–390px × 5–10 người (mẫu `collide7` của Avalon).
   - Lưới chọn có thể giữ dạng lưới. Bàn tròn là phần trang trí công khai, không bắt buộc thay lưới.
6. **1440px:** hết cảnh "một cột hẹp giữa màn hình", ví dụ hai cột (bàn / cảnh bên trái, panel bên phải). Điện thoại vẫn là ưu tiên số 1.
7. **Màn join riêng:** thêm nhánh trong `page.tsx` giống `AvalonJoinScreen`. Import từ module `WerewolfBoard` (`.then(m => m.WerewolfJoinScreen)`) để dùng chung chunk.
8. **Không làm hoạt cảnh của GĐ4.** Chỉ được dùng chuyển cảnh đơn giản (crossfade nền khi đổi phase) và phải tôn trọng `prefers-reduced-motion`.
9. **Đo đạc:**
   - Kích thước chunk Ma Sói (gzip), trước và sau, đo bằng build sạch không có trang harness.
   - Tương phản chữ ≥ 4.5:1 đo trên pixel thật (bỏ qua nút đang khoá).
   - Không cuộn ngang ở 320px.

---

## 9. GĐ4 — Hoạt cảnh và nhịp ván

### Việc cần làm
- Trời tối (vào đêm).
- Bình minh: mặt trời lên, lật bài người chết **lần lượt theo thứ tự ghế**.
- Kết quả phiếu: mũi tên từ người bầu tới người bị bầu, người bị treo lật bài.
- Thợ săn ngắm và bắn.
- Màn kết thúc: phe thắng, lật toàn bàn, "Diễn biến ván" kể theo từng đêm.
- Mọi hoạt cảnh tính theo `phaseStartedAt` (mẫu `useCue` / `usePhaseTimeline` của Avalon) và nằm gọn trong 8 giây của Bình minh / Kết quả phiếu.

### Nghiệm thu
- Các cửa sổ của ván thật lệch nhau ≤ 50 ms.
- Reload giữa hoạt cảnh thì tiếp tục đúng khung hình.
- Có `prefers-reduced-motion` (khung hình tĩnh cuối).
- CPU giảm tốc 4× không làm trễ bước có giờ.
- Trang không bị rộng ra (không cuộn ngang ở 320px).
- **Mốc PR #2.**

#### Bổ sung cho GĐ4 (nhạc trưởng, sau review GĐ3, 2026-10-17)

1. **Đồng hồ chung.**
   - Mọi hoạt cảnh là hàm thuần của `state` + `phaseStartedAt` + `serverNow()`. Dùng `useCue` / `usePhaseTimeline` trong `games/shared/hooks` và mẫu `Cued` / `timelines.ts` của Avalon.
   - Đặt mốc thời gian vào một file (ví dụ `werewolf/scenes/timelines.ts`) để kiểm tra và chụp ảnh theo T.
   - Reload hay vào trễ thì nhảy vào đúng khung hình, không phát lại từ đầu.
2. **Không chặn bước có giờ.**
   - Ở Đêm ①, Đêm ②, Thợ săn, Bỏ phiếu, lưới và nút phải bấm được ngay từ T = 0. Màn "trời tối" là lớp trang trí `pointer-events: none`, hoặc ngắn ≤ 1,2 s và không che lưới.
   - Bình minh và Kết quả phiếu (cố định 8 s): chuỗi hoạt cảnh xong trong ≤ 6,5 s, khung hình cuối đứng yên tới hết bước.
3. **Riêng tư.**
   - Hoạt cảnh **giống hệt nhau với mọi người xem**. Không có rung, nháy, glow hay chuyển động nào riêng cho một vai.
   - Không có tín hiệu "đến lượt bạn" ban đêm (§2.3), vì ai cũng có lượt.
   - Mọi thứ riêng vẫn chỉ nằm trong thẻ giữ.
   - Chạy lại các cặp ảnh riêng tư ở **nhiều khung hình** (T = 0, 0,5 s, 1,5 s, 4 s, cuối), đóng băng animation như GĐ3a. Phải ≈ 0.
4. **Bình minh:**
   - mặt trời lên;
   - người chết hiện **lần lượt theo thứ tự ghế**, lật vai chỉ khi luật "Lộ vai khi chết" bật;
   - "Đêm qua bình yên" có hoạt cảnh riêng nhưng **cùng tổng thời lượng**, để không đoán được gì từ nhịp.
5. **Kết quả phiếu:**
   - phiếu bay từ ô người bầu tới ô người bị bầu, hoặc gom thành cột đếm. Người thực thi chọn cách đọc được trên 375px, ghi lại lựa chọn ở §12;
   - người bị treo: giàn treo + lật vai theo luật;
   - không ai bị treo: câu lý do.
6. **Thợ săn:** ngắm (công khai) rồi phát bắn. Hoạt cảnh chạy sau khi CAS chuyển phase, ở bước kế tiếp, dựa vào mục `hunter` cuối của nhật ký. Không làm chậm lần ghi.
7. **Kết thúc:**
   - lộ phe thắng, lật toàn bàn theo ghế;
   - "Diễn biến ván" kể theo từng đêm / ngày (có thể là các bước bấm qua);
   - chạm để bỏ qua hoạt cảnh chỉ có tác dụng trên máy mình.
8. **Hiệu năng:**
   - CPU giảm tốc 4× không có khung hình dài > 50 ms kéo dài;
   - hạt trang trí ≤ số lượng hiện có;
   - các cửa sổ prod lệch nhau ≤ 50 ms ở mốc hoạt cảnh;
   - không cuộn ngang ở 320px suốt chuỗi hoạt cảnh (đo `scrollWidth` trong cả chuỗi, bài học Avalon GĐ5);
   - đo lại kích thước gói.
9. **Giảm chuyển động:** khung hình cuối tĩnh, chữ đầy đủ.
10. **Sửa nhỏ từ review GĐ3:** ngôi sao 4 cánh (hạt trang trí) đè lên dòng "… mời bạn vào làng" ở màn vào phòng 1440px (và sát chữ ở 375px). Hạt không được nằm trên vùng chữ.
11. Không âm thanh. Không đổi luật / engine / `useWerewolf`, trừ khi cần đọc thêm dữ liệu công khai (hỏi trước nếu phải đổi state).
12. Sau review GĐ4: **mốc PR #2**. Nhạc trưởng hỏi người dùng trước khi push / mở PR.

---

## 10. GĐ5a — Vai mở rộng + 12 người: luật thành engine (thêm 2026-10-17)

Người dùng chọn 6 vai mở rộng (Già làng, Người hoá sói, Tay sai, Kẻ chán đời, Cupid, Sói con) và nâng ván lên tối đa 12 người. Luật đầy đủ ở **rules §11**, ca biên E29–E55. Giống GĐ0: làm engine trước, có test đầy đủ, rồi mới làm giao diện (GĐ5b).

### Việc cần làm
- **`engine/roles.ts`:**
  - thêm 6 vai: tên, câu mô tả, điểm (rules §11), phe;
  - `MAX_PLAYERS = 12`; bộ mặc định 11–12 (rules §4);
  - `validateSetup`: Sói = Ma Sói + Sói con; mỗi vai mở rộng ≤ 1 (E55);
  - `nightActionOf`: Sói con cắn như Sói; Cupid ghép đôi ở đêm 1; các vai mở rộng khác chọn "người nghi".
- **Phe và thắng thua (`engine/win.ts`):**
  - phân biệt "Sói" (Ma Sói + Sói con) với "phe Sói" (+ Tay sai);
  - thêm phe Kẻ chán đời và phe Tình nhân;
  - `checkWinner` theo đúng thứ tự rules §11.8;
  - `WinResult` có người thắng mới (`tanner`, `lovers`) và lý do mới;
  - **mọi test v1 (E1–E28) phải giữ nguyên kết quả** khi không bật vai mở rộng.
- **Đêm (`engine/night.ts`):**
  - **Bầy Sói cắn 1 hoặc 2 người** (Sói con, rules §11.7): `wolfStatus` / `tallyWolves` nhận số người cần cắn (1 | 2). Thống nhất = cùng một tập; hết giờ lấy top-k; hoà ở ranh giới thì theo `wolfTie`.
  - **Có thể có 2 người bị nhắm:**
    - Phù thủy cứu **một** trong số đó: lựa chọn cứu chuyển từ `heal: boolean` sang người được cứu (`healId`), hoặc cách tương đương;
    - Bảo vệ che một người.
  - **Già làng:** mạng phụ (rules §11.2), lưu trong `gameData` của Già làng (ví dụ `elderLife: boolean`), cập nhật cùng transaction cuối đêm như `potions`.
  - **Tiên tri** soi Người hoá sói ra "Là Sói"; soi Tay sai, Kẻ chán đời ra "Không phải Sói".
  - **Cupid ghép đôi:** đêm 1, kiểm tra hợp lệ (2 người khác nhau, còn sống, được gồm cả mình). Có Xác nhận thì lưu cặp vào state (ví dụ `lovers: [a, b] | null`); không thì không có cặp (E41).
- **Chết theo người yêu (`engine/flow.ts`):**
  - mọi lượt có người chết đều chạy chuỗi chết theo: đêm, treo, phát bắn, rời làng;
  - nguyên nhân mới: `love`;
  - Thợ săn chết theo vẫn được bắn (E44); phát bắn trúng người yêu thì người kia chết theo (E45).
- **Kẻ chán đời:** bị treo thì kết thúc ngay (E37, E38), kiểm tra trước Thợ săn và trước "Sói đủ số".
- **Sói con:** số người bầy được cắn ở đêm r là 2 nếu Sói con chết ở vòng r − 1, vì lý do khác rời làng (E49–E51). Suy ra từ `deaths` (không cần thêm state) hoặc ghi rõ; người thực thi chọn và ghi lại.
- **Nhật ký (`engine/log.ts`):** mục mới cho ghép đôi, mất mạng phụ, chết theo người yêu, đêm cắn 2, Kẻ chán đời / Tình nhân thắng. Có câu tiếng Việt cho từng mục.
- **Test:**
  - mỗi mã **E29–E55** có ít nhất một test mang mã đó;
  - bộ mặc định 11–12;
  - các tổ hợp: Cupid ghép Sói con với Thợ săn, đêm cắn 2 trúng Già làng + người yêu, Tay sai trong cặp Tình nhân, v.v.;
  - toàn bộ 138 test cũ vẫn xanh.
- **UI chỉ sửa tối thiểu để build qua** (kiểu dữ liệu đổi tên, `attack` → nhiều người…). Hành vi của 6 vai gốc trên màn hình **không đổi**, và chưa có giao diện cho vai mới (GĐ5b).

### Không làm
Giao diện vai mới, sảnh "Vai mở rộng", cảnh mới, ván thật 12 cửa sổ (GĐ5b).

### Nghiệm thu
- `npm run test:werewolf` xanh: 138 test cũ + test mới, phủ đủ E29–E55.
- `tsc`, eslint werewolf, `build` qua. Engine vẫn không import react / firebase / `@/`.
- Một ván thật ngắn 7 cửa sổ chỉ dùng 6 vai gốc (kịch bản `heal` của GĐ2) vẫn đạt: không hồi quy.
- Ghi lại API mới cho GĐ5b ở §12, giống §12.1.

---

## 10b. GĐ5b — Vai mở rộng: giao diện, máy trạng thái, ván thật 12 cửa sổ

### Việc cần làm
- **Sảnh:**
  - `gameRegistry` lên 5–12 người; Preview `count` lên 12;
  - mục **"Vai mở rộng"**: mỗi vai một công tắc / stepper 0–1, kèm icon và một câu mô tả. Điểm cân bằng và Dân làng tự cập nhật.
- **Xem vai:**
  - Tay sai thấy bầy Sói (trong thẻ giữ);
  - Sói **không** thấy Tay sai; Sói con thấy bầy như Sói;
  - Già làng, Người hoá sói, Kẻ chán đời, Cupid: câu mô tả vai.
- **Đêm ①:** màn vẫn giống hệt nhau khi không giữ.
  - **Cupid đêm 1:** giữ thẻ + chạm để chọn 2 người yêu (giống Phù thủy độc); dấu chỉ hiện khi giữ.
  - **Đêm cắn 2:** "Đêm nay bầy được cắn 2 người" chỉ hiện trong thẻ giữ của Sói. Bầy chọn 2 người trong thẻ; trạng thái thống nhất theo tập.
- **Đêm ② (Phù thủy):** khi có 2 người bị nhắm, thẻ giữ cho chọn cứu một trong hai.
- **Từ Bình minh 1:** người trong cặp đôi thấy "Bạn yêu X — X là ‹vai›" trong thẻ giữ; Cupid thấy cặp đã ghép; Già làng thấy trạng thái mạng phụ. Tất cả chỉ khi giữ. Thêm vào "Vai của tôi".
- **Chết theo người yêu:** công bố cùng lượt (Bình minh, Kết quả phiếu, sau phát bắn, rời làng), theo thứ tự ghế, hoạt cảnh theo đồng hồ chung như GĐ4. Thợ săn chết theo vẫn có bước Thợ săn.
- **Kết thúc:**
  - phe thắng mới: Kẻ chán đời, Tình nhân, có câu và màu riêng. Có thể dùng lại cảnh kết thúc có sẵn, hoặc thêm 1–2 cảnh theo bộ nhận diện GĐ3;
  - "Phe bạn thắng / thua" đúng cho từng phe (Tay sai thắng cùng Sói; người trong cặp Tình nhân thắng / thua theo phe Tình nhân);
  - "Diễn biến ván" có mục mới.
- **Hồn ma:** thấy cặp đôi, mạng phụ, đêm cắn 2.
- **Luật chơi:** thêm mục "Vai mở rộng" (chỉ các vai đang bật trong phòng, hoặc cả 6 kèm ghi chú).
- **12 người:** lưới 12 ô ở 320–390px và 1440px; kiểm va chạm 5–12 người; không cuộn ngang.

### Nghiệm thu
- Test engine xanh; `tsc` / eslint / build qua.
- **Cặp ảnh riêng tư** (không giữ, ở các khung hình như GĐ4), mỗi vai mới so với Dân làng:
  - Xem vai, Đêm ① (gồm Cupid đêm 1 và Sói ở đêm cắn 2), Đêm ② (2 người bị nhắm);
  - màn người chết.
  - Tất cả ≈ 0.
- **Ván thật** (bản production, 11–12 cửa sổ: `localhost`, `127.0.0.1`, `a`–`j.localhost`). Mỗi kịch bản là một lần chạy riêng:
  - Cupid ghép cặp khác phe → Tình nhân thắng;
  - Kẻ chán đời bị treo;
  - Sói con bị treo → đêm cắn 2 + Phù thủy cứu một;
  - Già làng sống sót lần cắn đầu;
  - Tiên tri soi Người hoá sói / Tay sai;
  - người yêu là Thợ săn chết theo rồi bắn;
  - một ván 12 người chơi tới kết thúc.
- Tương phản, không cuộn ngang ở 320px, kích thước gói.
- Sau review: **mốc PR #3** (hỏi người dùng trước khi push / mở PR).

---

## 10c. GĐ6 — Chơi thật (chưa lên lịch)
- Chơi 2–3 ván thật với nhóm bạn, ghi lỗi và cảm nhận, chỉnh bộ vai mặc định, điểm cân bằng và thời gian mặc định.
- Kiểm các mục "Để GĐ5" còn mở ở §12.8 và §12.14 (thẻ phát bắn che tiêu đề, chữ chồng lúc crossfade ở Kết quả, nhịp 8 giây, kéo để cuộn tờ hồn ma).
- Tuỳ chọn "loa chung": máy chủ phòng đọc thông báo **công khai** bằng giọng nói (Web Speech, vi-VN).

---

## 11. Kiểm thử (mọi GĐ)

**Lệnh nền:**
- `npm run test:werewolf` (từ GĐ0)
- `npx tsc --noEmit`
- `npx eslint src/components/games/werewolf` (và `src/components/games` khi đụng file dùng chung)
- `npm run build`
- Không dùng `npm run lint` cho toàn repo: nó quét cả `.claude/worktrees/**` nên báo hàng trăm lỗi không liên quan.

**Ván thật nhiều người trên một máy:**
- Cần `npm run build && npm start`. `next dev` chặn origin khác `localhost`.
- Mỗi origin là một danh tính ẩn danh: `localhost:3000`, `127.0.0.1:3000`, `a.localhost:3000` … `e.localhost:3000`. Không dùng IP LAN.
- Mở bằng Chrome headless qua CDP với `Target.createTarget({ url, newWindow: true })`, để mọi cửa sổ đều chạy animation.
- Bot bấm nút theo chữ. Có thể đọc vai qua `players/*.gameData` để điều khiển kết cục.
- Giữ mỗi lần chạy ≤ 3 phút cho vừa giới hạn 600 giây của tool.
- **Xoá phòng thử khi xong**, bằng nút xoá của chủ phòng trong cùng phiên chạy.

**Harness không cần Firebase:** `WerewolfPreview` + một trang tạm bọc bằng `dynamic(..., { ssr: false })`. Không commit trang tạm. Xoá xong thì `rm -rf .next` trước khi `tsc`.

**Cặp ảnh riêng tư:**
- Chụp cùng thời điểm, chỉ đổi vai của người xem (đổi chỗ với người đang giữ vai đó để bộ vai trên bàn không đổi), đóng băng animation ở cùng `currentTime`.
- Thu cả hai ảnh về 10% rồi so trung bình chênh lệch pixel: cặp sạch ≈ 0–3.

**Chi tiết và các bẫy đã gặp:** xem memory `avalon-ux-test-recipes` và `local-multiplayer-testing`, áp dụng y như với Avalon.

---

## 12. Nhật ký tiến độ (người thực thi cập nhật)

| GĐ | Trạng thái | Commit (đầu → cuối) | Ghi chú |
|---|---|---|---|
| Kế hoạch | Xong | `d0fbb4db` → (commit này) | Nhạc trưởng viết plan.md + rules.md, 2026-10-11. |
| GĐ0 | **Review đạt** (nhạc trưởng, 2026-10-11) | `6440892c` → `68af55e5` | Engine thuần + 132 test (22 nhóm), phủ đủ E1–E28. `tsc`, eslint werewolf, `build` sạch; không import react/firebase/`@/`. Chi tiết và các điểm lệch ở §12.1, review ở §12.2. |
| GĐ1 | **Review đạt** (nhạc trưởng, 2026-10-11) | `08623054` → `d3b1a59f`; code `15d0d159`, `13e33330`, `0f4da818`, `b51f226f` | Chơi được 4 vai trên điện thoại, không quản trò. Hook UI chuyển sang `games/shared/hooks`. Engine 136 test. Ván thật 7 cửa sổ: Dân thắng 11/11, Sói thắng 9/9 kiểm tra đạt. Cặp ảnh riêng tư Đêm ① + Xem vai 12/12 = 0.000. Chi tiết, lệch kế hoạch và số đo ở §12.3, review ở §12.4. |
| GĐ2 | **Review đạt** (nhạc trưởng, 2026-10-16) | `fe0343a0` → `2bf4a5da`; code `35894afc`, `701f1009`, `b6ab022f`, `99cc7252`, `c4c0944f`, `3f13ff03` | Đủ 6 vai + 4 luật tuỳ chọn, cho rời làng, hồn ma, màn Luật chơi. Adapter `casGameState` không ghi doc phòng khi chỉ ghi `playerData`. Engine 138 test. Ván thật 7–10 cửa sổ: 7 kịch bản Ma Sói đạt + 1 ván Avalon 5 cửa sổ đạt. Cặp ảnh riêng tư Đêm ①, Xem vai, Đêm ② 40/40 = 0.000. Chi tiết, lệch kế hoạch và số đo ở §12.5, review ở §12.6. |
| GĐ2b | **Review đạt** (nhạc trưởng, 2026-10-16) | `c7eb0e2a` → `5a852dbe`; code `ad5dd181` | Hồn ma "giữ để xem" (§7b), trước PR #1. Người chết có đúng một thẻ giữ; không giữ thì màn giống hệt nhau (cặp ảnh riêng tư 54/54 = 0.000), giữ thì thấy vai / lựa chọn đêm / nhật ký (hồn ma bật) hoặc chỉ vai của mình (tắt, hoặc Thợ săn chưa bắn). Ván thật `ghostleave` 23/23, `hunterpoison` 12/12, `hidden` 15/15. Chi tiết, lệch kế hoạch và số đo ở §12.7, review ở §12.8. |
| GĐ3a | **Người dùng đã duyệt hướng hình ảnh** (2026-10-17) | `336349ec` → (commit này); code `9867bcef`, `f35c2a70` | Token `--ww-*` (đêm xanh tím, chữ ánh trăng, một màu nhấn đèn lồng, font Grenze), bộ UI nhỏ, 29 icon qua registry (14 mới, người dùng duyệt tải), 2 cảnh cắt giấy (làng ban đêm, bình minh), 4 màn mẫu (Sảnh, Xem vai, Đêm ①, Bình minh) có bố cục hai cột ở 1440 px, bảng phong cách. Cặp ảnh riêng tư 114/114 = 0.000, tương phản 777/777 ≥ 4,5 : 1, không cuộn ngang ở 320 px. Gói Ma Sói +22,5 KB gzip. Chi tiết ở §12.10. |
| GĐ3b | **Review đạt** (nhạc trưởng, 2026-10-17; GĐ3a cùng review) | `05feb3bd` → `7fece5ea`; code `3f8d510b` | Mọi màn theo bộ nhận diện, 6 cảnh, màn vào phòng riêng. Riêng tư 114/114 = 0.000, tương phản 2 045/2 045, va chạm 210/210, ván thật 54/54. Chi tiết ở §12.11, review ở §12.12. |
| GĐ5a | **Xong, chờ review** (2026-10-18) | `fcc2a7f5` → (commit này); code `bddc1cf5` | 6 vai mở rộng + 12 người thành engine thuần, giữ tương thích ngược (138 test cũ chạy nguyên, chỉ sửa 3 chỗ ghi cứng "5–10 người"). Engine 202 test, phủ đủ E1–E55. UI chỉ thêm khoá cho vai mới để build qua. Ván thật hồi quy `heal` 7 cửa sổ 22/22. **6 cách hiểu luật chờ người dùng chốt** (§12.16). Chi tiết, API cho GĐ5b ở §12.16. |
| GĐ5b | Chưa bắt đầu | | Vai mở rộng: giao diện + ván thật 12 cửa sổ (§10b) → PR #3. |
| GĐ6 | Chưa bắt đầu | | Chơi thật (§10c). |
| GĐ4 | **Review đạt** (nhạc trưởng, 2026-10-17) | `e0ffa324` → `e336a9e1`; code `13d5e3fe` | Hoạt cảnh theo đồng hồ chung (`scenes/timelines.ts`): vào đêm, trăng / mặt trời lên, bình minh lần lượt theo ghế, kết quả phiếu dạng cột đếm, phát bắn của Thợ săn ở bước kế tiếp, kết thúc kể theo từng đêm / ngày; bù độ trễ dựng (`useCueSync`). Riêng tư 675/675 cặp = 0.000 ở 5 khung hình. Ván thật production 3 kịch bản 52/52, các cửa sổ lệch ≤ 5,3 ms ở 166 mốc, reload giữa hoạt cảnh lệch ≤ 1,1 ms. Gói Ma Sói 60,2 → 64,0 KB gzip. Chi tiết ở §12.13, review ở §12.14. |

### 12.1 GĐ0 — ghi chú của người thực thi (2026-10-11)

**Đã làm**
- `tsconfig.json`: thêm `allowImportingTsExtensions`. `package.json`: script `test:werewolf`.
- `engine/`: `types.ts`, `roles.ts`, `night.ts`, `day.ts`, `win.ts`, `flow.ts`, `log.ts`, cùng 3 file phụ `table.ts` (ai sống, ai là Sói), `random.ts` (`shuffle`, `pickOne`) và `testkit.ts` (đồ nghề cho test, không phải file test).
- Test: `roles` 22, `night` 45, `day` 8, `win` 6, `flow` 47, `log` 4. Có test mang mã của từng ca E1–E28. Có test cho preset 5–10 người (đúng bảng, tổng, hợp lệ, điểm), `dealRoles` (đúng số lượng, rng cố định cho kết quả cố định), và đủ các hàng "Sang" của bảng §4.2 (trừ `end → sảnh`, việc của UI).

**API cho GĐ1** (mọi hàm thuần, nhận `WwTable = { seatOrder, roles, deaths }`; `roles` dựng từ `players/*.gameData.role`):
- Bắt đầu: `startGame(playerIds, counts, rng)` gồm `validateSetup` (lỗi tiếng Việt), xáo ghế và `dealRoles`.
- Kết thúc sớm: `dealDone`, `nightDone` (mọi người đã Xác nhận **và** `wolfStatus().agreed`), `witchDone`, `talkDone`, `voteDone`.
- Phase kế: `afterDeal`, `afterNight` (ra `night-witch` hoặc `dawn`), `afterNightWitch`, `afterDawn`, `afterTalk`, `afterVote`, `afterVoteResult`, `afterHunter`. Mỗi hàm trả `Step = { phase, round, newDeaths, log, winner, hunter }`, kèm phần riêng: `attack`/`wolves`/`night` (đêm), `vote` (phiếu).
- Rời làng: `applyLeave(table, round, phase, id)` trả `{ newDeaths, log, winner }`, hoặc `null` nếu người đó đã chết hay ván đã xong.
- UI: `wolfStatus` (lựa chọn của bầy, "Lan (1) · Minh (1)"), `validTargets`/`isValidTarget`, `seerLook` (ghi `seerLog` lúc Xác nhận), `validateWitchPick` + `WITCH_PICK_ERROR_TEXT`, `describeLog` (câu tiếng Việt, chia đêm/ngày), `ROLE_NAME`, `ROLE_BLURB`, `ROLE_POINTS`, `balanceScore`, `WIN_REASON_TEXT`.
- Mọi giá trị trả về dùng `null`, không có `undefined` (có test), để ghi thẳng vào Firestore.

**Lệch kế hoạch**
1. Thêm 4 file ngoài danh sách §4.1: `types.ts`, `table.ts`, `random.ts`, `testkit.ts`.
2. Script test có thêm `--disable-warning=MODULE_TYPELESS_PACKAGE_JSON`. Vì `package.json` không có `"type"`, Node in một cảnh báo cho mỗi file `.ts`. Thêm `"type": "module"` thì ảnh hưởng cả app Next, nên chỉ tắt cảnh báo.
3. `round`: `deal` là vòng 0, mỗi lần vào `night` thì +1 (đêm 1 / ngày 1 = 1, đúng §4.3). Người chết ghi `round` của vòng đang chạy.
4. Nhật ký: chết vì treo / Thợ săn / rời làng không có mục `death` riêng, vì đã nằm trong mục `vote` / `hunter` / `left`. Mục `death` chỉ dùng cho người chết ban đêm. Thêm loại `left` có `during: WwPhase`.

**Chỗ `rules.md` chưa nói rõ, engine đã chọn cách hiểu (nhạc trưởng / người dùng xác nhận giúp):**
- **Bảo vệ** chọn mà chưa Xác nhận khi hết giờ thì **không che**. Làm giống Phù thủy (rules §5.4); Tiên tri cũng chỉ soi khi Xác nhận. Riêng Sói thì mọi lựa chọn đều được tính, đúng §5.3.
- **"Người mình nghi"**: người còn sống khác mình. **"Đoán Sói nhắm ai"**: người còn sống, kể cả mình.
- **E5 lọt qua UI** (cứu X + độc X): engine giữ phần cứu, bỏ phần độc, bình độc còn nguyên.
- Bình chỉ mất khi có hiệu lực lúc tính đêm. Ví dụ người bị độc đã rời làng trong đêm thì bình độc còn.
- `vote-result`: kiểm tra Thợ săn bị treo **trước**, rồi mới kiểm tra thắng (đúng thứ tự §5.9).
- Ngưỡng "điểm lệch nhiều" để cảnh báo (rules §4) chưa có số. Engine chỉ có `balanceScore`; GĐ1 cần chốt ngưỡng.

**Lưu ý cho GĐ1**
- `validTargets` khác nhau theo vai (Sói không chọn Sói; Bảo vệ không chọn `guardLast`; Tiên tri / người nghi không chọn mình). Lưới Đêm ① **không được** làm mờ hay khoá ô theo vai khi không giữ, nếu không sẽ lộ vai (§2.3). Chỉ báo "không chọn được" lúc đang giữ.
- `afterNightWitch` đọc lại `nightPicks` (Bảo vệ) cùng `witchPicks`. Hãy đưa cả hai vào `expectPlayerData` của CAS `night-witch → dawn`.

### 12.2 GĐ0 — review của nhạc trưởng (2026-10-11): **ĐẠT**

**Chạy lại nghiệm thu:**
- `npm run test:werewolf`: 132/132 xanh. Mỗi mã E1–E28 có ít nhất một test mang mã đó.
- `npx tsc --noEmit` sạch. `npx eslint src/components/games/werewolf` sạch.
- `npm run build` exit 0.
- Grep `react|firebase|@/` trong `engine/` không ra gì. Không có `enum` / `namespace`.

**Thử thêm:** một trang tạm import `engine/flow.ts`, `log.ts`, `types.ts` qua alias có đuôi `.ts`, gọi `startGame` / `afterDawn` / `describeLog`. Turbopack build và prerender được. Đã xoá trang tạm và `.next`, `tsc` vẫn sạch.

**Đọc code:** bám đúng rules §2–§7 và bảng §4.2.
- Thứ tự ở bình minh đúng: hết Sói → Thợ săn → Sói đủ số.
- Kiểm tra thắng làm sau phát bắn.
- Người chết công bố theo thứ tự ghế.
- Bình thuốc mất kể cả khi người được cứu đã được che.
- Lựa chọn có `round` nên không bị tính sang đêm khác.
- Mọi giá trị dùng `null`, không `undefined`.
- Không thấy lỗi logic.

**Các lệch kế hoạch ở §12.1:** chấp nhận cả 4 (thêm 4 file phụ, tắt cảnh báo `MODULE_TYPELESS_PACKAGE_JSON`, `deal` là vòng 0, mục nhật ký `death` chỉ dùng cho người chết ban đêm).

**Người dùng chốt các cách hiểu luật (2026-10-11), đã ghi vào `rules.md`:**
- Bảo vệ chọn mà chưa Xác nhận khi hết giờ thì **không che**, giống Tiên tri và Phù thủy. Riêng Sói thì lựa chọn chưa Xác nhận vẫn được tính.
- "Người mình nghi" không được chọn chính mình. "Đoán Sói nhắm ai" được chọn cả mình.
- E5 lọt qua UI thì giữ phần cứu, bỏ phần độc, bình độc còn nguyên.
- Bình chỉ mất khi dùng lên người còn sống lúc tính đêm.
- Cảnh báo cân bằng khi điểm lệch quá ±6. Không chặn bắt đầu ván. Bộ mặc định không bao giờ bị cảnh báo.

**Việc chuyển sang GĐ1:** xem "Bổ sung cho GĐ1" ở §6 (có thêm `BALANCE_WARN` + `balanceWarning` vào engine).

### 12.3 GĐ1 — ghi chú của người thực thi (2026-10-11)

**Commit** (đều trên `dev-werewolf`, chưa push):
1. `15d0d159` rút 5 hook (`useHold`, `useDialog`, `useReducedMotion`, `useCue`, `usePhaseTimeline`) sang `games/shared/hooks/` bằng `git mv`; Avalon chỉ đổi đường import (alias `@/components/games/shared/hooks/…`).
2. `13e33330` engine `BALANCE_WARN` / `balanceWarning` / `balanceLean` (+4 test), `types.ts`, `state.ts`, `useWerewolf.ts`.
3. `0f4da818` `WerewolfBoard`, `panel/*`, `ui/*`, `hooks/usePhaseClock.ts`, `WerewolfPreview`, bật Ma Sói trong `gameRegistry`.
4. `b51f226f` chống đụng transaction khi cả bàn bấm cùng lúc (phát hiện nhờ ván thật, xem lệch 9).
5. Commit docs này: §12.

**Đã làm**
- `useWerewolf` chỉ đọc dữ liệu → gọi engine → ghi `Step` trong một CAS (`applyStep`). `expect` đúng bảng "Bổ sung cho GĐ1" mục 4: `acks` (deal → night, day-talk → day-vote), `nightPick` của mọi người còn sống + `guardLast` của Bảo vệ (night → dawn, ghi `guardLast` mới cùng transaction), `dayVotes` (day-vote → vote-result), và `deaths` ở mọi lần chuyển.
- `WerewolfBoard`: một effect timer cho 6 phase của GĐ1; kết thúc sớm bằng `dealDone` / `nightDone` / `talkDone` / `voteDone`; chủ phòng ngay, máy khác +2,5 s; chưa đủ vai của mọi ghế (`ready`) thì không quyết gì. Banner mất kết nối, báo lỗi gửi, `useWakeLock`, menu ⋯ (Vai của tôi / Thoát / Xoá phòng), hộp xác nhận riêng.
- Panel: Lobby (+LobbySettings), Deal, Night, Dawn, Talk, Vote, VoteResult, End. Người chết thấy màn công khai + "ngồi im lặng".
- Đêm ①: khi không giữ, màn giống hệt với mọi vai (câu, lưới mọi người còn sống, nút, "Chưa / Đã xác nhận"); phần riêng chỉ render khi giữ: khung bầy Sói (lựa chọn của đồng đội + `wolfStatus`), kết quả soi (Tiên tri, ghi `seerLog` cùng lần Xác nhận), `guardLast` (Bảo vệ), lý do chạm ô không hợp lệ.
- `WerewolfPreview`: 17 màn × 4 vai người xem; người xem luôn ghế 1, đổi vai = đổi chỗ với người giữ vai đó; tham số `start` cố định đồng hồ để chụp cặp ảnh cùng lúc.

**Lệch kế hoạch**
1. Thêm file ngoài §4.1: `state.ts` (đọc state / cài đặt / `WwTable`, dùng chung Board và Preview, không Firebase), `hooks/usePhaseClock.ts` (bản riêng), `panel/shared.tsx`, `panel/LobbySettings.tsx`, và `ui/Button.tsx`, `ui/Dialog.tsx` (Modal + `useConfirm` riêng), `ui/RoomMenu.tsx`. Thư mục `ui/` vốn để GĐ3; GĐ1 chỉ có bản tối thiểu, GĐ3 thay giao diện.
2. `lastVote` lưu `{ ballots, executedId, outcome }` (không chỉ `executedId`) để màn Kết quả công khai ai bầu ai và lý do không treo. `endReason` là mã `WinReason`, chữ lấy từ `WIN_REASON_TEXT`.
3. **Bộ vai ở sảnh:** chủ phòng chỉnh số Sói và vai đặc biệt bằng −/+; **Dân làng = số người − các vai còn lại (tự tính)**, nên tổng luôn khớp khi người vào / ra. `roleCounts: null` = bộ mặc định (nút "Về mặc định"). Plan §4.4 ghi "chỉnh từng vai": Dân không có stepper riêng. Bắt đầu ván vẫn qua `validateSetup`.
4. **Nhãn cân bằng:** "cân" khi |điểm| ≤ 2 (`BALANCE_EVEN`) — con số tự chọn, **người dùng chưa chốt**. Bộ 4 vai của GĐ1: 7 người +1 "cân", 5 người +6 "lợi Dân". Cảnh báo ±6 đúng như đã chốt.
5. "Lộ vai khi chết" và "Sói hoà phiếu" đã có hiệu lực ở GĐ1 (vai người chết hiện ở Bình minh / Kết quả / danh sách). "Hồn ma xem hết vai", "Thợ săn bị độc vẫn bắn", stepper Đêm ② và Thợ săn để mờ, ghi "GĐ2".
6. Bắt đầu ván là **một** transaction (CAS `{ phase: null }`) ghi cả state lẫn vai của mọi người (Avalon dùng 3 lần ghi). Mọi trường `gameData` của ván trước cũng được ghi lại.
7. `updateInPhase` kiểm `{ phase, round }`, không chỉ `phase`: lần ghi muộn của đêm trước không đè lên đêm sau.
8. **Sói đổi sau khi Xác nhận** = vừa giữ thẻ vừa chạm ô khác (hai ngón; trên máy tính: giữ Space + bấm chuột). Ô lưới chặn `pointerup` lan lên `window` và chặn `mousedown` mặc định (không đổi tiêu điểm) để `useHold` không đóng thẻ khi ngón thứ hai chạm. Không sửa `useHold`. Nhắc cách làm nằm trong khung bầy (chỉ hiện khi giữ).
9. **Đụng transaction (phát hiện ở ván thật):** mỗi lần chọn / xác nhận / bầu đi qua `casGameState`, mà adapter luôn ghi `lastActivityAt` vào doc phòng (kể cả khi `patch` rỗng). Cả bàn bấm cùng lúc thì transaction đụng nhau, Firestore bỏ cuộc sau 5 lần: 4/7 cửa sổ hiện "Không gửi được — kiểm tra kết nối mạng", xác nhận dồn tới 5–11 s. Đã sửa trong phạm vi werewolf: thử lại có độ trễ ngẫu nhiên (mất mạng thật thì báo ngay), hàng đợi ghi của từng người, bỏ lần bấm trùng, ô / phiếu sáng ngay trên máy (trả lại nếu gửi lỗi). Sau sửa: 0 lần gửi lỗi, xác nhận < 0,9 s. **Đề xuất (cần người dùng đồng ý vì là file dùng chung):** trong `firebaseAdapter.casGameState`, không ghi doc phòng khi `patch` rỗng và không có `status` — khi đó các lần ghi vào `players/<id>` không còn tranh doc phòng; Avalon (`playQuestCard`) cũng hưởng lợi. Phiếu ngày và `acks` vẫn ghi vào doc phòng (như `teamVotes` của Avalon).
10. Màn chơi nằm trong khung `px-4 py-6` chung của trang phòng (`page.tsx` không đổi, đúng §3). Ở 1440px nội dung là một cột giữa; dải nền tối của thanh nút đáy hơi lộ — để GĐ3.
11. Thuộc tính cho kiểm thử: `data-ww-root / -phase / -started / -round`, `data-ww-hold`, `data-ww-confirmed`, `data-player-id`, `data-ww-winner`, `data-ww-log`. Thông tin riêng (`data-ww-my-role`, `data-ww-pack`, `data-ww-seer-result`) chỉ nằm trong khung đang giữ.

**Kiểm thử (§11 + nghiệm thu GĐ1)**
- `npm run test:werewolf`: 136/136 (23 nhóm). `npx tsc --noEmit` sạch. `npx eslint src/components/games/werewolf` sạch; `npx eslint src/components/games` 29 lỗi / 29 cảnh báo = baseline trước khi chuyển hook. `npm run build` qua. Engine không import react / firebase / `@/`.
- Chuyển hook: `AvalonPreview` xem lại 6 màn (lộ vai, đêm Phe Quỷ, đêm Merlin, bỏ phiếu đội, kết quả Quest, kết thúc) — đúng.
- Harness: ảnh 375px của 17 màn, không cuộn ngang, không lỗi console; thêm 4 màn ở 1440px.
- **Cặp ảnh riêng tư** (cùng `start`, chụp cùng lúc, không giữ, thu 10%, trung bình |Δ| 0–255): Đêm ① chưa chọn / đã chọn / đã xác nhận và Xem vai, Sói so với Dân, Tiên tri, Bảo vệ: **12/12 = 0.000**. Đối chứng: hai màn khác nhau (chưa chọn | đã xác nhận) 0.768; cặp khi đang giữ 0.58–2.41.
- Tương tác giữ-thẻ (chuột thật qua CDP): 11/11 — Sói đã xác nhận không đổi được khi không giữ, đổi được khi vừa giữ vừa chạm (mất xác nhận, thẻ vẫn mở, khung bầy báo chưa thống nhất); Tiên tri đã xác nhận không đổi được; ô không hợp lệ không chọn, lý do chỉ hiện khi giữ; Bảo vệ tự che được.
- **Ván thật** 7 cửa sổ (`localhost`, `127.0.0.1`, `a`–`e.localhost`), bản build production, bot qua CDP đọc vai bằng cách giữ thẻ. Bản build cuối:
  - Ván Dân thắng (11/11): Đêm 1 hai Sói chọn khác nhau → chạy đủ 20 s (20 265 ms) → hoà "Ngẫu nhiên"; reload một cửa sổ giữa Đêm 1 → khôi phục đúng lựa chọn, "Đã xác nhận" và đồng hồ (0:10 = 0:10); đóng cửa sổ chủ phòng giữa Đêm 2 (một người không bấm) → chuyển phase ở 22 753 ms = 20 000 + 250 + 2 500 (máy khác tiếp quản), mở lại chủ phòng chơi tiếp; Dân thắng ở cả 7 cửa sổ.
  - Ván Sói thắng (9/9): 3 Sói, "Sói hoà phiếu: Không cắn"; Đêm 1 hoà → không cắn; Đêm 2 đa số 2–1 → cắn; cả hai đêm chạy đủ 20 s; Sói thắng ở cả 7 cửa sổ.
  - Lệch phase giữa các cửa sổ lớn nhất **139 ms / 123 ms** (≤ 1 s). 0 lần gửi lỗi, 0 lỗi JS / `console.error`.
  - Một lần chạy trước còn phủ E12 trong ván thật (Sói duy nhất không chọn → "Không Sói nào chọn").
- Phòng thử: 6 phòng tạo, 6 phòng xoá bằng nút của chủ phòng.

**Việc chuyển sang GĐ2**
- Xoá `GD1_DISABLED_ROLES`, `GD1_DISABLED_PHASES` và phần ép Phù thủy / Thợ săn = 0 trong `lobbyCounts`.
- `resolveNightPhase` hiện bỏ qua khi engine trả `night-witch`; `PhaseView` hiện "Bước này có ở GĐ2" cho `night-witch` / `hunter`. `afterDawn` / `afterVoteResult` có thể trả `hunter` khi ván có Thợ săn.
- Hồn ma (`ghostsSeeAll`), "Cho rời làng", màn "Luật chơi", nhật ký đầy đủ.
- Bot ván thật nằm ở scratchpad của session GĐ1 (`game.mjs`, `bot.js`, `pairs.mjs`, `held.mjs`, `wwshots.mjs`, `cdp.mjs`, `grid.mjs`); cách làm ghi trong memory `avalon-ux-test-recipes`.

### 12.4 GĐ1 — review của nhạc trưởng (2026-10-11): **ĐẠT**

**Chạy lại nghiệm thu:**
- `npm run test:werewolf` 136/136.
- `tsc` sạch. eslint thư mục werewolf + `gameRegistry.ts` sạch. `npx eslint src/components/games` 29 lỗi / 29 cảnh báo, bằng baseline.
- `npm run build` exit 0.
- Phần Avalon chỉ đổi dòng import (+1 dòng ghi chú). 5 hook là `git mv` nguyên vẹn (rename 100%).

**Đọc code:**
- `useWerewolf` gọi engine cho mọi quyết định, mỗi bước ghi đúng một CAS. `expect` đúng bảng mục 4 phần GĐ1, kèm `deaths` ở mọi lần chuyển. `updateInPhase` kiểm cả `round`.
- `WerewolfBoard`: timer ở mọi máy, chủ phòng trước, máy khác +2,5 s; chưa đủ vai (`ready`) thì không quyết; chỉ kick ở sảnh; rời giữa ván không xoá doc.
- `startGame` là một transaction duy nhất. `resetRoom` bỏ `phase` nên CAS `{ phase: null }` của ván sau vẫn khớp.
- Màn Đêm ①: khi không giữ, chữ / lưới / nút / dòng xác nhận giống nhau với mọi vai. Bầy Sói, kết quả soi, lý do chạm sai chỉ render khi giữ. "Vai của tôi" cũng là thẻ giữ.

**Bằng chứng của người thực thi:**
- Đã xem ảnh 375px (sảnh, xem vai, đêm, bình minh, thảo luận, bỏ phiếu) và `checks.json` của hai ván thật (Dân thắng 11/11, Sói thắng 9/9).
- Cặp ảnh riêng tư 12/12 = 0.000.
- Giao diện mới ở mức tối thiểu, đúng phạm vi GĐ1.

**Quyết định (người dùng, 2026-10-11):**
- Sửa adapter `casGameState` ở đầu GĐ2 (bước 0 của "Bổ sung cho GĐ2").
- Giữ nhãn "cân" khi |điểm| ≤ 2.
- Dân làng tự tính, không có stepper: nhạc trưởng chấp nhận (ghi vào §4.4 và rules §8.1).

**Đã biết, chấp nhận:** Sói đổi lựa chọn sau khi Xác nhận thì dòng xác nhận của Sói đó đổi (chỉ Sói làm được, phải giữ thẻ). Xem mục 8 của "Bổ sung cho GĐ2".

**Chuyển sang GĐ2:** "Bổ sung cho GĐ2" ở §7.

### 12.5 GĐ2 — ghi chú của người thực thi (2026-10-12)

**Commit** (đều trên `dev-werewolf`, chưa push; điểm bắt đầu `fe0343a0`):
1. `35894afc` `fix(storage)`: `firebaseAdapter.casGameState` chỉ `tx.update(roomRef, …)` khi `patch` có khoá hoặc có `status`; vẫn đọc doc phòng để kiểm `expected`. Một dòng ghi chú trong `IGameStorage.ts`. Chữ ký không đổi.
2. `701f1009` bỏ phần tạm GĐ1 (`GD1_DISABLED_ROLES`, `GD1_DISABLED_PHASES`, ép Phù thủy / Thợ săn = 0, nhãn "GĐ2") + Đêm ② (Phù thủy).
3. `b6ab022f` Thợ săn.
4. `99cc7252` Cho rời làng, hồn ma, lộ vai khi chết (rà lại), màn "Luật chơi", `LogList` dùng chung.
5. `c4c0944f` +2 test engine: bình còn nguyên khi người được cứu / bị độc rời làng giữa Đêm ② (rules §5.5).
6. `3f13ff03` sửa lỗi bot ván thật phát hiện: nút thời gian "Thợ săn" trùng `aria-label` với nút vai Thợ săn; thêm `data-ww-role-tag`.
7. Commit docs này: §12.

**Đã làm**
- **Đêm ①**: `resolveNightPhase` nhận nhánh `night-witch` của `afterNight`, ghi `attack` + `log`, `expectPlayerData` = `nightPick` của mọi người còn sống + `guardLast` của Bảo vệ (đúng bảng mục 4 phần GĐ1).
- **Đêm ② → Bình minh** (`resolveWitchPhase`): `afterNightWitch`; `expect { deaths, attack }`, `expectPlayerData` = `witchPick` của mọi người còn sống, `nightPick` + `guardLast` của Bảo vệ, `potions` của Phù thủy; `playerData` ghi `potions` và `guardLast` mới cùng transaction. Kết thúc sớm bằng `witchDone`. Lựa chọn ghi `gameData.witchPick` (có `round`), đọc qua `pickFor`, ghi qua hàng đợi + chống đụng như Đêm ①.
- **`WitchPanel`**: không giữ thì màn giống hệt nhau (câu "Phù thủy dùng bình. Mọi người đoán Sói nhắm ai rồi bấm Xác nhận.", lưới mọi người còn sống, nút Xác nhận bấm được cả khi chưa chọn, dòng Chưa / Đã xác nhận). Chạm lưới khi không giữ = đoán (`guessId`; với Phù thủy chỉ là ô sáng, engine bỏ qua). Phù thủy giữ thẻ thấy "Sói nhắm: X" / "Đêm nay Sói không cắn ai", nút **Cứu X** trong thẻ, và **vừa giữ thẻ vừa chạm người ở lưới để độc** (chạm lại = bỏ độc; có nút "bỏ" trong thẻ). Kiểm bằng `validateWitchPick`, lý do lỗi (`WITCH_PICK_ERROR_TEXT`) chỉ hiện trong thẻ. Dấu "độc" trên ô chỉ hiện khi đang giữ.
- **`HunterPanel`**: Thợ săn chọn ô rồi "Bắn {tên}" / "Không bắn" (hộp xác nhận); lần bấm gọi thẳng CAS `afterHunter(table, round, state.hunter, shotId)` với `expect { hunter, deaths }`; thua CAS thì báo "Hết giờ — lượt bắn đã qua". Người khác thấy "Thợ săn {tên} đang ngắm… Sau đó …" + đồng hồ. Timer `hunter` (`timeouts.hunter`), hết giờ = `afterHunter(…, null)`. `PHASE_STATUS.hunter = 'day'` (đã đúng từ GĐ1).
- **Cho rời làng** (`leaveVillage`): menu ⋯ của chủ phòng giữa ván → "Cho rời làng…" → danh sách người còn sống (trừ chính chủ phòng) → hộp xác nhận. Một `casGameState` riêng, **không** qua `advance` / `applyStep`: `expected { phase, phaseStartedAt, deaths }`, patch `{ deaths, log }`; `applyLeave` có `winner` thì thêm `phase: 'end'`, `phaseStartedAt`, `winner`, `endReason`, `hunter: null` và `status: 'end'`. Board dùng `leaveVillage` mới nhất lúc chủ phòng bấm xác nhận (ref), vì hộp thoại có thể mở qua vài lần đổi phase.
- **Hồn ma** (`ghostSeesAll`): người chết (kể cả người rời làng) thấy vai trên mọi ô / danh sách (`shownRole`), khung "Hồn ma" (`GhostPanel`) với lựa chọn Đêm ① / Đêm ② của mọi người theo thời gian thực và "Diễn biến ván đến giờ". Tắt thì chỉ thông tin công khai + vai của mình. Người còn sống không bao giờ render các phần này.
- **Lộ vai khi chết**: mọi chỗ hiện vai đi qua `shownRole` (Bình minh, Kết quả, danh sách Thảo luận, các lưới). Tắt thì chỉ lật vai ở màn kết thúc.
- **Màn "Luật chơi"** (`ui/RulesDialog`): trong menu ⋯, ai cũng mở được, kể cả ở sảnh. Tóm tắt rules §1–§3, vòng chơi §5, §9; tên vai + câu từ `ROLE_NAME` / `ROLE_BLURB`; thêm "Cài đặt của phòng" (4 luật).
- **"Diễn biến ván" đầy đủ**: engine đã ghi cứu, độc, che, soi, đoán, nghi, chết, phiếu, Thợ săn, rời làng; `LogList` dùng chung cho màn kết thúc và hồn ma. Danh sách vai cuối ván ghi "Đêm N" cho người rời làng lúc đêm (theo `during` của mục `left`).
- **`WerewolfPreview`**: bàn 9 người đủ 6 vai; thêm màn Đêm ② (6), Thợ săn (2), Bình minh có Thợ săn chờ bắn, hồn ma bật / tắt (4), lộ vai tắt; menu Preview có "Cho rời làng…" và "Luật chơi".

**Lệch kế hoạch / cách hiểu cần nhạc trưởng (và người dùng) xác nhận**
1. **Thợ săn đã chết nhưng chưa bắn thì chưa phải hồn ma** (`shotPending` trong `panel/shared.tsx`): từ lúc chết (bị cắn, bị treo, bị độc khi luật cho phép) tới khi có mục nhật ký `hunter` (bắn / không bắn / hết giờ), Thợ săn không thấy vai trên ô hay khung hồn ma, kể cả khi "Hồn ma xem hết vai" bật. Không làm vậy thì ở Bình minh / Kết quả phiếu Thợ săn đã thấy hết vai rồi mới bắn. rules §6 chưa nói ca này — **đề xuất thêm một dòng vào rules §6** (chưa sửa rules.md vì cần người dùng đồng ý).
2. **Xác nhận ở Đêm ② là chốt với mọi người** (kể cả Phù thủy), giống Tiên tri / Bảo vệ ở Đêm ①. Brief không nói Phù thủy có đổi được sau khi Xác nhận không.
3. **Chủ phòng không tự cho mình rời làng** (danh sách bỏ chính chủ phòng): tránh bấm nhầm; chủ phòng bỏ về thì cả bàn mất người điều khiển menu.
4. **Hồn ma không phải giữ để xem** (làm đúng brief: vai hiện thẳng trên ô). Màn của người chết vì vậy lộ hết vai nếu người sống ngồi cạnh liếc sang (phép lịch sự §9 đã dặn không nhìn màn hình người khác). Nếu muốn chặt hơn, GĐ3 có thể đưa khung hồn ma vào thẻ giữ.
5. **Cách thao tác của Phù thủy**: Cứu = nút trong thẻ (ngón thứ hai, máy tính: giữ Space + bấm chuột); Độc = vừa giữ thẻ vừa chạm ô (giống Sói đổi lựa chọn ở GĐ1). Nút trong thẻ là `InHoldButton` (chặn `pointerdown` / `pointerup` lan lên thẻ và `window`, không lấy tiêu điểm) nên thẻ không đóng. `confirmWitch` trả `{ outcome, error }` thay vì ném lỗi khi lựa chọn không còn hợp lệ (lý do hiện trong thẻ); chỉ ném khi gửi không được.
6. Thêm file ngoài §4.1: `panel/GhostPanel.tsx`, `ui/RulesDialog.tsx` (`panel/WitchPanel.tsx`, `panel/HunterPanel.tsx` có trong §4.1). Helper mới trong `state.ts`: `witchPicksOf`, `holderOf`, `potionsOf`.
7. **Lỗi tìm ra nhờ bot**: nút thời gian bước "Thợ săn" và nút số lượng vai "Thợ săn" cùng `aria-label` "Bớt / Thêm Thợ săn" → bot bấm nhầm (giảm số Thợ săn). Nút thời gian giờ là "Bớt / Thêm thời gian <bước>". Ai viết bot cho sảnh từ nay dùng tên mới.
8. Thuộc tính cho kiểm thử: `data-ww-witch`, `data-ww-attack` (chỉ trong thẻ đang giữ), `data-ww-hunter`, `data-ww-ghost`, `data-ww-ghost-live`, `data-ww-dead-note`, `data-ww-tile-role`, `data-ww-role-tag`, `data-ww-leave-list`, `data-ww-rules`.

**Kiểm thử (§11 + nghiệm thu GĐ2)**
- `npm run test:werewolf` 138/138 (23 nhóm, +2). `npx tsc --noEmit` sạch. `npx eslint src/components/games/werewolf` sạch; `npx eslint src/components/games` 29 lỗi / 29 cảnh báo = baseline; `firebaseAdapter.ts` 2 lỗi / 2 cảnh báo **có sẵn từ trước** (y hệt bản `fe0343a0`, không ở đoạn đã sửa). `npm run build` qua (đã xoá trang harness và `.next`). Engine không import react / firebase / `@/`.
- **Harness** (trang tạm, đã xoá): Phù thủy giữ thẻ + chạm 15/15 (chạm không giữ chỉ là đoán, không bao giờ độc; giữ + chạm = độc, chạm lại = bỏ; Cứu trong thẻ, thẻ không đóng; E5 / E6 / hết bình báo lý do trong thẻ; xác nhận không cần chọn; đã xác nhận thì khoá); menu 5/5 (Luật chơi ở sảnh + trong ván, "Cho rời làng…" chỉ chủ phòng, danh sách = người sống trừ mình); hồn ma theo từng màn đúng như thiết kế (10 màn). Ảnh 375px: 36 màn, không cuộn ngang, 0 lỗi console; 1440px: 6 màn (vẫn một cột giữa — GĐ3).
- **Cặp ảnh riêng tư** (bản build production, cùng `start`, chụp cùng lúc, không giữ, thu 10%, trung bình |Δ|): Đêm ① chưa chọn / đã chọn / đã xác nhận + Xem vai, Sói so với 5 vai còn lại: **20/20 = 0.000**; Đêm ② chưa chọn / đã chọn (Phù thủy: cứu + độc) / đã xác nhận / Sói không cắn, Phù thủy so với 5 vai còn lại: **20/20 = 0.000**. Đối chứng: hai màn khác nhau 0.768 (Đêm ①) và 5.347 (Đêm ②); Phù thủy | Dân **khi đang giữ** 4.367.
- **Ván thật** (bản build production, CDP, mỗi cửa sổ một origin `localhost`, `127.0.0.1`, `a`–`h.localhost`; bot nhận việc theo từng bước từ bộ điều phối; mỗi kịch bản một lần chạy ≤ 2,5 phút; phòng thử xoá bằng nút của chủ phòng):

  | Kịch bản | Cửa sổ | Kết quả | Phủ |
  |---|---|---|---|
  | heal | 9 | 17/17 | Bảo vệ che X + Sói cắn X + Phù thủy cứu X → bình yên (E1: Phù thủy vẫn thấy "Sói nhắm: X"; E2: đêm sau thẻ ghi "Đã dùng bình cứu"); Phù thủy độc Sói; người chết công bố theo thứ tự ghế; nhật ký che / cứu / độc / đoán / nghi / soi; Dân thắng |
  | hunterbite | 9 | 15/15 | Thợ săn bị cắn → bước Thợ săn ở cả 9 cửa sổ, người khác thấy "đang ngắm" → bắn Sói → Thảo luận (E16); Phù thủy độc Sói cuối → Dân thắng ở bình minh, không có bước Thợ săn thứ hai (E20) |
  | hunterhang | 8 (+1 Thợ săn, "Không cắn") | 15/15 | Sói hoà → Đêm 1 chạy đủ 20,26 s, đêm bình yên (E11); Thợ săn bị treo → bước Thợ săn → bắn Sói → Đêm 2 (E18) |
  | hidden | 10 (lộ vai tắt, hồn ma tắt) | 13/13 | Ba Sói chọn ba người → hết giờ → bốc ngẫu nhiên đúng một người trong ba (E11); lấy mẫu liên tục mọi cửa sổ: không cửa sổ nào thấy vai / khung hồn ma trước màn kết thúc; kết thúc lật vai đủ 10 người |
  | ghostleave | 9 | 19/19 | Hồn ma thấy vai 9 người + lựa chọn đêm theo thời gian thực, người sống chỉ thấy vai người đã chết; cho rời làng giữa Đêm 2: cả 9 cửa sổ giữ nguyên `phaseStartedAt`, đồng hồ chạy tiếp; người rời làng thấy màn người chết; Thợ săn rời làng → không có bước Thợ săn, Thảo luận giữ đồng hồ; Sói cuối rời làng → Dân thắng ngay (E25). Một lần chạy khác chủ phòng là Sói cuối → bị treo → Dân thắng, 19/19 |
  | hunterpoison | 9 ("bị độc vẫn bắn" bật) | 12/12 | Phù thủy độc Thợ săn → vẫn được bắn (E17); Thợ săn chờ bắn không thấy hồn ma ở Bình minh và lúc ngắm, bắn xong mới thấy |
  | contention | 7 | 9/9 | Cả 7 người chọn ở +2,5 s và xác nhận ở +3,3 s cùng lúc: **0/15 commit bị từ chối**, Đêm ① kết thúc ở 3,77 s; Đêm ② cả bàn đoán + xác nhận cùng lúc: 0/15, 2,74 s |
  | (đối chứng) contention, adapter **cũ** | 7 | — | Cùng kịch bản, build tạm với adapter của `fe0343a0`: **7/22 và 10/25 commit bị từ chối**, Đêm ① 6,51 s, Đêm ② 7,19 s (không có banner vì đã có `retryOnContention`) |
  | Avalon | 5 | 8/8 | Ván đủ tới kết thúc (Sát Thủ đâm): 3 quest, 7 lá bài; mỗi `quest-play` kết thúc sớm sau 1,3–1,8 s (Board vẫn đọc `players` nên không cần doc phòng đổi); 0 banner, 0 lỗi JS |

  - Mọi kịch bản Ma Sói: 0 banner "Không gửi được", 0 lỗi JS / `console.error`, mỗi lần chuyển phase được mọi cửa sổ thấy đúng một token (một lần ghi thắng).
  - **Lệch phase giữa các cửa sổ**: trong các lần chạy cuối: heal 502 ms, hunterbite 98, hunterhang 102, hidden 702 (10 cửa sổ), ghostleave 97, hunterpoison 122, contention 94, Avalon ≤ 220. Lúc Chrome thử nghiệm dùng QUIC (h3, mặc định), thỉnh thoảng **một** cửa sổ trong lần chạy nhận snapshot Firestore chậm 0,4–2,1 s (độ trễ `Runtime.evaluate` của cửa sổ đó vẫn ~40 ms, cửa sổ chậm đổi theo lần chạy); với `--disable-quic` (h2) mọi bước ≤ 260 ms. Đây là đường truyền của môi trường thử (10 danh tính cùng một hồ sơ Chrome), không phải logic ván: CAS vẫn chỉ cho một lần ghi thắng và cửa sổ chậm theo kịp.
  - Trong ván, ~15–20 % commit bị từ chối rồi tự thử lại thành công: đó là `acks` / phiếu ngày (vẫn ghi doc phòng, cả bàn bấm trong cùng 300 ms) và các CAS chuyển phase thua — đúng thiết kế (giữ `retryOnContention`).
  - Phòng thử: mọi phòng tạo ra đều đã xoá (hai lần bot dừng giữa chừng: xoá lại bằng cách mở chủ phòng trên cùng origin).
- Bot và kịch bản: scratchpad `495f146f-6914-424a-afdc-bdb5d3450d29/scratchpad` (`game2.mjs` + `bot2.js` cho Ma Sói, kịch bản `heal | hunterbite | hunterhang | hidden | ghostleave | hunterpoison | contention`; `avgame.mjs` + `avbot.js` cho Avalon; `pairs.mjs`, `witchheld.mjs`, `menus.mjs`, `ghostcheck.mjs`, `wwshots.mjs`, `grid.mjs`, `cleanup.mjs` / `checkroom.mjs`; trang harness ở `harness/wwtest`).

**Việc chuyển tiếp**
- Nhạc trưởng / người dùng xác nhận các mục 1–4 ở trên (đặc biệt mục 1: ghi vào rules §6).
- Sau review: **mốc PR #1** (push `dev-werewolf`, PR → `main`).
- GĐ3: màn 1440px (vẫn một cột), dải nền thanh nút đáy, cân nhắc đưa khung hồn ma vào thẻ giữ.

### 12.6 GĐ2 — review của nhạc trưởng (2026-10-16): **ĐẠT**

**Chạy lại nghiệm thu:**
- `npm run test:werewolf` 138/138.
- `tsc` sạch. eslint werewolf + `gameRegistry.ts` sạch. `npx eslint src/components/games` 29 / 29 = baseline. `firebaseAdapter.ts` 2 lỗi / 2 cảnh báo có sẵn (dòng 581–582, ngoài đoạn sửa).
- `npm run build` exit 0.

**Đọc code:**
- Adapter `casGameState`: đúng bước 0. Vẫn đọc doc phòng để kiểm `expected`, chỉ bỏ ghi khi `patch` rỗng và không có `status`. Chữ ký không đổi.
- `resolveNightPhase` (nhánh `night-witch`) và `resolveWitchPhase`: `expect` / `expectPlayerData` / `playerData` đúng bảng.
- `shootHunter` / `hunterTimeout`: CAS `expect { hunter, deaths }`.
- `leaveVillage` là CAS riêng, giữ nguyên `phaseStartedAt`. Có `winner` thì sang `end`. Board dùng ref để lấy bản mới nhất.
- `WitchPanel`: khi không giữ, màn giống hệt; chạm lưới khi không giữ chỉ là đoán, độc chỉ khi đang giữ; dấu "độc" chỉ hiện khi giữ; ai cũng Xác nhận được mà không cần chọn.
- `shotPending` đúng ý luật mới.

**Bằng chứng của người thực thi:**
- Đã xem bảng ảnh 375px (Đêm ② các trạng thái, Thợ săn, hồn ma, kết thúc).
- 7 kịch bản ván thật + ván Avalon đạt. Cặp ảnh riêng tư 40/40 = 0.000.
- Adapter trước / sau: 7/22 và 10/25 → 0/15 commit bị từ chối.

**Quyết định (người dùng, 2026-10-16), đã ghi vào `rules.md`:**
- Thợ săn chưa xong lượt bắn thì chưa phải hồn ma (rules §6).
- Thông tin của hồn ma chỉ hiện khi giữ thẻ (rules §6), làm ở **GĐ2b trước PR #1** (§7b).
- Nhạc trưởng chấp nhận:
  - Xác nhận ở Đêm ② là chốt với mọi người (rules §5.4);
  - chủ phòng không tự cho mình rời làng (rules §7).
- Sau GĐ2b, nhạc trưởng push `dev-werewolf` và mở PR #1 vào `main` (người dùng đồng ý, người dùng tự merge).

### 12.7 GĐ2b — ghi chú của người thực thi (2026-10-16)

**Commit** (trên `dev-werewolf`, chưa push; điểm bắt đầu `c7eb0e2a`):
1. `ad5dd181` code: `GhostPanel` thành thẻ giữ của người chết, `shared.tsx`, các panel, `WerewolfBoard`, `WerewolfPreview`.
2. Commit docs này: §12.

**Đã làm**
- **Ô và danh sách không còn hiện vai của hồn ma.** Bỏ `shownRole` và `ghostSeesAll`; mọi chỗ hiện vai (lưới Đêm ① / Đêm ② / Thợ săn / Bỏ phiếu, danh sách Thảo luận, Bình minh, Kết quả phiếu) chỉ còn `revealedRole`, tức vai đã lộ công khai khi chết (luật "Lộ vai khi chết"). Người còn sống không bị đổi gì.
- **Một thẻ giữ cho người chết** (`GhostPanel`, `data-ww-ghost-card`), render ở mọi bước trừ màn kết thúc (`hasGhostCard`: đã chết kể cả rời làng và `phase ≠ end`). Gồm Đêm ①, Đêm ②, Bình minh, Thợ săn, Thảo luận, Bỏ phiếu, Kết quả.
- **Khi không giữ**: cùng một câu `DeadNote` ("Bạn đã chết. Ngồi im lặng, không ra hiệu đến hết ván nhé.", bỏ nhánh `ghost` / `plain`), cùng một thẻ cao cố định "Nhấn giữ để xem / Chỉ mình bạn xem được.", dù vai gì, dù hồn ma bật hay tắt. Không có DOM hồn ma nào được render.
- **Khi giữ** (`ghostView`):
  - `all` (luật bật, Thợ săn đã bắn hoặc không phải Thợ săn): tờ "Hồn ma" gồm lựa chọn của bước (Đêm ①: bầy Sói + từng người; Đêm ②: Sói nhắm + từng người, Phù thủy kèm bình còn), vai của mọi người, "Diễn biến ván đến giờ".
  - `own` (luật tắt): `MyRoleBody` (vai của mình, đồng đội nếu là Sói) + một dòng giải thích luật.
  - `wait` (luật bật nhưng Thợ săn chưa xong lượt bắn, `shotPending` giữ nguyên): như `own`, thêm dòng "Bắn xong (hoặc bỏ lượt), bạn mới xem được vai của mọi người."
- **Cách trình bày** (plan §7b để người thực thi chọn):
  - Tờ là một lớp `fixed` phủ lên đáy màn hình (`max-h` 88 % chiều cao, rộng ≤ 32 rem, căn giữa) nằm trong thẻ giữ. Ngón đang giữ vẫn nằm trên thẻ nhờ pointer capture của `useHold`. Thẻ hiện "Đang giữ — thả tay là che lại."
  - Ban đêm gộp "vai" và "lựa chọn" thành một danh sách theo ghế ("Minh (Ma Sói): cắn Tú ✓"; người chết gạch tên, mờ). Các bước khác dùng lưới vai hai cột.
  - **Nhật ký**: chỉ vòng hiện tại và vòng trước, tối đa 8 mục mới nhất (`MAX_LOG_ENTRIES`), kèm dòng "Các dòng cũ hơn: xem đầy đủ ở màn kết thúc." nếu có bớt. `LogList` thêm tham số `compact` (chỉ dùng trong tờ này; màn kết thúc giữ nguyên).
  - Cao nhất đo được ở 375 px, 9 người: Đêm ① 438 px, Đêm ② 456 px, nhật ký dài 482 px, Thảo luận / Bỏ phiếu 337 px. Vừa khung ở 375×667 (cho phép 587 px) và 375×812; ở khung thấp hơn thì tờ cuộn được.
- **Ngón thứ hai chạm tờ không làm thẻ đóng**: `useHold` đóng thẻ khi `pointerup` / `pointercancel` / `lostpointercapture` nổi bọt lên thẻ. Tờ chặn cả ba (và `pointerdown`) bằng `stopPropagation`. Thiếu `lostpointercapture` là lỗi tìm ra khi thử hai ngón thật qua CDP: ngón thứ hai nhả thì thẻ đóng.
- **Cuộn tờ** khi dài hơn khung: kéo lên / xuống bằng chính ngón (hoặc chuột) đang giữ thẻ, hoặc bánh xe. Tờ đặt `touch-action: none`.
- **`WerewolfPreview`**: cảnh người chết ở Bình minh / Thợ săn / Bỏ phiếu / Kết quả / nhật ký dài (`ghost-dawn`, `ghost-hunter`, `ghost-vote`, `ghost-result`, `ghost-long`), tham số `rules` để bật / tắt hồn ma và lộ vai khi chụp. Nhật ký của cảnh người chết có mục "Thợ săn đã không bắn" khi người xem là Thợ săn (thành hồn ma thật). Dấu ✓ công khai và phiếu của các cảnh này nằm ở ghế cố định, không đổi theo vai người xem.
- Thuộc tính cho kiểm thử: `data-ww-ghost-card` (thẻ, luôn có với người chết), `data-ww-ghost="all|wait|own"` (tờ, chỉ khi giữ), `data-ww-ghost-role`, `data-ww-ghost-roles`, `data-ww-ghost-live`. `data-ww-dead-note` không còn giá trị `ghost` / `plain`.

**Lệch kế hoạch / cần nhạc trưởng biết**
1. **Tờ `fixed` thay vì thẻ giãn ra tại chỗ.** Thẻ ở cuối trang, giãn xuống sẽ tràn khỏi màn hình mà ngón đang giữ không cuộn được. Đánh đổi: tờ nằm ở đáy màn hình, tách khỏi vị trí thẻ.
2. **Kéo bằng ngón để cuộn chưa kiểm được trên cảm ứng thật.** Trình giả lập cảm ứng của CDP không tôn trọng `touch-action` khi trang cuộn được (kể cả trang tối thiểu 10 dòng HTML): một ngón kéo là kết thúc luồng con trỏ. Nên không dựa vào việc cuộn: sau khi gộp danh sách, tờ vừa khung từ 375×667 trở lên. Cuộn bằng chuột kéo và bánh xe đã kiểm (6/6); chạm của ngón thứ hai kiểm bằng CDP (3/3). Nếu kéo bằng ngón không chạy trên máy thật thì chỉ mất tính năng cuộn ở màn hình rất thấp, hồn ma giữ lại là xem lại.
3. **Cặp ảnh riêng tư ở bước Thợ săn bỏ biến thể "Thợ săn đã bắn".** Người xem là Thợ săn ở bước đó chính là người đang bắn (nút Bắn / Không bắn, công khai theo thiết kế), không thể đã bắn xong. Còn 5 cặp: Dân / Tiên tri × bật, Sói / Dân / Tiên tri × tắt.
4. **Cặp ảnh Thảo luận chạy với "Lộ vai khi chết" tắt.** Bật thì danh sách Thảo luận hiện vai đã lộ của chính người chết, khác nhau theo vai: đúng luật (công khai), không phải rò rỉ. Đối chứng (bật): Sói | Dân 0.197.
5. Câu hồn ma trong `DeadNote` ("Hồn ma thấy vai và lựa chọn của mọi người…") bỏ hẳn, thay bằng câu chung. Hồn ma bật hay tắt chỉ khác nhau khi giữ thẻ.
6. Không động vào luật, engine (138 test không đổi), `rules.md`, logic chuyển phase hay `useWerewolf`. Không thêm dependency.

**Kiểm thử (§11 + nghiệm thu §7b)**
- `npm run test:werewolf` 138/138. `npx tsc --noEmit` sạch. `npx eslint src/components/games/werewolf` sạch; `npx eslint src/components/games` 29 lỗi / 29 cảnh báo = baseline. `npm run build` qua (đã xoá trang harness `src/app/wwtest`, `rm -rf .next` trước khi build). Engine không import react / firebase / `@/`.
- **Cặp ảnh riêng tư của người chết, không giữ** (bản build production, 375×812, cùng `start`, chụp cùng lúc, thu 10 %, trung bình |Δ|): 7 bước (Đêm ①, Đêm ②, Bình minh, Thợ săn, Thảo luận, Bỏ phiếu, Kết quả) × Sói / bật so với Dân, Tiên tri, Thợ săn (đã bắn) / bật và Sói, Dân, Tiên tri, Thợ săn / tắt, kèm kiểm DOM mỗi bước (thẻ đóng, không DOM hồn ma, đúng 1 thẻ, không vai trên ô): **54/54 = 0.000**. Đối chứng: giữ thẻ, sói bật | sói tắt 10.459; giữ | không giữ 11.208.
- **Ảnh 375px khi đang giữ** (`held-sheet-375.png`): hồn ma bật (Đêm ①, Đêm ②, nhật ký dài: danh sách vai + lựa chọn đêm + nhật ký đọc được, không cuộn ngang), hồn ma tắt (chỉ vai của mình, Sói thấy đồng đội), Thợ săn chưa bắn.
- **Hồi quy giao diện người còn sống**: 26 cảnh của người còn sống so với ảnh 375px của GĐ2 (`2bf4a5da`): 0.067–0.165 (chỉ chữ đồng hồ). Ngoại lệ có chủ ý: cảnh người xem là Thợ săn đã chết (≈ 3.3) và các cảnh người chết. Màn kết thúc khác một dòng nhật ký chỉ vì ảnh cũ chụp từ dữ liệu giả cũ.
- **Ván thật** (bản build production, CDP, mỗi cửa sổ một origin; bộ lấy mẫu riêng tư mới chạy ~mỗi 120 ms trên mọi cửa sổ: vai chỉ hiện trên người đã chết, không nội dung thẻ khi không giữ, người còn sống không có thẻ của người chết; đối chứng âm bằng cách tiêm rò rỉ giả: bắt được cả hai loại):

  | Kịch bản | Cửa sổ | Kết quả | Phủ |
  |---|---|---|---|
  | ghostleave | 9 | **23/23** | Thẻ đóng của người chết: không DOM hồn ma, đúng 1 thẻ, đúng `DeadNote` chung, chỉ 1 vai công khai (của chính mình); giữ thẻ: vai ĐÚNG của cả 9 người (so với vai thật) + nhật ký; thả tay thì che hẳn; Đêm 2 giữ thẻ thấy "Bầy Sói đã thống nhất: …" theo thời gian thực; người còn sống không có thẻ; cho rời làng giữa Đêm 2 (đồng hồ không reset): người rời làng cùng thẻ, giữ thấy 9 vai; E25 Thợ săn rời làng; Sói cuối bị treo → Dân thắng. 2 501 lần lấy mẫu, 0 vi phạm. 0 banner, 0 lỗi JS, lệch phase lớn nhất 94 ms |
  | hunterpoison | 9 ("bị độc vẫn bắn" bật) | **12/12** | Thợ săn chết chưa bắn (Bình minh, đến lượt bắn): thẻ đóng không lộ gì, giữ chỉ thấy vai của mình (`wait`); người chết khác giữ thấy 9 vai; bắn xong thì giữ thấy 9 vai. 511 lần lấy mẫu, 0 vi phạm |
  | hidden | 10 (lộ vai tắt, hồn ma tắt) | **15/15** | Người chết: thẻ đóng không gì, giữ chỉ vai của mình (`own`, không danh sách vai); không cửa sổ nào thấy vai nào trước màn kết thúc. 5 095 lần lấy mẫu, 0 vi phạm. Lệch phase 633 ms (QUIC, như GĐ2) |
  | (hồi quy) hunterhang, heal | 8, 9 | 15/15, 17/17 | Chạy trên bản build trước khi gộp danh sách của tờ; phần người còn sống không đổi từ đó. Lệch phase lớn nhất 645 ms, 86 ms |

  Phòng thử: mọi phòng đã xoá bằng nút của chủ phòng.
- **Cử chỉ** (CDP, `multitouch.mjs` / `mousedrag.mjs`): ngón thứ hai chạm tờ không đóng thẻ, nhả ngón giữ thì che hẳn (3/3); chuột: giữ, kéo lên / xuống cuộn tờ, bánh xe cuộn, thả thì che (6/6).
- Bot và kịch bản: scratchpad `3572bd53-a259-4a6e-9358-e027f64fe8d5/scratchpad` (`game2.mjs` đã đổi kịch bản `ghostleave`, `hunterpoison`, `hidden` + bộ lấy mẫu riêng tư; `ghostpairs.mjs`, `ghostheld.mjs`, `multitouch.mjs`, `mousedrag.mjs`, `samplercontrol.mjs`, `regress.mjs`, `sheet.mjs`).

**Việc chuyển tiếp**
- Nhạc trưởng review `git diff c7eb0e2a..HEAD`, rồi push `dev-werewolf` và mở PR #1 (người dùng đã đồng ý).
- GĐ3: màn 1440 px (vẫn một cột), dải nền thanh nút đáy; tờ hồn ma dùng được lại khi thay giao diện (chỉ cần giữ ba điều: không DOM khi không giữ, chặn pointer nổi bọt lên thẻ, thẻ đóng giống hệt nhau).

### 12.8 GĐ2b — review của nhạc trưởng (2026-10-16): **ĐẠT** → mốc PR #1

**Chạy lại nghiệm thu:**
- `npm run test:werewolf` 138/138.
- `tsc` sạch. eslint werewolf sạch. `npx eslint src/components/games` 29 / 29 = baseline.
- `npm run build` exit 0.

**Đọc code:**
- `hasGhostCard` (đã chết, `phase ≠ end`) và `ghostView` (`all` / `wait` / `own`, giữ `shotPending`).
- Nội dung riêng của `GhostPanel` chỉ nằm trong `children` của `HoldCard`, nên không giữ thì không có DOM nào.
- `DeadNote` chỉ còn một câu.
- Mọi lưới / danh sách chỉ còn `revealedRole`.
- Tờ `fixed` chặn `pointerdown` / `pointerup` / `pointercancel` / `lostpointercapture` nổi bọt lên thẻ.
- Không đụng luật, engine, `useWerewolf`, giao diện của người còn sống.

**Bằng chứng của người thực thi:**
- Cặp ảnh của người chết khi không giữ 54/54 = 0.000.
- Ván thật `ghostleave` 23/23, `hunterpoison` 12/12, `hidden` 15/15, với bộ lấy mẫu riêng tư 0 vi phạm trên hơn 8 000 mẫu (đối chứng âm bắt được rò rỉ tiêm vào).
- Hồi quy giao diện người còn sống ≈ 0.

**Chấp nhận các lệch:**
- tờ `fixed` ở đáy màn hình;
- cặp ảnh bước Thợ săn bỏ biến thể "đã bắn";
- cặp Thảo luận chạy với lộ vai tắt.

**Còn mở, không chặn PR:** kéo bằng ngón đang giữ để cuộn tờ chưa kiểm trên cảm ứng thật. Tờ vừa khung từ 375×667, nên chỉ ảnh hưởng màn rất thấp. Kiểm khi chơi thật (GĐ5).

**Tiếp theo:** nhạc trưởng push `dev-werewolf` và mở PR #1 vào `main` (người dùng đồng ý 2026-10-16). Sau khi người dùng squash-merge: `git merge -s ours origin/main` trên `dev-werewolf` (§0), rồi GĐ3.

### 12.9 PR #1 (2026-10-16)
- PR huytt-it/board-game-app#63 (`dev-werewolf` → `main`), CI 2/2. Người dùng nhờ nhạc trưởng squash-merge: `main` = `b768f09f`.
- Tree của `main` trùng `dev-werewolf@bad4aea4` (diff rỗng). Đã chạy `git merge -s ours origin/main` trên `dev-werewolf` (`b7486a56`) và push.
- Tiếp theo: GĐ3a (§8, "Bổ sung cho GĐ3").

### 12.10 GĐ3a — ghi chú của người thực thi (2026-10-17)

**Commit** (trên `dev-werewolf`, chưa push; điểm bắt đầu `336349ec`):
1. `9867bcef` `refactor(games)`: `git mv` 15 icon game-icons.net + `gameIcon` từ `avalon/assets/icons/` sang `src/components/games/shared/icons/` (mặt trăng, quả cầu, lá phiếu, mắt, dấu tích, đồng hồ cát, chìa khoá, menu, đóng, thoát, xoá, sách, mất mạng, cảnh báo, đồng hồ). Avalon chỉ đổi đường import (`registry.ts` + dòng import `gameIcon` của 33 icon còn lại) và cột File của `CREDITS.md`, một dòng `README.md`. Kiểm: `tsc`, `npx eslint src/components/games` = mốc, mở `AvalonPreview` 6 màn (bảng phong cách, bỏ phiếu đội, sảnh, lộ vai ×2, đêm Phe Quỷ): mọi `svg.av-icon` vẽ được (37/37, 22/22, 3/3, 10/10, 10/10, 22/22).
2. `f35c2a70` `feat(werewolf): GĐ3a` — token, bộ UI nhỏ, icon, 2 cảnh, 4 màn mẫu, bảng phong cách.
3. Commit docs này: §12.

**Đã làm**
- **Token** (`werewolf.css`, chỉ `WerewolfBoard` import; Preview đi qua Board): `.ww-root { --ww-* }`.
  - Nền đêm: `--ww-ink #0c0e1c`, `--ww-glass-bg` (kính tối 84 %), `--ww-raised #1b1f33` (mặt nổi đặc), `--ww-raised-hi`, viền duy nhất `--ww-line`.
  - Chữ ánh trăng 3 mức (màu đặc): `--ww-text #e8eaf4` / `--ww-text-2 #b4b9cd` / `--ww-text-3 #959cb4` = 13,6 / 8,3 / 6,0 : 1 trên mặt nổi.
  - **Một màu nhấn**: đèn lồng `--ww-accent #eaa84e` (chữ mực trên nó 9,3 : 1) — nút chính, ô đang chọn, "Chưa xác nhận".
  - Màu phe, chỉ cho thông tin công khai: `--ww-wolf` (kiêm nguy hiểm / sắp hết giờ) + `--ww-wolf-light`, `--ww-village` + `--ww-village-light`. `--ww-moon` chỉ cho icon trang trí.
  - 3 bán kính (`full` / `xl` / `2xl`), thang chữ 12 / 14 / 16 / display ≥ 20, một tiêu đề display mỗi màn. Font tiêu đề **Grenze** (`assets/fonts.ts`, next/font, có subset `vietnamese`; chữ thân vẫn Inter). Vòng tiêu điểm chung màu nhấn. `prefers-reduced-motion`: tắt mọi animation, ẩn hạt hiệu ứng.
- **Bộ UI nhỏ**: `ui/Button` (primary / secondary / danger / ghost, cỡ md 44 / lg 52 px, `icon`; khoá = mặt nổi trung tính, không mờ màu nhấn), `ui/Panel` (kính + một viền; tone neutral / accent / wolf / village), `ui/Chip`. Trong `panel/shared.tsx`: `PhaseHeader` (display + đồng hồ dạng chip, đổi màu cảnh báo khi ≤ 10 s, `warn={false}` cho bước tự chạy), `PhaseLayout` (điện thoại xếp dọc; từ `lg` hai cột: "sân khấu" người chơi bên trái, tiêu đề + phần còn lại thành một khung kính 24 rem bên phải; thứ tự DOM giữ nguyên), `Avatar` (màu "giấy nhuộm" theo id, 10 màu cùng độ sáng, chữ trắng ≥ 5,7 : 1, không đỏ / xanh lá thuần), `PlayerTile` (mặt nổi đặc, không viền, ô chọn có vòng đèn lồng; giữ nguyên chặn `pointerup` / `mousedown`), `Seat` (ghế chỉ xem: avatar hoặc bia mộ, dòng phụ, dấu góc), `MeMark`, `RoleLine` / `RoleTag` (icon + vai đã lộ, màu phe), `HoldCard` (mặt nổi, icon mắt, nền như nhau khi giữ / không giữ), `InHoldButton`, `DeadNote`, `Dock` (dải mực ở điện thoại, nằm yên trong khung phải từ `lg`). `DealPanel`: `MyRoleBody` (huy hiệu vai trung tính, phe bằng chữ nhỏ), `DoneMark`.
- **Icon qua asset registry** (`assets/registry.ts`, `assets/WwIcon.tsx`, mỗi tên một nghĩa): 6 vai, `team-village`, `game`, `night`, `dawn`, `day`, `vote`, `hanged`, `dead`, `ghost`, `heal`, `poison`, `check`, `waiting`, `hold`, `host` + 8 icon giao diện. 14 icon mới tải từ game-icons.net **sau khi người dùng duyệt** (2026-10-17): wolf-head, farmer, checked-shield, cauldron, crossbow (Carl Olsen), village, wolf-howl, sunrise, sun, gibbet, tombstone, ghost, health-potion, poison-bottle; path làm tròn 1 chữ số (khác bản gốc ≤ 53 / ~100 000 điểm ảnh ở 512²). `assets/CREDITS.md`, `assets/README.md` (thay icon / lớp cảnh bằng ảnh: sửa một dòng).
- **Cảnh** (`scenes/`): `SceneBackdrop` (lớp `fixed` phía sau, crossfade 700 ms, đổi trong 1,5 s đầu sau khi mount thì hiện ngay; giảm chuyển động: đổi ngay, không hạt), `getScene(state)` (chỉ theo phase / phe thắng), `village.ts` (một bóng làng chung: nhà thờ, 10 mái nhà, cối xay gió ở rìa trái), 2 cảnh vẽ cắt giấy bằng hàm của `avalon/scenes/paper.tsx`:
  - **Làng ban đêm** (sảnh, xem vai, Đêm ①, Đêm ②): trời xanh tím, sao, trăng tròn bạc thấp sau tháp chuông, đồi, làng sáng đèn, bìa rừng hai bên (có đôi mắt ở rìa trái, chỉ màn rộng thấy). 17 hạt (sao, đom đóm, quầng đèn cửa sổ).
  - **Bình minh**: dải trời tím → cam ấm (đỉnh vẫn tối cho chữ), mặt trời nửa vành sau nhà thờ, mây mảnh, chim, khói bếp hai nhà, sương. 7 hạt bụi nắng.
  - Cảnh của các bước khác (`day`, `gallows`, `end-village`, `end-wolves`) là **placeholder** màu phẳng trong registry, GĐ3b vẽ.
  - Ở điện thoại, vật sáng không nằm sau chữ: trăng nằm sau thẻ giữ / nút, mặt trời dưới khung công bố.
- **4 màn mẫu**:
  - **Sảnh**: tiêu đề + "9 người · cần 5–10"; người trong phòng là `Seat` (dòng phụ "bạn · chủ phòng", nút ✕ mời ra là `Button` ghost), mã mời trong `Panel`; cài đặt: stepper có icon vai, luật là khối chọn liền (ô đang chọn = mặt nổi sáng + dấu tích, không dùng màu nhấn), cảnh báo bằng icon + chữ màu Sói. Người không phải chủ phòng thấy cài đặt **không còn mờ 45 %** (để đạt tương phản). Màn rộng: người + mã mời bên trái, cài đặt + nút bên phải.
  - **Xem vai**: tiêu đề + đồng hồ, một câu, thẻ giữ, "2/9 người đã xem", nút lg. Màn rộng thêm cả làng bên trái (ghế, dấu ✓ ai đã xem — công khai).
  - **Đêm ①**: lưới ô người còn sống (dấu "bạn"), "Chưa / Đã xác nhận" (icon + chữ, chưa = màu nhấn), thẻ giữ, nút Xác nhận. Màn rộng: lưới bên trái, phần còn lại trong khung phải. Phần riêng khi giữ đổi sang token (bầy chưa thống nhất = màu nhấn; kết quả soi "LÀ SÓI" / "không phải Sói" màu phe — chỉ trong thẻ đang giữ).
  - **Bình minh**: tiêu đề + đồng hồ (không đổi màu cảnh báo), khung công bố (bia mộ + tên + vai đã lộ) hoặc "Đêm qua bình yên" với icon bình minh. Màn rộng thêm cả làng bên trái (người chết: bia mộ, tên gạch, vai đã lộ).
- **Khung chung** `WwShell` (Board + Preview): `.ww-root` + font + cảnh theo phase; rộng `max-w-lg`, từ `lg` tới `6xl`. Thanh trên: icon `game` + "Ma Sói" (display) + nút ⋯ (ghost). Banner lỗi / mất kết nối đổi sang token + icon.
- **Bảng phong cách**: `StyleBoard.tsx`, mục đầu tiên của `WerewolfPreview` (`style`): token, avatar, chữ, tiêu đề + đồng hồ, nút, nhãn, khung, ô / ghế mọi trạng thái, thẻ giữ đóng / mở, toàn bộ icon, 6 cảnh (2 đã vẽ + 4 placeholder), dòng credit. Preview giờ bọc trong `WwShell` nên mọi màn có cảnh nền.

**Lệch kế hoạch / cần người dùng và nhạc trưởng xem**
1. **Hướng hình ảnh chờ duyệt**: màu nhấn là **đèn lồng hổ phách** (không phải ánh trăng bạc — bạc đã là màu chữ, làm nhấn sẽ không nổi) và font tiêu đề **Grenze** (khác Cormorant của Avalon, để Ma Sói có giọng riêng). Đổi màu nhấn chỉ cần sửa một token.
2. Chuyển 15 icon dùng chung sang `games/shared/icons/` (ràng buộc 4, commit riêng). `paper.tsx` và `hashString` của Avalon được import thẳng (hàm thuần), không chuyển.
3. **Bia mộ đã chỉnh sửa**: sáu vạch chữ khắc của icon gốc ở cỡ 26 px trông như mặt ma; thay bằng một chữ thập khắc (ghi trong CREDITS).
4. **Bỏ dòng gợi ý mặc định trong thẻ giữ** ("Ai cũng giữ — màn hình của mọi người như nhau."): câu của bước đã nói việc phải làm (mỗi màn một câu). Thẻ của người chết và "Vai của tôi" vẫn có gợi ý riêng.
5. **Màn rộng**: chưa làm bàn tròn; "sân khấu" là lưới ô / ghế công khai (ràng buộc 5 cho phép). Các bước chưa làm lại vẫn một cột giữa (`WIDE_PHASES` tạm trong `PhaseView`, xoá ở GĐ3b); thẻ của người chết nằm dưới khung phải ở các bước hai cột.
6. Sân khấu của Xem vai / Bình minh chỉ hiện từ `lg` (ẩn bằng CSS ở điện thoại). DOM ẩn đó chỉ có thông tin công khai (dấu ✓, vai đã lộ của người chết). Bộ kiểm DOM của cặp ảnh người chết (`ghostpairs`) sửa cho đúng ý: vai trên ô chỉ được nằm trên ghế của người đã chết.
7. Chủ phòng vẫn thấy nút ✕ trên mọi ghế ở sảnh (như cũ); Avalon GĐ7b chỉ hiện khi chạm vào ghế — để GĐ3b quyết.
8. Ảnh chụp cả trang (`full`) kéo giãn cảnh `fixed` theo chiều cao trang (trăng to ở ảnh sảnh / bảng phong cách): là giới hạn của cách chụp, không phải giao diện; có thêm ảnh đúng một khung nhìn (`vp375`, `vp1440`).
9. **Gói JS tăng ~22,5 KB gzip** (chủ yếu icon và cảnh), xem số đo.

**Kiểm thử (§11 + nghiệm thu GĐ3)**
- `npm run test:werewolf` 138/138. `npx tsc --noEmit` sạch. `npx eslint src/components/games/werewolf` sạch; `npx eslint src/components/games` 29 lỗi / 29 cảnh báo = mốc. `npm run build` qua (đã xoá trang harness và `.next`). Không đụng engine, `useWerewolf`, luật.
- **Cặp ảnh riêng tư** (mã cuối, chụp cùng lúc, không giữ, mọi animation đóng băng ở cùng `currentTime` — cảnh có hạt nhấp nháy —, thu 10 %, trung bình |Δ| 0–255):
  - Đêm ① chưa chọn / đã chọn / đã xác nhận + Xem vai, Sói so với 5 vai còn lại, 375 px: **20/20 = 0.000**; 1440 px (Đêm ① chưa chọn / đã xác nhận, Xem vai, Đêm ② đã chọn): **20/20 = 0.000**.
  - Đêm ② chưa chọn / đã chọn (Phù thủy cứu + độc) / đã xác nhận / Sói không cắn, Phù thủy so với 5 vai: **20/20 = 0.000**.
  - Người chết, không giữ, 7 bước × (Sói / Dân / Tiên tri / Thợ săn đã bắn) × hồn ma bật / tắt, kèm kiểm DOM: **54/54 = 0.000**.
  - Đối chứng: Đêm ① chưa chọn | đã xác nhận 1.122 (375) / 0.232 (1440); Đêm ② chưa chọn | đã xác nhận 6.333; Phù thủy | Dân **khi giữ** 3.002; hồn ma giữ bật | tắt 11.106, giữ | không giữ 13.845.
- **Tương tác giữ thẻ** (chạy lại bộ của GĐ1–2b): Đêm ① 11/11, Phù thủy 15/15, tờ hồn ma (bật / tắt / Thợ săn chờ bắn) hiện đúng.
- **Tương phản trên điểm ảnh thật** (đi từng khung nhìn, chụp lại với chữ trong suốt để lấy nền thật, bỏ nút khoá và chữ bị che): 375 px **299/299 ≥ 4,5 : 1** (thấp nhất 5,96), 1440 px **478/478** (thấp nhất 5,96 ở màn chơi, 5,37 ở bảng phong cách). Gồm thẻ giữ đang mở (Sói, Tiên tri, bầy chưa thống nhất) và người chết.
- **Không cuộn ngang ở 320 px**: 37 màn của Preview + bảng phong cách. 0 lỗi console.
- **Giảm chuyển động**: bật thì 0/17 hạt hiện, 0 animation chạy, đổi cảnh đêm → bình minh tức thì; tắt thì crossfade 700 ms rồi bỏ cảnh cũ.
- **Mật độ** (375 px, thanh trên + `[data-phase-section]`, không tính tên người chơi; cách đo của Avalon GĐ7):

  | Màn | Từ trước → sau | Khung có viền | Sắc màu nhấn |
  |---|---|---|---|
  | Sảnh (chủ phòng / người chơi) | 115 → 115 | 10 → 2 | 1 → 1 / 1 → 0 |
  | Xem vai | 38 → 28 | 1 → 0 | 1 → 1 |
  | Đêm ① chưa chọn / đã chọn / đã xác nhận | 34 / 34 / 35 → 24 / 24 / 25 | 10 → 0 / 1 / 1 | 2 → 1 / 1 / 0 |
  | Bình minh có người chết / bình yên | 13 / 13 → 13 / 13 | 0 → 1 | 3 → 0 / 2 → 0 |

  Lớp màu Tailwind có bảng màu trong `*.tsx` của werewolf (trừ Preview / StyleBoard): 36 lớp / 208 lần → 22 / 88; 0 ở các file của 4 màn mẫu, `ui/`, `WerewolfBoard`. Phần còn lại (và 9 `text-[Npx]`) nằm ở các panel của GĐ3b và `LogList`.
- **Kích thước gói** (build sạch không harness; một lần import Ma Sói theo `react-loadable-manifest` của trang phòng; gzip mức 6):

  | | Trước (`9867bcef`, Ma Sói như `336349ec`) | Sau |
  |---|---|---|
  | Chunk riêng của Ma Sói | 79 771 / 23 218 B | 109 551 / 36 031 B |
  | Chunk dùng chung kèm theo (hook, icon chung, `paper.tsx`) | 21 395 / 7 947 B | 38 667 / 16 120 B |
  | `werewolf.css` | — | 4 551 / 1 514 B |
  | **Tổng một lần import** | **101 166 / 31 165 B** | **152 769 / 53 665 B (+22,5 KB gzip)** |
  | Avalon (để so) | 312 947 / 103 282 B | 317 698 / 104 503 B (+1,2 KB: Turbopack chia lại chunk dùng chung, code Avalon không đổi) |

  Path của 29 icon ≈ 22 KB raw / 9,9 KB gzip. Font Grenze là font biến thiên, một file cho cả 600 và 700: latin 37 976 B + vietnamese 9 552 B (preload), latin-ext 27 748 B (chỉ tải khi cần).
- Ảnh: `.claude/ww-gd3a-shots/` (bị git bỏ qua): `before375` / `after375` (37 màn), `before1440` / `after1440`, `after320`, `vp375` / `vp1440` (một khung nhìn), `report/` (so sánh trước / sau, bảng phong cách 375 / 1440), các file `contrast*.json`, `metrics-*.json`.
- Script: scratchpad `efce92b2-924b-48f7-9a99-61549d6d56a3/scratchpad` (`wwshots.mjs` có `FULL=0`, `pairs.mjs` có `WIDTH=` và đóng băng animation, `ghostpairs.mjs`, `contrast.mjs`, `metrics.mjs`, `motion.mjs`, `avcheck.mjs`, `scripts/mkicons.mjs` + `verifyicons.mjs`, harness `harness/final/`).

**Việc chuyển sang GĐ3b** (sau khi người dùng duyệt hướng hình ảnh)
- Áp `PhaseLayout` + bộ UI cho Đêm ②, Thợ săn, Thảo luận, Bỏ phiếu, Kết quả (`warn={false}`), Kết thúc, tờ hồn ma, menu / hộp thoại / Luật chơi (thêm dòng credit icon), màn join riêng (`WerewolfJoinScreen` xuất từ module `WerewolfBoard`, nhánh trong `page.tsx`).
- Vẽ 4 cảnh còn lại (`day`, `gallows`, `end-village`, `end-wolves`), bỏ `placeholder`. Xoá `WIDE_PHASES` khi mọi bước dùng `PhaseLayout`.
- Quét nốt lớp màu Tailwind và `text-[Npx]` (GhostPanel, LogList, VotePanel, WitchPanel). Quyết nút ✕ ở sảnh.
- Nếu thêm bàn tròn: kiểm va chạm ghế / nhãn 320–390 px × 5–10 người.

### 12.11 GĐ3b — ghi chú của người thực thi (2026-10-17)

Người dùng duyệt hướng hình ảnh GĐ3a (màu nhấn đèn lồng, font Grenze). Code `3f8d510b` (chưa push).

**Đã làm:** Đêm ②, Thợ săn, Thảo luận, Bỏ phiếu, Kết quả (sân khấu "Ai bầu ai", đồng hồ không cảnh báo), Kết thúc (vai mọi người trên ghế, "Diễn biến ván" là `<details>` thu gọn) dùng `PhaseLayout`; `StatusLine` (viên kính tối) cho mọi dòng trạng thái (đọc được trên dải mây sáng của ban ngày); 4 cảnh: làng ban ngày, giàn treo (bục, thòng lọng, đuốc, đám đông), Dân thắng (dây cờ hội), Sói thắng (trăng máu, sói tru — lệch phải tháp chuông); tờ hồn ma, menu (dòng `Button` ghost có icon, `danger`), hộp thoại, Luật chơi (+ dòng credit icon) theo token; sảnh: chủ phòng chạm ghế mới hiện nút mời ra; `WerewolfJoinScreen` xuất từ module `WerewolfBoard`, nhánh trong `page.tsx` (lỗi eslint của `page.tsx` = 6 lỗi có sẵn, không thêm); `WwShell` tách file; bỏ `WIDE_PHASES`; Preview thêm `join`, `join-closed`, tham số `count` 5–10.

**Lệch / cần biết:** `<li data-player-id>` giữ lại cho bot; vai đã lộ trên ghế là `RoleLine` (`data-ww-tile-role`), bot đếm cả hai; bot mở `<details>` trước khi đọc nhật ký; nhãn "độc" đổi sang nền đỏ nhạt chữ mực (trắng trên đỏ chỉ 3,96 : 1); ghế người chết nền mực đặc; dòng người chết trong tờ hồn ma bỏ độ mờ 60 % (không đạt tương phản).

**Kiểm thử:** test 138/138, `tsc`, eslint werewolf sạch, eslint games 29/29 = mốc, build qua. Riêng tư (mã cuối): Đêm ① + Xem vai 375 20/20, 1440 20/20, Đêm ② 20/20, người chết 54/54 = 0.000 (đối chứng 1.246 / 0.166 / 8.003 / giữ 4.486, hồn ma giữ 12.454). Tương tác giữ: 11/11, 15/15, hai ngón 3/3. Tương phản pixel thật 375 px 1 387/1 387 + 1440 px 658/658 (cả lớp phủ, bảng phong cách). Va chạm ô / dấu 320–390 px × 5–10 người × 7 màn: 210/210 (đối chứng âm bắt được). Không cuộn ngang ở 320 px: 38/38. Mật độ 32 màn (GĐ2b → GĐ3b): chữ 1 435 → 1 208, khung có viền 187 → 30, tối đa 3 → 2 sắc nhấn; Kết thúc 135 → 71 chữ, cao 1 404 → 812 px. Gói một lần import Ma Sói: 101 166 / 31 165 B (GĐ2b) → 152 769 / 53 665 (GĐ3a) → 174 539 / 60 172 B gzip. Ván thật production 9 cửa sổ: heal 17/17, ghostleave 22/22, hunterbite 15/15 (vào phòng qua màn mới, lệch phase ≤ 273 ms, 0 banner, 0 lỗi JS, phòng thử đã xoá). Ảnh: `.claude/ww-gd3b-shots/`.

**Còn lại:** nhạc trưởng review `05feb3bd..HEAD`, rồi mốc PR #2 sau GĐ4.

### 12.12 GĐ3a + GĐ3b — review của nhạc trưởng (2026-10-17): **ĐẠT**

**Chạy lại nghiệm thu:**
- `npm run test:werewolf` 138/138.
- `tsc` sạch. eslint werewolf sạch. `npx eslint src/components/games` 29 / 29 = baseline.
- `page.tsx` 6 lỗi, bằng bản `336349ec` (kiểm bằng `--stdin`).
- `npm run build` exit 0.
- Lớp màu Tailwind lẻ và `text-[Npx]` trong `*.tsx` của werewolf (trừ Preview / StyleBoard): **0 / 0**.

**Đọc code:**
- Avalon trong `9867bcef`: chỉ đổi dòng import và cột File của `CREDITS.md` / `README.md`. 16 file là rename 100%.
- `getScene` chỉ dựa vào `phase` / `hunter` / `winner` (công khai).
- `werewolf.css`: mọi selector có tiền tố `.ww-`, khối giảm chuyển động gói trong `.ww-root`. Không ảnh hưởng game khác.
- Nhánh `WerewolfJoinScreen` trong `page.tsx` giống Avalon, dùng chung chunk của Board.

**Ảnh:** đã xem so sánh trước / sau 375px (Đêm ②, Thợ săn, Thảo luận, Bỏ phiếu, Kết quả, Kết thúc), 1440px (Bỏ phiếu, Kết quả, màn vào phòng, Thợ săn) và màn vào phòng 375px. Bộ nhận diện thống nhất, chữ đọc được trên cảnh, màn kết thúc gọn hơn nhiều.

**Bằng chứng của người thực thi:**
- Riêng tư 114/114 = 0.000.
- Tương phản 2 045/2 045.
- Va chạm 210/210.
- Ván thật 54/54.
- Gói một lần import Ma Sói 31 → 60 KB gzip (Avalon ≈ 104 KB).

**Ghi nhận:** người dùng đã duyệt hướng hình ảnh GĐ3a (đèn lồng hổ phách, Grenze) trong session thực thi, trước GĐ3b.

**Sửa nhỏ chuyển sang GĐ4:** hạt sao 4 cánh đè chữ ở màn vào phòng ("Bổ sung cho GĐ4" mục 10).

### 12.13 GĐ4 — ghi chú của người thực thi (2026-10-17)

**Commit** (trên `dev-werewolf`, chưa push; điểm bắt đầu `e0ffa324`):
1. `13d5e3fe` `feat(werewolf): GĐ4` — hoạt cảnh theo đồng hồ chung.
2. Commit docs này: §12.

**Đã làm**
- **Đồng hồ chung.** Mọi mốc ở `scenes/timelines.ts` (`NIGHTFALL`, `DAWN`, `VOTE_RESULT`, `HUNTER_SHOT`, `END`, các mảng stage, `hunterShotOf`, `endTimeline`). Thời điểm của từng phần tử = `useCue` (animation-delay theo `phaseStartedAt`), DOM đổi theo stage = `usePhaseTimeline` (cả hai trong `games/shared/hooks`, không sửa). Quy ước như Avalon: style tĩnh = khung cuối, keyframes chỉ tả đoạn trước, nên giảm chuyển động (khối có sẵn trong `werewolf.css`) chỉ thấy khung cuối. Lớp `ww-a-*` mới trong `werewolf.css`, chỉ `transform` / `opacity`.
- **Hook mới (werewolf):**
  - `hooks/useCueSync.ts`: **bù độ trễ dựng**. `useCue` lấy mốc lúc render, còn CSS animation bắt đầu ở khung vẽ đầu tiên sau đó: đo được ~0,2–0,3 s khi reload giữa hoạt cảnh, và ≤ 42 ms lệch giữa các cửa sổ khi đổi bước. Ngay sau khung đầu (2 khung + 0,3 s), hook kéo mọi animation cued vừa tạo (có delay inline, không lặp vô hạn, không đang tạm dừng) về đúng mốc render, tính theo giờ của dòng thời gian tài liệu. Gọi một lần trong `PhaseView`.
  - `hooks/usePhaseMoment.ts`: "đã qua mốc T chưa" theo đồng hồ chung, **không** nhảy tới cuối khi giảm chuyển động. Dùng để gỡ lớp "trời tối" (1,2 s) và thẻ phát bắn (4,2 s).
- **Vào đêm** (`panel/Nightfall.tsx`, trong `PhaseView` ở `night`): 0–1,2 s màn sẫm lại, giữa màn "Đêm N / Cả làng đi ngủ…" rồi tan. Lớp `fixed`, `pointer-events: none`, `z-30`: lưới và nút bấm xuyên qua được từ T = 0 (kiểm bằng `elementFromPoint` trong ván thật). Như nhau với người sống, người chết, mọi vai. Từ đêm 2, **trăng lên** sau đồi 0–2,4 s (lớp cảnh `NightMoon` tách khỏi `NightSky`, `motion: 'rise'`). Đêm 1 nối tiếp màn xem vai cùng cảnh nên trăng đứng yên. Giảm chuyển động: không có lớp này.
- **Cảnh nền chuyển động** (`SceneBackdrop`, `getSceneMotion`): lớp có `motion: 'rise'` mount lại theo mốc của bước và nhô lên 2,4 s; `intro: 'brighten'` (bình minh) là lớp tối mờ dần 2,4 s. Chỉ cảnh đang lên trên cùng nhận mốc. Registry: `SceneLayerDef = AssetSource & { motion? }`, ảnh thay lớp vẫn giữ được `motion` (ghi trong `assets/README.md`). `DawnSky` tách thành `DawnSky` / `DawnSun` / `DawnClouds` (khung tĩnh giống hệt cũ).
- **Bình minh** (`DawnPanel`): mặt trời lên + trời sáng 0–2,4 s; khung công bố 0,8 s; người chết thứ i **theo thứ tự ghế** hiện ở ô cố định 1,6 s / 2,8 s; vai lật cùng một mốc 3,8 s (+150 ms mỗi lá); khung cuối 4,6 s. Màn rộng: ghế của người chết thành bia mộ đúng lúc tên họ hiện (`Seat` prop `fall`: lớp "còn sống" tan đi). "Đêm qua bình yên": icon nhô lên ở ô 0, câu ở ô 1, quầng nắng ở mốc lật vai — cùng các ô, cùng mốc xong.
- **Kết quả phiếu** (`VoteResultPanel`, **gom thành cột đếm**, chọn vì đọc được ở 375 px): mỗi người được bầu (theo ghế) và "Bỏ qua" là một hàng; tên người bầu rơi vào hàng theo thứ tự ghế của người bầu (0,7 s + 0,18 s × k, ≤ 9 phiếu xong 2,5 s); số phiếu của hàng hiện khi lá cuối của hàng chạm; "Đang kiểm phiếu…" trong khung kết quả tới 3 s; 3 s phán quyết: hàng của người bị treo có vòng đèn lồng, giàn treo dập xuống, tên; 3,8 s lật vai (theo luật). Không ai bị treo: câu lý do cũ. Khung cuối 4,6 s. Bỏ danh sách "→ người bầu" và dòng đếm cũ (hàng đã nói đủ ai bầu ai).
- **Thợ săn** (`panel/HunterShot.tsx`): lượt bắn vẫn chỉ là một CAS; **bước kế tiếp** (Thảo luận, Đêm hoặc Kết thúc) đọc mục `hunter` của nhật ký (`hunterShotOf`: mỗi ván ≤ 1 Thợ săn; Thảo luận vòng r ← bắn sau bình minh r; Đêm r ← mục nằm sau phiếu của vòng r − 1; Kết thúc ← mục cuối của nhật ký) và diễn: thẻ nhỏ "Thợ săn X / bắn Y" 0–4,2 s, hồng tâm khép lại trên avatar Y (0,3–1,4 s), chớp 1,25 s, bia mộ 1,4 s, lật vai 1,9 s (theo luật). "Không bắn ai" cùng thẻ, không hồng tâm. Điện thoại: thẻ trên tiêu đề (`top-16`), không che lưới; màn rộng: trên khung bên phải. Ghế người bị bắn ở Thảo luận / Kết thúc thành bia mộ cùng lúc. Giảm chuyển động: thẻ đứng yên đủ chữ tới 4,2 s rồi gỡ.
- **Kết thúc** (`EndPanel`, `panel/EndStory.tsx`): mốc R = 0, hoặc R = 4,2 s nếu chính phát bắn kết thúc ván (phát bắn diễn trước). R: phe thắng hiện ra; R + 0,5 s lật vai từng ghế theo thứ tự ghế, cách 150 ms; R + 0,6 s "Phe bạn thắng / thua"; R + 2 s "Diễn biến ván" **kể theo từng đêm / ngày** (mỗi trang một "Đêm N" / "Ngày N", icon theo loại mục, nút Trước / Tiếp, "k/n"); khung cuối R + 2,6 s. **Chạm bất cứ đâu** (hoặc nút "Bỏ qua") thì máy đó nhảy tới khung cuối, máy khác không đổi. Nút ở thanh đáy bấm được suốt hoạt cảnh.
- **Sửa từ review GĐ3** (mục 10): sao 4 cánh (640, 313) → (470, 230), ngoài cột chữ ở mọi cỡ; sao nhấp nháy của cảnh đêm và cảnh Sói thắng chỉ ở hai bên trời (không ở cột giữa), cùng số hạt (11, 9); bụi nắng của cảnh ban ngày / Dân thắng thấp xuống (y ≥ 330). Hạt không thêm, không bớt.
- **WerewolfPreview:** `night-2`, `night-after-hunter`, `dawn-two`, `talk-after-hunter`, `talk-hunter-skip`, `end-hunter`. Thuộc tính cho kiểm thử: `data-ww-anim-stage` (Bình minh, Kết quả, Kết thúc), `data-ww-nightfall`, `data-ww-hunter-shot`, `data-ww-fall`, `data-ww-tally`, `data-ww-ballot`, `data-ww-tally-count`, `data-ww-story`, `data-ww-end-skipped`, `data-ww-skip`.

**Lệch kế hoạch / cần nhạc trưởng biết**
1. **Thêm `useCueSync`** (ngoài brief, làm vì nghiệm thu "reload tiếp tục đúng khung"): không có nó, cửa sổ reload giữa Bình minh / Kết quả trễ đều ~291 ms; có nó ≤ 1,1 ms, và các cửa sổ khớp nhau từ ≤ 42 ms xuống ≤ 5,3 ms. Hook chỉ chạm animation có animation-delay inline (cued), không chạm hạt trang trí hay chuyển động cục bộ.
2. **"Ngắm" của Thợ săn chỉ diễn ở bước kế tiếp** (hồng tâm khép lại trên người bị bắn). Trong chính bước Thợ săn không có hoạt cảnh mới: lựa chọn ngắm của Thợ săn không được ghi (đúng brief: không làm chậm lần ghi).
3. **"Cùng tổng thời lượng" ở Bình minh** hiểu là: mọi biến thể dùng chung các mốc stage (`lead` 0 / `reveal` 1,6 / `flip` 3,8 / `done` 4,6 s) và chuyển động cuối kết thúc trong 4,3–4,45 s (bình yên, 1 hay 2 người chết, lộ vai bật). Khi "Lộ vai khi chết" tắt, chuyển động cuối là lá cuối (2,05 / 3,25 s) — số người chết và luật là công khai.
4. **"Diễn biến ván"** đổi từ `<details>` (cả danh sách) sang trang theo từng đêm / ngày: mỗi lúc chỉ một trang. Bot đọc nhật ký phải bấm "Tiếp ›" qua các trang (`game4.mjs` làm vậy).
5. **Thẻ phát bắn che tiêu đề + đồng hồ** của bước kế tiếp trong ≤ 4,2 s (điện thoại); không che lưới, không nhận chạm.
6. **Lớp "trời tối" ở mọi đêm** (cả đêm 1); trăng lên chỉ từ đêm 2.
7. **Điện thoại dọc không còn sao nhấp nháy** ở cảnh đêm (cột giữa là chỗ của chữ); còn sao tĩnh, đom đóm, quầng đèn.
8. `ww-toast-in` dùng fill `both` (thay `backwards`): nhìn y hệt, nhưng animation còn trong `getAnimations()` sau khi xong nên harness tua lại được khung T < 0,3 s.
9. Không đổi luật, engine (138 test không đổi), `useWerewolf`, `rules.md`, file dùng chung hay Avalon. Không thêm dependency, không âm thanh.

**Kiểm thử (§11 + nghiệm thu GĐ4)**
- `npm run test:werewolf` 138/138. `npx tsc --noEmit` sạch. `npx eslint src/components/games/werewolf` sạch; `npx eslint src/components/games` 29 lỗi / 29 cảnh báo = mốc. `npm run build` qua (đã xoá trang harness `src/app/wwtest`, `rm -rf .next` trước khi build). Engine không import react / firebase / `@/`.
- **Cách chụp đúng khung T** (mới, dùng lại được): harness với `frozen=1` + script chèn đầu trang đặt `Date.now()` = `start` và trả `/api/time` = `start` (nên `serverNow()` đứng yên, mọi `cue(at)` = `at` đúng y ở mọi cửa sổ), rồi `currentTime = T` cho mọi animation. Không có nó, cặp ảnh lệch 0,3–0,7 vì độ trễ dựng mỗi cửa sổ một khác (hồng tâm đang xoay).
- **Cặp ảnh riêng tư ở 5 khung hình** (T = 0 / 0,5 / 1,5 / 4 s / cuối; bản production; không giữ; thu 10 %, trung bình |Δ|): Xem vai, Đêm ① chưa chọn / đã chọn / đã xác nhận, Đêm 2 (trời tối + trăng lên), Đêm 2 sau phát bắn, Đêm ② chưa chọn / đã chọn / đã xác nhận, Bình minh 1 người / 2 người / bình yên, Kết quả có người bị treo / hoà, Thảo luận sau phát bắn, người chết (Đêm ①, Bình minh, Kết quả) × hồn ma bật / tắt, ở 375 px; 7 màn ở 1440 px: **675/675 = 0.000**. Đối chứng (cùng vai, khác khung): 0.069 (trăng còn nhích sau thẻ giữ) – 17.3 (đang trời tối); Bình minh 2 người | bình yên 3.655. Ngoài lề: ở `vote-result-hanged`, người xem là Sói trùng người bị treo trong dữ liệu giả (đổi vai = đổi chỗ) nên màn khác (4.2) — loại khỏi cặp như GĐ2b.
- **Ván thật** (bản production, CDP, mỗi cửa sổ một origin; cửa sổ cuối là điện thoại 320×568; bộ ghi chèn vào mỗi cửa sổ: thời điểm local time = 0 của từng animation cued theo đồng hồ máy, đổi stage, khung > 50 ms, `scrollWidth`):

  | Kịch bản | Cửa sổ | Kết quả | Phủ |
  |---|---|---|---|
  | anim1 | 9 | **19/19** | Thợ săn bị cắn → bắn Sói (Thảo luận diễn phát bắn ở cả 9 cửa sổ, ghế thành bia mộ); phiếu hoà; Đêm 2 trăng lên; Sói cắn + Phù thủy độc → bình minh hai người theo ghế; treo Sói cuối. **Reload** cửa sổ w3 ở 2,0 s của Bình minh 2 và w4 ở 1,5 s của Kết quả 2: lệch so với trung vị ≤ 1,1 ms |
  | anim2 (CPU4 chủ phòng) | 8 | **17/17** | Bình minh bình yên ở mọi cửa sổ; treo Thợ săn → bắn Sói → Đêm 2 có phát bắn + trời tối + trăng lên; lưới nhận chạm ngay dưới lớp trời tối; Phù thủy độc Sói cuối. Chủ phòng CPU chậm 4×: Bình minh / Kết quả vẫn chuyển đúng 8 250–8 256 ms |
  | anim3 | 8 | **16/16** | Kết thúc bằng phát bắn: mọi cửa sổ ở stage `shot` trước, rồi `done` sau R + 2,6 s; một cửa sổ chạm để bỏ qua → chỉ cửa sổ đó `done`, các cửa sổ khác vẫn `shot` |

  - **Lệch giữa các cửa sổ ở mốc hoạt cảnh: ≤ 5,3 ms** (166 mốc: Đêm, Bình minh, Thảo luận, Kết quả, Kết thúc). Mỗi cửa sổ lệch một hằng số = sai số `serverNow` của nó (vd. −10 ms). Stage DOM đổi đúng mốc ±4 ms, lệch giữa cửa sổ ≤ 9 ms.
  - Thời lượng Bình minh / Kết quả phiếu (giữa hai `phaseStartedAt`): 8 250–8 256 ms ở cả 10 lần (8 s + 250 ms của timer).
  - 0 lần trang rộng ra (cả cửa sổ 320 px), 0 banner lỗi, 0 lỗi JS, riêng tư liên tục 0 vi phạm, mọi bước được mọi cửa sổ thấy. Phòng thử đã xoá bằng nút của chủ phòng.
  - Khung > 50 ms trong ván thật: chỉ ở lúc màn bước mới được dựng (250–400 ms sau khi đổi bước, khi snapshot về), ở mọi cửa sổ kể cả cửa sổ không giảm tốc, 1–3 khung liền, dài nhất 104 ms (8–9 cửa sổ trên một máy). Không có khung dài nào trong lúc hoạt cảnh chạy.
- **CPU 4×, harness** (bản production, hoạt cảnh bắt đầu khi màn đã dựng xong, rAF đo từng khung −0,5 → 6,5 s): 9 chuỗi (Đêm 2, Đêm sau phát bắn, Bình minh 2 người / bình yên, Kết quả treo / hoà, Thảo luận sau phát bắn, Kết thúc phát bắn / Dân thắng): **0 khung > 50 ms**, dài nhất 7,7 ms. Giảm tốc có tác dụng (vòng lặp JS 19 → 111 ms).
- **Không cuộn ngang suốt chuỗi**: 9 chuỗi ở 320 px và 375 px, lấy mẫu `scrollWidth` mỗi khung: 0 lần rộng ra. Ván thật: 0.
- **Giảm chuyển động** (9 màn mở ở T ≈ 0): 0 animation, stage = `done`, không lớp trời tối, 0 hạt, 0 chữ trong suốt; chữ trong màn **giống hệt** khung cuối khi có chuyển động; thẻ phát bắn đứng yên đủ chữ: **9/9**.
- **Tương phản trên điểm ảnh thật** (khung cuối và khung thẻ phát bắn T = 2,5 s, 375 / 1440): **332/332 ≥ 4,5 : 1**, thấp nhất 5,67 ("Phe bạn thắng!"). Chữ trên lớp trời tối (aria-hidden, tính tay): "Đêm N" ≈ 16 : 1, "Cả làng đi ngủ…" ≈ 9,7 : 1.
- **Hạt không nằm trên vùng chữ** (sao 4 cánh + mọi hạt vs. hộp từng dòng chữ không có nền đục phía sau): 16 màn (vào phòng, sảnh, xem vai, đêm, Đêm ②, bình minh, thảo luận, bỏ phiếu, kết quả, Thợ săn, kết thúc ×2) × 7 cỡ (320×568 … 1920×1080): **112/112 không đè**. Trước khi sửa: màn vào phòng đè ở 320, 375, 390, 1024, 1440 (sao 4 cánh trên "… mời bạn vào làng", sao nhấp nháy trên "Ma Sói").
- **Kích thước gói** (build sạch không harness; một lần import theo `react-loadable-manifest` của trang phòng; gzip mức 6):

  | | Trước (`e0ffa324`) | Sau |
  |---|---|---|
  | Ma Sói | 174 539 / 60 172 B | 188 641 / 63 981 B (+3,8 KB gzip) |
  | Avalon (để so) | 317 698 / 104 449 B | 317 626 / 104 483 B (chia lại chunk, code không đổi) |
- Ảnh: `.claude/ww-gd4-shots/` (bị git bỏ qua): `seq/` (chuỗi khung hình 375 px của 9 hoạt cảnh, 1440 px của 4), `join/` (màn vào phòng trước / sau ở 1440 px).
- Script: scratchpad `0d3ebcf8-1ff3-452e-a9e4-e54a18651df0/scratchpad` (`frames.mjs` đồng hồ đứng yên, `seq.mjs`, `pairs4.mjs`, `ctrl4.mjs`, `game4.mjs` + `anim4.js` + `bot2.js`, `perf4.mjs`, `reduced4.mjs`, `contrast4.mjs`, `stars.mjs`, `latemount.mjs`, `bundle.mjs`, harness `harness/wwtest-final.tsx`).

**Việc chuyển tiếp**
- Nhạc trưởng review `git diff e0ffa324..HEAD`, rồi hỏi người dùng về mốc PR #2.
- GĐ5 (chơi thật): xem nhịp 8 giây của Bình minh / Kết quả có vừa không; thẻ phát bắn che tiêu đề 4 s có phiền không; kéo bằng ngón để cuộn tờ hồn ma (còn mở từ GĐ2b).

### 12.14 GĐ4 — review của nhạc trưởng (2026-10-17): **ĐẠT** → mốc PR #2

**Chạy lại nghiệm thu:**
- `npm run test:werewolf` 138/138.
- `tsc` sạch. eslint werewolf sạch. `npx eslint src/components/games` 29 / 29 = baseline.
- Lớp màu lẻ / `text-[Npx]`: 0 / 0.
- `npm run build` exit 0.
- Không đổi engine, `useWerewolf`, luật, file dùng chung hay Avalon.

**Đọc code:**
- `useCueSync` chỉ kéo các animation có `animation-delay` inline, không lặp vô hạn, không đang dừng, và bắt đầu sau mốc render của bước. Hạt trang trí, animation cũ và chuyển động cục bộ không bị đụng. Chạy 3 lượt (2 khung + 0,3 s), lượt lặp không đổi gì.
- `usePhaseMoment`: một timeout, không nhảy cuối khi giảm chuyển động. Đúng chỗ dùng (lớp trời tối, thẻ phát bắn).
- `hunterShotOf` phân biệt đúng:
  - phát bắn sau bình minh (Thảo luận cùng vòng);
  - phát bắn sau khi treo (Đêm vòng kế, mục `vote` cùng vòng nằm trước mục `hunter`);
  - phát bắn kết thúc ván (mục cuối nhật ký).
- Lớp trời tối `pointer-events: none`. Mọi hoạt cảnh như nhau với mọi vai. Bỏ qua ở màn kết thúc chỉ có tác dụng trên máy mình.

**Ảnh:** đã xem chuỗi khung hình 375px:
- Bình minh 2 người: mặt trời lên → khung công bố → từng người theo ghế → lật vai.
- Kết quả có người bị treo: phiếu rơi vào hàng → "Đang kiểm phiếu…" → phán quyết + giàn treo → lật vai.
- Đêm sau phát bắn: trời tối + thẻ "Thợ săn Vy bắn Khoa" + hồng tâm → bia mộ → lật vai.

**Bằng chứng của người thực thi:**
- Riêng tư 675/675 = 0.000 ở 5 khung hình.
- Ván thật 52/52; các cửa sổ lệch ≤ 5,3 ms; reload giữa hoạt cảnh lệch ≤ 1,1 ms.
- CPU 4×: 0 khung > 50 ms trong hoạt cảnh.
- Không cuộn ngang, kể cả suốt chuỗi.
- Hạt không đè chữ 112/112.
- Gói 60,2 → 64,0 KB gzip.

**Chấp nhận các lệch:** `useCueSync`; hoạt cảnh "ngắm" chỉ ở bước kế tiếp; cách hiểu "cùng tổng thời lượng"; "Diễn biến ván" dạng trang; trời tối ở mọi đêm; không còn sao nhấp nháy ở cột giữa trên điện thoại.

**Để GĐ5 (chơi thật), không chặn PR:**
- Thẻ phát bắn che tiêu đề + đồng hồ ≤ 4,2 s trên điện thoại (ở khung 3,9 s tiêu đề "Đêm 2" lộ mờ dưới thẻ, hơi rối).
- Ở Kết quả, khoảng 3,0–3,3 s câu "Minh bị treo" chồng lên "Đang kiểm phiếu…" lúc crossfade.
- Nhịp 8 s của Bình minh / Kết quả.
- Kéo bằng ngón để cuộn tờ hồn ma (còn mở từ GĐ2b).

### 12.15 PR #2 (2026-10-17)
- PR huytt-it/board-game-app#64 (`dev-werewolf` → `main`), CI 2/2. Người dùng nhờ nhạc trưởng push + squash-merge: `main` = `709a29d8`.
- Tree của `main` trùng `dev-werewolf@99bcf67a`. `git merge -s ours origin/main` trên `dev-werewolf` (`13546c22`), đã push.
- Tiếp theo: **GĐ5**. Người dùng chơi thật 2–3 ván với nhóm bạn, gửi phản hồi. Nhạc trưởng viết brief GĐ5 từ phản hồi đó cùng các mục "Để GĐ5" ở §12.8 và §12.14.

### 12.16 GĐ5a — ghi chú của người thực thi (2026-10-18)

**Commit** (trên `dev-werewolf`, chưa push; điểm bắt đầu `fcc2a7f5`):
1. `bddc1cf5` `feat(werewolf): GĐ5a — vai mở rộng + 12 người: luật thành engine` (engine, test, sửa UI tối thiểu).
2. Commit docs này: §12.

**Đã làm**
- `engine/types.ts`: `WwRole = BaseRole | ExtraRole` (`elder`, `lycan`, `minion`, `tanner`, `cupid`, `wolfcub`); `WwTeam` thêm `tanner`, `lovers`; `DeathCause` thêm `love`; `WinReason` thêm `tanner-hanged`, `lovers`; `WwTable.lovers?`; `WolfBites = 1 | 2`; `NightPick.biteIds?` (Sói, đêm cắn 2), `NightPick.loverIds?` (Cupid, đêm 1); `WitchPick.healId?`; nhật ký thêm `lovers`, `elder`, `love`, mục `wolves` có thêm `targetIds?` (chỉ ở đêm cắn 2).
- `roles.ts`: tên, phe, điểm, câu mô tả của 6 vai (rules §11); `EXTRA_ROLES`, `ALL_ROLES`, `WOLF_ROLES`, `isWolfRole`, `seenAsWolf`, `LIMITED_ROLES`, `wolfCount`; `MAX_PLAYERS = 12`, bộ mặc định 11–12 (chỉ 6 vai gốc); `validateSetup`: Sói = Ma Sói + Sói con, mỗi vai mở rộng ≤ 1 (E55); `nightActionOf`: Sói con → `wolf`; `cupidPairsTonight`.
- `table.ts`: `isWolf` = Ma Sói / Sói con (Tay sai không); `loversOf`, `loverOf`, `loveDeaths` (chết theo), `countsAsLeft`.
- `win.ts`: `checkWinner(table, hangedId?)` theo đúng thứ tự §11.8; `isLoversTeam`, `teamOf`, `wonGame`; câu cho 2 lý do thắng mới.
- `night.ts`:
  - bầy Sói: `wolfBitesFor` (suy từ `deaths`, không thêm state), `wolfStatus(…, bites?)` thêm `bites` / `sets` / `agreedIds` (thống nhất = cùng một tập), `tallyBites` (top-k; hoà ở ranh giới theo `wolfTie`; chỉ 1 người được chọn thì cắn 1);
  - Cupid: `TargetKind` thêm `lover`, `validateCupidPick` + `CUPID_PICK_ERROR_TEXT`, `cupidPairOf`;
  - Phù thủy cứu một trong hai: `healId`, lỗi `heal-which` / `heal-invalid`, ngữ cảnh độc `{ healId }`;
  - `resolveNight` nhận `attacks` + `elderLife`, trả thêm `attacks`, `elderLife`, `elderHitId`; chết theo người yêu; Tiên tri soi Người hoá sói ra "Là Sói", Tay sai / Kẻ chán đời ra "Không phải Sói".
- `flow.ts`: `afterNight` chốt người bị nhắm (1–2 người) và cặp đôi đêm 1 (có hiệu lực ngay đêm đó); chết theo ở mọi lượt (`afterNight` / `afterNightWitch`, `afterVote`, `afterHunter`, `applyLeave`); `afterVoteResult`: Kẻ chán đời → Thợ săn (bị treo hoặc chết theo người bị treo) → thắng thua; `dawnHunter` nhận Thợ săn chết theo.
- `log.ts`: `phasePart`, `loveLog`; câu tiếng Việt cho ghép đôi (kèm "khác phe nên thành phe Tình nhân"), mất mạng phụ, chết theo (đêm / ngày), 5 cách chốt của đêm cắn 2; `DEATH_CAUSE_TEXT.love`.
- Test: file mới `engine/extra.test.ts` (62 test, 8 nhóm) + `testkit.ts` (`table12` có đủ 6 vai mở rộng, `withLovers`, `bite`, `cupid`). Có các tổ hợp: Cupid ghép Sói con với Thợ săn (treo Sói con → Thợ săn chết theo và bắn → đêm sau cắn 2), đêm cắn 2 trúng Già làng + người yêu, Tay sai / Kẻ chán đời trong cặp Tình nhân, một ván ngắn có vai mở rộng kể lại đủ nhật ký.

**API cho GĐ5b** (như §12.1; mọi hàm thuần, `WwTable` có thêm `lovers`):
- **Dữ liệu UI cần thêm** (tên trường là đề xuất, GĐ5b chốt):
  - `state.lovers: [string, string] | null` ← `NightStep.lovers` (cặp của ván sau Đêm ①; ghi ở mọi lần `night → …`). `tableOf` đưa vào `table.lovers`.
  - `state.attacks: string[]` ← `NightStep.attacks` (`state.attack` giữ là người đầu). `resolveWitchPhase` truyền `attacks` vào `afterNightWitch` và thêm vào `expect`.
  - `gameData.elderLife` của Già làng (thiếu = còn mạng phụ): truyền vào `afterNight` / `afterNightWitch` (`elderLife`), ghi lại `night.elderLife` trong cùng transaction như `potions`, thêm vào `expectPlayerData`.
  - `nightPick.biteIds` (Sói ở đêm cắn 2), `nightPick.loverIds` (Cupid ở đêm 1, ghi cùng lần Xác nhận), `witchPick.healId`.
- **Đêm ①:** `wolfBitesFor(table, round)` (câu "Đêm nay bầy được cắn 2 người" trong thẻ giữ của Sói), `wolfStatus` (`bites`, `sets`, `agreedIds`), `nightDone` (đã tính đêm cắn 2), `cupidPairsTonight(role, round)`, `validTargets(…, 'lover')`, `validateCupidPick` + `CUPID_PICK_ERROR_TEXT`.
- **Đêm ②:** `validateWitchPick(table, witchId, { heal, poisonId, healId }, attacks, potions)` (nhận một id hoặc danh sách), `WITCH_PICK_ERROR_TEXT` (thêm `heal-which`, `heal-invalid`).
- **Xem vai, thẻ giữ:** `wolfIds(table)` là bầy cho Sói, Sói con **và Tay sai** (Sói không thấy Tay sai); `loverOf` + `roleOf` cho "Bạn yêu X — X là ‹vai›"; `NightResult.elderHitId` / `gameData.elderLife === false` cho "Bạn đã mất mạng phụ".
- **Phe, thắng thua:** `teamOf(table, id)` (phe lúc này; `gameData.team` chỉ là phe lúc vào ván), `wonGame(table, id, result)` cho "Phe bạn thắng / thua", `isLoversTeam`, `TEAM_NAME` (thêm Kẻ chán đời, Tình nhân), `WIN_REASON_TEXT`.
- **Sảnh:** `EXTRA_ROLES`, `LIMITED_ROLES`, `ROLE_POINTS`, `ROLE_BLURB`, `balanceScore` / `validateSetup` đã tính vai mở rộng.
- **Nhật ký:** `describeLog` có câu cho mục mới; `love.part` cho biết đêm / ngày.

**Việc của GĐ5b ở UI** (GĐ5a chưa làm, đúng phạm vi):
- `useWerewolf`: ghi `lovers`, `attacks`, `elderLife` như trên; `nightCheck` cho Sói con đổi lựa chọn sau Xác nhận như Ma Sói (đang so `role !== 'werewolf'`).
- `state.lobbyCounts`: Dân = số người − mọi vai khác (đang chỉ trừ 5 vai gốc).
- `panel/LobbyPanel.tsx`: hằng tạm `MAX_PLAYERS = 10` (sảnh vẫn ghi 5–10 người); bỏ khi `gameRegistry` lên 12.
- `MyRoleBody` (Sói con, Tay sai thấy bầy; "Phe …"), `EndPanel` ("Phe bạn thắng" dùng `wonGame`, "Đêm / Ngày N" của người chết theo), `getScene` cho phe thắng mới.
- 6 icon tạm trong `assets/registry.ts` (mượn Dân / Sói / giàn treo).

**Lệch kế hoạch**
1. **Thêm chứ không đổi tên**, để 138 test cũ chạy nguyên: `attack` vẫn là một người (thêm `attacks`), `WitchPick.heal` còn nguyên (thêm `healId`), `tallyWolves` vẫn là đêm cắn 1, trả `{ targetId, how, counts }` (thêm `tallyBites`). Brief ghi "`tallyWolves` nhận số người cần cắn": số người nằm ở `tallyBites` và `wolfStatus(…, bites?)` (mặc định `wolfBitesFor`).
2. `nightActionOf` vẫn là việc khi chạm lưới: Cupid là `suspect` (rules §11.5: không giữ thẻ thì chạm lưới là "người mình nghi"). Ghép đôi ở đêm 1 là `cupidPairsTonight`. UI đang dùng `nightActionOf` làm `TargetKind` cho ô lưới.
3. **3 test cũ ghi cứng giới hạn v1 "5–10 người"** sửa theo luật mới 5–12: bảng bộ mặc định thêm hàng 11, 12; "ngoài 5–12" thử 13 thay cho 11 (2 chỗ). Vòng lặp bộ mặc định tự sinh thêm ca 11 và 12, nên 138 test cũ thành 140. Mọi test logic ván (E1–E28, luồng phase, nhật ký) không đổi một dòng.
4. Chết theo người yêu là mục nhật ký riêng `love` (`loverId`, `part`), không phải `death`: cùng nguyên nhân có thể xảy ra ban đêm hay ban ngày. Mục `death` vẫn chỉ cho người chết đêm vì Sói / độc (§12.1 mục 4).
5. "Kẻ chán đời / Tình nhân thắng" là lý do thắng (`WIN_REASON_TEXT`), như v1; không thêm mục nhật ký.
6. Thứ tự `newDeaths`: Bình minh theo ghế, gồm người chết theo (E42); treo / phát bắn / rời làng: người chết chính trước, người chết theo sau. Màn công bố tự sắp theo ghế.
7. `presetFor` trả `Record<BaseRole, number> & RoleCounts`. `fullCounts` trả đủ 12 khoá, nên `state.roleCounts` của ván mới có thêm 6 số 0 (không ai đọc, không đổi hiển thị).
8. UI sửa tối thiểu để build: khoá vai mới trong `ACTION_TEXT` (NightPanel), `ROLE_MAX` (LobbySettings), `KIND_ICON` (EndStory), roleCounts của Preview (`fullCounts({})`), 6 icon tạm trong registry, hằng 5–10 người ở sảnh. Không thêm dependency, không đụng Avalon hay file dùng chung.

**Chỗ rules §11 chưa rõ — engine đã chọn cách hiểu, cần người dùng chốt:**
1. **Chết theo người yêu bị cho rời làng** (`countsAsLeft`): coi như rời làng. Thợ săn chết kiểu này **không bắn**; Sói con chết kiểu này **không** làm bầy cắn 2. Rules §11.5 nói Thợ săn chết theo vẫn bắn, nhưng không nói bắn lúc nào khi việc rời làng xảy ra giữa một bước (rời làng không đổi phase). Phương án khác: bắn ở mốc kế tiếp (sau Bình minh nếu rời làng ban đêm, sau Kết quả phiếu nếu ban ngày), phải lưu thêm "đã bắn chưa". Muốn đổi thì sửa gọn ở `countsAsLeft` + `afterVoteResult`.
2. **Cupid hoặc người được ghép bị cho rời làng trước khi Đêm ① của đêm 1 kết thúc**: ván không có cặp đôi (như E25: lựa chọn của người đã rời làng không còn được tính).
3. **Già làng bị cắn trúng và bị độc cùng đêm**: chết vì độc, mạng phụ không tính là đã dùng (như E4). Bị cắn trúng (mất mạng phụ) mà người yêu chết cùng đêm thì vẫn chết theo; nhật ký có cả hai dòng.
4. **Đêm cắn 2, Phù thủy ghi `heal: true` mà không chọn người** (`healId`): không cứu ai, bình còn. UI phải bắt chọn (lỗi `heal-which`).
5. **Đêm cắn 2, Sói chưa có `biteIds`**: dùng ô đã chạm (`targetId`) như chọn một người. Bầy chỉ "thống nhất" khi mọi Sói chọn đủ 2 người (trừ khi chỉ còn 1 người để cắn).
6. **Phe dùng để xét "khác phe"** là phe của vai: Ma Sói / Sói con / Tay sai = phe Sói, Kẻ chán đời = phe riêng, còn lại = phe Dân. Vì vậy cặp Tay sai + Sói vẫn ở phe Sói; Kẻ chán đời luôn khác phe với người kia nên luôn thành Tình nhân (và không thắng khi bị treo).
7. Hai điểm "(đề xuất)" của rules §11 (người yêu thấy cả vai của nhau; Sói con rời làng không kích hoạt cắn 2) engine làm đúng đề xuất. Điểm thứ nhất chỉ là việc của UI (GĐ5b).

**Kiểm thử (§11 + nghiệm thu GĐ5a)**
- `npm run test:werewolf`: **202/202** (31 nhóm) = 140 test cũ (138 + 2 ca 11, 12 người tự sinh) + 62 test mới. Mỗi mã E1–E55 có ít nhất một test mang mã đó (đếm bằng grep: 55/55).
- `npx tsc --noEmit` sạch. `npx eslint src/components/games/werewolf` sạch; `npx eslint src/components/games` 29 lỗi / 29 cảnh báo = mốc. `npm run build` qua. Engine không import react / firebase / `@/`, không `enum` / `namespace`.
- **Ván thật hồi quy** (bản production, 7 cửa sổ `localhost`, `127.0.0.1`, `a`–`e.localhost`, cửa sổ cuối 320×568; bộ bot của GĐ4 + kịch bản `heal` của GĐ2 chuyển sang 7 người): **22/22**.
  - Đêm 1: Bảo vệ che X + Sói cắn X + Phù thủy cứu X → bình yên; Phù thủy vẫn thấy "Sói nhắm: X" (E1). Ngày 1 treo Sói thứ nhất. Đêm 2: Sói cắn Y + Phù thủy độc Sói cuối; thẻ Phù thủy ghi "Đã dùng bình cứu" (E2); bình minh 2 người theo ghế → Dân thắng ngay ở bình minh (E20).
  - Nhật ký có che / cứu / độc / đoán / nghi / soi và không có câu nào của vai mở rộng.
  - Riêng tư liên tục 1 606 mẫu, 0 vi phạm. 0 banner, 0 lỗi JS. Lệch phase giữa các cửa sổ lớn nhất 188 ms. Hoạt cảnh lệch ≤ 4,2 ms ở 45 mốc. Bình minh / Kết quả 8 251–8 255 ms. Không cuộn ngang (cả cửa sổ 320 px). 107 commit, 16 bị từ chối rồi tự thử lại (acks / phiếu, như GĐ2). Phòng thử đã xoá bằng nút của chủ phòng.
  - Ảnh 375 px của mọi bước giống GĐ4 (đã xem Đêm 1 và màn kết thúc).
- Script: scratchpad `2cc6d445-…` (`game4.mjs` thêm kịch bản `heal`, `bot2.js`, `anim4.js`, `cdp.mjs`).

**Việc chuyển tiếp**
- Người dùng chốt 6 cách hiểu ở trên (nhất là mục 1). Đổi mục nào thì ghi vào rules §11 rồi sửa engine + test.
- Nhạc trưởng review `git diff fcc2a7f5..HEAD`, rồi viết brief GĐ5b.
