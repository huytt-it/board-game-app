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
| Số người | 5–10 (giới hạn chung của app là ≤ 10 người). |
| Bộ vai v1 | Ma Sói, Dân làng, Tiên tri, Bảo vệ, Phù thủy, Thợ săn. |
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
- ≤ 10 người.
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
- **Bộ vai:** preset theo số người. Chỉnh từng vai bằng nút −/+, có điểm cân bằng. Bắt đầu ván thì kiểm tra bằng `validateSetup` (rules §4, E28).
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

---

## 10. GĐ5 — Chơi thật và mở rộng (chưa lên lịch)
- Chơi 2–3 ván thật với nhóm bạn, ghi lỗi và cảm nhận, chỉnh preset vai và thời gian mặc định.
- Vai mở rộng, người dùng chọn sau:
  - Cupid + cặp đôi (phe thứ ba);
  - Già làng (2 mạng);
  - Kẻ chán đời (thắng khi bị treo);
  - Sói con (chết thì đêm sau Sói cắn 2).
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
| GĐ1 | Chưa bắt đầu | | |
| GĐ2 | Chưa bắt đầu | | |
| GĐ3 | Chưa bắt đầu | | |
| GĐ4 | Chưa bắt đầu | | |

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
