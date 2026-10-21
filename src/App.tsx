import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  Trophy,
  Pause,
  Home,
  ChevronLeft,
  ChevronRight,
  Users,
  User,
  Settings,
  Check,
  Smile,
  Shirt,
  Skull,
  Wrench,
  Pencil,
  Camera,
  Zap,
  Flag,
  Flame,
  Mic,
  MicOff,
  Headphones,
  Copy,
  Radio,
  Heart,
  ArrowRight,
  Plus,
  Maximize2,
  Minimize2,
  Smartphone,
} from 'lucide-react';
import { VolleyballCanvas } from './components/VolleyballCanvas';
import {
  ObstacleRushCanvas,
  ObstacleRushHudState,
} from './components/ObstacleRushCanvas';
import {
  FloorIsLavaCanvas,
  FloorIsLavaHudState,
} from './components/FloorIsLavaCanvas';
import {
  CustomRoomInfo,
  multiplayerClient,
  PublicRoomSummary,
} from './network/multiplayerClient';
import {
  AIDifficulty,
  BALL_SKINS,
  BallSkinConfig,
  BallSkinId,
  CalloutPopup,
  CameraPreset,
  CHARACTER_FACES,
  CHARACTER_OUTFITS,
  CharacterConfig,
  CharacterId,
  COURT_THEMES,
  CourtTheme,
  CourtThemeId,
  CRAYON_CHARACTERS,
  DIFFICULTY_LEVELS,
  FaceId,
  FLOOR_IS_LAVA_MAPS,
  FloorIsLavaMapConfig,
  FloorIsLavaMapId,
  GameMode,
  GameState,
  HEAD_SHAPES,
  HeadShape,
  LevelModifier,
  MatchStats,
  OBSTACLE_RUSH_MAPS,
  ObstacleRushMapConfig,
  ObstacleRushMapId,
  OutfitConfig,
  OutfitId,
  SUB_GAMES_LIST,
  WORLD_TOUR_LEVELS,
} from './types/game';
import { crayonAudio } from './audio/crayonAudio';
import {
  getLavaMapThumbnailDataUrl,
  getMapThumbnailDataUrl,
  getRushMapThumbnailDataUrl,
} from './three/crayonModels';

/**
 * Renders the custom Chest Emblem SVG icon for all 10 outfit emblem types
 */
const renderOutfitEmblemSvg = (
  emblemType: OutfitConfig['emblemType'],
  accentColor: string,
  cx: number,
  cy: number,
  scale: number = 1
) => {
  return (
    <g transform={`translate(${cx}, ${cy}) scale(${scale})`}>
      {emblemType === 'crown' && (
        <path
          d="M -9 5 L -11 -5 L -4 0 L 0 -7 L 4 0 L 11 -5 L 9 5 Z"
          fill="#FACC15"
          stroke="#0F172A"
          strokeWidth="2.1"
          strokeLinejoin="round"
        />
      )}
      {emblemType === 'star' && (
        <polygon
          points="0,-8 2.4,-2.6 8.2,-1.8 3.9,2.1 5,7.8 0,5 -5,7.8 -3.9,2.1 -8.2,-1.8 -2.4,-2.6"
          fill="#FACC15"
          stroke="#0F172A"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      )}
      {emblemType === 'bolt' && (
        <polygon
          points="2.5,-8 -6,1 0,1 -2.5,8.5 6,-1 0,-1"
          fill="#38BDF8"
          stroke="#0F172A"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      )}
      {emblemType === 'skull' && (
        <g>
          <path
            d="M -6.5 -1 C -6.5 -7 6.5 -7 6.5 -1 C 6.5 2 4.5 3.5 4 4.5 L 4 7 L -4 7 L -4 4.5 C -4.5 3.5 -6.5 2 -6.5 -1 Z"
            fill="#F8FAFC"
            stroke="#0F172A"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="-2.4" cy="-1" r="1.4" fill="#0F172A" />
          <circle cx="2.4" cy="-1" r="1.4" fill="#0F172A" />
        </g>
      )}
      {emblemType === 'paw' && (
        <g fill={accentColor || '#FDE047'} stroke="#0F172A" strokeWidth="1.7">
          <ellipse cx="0" cy="2.5" rx="4.8" ry="3.6" />
          <circle cx="-5" cy="-2.5" r="2" />
          <circle cx="0" cy="-4.2" r="2" />
          <circle cx="5" cy="-2.5" r="2" />
        </g>
      )}
      {emblemType === 'planet' && (
        <g>
          <circle
            cx="0"
            cy="0"
            r="5.2"
            fill="#38BDF8"
            stroke="#0F172A"
            strokeWidth="2"
          />
          <ellipse
            cx="0"
            cy="0"
            rx="9.5"
            ry="2.6"
            transform="rotate(-20)"
            fill="none"
            stroke="#FACC15"
            strokeWidth="2.2"
          />
        </g>
      )}
      {emblemType === 'number' && (
        <g>
          <circle
            cx="0"
            cy="0"
            r="6.8"
            fill="#FFFFFF"
            stroke="#0F172A"
            strokeWidth="2"
          />
          <path
            d="M -2.5 -3.5 L 3 -3.5 L -1 4.5"
            fill="none"
            stroke="#0F172A"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}
      {emblemType === 'burger' && (
        <g>
          <path
            d="M -7 -1 C -7 -7 7 -7 7 -1 Z"
            fill="#F59E0B"
            stroke="#0F172A"
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
          <line
            x1="-7.5"
            y1="1"
            x2="7.5"
            y2="1"
            stroke="#22C55E"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <rect
            x="-7"
            y="2.2"
            width="14"
            height="3.6"
            rx="1.8"
            fill="#78350F"
            stroke="#0F172A"
            strokeWidth="1.8"
          />
        </g>
      )}
      {emblemType === 'berry' && (
        <g>
          <path
            d="M 0 7 C -6 4 -7 -2 -4 -5 C -1 -6 1 -6 4 -5 C 7 -2 6 4 0 7 Z"
            fill="#F43F5E"
            stroke="#0F172A"
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
          <polygon
            points="-4,-5 0,-8 4,-5 0,-3.5"
            fill="#22C55E"
            stroke="#0F172A"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle cx="-1.8" cy="0" r="0.9" fill="#FEF08A" />
          <circle cx="1.8" cy="0" r="0.9" fill="#FEF08A" />
          <circle cx="0" cy="3" r="0.9" fill="#FEF08A" />
        </g>
      )}
      {emblemType === 'pineapple' && (
        <g>
          <polygon
            points="-3,-3 -5,-8 0,-5 5,-8 3,-3"
            fill="#22C55E"
            stroke="#0F172A"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <ellipse
            cx="0"
            cy="2"
            rx="5.2"
            ry="5.8"
            fill="#FACC15"
            stroke="#0F172A"
            strokeWidth="1.9"
          />
          <line x1="-3" y1="-1" x2="3" y2="5" stroke="#CA8A04" strokeWidth="1.4" />
          <line x1="3" y1="-1" x2="-3" y2="5" stroke="#CA8A04" strokeWidth="1.4" />
        </g>
      )}
    </g>
  );
};

/**
 * Studio-Grade 3D-Shaded Chibi Character Portrait SVG with Multi-Stop Gradients,
 * Specular Highlights, Crisp Ink Line-Art, and Full Support for All 12 Characters, Hats & Beards!
 */
const ChibiCharacterPortrait: React.FC<{
  char: CharacterConfig;
  outfitOverride?: OutfitId;
  faceOverride?: FaceId;
  headShapeOverride?: HeadShape;
  size?: number;
}> = ({ char, outfitOverride, faceOverride, headShapeOverride, size = 86 }) => {
  const uid = React.useId().replace(/:/g, '');
  const activeOutfitId = outfitOverride || char.outfitId || char.defaultOutfit;
  const outfit =
    CHARACTER_OUTFITS.find((o) => o.id === activeOutfitId) || CHARACTER_OUTFITS[0];
  const activeFaceId: FaceId =
    faceOverride || char.faceId || char.defaultFace || 'happy_laugh';
  const activeHeadShape: HeadShape =
    headShapeOverride || char.headShape || 'round';

  const hoodieColor = outfitOverride ? outfit.primaryColor : char.primaryColor;
  const emblemType = outfit.emblemType;

  const hasVikingBeard =
    activeFaceId === 'viking_beard' ||
    (char.hatStyle === 'viking' && !faceOverride);
  const hasChefBeard =
    activeFaceId === 'chef_beard' ||
    (char.hatStyle === 'burger' && !faceOverride);

  const hairFill =
    char.id === 'blue_sporty'
      ? '#2563EB'
      : char.id === 'red_cap'
        ? '#991B1B'
        : char.id === 'pink_visor'
          ? '#DB2777'
          : char.id === 'gold_king' || char.id === 'pineapple_king'
            ? '#D97706'
            : char.id === 'pirate_capt' || char.id === 'burger_chef'
              ? '#78350F'
              : char.id === 'viking_beard'
                ? '#B45309'
                : char.id === 'strawberry_kid'
                  ? '#E11D48'
                  : char.id === 'purple_shades'
                    ? '#5B21B6'
                    : char.id === 'astro_bean'
                      ? '#0284C7'
                      : '#1E293B';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className="overflow-visible select-none drop-shadow-[0_4px_5px_rgba(4,13,24,0.5)]"
    >
      <defs>
        {/* Soft 3D Skin Lighting Overlay */}
        <radialGradient id={`skin_${uid}`} cx="44%" cy="34%" r="62%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.32" />
          <stop offset="65%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="100%" stopColor="#0F172A" stopOpacity="0.14" />
        </radialGradient>
        {/* Glossy Hoodie 3D Shading Overlay */}
        <linearGradient id={`hoodie_${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.26" />
          <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="100%" stopColor="#0F172A" stopOpacity="0.28" />
        </linearGradient>
        {/* Metallic Viking Helm Gradient */}
        <linearGradient id={`iron_${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#94A3B8" />
          <stop offset="50%" stopColor="#475569" />
          <stop offset="100%" stopColor="#1E293B" />
        </linearGradient>
        {/* Golden Crown / Trim Gradient */}
        <linearGradient id={`gold_${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="55%" stopColor="#FACC15" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        {/* Toasted Sesame Bun Gradient */}
        <linearGradient id={`bun_${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="60%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#92400E" />
        </linearGradient>
        {/* Juicy Strawberry Gradient */}
        <linearGradient id={`berry_${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FB7185" />
          <stop offset="55%" stopColor="#F43F5E" />
          <stop offset="100%" stopColor="#BE123C" />
        </linearGradient>
      </defs>

      {/* 1. Sculpted Chibi Hoodie Torso & Rounded Shoulders */}
      <g>
        <path
          d="M 19 90 C 19 69 30 59 50 59 C 70 59 81 69 81 90 C 66 93 34 93 19 90 Z"
          fill={hoodieColor}
          stroke="#0F172A"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        <path
          d="M 19 90 C 19 69 30 59 50 59 C 70 59 81 69 81 90 C 66 93 34 93 19 90 Z"
          fill={`url(#hoodie_${uid})`}
          pointerEvents="none"
        />
        {/* Shoulder Seam Lines for 3D Arm separation */}
        <path
          d="M 30 65 C 27 73 26 81 26 89"
          fill="none"
          stroke="#0F172A"
          strokeWidth="2.4"
          strokeLinecap="round"
          opacity="0.55"
        />
        <path
          d="M 70 65 C 73 73 74 81 74 89"
          fill="none"
          stroke="#0F172A"
          strokeWidth="2.4"
          strokeLinecap="round"
          opacity="0.55"
        />
        {/* Cozy Hoodie Neck Collar Cushion */}
        <path
          d="M 34 61 Q 50 69 66 61 Q 63 67 50 68 Q 37 67 34 61 Z"
          fill={outfit.secondaryColor}
          stroke="#0F172A"
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
        {/* Crisp White Drawstrings with Aglet Tips */}
        <line
          x1="42"
          y1="65"
          x2="41.5"
          y2="76"
          stroke="#FFFFFF"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        <line
          x1="58"
          y1="65"
          x2="58.5"
          y2="76"
          stroke="#FFFFFF"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        <circle cx="41.5" cy="76.5" r="1.6" fill="#FACC15" />
        <circle cx="58.5" cy="76.5" r="1.6" fill="#FACC15" />

        {/* Dynamic Chest Emblem for all 10 Outfit Types */}
        {renderOutfitEmblemSvg(emblemType, outfit.accentColor, 50, 79, 0.95)}
      </g>

      {/* 2. Neat Side Hair Tuft Accent behind Ears */}
      <path
        d="M 20 39 C 15 44, 16 53, 22 57 C 20 50, 21 44, 25 40 Z"
        fill={hairFill}
        stroke="#0F172A"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M 80 39 C 85 44, 84 53, 78 57 C 80 50, 79 44, 75 40 Z"
        fill={hairFill}
        stroke="#0F172A"
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* 3. Chibi Round Side Ears with Inner Ear Shading */}
      <g>
        <circle
          cx={activeHeadShape === 'mochi' ? 19.5 : activeHeadShape === 'bean' ? 23 : 21}
          cy="46.5"
          r="6.5"
          fill={char.skinTone}
          stroke="#0F172A"
          strokeWidth="3.4"
        />
        <circle
          cx={activeHeadShape === 'mochi' ? 20.5 : activeHeadShape === 'bean' ? 24 : 22}
          cy="46.8"
          r="3.1"
          fill={char.cheekColor}
          opacity="0.55"
        />
        <circle
          cx={activeHeadShape === 'mochi' ? 80.5 : activeHeadShape === 'bean' ? 77 : 79}
          cy="46.5"
          r="6.5"
          fill={char.skinTone}
          stroke="#0F172A"
          strokeWidth="3.4"
        />
        <circle
          cx={activeHeadShape === 'mochi' ? 79.5 : activeHeadShape === 'bean' ? 76 : 78}
          cy="46.8"
          r="3.1"
          fill={char.cheekColor}
          opacity="0.55"
        />
      </g>

      {/* Soft Chin Ambient Shadow on Collar */}
      <ellipse cx="50" cy="67.5" rx="16" ry="3.8" fill="rgba(15,23,42,0.25)" />

      {/* 4. Sculpted 3D Chibi Head Silhouette */}
      {activeHeadShape === 'squircle' ? (
        <g>
          <rect
            x="23"
            y="20"
            width="54"
            height="47.5"
            rx="16.5"
            fill={char.skinTone}
            stroke="#0F172A"
            strokeWidth="3.5"
          />
          <rect
            x="23"
            y="20"
            width="54"
            height="47.5"
            rx="16.5"
            fill={`url(#skin_${uid})`}
            pointerEvents="none"
          />
        </g>
      ) : activeHeadShape === 'bean' ? (
        <g>
          <rect
            x="24"
            y="19"
            width="52"
            height="49"
            rx="23"
            fill={char.skinTone}
            stroke="#0F172A"
            strokeWidth="3.5"
          />
          <rect
            x="24"
            y="19"
            width="52"
            height="49"
            rx="23"
            fill={`url(#skin_${uid})`}
            pointerEvents="none"
          />
        </g>
      ) : activeHeadShape === 'mochi' ? (
        <g>
          <rect
            x="20.5"
            y="20.5"
            width="59"
            height="47"
            rx="23.5"
            fill={char.skinTone}
            stroke="#0F172A"
            strokeWidth="3.5"
          />
          <rect
            x="20.5"
            y="20.5"
            width="59"
            height="47"
            rx="23.5"
            fill={`url(#skin_${uid})`}
            pointerEvents="none"
          />
        </g>
      ) : (
        <g>
          <rect
            x="22"
            y="20"
            width="56"
            height="47.5"
            rx="23.8"
            fill={char.skinTone}
            stroke="#0F172A"
            strokeWidth="3.5"
          />
          <rect
            x="22"
            y="20"
            width="56"
            height="47.5"
            rx="23.8"
            fill={`url(#skin_${uid})`}
            pointerEvents="none"
          />
        </g>
      )}

      {/* Clean Upper Hairline for Open-Crown Characters */}
      {(char.hatStyle === 'crown' || char.hatStyle === 'shades') && (
        <path
          d="M 24 31 C 26 19.5, 74 19.5, 76 31 C 68 27, 60 29, 50 27.5 C 40 29, 32 27, 24 31 Z"
          fill={hairFill}
          stroke="#0F172A"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      )}

      {/* ================================================================= */}
      {/* 5. BESPOKE 3D-SHADED HEADGEAR FOR ALL 12 CHARACTERS               */}
      {/* ================================================================= */}
      {char.hatStyle === 'baseball_cap' && (
        <g>
          {/* Backwards Snapback Brim */}
          <path
            d="M 69 22.5 C 83 22.5 89 28.5 85 33.5 C 81 36.5 73 34.5 68 31 Z"
            fill="#10B981"
            stroke="#0F172A"
            strokeWidth="3.2"
            strokeLinejoin="round"
          />
          {/* Navy Pro Cap Dome */}
          <path
            d="M 22 31 C 22 9.5 78 9.5 78 31 Z"
            fill="#1E293B"
            stroke="#0F172A"
            strokeWidth="3.4"
            strokeLinejoin="round"
          />
          <path
            d="M 29 22 C 36 13.5 60 13.5 68 20"
            fill="none"
            stroke="rgba(255,255,255,0.22)"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          {/* Emerald Sweatband */}
          <rect
            x="20.5"
            y="27.5"
            width="59"
            height="5.2"
            rx="2.6"
            fill="#10B981"
            stroke="#0F172A"
            strokeWidth="2.9"
          />
          {/* Gold Crown Pin */}
          <polygon
            points="44,25.5 45.5,18.5 50,22 54.5,18.5 56,25.5"
            fill={`url(#gold_${uid})`}
            stroke="#0F172A"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </g>
      )}

      {char.hatStyle === 'ears_hood' && (
        <g>
          {/* Perky Cat / Bear Hood Ears */}
          <polygon
            points="23,27 28.5,7.5 42,19.5"
            fill={hoodieColor}
            stroke="#0F172A"
            strokeWidth="3.3"
            strokeLinejoin="round"
          />
          <polygon points="27.5,24 30,12.5 38.5,19.5" fill="#FDA4AF" />
          <polygon
            points="77,27 71.5,7.5 58,19.5"
            fill={hoodieColor}
            stroke="#0F172A"
            strokeWidth="3.3"
            strokeLinejoin="round"
          />
          <polygon points="72.5,24 70,12.5 61.5,19.5" fill="#FDA4AF" />
          {/* Cozy Hood Dome */}
          <path
            d="M 21.5 31 C 21.5 11.5 78.5 11.5 78.5 31 Z"
            fill={hoodieColor}
            stroke="#0F172A"
            strokeWidth="3.4"
            strokeLinejoin="round"
          />
          <path
            d="M 29 22 C 38 14.5 62 14.5 71 22"
            fill="none"
            stroke="rgba(255,255,255,0.28)"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
        </g>
      )}

      {char.hatStyle === 'visor' && (
        <g>
          <path
            d="M 22 30.5 C 22 9.5 78 9.5 78 30.5 Z"
            fill={hoodieColor}
            stroke="#0F172A"
            strokeWidth="3.4"
            strokeLinejoin="round"
          />
          <path
            d="M 29 21 C 38 13.5 62 13.5 71 21"
            fill="none"
            stroke="rgba(255,255,255,0.28)"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <circle
            cx="50"
            cy="11.5"
            r="3"
            fill="#FFFFFF"
            stroke="#0F172A"
            strokeWidth="2.4"
          />
          {/* Sleek White Curved Sport Visor Brim */}
          <path
            d="M 18.5 30 C 33 23.5 67 23.5 81.5 30 C 76 34.2 64 32.2 50 32.2 C 36 32.2 24 34.2 18.5 30 Z"
            fill="#FFFFFF"
            stroke="#0F172A"
            strokeWidth="3.1"
            strokeLinejoin="round"
          />
        </g>
      )}

      {char.hatStyle === 'pirate' && (
        <g>
          {/* Crimson Pirate Bandana */}
          <path
            d="M 22 31.5 C 22 14 78 14 78 31.5 Z"
            fill="#EF4444"
            stroke="#0F172A"
            strokeWidth="3.2"
            strokeLinejoin="round"
          />
          <rect
            x="20.5"
            y="28"
            width="59"
            height="5"
            rx="2.5"
            fill="#DC2626"
            stroke="#0F172A"
            strokeWidth="2.8"
          />
          {/* Sculpted Tricorn Captain Hat with Gold Trim */}
          <path
            d="M 13.5 29 Q 50 4.5 86.5 29 L 77.5 32.5 Q 50 26 22.5 32.5 Z"
            fill="#1E293B"
            stroke="#0F172A"
            strokeWidth="3.4"
            strokeLinejoin="round"
          />
          <path
            d="M 17.5 27.5 Q 50 8.5 82.5 27.5"
            fill="none"
            stroke={`url(#gold_${uid})`}
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <circle
            cx="50"
            cy="21"
            r="4.5"
            fill={`url(#gold_${uid})`}
            stroke="#0F172A"
            strokeWidth="2.4"
          />
        </g>
      )}

      {char.hatStyle === 'headband' && (
        <g>
          {/* Fluffy Spiky Chestnut Athlete Hair */}
          <path
            d="M 24 27 C 22 14 33 8 41 12 C 46 6 55 6 59 12 C 67 8 78 14 76 27 Z"
            fill="#3E2723"
            stroke="#0F172A"
            strokeWidth="3.2"
            strokeLinejoin="round"
          />
          <path
            d="M 33 17 Q 50 11 67 17"
            fill="none"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          {/* Crisp Terrycloth Pro Headband */}
          <rect
            x="21"
            y="25.8"
            width="58"
            height="8.4"
            rx="4.2"
            fill="#FFFFFF"
            stroke="#0F172A"
            strokeWidth="3.1"
          />
          <line
            x1="23.5"
            y1="30"
            x2="76.5"
            y2="30"
            stroke={hoodieColor}
            strokeWidth="3"
          />
          <circle
            cx="50"
            cy="30"
            r="2.8"
            fill={`url(#gold_${uid})`}
            stroke="#0F172A"
            strokeWidth="1.8"
          />
        </g>
      )}

      {char.hatStyle === 'crown' && (
        <g>
          {/* Cute Space Buns + Royal Jeweled Crown */}
          <circle
            cx="25.5"
            cy="20"
            r="8.8"
            fill={hoodieColor}
            stroke="#0F172A"
            strokeWidth="3.3"
          />
          <circle cx="25.5" cy="20" r="4.3" fill="#FDA4AF" />
          <circle
            cx="74.5"
            cy="20"
            r="8.8"
            fill={hoodieColor}
            stroke="#0F172A"
            strokeWidth="3.3"
          />
          <circle cx="74.5" cy="20" r="4.3" fill="#FDA4AF" />
          <polygon
            points="34,24.5 36.5,8 44,16.5 50,5.5 56,16.5 63.5,8 66,24.5"
            fill={`url(#gold_${uid})`}
            stroke="#0F172A"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <circle cx="50" cy="18.5" r="2.4" fill="#EF4444" stroke="#0F172A" strokeWidth="1.2" />
          <circle cx="41" cy="19.5" r="1.9" fill="#38BDF8" stroke="#0F172A" strokeWidth="1.1" />
          <circle cx="59" cy="19.5" r="1.9" fill="#38BDF8" stroke="#0F172A" strokeWidth="1.1" />
        </g>
      )}

      {char.hatStyle === 'shades' && (
        <g>
          <polygon
            points="33,24.5 35.5,7.5 43.5,16.5 50,5 56.5,16.5 64.5,7.5 67,24.5"
            fill={`url(#gold_${uid})`}
            stroke="#0F172A"
            strokeWidth="3.1"
            strokeLinejoin="round"
          />
          <circle cx="50" cy="18.5" r="2.4" fill="#EF4444" stroke="#0F172A" strokeWidth="1.2" />
          <circle cx="41" cy="19.5" r="1.9" fill="#38BDF8" stroke="#0F172A" strokeWidth="1.1" />
          <circle cx="59" cy="19.5" r="1.9" fill="#38BDF8" stroke="#0F172A" strokeWidth="1.1" />
        </g>
      )}

      {char.hatStyle === 'astronaut' && (
        <g>
          {/* Golden Galactic Winglet Fins */}
          <polygon
            points="21,24 13.5,10.5 29.5,17.5"
            fill={`url(#gold_${uid})`}
            stroke="#0F172A"
            strokeWidth="2.9"
            strokeLinejoin="round"
          />
          <polygon
            points="79,24 86.5,10.5 70.5,17.5"
            fill={`url(#gold_${uid})`}
            stroke="#0F172A"
            strokeWidth="2.9"
            strokeLinejoin="round"
          />
          {/* Cosmic Navy Space Cadet Dome */}
          <path
            d="M 22 30.5 C 22 9.5 78 9.5 78 30.5 Z"
            fill="#1E293B"
            stroke="#0F172A"
            strokeWidth="3.4"
            strokeLinejoin="round"
          />
          <path
            d="M 29 20 C 39 13 61 13 71 20"
            fill="none"
            stroke="rgba(125,211,252,0.35)"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          {/* Starlight Cyan Visor Brim */}
          <path
            d="M 19 30 C 33 24 67 24 81 30 C 76 33.8 64 32 50 32 C 36 32 24 33.8 19 30 Z"
            fill="#38BDF8"
            stroke="#0F172A"
            strokeWidth="3.1"
            strokeLinejoin="round"
          />
          {/* Gold Star Badge */}
          <polygon
            points="50,13.5 52,18 56.8,18.5 53.2,21.5 54.2,26 50,23.5 45.8,26 46.8,21.5 43.2,18.5 48,18"
            fill={`url(#gold_${uid})`}
            stroke="#0F172A"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </g>
      )}

      {char.hatStyle === 'viking' && (
        <g>
          {/* Curved Ivory Viking Horns + Bronze Sockets */}
          <path
            d="M 23 24.5 C 10 19.5 7.5 8.5 15.5 4 C 17.5 11.5 22 16.5 28.5 19.5 Z"
            fill="#FEF3C7"
            stroke="#0F172A"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d="M 77 24.5 C 90 19.5 92.5 8.5 84.5 4 C 82.5 11.5 78 16.5 71.5 19.5 Z"
            fill="#FEF3C7"
            stroke="#0F172A"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <ellipse
            cx="24"
            cy="22"
            rx="3.5"
            ry="5"
            transform="rotate(-25 24 22)"
            fill={`url(#gold_${uid})`}
            stroke="#0F172A"
            strokeWidth="2.2"
          />
          <ellipse
            cx="76"
            cy="22"
            rx="3.5"
            ry="5"
            transform="rotate(25 76 22)"
            fill={`url(#gold_${uid})`}
            stroke="#0F172A"
            strokeWidth="2.2"
          />
          {/* Metallic Iron Norse Helmet Dome */}
          <path
            d="M 21 30.5 C 21 9.5 79 9.5 79 30.5 Z"
            fill={`url(#iron_${uid})`}
            stroke="#0F172A"
            strokeWidth="3.4"
            strokeLinejoin="round"
          />
          <path
            d="M 28 20 C 36 13.5 64 13.5 72 20"
            fill="none"
            stroke="rgba(255,255,255,0.32)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Golden Median Ridge & Riveted Brow Band */}
          <rect
            x="46.5"
            y="10.5"
            width="7"
            height="18.5"
            rx="2.5"
            fill={`url(#gold_${uid})`}
            stroke="#0F172A"
            strokeWidth="2.4"
          />
          <rect
            x="19.5"
            y="27"
            width="61"
            height="5.5"
            rx="2.7"
            fill={`url(#gold_${uid})`}
            stroke="#0F172A"
            strokeWidth="2.8"
          />
          <circle cx="30" cy="29.7" r="1.2" fill="#0F172A" />
          <circle cx="50" cy="29.7" r="1.2" fill="#0F172A" />
          <circle cx="70" cy="29.7" r="1.2" fill="#0F172A" />
        </g>
      )}

      {char.hatStyle === 'burger' && (
        <g>
          {/* Plump Golden-Brown Sesame Top Bun */}
          <path
            d="M 20 23.5 C 20 3.5 80 3.5 80 23.5 Z"
            fill={`url(#bun_${uid})`}
            stroke="#0F172A"
            strokeWidth="3.2"
            strokeLinejoin="round"
          />
          <path
            d="M 29 14 C 38 8.5 62 8.5 71 14"
            fill="none"
            stroke="rgba(255,255,255,0.32)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Toasted Sesame Seeds */}
          <ellipse cx="36" cy="14" rx="2.6" ry="1.3" transform="rotate(-12 36 14)" fill="#FEF3C7" stroke="#0F172A" strokeWidth="1" />
          <ellipse cx="50" cy="11.5" rx="2.6" ry="1.3" fill="#FEF3C7" stroke="#0F172A" strokeWidth="1" />
          <ellipse cx="64" cy="14" rx="2.6" ry="1.3" transform="rotate(12 64 14)" fill="#FEF3C7" stroke="#0F172A" strokeWidth="1" />
          <ellipse cx="43" cy="18" rx="2.3" ry="1.1" fill="#FEF3C7" stroke="#0F172A" strokeWidth="1" />
          <ellipse cx="57" cy="18" rx="2.3" ry="1.1" fill="#FEF3C7" stroke="#0F172A" strokeWidth="1" />
          {/* Ruffled Crisp Green Lettuce Leaf Wave */}
          <path
            d="M 18 24 C 23 20.5 28 27.5 34 24 C 40 20.5 45 27.5 50 24 C 55 20.5 60 27.5 66 24 C 72 20.5 77 27.5 82 24"
            fill="none"
            stroke="#0F172A"
            strokeWidth="6.5"
            strokeLinecap="round"
          />
          <path
            d="M 18 24 C 23 20.5 28 27.5 34 24 C 40 20.5 45 27.5 50 24 C 55 20.5 60 27.5 66 24 C 72 20.5 77 27.5 82 24"
            fill="none"
            stroke="#22C55E"
            strokeWidth="3.8"
            strokeLinecap="round"
          />
          {/* Sizzling Grilled Burger Patty */}
          <rect
            x="19"
            y="26.2"
            width="62"
            height="5.8"
            rx="2.9"
            fill="#78350F"
            stroke="#0F172A"
            strokeWidth="2.8"
          />
          {/* Melted Golden Cheddar Cheese Corners Draping Over Patty */}
          <polygon
            points="25,25.5 75,25.5 68,31 58,26.8 50,32 42,26.8 32,31"
            fill="#FACC15"
            stroke="#0F172A"
            strokeWidth="2.1"
            strokeLinejoin="round"
          />
        </g>
      )}

      {char.hatStyle === 'strawberry' && (
        <g>
          {/* Plump Glossy Strawberry Cap Dome */}
          <path
            d="M 21 30.5 C 21 9 79 9 79 30.5 Z"
            fill={`url(#berry_${uid})`}
            stroke="#0F172A"
            strokeWidth="3.4"
            strokeLinejoin="round"
          />
          <path
            d="M 29 20 C 37 13.5 63 13.5 71 20"
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          {/* Scalloped Berry Sweatband */}
          <rect
            x="20"
            y="27.2"
            width="60"
            height="4.8"
            rx="2.4"
            fill="#E11D48"
            stroke="#0F172A"
            strokeWidth="2.6"
          />
          {/* Golden Berry Seeds */}
          <ellipse cx="33" cy="22.5" rx="1.5" ry="2.1" fill="#FEF08A" stroke="#0F172A" strokeWidth="0.9" />
          <ellipse cx="44" cy="24.5" rx="1.5" ry="2.1" fill="#FEF08A" stroke="#0F172A" strokeWidth="0.9" />
          <ellipse cx="56" cy="24.5" rx="1.5" ry="2.1" fill="#FEF08A" stroke="#0F172A" strokeWidth="0.9" />
          <ellipse cx="67" cy="22.5" rx="1.5" ry="2.1" fill="#FEF08A" stroke="#0F172A" strokeWidth="0.9" />
          <ellipse cx="50" cy="19.5" rx="1.5" ry="2.1" fill="#FEF08A" stroke="#0F172A" strokeWidth="0.9" />
          {/* Curved Green Stem + Lush 5-Point Calyx Leaf Crown */}
          <path
            d="M 50 11 Q 52 5 56 3.5"
            fill="none"
            stroke="#0F172A"
            strokeWidth="5.4"
            strokeLinecap="round"
          />
          <path
            d="M 50 11 Q 52 5 56 3.5"
            fill="none"
            stroke="#22C55E"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <polygon
            points="27,15.5 39,9.5 44,16 50,7.5 56,16 61,9.5 73,15.5 59,18.5 50,14.5 41,18.5"
            fill="#22C55E"
            stroke="#0F172A"
            strokeWidth="2.6"
            strokeLinejoin="round"
          />
        </g>
      )}

      {char.hatStyle === 'pineapple' && (
        <g>
          {/* Multi-Layered Tropical Green Palm Fronds */}
          <polygon
            points="30,16.5 22,3.5 41,11.5 50,0.5 59,11.5 78,3.5 70,16.5"
            fill="#16A34A"
            stroke="#0F172A"
            strokeWidth="2.8"
            strokeLinejoin="round"
          />
          <polygon
            points="37,16.5 34,5.5 50,12.5 66,5.5 63,16.5"
            fill="#4ADE80"
            stroke="#0F172A"
            strokeWidth="2.3"
            strokeLinejoin="round"
          />
          {/* Golden Quilted Pineapple Cap Dome */}
          <path
            d="M 21.5 30.5 C 21.5 11 78.5 11 78.5 30.5 Z"
            fill={`url(#gold_${uid})`}
            stroke="#0F172A"
            strokeWidth="3.4"
            strokeLinejoin="round"
          />
          {/* Diamond Pineapple Cross-Hatching */}
          <line x1="33" y1="15.5" x2="43" y2="28.5" stroke="#B45309" strokeWidth="2" strokeLinecap="round" />
          <line x1="49" y1="13.5" x2="59" y2="28.5" stroke="#B45309" strokeWidth="2" strokeLinecap="round" />
          <line x1="67" y1="15.5" x2="57" y2="28.5" stroke="#B45309" strokeWidth="2" strokeLinecap="round" />
          <line x1="51" y1="13.5" x2="41" y2="28.5" stroke="#B45309" strokeWidth="2" strokeLinecap="round" />
          {/* Golden Rim Band */}
          <rect
            x="20.5"
            y="27.5"
            width="59"
            height="4.6"
            rx="2.3"
            fill="#F59E0B"
            stroke="#0F172A"
            strokeWidth="2.6"
          />
        </g>
      )}

      {/* ================================================================= */}
      {/* 6. EXPRESSIVE EYEBROWS, GLOSSY EYES, CHEEKS, MOUTH & 3D BEARDS    */}
      {/* ================================================================= */}
      {activeFaceId === 'fierce_pro' || hasVikingBeard ? (
        <g>
          <path
            d="M 30.5 34.8 L 44.5 38.2"
            stroke={hasVikingBeard ? '#92400E' : '#0F172A'}
            strokeWidth="3.4"
            strokeLinecap="round"
          />
          <path
            d="M 69.5 34.8 L 55.5 38.2"
            stroke={hasVikingBeard ? '#92400E' : '#0F172A'}
            strokeWidth="3.4"
            strokeLinecap="round"
          />
        </g>
      ) : (
        <g opacity="0.85">
          <path
            d="M 32.5 36.2 Q 38.5 33.8 44 36"
            fill="none"
            stroke="#0F172A"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="M 56 36 Q 61.5 33.8 67.5 36.2"
            fill="none"
            stroke="#0F172A"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </g>
      )}

      {/* Eyes / Shades / Cyber Visor */}
      {activeFaceId === 'cool_shades' ? (
        <g>
          <rect
            x="26"
            y="38"
            width="21.5"
            height="12.2"
            rx="4"
            fill="#0F172A"
            stroke="#FFFFFF"
            strokeWidth="2.4"
          />
          <rect
            x="52.5"
            y="38"
            width="21.5"
            height="12.2"
            rx="4"
            fill="#0F172A"
            stroke="#FFFFFF"
            strokeWidth="2.4"
          />
          <line x1="47.5" y1="42.5" x2="52.5" y2="42.5" stroke="#0F172A" strokeWidth="3.6" />
          <line
            x1="29.5"
            y1="41"
            x2="36"
            y2="47"
            stroke="#38BDF8"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <line
            x1="56"
            y1="41"
            x2="62.5"
            y2="47"
            stroke="#38BDF8"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
        </g>
      ) : activeFaceId === 'cyber_visor' ? (
        <g>
          <rect
            x="25.5"
            y="38"
            width="49"
            height="11.5"
            rx="5.7"
            fill="#0284C7"
            stroke="#0F172A"
            strokeWidth="3"
          />
          <rect x="28" y="39.8" width="44" height="7.8" rx="3.9" fill="#38BDF8" />
          <line
            x1="32"
            y1="42"
            x2="66"
            y2="42"
            stroke="#E0F2FE"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
        </g>
      ) : (
        <g>
          {/* Left Glossy Chibi Eye with Iris Glow & Dual Catchlights */}
          <circle
            cx="38.5"
            cy="44.5"
            r="6.8"
            fill={activeFaceId === 'star_eyes' ? '#F59E0B' : '#0F172A'}
          />
          {activeFaceId === 'star_eyes' ? (
            <polygon
              points="38.5,39.5 39.9,42.7 43.3,43 40.7,45.1 41.5,48.5 38.5,46.5 35.5,48.5 36.3,45.1 33.7,43 37.1,42.7"
              fill="#FEF08A"
            />
          ) : (
            <>
              <ellipse cx="38.5" cy="47.2" rx="4.2" ry="2.2" fill="#38BDF8" opacity="0.32" />
              <circle cx="40.6" cy="42.2" r="2.4" fill="#FFFFFF" />
              <circle cx="36.2" cy="46.8" r="1.15" fill="#FFFFFF" />
            </>
          )}

          {/* Right Glossy Chibi Eye (or Cheeky Wink) */}
          {activeFaceId === 'cheeky_wink' ? (
            <path
              d="M 55 44.5 Q 61.5 37.5 68 44.5"
              fill="none"
              stroke="#0F172A"
              strokeWidth="3.8"
              strokeLinecap="round"
            />
          ) : (
            <>
              <circle
                cx="61.5"
                cy="44.5"
                r="6.8"
                fill={activeFaceId === 'star_eyes' ? '#F59E0B' : '#0F172A'}
              />
              {activeFaceId === 'star_eyes' ? (
                <polygon
                  points="61.5,39.5 62.9,42.7 66.3,43 63.7,45.1 64.5,48.5 61.5,46.5 58.5,48.5 59.3,45.1 56.7,43 60.1,42.7"
                  fill="#FEF08A"
                />
              ) : (
                <>
                  <ellipse cx="61.5" cy="47.2" rx="4.2" ry="2.2" fill="#38BDF8" opacity="0.32" />
                  <circle cx="63.6" cy="42.2" r="2.4" fill="#FFFFFF" />
                  <circle cx="59.2" cy="46.8" r="1.15" fill="#FFFFFF" />
                </>
              )}
            </>
          )}
        </g>
      )}

      {/* Cute Button Nose Highlight */}
      <ellipse cx="50" cy="48.8" rx="1.8" ry="1.2" fill="rgba(15,23,42,0.18)" />

      {/* Rosy Blush Cheeks with Specular Dot */}
      <g>
        <ellipse cx="29" cy="51.5" rx="4.8" ry="2.6" fill={char.cheekColor} opacity="0.88" />
        <ellipse cx="71" cy="51.5" rx="4.8" ry="2.6" fill={char.cheekColor} opacity="0.88" />
      </g>

      {/* 7. Sculpted Beards OR Clean Mouth Expressions (Never overlapping!) */}
      {hasVikingBeard ? (
        <g>
          {/* Full Lush Sculpted Norse Beard */}
          <path
            d="M 23.5 51.5 C 21.5 65.5 33 74.5 50 74.5 C 67 74.5 78.5 65.5 76.5 51.5 C 70 56 60 58.5 50 58.5 C 40 58.5 30 56 23.5 51.5 Z"
            fill="#B45309"
            stroke="#0F172A"
            strokeWidth="3.1"
            strokeLinejoin="round"
          />
          {/* Twin Viking Beard Braids + Golden Clasps */}
          <rect
            x="35"
            y="65.5"
            width="8.2"
            height="10.5"
            rx="3.8"
            fill="#92400E"
            stroke="#0F172A"
            strokeWidth="2.4"
          />
          <rect
            x="56.8"
            y="65.5"
            width="8.2"
            height="10.5"
            rx="3.8"
            fill="#92400E"
            stroke="#0F172A"
            strokeWidth="2.4"
          />
          <rect x="34.5" y="70.5" width="9.2" height="2.8" rx="1.2" fill={`url(#gold_${uid})`} stroke="#0F172A" strokeWidth="1.2" />
          <rect x="56.3" y="70.5" width="9.2" height="2.8" rx="1.2" fill={`url(#gold_${uid})`} stroke="#0F172A" strokeWidth="1.2" />
          {/* Cheerful White Grin Tucked Under Mustache */}
          <path
            d="M 43 56.5 Q 50 62.5 57 56.5 Z"
            fill="#FFFFFF"
            stroke="#0F172A"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Sweeping Winged Handlebar Mustache */}
          <path
            d="M 50 52 C 42 49 32 52.5 27.5 56.5 C 35.5 58 43.5 56.5 50 54.5 C 56.5 56.5 64.5 58 72.5 56.5 C 68 52.5 58 49 50 52 Z"
            fill="#D97706"
            stroke="#0F172A"
            strokeWidth="2.6"
            strokeLinejoin="round"
          />
        </g>
      ) : hasChefBeard ? (
        <g>
          {/* Sculpted Boss Goatee Chin Beard */}
          <path
            d="M 37 59 C 37 68.5 43 72 50 72 C 57 72 63 68.5 63 59 C 58 61.5 42 61.5 37 59 Z"
            fill="#451A03"
            stroke="#0F172A"
            strokeWidth="2.8"
            strokeLinejoin="round"
          />
          {/* Happy Smile Under Mustache */}
          <path
            d="M 42.5 55.5 Q 50 63 57.5 55.5 Z"
            fill="#0F172A"
            stroke="#0F172A"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <rect x="45" y="55.5" width="10" height="2.8" rx="1" fill="#FFFFFF" />
          {/* Curled Grill-Master Handlebar Mustache */}
          <path
            d="M 50 52 C 41 48.5 31 52 27 55.5 C 34 57.5 43 56 50 54 C 57 56 66 57.5 73 55.5 C 69 52 59 48.5 50 52 Z"
            fill="#451A03"
            stroke="#0F172A"
            strokeWidth="2.6"
            strokeLinejoin="round"
          />
        </g>
      ) : activeFaceId === 'shock_rally' ? (
        <circle
          cx="50"
          cy="57.5"
          r="4.6"
          fill="#0F172A"
          stroke="#FFFFFF"
          strokeWidth="1.5"
        />
      ) : activeFaceId === 'kawaii_blush' ? (
        <path
          d="M 41.5 55.5 Q 45.7 60.5 50 55.5 Q 54.3 60.5 58.5 55.5"
          fill="none"
          stroke="#0F172A"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : activeFaceId === 'fierce_pro' ? (
        <g>
          <rect
            x="40.5"
            y="54"
            width="19"
            height="6.4"
            rx="3.2"
            fill="#FFFFFF"
            stroke="#0F172A"
            strokeWidth="2.4"
          />
          <line x1="41.5" y1="57.2" x2="58.5" y2="57.2" stroke="#0F172A" strokeWidth="1.8" />
        </g>
      ) : (
        <g>
          <path
            d="M 40.5 54 Q 50 66.5 59.5 54 Z"
            fill="#0F172A"
            stroke="#0F172A"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <rect x="44" y="54" width="12" height="3" rx="1.2" fill="#FFFFFF" />
          <ellipse
            cx="50"
            cy="60.2"
            rx="5"
            ry="3.4"
            fill="#FB7185"
            stroke="#0F172A"
            strokeWidth="1.5"
          />
        </g>
      )}
    </svg>
  );
};

/**
 * Illustrated 3D-Shaded Outfit Preview SVG for the "Outfits" Tab in Customize
 * Supports all 12 Outfits & all 10 Custom Chest Emblems!
 */
const OutfitPreviewSvg: React.FC<{ outfit: OutfitConfig }> = ({ outfit }) => {
  const uid = React.useId().replace(/:/g, '');
  return (
    <svg
      viewBox="0 0 100 100"
      className="w-16 h-16 overflow-visible select-none drop-shadow-[0_3px_4px_rgba(4,13,24,0.45)]"
    >
      <defs>
        <linearGradient id={`outfit_grad_${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.25" />
          <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="100%" stopColor="#0F172A" stopOpacity="0.28" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="91" rx="22" ry="3.5" fill="rgba(6,24,44,0.35)" />
      {/* Curved Hoodie Sleeves & White Cuffs */}
      <path
        d="M 27 28 C 16 34 11 44 9 54 L 20 59 C 22 50 26 42 32 38 Z"
        fill={outfit.primaryColor}
        stroke="#0F172A"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <rect
        x="9"
        y="53"
        width="11"
        height="4.5"
        rx="2"
        transform="rotate(24 14 55)"
        fill="#F8FAFC"
        stroke="#0F172A"
        strokeWidth="2"
      />
      <path
        d="M 73 28 C 84 34 89 44 91 54 L 80 59 C 78 50 74 42 68 38 Z"
        fill={outfit.primaryColor}
        stroke="#0F172A"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <rect
        x="80"
        y="53"
        width="11"
        height="4.5"
        rx="2"
        transform="rotate(-24 86 55)"
        fill="#F8FAFC"
        stroke="#0F172A"
        strokeWidth="2"
      />
      {/* Sporty Shorts with White Side Stripes */}
      <rect
        x="29"
        y="64"
        width="19"
        height="22"
        rx="5"
        fill={outfit.secondaryColor}
        stroke="#0F172A"
        strokeWidth="2.8"
      />
      <rect
        x="52"
        y="64"
        width="19"
        height="22"
        rx="5"
        fill={outfit.secondaryColor}
        stroke="#0F172A"
        strokeWidth="2.8"
      />
      <line
        x1="31.5"
        y1="67"
        x2="31.5"
        y2="83"
        stroke="#F8FAFC"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <line
        x1="68.5"
        y1="67"
        x2="68.5"
        y2="83"
        stroke="#F8FAFC"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* Sculpted Hoodie Torso + 3D Gradient */}
      <path
        d="M 27 68 C 25 46 28 24 38 23 L 62 23 C 72 24 75 46 73 68 Z"
        fill={outfit.primaryColor}
        stroke="#0F172A"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M 27 68 C 25 46 28 24 38 23 L 62 23 C 72 24 75 46 73 68 Z"
        fill={`url(#outfit_grad_${uid})`}
        pointerEvents="none"
      />
      {/* Hoodie Ribbed Neckline Collar */}
      <path
        d="M 38 23 Q 50 31 62 23 Q 58 28 50 28 Q 42 28 38 23 Z"
        fill={outfit.secondaryColor}
        stroke="#0F172A"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path
        d="M 31 62 C 30 46 32 30 39 26"
        fill="none"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* Kangaroo Pocket & Drawstrings */}
      <path
        d="M 36 67 L 39 57 L 61 57 L 64 67"
        fill="rgba(15,23,42,0.18)"
        stroke="#0F172A"
        strokeWidth="1.8"
      />
      <line
        x1="44"
        y1="26"
        x2="44"
        y2="37"
        stroke="#FFFFFF"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <line
        x1="56"
        y1="26"
        x2="56"
        y2="37"
        stroke="#FFFFFF"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      {/* Matching Custom Chest Emblem */}
      {renderOutfitEmblemSvg(outfit.emblemType, outfit.accentColor, 50, 44.5, 1.15)}
    </svg>
  );
};

/**
 * Instant, Ultra-HD 800x500 3D-Shaded Diorama Arena Preview for Volleyball Courts
 * Cached in memory for 0ms lag when clicking modes & 3D arenas!
 */
const MapThumbnailPreview: React.FC<{ theme: CourtTheme }> = React.memo(({ theme }) => {
  const src = useMemo(() => getMapThumbnailDataUrl(theme), [theme]);
  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-[#071D35]">
      <img
        src={src}
        alt={theme.name}
        loading="eager"
        decoding="async"
        className="w-full h-full object-cover block transition-transform duration-300 group-hover:scale-[1.06]"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-white/10" />
      <span className="pointer-events-none absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-full bg-slate-950/45 backdrop-blur-md border border-white/30 font-display text-[8px] font-black uppercase tracking-wider text-[#A3E635] shadow-sm">
        3D COURT
      </span>
    </div>
  );
});

/**
 * Instant, Ultra-HD 3D-Shaded Diorama Arena Preview for Solo & 5P Custom Gun Fight
 */
const RushMapThumbnailPreview: React.FC<{
  rushMap: ObstacleRushMapConfig;
  view?: 'ingame' | 'aerial';
}> = React.memo(({ rushMap, view = 'ingame' }) => {
  const fallbackSrc = useMemo(
    () => getRushMapThumbnailDataUrl(rushMap, view === 'aerial'),
    [rushMap, view]
  );
  const isGrandFort = rushMap.id === 'sky_carnival';
  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-[#071D35]">
      {isGrandFort ? (
        <img
          src="/assets/aistudio/651998f0-cb8c-4f33-bcf9-e1619f78ff18_6dfecea3.png"
          alt={rushMap.name}
          referrerPolicy="no-referrer"
          loading="eager"
          decoding="async"
          className={`w-full h-[200%] max-w-none object-cover block transition-transform duration-300 group-hover:scale-[1.05] ${
            view === 'aerial' ? 'object-bottom' : 'object-top'
          }`}
        />
      ) : (
        <img
          src={fallbackSrc}
          alt={rushMap.name}
          referrerPolicy="no-referrer"
          loading="eager"
          decoding="async"
          className="w-full h-full object-cover block transition-transform duration-300 group-hover:scale-[1.06]"
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#041022]/65 via-transparent to-sky-300/10" />
      <span className="pointer-events-none absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-full bg-[#06152D]/80 backdrop-blur-md border border-sky-300/40 font-display text-[8px] font-black uppercase tracking-wider text-[#FEF08A] shadow-sm">
        GUN FIGHT · UP TO 5P
      </span>
    </div>
  );
});

/**
 * Instant, Ultra-HD 3D-Shaded Diorama Arena Preview for Nuke (2 Dodgeballs · 160 HP)
 */
const LavaMapThumbnailPreview: React.FC<{
  lavaMap: FloorIsLavaMapConfig;
}> = React.memo(({ lavaMap }) => {
  const fallbackSrc = useMemo(() => getLavaMapThumbnailDataUrl(lavaMap), [lavaMap]);
  const isSunlitCove = lavaMap.id === 'volcano_summit';
  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-[#071D35]">
      <img
        src={
          isSunlitCove
            ? '/assets/aistudio/ba02df36-d93b-4ca4-bf8d-cc8a578a7461_5a548e06.png'
            : fallbackSrc
        }
        alt={lavaMap.name}
        referrerPolicy="no-referrer"
        loading="eager"
        decoding="async"
        className="w-full h-full object-cover object-center block transition-transform duration-300 group-hover:scale-[1.06]"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#041022]/65 via-transparent to-sky-300/10" />
      <span className="pointer-events-none absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-full bg-[#06152D]/80 backdrop-blur-md border border-sky-300/40 font-display text-[8px] font-black uppercase tracking-wider text-[#FEF08A] shadow-sm">
        NUKE · 2 BALLS · 160 HP
      </span>
    </div>
  );
});

/**
 * Crisp 3D Spherical-Clipped Volleyball Swatch Icon for the 10 Ball Skins
 */
const BallSkinSwatchIcon: React.FC<{
  skin: BallSkinConfig;
  size?: number;
}> = ({ skin, size = 24 }) => {
  const uid = React.useId().replace(/:/g, '');
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className="shrink-0 overflow-visible drop-shadow-[0_2px_2px_rgba(4,13,24,0.5)]"
    >
      <defs>
        <clipPath id={`ball_clip_${uid}`}>
          <circle cx="16" cy="16" r="13.5" />
        </clipPath>
        <radialGradient id={`ball_shade_${uid}`} cx="36%" cy="30%" r="68%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.35" />
          <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="100%" stopColor="#04101E" stopOpacity="0.32" />
        </radialGradient>
      </defs>
      <g clipPath={`url(#ball_clip_${uid})`}>
        <circle cx="16" cy="16" r="14" fill={skin.primaryColors[0]} />
        <path
          d="M 2 10 Q 16 18 30 10 L 31 19 Q 16 25 1 19 Z"
          fill={skin.primaryColors[1]}
          stroke="#0F172A"
          strokeWidth="1.5"
        />
        <path
          d="M 5 25 Q 16 19 27 25 L 28 31 L 4 31 Z"
          fill={skin.primaryColors[2]}
          stroke="#0F172A"
          strokeWidth="1.5"
        />
        <path
          d="M 16 2 Q 21 16 13 30"
          fill="none"
          stroke="#0F172A"
          strokeWidth="1.4"
          opacity="0.65"
        />
        <circle cx="16" cy="16" r="13.5" fill={`url(#ball_shade_${uid})`} />
      </g>
      <circle
        cx="16"
        cy="16"
        r="13.5"
        fill="none"
        stroke="#0F172A"
        strokeWidth="2.2"
      />
      <ellipse
        cx="11.5"
        cy="8.5"
        rx="3.8"
        ry="1.8"
        transform="rotate(-24 11.5 8.5)"
        fill="#FFFFFF"
        opacity="0.8"
      />
    </svg>
  );
};

export function App() {
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [gameMode, setGameMode] = useState<GameMode>('obstacle_rush');
  const [viewport, setViewport] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1280,
    h: typeof window !== 'undefined' ? window.innerHeight : 800,
  }));
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    if (typeof document === 'undefined') return false;
    return Boolean(
      document.fullscreenElement ||
        (document as unknown as { webkitFullscreenElement?: Element })
          .webkitFullscreenElement
    );
  });
  const [splashDismissed, setSplashDismissed] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [bypassPortraitLock, setBypassPortraitLock] = useState<boolean>(false);

  // Smooth initial game loading animation (0% -> 100%) when opening SIXZUN, then auto-open game
  useEffect(() => {
    let rafId = 0;
    let dismissTimer = 0;
    const startTime = performance.now();
    const durationMs = 2100;
    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - t, 2.4);
      const pct = Math.min(100, Math.round(eased * 100));
      setLoadingProgress(pct);
      if (t < 1) {
        rafId = window.requestAnimationFrame(step);
      } else {
        dismissTimer = window.setTimeout(() => {
          setSplashDismissed(true);
        }, 320);
      }
    };
    rafId = window.requestAnimationFrame(step);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(dismissTimer);
    };
  }, []);

  useEffect(() => {
    const updateViewport = () => {
      setViewport({
        w: window.innerWidth,
        h: window.innerHeight,
      });
    };
    const handleFullscreenChange = () => {
      const fsActive = Boolean(
        document.fullscreenElement ||
          (document as unknown as { webkitFullscreenElement?: Element })
            .webkitFullscreenElement
      );
      setIsFullscreen(fsActive);
      updateViewport();
      window.setTimeout(updateViewport, 120);
      window.setTimeout(updateViewport, 350);
    };
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener(
        'webkitfullscreenchange',
        handleFullscreenChange
      );
    };
  }, []);

  const isPortrait = viewport.h > viewport.w;

  const enterFullscreenAndLandscape = useCallback(async () => {
    crayonAudio.playMenuClick();
    setSplashDismissed(true);
    try {
      const docEl = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void>;
        mozRequestFullScreen?: () => Promise<void>;
        msRequestFullscreen?: () => Promise<void>;
      };
      const fsActive = Boolean(
        document.fullscreenElement ||
          (document as unknown as { webkitFullscreenElement?: Element })
            .webkitFullscreenElement
      );
      if (!fsActive) {
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        } else if (docEl.mozRequestFullScreen) {
          await docEl.mozRequestFullScreen();
        } else if (docEl.msRequestFullscreen) {
          await docEl.msRequestFullscreen();
        }
      }
    } catch {
      // Gracefully ignore if blocked by host environment or iOS Safari
    }

    try {
      const orient = (
        window.screen as Screen & {
          orientation?: { lock?: (mode: string) => Promise<void> };
        }
      )?.orientation;
      if (orient && typeof orient.lock === 'function') {
        await orient.lock('landscape');
      }
    } catch {
      // Orientation lock is optional on browsers that require physical rotation
    }

    window.dispatchEvent(new Event('resize'));
    window.setTimeout(() => window.dispatchEvent(new Event('resize')), 120);
    window.setTimeout(() => window.dispatchEvent(new Event('resize')), 350);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    crayonAudio.playMenuClick();
    const doc = document as Document & {
      webkitFullscreenElement?: Element;
      webkitExitFullscreen?: () => Promise<void>;
    };
    const fsActive = Boolean(
      doc.fullscreenElement || doc.webkitFullscreenElement
    );
    if (!fsActive) {
      await enterFullscreenAndLandscape();
    } else {
      try {
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        }
      } catch {
        // Ignore
      }
      setIsFullscreen(false);
      window.setTimeout(() => window.dispatchEvent(new Event('resize')), 120);
    }
  }, [enterFullscreenAndLandscape]);

  // Show SIXZUN Splash & Loading screen on initial open
  const showSplashScreen = !splashDismissed;

  // True when viewport is in landscape aspect ratio so side-by-side panels work across all mobile & desktop landscape screens
  const isWideLayout =
    viewport.w >= 480 && viewport.w / Math.max(1, viewport.h) >= 1.02;
  // True for compact landscape mobile viewports (e.g. 640x360, 740x360, 800x360, 844x390, 915x412)
  const isShortLandscape = isWideLayout && viewport.h < 540;

  const [selectedTourLevel] = useState<number>(1);
  const [unlockedTourLevel, setUnlockedTourLevel] = useState<number>(3);

  // Selected Character + Customizable Outfit, Face, and Head Shape!
  const [selectedCharId, setSelectedCharId] = useState<CharacterId>('green_hoodie');
  const [selectedOutfitId, setSelectedOutfitId] = useState<OutfitId>('crown_hoodie');
  const [selectedFaceId, setSelectedFaceId] = useState<FaceId>('happy_laugh');
  const [selectedHeadShape, setSelectedHeadShape] = useState<HeadShape>('round');

  const [partnerCharId] = useState<CharacterId>('blue_sporty');
  const [opponentCharId, setOpponentCharId] = useState<CharacterId>('pirate_capt');
  const [opponentPartnerCharId, setOpponentPartnerCharId] =
    useState<CharacterId>('purple_shades');

  const [customizeTab, setCustomizeTab] = useState<
    'characters' | 'outfits' | 'faces'
  >('characters');
  const [playerName, setPlayerName] = useState<string>(() => {
    try {
      return localStorage.getItem('sixgun_player_name') || 'LEO_STRIKER';
    } catch {
      return 'LEO_STRIKER';
    }
  });
  const [editingName, setEditingName] = useState<boolean>(false);
  const [hasConfirmedName, setHasConfirmedName] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sixgun_name_confirmed_v1') === '1';
    } catch {
      return false;
    }
  });
  const [nameInputDraft, setNameInputDraft] = useState<string>(() => {
    try {
      return localStorage.getItem('sixgun_player_name') || '';
    } catch {
      return '';
    }
  });

  // Real-Time Multiplayer & Voice Chat State
  const [mpConnected, setMpConnected] = useState<boolean>(multiplayerClient.connected);
  const [mpOnlineCount, setMpOnlineCount] = useState<number>(multiplayerClient.onlineCount);
  const [mpRoom, setMpRoom] = useState<CustomRoomInfo | null>(multiplayerClient.currentRoom);
  const [mpPublicRooms, setMpPublicRooms] = useState<PublicRoomSummary[]>(
    multiplayerClient.publicRooms
  );
  const [mpError, setMpError] = useState<string | null>(multiplayerClient.lastError);
  const [mpMicEnabled, setMpMicEnabled] = useState<boolean>(multiplayerClient.micEnabled);
  const [mpListenEnabled, setMpListenEnabled] = useState<boolean>(
    multiplayerClient.listenEnabled
  );
  const [mpIsSpeaking, setMpIsSpeaking] = useState<boolean>(multiplayerClient.isSpeaking);
  const [roomCodeInput, setRoomCodeInput] = useState<string>('');
  const [copiedRoomCode, setCopiedRoomCode] = useState<boolean>(false);
  const [customCreateMode, setCustomCreateMode] = useState<
    'obstacle_rush' | 'volleyball_2v2' | 'floor_is_lava'
  >('obstacle_rush');
  const [customMaxPlayers, setCustomMaxPlayers] = useState<number>(5);
  const [customFillBots, setCustomFillBots] = useState<boolean>(true);

  // Selected Volleyball Court, Solo Gun Fight Map, & 12P Floor is Lava Map!
  const [selectedThemeId, setSelectedThemeId] = useState<CourtThemeId>('pirate_cove');
  const [selectedRushMapId, setSelectedRushMapId] =
    useState<ObstacleRushMapId>('sky_carnival');
  const [selectedLavaMapId, setSelectedLavaMapId] =
    useState<FloorIsLavaMapId>('volcano_summit');
  const [difficulty, setDifficulty] = useState<AIDifficulty>('breezy');
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('dynamic_follow');
  const [winScore, setWinScore] = useState<number>(5);
  const [rushTimerMinutes, setRushTimerMinutes] = useState<3 | 5 | 6>(3);
  const [activeModifier, setActiveModifier] = useState<LevelModifier>('none');
  const [matchFormat, setMatchFormat] = useState<'1v1' | '2v2'>('2v2');
  const [ballSkinSetting, setBallSkinSetting] = useState<BallSkinId | 'auto'>('auto');
  const [activeBallSkin, setActiveBallSkin] = useState<BallSkinConfig>(BALL_SKINS[0]);

  const handleCycleBallSkinSetting = () => {
    crayonAudio.playMenuClick();
    setBallSkinSetting((prev) => {
      if (prev === 'auto') return BALL_SKINS[0].id;
      const idx = BALL_SKINS.findIndex((b) => b.id === prev);
      if (idx < 0 || idx === BALL_SKINS.length - 1) return 'auto';
      return BALL_SKINS[idx + 1].id;
    });
  };

  // Extra Functional Settings State (Gameplay, Camera, Visual FX & Audio)
  const [settingsTab, setSettingsTab] = useState<
    'gameplay' | 'camera' | 'audio'
  >('gameplay');
  const [gameSpeedMultiplier, setGameSpeedMultiplier] = useState<number>(1.0);
  const [cameraFov, setCameraFov] = useState<number>(45);
  const [landingCircleStyle, setLandingCircleStyle] = useState<
    'classic' | 'neon' | 'off'
  >('classic');
  const [enableVfx, setEnableVfx] = useState<boolean>(true);
  const [enableScreenShake, setEnableScreenShake] = useState<boolean>(true);
  const [showCallouts, setShowCallouts] = useState<boolean>(true);

  const [muted, setMuted] = useState<boolean>(false);
  const [musicVol, setMusicVol] = useState<number>(65);
  const [sfxVol, setSfxVol] = useState<number>(80);

  const actionTriggerRef = useRef<{
    spikeRequested: boolean;
    diveRequested: boolean;
    superRequested: boolean;
    liftRequested?: boolean;
    jumpRequested?: boolean;
    joystickX?: number;
    joystickY?: number;
    joystickActive?: boolean;
  }>({
    spikeRequested: false,
    diveRequested: false,
    superRequested: false,
    liftRequested: false,
    jumpRequested: false,
    joystickX: 0,
    joystickY: 0,
    joystickActive: false,
  });

  // Tap-Only Low-Opacity Floating Touch Joystick + Multi-Touch / Double-Tap / Swipe-Down state
  const invisibleJoyRef = useRef<{
    active: boolean;
    pointerId: number | null;
    originX: number;
    originY: number;
    lastTapMs: number;
    tapStreak: number;
    actionPointerId: number | null;
    actionStartX: number;
    actionStartY: number;
    actionSwipedDown: boolean;
  }>({
    active: false,
    pointerId: null,
    originX: 0,
    originY: 0,
    lastTapMs: 0,
    tapStreak: 0,
    actionPointerId: null,
    actionStartX: 0,
    actionStartY: 0,
    actionSwipedDown: false,
  });

  const joyContainerRef = useRef<HTMLDivElement | null>(null);
  const joyKnobRef = useRef<HTMLDivElement | null>(null);

  const handleInvisibleJoyDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const now = performance.now();
    if (now - invisibleJoyRef.current.lastTapMs < 360) {
      invisibleJoyRef.current.tapStreak += 1;
    } else {
      invisibleJoyRef.current.tapStreak = 1;
    }
    invisibleJoyRef.current.lastTapMs = now;

    const isSecondFingerTouch =
      invisibleJoyRef.current.active &&
      invisibleJoyRef.current.pointerId !== null &&
      invisibleJoyRef.current.pointerId !== e.pointerId;

    if (isSecondFingerTouch) {
      invisibleJoyRef.current.actionPointerId = e.pointerId;
      invisibleJoyRef.current.actionStartX = e.clientX;
      invisibleJoyRef.current.actionStartY = e.clientY;
      invisibleJoyRef.current.actionSwipedDown = false;
    }

    if (invisibleJoyRef.current.tapStreak >= 2 || isSecondFingerTouch) {
      // Double-tap OR 2nd-finger touch while holding joystick ("double touch") -> Jump!
      invisibleJoyRef.current.tapStreak = 0;
      actionTriggerRef.current.jumpRequested = true;
    }

    // Only capture and start joystick if no finger is currently controlling the joystick!
    if (!invisibleJoyRef.current.active || invisibleJoyRef.current.pointerId === null) {
      e.currentTarget.setPointerCapture(e.pointerId);
      invisibleJoyRef.current.active = true;
      invisibleJoyRef.current.pointerId = e.pointerId;
      invisibleJoyRef.current.originX = e.clientX;
      invisibleJoyRef.current.originY = e.clientY;
      actionTriggerRef.current.joystickX = 0;
      actionTriggerRef.current.joystickY = 0;
      actionTriggerRef.current.joystickActive = true;
      if (joyContainerRef.current && joyKnobRef.current) {
        joyContainerRef.current.style.display = 'flex';
        joyContainerRef.current.style.left = `${e.clientX}px`;
        joyContainerRef.current.style.top = `${e.clientY}px`;
        joyKnobRef.current.style.transform = 'translate3d(0px, 0px, 0)';
      }
    }
  }, []);

  const handleInvisibleJoyMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!invisibleJoyRef.current.active || invisibleJoyRef.current.pointerId !== e.pointerId) {
      return;
    }
    const maxR = 58;
    const dx = e.clientX - invisibleJoyRef.current.originX;
    const dy = e.clientY - invisibleJoyRef.current.originY;
    const dist = Math.hypot(dx, dy);
    if (dist < 5) {
      actionTriggerRef.current.joystickX = 0;
      actionTriggerRef.current.joystickY = 0;
      if (joyKnobRef.current) {
        joyKnobRef.current.style.transform = 'translate3d(0px, 0px, 0)';
      }
      return;
    }
    const clamped = Math.min(dist, maxR);
    const angle = Math.atan2(dy, dx);
    const clampedDx = Math.cos(angle) * clamped;
    const clampedDy = Math.sin(angle) * clamped;
    actionTriggerRef.current.joystickX = clampedDx / maxR;
    actionTriggerRef.current.joystickY = clampedDy / maxR;
    actionTriggerRef.current.joystickActive = true;
    if (joyKnobRef.current) {
      joyKnobRef.current.style.transform = `translate3d(${clampedDx}px, ${clampedDy}px, 0)`;
    }
  }, []);

  const handleInvisibleJoyEnd = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (invisibleJoyRef.current.actionPointerId === e.pointerId) {
      invisibleJoyRef.current.actionPointerId = null;
    }
    if (invisibleJoyRef.current.pointerId === e.pointerId) {
      invisibleJoyRef.current.active = false;
      invisibleJoyRef.current.pointerId = null;
      actionTriggerRef.current.joystickX = 0;
      actionTriggerRef.current.joystickY = 0;
      actionTriggerRef.current.joystickActive = false;
      if (joyContainerRef.current) {
        joyContainerRef.current.style.display = 'none';
      }
    }
  }, []);

  const [callouts, setCallouts] = useState<CalloutPopup[]>([]);
  const [rushRunKey, setRushRunKey] = useState<number>(1);
  const [rushHud, setRushHud] = useState<ObstacleRushHudState>({
    countdown: 3,
    raceTimeSec: 0,
    timeRemainingSec: 180,
    playerProgressPct: 0,
    sectionName: 'Blaster Battle Grand Fort · 4P Solo',
    stageIndex: 1,
    fallsCount: 0,
    maxFalls: 0,
    playerHp: 240,
    playerMaxHp: 240,
    playerKills: 0,
    playerDeaths: 0,
    playerRank: 1,
    weaponName: 'AUTO ASSAULT BLASTER',
    weaponTimerSec: 0,
    dashCooldownPct: 100,
    standings: [],
  });
  const [stats, setStats] = useState<MatchStats>({
    playerScore: 0,
    aiScore: 0,
    targetWinScore: 5,
    currentRally: 0,
    bestRally: 0,
    perfectSpikes: 0,
    partnerSets: 0,
    bonusHits: 0,
    superCharge: 0,
    servingSide: 'player',
    lastPointWinner: null,
    lastPointReason: '',
    matchWinner: null,
    raceTimeSec: 0,
    raceTimeLeftSec: 0,
    raceFalls: 0,
    raceMaxFalls: 4,
    raceProgressPct: 0,
  });

  useEffect(() => {
    const saved = localStorage.getItem('volley_rally_unlocked_level');
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 1) setUnlockedTourLevel(parsed);
    }
  }, []);

  const is2v2Match = matchFormat === '2v2';

  const basePlayerChar =
    CRAYON_CHARACTERS.find((c) => c.id === selectedCharId) || CRAYON_CHARACTERS[0];

  // Merge the user's chosen Outfit, Face, and Head Shape into the active 3D Player Character
  const activePlayerChar = useMemo<CharacterConfig>(
    () => ({
      ...basePlayerChar,
      outfitId: selectedOutfitId,
      faceId: selectedFaceId,
      headShape: selectedHeadShape,
    }),
    [basePlayerChar, selectedOutfitId, selectedFaceId, selectedHeadShape]
  );

  const activePartnerChar =
    CRAYON_CHARACTERS.find((c) => c.id === partnerCharId) || CRAYON_CHARACTERS[5];
  const activeOpponentChar =
    CRAYON_CHARACTERS.find((c) => c.id === opponentCharId) || CRAYON_CHARACTERS[4];
  const activeOpponentPartnerChar =
    CRAYON_CHARACTERS.find((c) => c.id === opponentPartnerCharId) || CRAYON_CHARACTERS[1];
  const activeTheme =
    COURT_THEMES.find((t) => t.id === selectedThemeId) || COURT_THEMES[0];
  const activeRushMap =
    OBSTACLE_RUSH_MAPS.find((m) => m.id === selectedRushMapId) ||
    OBSTACLE_RUSH_MAPS[0];
  const activeLavaMap =
    FLOOR_IS_LAVA_MAPS.find((m) => m.id === selectedLavaMapId) ||
    FLOOR_IS_LAVA_MAPS[0];
  const [lavaHud, setLavaHud] = useState<FloorIsLavaHudState>({
    countdown: 3,
    aliveCount: 4,
    totalPlayers: 4,
    survivalTimeSec: 0,
    timeRemainingSec: 180,
    playerLives: 1,
    playerHp: 160,
    playerMaxHp: 160,
    lavaLevelMeters: 0,
    lavaWarningState: 'STABLE',
    tilesCrumbled: 0,
    currentTier: 1,
    eliminationBanner: null,
  });

  // Connect & Subscribe to Real-Time WebSocket Multiplayer + Voice Chat Server
  useEffect(() => {
    multiplayerClient.connect();
    const unsubState = multiplayerClient.subscribe(() => {
      setMpConnected(multiplayerClient.connected);
      setMpOnlineCount(multiplayerClient.onlineCount);
      setMpRoom(multiplayerClient.currentRoom ? { ...multiplayerClient.currentRoom } : null);
      setMpPublicRooms([...multiplayerClient.publicRooms]);
      setMpError(multiplayerClient.lastError);
      setMpMicEnabled(multiplayerClient.micEnabled);
      setMpListenEnabled(multiplayerClient.listenEnabled);
      setMpIsSpeaking(multiplayerClient.isSpeaking);
    });

    const unsubMatchStart = multiplayerClient.onMatchStart((room) => {
      crayonAudio.playMenuClick();
      if (room.mode === 'volleyball_2v2') {
        setGameMode('hoop_volley');
        setMatchFormat('2v2');
        setWinScore(room.winScore || 5);
        setSelectedThemeId((room.mapId as CourtThemeId) || 'pirate_cove');
        const blueSlots = room.slots.filter((s) => s.team === 'blue');
        const redSlots = room.slots.filter((s) => s.team === 'red');
        const mySlot = room.slots.find((s) => s.playerId === multiplayerClient.playerId);
        const myTeam = mySlot?.team === 'red' ? redSlots : blueSlots;
        const rivalTeam = mySlot?.team === 'red' ? blueSlots : redSlots;
        const partnerSlot = myTeam.find((s) => s.playerId !== multiplayerClient.playerId) || myTeam[1];
        if (partnerSlot?.charId) setOpponentCharId((rivalTeam[0]?.charId as CharacterId) || 'pirate_capt');
        if (rivalTeam[1]?.charId) setOpponentPartnerCharId(rivalTeam[1].charId as CharacterId);
      } else if (room.mode === 'floor_is_lava') {
        setGameMode('floor_is_lava');
        setSelectedLavaMapId((room.mapId as FloorIsLavaMapId) || 'volcano_summit');
        setRushTimerMinutes(room.timerMinutes || 3);
      } else {
        setGameMode('obstacle_rush');
        setSelectedRushMapId((room.mapId as ObstacleRushMapId) || 'sky_carnival');
        setRushTimerMinutes(room.timerMinutes || 3);
      }
      if (room.difficulty) {
        setDifficulty(room.difficulty as AIDifficulty);
      }
      setStats((prev) => ({
        ...prev,
        playerScore: 0,
        aiScore: 0,
        targetWinScore: room.winScore || 5,
        currentRally: 0,
        bestRally: 0,
        perfectSpikes: 0,
        partnerSets: 0,
        bonusHits: 0,
        superCharge: 0,
        servingSide: 'player',
        lastPointWinner: null,
        lastPointReason: '',
        matchWinner: null,
        raceTimeSec: 0,
        raceTimeLeftSec: (room.timerMinutes || 3) * 60,
        raceFalls: 0,
        raceMaxFalls: 0,
        raceProgressPct: 0,
      }));
      setRushRunKey((prev) => prev + 1);
      setMatchTransition({
        type: 'START',
        title: `ROOM ${room.code} LIVE`,
        subtitle:
          room.mode === 'volleyball_2v2'
            ? '2v2 Team Volleyball · Custom Live'
            : room.mode === 'floor_is_lava'
              ? `${room.maxPlayers}P Nuke Showdown · Custom Live`
              : `${room.maxPlayers}P Gun Fight · Custom Live`,
      });
      window.setTimeout(() => {
        setMatchTransition((prev) => (prev?.type === 'START' ? null : prev));
      }, 820);
      setGameState('PLAYING');
    });

    return () => {
      unsubState();
      unsubMatchStart();
    };
  }, []);

  // Keep player's profile synced with the real-time server whenever name, character, outfit, or face changes
  useEffect(() => {
    multiplayerClient.syncProfile(
      playerName,
      selectedCharId,
      selectedOutfitId,
      selectedFaceId
    );
  }, [playerName, selectedCharId, selectedOutfitId, selectedFaceId]);
  const activeDiffConfig =
    DIFFICULTY_LEVELS.find((d) => d.id === difficulty) || DIFFICULTY_LEVELS[1];
  const activeModeInfo =
    SUB_GAMES_LIST.find((m) => m.id === gameMode) || SUB_GAMES_LIST[0];
  const modeAvailableThemes = useMemo(() => {
    const ids = activeModeInfo.modeThemes || [];
    const list = ids
      .map((id) => COURT_THEMES.find((t) => t.id === id))
      .filter((t): t is CourtTheme => Boolean(t));
    return list.length > 0 ? list : COURT_THEMES.slice(0, 6);
  }, [activeModeInfo]);

  const handleSelectCharacter = (char: CharacterConfig) => {
    crayonAudio.playMenuClick();
    setSelectedCharId(char.id);
    setSelectedOutfitId(char.defaultOutfit);
    setSelectedFaceId(char.defaultFace);
    setSelectedHeadShape(char.headShape);
  };

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    crayonAudio.muted = next;
    crayonAudio.syncVolleyballNatureAmbienceVolume();
    if (!next) crayonAudio.playMenuClick();
  };

  // Play the same gentle forest birds & nature background music at 5% volume in both Volleyball and Gun Fight!
  useEffect(() => {
    const isMatchActive = gameState === 'PLAYING';
    crayonAudio.setVolleyballNatureAmbience(isMatchActive, 0.05);
    return () => {
      if (!isMatchActive) {
        crayonAudio.setVolleyballNatureAmbience(false);
      }
    };
  }, [gameState, gameMode, muted]);

  const handleAddCallout = useCallback(
    (popup: {
      text: string;
      subtext?: string;
      color: string;
      bgHex?: string;
      x: number;
      y: number;
    }) => {
      const id = Date.now() + Math.random();
      setCallouts((prev) => [
        ...prev.slice(-3),
        { ...popup, bgHex: popup.bgHex || '#0F172A', id },
      ]);
      setTimeout(() => {
        setCallouts((prev) => prev.filter((c) => c.id !== id));
      }, 1100);
    },
    []
  );

  const handleRallyUpdate = useCallback(
    (
      newRally: number,
      isSweetSpot: boolean,
      superDelta: number,
      usedSuper: boolean,
      isPartnerSet: boolean
    ) => {
      setStats((prev) => ({
        ...prev,
        currentRally: newRally,
        bestRally: Math.max(prev.bestRally, newRally),
        perfectSpikes: isSweetSpot ? prev.perfectSpikes + 1 : prev.perfectSpikes,
        partnerSets: isPartnerSet ? prev.partnerSets + 1 : prev.partnerSets,
        superCharge: usedSuper
          ? 0
          : Math.min(100, prev.superCharge + superDelta),
      }));
    },
    []
  );

  const handleBonusScore = useCallback((points: number, _label: string) => {
    setStats((prev) => {
      if (prev.matchWinner) return prev;
      const nextPlayer = prev.playerScore + points;
      const won = nextPlayer >= prev.targetWinScore ? 'player' : null;
      return {
        ...prev,
        playerScore: nextPlayer,
        bonusHits: prev.bonusHits + 1,
        matchWinner: won,
      };
    });
  }, []);

  const handlePointFinished = useCallback(
    (winner: 'player' | 'ai', reason: string) => {
      setStats((prev) => {
        // Prevent duplicate point counting once a match winner is decided
        if (prev.matchWinner) return prev;

        const nextPlayer =
          winner === 'player' ? prev.playerScore + 1 : prev.playerScore;
        const nextAi = winner === 'ai' ? prev.aiScore + 1 : prev.aiScore;
        const target = prev.targetWinScore;

        let decidedWinner: 'player' | 'ai' | null = null;
        if (gameMode === 'survival' && winner === 'ai') {
          decidedWinner = 'ai';
        } else if (nextPlayer >= target) {
          decidedWinner = 'player';
        } else if (nextAi >= target) {
          decidedWinner = 'ai';
        }

        return {
          ...prev,
          playerScore: nextPlayer,
          aiScore: nextAi,
          currentRally: 0,
          servingSide: winner,
          lastPointWinner: winner,
          lastPointReason: reason,
          matchWinner: decidedWinner,
        };
      });
    },
    [gameMode]
  );

  const [matchTransition, setMatchTransition] = useState<{
    type: 'START' | 'WIN' | 'LOSS';
    title: string;
    subtitle: string;
  } | null>(null);

  // Cleanly handle Victory / Defeat transition and rewards when matchWinner is decided
  // Fixed: Changing gameState to GAME_OVER now clears matchTransition simultaneously so the Defeat/Victory banner never gets stuck!
  useEffect(() => {
    if (gameState !== 'PLAYING' || !stats.matchWinner) return;

    const isWin = stats.matchWinner === 'player';
    if (isWin) {
      crayonAudio.playScoreCheer();
      if (gameMode === 'tour') {
        const nextLvl = Math.min(
          WORLD_TOUR_LEVELS.length,
          selectedTourLevel + 1
        );
        if (nextLvl > unlockedTourLevel) {
          setUnlockedTourLevel(nextLvl);
          localStorage.setItem('volley_rally_unlocked_level', String(nextLvl));
        }
      }
    }

    const modeBadge =
      gameMode === 'floor_is_lava'
        ? `${activeLavaMap.name} · Nuke Showdown`
        : gameMode === 'obstacle_rush'
          ? `${activeRushMap.name} · Gun Fight`
          : `${activeTheme.name} · Volleyball`;

    setMatchTransition({
      type: isWin ? 'WIN' : 'LOSS',
      title: isWin ? 'VICTORY!' : 'DEFEAT',
      subtitle: stats.lastPointReason || modeBadge,
    });

    // Show Victory / Defeat celebration banner for 1.85s, then transition cleanly to the full Statistics page!
    const toGameOverTimer = window.setTimeout(() => {
      setMatchTransition(null);
      setGameState('GAME_OVER');
    }, 1850);

    return () => {
      window.clearTimeout(toGameOverTimer);
    };
  }, [
    stats.matchWinner,
    stats.lastPointReason,
    gameState,
    gameMode,
    selectedTourLevel,
    unlockedTourLevel,
    activeLavaMap.name,
    activeRushMap.name,
    activeTheme.name,
  ]);

  const pickRandomOpponents = (exclude1: CharacterId, exclude2?: CharacterId) => {
    const pool = CRAYON_CHARACTERS.filter(
      (c) => c.id !== exclude1 && c.id !== exclude2
    );
    const first = pool[Math.floor(Math.random() * pool.length)] || CRAYON_CHARACTERS[4];
    const secondPool = pool.filter((c) => c.id !== first.id);
    const second =
      secondPool[Math.floor(Math.random() * secondPool.length)] || CRAYON_CHARACTERS[1];
    return [first.id, second.id] as const;
  };

  const handleRaceFinished = useCallback(
    (
      winner: 'player' | 'ai',
      reason: string,
      raceTimeSec: number,
      timeRemainingSec: number,
      fallsCount: number,
      maxFalls: number,
      progressPct: number,
      standings?: Array<{
        id: string;
        name: string;
        kills: number;
        deaths: number;
        isPlayer: boolean;
        charId: CharacterId;
      }>
    ) => {
      setStats((prev) => {
        if (prev.matchWinner) return prev;
        return {
          ...prev,
          playerScore: winner === 'player' ? 1 : 0,
          aiScore: winner === 'ai' ? 1 : 0,
          lastPointWinner: winner,
          lastPointReason: reason,
          matchWinner: winner,
          raceTimeSec,
          raceTimeLeftSec: timeRemainingSec,
          raceFalls: fallsCount,
          raceMaxFalls: maxFalls,
          raceProgressPct: progressPct,
          arenaStandings: standings,
        };
      });
    },
    []
  );

  const resetMatchStats = (targetScore: number) => {
    setStats({
      playerScore: 0,
      aiScore: 0,
      targetWinScore: targetScore,
      currentRally: 0,
      bestRally: 0,
      perfectSpikes: 0,
      partnerSets: 0,
      bonusHits: 0,
      superCharge: 0,
      servingSide: 'player',
      lastPointWinner: null,
      lastPointReason: '',
      matchWinner: null,
      raceTimeSec: 0,
      raceTimeLeftSec: rushTimerMinutes * 60,
      raceFalls: 0,
      raceMaxFalls: activeDiffConfig.rushMaxFalls,
      raceProgressPct: 0,
    });
  };

  const triggerStartTransition = (targetMode: GameMode) => {
    const arenaLabel =
      targetMode === 'floor_is_lava'
        ? `${activeLavaMap.name} · 4P Nuke`
        : targetMode === 'obstacle_rush'
          ? `${activeRushMap.name} · 4P Gun Fight`
          : `${activeTheme.name} · Volleyball`;
    setMatchTransition({
      type: 'START',
      title: 'ARENA READY',
      subtitle: arenaLabel,
    });
    setTimeout(() => {
      setMatchTransition((prev) => (prev?.type === 'START' ? null : prev));
    }, 820);
  };

  const handleStartMatch = (overrideMode?: GameMode) => {
    crayonAudio.playMenuClick();
    const nextMode = overrideMode || gameMode;
    if (overrideMode) setGameMode(overrideMode);

    const [opp1, opp2] = pickRandomOpponents(selectedCharId, partnerCharId);
    setOpponentCharId(opp1);
    setOpponentPartnerCharId(opp2);
    resetMatchStats(winScore);
    setRushRunKey((prev) => prev + 1);
    triggerStartTransition(nextMode);
    setGameState('PLAYING');
  };

  const handleRestartMatch = () => {
    crayonAudio.playMenuClick();
    resetMatchStats(winScore);
    setRushRunKey((prev) => prev + 1);
    triggerStartTransition(gameMode);
    setGameState('PLAYING');
  };

  const rootBgClass =
    gameState === 'TITLE_MENU'
      ? 'bg-[radial-gradient(circle_at_50%_46%,#8CE9FF_0%,#48BDF8_42%,#0EA5E9_78%,#0284C7_100%)]'
      : gameState === 'SETTINGS' ||
          gameState === 'PROFILE' ||
          gameState === 'GAME_OVER' ||
          gameState === 'CUSTOM_LOBBY'
        ? 'bg-[radial-gradient(circle_at_50%_42%,#163A5F_0%,#0D233A_45%,#081728_78%,#040D18_100%)]'
        : gameState === 'CHARACTER_SELECT'
          ? 'bg-[radial-gradient(circle_at_36%_50%,#1D4ED8_0%,#0B223E_55%,#061325_100%)]'
          : 'bg-[#0B192C]';

  return (
    <div
      className={`relative w-full h-full h-dvh overflow-hidden select-none font-sans transition-colors duration-300 ${rootBgClass}`}
    >
      {/* Tactile Halftone & Hand-Drawn Sketch Texture + Ambient Studio Clouds behind Blue Menu Gradients */}
      {(gameState === 'TITLE_MENU' ||
        gameState === 'SETTINGS' ||
        gameState === 'GAME_OVER' ||
        gameState === 'CHARACTER_SELECT' ||
        gameState === 'CUSTOM_LOBBY' ||
        gameState === 'PROFILE') && (
        <div
          className={`menu-blue-texture pointer-events-none fixed inset-0 z-0 overflow-hidden ${
            gameState === 'SETTINGS' ||
            gameState === 'PROFILE' ||
            gameState === 'CUSTOM_LOBBY' ||
            gameState === 'GAME_OVER'
              ? 'opacity-45'
              : 'opacity-100'
          }`}
        >
          {/* Subtle Sunburst & Cloud Silhouette Layer */}
          <svg
            viewBox="0 0 1440 900"
            preserveAspectRatio="xMidYMid slice"
            className="w-full h-full opacity-30"
          >
            <g stroke="#38BDF8" strokeWidth="1.75" fill="none" opacity="0.35">
              <circle cx="720" cy="420" r="240" strokeDasharray="10 14" />
              <circle cx="720" cy="420" r="350" strokeDasharray="6 18" />
              <circle cx="720" cy="420" r="470" strokeDasharray="14 22" />
            </g>
            {/* Soft Layered Horizon Waves */}
            <path
              d="M 0 740 Q 360 690 720 735 T 1440 720 L 1440 900 L 0 900 Z"
              fill="rgba(14, 165, 233, 0.08)"
            />
            <path
              d="M 0 795 Q 420 755 820 795 T 1440 780 L 1440 900 L 0 900 Z"
              fill="rgba(4, 13, 24, 0.32)"
            />
          </svg>
        </div>
      )}

      {/* Subtle Studio Floor Glow under the 3D Hero in Main Menu */}
      {gameState === 'TITLE_MENU' && (
        <div className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center">
          <div className="w-[280px] h-[280px] sm:w-[460px] sm:h-[460px] rounded-full bg-white/20 blur-3xl -translate-y-4" />
        </div>
      )}

      {/* FULL-SCREEN 3D VOLLEYBALL, 4P/5P GUN FIGHT, OR NUKE CANVAS */}
      {gameMode === 'obstacle_rush' &&
      (gameState === 'PLAYING' || gameState === 'PAUSED') ? (
        <ObstacleRushCanvas
          key={`${rushRunKey}_${selectedRushMapId}_${rushTimerMinutes}_${mpRoom?.code || 'solo'}`}
          gameState={gameState}
          playerChar={activePlayerChar}
          playerDisplayName={playerName}
          customSlots={mpRoom?.mode === 'obstacle_rush' ? mpRoom.slots : undefined}
          maxCustomPlayers={mpRoom?.mode === 'obstacle_rush' ? mpRoom.maxPlayers : 4}
          rushMap={activeRushMap}
          difficulty={difficulty}
          cameraPreset={cameraPreset}
          gameSpeedMultiplier={gameSpeedMultiplier}
          cameraFov={cameraFov}
          enableVfx={enableVfx}
          enableScreenShake={enableScreenShake}
          matchDurationSec={rushTimerMinutes * 60}
          actionTriggerRef={actionTriggerRef}
          onHudUpdate={setRushHud}
          onCallout={handleAddCallout}
          onRaceFinished={handleRaceFinished}
        />
      ) : gameMode === 'floor_is_lava' &&
        (gameState === 'PLAYING' || gameState === 'PAUSED') ? (
        <FloorIsLavaCanvas
          key={`${rushRunKey}_${selectedLavaMapId}_${difficulty}_${rushTimerMinutes}_${mpRoom?.code || 'solo'}`}
          gameState={gameState}
          playerCharacter={activePlayerChar}
          playerDisplayName={playerName}
          customSlots={mpRoom?.mode === 'floor_is_lava' ? mpRoom.slots : undefined}
          aiDifficulty={difficulty}
          cameraPreset={cameraPreset}
          lavaMapId={selectedLavaMapId}
          matchDurationSec={rushTimerMinutes * 60}
          gameSpeedMultiplier={gameSpeedMultiplier}
          cameraFov={cameraFov}
          onHudUpdate={setLavaHud}
          onCallout={(text, color) =>
            handleAddCallout({
              text,
              color: color || '#FEF08A',
              x: 50,
              y: 28,
            })
          }
          onGameOver={(winner, lavaStats) => {
            setStats((prev) => {
              if (prev.matchWinner) return prev;
              return {
                ...prev,
                playerScore: lavaStats.playerScore ?? (winner === 'player' ? 3 : 0),
                aiScore: lavaStats.aiScore ?? (winner === 'ai' ? 3 : 0),
                bestRally: lavaStats.bestRally ?? 0,
                perfectSpikes: lavaStats.perfectSpikes ?? 0,
                lastPointWinner: winner,
                lastPointReason:
                  lavaStats.lastPointReason ||
                  (winner === 'player'
                    ? `${playerName} won the Nuke Showdown on ${activeLavaMap.name}!`
                    : `Rivals won the Nuke Showdown on ${activeLavaMap.name}!`),
                matchWinner: winner,
                raceTimeSec: lavaStats.raceTimeSec || 0,
                raceMaxFalls: lavaStats.raceMaxFalls || 0,
                raceProgressPct: lavaStats.raceProgressPct || 0,
              };
            });
          }}
        />
      ) : (
        <VolleyballCanvas
          gameState={gameState}
          gameMode={
            gameState === 'PLAYING' || gameState === 'PAUSED'
              ? gameMode
              : 'quick'
          }
          playerChar={activePlayerChar}
          partnerChar={activePartnerChar}
          aiChar1={activeOpponentChar}
          aiChar2={activeOpponentPartnerChar}
          is2v2={is2v2Match}
          theme={
            gameState === 'PLAYING' || gameState === 'PAUSED'
              ? activeTheme
              : COURT_THEMES[0]
          }
          difficulty={difficulty}
          cameraPreset={cameraPreset}
          modifier={activeModifier}
          servingSide={stats.servingSide}
          matchId={rushRunKey}
          ballSkinSetting={ballSkinSetting}
          onActiveBallSkinChange={setActiveBallSkin}
          actionTriggerRef={actionTriggerRef}
          onRallyUpdate={handleRallyUpdate}
          onPointFinished={handlePointFinished}
          onBonusScore={handleBonusScore}
          onCallout={handleAddCallout}
          superCharge={stats.superCharge}
          gameSpeedMultiplier={gameSpeedMultiplier}
          cameraFov={cameraFov}
          landingCircleStyle={landingCircleStyle}
          enableVfx={enableVfx}
          enableScreenShake={enableScreenShake}
        />
      )}

      {/* COZY CRAYON POST-PROCESSING VIGNETTE OVERLAY */}
      <div className="crayon-postfx fixed inset-0 z-10 pointer-events-none" />

      {/* CLEAN NORMAL WHITE FLOATING CALLOUT TEXT (Original crisp white text style!) */}
      {showCallouts && gameMode !== 'obstacle_rush' && (
        <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden">
          {callouts.map((c) => (
            <div
              key={c.id}
              style={{ left: `${c.x}%`, top: `${c.y}%` }}
              className="callout-float absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center text-center"
            >
              <span
                className="font-display text-xl sm:text-3xl font-black tracking-wider uppercase text-white"
                style={{
                  textShadow: '0 2px 8px rgba(4,16,30,0.85)',
                }}
              >
                {c.text}
              </span>
              {c.subtext && (
                <span
                  className="font-display text-xs sm:text-sm font-bold uppercase tracking-wider text-white/95 mt-0.5"
                  style={{
                    textShadow: '0 1px 6px rgba(4,16,30,0.85)',
                  }}
                >
                  {c.subtext}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Full-Screen Tap-Only Very-Low-Opacity Joystick + Double-Tap Jump Layer for Gun Fight (Native 1:1 Screen Coordinates) */}
      {gameState === 'PLAYING' && gameMode === 'obstacle_rush' && (
        <div
          onPointerDown={handleInvisibleJoyDown}
          onPointerMove={handleInvisibleJoyMove}
          onPointerUp={handleInvisibleJoyEnd}
          onPointerCancel={handleInvisibleJoyEnd}
          className="fixed inset-0 z-[15] pointer-events-auto touch-none select-none"
        >
          <div
            ref={joyContainerRef}
            style={{ display: 'none' }}
            className="pointer-events-none fixed -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-white/20 bg-white/[0.06] opacity-25 items-center justify-center"
          >
            <div
              ref={joyKnobRef}
              className="w-10 h-10 rounded-full bg-white/35 border border-white/40"
            />
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* PANEL 1: MAIN MENU (Non-Overlapping Responsive Layout for All Screens)*/}
      {/* ===================================================================== */}
      {gameState === 'TITLE_MENU' && (
        <div
          className={`fixed inset-0 z-30 flex flex-col justify-between ${
            isShortLandscape ? 'px-2.5 py-1.5' : 'p-2.5 sm:p-5 lg:p-7'
          } safe-pad pointer-events-none overflow-hidden`}
        >
          {/* TOP BAR: Left Player Card | Right Audio & Settings Studio Buttons */}
          <div className="flex items-center justify-between w-full gap-2.5 sm:gap-4 pointer-events-auto shrink-0">
            {/* Top-Left Player Profile Card with Athlete Stats */}
            <button
              onClick={() => {
                crayonAudio.playMenuClick();
                setCustomizeTab('characters');
                setGameState('CHARACTER_SELECT');
              }}
              className="group flex items-center gap-2.5 sm:gap-3.5 bg-[#071D35]/95 hover:bg-[#0D2C4D] backdrop-blur-md border-2 border-[#38BDF8]/55 hover:border-[#38BDF8] rounded-2xl p-1.5 sm:p-2 pr-3.5 sm:pr-5 shadow-[0_4px_0_#04101E,inset_0_1px_0_rgba(255,255,255,0.16)] transition-all active:translate-y-0.5 active:shadow-[0_2px_0_#04101E] cursor-pointer min-w-0 max-w-[68%] sm:max-w-none"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-b from-[#38BDF8] to-[#1D4ED8] border-2 border-white/90 flex items-center justify-center overflow-hidden shadow-md shrink-0 group-hover:scale-105 transition-transform">
                <ChibiCharacterPortrait
                  char={activePlayerChar}
                  outfitOverride={selectedOutfitId}
                  faceOverride={selectedFaceId}
                  size={42}
                />
              </div>
              <div className="text-left min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-display text-xs sm:text-base font-black text-white leading-tight tracking-tight truncate">
                    {playerName}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-gradient-to-b from-[#BEF264] to-[#84CC16] border border-[#06182C] text-[#06182C] font-display text-[9px] sm:text-[10px] font-black uppercase tracking-wider shrink-0 shadow-xs">
                    {activePlayerChar.name}
                  </span>
                </div>
                <div className="text-[10px] sm:text-xs font-bold text-[#7DD3FC] mt-0.5 truncate">
                  {activePlayerChar.title} ·{' '}
                  {gameMode === 'obstacle_rush'
                    ? activeRushMap.name
                    : gameMode === 'floor_is_lava'
                      ? activeLavaMap.name
                      : activeTheme.name}
                </div>
              </div>
            </button>

            {/* Top-Right: Small Mobile Full Screen Option (when not fullscreen) + Sound & Settings Buttons */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              {!isFullscreen && (
                <button
                  onClick={toggleFullscreen}
                  className="flex items-center gap-1 px-2.5 h-9 sm:h-10 rounded-xl bg-[#071D35]/90 hover:bg-[#0D2C4D] backdrop-blur-md border border-[#38BDF8]/50 text-[#7DD3FC] hover:text-white shadow-[0_3px_0_#04101E] transition-all active:translate-y-0.5 cursor-pointer"
                  title="Open Full Screen"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-[#38BDF8]" />
                  <span className="font-display text-[10px] font-black uppercase tracking-wider sm:hidden">
                    Full Screen
                  </span>
                </button>
              )}

              {/* Mute Toggle Button */}
              <button
                onClick={handleToggleMute}
                className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-[#071D35]/95 hover:bg-[#0D2C4D] backdrop-blur-md border-2 border-[#38BDF8]/55 hover:border-[#38BDF8] flex items-center justify-center text-white shadow-[0_4px_0_#04101E,inset_0_1px_0_rgba(255,255,255,0.16)] transition-all active:translate-y-0.5 active:shadow-[0_2px_0_#04101E] cursor-pointer"
                title={muted ? 'Unmute Audio' : 'Mute Audio'}
              >
                {muted ? (
                  <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#4ADE80]" />
                )}
              </button>

              {/* Settings Studio Button */}
              <button
                onClick={() => {
                  crayonAudio.playMenuClick();
                  setSettingsTab('gameplay');
                  setGameState('SETTINGS');
                }}
                className="flex items-center gap-2 px-3 sm:px-4 h-9 sm:h-11 rounded-xl bg-[#071D35]/95 hover:bg-[#0D2C4D] backdrop-blur-md border-2 border-[#38BDF8]/55 hover:border-[#38BDF8] text-white shadow-[0_4px_0_#04101E,inset_0_1px_0_rgba(255,255,255,0.16)] transition-all active:translate-y-0.5 active:shadow-[0_2px_0_#04101E] cursor-pointer"
                title="Open Game Settings"
              >
                <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-[#FDE047]" />
                <span className="font-display text-xs font-black uppercase tracking-wider hidden sm:inline">
                  Settings
                </span>
              </button>
            </div>
          </div>

          {/* MAIN STAGE: Left/Right Columns on Wide (PC/Landscape) with Open Center; Top/Bottom on Portrait with Open Middle */}
          <div
            className={`flex-1 min-h-0 flex ${
              isWideLayout
                ? 'flex-row items-center justify-between gap-2 px-0.5 sm:px-2'
                : 'flex-col items-center justify-between px-0.5 py-0.5'
            } w-full`}
          >
            {/* Top (Portrait) / Left (PC & Landscape): Bespoke 3D Emblem + Bottom-Left Custom Multiplayer Dock */}
            <div
              className={`flex flex-col ${
                isWideLayout
                  ? 'items-start justify-between h-full py-0.5 w-[31%] max-w-[310px]'
                  : 'items-center justify-start pt-0.5 w-full'
              } select-none shrink-0`}
            >
              <div
                className={`${
                  isShortLandscape
                    ? 'w-36 sm:w-44'
                    : isWideLayout
                      ? 'w-48 sm:w-60 lg:w-72 xl:w-80 my-auto'
                      : 'w-40 sm:w-52'
                } pointer-events-none`}
              >
                <svg
                  viewBox="0 0 460 220"
                  className="w-full h-auto overflow-visible drop-shadow-[0_12px_20px_rgba(4,16,30,0.48)]"
                >
                  <defs>
                    <linearGradient id="sixgun_top_face" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FFFFFF" />
                      <stop offset="20%" stopColor="#FEF08A" />
                      <stop offset="62%" stopColor="#A3E635" />
                      <stop offset="100%" stopColor="#16A34A" />
                    </linearGradient>
                    <linearGradient id="sixgun_bevel_grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#15803D" />
                      <stop offset="100%" stopColor="#064E3B" />
                    </linearGradient>
                    <linearGradient id="sixgun_crown_grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FEF9C3" />
                      <stop offset="45%" stopColor="#FACC15" />
                      <stop offset="100%" stopColor="#EA580C" />
                    </linearGradient>
                    <linearGradient id="sixgun_ribbon_grad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#06182C" />
                      <stop offset="50%" stopColor="#0F294A" />
                      <stop offset="100%" stopColor="#06182C" />
                    </linearGradient>
                    <clipPath id="sixgun_top_shine">
                      <rect x="0" y="45" width="460" height="44" />
                    </clipPath>
                    <clipPath id="sixgun_ball_clip">
                      <circle cx="0" cy="0" r="23" />
                    </clipPath>
                    <radialGradient id="sixgun_ball_shade" cx="35%" cy="28%" r="70%">
                      <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
                      <stop offset="58%" stopColor="#FFFFFF" stopOpacity="0" />
                      <stop offset="100%" stopColor="#04101E" stopOpacity="0.35" />
                    </radialGradient>
                  </defs>

                  <g transform="rotate(-4 225 108)">
                    <path
                      d="M 28 66 L 398 54 L 382 140 L 14 146 Z"
                      fill="#04101E"
                      opacity="0.42"
                    />
                    <path
                      d="M 34 61 L 392 50 L 378 134 L 20 140 Z"
                      fill="#071D35"
                      stroke="#38BDF8"
                      strokeWidth="3"
                      strokeOpacity="0.55"
                    />

                    <g transform="translate(68, 46) rotate(-14)">
                      <path
                        d="M -26 14 L -32 -14 L -12 -2 L 0 -22 L 12 -2 L 32 -14 L 26 14 Z"
                        fill="#04101E"
                        stroke="#04101E"
                        strokeWidth="9"
                        strokeLinejoin="round"
                        transform="translate(0, 4)"
                      />
                      <path
                        d="M -26 14 L -32 -14 L -12 -2 L 0 -22 L 12 -2 L 32 -14 L 26 14 Z"
                        fill="url(#sixgun_crown_grad)"
                        stroke="#04101E"
                        strokeWidth="6"
                        strokeLinejoin="round"
                      />
                      <rect
                        x="-26"
                        y="9"
                        width="52"
                        height="8"
                        rx="4"
                        fill="#F59E0B"
                        stroke="#04101E"
                        strokeWidth="4.5"
                      />
                      <circle cx="0" cy="-23" r="4.5" fill="#FEF08A" stroke="#04101E" strokeWidth="3.2" />
                      <circle cx="-32" cy="-15" r="4" fill="#FEF08A" stroke="#04101E" strokeWidth="3.2" />
                      <circle cx="32" cy="-15" r="4" fill="#FEF08A" stroke="#04101E" strokeWidth="3.2" />
                      <circle cx="0" cy="4" r="3.4" fill="#EF4444" stroke="#04101E" strokeWidth="2" />
                      <circle cx="-13" cy="5.5" r="2.6" fill="#38BDF8" stroke="#04101E" strokeWidth="1.8" />
                      <circle cx="13" cy="5.5" r="2.6" fill="#38BDF8" stroke="#04101E" strokeWidth="1.8" />
                    </g>

                    {[12, 9, 6, 3].map((depthOffset) => (
                      <text
                        key={depthOffset}
                        x="210"
                        y={122 + depthOffset}
                        textAnchor="middle"
                        fontFamily="'Rubik', 'Outfit', sans-serif"
                        fontWeight="900"
                        fontStyle="italic"
                        fontSize="78"
                        letterSpacing="3"
                        paintOrder="stroke fill"
                        stroke="#04101E"
                        strokeWidth="17"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        fill="#04101E"
                      >
                        SIXZUN
                      </text>
                    ))}

                    <text
                      x="210"
                      y="126"
                      textAnchor="middle"
                      fontFamily="'Rubik', 'Outfit', sans-serif"
                      fontWeight="900"
                      fontStyle="italic"
                      fontSize="78"
                      letterSpacing="3"
                      paintOrder="stroke fill"
                      stroke="#04101E"
                      strokeWidth="15"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      fill="url(#sixgun_bevel_grad)"
                    >
                      SIXZUN
                    </text>

                    <text
                      x="210"
                      y="121"
                      textAnchor="middle"
                      fontFamily="'Rubik', 'Outfit', sans-serif"
                      fontWeight="900"
                      fontStyle="italic"
                      fontSize="78"
                      letterSpacing="3"
                      paintOrder="stroke fill"
                      stroke="#04101E"
                      strokeWidth="12"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      fill="url(#sixgun_top_face)"
                    >
                      SIXZUN
                    </text>

                    <text
                      x="210"
                      y="121"
                      textAnchor="middle"
                      fontFamily="'Rubik', 'Outfit', sans-serif"
                      fontWeight="900"
                      fontStyle="italic"
                      fontSize="78"
                      letterSpacing="3"
                      fill="rgba(255,255,255,0.32)"
                      clipPath="url(#sixgun_top_shine)"
                      style={{ pointerEvents: 'none' }}
                    >
                      SIXZUN
                    </text>

                    <g transform="translate(396, 86) rotate(12)">
                      <circle cx="0" cy="4.5" r="25" fill="#04101E" />
                      <g clipPath="url(#sixgun_ball_clip)">
                        <circle cx="0" cy="0" r="24" fill="#F8FAFC" />
                        <path
                          d="M -26 -12 Q 0 2 26 -12 L 26 2 Q 0 14 -26 2 Z"
                          fill="#38BDF8"
                          stroke="#04101E"
                          strokeWidth="3.2"
                        />
                        <path
                          d="M -24 13 Q 0 2 24 13 L 24 26 L -24 26 Z"
                          fill="#FACC15"
                          stroke="#04101E"
                          strokeWidth="3.2"
                        />
                        <path
                          d="M 0 -24 Q 9 0 -5 24"
                          fill="none"
                          stroke="#04101E"
                          strokeWidth="3.2"
                          strokeLinecap="round"
                        />
                        <circle cx="0" cy="0" r="23.5" fill="url(#sixgun_ball_shade)" />
                      </g>
                      <circle
                        cx="0"
                        cy="0"
                        r="23"
                        fill="none"
                        stroke="#04101E"
                        strokeWidth="5"
                      />
                      <ellipse
                        cx="-7.5"
                        cy="-9.5"
                        rx="6.8"
                        ry="3.2"
                        transform="rotate(-25 -7.5 -9.5)"
                        fill="rgba(255,255,255,0.82)"
                      />
                    </g>

                    <g transform="translate(212, 166)">
                      <rect
                        x="-148"
                        y="-16"
                        width="296"
                        height="36"
                        rx="12"
                        fill="#04101E"
                        transform="translate(0, 5)"
                      />
                      <rect
                        x="-148"
                        y="-16"
                        width="296"
                        height="36"
                        rx="12"
                        fill="url(#sixgun_ribbon_grad)"
                        stroke="#38BDF8"
                        strokeWidth="3.2"
                      />
                      <circle cx="-126" cy="2" r="4" fill="#FACC15" />
                      <circle cx="126" cy="2" r="4" fill="#FACC15" />
                      <text
                        x="0"
                        y="9"
                        textAnchor="middle"
                        fontFamily="'Rubik', 'Outfit', sans-serif"
                        fontWeight="900"
                        fontSize="20"
                        letterSpacing="3.5"
                        fill="#FFFFFF"
                      >
                        BUMP · SET · SPIKE!
                      </text>
                    </g>
                  </g>
                </svg>
              </div>

              {/* BOTTOM-LEFT CUSTOM MULTIPLAYER DOCK (Styled to match Reference Image 3!) */}
              <div
                className={`pointer-events-auto ${
                  isWideLayout
                    ? `w-full mt-auto ${isShortLandscape ? 'p-2 gap-1.5 rounded-2xl' : 'p-3 gap-2.5 rounded-3xl'}`
                    : 'w-full max-w-[380px] mt-1 p-2 gap-1.5 rounded-2xl'
                } bg-[#051426]/95 backdrop-blur-md border border-[#38BDF8]/40 shadow-[0_8px_24px_rgba(2,8,23,0.75)] flex flex-col`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-display text-[11px] sm:text-xs font-black uppercase tracking-wider text-white truncate">
                      CUSTOM MULTIPLAYER
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#062C24] border border-emerald-400/50 font-display text-[8px] sm:text-[9px] font-black text-emerald-300 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {mpRoom ? mpRoom.code : `${mpOnlineCount} ONLINE`}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-[#091E38] border border-[#38BDF8]/35 font-display text-[8px] font-black uppercase text-[#FACC15] shrink-0">
                    HOST STUDIO
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={roomCodeInput}
                    maxLength={6}
                    placeholder="E.G. K7X9P"
                    onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter' && roomCodeInput.trim()) {
                        crayonAudio.playMenuClick();
                        await multiplayerClient.joinCustomRoom(roomCodeInput);
                        setGameState('CUSTOM_LOBBY');
                      }
                    }}
                    className={`flex-1 min-w-0 px-2.5 ${
                      isShortLandscape || !isWideLayout ? 'py-1.5 text-[11px]' : 'py-2 text-xs'
                    } rounded-xl bg-[#041020] border border-[#38BDF8]/45 focus:border-[#84CC16] font-mono font-black uppercase tracking-widest text-slate-200 placeholder:text-slate-500 outline-none text-center`}
                  />
                  <button
                    onClick={async () => {
                      crayonAudio.playMenuClick();
                      if (roomCodeInput.trim()) {
                        await multiplayerClient.joinCustomRoom(roomCodeInput);
                      }
                      setGameState('CUSTOM_LOBBY');
                    }}
                    className={`px-3.5 ${
                      isShortLandscape || !isWideLayout ? 'py-1.5 text-[10px]' : 'py-2 text-xs'
                    } rounded-xl bg-gradient-to-b from-[#38BDF8] to-[#0284C7] hover:from-[#7DD3FC] hover:to-[#0369A1] font-display font-black uppercase text-white cursor-pointer active:translate-y-0.5 shrink-0`}
                  >
                    ENTER
                  </button>
                </div>

                <button
                  onClick={() => {
                    crayonAudio.playMenuClick();
                    multiplayerClient.refreshStateHttp();
                    setGameState('CUSTOM_LOBBY');
                  }}
                  className={`w-full ${
                    isShortLandscape || !isWideLayout ? 'py-1.5 text-[11px]' : 'py-2 text-xs'
                  } rounded-xl bg-gradient-to-b from-[#FEF08A] via-[#BEF264] to-[#84CC16] hover:from-[#FEF9C3] hover:to-[#A3E635] border border-[#04101E] font-display font-black uppercase tracking-wider text-[#04101E] flex items-center justify-center gap-1.5 cursor-pointer active:translate-y-0.5 shadow-sm`}
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>CREATE CUSTOM ROOM</span>
                </button>
              </div>
            </div>

            {/* Center Open 3D Hero Showcase Window */}
            <div className="flex-1 min-h-[70px] sm:min-h-[110px] pointer-events-none" />

            {/* Bottom (Portrait) / Right (PC & Landscape): 4-Mode Quick Switcher + PLAY + 3 Menu Bars */}
            <div
              className={`flex flex-col ${
                isWideLayout
                  ? isShortLandscape
                    ? 'items-stretch justify-center gap-1.5 w-[34%] max-w-[320px]'
                    : 'items-stretch justify-center gap-2.5 w-[34%] max-w-[356px]'
                  : 'items-stretch gap-1.5 w-full max-w-[380px]'
              } pointer-events-auto shrink-0`}
            >
              {/* Clean 4-Mode Quick Switcher right above PLAY (Gun Fight | Nuke | 1v1 | 2v2) */}
              <div className="w-full grid grid-cols-4 gap-1 bg-[#051527]/95 backdrop-blur-md border-2 border-[#38BDF8]/55 rounded-2xl p-1.5 shadow-[0_4px_0_#04101E,inset_0_1px_0_rgba(255,255,255,0.12)]">
                {(
                  [
                    {
                      id: 'rush',
                      label: 'GUN FIGHT',
                      active: gameMode === 'obstacle_rush',
                      onSelect: () => setGameMode('obstacle_rush'),
                    },
                    {
                      id: 'lava',
                      label: 'NUKE',
                      active: gameMode === 'floor_is_lava',
                      onSelect: () => setGameMode('floor_is_lava'),
                    },
                    {
                      id: '1v1',
                      label: '1V1',
                      active:
                        gameMode !== 'obstacle_rush' &&
                        gameMode !== 'floor_is_lava' &&
                        matchFormat === '1v1',
                      onSelect: () => {
                        if (
                          gameMode === 'obstacle_rush' ||
                          gameMode === 'floor_is_lava'
                        ) {
                          setGameMode('duo_2v2');
                        }
                        setMatchFormat('1v1');
                      },
                    },
                    {
                      id: '2v2',
                      label: '2V2',
                      active:
                        gameMode !== 'obstacle_rush' &&
                        gameMode !== 'floor_is_lava' &&
                        matchFormat === '2v2',
                      onSelect: () => {
                        if (
                          gameMode === 'obstacle_rush' ||
                          gameMode === 'floor_is_lava'
                        ) {
                          setGameMode('duo_2v2');
                        }
                        setMatchFormat('2v2');
                      },
                    },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      crayonAudio.playMenuClick();
                      item.onSelect();
                    }}
                    className={`py-2 rounded-xl font-display text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer truncate px-1 ${
                      item.active
                        ? item.id === 'lava'
                          ? 'bg-gradient-to-b from-[#FDE047] via-[#FB923C] to-[#EA580C] text-[#04101E] border border-[#04101E] shadow-[0_2px_0_#04101E]'
                          : 'bg-gradient-to-b from-[#FEF08A] to-[#84CC16] text-[#04101E] border border-[#04101E] shadow-[0_2px_0_#04101E]'
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Giant Arcade PLAY Button for Selected Mode & Arena */}
              <button
                onClick={() => handleStartMatch()}
                className={`group relative w-full ${
                  isShortLandscape ? 'py-2.5 px-4' : 'py-3 sm:py-3.5 px-5'
                } rounded-2xl ${
                  gameMode === 'floor_is_lava'
                    ? 'bg-gradient-to-b from-[#FEF08A] via-[#FB923C] to-[#EA580C] hover:from-[#FEF9C3] hover:via-[#FDBA74] hover:to-[#F97316]'
                    : 'bg-gradient-to-b from-[#FEF08A] via-[#BEF264] to-[#65A30D] hover:from-[#FEF9C3] hover:via-[#D9F99D] hover:to-[#84CC16]'
                } border-[3px] border-[#04101E] shadow-[0_6px_0_#04101E] flex items-center justify-between gap-3 text-[#04101E] transition-all active:translate-y-1 active:shadow-[0_2px_0_#04101E] cursor-pointer overflow-hidden`}
              >
                <div className="pointer-events-none absolute inset-x-4 top-1.5 h-1.5 rounded-full bg-white/65" />
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#04101E]/15 border border-[#04101E]/25 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Play
                      className={`${
                        isShortLandscape ? 'w-5 h-5' : 'w-6 h-6'
                      } fill-[#04101E] text-[#04101E] ml-0.5`}
                    />
                  </div>
                  <div className="flex flex-col items-start leading-none min-w-0">
                    <span
                      className={`font-display ${
                        isShortLandscape ? 'text-base' : 'text-lg sm:text-2xl'
                      } font-black uppercase tracking-wide truncate`}
                    >
                      {gameMode === 'obstacle_rush'
                        ? 'PLAY GUN FIGHT'
                        : gameMode === 'floor_is_lava'
                          ? 'PLAY NUKE'
                          : `PLAY ${matchFormat}`}
                    </span>
                    <span className="font-display text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-[#04101E]/85 mt-1 truncate max-w-full">
                      {gameMode === 'obstacle_rush'
                        ? `${activeRushMap.name} · 4P Solo · ${rushTimerMinutes}:00`
                        : gameMode === 'floor_is_lava'
                          ? `${activeLavaMap.name} · 4P · 3 Rounds`
                          : `${activeTheme.name} · First to ${winScore}`}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#04101E] stroke-[3] shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* 3 Menu Action Buttons: Vertical stack on PC/Landscape, 3-col row on Portrait */}
              <div
                className={`w-full grid ${
                  isWideLayout ? 'grid-cols-1 gap-2' : 'grid-cols-3 gap-2'
                }`}
              >
                {/* 1. MODES & MAPS */}
                <button
                  onClick={() => {
                    crayonAudio.playMenuClick();
                    setGameState('MODE_SELECT');
                  }}
                  className={`group w-full flex ${
                    isWideLayout
                      ? `flex-row items-center justify-between ${isShortLandscape ? 'px-3 py-2' : 'px-3.5 py-2.5'}`
                      : 'flex-col items-center justify-center px-2 py-2.5'
                  } rounded-2xl bg-[#071D35]/95 hover:bg-[#0D2C4D] backdrop-blur-md border-2 border-[#38BDF8]/50 hover:border-[#38BDF8] text-white shadow-[0_4px_0_#04101E,inset_0_1px_0_rgba(255,255,255,0.14)] transition-all active:translate-y-0.5 active:shadow-[0_2px_0_#04101E] cursor-pointer`}
                >
                  <div
                    className={`flex ${
                      isWideLayout ? 'flex-row items-center gap-3 min-w-0' : 'flex-col items-center gap-1.5'
                    }`}
                  >
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#0D2B4D] border border-[#38BDF8]/40 flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-[#FACC15] fill-[#FACC15]" />
                    </div>
                    <div className={`${isWideLayout ? 'text-left min-w-0' : 'text-center'}`}>
                      <div
                        className={`font-display ${
                          isShortLandscape
                            ? 'text-xs'
                            : isWideLayout
                              ? 'text-xs sm:text-sm'
                              : 'text-[11px] sm:text-xs'
                        } font-black uppercase tracking-wider leading-tight truncate`}
                      >
                        MODES & MAPS
                      </div>
                      {isWideLayout && !isShortLandscape && (
                        <div className="text-[11px] font-bold text-[#7DD3FC] mt-0.5 truncate">
                          {gameMode === 'obstacle_rush'
                            ? `Gun Fight · ${activeRushMap.name}`
                            : gameMode === 'floor_is_lava'
                              ? `4P Nuke · ${activeLavaMap.name}`
                              : `${activeModeInfo.title} · ${activeTheme.name}`}
                        </div>
                      )}
                    </div>
                  </div>
                  {isWideLayout && (
                    <ChevronRight className="w-4 h-4 text-[#7DD3FC] group-hover:text-white group-hover:translate-x-0.5 transition-all stroke-[3] shrink-0" />
                  )}
                </button>

                {/* 2. CUSTOMIZE ATHLETE > */}
                <button
                  onClick={() => {
                    crayonAudio.playMenuClick();
                    setCustomizeTab('characters');
                    setGameState('CHARACTER_SELECT');
                  }}
                  className={`group w-full flex ${
                    isWideLayout
                      ? `flex-row items-center justify-between ${isShortLandscape ? 'px-3 py-2' : 'px-3.5 py-2.5'}`
                      : 'flex-col items-center justify-center px-2 py-2.5'
                  } rounded-2xl bg-[#071D35]/95 hover:bg-[#0D2C4D] backdrop-blur-md border-2 border-[#38BDF8]/50 hover:border-[#38BDF8] text-white shadow-[0_4px_0_#04101E,inset_0_1px_0_rgba(255,255,255,0.14)] transition-all active:translate-y-0.5 active:shadow-[0_2px_0_#04101E] cursor-pointer`}
                >
                  <div
                    className={`flex ${
                      isWideLayout ? 'flex-row items-center gap-3 min-w-0' : 'flex-col items-center gap-1.5'
                    }`}
                  >
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#0D2B4D] border border-[#38BDF8]/40 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-[#A3E635] fill-[#A3E635]" />
                    </div>
                    <div className={`${isWideLayout ? 'text-left min-w-0' : 'text-center'}`}>
                      <div
                        className={`font-display ${
                          isShortLandscape
                            ? 'text-xs'
                            : isWideLayout
                              ? 'text-xs sm:text-sm'
                              : 'text-[11px] sm:text-xs'
                        } font-black uppercase tracking-wider leading-tight truncate`}
                      >
                        CUSTOMIZE
                      </div>
                      {isWideLayout && !isShortLandscape && (
                        <div className="text-[11px] font-bold text-[#7DD3FC] mt-0.5 truncate">
                          12 Athletes · Outfits & Faces
                        </div>
                      )}
                    </div>
                  </div>
                  {isWideLayout && (
                    <ChevronRight className="w-4 h-4 text-[#7DD3FC] group-hover:text-white group-hover:translate-x-0.5 transition-all stroke-[3] shrink-0" />
                  )}
                </button>

                {/* 3. GAME SETTINGS > */}
                <button
                  onClick={() => {
                    crayonAudio.playMenuClick();
                    setSettingsTab('gameplay');
                    setGameState('SETTINGS');
                  }}
                  className={`group w-full flex ${
                    isWideLayout
                      ? `flex-row items-center justify-between ${isShortLandscape ? 'px-3 py-2' : 'px-3.5 py-2.5'}`
                      : 'flex-col items-center justify-center px-2 py-2.5'
                  } rounded-2xl bg-[#071D35]/95 hover:bg-[#0D2C4D] backdrop-blur-md border-2 border-[#38BDF8]/50 hover:border-[#38BDF8] text-white shadow-[0_4px_0_#04101E,inset_0_1px_0_rgba(255,255,255,0.14)] transition-all active:translate-y-0.5 active:shadow-[0_2px_0_#04101E] cursor-pointer`}
                >
                  <div
                    className={`flex ${
                      isWideLayout ? 'flex-row items-center gap-3 min-w-0' : 'flex-col items-center gap-1.5'
                    }`}
                  >
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#0D2B4D] border border-[#38BDF8]/40 flex items-center justify-center shrink-0">
                      <Settings className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-[#FDE047]" />
                    </div>
                    <div className={`${isWideLayout ? 'text-left min-w-0' : 'text-center'}`}>
                      <div
                        className={`font-display ${
                          isShortLandscape
                            ? 'text-xs'
                            : isWideLayout
                              ? 'text-xs sm:text-sm'
                              : 'text-[11px] sm:text-xs'
                        } font-black uppercase tracking-wider leading-tight truncate`}
                      >
                        SETTINGS
                      </div>
                      {isWideLayout && !isShortLandscape && (
                        <div className="text-[11px] font-bold text-[#7DD3FC] mt-0.5 truncate">
                          Difficulty · Camera · Audio
                        </div>
                      )}
                    </div>
                  </div>
                  {isWideLayout && (
                    <ChevronRight className="w-4 h-4 text-[#7DD3FC] group-hover:text-white group-hover:translate-x-0.5 transition-all stroke-[3] shrink-0" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* PANEL 2: CUSTOMIZE SCREEN (Unobstructed 3D Podium + Clean Dock/Grid)  */}
      {/* ===================================================================== */}
      {gameState === 'CHARACTER_SELECT' && (
        <div
          className={`fixed inset-0 z-30 flex flex-col justify-between ${
            isShortLandscape ? 'p-2.5' : 'p-3 sm:p-5 lg:p-7'
          } safe-pad pointer-events-none`}
        >
          {/* TOP BAR: [ < ] CUSTOMIZE on Left | Editable Name + Athlete Stats on Right */}
          <div className="flex items-center justify-between w-full pointer-events-auto gap-2 sm:gap-4 shrink-0">
            <div className="flex items-center gap-2.5 sm:gap-3.5">
              <button
                onClick={() => {
                  crayonAudio.playMenuClick();
                  setGameState('TITLE_MENU');
                }}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#071D35]/95 hover:bg-[#0D2C4D] backdrop-blur-md border-2 border-[#38BDF8]/55 hover:border-[#38BDF8] flex items-center justify-center text-white shadow-[0_4px_0_#04101E] transition-all active:translate-y-0.5 cursor-pointer shrink-0"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
              </button>
              <div>
                <h2
                  className={`font-display ${
                    isShortLandscape ? 'text-base' : 'text-lg sm:text-2xl lg:text-3xl'
                  } font-black uppercase tracking-wide text-white leading-none drop-shadow-[0_3px_0_#04101E]`}
                >
                  CUSTOMIZE ATHLETE
                </h2>
                {!isShortLandscape && (
                  <p className="hidden sm:block text-[11px] font-bold text-[#7DD3FC] mt-0.5">
                    {activePlayerChar.name} · {activePlayerChar.title}
                  </p>
                )}
              </div>
            </div>

            {/* Editable Athlete Name + Live SPD/JMP/RCH Stats in Top Bar (Zero overlap with 3D Podium!) */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              {editingName ? (
                <input
                  type="text"
                  value={playerName}
                  maxLength={16}
                  autoFocus
                  onChange={(e) => setPlayerName(e.target.value)}
                  onBlur={() => setEditingName(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setEditingName(false);
                  }}
                  className="w-32 sm:w-44 px-3 py-1.5 rounded-xl bg-[#071D35] border-2 border-[#38BDF8] text-white font-display text-xs sm:text-sm font-bold outline-none shadow-[0_3px_0_#04101E]"
                />
              ) : (
                <button
                  onClick={() => setEditingName(true)}
                  className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-[#071D35]/95 hover:bg-[#0D2C4D] backdrop-blur-md border-2 border-[#38BDF8]/50 text-white shadow-[0_3px_0_#04101E] cursor-pointer max-w-[140px] sm:max-w-[190px] transition-all active:translate-y-0.5"
                  title="Edit Display Name"
                >
                  <span className="font-display text-xs sm:text-sm font-black truncate">
                    {playerName}
                  </span>
                  <Pencil className="w-3.5 h-3.5 text-[#7DD3FC] shrink-0" />
                </button>
              )}

              <div className="flex items-center gap-2 sm:gap-3 bg-[#071D35]/95 backdrop-blur-md border-2 border-[#38BDF8]/45 rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 shadow-[0_3px_0_#04101E] text-[10px] sm:text-xs font-display font-black text-white tabular-nums shrink-0">
                <span>
                  SPD <strong className="text-[#4ADE80] ml-0.5">{activePlayerChar.speed}</strong>
                </span>
                <span className="w-px h-3.5 bg-white/20" />
                <span>
                  JMP <strong className="text-[#38BDF8] ml-0.5">{activePlayerChar.floatiness}</strong>
                </span>
                <span className="w-px h-3.5 bg-white/20" />
                <span>
                  RCH <strong className="text-[#FACC15] ml-0.5">{activePlayerChar.reach}</strong>
                </span>
              </div>

              <button
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#071D35]/95 hover:bg-[#0D2C4D] border-2 border-[#38BDF8]/55 flex items-center justify-center text-[#FEF08A] shadow-[0_3px_0_#04101E] cursor-pointer shrink-0 active:translate-y-0.5"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4 text-[#A3E635]" />
                ) : (
                  <Maximize2 className="w-4 h-4 text-[#FEF08A]" />
                )}
              </button>
            </div>
          </div>

          {/* RESPONSIVE BODY: Left Tabs + Open 3D Center + Right Grid on Wide; Top Tabs + Open 3D Center + Bottom Drawer on Portrait */}
          <div
            className={`flex-1 min-h-0 flex ${
              isWideLayout
                ? 'flex-row items-center justify-between gap-4 py-2'
                : 'flex-col justify-between gap-2 pt-2 pb-0.5'
            } w-full`}
          >
            {/* Left Column (PC/Landscape) / Top Row (Portrait): 3 Category Tabs */}
            <div
              className={`${
                isWideLayout ? 'w-44 sm:w-48 lg:w-52' : 'w-full'
              } pointer-events-auto shrink-0`}
            >
              <div
                className={
                  isWideLayout
                    ? `flex flex-col ${isShortLandscape ? 'gap-2' : 'gap-2.5'} bg-[#071D35]/90 backdrop-blur-md border-2 border-[#38BDF8]/40 rounded-2xl p-2 shadow-[0_6px_0_#04101E]`
                    : 'grid grid-cols-3 gap-1.5 sm:gap-2 bg-[#071D35]/90 backdrop-blur-md border-2 border-[#38BDF8]/40 rounded-2xl p-1.5 shadow-[0_4px_0_#04101E]'
                }
              >
                {(
                  [
                    { id: 'characters', label: 'Characters', count: CRAYON_CHARACTERS.length, icon: User },
                    { id: 'outfits', label: 'Outfits', count: CHARACTER_OUTFITS.length, icon: Shirt },
                    { id: 'faces', label: 'Faces', count: CHARACTER_FACES.length, icon: Smile },
                  ] as const
                ).map((tab) => {
                  const Icon = tab.icon;
                  const active = customizeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        crayonAudio.playMenuClick();
                        setCustomizeTab(tab.id);
                      }}
                      className={`flex items-center ${
                        isWideLayout ? 'justify-between' : 'justify-center'
                      } gap-2 ${
                        isShortLandscape
                          ? 'px-3 py-2 text-xs'
                          : 'px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm'
                      } rounded-xl font-display font-black uppercase tracking-wide transition-all cursor-pointer ${
                        active
                          ? 'bg-gradient-to-b from-[#FEF08A] to-[#84CC16] text-[#04101E] border-2 border-[#04101E] shadow-[0_3px_0_#04101E]'
                          : 'bg-[#0C2542]/90 hover:bg-[#13345B] text-slate-200 hover:text-white border border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{tab.label}</span>
                      </div>
                      {isWideLayout && (
                        <span
                          className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded-md ${
                            active
                              ? 'bg-[#04101E]/15 text-[#04101E]'
                              : 'bg-white/10 text-[#7DD3FC]'
                          }`}
                        >
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 100% Unobstructed Open 3D Studio Podium Window */}
            <div className="flex-1 min-h-[110px] pointer-events-none" />

            {/* Right Panel (PC/Landscape) / Bottom Drawer (Portrait): Dynamic Grid for Characters / Outfits / Faces */}
            <div
              className={`${
                isWideLayout
                  ? 'w-[44%] max-w-[400px] h-full max-h-full flex flex-col justify-center'
                  : 'w-full max-h-[42dvh] flex flex-col'
              } pointer-events-auto shrink-0 min-h-0`}
            >
              <div
                className={`bg-[#071D35]/95 backdrop-blur-md border-2 border-[#38BDF8]/45 rounded-2xl ${
                  isShortLandscape ? 'p-2' : 'p-3 sm:p-4'
                } shadow-[0_8px_0_#04101E] max-h-full flex flex-col overflow-hidden`}
              >
                <div className="flex items-center justify-between mb-2 sm:mb-3 pb-2 border-b border-white/10">
                  <h3 className="font-display text-xs sm:text-base font-black uppercase tracking-wider text-white">
                    {customizeTab === 'characters'
                      ? 'Select Athlete'
                      : customizeTab === 'outfits'
                        ? 'Select Outfit'
                        : 'Select Expression'}
                  </h3>
                  <span className="text-[11px] sm:text-xs font-display font-bold text-[#FEF08A] truncate">
                    {activePlayerChar.name}
                  </span>
                </div>

                {/* TAB 1: CHARACTERS */}
                {customizeTab === 'characters' && (
                  <div
                    className={`grid ${
                      isWideLayout ? 'grid-cols-4' : 'grid-cols-4 sm:grid-cols-6'
                    } gap-2 ${
                      isShortLandscape
                        ? 'max-h-[175px]'
                        : isWideLayout
                          ? 'max-h-[290px] lg:max-h-[340px]'
                          : 'max-h-[185px] sm:max-h-[225px]'
                    } overflow-y-auto pr-1`}
                  >
                    {CRAYON_CHARACTERS.map((char) => {
                      const isSelected = selectedCharId === char.id;
                      return (
                        <button
                          key={char.id}
                          onClick={() => handleSelectCharacter(char)}
                          className={`group relative aspect-[4/5] rounded-xl overflow-hidden flex flex-col items-center justify-between p-1.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-gradient-to-b from-[#38BDF8] to-[#1D4ED8] border-2 border-[#FEF08A] ring-2 ring-[#FEF08A]/50 shadow-[0_3px_0_#04101E]'
                              : 'bg-[#0E2947]/95 hover:bg-[#153961] border-2 border-[#38BDF8]/25 hover:border-[#38BDF8]/60'
                          }`}
                        >
                          <div className="w-full flex-1 flex items-center justify-center pt-0.5 min-h-0 group-hover:scale-105 transition-transform">
                            <ChibiCharacterPortrait char={char} size={isShortLandscape ? 38 : 48} />
                          </div>
                          <span className="font-display text-[9px] sm:text-[10px] font-black text-white uppercase tracking-wider truncate w-full text-center bg-[#04101E]/45 rounded-md py-0.5">
                            {char.name}
                          </span>

                          {isSelected && (
                            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#84CC16] border border-[#04101E] flex items-center justify-center shadow">
                              <Check className="w-2.5 h-2.5 text-[#04101E] stroke-[3.5]" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* TAB 2: OUTFITS */}
                {customizeTab === 'outfits' && (
                  <div
                    className={`grid ${
                      isWideLayout ? 'grid-cols-4' : 'grid-cols-4 sm:grid-cols-6'
                    } gap-2 ${
                      isShortLandscape
                        ? 'max-h-[175px]'
                        : isWideLayout
                          ? 'max-h-[290px] lg:max-h-[340px]'
                          : 'max-h-[185px] sm:max-h-[225px]'
                    } overflow-y-auto pr-1`}
                  >
                    {CHARACTER_OUTFITS.map((outfit) => {
                      const isSelected = selectedOutfitId === outfit.id;
                      return (
                        <button
                          key={outfit.id}
                          onClick={() => {
                            crayonAudio.playMenuClick();
                            setSelectedOutfitId(outfit.id);
                          }}
                          className={`group relative aspect-[4/5] rounded-xl overflow-hidden flex flex-col items-center justify-between p-1.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-gradient-to-b from-[#38BDF8] to-[#1D4ED8] border-2 border-[#FEF08A] ring-2 ring-[#FEF08A]/50 shadow-[0_3px_0_#04101E]'
                              : 'bg-[#0E2947]/95 hover:bg-[#153961] border-2 border-[#38BDF8]/25 hover:border-[#38BDF8]/60'
                          }`}
                        >
                          <div className="flex-1 flex items-center justify-center min-h-0 group-hover:scale-105 transition-transform">
                            <OutfitPreviewSvg outfit={outfit} />
                          </div>
                          <span className="font-display text-[9px] sm:text-[10px] font-black text-white truncate w-full text-center bg-[#04101E]/45 rounded-md py-0.5">
                            {outfit.name}
                          </span>
                          {isSelected && (
                            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#84CC16] border border-[#04101E] flex items-center justify-center shadow">
                              <Check className="w-2.5 h-2.5 text-[#04101E] stroke-[3.5]" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* TAB 3: FACES & HEAD SHAPES */}
                {customizeTab === 'faces' && (
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between gap-1.5 bg-[#051426] p-1.5 rounded-xl border border-[#38BDF8]/30 overflow-x-auto no-scrollbar">
                      <span className="text-[10px] font-display font-black uppercase tracking-wider text-[#7DD3FC] pl-1.5 shrink-0">
                        Head:
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {HEAD_SHAPES.map((hs) => {
                          const activeShape = selectedHeadShape === hs.id;
                          return (
                            <button
                              key={hs.id}
                              onClick={() => {
                                crayonAudio.playMenuClick();
                                setSelectedHeadShape(hs.id);
                              }}
                              className={`px-2.5 py-1 rounded-lg font-display text-[10px] font-black uppercase transition-all cursor-pointer whitespace-nowrap ${
                                activeShape
                                  ? 'bg-[#FACC15] text-[#04101E] shadow-xs'
                                  : 'bg-[#0E2947] text-slate-200 hover:bg-[#153961]'
                              }`}
                            >
                              {hs.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div
                      className={`grid ${
                        isWideLayout ? 'grid-cols-4' : 'grid-cols-4 sm:grid-cols-6'
                      } gap-2 ${
                        isShortLandscape
                          ? 'max-h-[130px]'
                          : isWideLayout
                            ? 'max-h-[235px] lg:max-h-[280px]'
                            : 'max-h-[150px] sm:max-h-[185px]'
                      } overflow-y-auto pr-1`}
                    >
                      {CHARACTER_FACES.map((face) => {
                        const isSelected = selectedFaceId === face.id;
                        return (
                          <button
                            key={face.id}
                            onClick={() => {
                              crayonAudio.playMenuClick();
                              setSelectedFaceId(face.id);
                              setSelectedHeadShape(face.defaultHeadShape);
                            }}
                            className={`group relative aspect-[4/5] rounded-xl overflow-hidden flex flex-col items-center justify-between p-1.5 transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-gradient-to-b from-[#38BDF8] to-[#1D4ED8] border-2 border-[#FEF08A] ring-2 ring-[#FEF08A]/50 shadow-[0_3px_0_#04101E]'
                                : 'bg-[#0E2947]/95 hover:bg-[#153961] border-2 border-[#38BDF8]/25 hover:border-[#38BDF8]/60'
                            }`}
                          >
                            <div className="w-full flex-1 flex items-center justify-center min-h-0 group-hover:scale-105 transition-transform">
                              <ChibiCharacterPortrait
                                char={activePlayerChar}
                                outfitOverride={selectedOutfitId}
                                faceOverride={face.id}
                                headShapeOverride={face.defaultHeadShape}
                                size={isShortLandscape ? 36 : 46}
                              />
                            </div>
                            <span className="font-display text-[9px] sm:text-[10px] font-black text-white truncate w-full text-center bg-[#04101E]/45 rounded-md py-0.5">
                              {face.name}
                            </span>
                            {isSelected && (
                              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#84CC16] border border-[#04101E] flex items-center justify-center shadow">
                                <Check className="w-2.5 h-2.5 text-[#04101E] stroke-[3.5]" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* PANEL 3: SELECT MODE & ARENA / MAP (Gun Fight, Dodgeball & Volleyball)*/}
      {/* ===================================================================== */}
      {gameState === 'MODE_SELECT' && (
        <div
          className={`fixed inset-0 z-30 pointer-events-auto flex flex-col justify-between ${
            isShortLandscape ? 'p-2.5' : 'p-3 sm:p-5 lg:p-7'
          } safe-pad bg-[#051324]/88 backdrop-blur-md overflow-hidden`}
        >
          {/* TOP BAR */}
          <div className="flex items-center justify-between w-full gap-2 sm:gap-4 shrink-0">
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <button
                onClick={() => {
                  crayonAudio.playMenuClick();
                  setGameState('TITLE_MENU');
                }}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#071D35] hover:bg-[#0D2C4D] border-2 border-[#38BDF8]/55 hover:border-[#38BDF8] flex items-center justify-center text-white shadow-[0_4px_0_#04101E] transition-all active:translate-y-0.5 cursor-pointer shrink-0"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
              </button>
              <div className="min-w-0">
                <h2
                  className={`font-display ${
                    isShortLandscape ? 'text-base' : 'text-lg sm:text-2xl lg:text-3xl'
                  } font-black uppercase tracking-wide text-white leading-none drop-shadow-[0_3px_0_#04101E] truncate`}
                >
                  MODES & 3D ARENAS
                </h2>
                {!isShortLandscape && (
                  <p className="hidden sm:block text-[11px] font-bold text-[#7DD3FC] mt-0.5 truncate">
                    4P Gun Fight · 4P Nuke (3 Rounds) · 1v1 & 2v2 Beach Volleyball
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {gameMode !== 'obstacle_rush' && gameMode !== 'floor_is_lava' && (
                <button
                  onClick={handleCycleBallSkinSetting}
                  title="Click to cycle Ball Skins or keep Auto-Changing every point!"
                  className="flex items-center gap-2 px-3 py-1.5 sm:py-2 rounded-xl bg-[#071D35] hover:bg-[#0D2C4D] border-2 border-[#4ADE80]/55 shadow-[0_3px_0_#04101E] cursor-pointer transition-all active:translate-y-0.5"
                >
                  <BallSkinSwatchIcon
                    skin={
                      ballSkinSetting === 'auto'
                        ? activeBallSkin
                        : BALL_SKINS.find((b) => b.id === ballSkinSetting) ||
                          BALL_SKINS[0]
                    }
                    size={20}
                  />
                  <span className="font-display text-xs font-black text-white hidden sm:inline">
                    {ballSkinSetting === 'auto'
                      ? `Auto: ${activeBallSkin.name}`
                      : activeBallSkin.name}
                  </span>
                </button>
              )}

              <div className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-[#071D35] border-2 border-[#38BDF8]/45 font-display text-xs font-black text-[#FEF08A] shadow-[0_3px_0_#04101E]">
                {activeModeInfo.tabLabel.toUpperCase()}
              </div>

              <button
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#071D35] hover:bg-[#0D2C4D] border-2 border-[#38BDF8]/55 flex items-center justify-center text-[#FEF08A] shadow-[0_3px_0_#04101E] cursor-pointer shrink-0 active:translate-y-0.5"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4 text-[#A3E635]" />
                ) : (
                  <Maximize2 className="w-4 h-4 text-[#FEF08A]" />
                )}
              </button>
            </div>
          </div>

          {/* RESPONSIVE BODY: 12-column studio layout on PC/Landscape; Stacked on Portrait */}
          <div
            className={`flex-1 min-h-0 ${
              isWideLayout
                ? 'grid grid-cols-12 gap-3 sm:gap-4 overflow-hidden'
                : 'flex flex-col gap-2.5 overflow-y-auto'
            } items-stretch py-2 sm:py-3`}
          >
            {/* Mode Tabs: Left 3 cols (or 2 on xl) on PC/Landscape, Horizontal bar on Portrait */}
            <div
              className={`${
                isWideLayout
                  ? 'col-span-3 lg:col-span-2 flex flex-col justify-between gap-2 bg-[#071D35]/90 border-2 border-[#38BDF8]/35 rounded-2xl p-2 shadow-[0_6px_0_#04101E]'
                  : 'flex flex-row gap-1.5 overflow-x-auto no-scrollbar pb-0.5'
              } shrink-0`}
            >
              {SUB_GAMES_LIST.map((mode) => {
                const isSelected = gameMode === mode.id;
                const Icon =
                  mode.id === 'obstacle_rush'
                    ? Zap
                    : mode.id === 'floor_is_lava'
                      ? Flame
                      : mode.id === 'survival'
                        ? Skull
                        : mode.id === 'crab_target'
                          ? Wrench
                          : Users;
                return (
                  <button
                    key={mode.id}
                    onClick={() => {
                      crayonAudio.playMenuClick();
                      setGameMode(mode.id);
                      if (mode.id === 'survival') setMatchFormat('1v1');
                      if (mode.id === 'hoop_volley') setMatchFormat('2v2');
                      if (
                        mode.id !== 'obstacle_rush' &&
                        mode.id !== 'floor_is_lava' &&
                        mode.modeThemes.length > 0 &&
                        !mode.modeThemes.includes(selectedThemeId)
                      ) {
                        setSelectedThemeId(mode.defaultTheme);
                      }
                    }}
                    className={`flex items-center gap-2.5 ${
                      isShortLandscape
                        ? 'px-2.5 py-2'
                        : 'px-3 sm:px-3.5 py-2.5 sm:py-3'
                    } rounded-xl font-display transition-all cursor-pointer shrink-0 flex-1 ${
                      isSelected
                        ? mode.id === 'floor_is_lava'
                          ? 'bg-gradient-to-r from-[#FEF08A] via-[#FB923C] to-[#EA580C] text-[#04101E] border-2 border-[#04101E] shadow-[0_3px_0_#04101E]'
                          : mode.id === 'obstacle_rush'
                            ? 'bg-gradient-to-r from-[#FEF08A] via-[#FACC15] to-[#F97316] text-[#04101E] border-2 border-[#04101E] shadow-[0_3px_0_#04101E]'
                            : 'bg-gradient-to-b from-[#FEF08A] to-[#84CC16] text-[#04101E] border-2 border-[#04101E] shadow-[0_3px_0_#04101E]'
                        : 'bg-[#0C2542]/90 hover:bg-[#13345B] text-slate-200 hover:text-white border border-white/10'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="text-[11px] sm:text-xs font-black uppercase tracking-wide whitespace-nowrap truncate">
                      {mode.tabLabel}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Center Panel (6 cols on md, 7 cols on lg): Clean Real 3D Map Cards */}
            <div
              className={`flex-1 min-h-0 ${
                isWideLayout ? 'col-span-6 lg:col-span-7' : ''
              } bg-[#071D35]/95 border-2 border-[#38BDF8]/40 rounded-2xl p-3 sm:p-4 flex flex-col justify-between shadow-[0_8px_0_#04101E] overflow-y-auto`}
            >
              {gameMode === 'obstacle_rush' ? (
                <div className="flex flex-col h-full gap-2.5 sm:gap-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10 shrink-0">
                    <h3 className="font-display text-xs sm:text-base font-black uppercase tracking-wider text-white">
                      Select Gun Fight Arena
                    </h3>
                    <span className="text-xs font-display font-bold text-[#4ADE80]">
                      4P Free-For-All · Weapon Crates
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:gap-4 flex-1 items-stretch min-h-0">
                    {OBSTACLE_RUSH_MAPS.map((rMap) => {
                      const isActive = rMap.id === selectedRushMapId;
                      return (
                        <button
                          key={rMap.id}
                          onClick={() => {
                            crayonAudio.playMenuClick();
                            setSelectedRushMapId(rMap.id);
                          }}
                          className={`group relative rounded-2xl overflow-hidden flex flex-col border-[3px] text-left transition-all cursor-pointer ${
                            isActive
                              ? 'border-[#84CC16] ring-2 ring-[#84CC16]/40 shadow-[0_5px_0_#04101E]'
                              : 'border-white/15 hover:border-[#38BDF8]/70 opacity-90 hover:opacity-100'
                          }`}
                        >
                          <div className="relative flex-1 w-full min-h-[105px] sm:min-h-[145px] overflow-hidden bg-[#0A1E36]">
                            <RushMapThumbnailPreview
                              rushMap={rMap}
                              view="ingame"
                            />
                          </div>
                          <div className="w-full bg-[#0C2542] px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between border-t border-white/15">
                            <span className="font-display text-xs sm:text-base font-black text-white truncate">
                              {rMap.name}
                            </span>
                            {isActive && (
                              <span className="w-5 h-5 rounded-full bg-[#84CC16] border border-[#04101E] flex items-center justify-center shrink-0 shadow">
                                <Check className="w-3 h-3 text-[#04101E] stroke-[3.5]" />
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : gameMode === 'floor_is_lava' ? (
                <div className="flex flex-col h-full gap-2.5 sm:gap-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10 shrink-0">
                    <h3 className="font-display text-xs sm:text-base font-black uppercase tracking-wider text-white">
                      Select 4P Nuke Arena
                    </h3>
                    <span className="text-xs font-display font-bold text-amber-300">
                      4P · 3 Rounds · 2 Nuke Balls · Elimination
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:gap-4 flex-1 items-stretch min-h-0">
                    {FLOOR_IS_LAVA_MAPS.map((lMap) => {
                      const isActive = lMap.id === selectedLavaMapId;
                      return (
                        <button
                          key={lMap.id}
                          onClick={() => {
                            crayonAudio.playMenuClick();
                            setSelectedLavaMapId(lMap.id);
                          }}
                          className={`group relative rounded-2xl overflow-hidden flex flex-col border-[3px] text-left transition-all cursor-pointer ${
                            isActive
                              ? 'border-amber-400 ring-2 ring-orange-400/50 shadow-[0_5px_0_#04101E]'
                              : 'border-white/15 hover:border-amber-300/70 opacity-90 hover:opacity-100'
                          }`}
                        >
                          <div className="relative flex-1 w-full min-h-[105px] sm:min-h-[145px] overflow-hidden bg-[#1F0D1D]">
                            <LavaMapThumbnailPreview lavaMap={lMap} />
                          </div>
                          <div className="w-full bg-[#0C2542] px-3 sm:px-4 py-2 sm:py-2.5 flex flex-col gap-0.5 border-t border-white/15">
                            <div className="flex items-center justify-between">
                              <span className="font-display text-xs sm:text-base font-black text-white truncate">
                                {lMap.name}
                              </span>
                              {isActive && (
                                <span className="w-5 h-5 rounded-full bg-amber-400 border border-[#04101E] flex items-center justify-center shrink-0 shadow">
                                  <Check className="w-3 h-3 text-[#04101E] stroke-[3.5]" />
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-bold text-amber-200/90 truncate">
                              {lMap.environmentTag}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 shrink-0">
                    <h3 className="font-display text-xs sm:text-base font-black uppercase tracking-wider text-white">
                      Select Court Arena
                    </h3>
                    <span className="text-xs font-display font-bold text-[#7DD3FC]">
                      {activeTheme.name}
                    </span>
                  </div>

                  <div
                    className={`grid ${
                      isWideLayout ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-3'
                    } gap-2.5 sm:gap-3 flex-1 items-stretch min-h-0`}
                  >
                    {modeAvailableThemes.slice(0, 6).map((theme) => {
                      const active = theme.id === selectedThemeId;
                      return (
                        <button
                          key={theme.id}
                          onClick={() => {
                            crayonAudio.playMenuClick();
                            setSelectedThemeId(theme.id);
                          }}
                          className={`group relative rounded-xl overflow-hidden flex flex-col border-[2.5px] sm:border-[3px] transition-all cursor-pointer ${
                            active
                              ? 'border-[#84CC16] ring-2 ring-[#84CC16]/45 shadow-[0_4px_0_#04101E]'
                              : 'border-white/15 hover:border-[#38BDF8]/70'
                          }`}
                        >
                          <div className="relative flex-1 w-full min-h-[68px] sm:min-h-[88px] overflow-hidden bg-[#0A1E36]">
                            <MapThumbnailPreview theme={theme} />
                          </div>
                          <div className="w-full bg-[#0C2542] px-2.5 sm:px-3 py-1.5 sm:py-2 flex items-center justify-between border-t border-white/15">
                            <span className="font-display text-[11px] sm:text-sm font-extrabold text-white truncate">
                              {theme.name}
                            </span>
                            {active && (
                              <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#84CC16] border border-[#04101E] flex items-center justify-center shrink-0 shadow">
                                <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#04101E] stroke-[3.5]" />
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Right Panel (3 cols on PC/Landscape, compact bottom dock on Portrait): Preview + Rules + PLAY */}
            <div
              className={`${
                isWideLayout ? 'col-span-3' : ''
              } flex flex-col justify-between gap-2.5 shrink-0`}
            >
              <div className="flex-1 bg-[#071D35]/95 border-2 border-[#38BDF8]/40 rounded-2xl p-3 sm:p-4 flex flex-col justify-between shadow-[0_8px_0_#04101E]">
                <div>
                  {isWideLayout && !isShortLandscape && (
                    <div className="w-full aspect-[16/9] rounded-xl overflow-hidden border-2 border-white/20 mb-3 shadow-md bg-[#0A1E36]">
                      {gameMode === 'obstacle_rush' ? (
                        <RushMapThumbnailPreview
                          rushMap={activeRushMap}
                          view="ingame"
                        />
                      ) : gameMode === 'floor_is_lava' ? (
                        <LavaMapThumbnailPreview lavaMap={activeLavaMap} />
                      ) : (
                        <MapThumbnailPreview theme={activeTheme} />
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-display text-sm sm:text-base font-black text-white truncate">
                      {gameMode === 'obstacle_rush'
                        ? activeRushMap.name
                        : gameMode === 'floor_is_lava'
                          ? activeLavaMap.name
                          : activeTheme.name}
                    </h4>

                    {gameMode === 'obstacle_rush' ? (
                      <span className="text-[11px] font-display font-bold text-[#FACC15] shrink-0">
                        4P Solo
                      </span>
                    ) : gameMode === 'floor_is_lava' ? (
                      <span className="text-[11px] font-display font-bold text-amber-300 shrink-0">
                        3 Rounds
                      </span>
                    ) : (
                      <div className="flex items-center gap-1 bg-[#051426] p-1 rounded-xl border border-white/15 shrink-0">
                        {(['1v1', '2v2'] as const).map((fmt) => (
                          <button
                            key={fmt}
                            onClick={() => {
                              crayonAudio.playMenuClick();
                              setMatchFormat(fmt);
                            }}
                            className={`px-2.5 py-0.5 rounded-lg font-display text-[10px] font-black uppercase cursor-pointer transition-all ${
                              matchFormat === fmt
                                ? 'bg-[#38BDF8] text-[#04101E]'
                                : 'text-slate-300 hover:text-white'
                            }`}
                          >
                            {fmt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Compact Match Settings */}
                <div
                  className={`grid ${
                    isWideLayout ? 'grid-cols-1' : 'grid-cols-2'
                  } gap-2.5 pt-2.5 mt-2 border-t border-white/10`}
                >
                  {gameMode === 'obstacle_rush' || gameMode === 'floor_is_lava' ? (
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-display font-black uppercase tracking-wider text-[#7DD3FC] mb-1.5">
                        <span>Match Timer</span>
                        <span className="text-[#4ADE80] tabular-nums">{rushTimerMinutes} MIN</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {([3, 5, 6] as const).map((mins) => (
                          <button
                            key={mins}
                            onClick={() => {
                              crayonAudio.playMenuClick();
                              setRushTimerMinutes(mins);
                            }}
                            className={`py-1.5 rounded-xl font-display text-xs font-black uppercase tabular-nums transition-all cursor-pointer ${
                              rushTimerMinutes === mins
                                ? 'bg-[#FACC15] text-[#04101E] border border-[#04101E] shadow-[0_2px_0_#04101E]'
                                : 'bg-[#0C2542] text-slate-300 hover:text-white border border-white/10'
                            }`}
                          >
                            {mins}M
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-display font-black uppercase tracking-wider text-[#7DD3FC] mb-1.5">
                        <span>Target Points</span>
                        <span className="text-[#FEF08A] tabular-nums">{winScore} PTS</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[5, 10, 15].map((pts) => (
                          <button
                            key={pts}
                            onClick={() => {
                              crayonAudio.playMenuClick();
                              setWinScore(pts);
                            }}
                            className={`py-1.5 rounded-xl font-display text-xs font-black uppercase tabular-nums transition-all cursor-pointer ${
                              winScore === pts
                                ? 'bg-[#FACC15] text-[#04101E] border border-[#04101E] shadow-[0_2px_0_#04101E]'
                                : 'bg-[#0C2542] text-slate-300 hover:text-white border border-white/10'
                            }`}
                          >
                            {pts}P
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 5 Difficulty Levels */}
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-display font-black uppercase tracking-wider text-[#7DD3FC] mb-1.5">
                      <span>AI Difficulty</span>
                      <span className="text-[#FEF08A] truncate ml-1">
                        {activeDiffConfig.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-1">
                      {DIFFICULTY_LEVELS.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => {
                            crayonAudio.playMenuClick();
                            setDifficulty(d.id);
                          }}
                          className={`py-1.5 rounded-xl font-display text-[10px] font-black uppercase transition-all cursor-pointer ${
                            difficulty === d.id
                              ? 'bg-[#84CC16] text-[#04101E] border border-[#04101E] shadow-[0_2px_0_#04101E]'
                              : 'bg-[#0C2542] text-slate-300 hover:text-white border border-white/10'
                          }`}
                        >
                          {d.shortLabel}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleStartMatch()}
                className={`w-full ${
                  isShortLandscape ? 'py-2.5 text-lg' : 'py-3 sm:py-3.5 text-xl sm:text-2xl'
                } rounded-2xl bg-gradient-to-b from-[#FEF08A] via-[#BEF264] to-[#65A30D] hover:from-[#FEF9C3] hover:to-[#84CC16] border-[3px] border-[#04101E] shadow-[0_6px_0_#04101E] flex items-center justify-center gap-2.5 text-[#04101E] font-display font-black uppercase tracking-wide transition-all active:translate-y-1 active:shadow-[0_2px_0_#04101E] cursor-pointer`}
              >
                <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-[#04101E]" />
                <span>PLAY MATCH</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* DEDICATED FULL-SCREEN CUSTOM MULTIPLAYER STUDIO (Matches Image 3 100%)*/}
      {/* ===================================================================== */}
      {gameState === 'CUSTOM_LOBBY' && (
        <div
          className={`fixed inset-0 z-40 pointer-events-auto flex flex-col justify-between ${
            isShortLandscape ? 'p-2.5' : 'p-3 sm:p-5 lg:p-6'
          } safe-pad bg-[#041122] text-white overflow-hidden`}
        >
          {/* TOP HEADER: Row 1 (Back + Title + Online Pill + Subtitle) & Row 2 (Name + Mic + Speaker + Fullscreen) */}
          <div className="flex flex-col gap-2.5 w-full max-w-6xl mx-auto shrink-0 pb-3 border-b border-[#38BDF8]/20">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => {
                  crayonAudio.playMenuClick();
                  setGameState('TITLE_MENU');
                }}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#06182C] hover:bg-[#0B2542] border border-[#38BDF8]/45 flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <ChevronLeft className="w-5 h-5 stroke-[2.8]" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <h2 className="font-display text-lg sm:text-2xl font-black uppercase tracking-wide text-white leading-none truncate">
                    CUSTOM MULTIPLAYER
                  </h2>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#062C24] border border-emerald-400/50 font-display text-[10px] font-black uppercase text-emerald-300 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    {mpOnlineCount} ONLINE
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs font-bold text-[#38BDF8] mt-1 truncate">
                  Real-Time Room Codes &middot; 2v2 Team Volleyball &middot; Up to 5P Gun Fight &amp; Nuke &middot; Live Voice Chat
                </p>
              </div>
            </div>

            {/* Row 2: Action Pills (NAME | MIC OFF | SPEAKER ON | Fullscreen Icon) */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  crayonAudio.playMenuClick();
                  setNameInputDraft(playerName);
                  setHasConfirmedName(false);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#06182C] hover:bg-[#0B2542] border border-[#38BDF8]/45 font-display text-xs font-black text-white cursor-pointer transition-all active:scale-95"
                title="Change Your Player Name"
              >
                <span className="text-[#38BDF8]">NAME:</span>
                <span className="text-[#FEF08A] truncate max-w-[120px]">{playerName}</span>
                <Pencil className="w-3.5 h-3.5 text-[#38BDF8]" />
              </button>

              <button
                onClick={async () => {
                  crayonAudio.playMenuClick();
                  await multiplayerClient.toggleMicrophone();
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-display text-xs font-black uppercase border transition-all cursor-pointer active:scale-95 ${
                  mpMicEnabled
                    ? mpIsSpeaking
                      ? 'bg-emerald-400 text-[#04101E] border-white'
                      : 'bg-emerald-500/25 text-emerald-200 border-emerald-400/60'
                    : 'bg-[#06182C] text-white border-[#38BDF8]/45 hover:bg-[#0B2542]'
                }`}
              >
                {mpMicEnabled ? (
                  <Mic className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <MicOff className="w-3.5 h-3.5 text-rose-400" />
                )}
                <span>{mpMicEnabled ? (mpIsSpeaking ? 'TALKING' : 'MIC ON') : 'MIC OFF'}</span>
              </button>

              <button
                onClick={() => {
                  crayonAudio.playMenuClick();
                  multiplayerClient.toggleListen();
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-display text-xs font-black uppercase border transition-all cursor-pointer active:scale-95 ${
                  mpListenEnabled
                    ? 'bg-[#06182C] text-white border-[#38BDF8]/45 hover:bg-[#0B2542]'
                    : 'bg-rose-500/20 text-rose-200 border-rose-400/50'
                }`}
              >
                <Headphones className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span>{mpListenEnabled ? 'SPEAKER ON' : 'MUTED'}</span>
              </button>

              <button
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
                className="w-9 h-9 rounded-xl bg-[#06182C] hover:bg-[#0B2542] border border-[#38BDF8]/45 flex items-center justify-center text-[#FEF08A] cursor-pointer transition-all active:scale-95"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-3.5 h-3.5 text-[#A3E635]" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5 text-[#FEF08A]" />
                )}
              </button>
            </div>
          </div>

          {mpError && (
            <div className="w-full max-w-6xl mx-auto mt-2 px-4 py-2 rounded-xl bg-rose-500/25 border border-rose-400/60 font-display text-xs font-bold text-rose-200 flex items-center justify-between shrink-0">
              <span>{mpError}</span>
              <button
                onClick={() => {
                  multiplayerClient.lastError = null;
                  setMpError(null);
                }}
                className="text-[11px] underline uppercase ml-3 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* MAIN BODY: Either Create/Join Studio (!mpRoom) OR Active Room Squad & Slot Picker (mpRoom) */}
          <div className="flex-1 min-h-0 w-full max-w-6xl mx-auto py-2.5 overflow-y-auto flex flex-col">
            {!mpRoom ? (
              <div
                className={`grid ${
                  isWideLayout ? 'grid-cols-12' : 'grid-cols-1 lg:grid-cols-12'
                } gap-4 my-auto w-full items-stretch`}
              >
                {/* LEFT 7 COLS: 1. CREATE CUSTOM ROOM */}
                <div
                  className={`${
                    isWideLayout ? 'col-span-7' : 'lg:col-span-7'
                  } bg-[#061527] border border-[#38BDF8]/35 rounded-3xl p-4 sm:p-5 flex flex-col justify-between gap-4`}
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div>
                      <h3 className="font-display text-base sm:text-xl font-black uppercase text-white">
                        1. CREATE CUSTOM ROOM
                      </h3>
                      <p className="text-xs font-bold text-[#38BDF8] mt-0.5">
                        Choose game mode, player slots &amp; arena map to host a live room
                      </p>
                    </div>
                    <span className="px-3.5 py-1 rounded-full bg-[#091E38] border border-[#38BDF8]/35 font-display text-[11px] font-black text-[#FACC15]">
                      HOST STUDIO
                    </span>
                  </div>

                  {/* Step A: Select Game Mode */}
                  <div>
                    <div className="font-display text-xs font-black uppercase tracking-wider text-[#38BDF8] mb-2">
                      SELECT GAME MODE
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {(
                        [
                          {
                            id: 'obstacle_rush',
                            title: 'GUN FIGHT',
                            badge: '2 TO 5 PLAYERS',
                            desc: 'Free-For-All Blaster Arena',
                          },
                          {
                            id: 'volleyball_2v2',
                            title: '2V2 VOLLEYBALL',
                            badge: '2V2 TEAM ONLY',
                            desc: 'Blue Team vs Red Team',
                          },
                          {
                            id: 'floor_is_lava',
                            title: 'NUKE SHOWDOWN',
                            badge: '2 TO 5 PLAYERS',
                            desc: '2 Balls · 160 HP · 3-4 Hits',
                          },
                        ] as const
                      ).map((cm) => {
                        const active = customCreateMode === cm.id;
                        return (
                          <button
                            key={cm.id}
                            onClick={() => {
                              crayonAudio.playMenuClick();
                              setCustomCreateMode(cm.id);
                              if (cm.id === 'volleyball_2v2') {
                                setCustomMaxPlayers(4);
                              }
                            }}
                            className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                              active
                                ? 'bg-[#09213D] border-[#84CC16]'
                                : 'bg-[#07192F] border-white/10 hover:border-[#38BDF8]/50'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-display text-xs sm:text-sm font-black uppercase text-white truncate">
                                {cm.title}
                              </span>
                              {active && (
                                <span className="w-4 h-4 rounded-full bg-[#84CC16] flex items-center justify-center shrink-0">
                                  <Check className="w-2.5 h-2.5 text-[#04101E] stroke-[3.5]" />
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-display font-black uppercase text-[#FACC15]">
                              {cm.badge}
                            </span>
                            <span className="text-[11px] font-bold text-[#38BDF8] truncate">
                              {cm.desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step B: Player Slots + Empty Slots */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl bg-[#07192F] border border-white/10 flex flex-col justify-between gap-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-display text-xs font-black uppercase text-[#38BDF8]">
                          PLAYER SLOTS
                        </span>
                        <span className="font-display text-xs font-black text-[#FACC15]">
                          {customCreateMode === 'volleyball_2v2'
                            ? '2V2 TEAM (4P)'
                            : `${customMaxPlayers} PLAYERS`}
                        </span>
                      </div>
                      {customCreateMode === 'volleyball_2v2' ? (
                        <div className="py-2 px-3 rounded-xl bg-[#041122] border border-[#38BDF8]/30 font-display text-xs font-black uppercase text-center text-[#7DD3FC]">
                          2 BLUE TEAM VS 2 RED TEAM
                        </div>
                      ) : (
                        <div className="grid grid-cols-4 gap-1.5">
                          {[2, 3, 4, 5].map((cnt) => (
                            <button
                              key={cnt}
                              onClick={() => {
                                crayonAudio.playMenuClick();
                                setCustomMaxPlayers(cnt);
                              }}
                              className={`py-2 rounded-xl font-display text-xs font-black uppercase cursor-pointer transition-all ${
                                customMaxPlayers === cnt
                                  ? 'bg-[#FACC15] text-[#04101E]'
                                  : 'bg-[#041122] text-white hover:bg-[#091E38] border border-white/10'
                              }`}
                            >
                              {cnt}P
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#07192F] border border-white/10 flex flex-col justify-between gap-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-display text-xs font-black uppercase text-[#38BDF8]">
                          EMPTY SLOTS
                        </span>
                        <span className="font-display text-xs font-black text-emerald-400">
                          {customFillBots ? 'FILL WITH BOTS' : 'HUMANS ONLY'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => {
                            crayonAudio.playMenuClick();
                            setCustomFillBots(true);
                          }}
                          className={`py-2 rounded-xl font-display text-xs font-black uppercase cursor-pointer transition-all ${
                            customFillBots
                              ? 'bg-[#84CC16] text-[#04101E]'
                              : 'bg-[#041122] text-white border border-white/10'
                          }`}
                        >
                          AI BOTS ON
                        </button>
                        <button
                          onClick={() => {
                            crayonAudio.playMenuClick();
                            setCustomFillBots(false);
                          }}
                          className={`py-2 rounded-xl font-display text-xs font-black uppercase cursor-pointer transition-all ${
                            !customFillBots
                              ? 'bg-[#38BDF8] text-[#04101E]'
                              : 'bg-[#041122] text-white border border-white/10'
                          }`}
                        >
                          OPEN SLOTS
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Create Custom Room CTA */}
                  <button
                    onClick={async () => {
                      crayonAudio.playMenuClick();
                      const defaultMap =
                        customCreateMode === 'volleyball_2v2'
                          ? selectedThemeId
                          : customCreateMode === 'floor_is_lava'
                            ? selectedLavaMapId
                            : selectedRushMapId;
                      await multiplayerClient.createCustomRoom({
                        mode: customCreateMode,
                        mapId: defaultMap,
                        maxPlayers:
                          customCreateMode === 'volleyball_2v2' ? 4 : customMaxPlayers,
                        winScore,
                        timerMinutes: rushTimerMinutes,
                        difficulty,
                        fillWithBots: customFillBots,
                      });
                    }}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-b from-[#FEF08A] via-[#BEF264] to-[#84CC16] hover:from-[#FEF9C3] hover:to-[#A3E635] font-display text-base sm:text-lg font-black uppercase tracking-wider text-[#04101E] flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-99"
                  >
                    <Plus className="w-5 h-5 stroke-[3]" />
                    <span>CREATE CUSTOM ROOM</span>
                  </button>
                </div>

                {/* RIGHT 5 COLS: 2. JOIN BY ROOM CODE & LIVE OPEN ROOMS */}
                <div
                  className={`${
                    isWideLayout ? 'col-span-5' : 'lg:col-span-5'
                  } flex flex-col gap-4`}
                >
                  {/* Card 1: Join by Room Code */}
                  <div className="bg-[#061527] border border-[#38BDF8]/35 rounded-3xl p-4 sm:p-5 flex flex-col gap-3.5">
                    <div>
                      <h3 className="font-display text-base sm:text-xl font-black uppercase text-white">
                        2. JOIN BY ROOM CODE
                      </h3>
                      <p className="text-xs font-bold text-[#38BDF8] mt-0.5">
                        Enter a friend&apos;s 5-letter code (or any custom code to open that room!)
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <input
                        type="text"
                        value={roomCodeInput}
                        maxLength={6}
                        placeholder="E.G. K7X9P"
                        onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter' && roomCodeInput.trim()) {
                            crayonAudio.playMenuClick();
                            await multiplayerClient.joinCustomRoom(roomCodeInput);
                          }
                        }}
                        className="flex-1 min-w-0 px-4 py-3.5 rounded-2xl bg-[#041020] border border-[#38BDF8]/50 focus:border-[#38BDF8] font-mono text-base sm:text-lg font-black uppercase tracking-widest text-white placeholder:text-slate-500 outline-none text-center"
                      />
                      <button
                        onClick={async () => {
                          if (!roomCodeInput.trim()) return;
                          crayonAudio.playMenuClick();
                          await multiplayerClient.joinCustomRoom(roomCodeInput);
                        }}
                        className="px-6 py-3.5 rounded-2xl bg-gradient-to-b from-[#38BDF8] to-[#0284C7] hover:from-[#7DD3FC] hover:to-[#0369A1] font-display text-sm sm:text-base font-black uppercase text-white cursor-pointer transition-all active:scale-95 shrink-0"
                      >
                        ENTER
                      </button>
                    </div>
                  </div>

                  {/* Card 2: Live Open Rooms */}
                  <div className="flex-1 bg-[#061527] border border-[#38BDF8]/35 rounded-3xl p-4 sm:p-5 flex flex-col justify-between min-h-[190px]">
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <span className="font-display text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                        LIVE OPEN ROOMS ({mpPublicRooms.length})
                      </span>
                      <button
                        onClick={() => {
                          crayonAudio.playMenuClick();
                          multiplayerClient.refreshStateHttp();
                        }}
                        className="px-3 py-1 rounded-lg bg-[#091E38] hover:bg-[#0F2D52] border border-[#38BDF8]/35 font-display text-[10px] font-black uppercase text-[#38BDF8] cursor-pointer"
                      >
                        REFRESH
                      </button>
                    </div>

                    {mpPublicRooms.length === 0 ? (
                      <div className="my-auto py-6 text-center text-xs font-bold text-slate-400 px-2">
                        No open lobbies waiting right now. Click CREATE CUSTOM ROOM on the left or type any code above!
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 mt-2.5 overflow-y-auto max-h-[220px] pr-1">
                        {mpPublicRooms.map((r) => (
                          <div
                            key={r.code}
                            className="flex items-center justify-between p-2.5 rounded-2xl bg-[#07192F] border border-[#38BDF8]/35"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-md bg-[#FACC15] text-[#04101E] font-mono text-xs font-black">
                                  {r.code}
                                </span>
                                <span className="font-display text-xs sm:text-sm font-black text-white truncate">
                                  {r.name}
                                </span>
                              </div>
                              <div className="text-[11px] font-bold text-[#38BDF8] mt-0.5">
                                {r.mode === 'volleyball_2v2'
                                  ? '2v2 Team Volleyball'
                                  : r.mode === 'floor_is_lava'
                                    ? `${r.maxPlayers}P Nuke Showdown`
                                    : `${r.maxPlayers}P Gun Fight`}{' '}
                                &middot; {r.humanCount}/{r.maxPlayers} Players
                              </div>
                            </div>
                            <button
                              onClick={async () => {
                                crayonAudio.playMenuClick();
                                await multiplayerClient.joinCustomRoom(r.code);
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-b from-[#FEF08A] to-[#84CC16] text-[#04101E] font-display text-xs font-black uppercase cursor-pointer shrink-0"
                            >
                              JOIN
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* ============================================================= */
              /* ACTIVE CUSTOM ROOM LOBBY: CODE, SLOTS, TEAMS & LAUNCH STUDIO  */
              /* ============================================================= */
              <div className="flex flex-col justify-between gap-3.5 flex-1 min-h-0">
                {/* 1. Room Control Header Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 sm:p-4 rounded-3xl bg-[#071D35]/95 border-2 border-[#38BDF8]/50 shadow-[0_6px_0_#04101E] shrink-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="px-3.5 py-1.5 rounded-2xl bg-[#041020] border-2 border-[#FACC15] flex items-center gap-2.5">
                      <span className="text-[11px] font-display font-black uppercase text-[#7DD3FC]">
                        ROOM CODE:
                      </span>
                      <span className="font-mono text-lg sm:text-xl font-black tracking-widest text-[#FEF08A]">
                        {mpRoom.code}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(mpRoom.code).catch(() => {});
                          setCopiedRoomCode(true);
                          window.setTimeout(() => setCopiedRoomCode(false), 1500);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-display font-black text-white flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedRoomCode ? 'COPIED!' : 'COPY'}</span>
                      </button>
                    </div>

                    {/* Mode Switcher */}
                    <div className="flex items-center gap-1 bg-[#041020] p-1 rounded-2xl border border-white/15">
                      {(
                        [
                          { id: 'obstacle_rush', label: 'GUN FIGHT' },
                          { id: 'volleyball_2v2', label: '2V2 VOLLEY' },
                          { id: 'floor_is_lava', label: 'NUKE' },
                        ] as const
                      ).map((mTab) => (
                        <button
                          key={mTab.id}
                          onClick={() => {
                            crayonAudio.playMenuClick();
                            multiplayerClient.updateRoomSettings({
                              mode: mTab.id,
                              maxPlayers:
                                mTab.id === 'volleyball_2v2' ? 4 : mpRoom.maxPlayers,
                            });
                          }}
                          className={`px-3 py-1.5 rounded-xl font-display text-xs font-black uppercase cursor-pointer transition-all ${
                            mpRoom.mode === mTab.id
                              ? 'bg-[#FACC15] text-[#04101E]'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          {mTab.label}
                        </button>
                      ))}
                    </div>

                    {/* Max Players (2P..5P) when in Gun Fight or Nuke */}
                    {mpRoom.mode !== 'volleyball_2v2' && (
                      <div className="flex items-center gap-1 bg-[#041020] px-2.5 py-1 rounded-2xl border border-white/15">
                        <span className="text-[10px] font-display font-black text-[#7DD3FC] mr-1">
                          MAX:
                        </span>
                        {[2, 3, 4, 5].map((cnt) => (
                          <button
                            key={cnt}
                            onClick={() => {
                              crayonAudio.playMenuClick();
                              multiplayerClient.updateRoomSettings({ maxPlayers: cnt });
                            }}
                            className={`px-2.5 py-1 rounded-lg font-display text-xs font-black cursor-pointer ${
                              mpRoom.maxPlayers === cnt
                                ? 'bg-[#84CC16] text-[#04101E]'
                                : 'text-slate-300 hover:text-white'
                            }`}
                          >
                            {cnt}P
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={async () => {
                      crayonAudio.playMenuClick();
                      await multiplayerClient.leaveCustomRoom();
                    }}
                    className="px-4 py-2 rounded-2xl bg-rose-500/25 hover:bg-rose-500/40 border-2 border-rose-400/55 font-display text-xs font-black uppercase text-rose-200 cursor-pointer"
                  >
                    LEAVE ROOM
                  </button>
                </div>

                {/* 2. Interactive Player Slots Grid (Tap Any Open/Bot Slot to Switch!) */}
                <div
                  className={`grid ${
                    mpRoom.mode === 'volleyball_2v2'
                      ? 'grid-cols-2 sm:grid-cols-4'
                      : 'grid-cols-2 sm:grid-cols-5'
                  } gap-3 flex-1 items-stretch min-h-[175px]`}
                >
                  {mpRoom.slots.map((slot) => {
                    const isMe = slot.playerId === multiplayerClient.playerId;
                    const slotChar =
                      CRAYON_CHARACTERS.find((c) => c.id === slot.charId) ||
                      CRAYON_CHARACTERS[0];
                    const teamLabel =
                      mpRoom.mode === 'volleyball_2v2'
                        ? slot.team === 'blue'
                          ? `BLUE TEAM #${slot.slotIndex + 1}`
                          : `RED TEAM #${slot.slotIndex - 1}`
                        : `SLOT #${slot.slotIndex + 1}`;
                    return (
                      <div
                        key={slot.slotIndex}
                        onClick={() => {
                          if (!isMe && slot.occupiedBy !== 'human') {
                            crayonAudio.playMenuClick();
                            multiplayerClient.selectSlot(slot.slotIndex);
                          }
                        }}
                        className={`relative rounded-3xl p-3.5 flex flex-col items-center justify-between border-2 transition-all ${
                          isMe
                            ? 'bg-gradient-to-b from-[#12396B] to-[#0B2548] border-[#84CC16] ring-2 ring-[#84CC16]/45 shadow-[0_6px_0_#04101E]'
                            : slot.occupiedBy === 'human'
                              ? 'bg-[#0A2240] border-[#38BDF8]/70 shadow-[0_6px_0_#04101E]'
                              : 'bg-[#07182E]/90 border-white/15 hover:border-[#38BDF8]/65 cursor-pointer shadow-[0_4px_0_#04101E]'
                        }`}
                      >
                        <div className="w-full flex items-center justify-between gap-1">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-display font-black uppercase ${
                              slot.team === 'blue'
                                ? 'bg-sky-500/30 text-sky-200 border border-sky-400/50'
                                : slot.team === 'red'
                                  ? 'bg-rose-500/30 text-rose-200 border border-rose-400/50'
                                  : 'bg-white/10 text-[#FEF08A] border border-white/15'
                            }`}
                          >
                            {teamLabel}
                          </span>
                          {slot.isHost && (
                            <span className="px-2 py-0.5 rounded-lg bg-[#FACC15] text-[#04101E] font-display text-[9px] font-black uppercase">
                              HOST
                            </span>
                          )}
                        </div>

                        <div
                          className={`my-2 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center border-2 transition-all ${
                            slot.speaking
                              ? 'bg-emerald-500/30 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.85)] scale-105'
                              : slot.occupiedBy === 'empty'
                                ? 'bg-slate-900/60 border-dashed border-white/25 opacity-55'
                                : 'bg-[#051326] border-white/25'
                          }`}
                        >
                          {slot.occupiedBy === 'empty' ? (
                            <Plus className="w-7 h-7 text-[#7DD3FC]" />
                          ) : (
                            <ChibiCharacterPortrait
                              char={slotChar}
                              outfitOverride={slot.outfitId}
                              faceOverride={slot.faceId}
                              size={58}
                            />
                          )}
                        </div>

                        <div className="w-full text-center">
                          <div className="font-display text-xs sm:text-sm font-black text-white truncate">
                            {isMe ? `${slot.playerName} (YOU)` : slot.playerName}
                          </div>
                          <div className="flex items-center justify-center gap-1.5 mt-1">
                            {slot.occupiedBy === 'human' ? (
                              <span className="text-[10px] font-display font-bold uppercase text-emerald-300 flex items-center gap-1">
                                {slot.micOn ? (
                                  <Mic className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <MicOff className="w-3 h-3 text-slate-400" />
                                )}
                                {slot.speaking ? 'TALKING' : 'READY'}
                              </span>
                            ) : (
                              <>
                                <span className="text-[10px] font-display font-bold uppercase text-[#7DD3FC]">
                                  TAP TO TAKE SLOT
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    crayonAudio.playMenuClick();
                                    multiplayerClient.toggleSlotBot(slot.slotIndex);
                                  }}
                                  className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[9px] font-display font-black uppercase text-[#FEF08A] cursor-pointer"
                                >
                                  {slot.occupiedBy === 'bot' ? 'BOT' : 'OPEN'}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 3. Bottom Bar: Map & Hero Selector + Giant START CUSTOM MATCH Button */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center shrink-0">
                  <div className="lg:col-span-8 p-3 rounded-2xl bg-[#071D35]/95 border-2 border-[#38BDF8]/40 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                      <span className="text-[10px] font-display font-black uppercase text-[#7DD3FC] mr-1 shrink-0">
                        HERO:
                      </span>
                      {CRAYON_CHARACTERS.slice(0, 6).map((ch) => (
                        <button
                          key={ch.id}
                          onClick={() => {
                            handleSelectCharacter(ch);
                            multiplayerClient.updateMyRoomPlayer({
                              charId: ch.id,
                              outfitId: ch.defaultOutfit,
                              faceId: ch.defaultFace,
                            });
                          }}
                          className={`px-2.5 py-1 rounded-xl font-display text-[10px] font-black uppercase shrink-0 cursor-pointer border ${
                            selectedCharId === ch.id
                              ? 'bg-[#84CC16] text-[#04101E] border-[#04101E]'
                              : 'bg-[#0C2542] text-slate-200 border-white/10 hover:text-white'
                          }`}
                        >
                          {ch.name}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-display font-black uppercase text-[#FEF08A]">
                        ARENA:
                      </span>
                      {(mpRoom.mode === 'obstacle_rush'
                        ? OBSTACLE_RUSH_MAPS
                        : mpRoom.mode === 'floor_is_lava'
                          ? FLOOR_IS_LAVA_MAPS
                          : COURT_THEMES.slice(0, 4)
                      ).map((mObj) => (
                        <button
                          key={mObj.id}
                          onClick={() => {
                            crayonAudio.playMenuClick();
                            multiplayerClient.updateRoomSettings({ mapId: mObj.id });
                          }}
                          className={`px-2.5 py-1 rounded-xl font-display text-[10px] font-black uppercase cursor-pointer border ${
                            mpRoom.mapId === mObj.id
                              ? 'bg-[#FACC15] text-[#04101E] border-[#04101E]'
                              : 'bg-[#0C2542] text-slate-300 border-white/10 hover:text-white'
                          }`}
                        >
                          {mObj.name.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      crayonAudio.playMenuClick();
                      multiplayerClient.startMatch();
                    }}
                    className="lg:col-span-4 w-full py-3.5 px-5 rounded-2xl bg-gradient-to-b from-[#FEF08A] via-[#BEF264] to-[#65A30D] hover:from-[#FEF9C3] hover:to-[#84CC16] border-[3px] border-[#04101E] shadow-[0_6px_0_#04101E] flex items-center justify-center gap-2.5 text-[#04101E] font-display text-lg sm:text-xl font-black uppercase tracking-wider cursor-pointer active:translate-y-1 active:shadow-[0_2px_0_#04101E]"
                  >
                    <Play className="w-5 h-5 fill-[#04101E]" />
                    <span>START ROOM {mpRoom.code}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* PANEL 4: IN-GAME HUD (Gun Fight, 12P Floor is Lava & Volleyball)      */}
      {/* ===================================================================== */}
      {/* ===================================================================== */}
      {/* PANEL 4: COMPACT PURE-GLASSMORPHIC IN-GAME HUD (Non-Colorful, Smaller)*/}
      {/* ===================================================================== */}
      {gameState === 'PLAYING' && (
        <div className="fixed inset-0 z-30 flex flex-col justify-between p-2 sm:p-3 safe-pad pointer-events-none">
          {/* TOP BAR: Compact Neutral Frosted Glassmorphic HUD */}
          <div className="relative z-10 flex items-center justify-between w-full max-w-4xl mx-auto gap-2">
            {/* Top-Left: Compact Glassmorphic Audio + Voice Mic Controls */}
            <div className="pointer-events-auto flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleToggleMute}
                title={muted ? 'Unmute Audio' : 'Mute Audio'}
                className="w-8 h-8 rounded-xl bg-slate-950/40 hover:bg-slate-900/55 border border-white/20 shadow-[0_4px_16px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.2)] flex items-center justify-center text-white/90 backdrop-blur-md cursor-pointer transition-all active:scale-95"
              >
                {muted ? (
                  <VolumeX className="w-3.5 h-3.5 text-white/70" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-white" />
                )}
              </button>

              <button
                onClick={async () => {
                  crayonAudio.playMenuClick();
                  await multiplayerClient.toggleMicrophone();
                }}
                title={mpMicEnabled ? 'Mute Microphone' : 'Turn On Voice Chat Mic'}
                className="h-8 px-2 rounded-xl bg-slate-950/40 hover:bg-slate-900/55 border border-white/20 backdrop-blur-md flex items-center gap-1 font-display text-[10px] font-black uppercase text-white/90 cursor-pointer transition-all active:scale-95 shadow-[0_4px_16px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.2)]"
              >
                {mpMicEnabled ? (
                  <Mic className="w-3.5 h-3.5 text-white" />
                ) : (
                  <MicOff className="w-3.5 h-3.5 text-white/70" />
                )}
                <span className="hidden md:inline">
                  {mpMicEnabled ? (mpIsSpeaking ? 'LIVE' : 'MIC') : 'MIC'}
                </span>
              </button>
            </div>

            {/* Top-Center Compact Pure Glassmorphic HUD by Active Mode */}
            {gameMode === 'obstacle_rush' ? (
              <div className="flex items-center gap-2 sm:gap-2.5 px-3 py-1 rounded-xl bg-slate-950/40 border border-white/20 backdrop-blur-md shadow-[0_6px_20px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.22)] max-w-[calc(100vw-7.5rem)] overflow-hidden text-white">
                <span className="px-1.5 py-0.5 rounded-md bg-white/10 border border-white/15 font-display text-[10px] font-black uppercase text-white shrink-0">
                  #{rushHud.playerRank ?? 1}
                </span>

                <div className="flex items-center gap-1 shrink-0">
                  <Skull className="w-3.5 h-3.5 text-white/90" />
                  <span className="font-display text-xs sm:text-sm font-black text-white tabular-nums">
                    {rushHud.playerKills ?? 0}
                  </span>
                </div>

                <div className="w-px h-3.5 bg-white/20 shrink-0" />

                <span className="font-mono text-xs sm:text-sm font-black text-white tabular-nums shrink-0">
                  {`${String(Math.floor(Math.max(0, rushHud.timeRemainingSec) / 60)).padStart(2, '0')}:${String(Math.floor(Math.max(0, rushHud.timeRemainingSec) % 60)).padStart(2, '0')}`}
                </span>
                {rushHud.isOvertime && (
                  <span className="px-1.5 py-0.5 rounded-full bg-white/15 border border-white/25 font-display text-[9px] font-black uppercase text-white tracking-wider whitespace-nowrap shrink-0">
                    +30s
                  </span>
                )}

                {rushHud.weaponName &&
                  rushHud.weaponName !== 'ASSAULT' &&
                  (rushHud.weaponTimerSec ?? 0) > 0 && (
                    <>
                      <div className="w-px h-3.5 bg-white/20 shrink-0" />
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/10 border border-white/20 text-[9px] sm:text-[10px] font-display font-black uppercase text-white shrink-0">
                        <Zap className="w-2.5 h-2.5 fill-current shrink-0" />
                        <span>{rushHud.weaponName}</span>
                        <span className="font-mono">
                          {Math.ceil(rushHud.weaponTimerSec ?? 0)}s
                        </span>
                      </div>
                    </>
                  )}
              </div>
            ) : gameMode === 'floor_is_lava' ? (
              /* Dodgeball / Nuke HUD: ONLY Round & Active Players in Pure Compact Glassmorphic Style (NO Health Bar!) */
              <div className="flex flex-col items-center gap-1 max-w-[calc(100vw-7.5rem)]">
                <div className="flex items-center justify-center gap-2.5 px-3 py-1 rounded-xl bg-slate-950/40 border border-white/20 backdrop-blur-md shadow-[0_6px_20px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.22)] text-white">
                  <span className="font-display text-[11px] sm:text-xs font-black uppercase tracking-wider text-white shrink-0">
                    {lavaHud.isExtraRound
                      ? 'FINAL DUEL'
                      : `ROUND ${lavaHud.currentRound ?? 1}/${lavaHud.maxRounds ?? 3}`}
                  </span>

                  <div className="w-px h-3.5 bg-white/25 shrink-0" />

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Users className="w-3.5 h-3.5 text-white/85" />
                    <span className="font-display text-[11px] sm:text-xs font-black uppercase tracking-wider text-white tabular-nums">
                      {lavaHud.aliveCount ?? 4}/{lavaHud.roundStandings?.length || 4} ACTIVE
                    </span>
                  </div>
                </div>

                {lavaHud.eliminationBanner && (
                  <div className="px-3 py-0.5 rounded-full bg-slate-950/45 border border-white/20 backdrop-blur-md font-display text-[10px] font-black uppercase tracking-wider text-white shadow-sm">
                    {lavaHud.eliminationBanner}
                  </div>
                )}
              </div>
            ) : (
              /* Compact Pure Glassmorphic Volleyball Scoreboard */
              <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-3.5 py-1 rounded-xl bg-slate-950/40 border border-white/20 backdrop-blur-md shadow-[0_6px_20px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.22)] max-w-[calc(100vw-7.5rem)] text-white">
                <div className="flex items-center gap-1.5 min-w-0">
                  {stats.servingSide === 'player' && (
                    <span
                      title="Your Serve"
                      className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_#FFFFFF] shrink-0"
                    />
                  )}
                  <span className="font-display text-[11px] sm:text-xs font-black uppercase text-white truncate max-w-[68px] sm:max-w-[110px]">
                    {playerName}
                  </span>
                </div>

                <div className="px-2 py-0.5 rounded-lg bg-white/10 border border-white/20 font-display text-sm sm:text-base font-black tracking-wider shrink-0 tabular-nums text-white">
                  <span>{stats.playerScore}</span>
                  <span className="text-white/70 mx-1">:</span>
                  <span>{stats.aiScore}</span>
                </div>

                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-display text-[11px] sm:text-xs font-black uppercase text-white truncate max-w-[68px] sm:max-w-[110px]">
                    {activeOpponentChar.name}
                  </span>
                  {stats.servingSide === 'ai' && (
                    <span
                      title="Rival Serve"
                      className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_#FFFFFF] shrink-0"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Top-Right: Compact Glassmorphic Pause Button */}
            <div className="pointer-events-auto flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => {
                  crayonAudio.playMenuClick();
                  setGameState('PAUSED');
                }}
                title="Pause Match"
                className="w-8 h-8 rounded-xl bg-slate-950/40 hover:bg-slate-900/55 border border-white/20 shadow-[0_4px_16px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.2)] flex items-center justify-center text-white backdrop-blur-md cursor-pointer shrink-0 transition-all active:scale-95"
              >
                <Pause className="w-3.5 h-3.5 fill-white text-white" />
              </button>
            </div>
          </div>

          {/* Center Numeric Pure Glassmorphic Countdown */}
          {((gameMode === 'obstacle_rush' && rushHud.countdown > 0) ||
            (gameMode === 'floor_is_lava' && lavaHud.countdown > 0)) && (
            <div className="relative z-10 flex items-center justify-center my-auto">
              <div className="w-16 h-16 rounded-2xl bg-slate-950/40 border border-white/25 shadow-[0_8px_28px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.25)] backdrop-blur-xl flex items-center justify-center">
                <span className="font-display text-4xl font-black text-white">
                  {gameMode === 'floor_is_lava' ? lavaHud.countdown : rushHud.countdown}
                </span>
              </div>
            </div>
          )}

          {/* Bottom Spacer */}
          <div />
        </div>
      )}

      {/* ===================================================================== */}
      {/* FULL-SCREEN DARKENED-BLUE GLASSMORPHIC START / VICTORY / DEFEAT BANNER*/}
      {/* Supports both automatic 1.85s transition AND tap-to-continue!         */}
      {/* ===================================================================== */}
      {matchTransition && (
        <div
          onClick={() => {
            if (matchTransition.type === 'WIN' || matchTransition.type === 'LOSS') {
              crayonAudio.playMenuClick();
              setMatchTransition(null);
              setGameState('GAME_OVER');
            } else {
              setMatchTransition(null);
            }
          }}
          className={`${
            matchTransition.type === 'WIN' || matchTransition.type === 'LOSS'
              ? 'pointer-events-auto cursor-pointer'
              : 'pointer-events-none'
          } fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
            matchTransition.type === 'WIN'
              ? 'bg-[radial-gradient(circle_at_50%_50%,rgba(250,204,21,0.22)_0%,rgba(5,16,34,0.68)_75%)] backdrop-blur-md'
              : matchTransition.type === 'LOSS'
                ? 'bg-[radial-gradient(circle_at_50%_50%,rgba(244,63,94,0.22)_0%,rgba(5,16,34,0.72)_75%)] backdrop-blur-md'
                : 'bg-[radial-gradient(circle_at_50%_50%,rgba(56,189,248,0.2)_0%,rgba(5,16,34,0.55)_75%)] backdrop-blur-xs'
          }`}
        >
          <div
            className={`relative w-full max-w-md rounded-3xl border px-7 py-6 text-center bg-[#07162C]/85 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_16px_48px_rgba(2,8,23,0.72),inset_0_1px_1px_rgba(186,230,253,0.35)] transition-all duration-300 ${
              matchTransition.type === 'WIN'
                ? 'border-amber-300/65'
                : matchTransition.type === 'LOSS'
                  ? 'border-rose-300/65'
                  : 'border-sky-300/45'
            }`}
          >
            <div
              className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[10px] sm:text-[11px] font-display font-black uppercase tracking-widest mb-2 border ${
                matchTransition.type === 'WIN'
                  ? 'bg-amber-400/20 text-[#FEF08A] border-amber-300/50'
                  : matchTransition.type === 'LOSS'
                    ? 'bg-rose-500/20 text-rose-200 border-rose-300/50'
                    : 'bg-sky-400/15 text-sky-200 border-sky-300/40'
              }`}
            >
              {matchTransition.type === 'WIN'
                ? '★ CHAMPIONSHIP VICTORY ★'
                : matchTransition.type === 'LOSS'
                  ? 'MATCH COMPLETE'
                  : 'ENTERING STADIUM'}
            </div>
            <div
              className={`font-display text-4xl sm:text-5xl font-black uppercase tracking-wider leading-none ${
                matchTransition.type === 'WIN'
                  ? 'text-[#FEF08A]'
                  : matchTransition.type === 'LOSS'
                    ? 'text-rose-300'
                    : 'text-white'
              }`}
              style={{
                textShadow: '0 4px 14px rgba(0,0,0,0.55)',
              }}
            >
              {matchTransition.title}
            </div>
            <div className="mt-2 font-display text-xs sm:text-sm font-bold text-sky-200 truncate">
              {matchTransition.subtitle}
            </div>

            {(matchTransition.type === 'WIN' || matchTransition.type === 'LOSS') && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  crayonAudio.playMenuClick();
                  setMatchTransition(null);
                  setGameState('GAME_OVER');
                }}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-sky-400/20 hover:bg-sky-400/35 border border-sky-300/50 font-display text-xs font-black uppercase tracking-wider text-white shadow-md cursor-pointer transition-all active:scale-95"
              >
                <span>VIEW MATCH STATISTICS</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* REAL-TIME LAUNCH PLAYER CALLSIGN / NAME ENTRY MODAL                   */}
      {/* ===================================================================== */}
      {!hasConfirmedName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#030B18]/80 backdrop-blur-xl">
          <div className="w-full max-w-md rounded-3xl bg-[#071830]/95 border-2 border-sky-400/55 p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.75),inset_0_1px_1px_rgba(186,230,253,0.35)] text-white flex flex-col items-center gap-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/45 font-display text-[10px] font-black uppercase tracking-widest text-emerald-300">
              <Radio className="w-3 h-3 animate-pulse" />
              <span>REAL-TIME MULTIPLAYER PROFILE</span>
            </div>

            <div className="w-20 h-20 rounded-2xl bg-gradient-to-b from-[#38BDF8] to-[#1D4ED8] border-2 border-white flex items-center justify-center shadow-lg">
              <ChibiCharacterPortrait
                char={activePlayerChar}
                outfitOverride={selectedOutfitId}
                faceOverride={selectedFaceId}
                size={68}
              />
            </div>

            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-wide text-white">
                CHOOSE YOUR NAME
              </h2>
              <p className="text-xs font-bold text-sky-200 mt-1">
                Shown live above your 3D character in Solo, Custom Rooms & Voice Chat
              </p>
            </div>

            <input
              type="text"
              value={nameInputDraft}
              maxLength={16}
              autoFocus
              placeholder="Enter Athlete Name..."
              onChange={(e) => setNameInputDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const clean = nameInputDraft.trim().slice(0, 16) || 'LEO_PRO';
                  crayonAudio.playMenuClick();
                  setPlayerName(clean);
                  try {
                    localStorage.setItem('sixgun_player_name', clean);
                    localStorage.setItem('sixgun_name_confirmed_v1', '1');
                  } catch {}
                  multiplayerClient.syncProfile(
                    clean,
                    selectedCharId,
                    selectedOutfitId,
                    selectedFaceId
                  );
                  setHasConfirmedName(true);
                }
              }}
              className="w-full px-4 py-3 rounded-2xl bg-[#041020] border-2 border-sky-400/70 focus:border-[#84CC16] text-center font-display text-lg font-black text-[#FEF08A] tracking-wider outline-none shadow-inner"
            />

            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {['SIXZUN_KING', 'STORM_ACE', 'NUKE_BOSS', 'BLASTER_X', 'VOLLEY_PRO'].map(
                (preset) => (
                  <button
                    key={preset}
                    onClick={() => {
                      crayonAudio.playMenuClick();
                      setNameInputDraft(preset);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#0C2542] hover:bg-[#143963] border border-sky-300/30 font-display text-[10px] font-black text-sky-200 cursor-pointer"
                  >
                    {preset}
                  </button>
                )
              )}
            </div>

            <button
              onClick={() => {
                const clean = nameInputDraft.trim().slice(0, 16) || 'LEO_PRO';
                crayonAudio.playMenuClick();
                setPlayerName(clean);
                try {
                  localStorage.setItem('sixgun_player_name', clean);
                  localStorage.setItem('sixgun_name_confirmed_v1', '1');
                } catch {}
                multiplayerClient.syncProfile(
                  clean,
                  selectedCharId,
                  selectedOutfitId,
                  selectedFaceId
                );
                setHasConfirmedName(true);
              }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-b from-[#FEF08A] via-[#BEF264] to-[#65A30D] hover:from-[#FEF9C3] hover:to-[#84CC16] border-[3px] border-[#04101E] shadow-[0_5px_0_#04101E] font-display text-base sm:text-lg font-black uppercase tracking-wider text-[#04101E] cursor-pointer active:translate-y-0.5"
            >
              ENTER ARENA AS {nameInputDraft.trim() || 'LEO_PRO'}
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* PAUSE MODAL (True Frosted Glassmorphism)                              */}
      {/* ===================================================================== */}
      {gameState === 'PAUSED' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 safe-pad bg-slate-950/50 backdrop-blur-xl">
          <div className="w-full max-w-xs bg-slate-950/45 backdrop-blur-2xl backdrop-saturate-150 border border-white/30 rounded-3xl p-5 sm:p-6 text-center shadow-[0_16px_48px_rgba(0,0,0,0.45),inset_0_1px_1px_rgba(255,255,255,0.35)] text-white">
            <div className="text-[11px] font-display font-bold uppercase tracking-widest text-sky-200 mb-1">
              {gameMode === 'obstacle_rush'
                ? `${activeRushMap.name} · 4P GUN FIGHT`
                : gameMode === 'floor_is_lava'
                  ? `${activeLavaMap.name} · 4P NUKE`
                  : `${activeTheme.name} · ${matchFormat.toUpperCase()}`}
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-wide text-white mb-4 sm:mb-5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
              PAUSED
            </h2>

            {/* Clean 3-Button Glassmorphic Stack ONLY: Resume, Restart, Main Menu */}
            <div className="flex flex-col gap-2.5 sm:gap-3">
              <button
                onClick={() => {
                  crayonAudio.playMenuClick();
                  setGameState('PLAYING');
                }}
                className="w-full py-3 sm:py-3.5 rounded-2xl bg-lime-400/85 hover:bg-lime-400 border border-white/40 shadow-[0_6px_20px_rgba(132,204,22,0.3),inset_0_1px_1px_rgba(255,255,255,0.5)] text-slate-950 font-display text-base font-black uppercase tracking-wide transition-all active:scale-98 cursor-pointer"
              >
                Resume
              </button>
              <button
                onClick={handleRestartMatch}
                className="w-full py-3 sm:py-3.5 rounded-2xl bg-sky-400/25 hover:bg-sky-400/35 border border-white/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] text-white font-display text-base font-black uppercase tracking-wide transition-all active:scale-98 cursor-pointer"
              >
                Restart
              </button>
              <button
                onClick={toggleFullscreen}
                className="w-full py-3 sm:py-3.5 rounded-2xl bg-[#38BDF8]/25 hover:bg-[#38BDF8]/35 border border-sky-300/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] text-[#FEF08A] font-display text-base font-black uppercase tracking-wide transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 className="w-4 h-4" />
                    <span>Exit Full Screen</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-4 h-4" />
                    <span>Full Screen Mode</span>
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  crayonAudio.playMenuClick();
                  setGameState('TITLE_MENU');
                }}
                className="w-full py-3 sm:py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)] text-white font-display text-base font-extrabold uppercase tracking-wide transition-all active:scale-98 cursor-pointer"
              >
                Main Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* FULL-PAGE SETTINGS SCREEN (Matches Reference Image 2 100%)            */}
      {/* ===================================================================== */}
      {(gameState === 'SETTINGS' || gameState === 'PROFILE') && (
        <div className="fixed inset-0 z-40 pointer-events-auto flex flex-col justify-between px-3 py-2.5 sm:px-6 sm:py-5 safe-pad bg-[#041224] bg-[linear-gradient(rgba(56,189,248,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.035)_1px,transparent_1px)] bg-[size:28px_28px] text-white overflow-hidden">
          {/* TOP BAR: Back Button + Yellow Gear + GAME SETTINGS | Pill Tab Bar */}
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 w-full max-w-6xl mx-auto shrink-0">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <button
                onClick={() => {
                  crayonAudio.playMenuClick();
                  setGameState('TITLE_MENU');
                }}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#06182C] hover:bg-[#0B2542] border border-[#38BDF8]/40 flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <ChevronLeft className="w-5 h-5 stroke-[2.8]" />
              </button>

              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#FACC15] flex items-center justify-center text-[#041224] shrink-0 shadow-[0_0_16px_rgba(250,204,21,0.3)]">
                  <Settings className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.6]" />
                </div>
                <div className="truncate">
                  <h2 className="font-display text-lg sm:text-2xl font-black uppercase tracking-wide leading-none text-white truncate">
                    GAME SETTINGS
                  </h2>
                  <p className="hidden sm:block text-xs font-semibold text-[#38BDF8] mt-1 truncate">
                    5 difficulty tiers, match rules, camera angle &amp; studio audio
                  </p>
                </div>
              </div>
            </div>

            {/* 3 Pill Category Navigation Tabs (Matches Reference Image 2) */}
            <div className="flex items-center bg-[#06162A] p-1 rounded-full border border-[#38BDF8]/35 shrink-0">
              {(
                [
                  { id: 'gameplay', label: 'MATCH & RULES', shortLabel: 'MATCH', icon: Trophy },
                  { id: 'camera', label: 'CAMERA & FX', shortLabel: 'CAMERA', icon: Camera },
                  { id: 'audio', label: 'AUDIO & PROFILE', shortLabel: 'AUDIO', icon: Volume2 },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const active = settingsTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      crayonAudio.playMenuClick();
                      setSettingsTab(tab.id);
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 sm:px-4 rounded-full font-display text-[10px] sm:text-xs font-black uppercase tracking-wide transition-all cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-[#A3E635] text-[#041224] shadow-[0_0_16px_rgba(163,230,53,0.4)]'
                        : 'text-white/85 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden md:inline">{tab.label}</span>
                    <span className="md:hidden">{tab.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CENTER BENTO GRID (Matches Reference Image 2 Layout & Colors) */}
          <div className="flex-1 min-h-0 w-full max-w-6xl mx-auto my-2 overflow-y-auto flex">
            {settingsTab === 'gameplay' && (
              <div className="w-full my-auto flex flex-col gap-3 sm:gap-4">
                {/* Row 1: 3 Equal Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  {/* Card 1: Volleyball Format */}
                  <div className="p-4 sm:p-5 rounded-3xl bg-[#06162A]/95 border border-[#38BDF8]/30 flex flex-col justify-between gap-3.5">
                    <div className="flex items-start gap-3">
                      <svg
                        viewBox="0 0 24 24"
                        className="w-7 h-7 text-[#38BDF8] shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                      >
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 3a9 9 0 0 1 6.36 15.36M3.6 9h16.8M6 18.6A9 9 0 0 1 12 3" />
                      </svg>
                      <div>
                        <div className="font-display text-sm sm:text-base font-black uppercase text-white">
                          VOLLEYBALL FORMAT
                        </div>
                        <div className="text-xs font-semibold text-[#38BDF8] mt-0.5">
                          Solo 1v1 duel or 2v2 partner rally
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          { id: '1v1', label: '1V1 SOLO' },
                          { id: '2v2', label: '2V2 TEAM' },
                        ] as const
                      ).map((fmt) => (
                        <button
                          key={fmt.id}
                          onClick={() => {
                            crayonAudio.playMenuClick();
                            setMatchFormat(fmt.id);
                          }}
                          className={`py-2.5 px-3 rounded-2xl font-display text-xs font-black uppercase transition-all cursor-pointer ${
                            matchFormat === fmt.id
                              ? 'bg-[#38BDF8] text-[#041224] shadow-[0_0_14px_rgba(56,189,248,0.35)]'
                              : 'bg-[#041020] text-white border border-[#38BDF8]/30 hover:border-[#38BDF8]'
                          }`}
                        >
                          {fmt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Card 2: Target Win Score */}
                  <div className="p-4 sm:p-5 rounded-3xl bg-[#06162A]/95 border border-[#38BDF8]/30 flex flex-col justify-between gap-3.5">
                    <div className="flex items-start gap-3">
                      <svg
                        viewBox="0 0 24 24"
                        className="w-7 h-7 text-[#38BDF8] shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                      >
                        <circle cx="12" cy="12" r="9" />
                        <circle cx="12" cy="12" r="5" />
                        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                      </svg>
                      <div>
                        <div className="font-display text-sm sm:text-base font-black uppercase text-white">
                          TARGET WIN SCORE
                        </div>
                        <div className="text-xs font-semibold text-[#38BDF8] mt-0.5">
                          Points required to claim victory
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[5, 10, 15].map((pts) => (
                        <button
                          key={pts}
                          onClick={() => {
                            crayonAudio.playMenuClick();
                            setWinScore(pts);
                          }}
                          className={`py-2.5 px-2 rounded-2xl font-display text-xs font-black uppercase transition-all cursor-pointer ${
                            winScore === pts
                              ? 'bg-[#FACC15] text-[#041224] shadow-[0_0_14px_rgba(250,204,21,0.35)]'
                              : 'bg-[#041020] text-white border border-[#38BDF8]/30 hover:border-[#38BDF8]'
                          }`}
                        >
                          {pts} PTS
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Card 3: Difficulty */}
                  <div className="p-4 sm:p-5 rounded-3xl bg-[#06162A]/95 border border-[#38BDF8]/30 flex flex-col justify-between gap-3.5">
                    <div className="flex items-start gap-3">
                      <svg
                        viewBox="0 0 24 24"
                        className="w-7 h-7 text-[#38BDF8] shrink-0 mt-0.5"
                        fill="currentColor"
                      >
                        <rect x="4" y="14" width="4" height="6" rx="1" />
                        <rect x="10" y="10" width="4" height="10" rx="1" />
                        <rect x="16" y="5" width="4" height="15" rx="1" />
                      </svg>
                      <div className="min-w-0">
                        <div className="font-display text-sm sm:text-base font-black uppercase text-white truncate">
                          DIFFICULTY ({activeDiffConfig.label.toUpperCase()})
                        </div>
                        <div className="text-xs font-semibold text-[#38BDF8] mt-0.5 truncate">
                          Balanced AI, Player &amp; Solo Gun Fight - 3, 5, or 6 Min Timer
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {DIFFICULTY_LEVELS.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => {
                            crayonAudio.playMenuClick();
                            setDifficulty(d.id);
                          }}
                          className={`py-2.5 px-1 rounded-2xl font-display text-[10px] sm:text-xs font-black uppercase transition-all cursor-pointer ${
                            difficulty === d.id
                              ? 'bg-[#A3E635] text-[#041224] shadow-[0_0_14px_rgba(163,230,53,0.35)]'
                              : 'bg-[#041020] text-white border border-[#38BDF8]/30 hover:border-[#38BDF8]'
                          }`}
                        >
                          {d.shortLabel}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Row 2: 2 Cards (5 cols + 7 cols) */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4">
                  {/* Card 4: Game Tempo (Speed) */}
                  <div className="sm:col-span-5 p-4 sm:p-5 rounded-3xl bg-[#06162A]/95 border border-[#38BDF8]/30 flex flex-col justify-between gap-3.5">
                    <div className="flex items-start gap-3">
                      <Zap className="w-7 h-7 text-[#38BDF8] fill-[#38BDF8] shrink-0 mt-0.5" />
                      <div>
                        <div className="font-display text-sm sm:text-base font-black uppercase text-white">
                          GAME TEMPO (SPEED)
                        </div>
                        <div className="text-xs font-semibold text-[#38BDF8] mt-0.5">
                          Overall play pace &amp; ball/character speed
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { val: 0.85, label: '85%' },
                        { val: 1.0, label: '100%' },
                        { val: 1.15, label: '115%' },
                        { val: 1.3, label: '130%' },
                      ].map((spd) => (
                        <button
                          key={spd.val}
                          onClick={() => {
                            crayonAudio.playMenuClick();
                            setGameSpeedMultiplier(spd.val);
                          }}
                          className={`py-2.5 px-1 rounded-2xl font-display text-xs font-black uppercase transition-all cursor-pointer ${
                            Math.abs(gameSpeedMultiplier - spd.val) < 0.02
                              ? 'bg-[#38BDF8] text-[#041224] shadow-[0_0_14px_rgba(56,189,248,0.35)]'
                              : 'bg-[#041020] text-white border border-[#38BDF8]/30 hover:border-[#38BDF8]'
                          }`}
                        >
                          {spd.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Card 5: Arena Physics Modifier */}
                  <div className="sm:col-span-7 p-4 sm:p-5 rounded-3xl bg-[#06162A]/95 border border-[#38BDF8]/30 flex flex-col justify-between gap-3.5">
                    <div className="flex items-start gap-3">
                      <svg
                        viewBox="0 0 24 24"
                        className="w-7 h-7 text-[#38BDF8] shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
                      </svg>
                      <div>
                        <div className="font-display text-sm sm:text-base font-black uppercase text-white">
                          ARENA PHYSICS MODIFIER
                        </div>
                        <div className="text-xs font-semibold text-[#38BDF8] mt-0.5">
                          E.g. physics, ball weight, ball behavior &amp; arena style modifiers
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(
                        [
                          { id: 'none', label: 'STANDARD' },
                          { id: 'low_gravity', label: 'LOW GRAV' },
                          { id: 'big_ball', label: 'BIG BALL' },
                          { id: 'windy', label: 'SEA WIND' },
                        ] as const
                      ).map((mod) => (
                        <button
                          key={mod.id}
                          onClick={() => {
                            crayonAudio.playMenuClick();
                            setActiveModifier(mod.id);
                          }}
                          className={`py-2.5 px-2 rounded-2xl font-display text-xs font-black uppercase transition-all cursor-pointer ${
                            activeModifier === mod.id
                              ? 'bg-[#FACC15] text-[#041224] shadow-[0_0_14px_rgba(250,204,21,0.35)]'
                              : 'bg-[#041020] text-white border border-[#38BDF8]/30 hover:border-[#38BDF8]'
                          }`}
                        >
                          {mod.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: CAMERA & VISUAL FX */}
            {settingsTab === 'camera' && (
              <div className="w-full my-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                <div className="p-4 sm:p-5 rounded-3xl bg-[#06162A]/95 border border-[#38BDF8]/30 flex flex-col justify-between gap-3">
                  <div>
                    <div className="font-display text-sm sm:text-base font-black uppercase text-white">
                      CAMERA PERSPECTIVE
                    </div>
                    <div className="text-xs font-semibold text-[#38BDF8] mt-0.5">
                      Permanently locked to Follow Camera for all players
                    </div>
                  </div>
                  <div className="py-2.5 px-3 rounded-2xl bg-[#38BDF8] text-[#041224] font-display text-xs font-black uppercase text-center">
                    FOLLOW CAMERA (LOCKED)
                  </div>
                </div>

                <div className="p-4 sm:p-5 rounded-3xl bg-[#06162A]/95 border border-[#38BDF8]/30 flex flex-col justify-between gap-3">
                  <div>
                    <div className="font-display text-sm sm:text-base font-black uppercase text-white">
                      CAMERA ZOOM (FOV)
                    </div>
                    <div className="text-xs font-semibold text-[#38BDF8] mt-0.5">
                      Closer athlete focus or wider arena
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { fov: 40, label: '40° CLOSE' },
                      { fov: 45, label: '45° NORM' },
                      { fov: 52, label: '52° WIDE' },
                    ].map((item) => (
                      <button
                        key={item.fov}
                        onClick={() => {
                          crayonAudio.playMenuClick();
                          setCameraFov(item.fov);
                        }}
                        className={`py-2.5 px-1 rounded-2xl font-display text-xs font-black uppercase transition-all cursor-pointer ${
                          cameraFov === item.fov
                            ? 'bg-[#A3E635] text-[#041224]'
                            : 'bg-[#041020] text-white border border-[#38BDF8]/30'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-2 md:col-span-1 p-4 sm:p-5 rounded-3xl bg-[#06162A]/95 border border-[#38BDF8]/30 flex flex-col justify-between gap-3">
                  <div>
                    <div className="font-display text-sm sm:text-base font-black uppercase text-white">
                      LANDING RING EDGE
                    </div>
                    <div className="text-xs font-semibold text-[#38BDF8] mt-0.5">
                      Low-opacity circular edge on your court
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: 'classic', label: 'RED/GREEN' },
                        { id: 'neon', label: 'NEON' },
                        { id: 'off', label: 'HIDDEN' },
                      ] as const
                    ).map((st) => (
                      <button
                        key={st.id}
                        onClick={() => {
                          crayonAudio.playMenuClick();
                          setLandingCircleStyle(st.id);
                        }}
                        className={`py-2.5 px-1 rounded-2xl font-display text-xs font-black uppercase transition-all cursor-pointer ${
                          landingCircleStyle === st.id
                            ? 'bg-[#FACC15] text-[#041224]'
                            : 'bg-[#041020] text-white border border-[#38BDF8]/30'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    crayonAudio.playMenuClick();
                    setEnableVfx((v) => !v);
                  }}
                  className="p-4 sm:p-5 rounded-3xl bg-[#06162A]/95 border border-[#38BDF8]/30 text-left transition-all cursor-pointer flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-display text-sm font-black uppercase text-white truncate">
                      HIT SPARKS &amp; TRAILS
                    </div>
                    <div className="text-xs text-[#38BDF8] truncate">
                      Impact stars on spikes &amp; jumps
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1.5 rounded-xl font-display text-xs font-black uppercase shrink-0 ${
                      enableVfx
                        ? 'bg-[#A3E635] text-[#041224]'
                        : 'bg-[#041020] text-slate-400 border border-white/15'
                    }`}
                  >
                    {enableVfx ? 'ON' : 'OFF'}
                  </span>
                </button>

                <button
                  onClick={() => {
                    crayonAudio.playMenuClick();
                    setEnableScreenShake((v) => !v);
                  }}
                  className="p-4 sm:p-5 rounded-3xl bg-[#06162A]/95 border border-[#38BDF8]/30 text-left transition-all cursor-pointer flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-display text-sm font-black uppercase text-white truncate">
                      IMPACT CAMERA SHAKE
                    </div>
                    <div className="text-xs text-[#38BDF8] truncate">
                      Impulse on power hits &amp; bonks
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1.5 rounded-xl font-display text-xs font-black uppercase shrink-0 ${
                      enableScreenShake
                        ? 'bg-[#A3E635] text-[#041224]'
                        : 'bg-[#041020] text-slate-400 border border-white/15'
                    }`}
                  >
                    {enableScreenShake ? 'ON' : 'OFF'}
                  </span>
                </button>

                <button
                  onClick={() => {
                    crayonAudio.playMenuClick();
                    setShowCallouts((v) => !v);
                  }}
                  className="sm:col-span-2 md:col-span-1 p-4 sm:p-5 rounded-3xl bg-[#06162A]/95 border border-[#38BDF8]/30 text-left transition-all cursor-pointer flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-display text-sm font-black uppercase text-white truncate">
                      ARCADE CALLOUT TEXT
                    </div>
                    <div className="text-xs text-[#38BDF8] truncate">
                      Floating smash &amp; stage banners
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1.5 rounded-xl font-display text-xs font-black uppercase shrink-0 ${
                      showCallouts
                        ? 'bg-[#A3E635] text-[#041224]'
                        : 'bg-[#041020] text-slate-400 border border-white/15'
                    }`}
                  >
                    {showCallouts ? 'ON' : 'OFF'}
                  </span>
                </button>
              </div>
            )}

            {/* TAB 3: AUDIO & PROFILE */}
            {settingsTab === 'audio' && (
              <div className="w-full my-auto grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="p-4 sm:p-5 rounded-3xl bg-[#06162A]/95 border border-[#38BDF8]/30 flex flex-col justify-between gap-3">
                  <div>
                    <div className="font-display text-sm sm:text-base font-black uppercase text-white">
                      ATHLETE DISPLAY NAME
                    </div>
                    <div className="text-xs font-semibold text-[#38BDF8]">
                      Shown on your profile &amp; match scoreboard
                    </div>
                  </div>
                  <input
                    type="text"
                    value={playerName}
                    maxLength={16}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="px-3.5 py-2.5 rounded-2xl bg-[#041020] border border-[#38BDF8]/40 text-white font-display text-sm font-bold outline-none focus:border-[#A3E635] w-full"
                  />
                </div>

                <div className="p-4 sm:p-5 rounded-3xl bg-[#06162A]/95 border border-[#38BDF8]/30 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-display text-sm sm:text-base font-black uppercase text-white">
                      MASTER STUDIO AUDIO
                    </div>
                    <div className="text-xs font-semibold text-[#38BDF8]">
                      All synthesizer SFX &amp; victory chords
                    </div>
                  </div>
                  <button
                    onClick={handleToggleMute}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl font-display text-xs font-black uppercase cursor-pointer shrink-0 ${
                      muted
                        ? 'bg-rose-500 text-white'
                        : 'bg-[#A3E635] text-[#041224]'
                    }`}
                  >
                    {muted ? (
                      <>
                        <VolumeX className="w-4 h-4" />
                        <span>MUTED</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4" />
                        <span>ACTIVE</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-4 sm:p-5 rounded-3xl bg-[#06162A]/95 border border-[#38BDF8]/30 flex items-center justify-between gap-3">
                  <div className="w-28 sm:w-36 shrink-0">
                    <div className="font-display text-sm font-black uppercase text-white">
                      MUSIC &amp; CHIMES
                    </div>
                    <div className="text-xs text-[#38BDF8]">
                      Victory &amp; point chords
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={muted ? 0 : musicVol}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setMusicVol(val);
                      crayonAudio.musicVolume = val / 100;
                      crayonAudio.syncVolleyballNatureAmbienceVolume();
                    }}
                    onMouseUp={() => crayonAudio.playScoreCheer()}
                    className="flex-1 accent-[#A3E635] h-2 rounded-lg cursor-pointer"
                  />
                  <span className="font-display text-xs font-black text-[#A3E635] w-10 text-right shrink-0">
                    {muted ? 'OFF' : `${musicVol}%`}
                  </span>
                </div>

                <div className="p-4 sm:p-5 rounded-3xl bg-[#06162A]/95 border border-[#38BDF8]/30 flex items-center justify-between gap-3">
                  <div className="w-28 sm:w-36 shrink-0">
                    <div className="font-display text-sm font-black uppercase text-white">
                      SOUND EFFECTS
                    </div>
                    <div className="text-xs text-[#38BDF8]">
                      Ball pop, spike &amp; dive
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={muted ? 0 : sfxVol}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setSfxVol(val);
                      crayonAudio.sfxVolume = val / 100;
                    }}
                    onMouseUp={() => crayonAudio.playBallPop(3, true)}
                    className="flex-1 accent-[#38BDF8] h-2 rounded-lg cursor-pointer"
                  />
                  <span className="font-display text-xs font-black text-[#38BDF8] w-10 text-right shrink-0">
                    {muted ? 'OFF' : `${sfxVol}%`}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* BOTTOM BAR: Reset Defaults & Save & Return (Matches Reference Image 2) */}
          <div className="flex items-center justify-between gap-3 sm:gap-4 w-full max-w-6xl mx-auto pt-1 shrink-0">
            <button
              onClick={() => {
                crayonAudio.playMenuClick();
                setMatchFormat('2v2');
                setWinScore(5);
                setDifficulty('breezy');
                setGameSpeedMultiplier(1.0);
                setActiveModifier('none');
                setCameraPreset('dynamic_follow');
                setCameraFov(45);
                setLandingCircleStyle('classic');
                setEnableVfx(true);
                setEnableScreenShake(true);
                setShowCallouts(true);
                setMuted(false);
                setMusicVol(80);
                setSfxVol(90);
                crayonAudio.muted = false;
                crayonAudio.musicVolume = 0.8;
                crayonAudio.sfxVolume = 0.9;
              }}
              className="px-4 py-2.5 sm:px-6 sm:py-3 rounded-2xl bg-[#06162A] hover:bg-[#0B2542] border border-[#38BDF8]/35 text-white font-display text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-[#38BDF8]" />
              <span>RESET DEFAULTS</span>
            </button>

            <button
              onClick={() => {
                crayonAudio.playMenuClick();
                setGameState('TITLE_MENU');
              }}
              className="px-6 py-2.5 sm:px-8 sm:py-3 rounded-2xl bg-gradient-to-r from-[#A3E635] to-[#BEF264] hover:from-[#BEF264] hover:to-[#D9F99D] text-[#041224] font-display text-xs sm:text-sm font-black uppercase tracking-wider shadow-[0_0_24px_rgba(163,230,53,0.4)] flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>SAVE &amp; RETURN</span>
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* FULL-SCREEN VICTORY / DEFEAT PAGE (Clean Glassmorphic Championship)   */}
      {/* ===================================================================== */}
      {gameState === 'GAME_OVER' && (() => {
        const isVictory = stats.matchWinner
          ? stats.matchWinner === 'player'
          : stats.playerScore >= stats.targetWinScore &&
            stats.playerScore > stats.aiScore;
        const matchRank =
          gameMode === 'floor_is_lava'
            ? isVictory
              ? 'S+'
              : (stats.raceProgressPct ?? 0) >= 75
                ? 'A'
                : 'B'
            : gameMode === 'obstacle_rush'
              ? isVictory
                ? (stats.raceFalls ?? 0) === 0
                  ? 'S+'
                  : (stats.raceFalls ?? 0) <= 1
                    ? 'S'
                    : 'A'
                : (stats.raceProgressPct ?? 0) >= 75
                  ? 'B+'
                  : 'B'
              : isVictory
                ? stats.aiScore === 0
                  ? 'S+'
                  : stats.playerScore - stats.aiScore >= 2
                    ? 'S'
                    : 'A'
                : stats.playerScore >= stats.targetWinScore - 1
                  ? 'B+'
                  : 'B';

        const summarySubtitle =
          gameMode === 'obstacle_rush' || gameMode === 'floor_is_lava'
            ? stats.lastPointReason ||
              (isVictory
                ? `${playerName} (${activePlayerChar.name}) claimed the Championship Crown!`
                : `${playerName} finished the showdown on ${gameMode === 'floor_is_lava' ? activeLavaMap.name : activeRushMap.name}`)
            : isVictory
              ? `${playerName} (${activePlayerChar.name}) conquered ${activeTheme.name}!`
              : gameMode === 'survival'
                ? `${activeOpponentChar.name} ended your Elimination streak!`
                : `${activeOpponentChar.name} claimed the ${activeTheme.name} match!`;

        return (
          <div className="fixed inset-0 z-40 pointer-events-auto flex flex-col justify-center items-center px-3 py-3 sm:px-6 sm:py-6 safe-pad text-white overflow-y-auto">
            {/* Ambient Victory / Defeat Radial Spotlight */}
            <div
              className={`pointer-events-none fixed inset-0 z-0 ${
                isVictory
                  ? 'bg-[radial-gradient(circle_at_50%_28%,rgba(250,204,21,0.22)_0%,rgba(56,189,248,0.1)_42%,transparent_75%)]'
                  : 'bg-[radial-gradient(circle_at_50%_28%,rgba(244,63,94,0.2)_0%,rgba(15,23,42,0.4)_50%,transparent_75%)]'
              }`}
            />

            <div className="relative z-10 w-full max-w-2xl flex flex-col items-center gap-3 sm:gap-4 my-auto">
              {/* 1. Top Header: Clean Mode Pill + Crisp Extruded VICTORY / DEFEAT */}
              <div className="flex flex-col items-center text-center">
                <div
                  className={`px-3.5 py-1 rounded-full border backdrop-blur-xl font-display text-[10px] sm:text-xs font-black uppercase tracking-widest mb-1.5 shadow-md ${
                    isVictory
                      ? 'bg-amber-400/15 border-amber-300/50 text-[#FEF08A]'
                      : 'bg-rose-500/15 border-rose-400/45 text-rose-200'
                  }`}
                >
                  {gameMode === 'obstacle_rush'
                    ? `${activeRushMap.name} · 4P GUN FIGHT`
                    : gameMode === 'floor_is_lava'
                      ? `${activeLavaMap.name} · 4P NUKE`
                      : `${activeTheme.name} · ${matchFormat.toUpperCase()} VOLLEYBALL`}
                </div>

                <svg
                  viewBox="0 0 540 86"
                  className="w-[230px] sm:w-[350px] h-[42px] sm:h-[60px] overflow-visible select-none drop-shadow-[0_6px_16px_rgba(4,13,24,0.7)]"
                  aria-label={isVictory ? 'VICTORY!' : 'DEFEAT'}
                >
                  <defs>
                    <linearGradient id="victoryGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#FFFFFF" />
                      <stop offset="25%" stopColor="#FEF08A" />
                      <stop offset="68%" stopColor="#FACC15" />
                      <stop offset="100%" stopColor="#EA580C" />
                    </linearGradient>
                    <linearGradient id="defeatGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#FFF1F2" />
                      <stop offset="28%" stopColor="#FDA4AF" />
                      <stop offset="68%" stopColor="#F43F5E" />
                      <stop offset="100%" stopColor="#BE123C" />
                    </linearGradient>
                  </defs>
                  <text
                    x="270"
                    y="66"
                    textAnchor="middle"
                    fontFamily="'Rubik', 'Outfit', sans-serif"
                    fontWeight="900"
                    fontStyle="italic"
                    fontSize={isVictory ? '62' : '64'}
                    letterSpacing="4"
                    fill="#040D18"
                    stroke="#040D18"
                    strokeWidth="15"
                    strokeLinejoin="round"
                    paintOrder="stroke fill"
                  >
                    {isVictory ? 'VICTORY!' : 'DEFEAT'}
                  </text>
                  <text
                    x="270"
                    y="60"
                    textAnchor="middle"
                    fontFamily="'Rubik', 'Outfit', sans-serif"
                    fontWeight="900"
                    fontStyle="italic"
                    fontSize={isVictory ? '62' : '64'}
                    letterSpacing="4"
                    fill={isVictory ? 'url(#victoryGrad)' : 'url(#defeatGrad)'}
                    stroke="#040D18"
                    strokeWidth="10"
                    strokeLinejoin="round"
                    paintOrder="stroke fill"
                  >
                    {isVictory ? 'VICTORY!' : 'DEFEAT'}
                  </text>
                </svg>

                <p className="font-display text-xs sm:text-sm font-bold text-[#BAE6FD] mt-0.5 max-w-md truncate">
                  {summarySubtitle}
                </p>
              </div>

              {/* 2. Unified Frosted Glassmorphic Championship Card (Matchup + Integrated Stats) */}
              <div className="w-full rounded-3xl bg-slate-950/45 backdrop-blur-2xl backdrop-saturate-150 border border-white/30 p-4 sm:p-6 shadow-[0_16px_48px_rgba(0,0,0,0.42),inset_0_1px_1px_rgba(255,255,255,0.35)] flex flex-col gap-4">
                {/* Top Row: Left Player | Center Score & Rank | Right Rival or Map */}
                <div className="grid grid-cols-12 items-center gap-2 sm:gap-4">
                  {/* Left: Player Portrait */}
                  <div className="col-span-4 flex flex-col items-center text-center min-w-0">
                    <div
                      className={`relative w-16 h-16 sm:w-22 sm:h-22 rounded-2xl flex items-center justify-center border overflow-visible ${
                        isVictory
                          ? 'bg-sky-400/20 border-amber-300/80 shadow-[0_0_24px_rgba(250,204,21,0.25)]'
                          : 'bg-white/10 border-white/25'
                      }`}
                    >
                      {isVictory && (
                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-[#FACC15] border border-white/40 font-display text-[8px] sm:text-[9px] font-black uppercase text-slate-950 whitespace-nowrap shadow">
                          ★ WINNER ★
                        </span>
                      )}
                      <ChibiCharacterPortrait
                        char={activePlayerChar}
                        outfitOverride={selectedOutfitId}
                        faceOverride={isVictory ? 'star_eyes' : 'shock_rally'}
                        headShapeOverride={selectedHeadShape}
                        size={62}
                      />
                    </div>
                    <div className="font-display text-xs sm:text-base font-black uppercase text-white mt-1.5 truncate max-w-full">
                      {playerName}
                    </div>
                    <div className="text-[10px] sm:text-xs font-bold text-sky-200 truncate max-w-full">
                      {activePlayerChar.name}
                    </div>
                  </div>

                  {/* Center: Clean Score & Rank Badge */}
                  <div className="col-span-4 flex flex-col items-center justify-center text-center min-w-0">
                    <span className="text-[9px] sm:text-[10px] font-display font-black uppercase tracking-widest text-sky-200 mb-1">
                      {gameMode === 'floor_is_lava'
                        ? 'ROUNDS SURVIVED'
                        : gameMode === 'obstacle_rush'
                          ? 'FINAL STANDING'
                          : 'FINAL SCORE'}
                    </span>

                    {gameMode === 'floor_is_lava' ? (
                      <div className="flex items-center justify-center gap-2 font-display text-2xl sm:text-4xl font-black tracking-tight tabular-nums">
                        <span className={isVictory ? 'text-[#FEF08A]' : 'text-white'}>
                          {stats.playerScore}
                        </span>
                        <span className="text-sky-300 text-lg sm:text-2xl">-</span>
                        <span className={!isVictory ? 'text-rose-400' : 'text-white/80'}>
                          {stats.aiScore}
                        </span>
                      </div>
                    ) : gameMode === 'obstacle_rush' ? (
                      <div
                        className={`font-display text-xl sm:text-3xl font-black tracking-tight ${
                          isVictory ? 'text-[#FEF08A]' : 'text-[#38BDF8]'
                        }`}
                      >
                        {(() => {
                          const finalPlayerKills =
                            stats.arenaStandings?.find((s) => s.isPlayer)?.kills ??
                            stats.raceMaxFalls ??
                            rushHud.playerKills ??
                            0;
                          return isVictory
                            ? `#1 · ${finalPlayerKills} KILLS`
                            : `${finalPlayerKills} KILLS`;
                        })()}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2 font-display text-2xl sm:text-4xl font-black tracking-tight tabular-nums">
                        <span className={isVictory ? 'text-[#A3E635]' : 'text-white'}>
                          {stats.playerScore}
                        </span>
                        <span className="text-sky-300 text-lg sm:text-2xl">:</span>
                        <span className={!isVictory ? 'text-rose-400' : 'text-white/80'}>
                          {stats.aiScore}
                        </span>
                      </div>
                    )}

                    <div className="mt-2 px-3 py-0.5 rounded-full bg-amber-400/25 border border-amber-300/60 text-[#FEF08A] font-display text-[10px] sm:text-xs font-black uppercase tracking-wider shadow">
                      RANK {matchRank}
                    </div>
                  </div>

                  {/* Right: Arena Card or Rival Portrait */}
                  {gameMode === 'floor_is_lava' ? (
                    <div className="col-span-4 flex flex-col items-center text-center min-w-0">
                      <div className="relative w-20 h-16 sm:w-28 sm:h-20 rounded-2xl overflow-hidden border border-white/30 shadow-md bg-slate-900/50">
                        <LavaMapThumbnailPreview lavaMap={activeLavaMap} />
                      </div>
                      <div className="font-display text-xs sm:text-base font-black uppercase text-[#FEF08A] mt-1.5 truncate max-w-full">
                        {activeLavaMap.name}
                      </div>
                      <div className="text-[10px] sm:text-xs font-bold text-sky-200 truncate max-w-full">
                        4P Nuke · {activeDiffConfig.shortLabel}
                      </div>
                    </div>
                  ) : gameMode === 'obstacle_rush' ? (
                    <div className="col-span-4 flex flex-col items-center text-center min-w-0">
                      <div className="relative w-20 h-16 sm:w-28 sm:h-20 rounded-2xl overflow-hidden border border-white/30 shadow-md bg-slate-900/50">
                        <RushMapThumbnailPreview
                          rushMap={activeRushMap}
                          view="ingame"
                        />
                      </div>
                      <div className="font-display text-xs sm:text-base font-black uppercase text-[#FACC15] mt-1.5 truncate max-w-full">
                        {activeRushMap.name}
                      </div>
                      <div className="text-[10px] sm:text-xs font-bold text-sky-200 truncate max-w-full">
                        4P Solo · {activeDiffConfig.shortLabel}
                      </div>
                    </div>
                  ) : (
                    <div className="col-span-4 flex flex-col items-center text-center min-w-0">
                      <div
                        className={`relative w-16 h-16 sm:w-22 sm:h-22 rounded-2xl flex items-center justify-center border overflow-visible ${
                          !isVictory
                            ? 'bg-rose-500/20 border-rose-400/80 shadow-[0_0_24px_rgba(244,63,94,0.25)]'
                            : 'bg-white/10 border-white/25'
                        }`}
                      >
                        {!isVictory && (
                          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-rose-400 border border-white/40 font-display text-[8px] sm:text-[9px] font-black uppercase text-slate-950 whitespace-nowrap shadow">
                            ★ WINNER ★
                          </span>
                        )}
                        <ChibiCharacterPortrait
                          char={activeOpponentChar}
                          faceOverride={isVictory ? 'shock_rally' : 'cool_shades'}
                          size={62}
                        />
                      </div>
                      <div className="font-display text-xs sm:text-base font-black uppercase text-rose-200 mt-1.5 truncate max-w-full">
                        {activeOpponentChar.name}
                      </div>
                      <div className="text-[10px] sm:text-xs font-bold text-sky-200 truncate max-w-full">
                        {is2v2Match
                          ? `& ${activeOpponentPartnerChar.name}`
                          : 'Rival Athlete'}
                      </div>
                    </div>
                  )}
                </div>

                {/* Integrated Bottom Stat Strip inside the Frosted Glassmorphic Card */}
                {gameMode === 'obstacle_rush' &&
                stats.arenaStandings &&
                stats.arenaStandings.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-white/20">
                    {stats.arenaStandings.map((fighter, idx) => (
                      <div
                        key={fighter.id}
                        className={`rounded-2xl py-2 px-2.5 text-center border ${
                          fighter.isPlayer
                            ? 'bg-lime-400/20 border-lime-300/60'
                            : idx === 0
                              ? 'bg-amber-400/15 border-amber-300/50'
                              : 'bg-white/10 border-white/20'
                        }`}
                      >
                        <div className="text-[10px] font-display font-black uppercase text-sky-200 truncate">
                          #{idx + 1} {fighter.isPlayer ? 'YOU' : fighter.name}
                        </div>
                        <div className="font-display text-xs sm:text-sm font-black text-[#FEF08A]">
                          {fighter.kills} Kills
                        </div>
                        <div className="text-[9px] font-bold text-slate-200">
                          {fighter.deaths} Deaths
                        </div>
                      </div>
                    ))}
                  </div>
                ) : gameMode === 'floor_is_lava' ? (
                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/20">
                    <div className="rounded-2xl bg-white/10 border border-white/20 py-2 px-3 text-center">
                      <div className="text-[9px] sm:text-[10px] font-display font-bold uppercase tracking-wider text-sky-200">
                        Knockouts
                      </div>
                      <div className="font-display text-sm sm:text-base font-black text-white">
                        {stats.bestRally || lavaHud.tilesCrumbled || 0} KOs
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white/10 border border-white/20 py-2 px-3 text-center">
                      <div className="text-[9px] sm:text-[10px] font-display font-bold uppercase tracking-wider text-[#A3E635]">
                        Nuke Hits
                      </div>
                      <div className="font-display text-sm sm:text-base font-black text-[#A3E635]">
                        {stats.perfectSpikes || lavaHud.lavaLevelMeters || 0} Hits
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white/10 border border-white/20 py-2 px-3 text-center">
                      <div className="text-[9px] sm:text-[10px] font-display font-bold uppercase tracking-wider text-[#FEF08A]">
                        Match Time
                      </div>
                      <div className="font-display text-sm sm:text-base font-black text-[#FEF08A]">
                        {(stats.raceTimeSec ?? 0).toFixed(1)}s
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/20">
                    <div className="rounded-2xl bg-white/10 border border-white/20 py-2 px-3 text-center">
                      <div className="text-[9px] sm:text-[10px] font-display font-bold uppercase tracking-wider text-sky-200">
                        Best Rally
                      </div>
                      <div className="font-display text-sm sm:text-base font-black text-white">
                        {stats.bestRally} Hits
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white/10 border border-white/20 py-2 px-3 text-center">
                      <div className="text-[9px] sm:text-[10px] font-display font-bold uppercase tracking-wider text-[#A3E635]">
                        Power Spikes
                      </div>
                      <div className="font-display text-sm sm:text-base font-black text-[#A3E635]">
                        {stats.perfectSpikes} Smashes
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white/10 border border-white/20 py-2 px-3 text-center">
                      <div className="text-[9px] sm:text-[10px] font-display font-bold uppercase tracking-wider text-[#FEF08A]">
                        Match Target
                      </div>
                      <div className="font-display text-sm sm:text-base font-black text-[#FEF08A]">
                        {stats.targetWinScore} Points
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Bottom Darkened Blue Glassmorphic Action Buttons: Play Again, Custom Lobby & Main Menu */}
              <div className="w-full max-w-lg grid grid-cols-3 gap-2.5 sm:gap-3">
                <button
                  onClick={handleRestartMatch}
                  className="flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-lime-400/90 hover:bg-lime-400 border border-white/40 shadow-[0_8px_24px_rgba(132,204,22,0.3),inset_0_1px_1px_rgba(255,255,255,0.5)] text-slate-950 font-display text-xs sm:text-sm font-black uppercase tracking-wide transition-all active:scale-98 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 stroke-[3]" />
                  <span>Play Again</span>
                </button>
                <button
                  onClick={() => {
                    crayonAudio.playMenuClick();
                    if (mpRoom) {
                      multiplayerClient.returnToLobby();
                      setGameMode('crab_target');
                    }
                    setGameState('MODE_SELECT');
                  }}
                  className="flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-[#07162C]/85 hover:bg-[#0D2546]/90 backdrop-blur-xl backdrop-saturate-150 border border-sky-300/40 shadow-[0_8px_24px_rgba(2,8,23,0.6),inset_0_1px_1px_rgba(186,230,253,0.3)] text-sky-200 font-display text-xs sm:text-sm font-black uppercase tracking-wide transition-all active:scale-98 cursor-pointer"
                >
                  <Users className="w-4 h-4 stroke-[2.8] text-sky-300" />
                  <span>{mpRoom ? 'Room Lobby' : 'Modes & Maps'}</span>
                </button>
                <button
                  onClick={() => {
                    crayonAudio.playMenuClick();
                    setGameState('TITLE_MENU');
                  }}
                  className="flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-[#07162C]/85 hover:bg-[#0D2546]/90 backdrop-blur-xl backdrop-saturate-150 border border-sky-300/35 shadow-[0_8px_24px_rgba(2,8,23,0.6),inset_0_1px_1px_rgba(186,230,253,0.3)] text-white font-display text-xs sm:text-sm font-black uppercase tracking-wide transition-all active:scale-98 cursor-pointer"
                >
                  <Home className="w-4 h-4 stroke-[2.8] text-sky-200" />
                  <span>Main Menu</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ===================================================================== */}
      {/* SIXZUN OFFICIAL SPLASH & LOADING SCREEN (No Logo + Small Fullscreen)  */}
      {/* ===================================================================== */}
      {showSplashScreen && (
        <div
          onClick={() => {
            void enterFullscreenAndLandscape();
          }}
          className="fixed inset-0 z-[120] flex flex-col items-center justify-between overflow-hidden bg-[#0EA5E9] select-none cursor-pointer"
        >
          {/* 1. Full-Screen Clean Key Art Background (/assets/aistudio/d1951bb8-0e5f-43c3-9411-e2ddb501a8f9_b880dc9a.png) */}
          <img
            src="/assets/aistudio/d1951bb8-0e5f-43c3-9411-e2ddb501a8f9_b880dc9a.png"
            alt="Key Art"
            className="pointer-events-none absolute inset-0 w-full h-full object-cover object-center"
          />

          {/* Top-Right Small Full Screen Option when Opening Game (Especially for Mobile Players) */}
          <div className="relative z-10 w-full flex items-center justify-end p-3 sm:p-4 safe-pad">
            {!isFullscreen && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  void enterFullscreenAndLandscape();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/55 hover:bg-slate-950/75 border border-white/30 backdrop-blur-md text-white font-display text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-lg transition-all active:scale-95 cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5 text-[#FDE047]" />
                <span>Full Screen</span>
              </button>
            )}
          </div>

          {/* Bottom-Center LOADING... + Golden Pill Progress Bar + Dodge • Throw • Catch • Survive */}
          <div className="relative z-10 w-full flex flex-col items-center justify-end pb-3 sm:pb-5 px-4 safe-pad pointer-events-none">
            {/* Chunky White Outlined "LOADING..." Text */}
            <svg
              viewBox="0 0 360 58"
              className="w-[180px] sm:w-[230px] md:w-[260px] h-auto overflow-visible -mb-1 sm:-mb-1.5 drop-shadow-[0_4px_6px_rgba(0,0,0,0.35)]"
              aria-label="LOADING..."
            >
              <text
                x="180"
                y="44"
                textAnchor="middle"
                fontFamily="'Rubik', 'Outfit', sans-serif"
                fontWeight="900"
                fontSize="44"
                letterSpacing="1.5"
                paintOrder="stroke fill"
                stroke="#0D1B2E"
                strokeWidth="12"
                strokeLinejoin="round"
                strokeLinecap="round"
                fill="#F8FAFC"
              >
                LOADING...
              </text>
            </svg>

            {/* Dark Navy Rounded-Full Track + Golden-Yellow Pill Bar */}
            <div className="w-[min(82vw,420px)] sm:w-[min(70vw,460px)] h-6 sm:h-7 rounded-full bg-[#1C2838]/95 border-[3.5px] border-[#0D1828] p-[2.5px] shadow-[0_6px_14px_rgba(4,12,24,0.45),inset_0_2px_4px_rgba(0,0,0,0.55)] overflow-hidden">
              <div
                style={{ width: `${Math.max(8, loadingProgress)}%` }}
                className="h-full rounded-full bg-gradient-to-b from-[#FDE047] via-[#EAB308] to-[#CA8A04] border border-[#FEF08A]/80 shadow-[inset_0_2px_1px_rgba(255,255,255,0.45)] transition-all duration-75"
              />
            </div>

            {/* Clean Subtitle: Dodge • Throw • Catch • Survive */}
            <div
              className="mt-1.5 sm:mt-2 font-display text-xs sm:text-sm md:text-base font-extrabold tracking-wide text-[#DBEAFE]"
              style={{
                textShadow: '0 2px 4px rgba(8, 20, 38, 0.75)',
              }}
            >
              Dodge &bull; Throw &bull; Catch &bull; Survive
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
