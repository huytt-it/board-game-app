'use client';

import type { RoomConfig } from '@/types/room';
import { AvalonRole } from './types';
import {
  ALL_OPTIONAL_ROLES,
  REQUIRED_ROLES,
  ROLE_DESC_VI,
  ROLE_ICONS,
  ROLE_NAMES_VI,
  ROLE_TEAM,
  TEAM_DISTRIBUTION,
  PLAYER_COUNTS,
  type SupportedPlayerCount,
} from './constants';

interface RoomSettingsProps {
  config: RoomConfig;
  onUpdateConfig: (next: Partial<RoomConfig>) => void;
  playerCount: number;
}

export default function RoomSettings({ config, onUpdateConfig, playerCount }: RoomSettingsProps) {
  const optionalRoles =
    (config.optionalRoles as AvalonRole[] | undefined) ?? [];
  const maxPlayers = config.maxPlayers ?? 10;

  const isSupported = (PLAYER_COUNTS as readonly number[]).includes(playerCount);
  const dist = isSupported ? TEAM_DISTRIBUTION[playerCount as SupportedPlayerCount] : null;

  const requiredGoodCount = REQUIRED_ROLES.filter((r) => ROLE_TEAM[r] === 'good').length;
  const requiredEvilCount = REQUIRED_ROLES.filter((r) => ROLE_TEAM[r] === 'evil').length;

  const goodOptional = optionalRoles.filter((r) => ROLE_TEAM[r] === 'good');
  const evilOptional = optionalRoles.filter((r) => ROLE_TEAM[r] === 'evil');
  const goodOptionalLimit = dist ? Math.max(0, dist.good - requiredGoodCount) : 0;
  const evilOptionalLimit = dist ? Math.max(0, dist.evil - requiredEvilCount) : 0;

  const toggleRole = (role: AvalonRole) => {
    const team = ROLE_TEAM[role];
    const enabled = optionalRoles.includes(role);
    if (enabled) {
      onUpdateConfig({ optionalRoles: optionalRoles.filter((r) => r !== role) });
      return;
    }
    const limit = team === 'good' ? goodOptionalLimit : evilOptionalLimit;
    const sameTeamCount = optionalRoles.filter((r) => ROLE_TEAM[r] === team).length;
    if (sameTeamCount >= limit) return;
    onUpdateConfig({ optionalRoles: [...optionalRoles, role] });
  };

  const isAtLimitFor = (role: AvalonRole): boolean => {
    if (optionalRoles.includes(role)) return false;
    const team = ROLE_TEAM[role];
    const limit = team === 'good' ? goodOptionalLimit : evilOptionalLimit;
    const sameTeamCount = optionalRoles.filter((r) => ROLE_TEAM[r] === team).length;
    return sameTeamCount >= limit;
  };

  const setMax = (val: number) => {
    // Không cho hạ maxPlayers xuống thấp hơn số player ĐANG ngồi trong phòng,
    // tránh trường hợp UI hiển thị "8/6" và assignRoles vẫn chia theo playerCount
    // thực tế (gây lệch với cấu hình). Cận trên/dưới của Avalon: 5-10.
    const lowerBound = Math.max(5, playerCount);
    const next = Math.min(10, Math.max(lowerBound, val));
    onUpdateConfig({ maxPlayers: next });
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      <div className="space-y-5 p-4">
          <section>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[11px] uppercase tracking-widest font-black text-slate-400">
                Số người tối đa
              </h4>
              <span className="text-xs text-slate-500">
                Hiện tại: <span className="text-white font-bold">{playerCount}</span> / {maxPlayers}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMax(maxPlayers - 1)}
                className="w-11 h-11 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 font-bold text-xl"
              >
                −
              </button>
              <div className="flex-1 text-center">
                <span className="text-4xl font-black text-white">{maxPlayers}</span>
                <span className="text-slate-500 text-sm ml-1">người</span>
              </div>
              <button
                onClick={() => setMax(maxPlayers + 1)}
                className="w-11 h-11 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 font-bold text-xl"
              >
                +
              </button>
            </div>
            <p className="mt-2 text-[11px] text-slate-500 text-center">
              Avalon hỗ trợ 5–10 người chơi
            </p>
          </section>

          {dist && (
            <section className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4">
              <p className="text-[11px] uppercase tracking-widest font-black text-amber-400 mb-2">
                Tỉ lệ phe ({playerCount} người)
              </p>
              <div className="flex gap-3">
                <div className="flex-1 rounded-xl bg-blue-500/10 border border-blue-500/30 px-3 py-2">
                  <p className="text-[10px] uppercase text-blue-400 font-bold">Phe Người</p>
                  <p className="text-2xl font-black text-blue-200">{dist.good}</p>
                </div>
                <div className="flex-1 rounded-xl bg-red-500/10 border border-red-500/30 px-3 py-2">
                  <p className="text-[10px] uppercase text-red-400 font-bold">Phe Quỷ</p>
                  <p className="text-2xl font-black text-red-200">{dist.evil}</p>
                </div>
              </div>
            </section>
          )}

          <section>
            <h4 className="text-[11px] uppercase tracking-widest font-black text-slate-400 mb-2">
              Vai bắt buộc
            </h4>
            <p className="text-[11px] text-slate-500 mb-3">
              {REQUIRED_ROLES.length} vai luôn có trong mỗi ván — không thể tắt.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {REQUIRED_ROLES.map((role) => {
                const team = ROLE_TEAM[role];
                const isGood = team === 'good';
                return (
                  <div
                    key={role}
                    className={`flex items-center gap-2 rounded-xl border p-2.5 ${isGood
                      ? 'border-blue-500/40 bg-blue-500/10'
                      : 'border-red-500/40 bg-red-500/10'
                      }`}
                  >
                    <span className="text-2xl shrink-0">{ROLE_ICONS[role]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-white truncate">{role}</p>
                      <p
                        className={`text-[10px] font-bold ${isGood ? 'text-blue-400' : 'text-red-400'
                          }`}
                      >
                        {isGood ? 'Người' : 'Quỷ'} · luôn có
                      </p>
                    </div>
                    <span className="text-base shrink-0">🔒</span>
                  </div>
                );
              })}
            </div>
            <div
              className={`mt-2 flex items-center gap-2 rounded-xl border p-2.5 ${optionalRoles.includes(AvalonRole.Morgana)
                ? 'border-blue-500/40 bg-blue-500/10'
                : 'border-white/10 bg-white/5 opacity-70'
                }`}
            >
              <span className="text-2xl shrink-0">{ROLE_ICONS[AvalonRole.Percival]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-white truncate">{AvalonRole.Percival}</p>
                <p className="text-[10px] font-bold text-blue-400">
                  Người · {optionalRoles.includes(AvalonRole.Morgana)
                    ? 'tự động có khi bật Morgana'
                    : 'chỉ xuất hiện nếu Morgana được bật'}
                </p>
              </div>
              <span className="text-base shrink-0">
                {optionalRoles.includes(AvalonRole.Morgana) ? '✓' : '○'}
              </span>
            </div>
          </section>

          <section>
            <h4 className="text-[11px] uppercase tracking-widest font-black text-slate-400 mb-1">
              Vai phụ
            </h4>
            <p className="text-[11px] text-slate-500 mb-2">
              Bật theo số người chơi. Bật vai sẽ thay 1 Trung Thần / Tay Sai mặc định.
            </p>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5 mb-3">
              <p className="text-[11px] font-bold text-amber-300 mb-1">💡 Ngưỡng mở vai phụ Quỷ</p>
              <ul className="text-[11px] text-slate-400 leading-relaxed space-y-0.5">
                <li>• 5–6 người: chưa mở (đủ Mordred + Sát Thủ)</li>
                <li>• 7–9 người: mở 1 vai (Morgana <em>hoặc</em> Oberon)</li>
                <li>• 10 người: mở full (Morgana <em>và</em> Oberon)</li>
              </ul>
            </div>

            <div className="space-y-2">
              {ALL_OPTIONAL_ROLES.map((role) => {
                const enabled = optionalRoles.includes(role);
                const team = ROLE_TEAM[role];
                const isGood = team === 'good';
                const atLimit = isAtLimitFor(role);
                const disabled = atLimit;
                return (
                  <button
                    key={role}
                    onClick={() => toggleRole(role)}
                    disabled={disabled}
                    className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${enabled
                      ? isGood
                        ? 'border-blue-500/50 bg-blue-500/10'
                        : 'border-red-500/50 bg-red-500/10'
                      : 'border-white/10 bg-white/5'
                      }`}
                  >
                    <span className="text-2xl shrink-0">{ROLE_ICONS[role]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-sm font-black text-white">{role}</span>
                        <span
                          className={`text-[9px] uppercase font-bold tracking-wider ${isGood ? 'text-blue-400' : 'text-red-400'
                            }`}
                        >
                          {isGood ? 'Người' : 'Quỷ'}
                        </span>
                        {atLimit && (
                          <span className="text-[9px] uppercase font-bold tracking-wider text-amber-400">
                            ⚠️ Chưa đủ slot để thêm các vai trò này
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                        {ROLE_DESC_VI[role]}
                      </p>
                    </div>
                    <div
                      className={`shrink-0 h-6 w-11 rounded-full border transition-all ${enabled
                        ? isGood
                          ? 'bg-blue-500 border-blue-400'
                          : 'bg-red-500 border-red-400'
                        : 'bg-white/5 border-white/20'
                        }`}
                    >
                      <div
                        className={`h-5 w-5 rounded-full bg-white shadow-md transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'
                          } translate-y-px`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="mt-2 text-[11px] text-slate-500">
              Phe Người: {goodOptional.length}/{goodOptionalLimit} vai phụ · Phe Quỷ:{' '}
              {evilOptional.length}/{evilOptionalLimit} vai phụ
            </p>
            {evilOptionalLimit === 0 && goodOptionalLimit === 0 && (
              <p className="mt-2 text-[11px] text-amber-400">
                ⚠️ Số người hiện tại chỉ đủ cho các vai trò bắt buộc — không có chỗ cho các vai trò phụ.
              </p>
            )}
          </section>

          <section>
            <h4 className="text-[11px] uppercase tracking-widest font-black text-slate-400 mb-2">
              Luật tuỳ chọn
            </h4>
            <div
              className={`flex items-center gap-3 rounded-xl border p-3 ${playerCount >= 7
                ? 'border-cyan-500/50 bg-cyan-500/10'
                : 'border-white/10 bg-white/5 opacity-70'
                }`}
            >
              <span className="text-2xl">🌊</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-white">Lady of the Lake</p>
                <p className="text-[11px] text-slate-400 leading-snug">
                  {playerCount >= 7
                    ? '✅ Tự động bật từ 7 người. Sau Quest 2/3/4, người cầm token chọn 1 người để soi phe.'
                    : `Cần ≥ 7 người (hiện ${playerCount}) — sẽ tự bật khi đủ.`}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${playerCount >= 7
                  ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/40'
                  : 'bg-slate-500/20 text-slate-400'
                  }`}
              >
                {playerCount >= 7 ? '🔒 Auto-on' : 'Off'}
              </span>
            </div>
          </section>
      </div>
    </div>
  );
}
