'use client';

import { useState, useEffect } from 'react';
import type { RoomConfig, RoleConfig } from '@/types/room';
import { ClocktowerRole, ROLE_TEAMS, ROLE_ICONS } from '@/types/games/clocktower';

interface RoomSettingsPanelProps {
  config: RoomConfig;
  onUpdateConfig: (newConfig: Partial<RoomConfig>) => void;
  playerCount: number;
}

const ALL_ROLES = Object.values(ClocktowerRole);

export default function RoomSettingsPanel({ config, onUpdateConfig, playerCount }: RoomSettingsPanelProps) {
  const [maxPlayers, setMaxPlayers] = useState(config.maxPlayers || 15);
  const [isExpanded, setIsExpanded] = useState(false);

  const roleConfig: RoleConfig = config.roleConfig || { mandatoryRoles: [], excludedRoles: [] };
  const mandatory = new Set(roleConfig.mandatoryRoles);
  const excluded = new Set(roleConfig.excludedRoles);

  // Group roles by team
  const rolesByTeam = {
    townsfolk: ALL_ROLES.filter(r => ROLE_TEAMS[r] === 'townsfolk'),
    outsider: ALL_ROLES.filter(r => ROLE_TEAMS[r] === 'outsider'),
    minion: ALL_ROLES.filter(r => ROLE_TEAMS[r] === 'minion'),
    demon: ALL_ROLES.filter(r => ROLE_TEAMS[r] === 'demon'),
  };

  const handleMaxPlayersChange = (val: number) => {
    let newMax = val;
    if (newMax < 5) newMax = 5;
    if (newMax > 20) newMax = 20;
    setMaxPlayers(newMax);
    onUpdateConfig({ maxPlayers: newMax });
  };

  const handleRoleToggle = (role: ClocktowerRole, status: 'mandatory' | 'random' | 'excluded') => {
    const newMandatory = new Set(mandatory);
    const newExcluded = new Set(excluded);

    newMandatory.delete(role);
    newExcluded.delete(role);

    if (status === 'mandatory') newMandatory.add(role);
    if (status === 'excluded') newExcluded.add(role);

    onUpdateConfig({
      roleConfig: {
        mandatoryRoles: Array.from(newMandatory),
        excludedRoles: Array.from(newExcluded),
      }
    });
  };

  const getRoleStatus = (role: ClocktowerRole) => {
    if (mandatory.has(role)) return 'mandatory';
    if (excluded.has(role)) return 'excluded';
    return 'random';
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden animate-slide-up shadow-xl mb-6">
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚙️</span>
          <div>
            <h3 className="font-bold text-white text-lg">Game Settings</h3>
            <p className="text-xs text-slate-400">Configure roles and max players</p>
          </div>
        </div>
        <div className="text-slate-400">
          {isExpanded ? '▲' : '▼'}
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 border-t border-white/10 bg-black/20 space-y-6">
          
          {/* Max Players */}
          <div>
            <label className="block text-sm font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Max Players ({playerCount}/{maxPlayers})
            </label>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => handleMaxPlayersChange(maxPlayers - 1)}
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 font-bold text-lg"
              >-</button>
              <div className="w-16 text-center text-xl font-black text-white">{maxPlayers}</div>
              <button 
                onClick={() => handleMaxPlayersChange(maxPlayers + 1)}
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 font-bold text-lg"
              >+</button>
            </div>
            {maxPlayers < playerCount && (
              <p className="text-xs text-amber-400 mt-2">Warning: Max players is less than current players.</p>
            )}
          </div>

          {/* Role Drafting */}
          <div>
            <div className="mb-4">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Role Draft</h4>
              <p className="text-xs text-slate-500 mt-1">
                <span className="text-green-400 font-bold">Mandatory:</span> Must be in the game. <br/>
                <span className="text-amber-400 font-bold">Random:</span> Might be in the game. <br/>
                <span className="text-red-400 font-bold">Excluded:</span> Will never appear.
              </p>
            </div>

            <div className="space-y-6">
              {(Object.entries(rolesByTeam) as [keyof typeof rolesByTeam, ClocktowerRole[]][]).map(([team, roles]) => (
                <div key={team}>
                  <h5 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 border-b border-white/5 pb-1 capitalize">
                    {team}
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {roles.map((role) => {
                      const status = getRoleStatus(role);
                      return (
                        <div key={role} className="flex items-center justify-between bg-white/5 p-2 rounded-lg border border-white/5">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{ROLE_ICONS[role]}</span>
                            <span className="text-sm font-medium text-slate-300">{role}</span>
                          </div>
                          
                          <select 
                            value={status}
                            onChange={(e) => handleRoleToggle(role, e.target.value as any)}
                            className={`text-xs font-semibold rounded p-1 outline-none appearance-none cursor-pointer ${
                              status === 'mandatory' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                              status === 'excluded' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                              'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            <option value="random">🎲 Random</option>
                            <option value="mandatory">✅ Mandatory</option>
                            <option value="excluded">❌ Excluded</option>
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
