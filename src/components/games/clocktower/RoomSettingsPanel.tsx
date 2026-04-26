'use client';

import { useState, useEffect } from 'react';
import type { RoomConfig, RoleConfig } from '@/types/room';
import {
  ClocktowerRole,
  ClocktowerTeam,
  ROLE_TEAMS,
  ROLE_ICONS,
  ROLE_NAMES_VI,
  ROLE_TEAM_VI,
} from '@/types/games/clocktower';

interface RoomSettingsPanelProps {
  config: RoomConfig;
  onUpdateConfig: (newConfig: Partial<RoomConfig>) => void;
  playerCount: number;
}

// ─── Official BotC Trouble Brewing presets ──────────────────────────────
const PRESETS: Record<number, { townsfolk: number; outsider: number; minion: number; demon: number }> = {
  5:  { townsfolk: 3, outsider: 0, minion: 1, demon: 1 },
  6:  { townsfolk: 3, outsider: 1, minion: 1, demon: 1 },
  7:  { townsfolk: 5, outsider: 0, minion: 1, demon: 1 },
  8:  { townsfolk: 5, outsider: 1, minion: 1, demon: 1 },
  9:  { townsfolk: 5, outsider: 2, minion: 1, demon: 1 },
  10: { townsfolk: 7, outsider: 0, minion: 2, demon: 1 },
  11: { townsfolk: 7, outsider: 1, minion: 2, demon: 1 },
  12: { townsfolk: 7, outsider: 2, minion: 2, demon: 1 },
  13: { townsfolk: 9, outsider: 0, minion: 3, demon: 1 },
  14: { townsfolk: 9, outsider: 1, minion: 3, demon: 1 },
  15: { townsfolk: 9, outsider: 2, minion: 3, demon: 1 },
};

// ─── Team visual config ─────────────────────────────────────────────────
const TEAM_CFG: Record<ClocktowerTeam, {
  label: string; emoji: string;
  bg: string; border: string; badge: string; dot: string; header: string;
}> = {
  townsfolk: {
    label: 'Dân Làng', emoji: '🌟',
    bg: 'bg-blue-900/20', border: 'border-blue-500/30',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    dot: 'bg-blue-400', header: 'text-blue-300',
  },
  outsider: {
    label: 'Ngoại Nhân', emoji: '🌀',
    bg: 'bg-purple-900/20', border: 'border-purple-500/30',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    dot: 'bg-purple-400', header: 'text-purple-300',
  },
  minion: {
    label: 'Tay Sai', emoji: '🗡️',
    bg: 'bg-orange-900/20', border: 'border-orange-500/30',
    badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    dot: 'bg-orange-400', header: 'text-orange-300',
  },
  demon: {
    label: 'Quỷ Dữ', emoji: '👹',
    bg: 'bg-red-900/25', border: 'border-red-500/40',
    badge: 'bg-red-500/20 text-red-300 border-red-500/40',
    dot: 'bg-red-500', header: 'text-red-300',
  },
};

const TEAM_ORDER: ClocktowerTeam[] = ['townsfolk', 'outsider', 'minion', 'demon'];
const ALL_ROLES = Object.values(ClocktowerRole);

// ─── Role status pill ───────────────────────────────────────────────────
type RoleStatus = 'mandatory' | 'random' | 'excluded';

const STATUS_CFG: Record<RoleStatus, { label: string; cls: string }> = {
  mandatory: { label: '✅ Bắt buộc',  cls: 'bg-green-500/20 text-green-300 border border-green-500/30' },
  random:    { label: '🎲 Ngẫu nhiên', cls: 'bg-slate-500/20 text-slate-300 border border-slate-500/20' },
  excluded:  { label: '❌ Loại trừ',   cls: 'bg-red-500/20 text-red-300 border border-red-500/30' },
};
const STATUS_CYCLE: Record<RoleStatus, RoleStatus> = {
  random: 'mandatory',
  mandatory: 'excluded',
  excluded: 'random',
};

export default function RoomSettingsPanel({ config, onUpdateConfig, playerCount }: RoomSettingsPanelProps) {
  const [maxPlayers, setMaxPlayers] = useState(config.maxPlayers || 15);
  const [isExpanded, setIsExpanded] = useState(false);
  const [suggestApplied, setSuggestApplied] = useState(false);

  const roleConfig: RoleConfig = config.roleConfig || { mandatoryRoles: [], excludedRoles: [] };
  const mandatory = new Set(roleConfig.mandatoryRoles);
  const excluded  = new Set(roleConfig.excludedRoles);
  const teamCounts = { townsfolk: 0, outsider: 0, minion: 0, demon: 1, ...(roleConfig.teamCounts || {}) };
  // demon is always 1
  const effectiveCounts = { ...teamCounts, demon: 1 };
  const totalTeamCount = TEAM_ORDER.reduce((s, t) => s + (effectiveCounts[t] || 0), 0);

  const preset = PRESETS[maxPlayers] ?? null;
  const presetMatches = preset
    ? TEAM_ORDER.every(t => effectiveCounts[t] === preset[t])
    : false;

  // ── When maxPlayers changes, auto-flag that a suggestion is available ──
  useEffect(() => { setSuggestApplied(false); }, [maxPlayers]);

  // ── Roles grouped by team ──────────────────────────────────────────────
  const rolesByTeam = {
    townsfolk: ALL_ROLES.filter(r => ROLE_TEAMS[r] === 'townsfolk'),
    outsider:  ALL_ROLES.filter(r => ROLE_TEAMS[r] === 'outsider'),
    minion:    ALL_ROLES.filter(r => ROLE_TEAMS[r] === 'minion'),
    demon:     ALL_ROLES.filter(r => ROLE_TEAMS[r] === 'demon'),
  };

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleMaxPlayersChange = (val: number) => {
    const next = Math.min(20, Math.max(5, val));
    setMaxPlayers(next);
    onUpdateConfig({ maxPlayers: next });
  };

  const handleTeamCountChange = (team: ClocktowerTeam, val: number) => {
    if (team === 'demon') return; // locked
    const next = Math.max(0, val);
    const newCounts = { ...effectiveCounts, [team]: next };
    onUpdateConfig({ roleConfig: { ...roleConfig, teamCounts: newCounts } });
  };

  const applyPreset = () => {
    if (!preset) return;
    const newCounts = { ...preset, demon: 1 };
    onUpdateConfig({ roleConfig: { ...roleConfig, teamCounts: newCounts } });
    setSuggestApplied(true);
  };

  const handleRoleToggle = (role: ClocktowerRole) => {
    const current = getRoleStatus(role);
    const next    = STATUS_CYCLE[current];

    const newMandatory = new Set(mandatory);
    const newExcluded  = new Set(excluded);
    newMandatory.delete(role);
    newExcluded.delete(role);

    if (next === 'mandatory') {
      const team = ROLE_TEAMS[role];
      const count = Array.from(newMandatory).filter(r => ROLE_TEAMS[r as ClocktowerRole] === team).length;
      const allowed = effectiveCounts[team] || 0;
      if (count >= allowed) {
        // silently skip — can't exceed slot count
        return;
      }
      newMandatory.add(role);
    } else if (next === 'excluded') {
      newExcluded.add(role);
    }

    onUpdateConfig({
      roleConfig: {
        ...roleConfig,
        mandatoryRoles: Array.from(newMandatory),
        excludedRoles:  Array.from(newExcluded),
      }
    });
  };

  const getRoleStatus = (role: ClocktowerRole): RoleStatus => {
    if (mandatory.has(role)) return 'mandatory';
    if (excluded.has(role))  return 'excluded';
    return 'random';
  };

  // ── Total validation ───────────────────────────────────────────────────
  const totalOk      = totalTeamCount === maxPlayers;
  const totalOver    = totalTeamCount > maxPlayers;
  const totalUnder   = totalTeamCount < maxPlayers;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden animate-slide-up shadow-xl mb-6">

      {/* ── Collapse header ─────────────────────────────────────────────── */}
      <button
        className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors text-left"
        onClick={() => setIsExpanded(v => !v)}
      >
        <span className="text-2xl">⚙️</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-white text-base">Cài đặt phòng</h3>
          <p className="text-xs text-slate-400">Thiết lập số người và phe phái</p>
        </div>
        <span className="text-slate-400 text-sm">{isExpanded ? '▲' : '▼'}</span>
      </button>

      {isExpanded && (
        <div className="border-t border-white/10 bg-black/20 space-y-6 p-4">

          {/* ── Số người tối đa ──────────────────────────────────────────── */}
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
                onClick={() => handleMaxPlayersChange(maxPlayers - 1)}
                className="w-11 h-11 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 font-bold text-xl transition-all"
              >−</button>
              <div className="flex-1 text-center">
                <span className="text-4xl font-black text-white">{maxPlayers}</span>
                <span className="text-slate-500 text-sm ml-1">người</span>
              </div>
              <button
                onClick={() => handleMaxPlayersChange(maxPlayers + 1)}
                className="w-11 h-11 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 font-bold text-xl transition-all"
              >+</button>
            </div>
            {maxPlayers < playerCount && (
              <p className="text-xs text-amber-400 mt-2 text-center">
                ⚠️ Số tối đa thấp hơn số người đang trong phòng
              </p>
            )}
          </section>

          {/* ── Gợi ý phe phái ──────────────────────────────────────────── */}
          {preset && (
            <section className="rounded-2xl border border-amber-500/25 bg-amber-500/8 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] uppercase tracking-widest font-black text-amber-400 mb-1.5">
                    💡 Gợi ý cho {maxPlayers} người (chính thức)
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {TEAM_ORDER.map(t => (
                      <span key={t} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold border ${TEAM_CFG[t].badge}`}>
                        {TEAM_CFG[t].emoji} {preset[t]}
                      </span>
                    ))}
                  </div>
                </div>
                {!presetMatches && (
                  <button
                    onClick={applyPreset}
                    className="shrink-0 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold px-3 py-2 active:scale-95 transition-all"
                  >
                    Áp dụng
                  </button>
                )}
                {presetMatches && (
                  <span className="shrink-0 text-green-400 text-xs font-bold">✓ Đã áp dụng</span>
                )}
              </div>
            </section>
          )}

          {/* ── Phân bổ phe phái ────────────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[11px] uppercase tracking-widest font-black text-slate-400">
                Phân bổ phe phái
              </h4>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                totalOk    ? 'bg-green-500/15 text-green-400' :
                totalOver  ? 'bg-red-500/15 text-red-400' :
                             'bg-amber-500/15 text-amber-400'
              }`}>
                {totalTeamCount} / {maxPlayers}
                {totalOk && ' ✓'}
                {totalOver && ' ↑'}
                {totalUnder && ' ↓'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {TEAM_ORDER.map(team => {
                const cfg = TEAM_CFG[team];
                const count = effectiveCounts[team];
                const mandatoryCount = Array.from(mandatory).filter(r => ROLE_TEAMS[r as ClocktowerRole] === team).length;
                const isValid = count >= mandatoryCount;
                const locked = team === 'demon';

                return (
                  <div
                    key={team}
                    className={`rounded-2xl border p-3.5 ${cfg.bg} ${
                      isValid ? cfg.border : 'border-red-500/60'
                    }`}
                  >
                    {/* Team label row */}
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <span className="text-base">{cfg.emoji}</span>
                      <span className={`text-xs font-black ${cfg.header}`}>{cfg.label}</span>
                      {locked && (
                        <span className="ml-auto text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 rounded-full px-1.5 py-0.5 font-bold">
                          cố định
                        </span>
                      )}
                    </div>

                    {/* Counter */}
                    {locked ? (
                      <div className="flex items-center justify-center h-9">
                        <span className="text-3xl font-black text-white">{count}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleTeamCountChange(team, count - 1)}
                          className="w-9 h-9 rounded-xl bg-black/30 hover:bg-black/50 active:scale-95 font-bold text-lg transition-all"
                        >−</button>
                        <div className="flex-1 text-center font-black text-2xl text-white">{count}</div>
                        <button
                          onClick={() => handleTeamCountChange(team, count + 1)}
                          className="w-9 h-9 rounded-xl bg-black/30 hover:bg-black/50 active:scale-95 font-bold text-lg transition-all"
                        >+</button>
                      </div>
                    )}

                    {/* Mandatory warn */}
                    {!isValid && (
                      <p className="text-[10px] text-red-400 mt-1.5 leading-tight text-center">
                        ⚠️ Cần ≥ {mandatoryCount} (đang bắt buộc)
                      </p>
                    )}
                    {/* Mandatory count hint */}
                    {isValid && mandatoryCount > 0 && (
                      <p className="text-[10px] text-slate-500 mt-1.5 text-center">
                        {mandatoryCount} bắt buộc · {count - mandatoryCount} ngẫu nhiên
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Total guide */}
            <p className={`text-[11px] mt-2.5 text-center font-medium ${
              totalOk ? 'text-green-400' : totalOver ? 'text-red-400' : 'text-amber-400'
            }`}>
              {totalOk
                ? '✓ Tổng số vai khớp với số người chơi'
                : totalOver
                ? `↑ Tổng vai vượt quá ${totalTeamCount - maxPlayers} so với số người`
                : `↓ Còn thiếu ${maxPlayers - totalTeamCount} vai để đủ số người`}
            </p>
          </section>

          {/* ── Chọn vai cụ thể ─────────────────────────────────────────── */}
          <section>
            <h4 className="text-[11px] uppercase tracking-widest font-black text-slate-400 mb-1">
              Chọn vai cụ thể
            </h4>
            <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
              Nhấn để chuyển trạng thái:&nbsp;
              <span className="text-green-400 font-bold">Bắt buộc</span> →&nbsp;
              <span className="text-red-400 font-bold">Loại trừ</span> →&nbsp;
              <span className="text-slate-400 font-bold">Ngẫu nhiên</span>
            </p>

            <div className="space-y-5">
              {TEAM_ORDER.map(team => {
                const cfg = TEAM_CFG[team];
                const roles = rolesByTeam[team];
                const mandatoryCount = Array.from(mandatory).filter(r => ROLE_TEAMS[r as ClocktowerRole] === team).length;
                const slotCount = effectiveCounts[team] || 0;
                const atLimit = mandatoryCount >= slotCount;

                return (
                  <div key={team}>
                    {/* Team header */}
                    <div className={`flex items-center gap-2 rounded-xl border ${cfg.border} ${cfg.bg} px-3 py-2 mb-2`}>
                      <span>{cfg.emoji}</span>
                      <span className={`font-black text-sm ${cfg.header}`}>{cfg.label}</span>
                      <span className="text-slate-600 text-xs ml-0.5">· {roles.length} vai</span>
                      <span className={`ml-auto text-[10px] rounded-full px-2 py-0.5 font-bold border ${cfg.badge}`}>
                        {mandatoryCount} / {slotCount} bắt buộc
                      </span>
                    </div>

                    {/* Role pills grid */}
                    <div className="grid grid-cols-1 gap-1.5">
                      {roles.map(role => {
                        const status = getRoleStatus(role);
                        const sCfg = STATUS_CFG[status];
                        const canBeMandatory = status !== 'mandatory' && !atLimit;

                        return (
                          <button
                            key={role}
                            onClick={() => handleRoleToggle(role)}
                            className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-all active:scale-[0.98] ${
                              status === 'mandatory'
                                ? `${cfg.bg} border ${cfg.border}`
                                : status === 'excluded'
                                ? 'bg-red-950/20 border border-red-500/15'
                                : 'bg-white/4 border border-white/8'
                            } ${
                              status === 'random' && atLimit ? 'opacity-50' : ''
                            }`}
                          >
                            <span className={`text-xl shrink-0 ${status === 'excluded' ? 'opacity-30' : ''}`}>
                              {ROLE_ICONS[role]}
                            </span>
                            <div className="flex-1 min-w-0">
                              <span className={`text-xs font-bold block leading-tight ${
                                status === 'excluded' ? 'text-slate-600 line-through' : 'text-white'
                              }`}>{role}</span>
                              <span className={`text-[10px] ${
                                status === 'excluded' ? 'text-slate-700' : 'text-slate-500'
                              }`}>{ROLE_NAMES_VI[role]}</span>
                            </div>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${sCfg.cls}`}>
                              {sCfg.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

        </div>
      )}
    </div>
  );
}
