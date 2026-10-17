'use client';

import type { ReactNode } from 'react';
import { werewolfDisplayFont } from './assets/fonts';
import SceneBackdrop from './scenes/SceneBackdrop';
import { getScene, getSceneMotion } from './scenes/getScene';
import type { WerewolfGameState } from './types';

/**
 * Khung chung của Ma Sói (Board, Preview, màn vào phòng): token + font
 * (`.ww-root`), cảnh nền theo phase (giống nhau với mọi vai), bề rộng nội dung
 * (một cột ở điện thoại, tới 6xl ở màn rộng). `werewolf.css` do WerewolfBoard
 * import (màn vào phòng nằm cùng module đó).
 */
export default function WwShell({
  state,
  children,
  className = 'mx-auto w-full max-w-lg lg:max-w-6xl',
  ...attrs
}: {
  state: Pick<WerewolfGameState, 'phase' | 'phaseStartedAt' | 'round' | 'hunter' | 'winner'> | null;
  children: ReactNode;
  className?: string;
} & Record<`data-${string}`, string | number | undefined>) {
  return (
    <div className={`ww-root ${werewolfDisplayFont.variable} text-(--ww-text) ${className}`} data-ww-root="" {...attrs}>
      <SceneBackdrop sceneId={getScene(state)} motionAt={getSceneMotion(state)} />
      {children}
    </div>
  );
}
