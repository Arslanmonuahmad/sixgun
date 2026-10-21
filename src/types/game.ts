export type CharacterId =
  | 'green_hoodie'
  | 'purple_shades'
  | 'gold_king'
  | 'red_cap'
  | 'pirate_capt'
  | 'blue_sporty'
  | 'pink_visor'
  | 'astro_bean'
  | 'viking_beard'
  | 'burger_chef'
  | 'strawberry_kid'
  | 'pineapple_king';

export type HatStyle =
  | 'baseball_cap'
  | 'ears_hood'
  | 'crown'
  | 'visor'
  | 'headband'
  | 'shades'
  | 'pirate'
  | 'astronaut'
  | 'viking'
  | 'burger'
  | 'strawberry'
  | 'pineapple';

export type OutfitId =
  | 'crown_hoodie'
  | 'beach_jersey'
  | 'king_royal'
  | 'pirate_coat'
  | 'banana_suit'
  | 'cat_hoodie'
  | 'cyber_jacket'
  | 'astro_suit'
  | 'viking_tunic'
  | 'burger_suit'
  | 'strawberry_suit'
  | 'pineapple_suit';

export type FaceId =
  | 'happy_laugh'
  | 'cool_shades'
  | 'star_eyes'
  | 'fierce_pro'
  | 'cheeky_wink'
  | 'kawaii_blush'
  | 'shock_rally'
  | 'cyber_visor'
  | 'viking_beard'
  | 'chef_beard';

export type HeadShape = 'round' | 'bean' | 'squircle' | 'mochi' | 'angular';

export type EmoteId = 'wave' | 'cheer' | 'spin' | 'spike_pose';

export type GameState =
  | 'TITLE_MENU'
  | 'MODE_SELECT'
  | 'CUSTOM_LOBBY'
  | 'CHARACTER_SELECT'
  | 'PROFILE'
  | 'SETTINGS'
  | 'TOUR_MAP'
  | 'PLAYING'
  | 'PAUSED'
  | 'GAME_OVER';

export type GameMode =
  | 'obstacle_rush'
  | 'floor_is_lava'
  | 'quick'
  | 'duo_2v2'
  | 'tour'
  | 'hoop_volley'
  | 'bomb_potato'
  | 'crab_target'
  | 'survival';

export type AIDifficulty =
  | 'chill'
  | 'breezy'
  | 'spicy'
  | 'extreme'
  | 'nightmare';

export type ObstacleRushMapId =
  | 'sky_carnival'
  | 'lava_foundry'
  | 'cyber_glacier';

export type FloorIsLavaMapId =
  | 'volcano_summit'
  | 'hex_colosseum';

export interface FloorIsLavaMapConfig {
  id: FloorIsLavaMapId;
  name: string;
  subtitle: string;
  badgeText: string;
  environmentTag: string;
  accentHex: string;
  skyTop: string;
  skyHorizon: string;
  lavaColor: string;
  lavaGlow: string;
}

export interface ObstacleRushMapConfig {
  id: ObstacleRushMapId;
  name: string;
  subtitle: string;
  badgeText: string;
  environmentTag: string;
  accentHex: string;
  skyTop: string;
  skyHorizon: string;
  abyssColor: string;
  deckPrimary: string;
  deckSecondary: string;
  railColor: string;
  hammerColor: string;
  hammerAccent: string;
  iceColor: string;
  bridgeColor: string;
  parTimeSec: number;
  hazardsSummary: [string, string, string, string];
}

export interface DifficultyConfig {
  id: AIDifficulty;
  label: string;
  shortLabel: string;
  badgeColor: string;
  rushSpeedMult: number;
  rushTimeLimitSec: number;
  rushMaxFalls: number;
  bridgeShakeSec: number;
  description: string;
}

export type CameraPreset = 'portrait_court' | 'dynamic_follow' | 'side_sketch';

export type CourtThemeId =
  | 'pirate_cove'
  | 'sky_island'
  | 'toy_park'
  | 'sakura_temple'
  | 'glacier_fort'
  | 'space_station'
  | 'cozy_beach'
  | 'neon_rooftop'
  | 'sakura_shrine';

export type LevelModifier =
  | 'none'
  | 'big_ball'
  | 'low_gravity'
  | 'windy'
  | 'turbo';

export type BallSkinId =
  | 'classic_pro'
  | 'crayon_cove'
  | 'retro_beach'
  | 'juicy_melon'
  | 'neon_cyber'
  | 'royal_gold'
  | 'magma_core'
  | 'cosmic_nebula'
  | 'candy_swirl'
  | 'emerald_dragon';

export interface BallSkinConfig {
  id: BallSkinId;
  name: string;
  subtitle: string;
  badgeColor: string;
  primaryColors: [string, string, string];
  trailHex: number[];
}

export const BALL_SKINS: BallSkinConfig[] = [
  {
    id: 'classic_pro',
    name: 'Pro Tri-Wave',
    subtitle: 'Sunny tournament gold, sky blue & crisp pearl white panels',
    badgeColor: '#FACC15',
    primaryColors: ['#FDE047', '#38BDF8', '#FFFFFF'],
    trailHex: [0xfacc15, 0x38bdf8, 0x60a5fa],
  },
  {
    id: 'crayon_cove',
    name: 'Sunset Coral',
    subtitle: 'Bright coral rose, turquoise lagoon & sunny gold wave panels',
    badgeColor: '#FB7185',
    primaryColors: ['#FB7185', '#2DD4BF', '#FDE047'],
    trailHex: [0xfb7185, 0x2dd4bf, 0xfacc15],
  },
  {
    id: 'retro_beach',
    name: 'Retro Beach Ball',
    subtitle: 'Glossy cherry red, sunny yellow, sky blue & white beach wedges',
    badgeColor: '#FF4D6D',
    primaryColors: ['#FF4D6D', '#FDE047', '#38BDF8'],
    trailHex: [0xff4d6d, 0xfacc15, 0x38bdf8],
  },
  {
    id: 'juicy_melon',
    name: 'Watermelon Splash',
    subtitle: 'Fresh lime green, juicy watermelon pink & mint cream panels',
    badgeColor: '#4ADE80',
    primaryColors: ['#4ADE80', '#FB7185', '#ECFDF5'],
    trailHex: [0x4ade80, 0xfb7185, 0x34d399],
  },
  {
    id: 'neon_cyber',
    name: 'Electric Arcade',
    subtitle: 'Electric cyan, bubblegum pink & laser yellow pop panels',
    badgeColor: '#22D3EE',
    primaryColors: ['#22D3EE', '#F472B6', '#FEF08A'],
    trailHex: [0x22d3ee, 0xf472b6, 0xfacc15],
  },
  {
    id: 'royal_gold',
    name: 'Royal Crown Gold',
    subtitle: 'Brilliant 24K gold, warm buttercream & royal sky crests',
    badgeColor: '#F59E0B',
    primaryColors: ['#FACC15', '#FEF9C3', '#60A5FA'],
    trailHex: [0xfacc15, 0x60a5fa, 0xf59e0b],
  },
  {
    id: 'magma_core',
    name: 'Solar Sunburst',
    subtitle: 'Radiant tangerine orange, sunburst yellow & warm coral waves',
    badgeColor: '#FB923C',
    primaryColors: ['#FB923C', '#FDE047', '#F87171'],
    trailHex: [0xfb923c, 0xfacc15, 0xf87171],
  },
  {
    id: 'cosmic_nebula',
    name: 'Cotton Candy Star',
    subtitle: 'Pastel lavender, baby sky blue & rose pink with gold stars',
    badgeColor: '#C084FC',
    primaryColors: ['#C084FC', '#7DD3FC', '#F472B6'],
    trailHex: [0xc084fc, 0x7dd3fc, 0xf472b6],
  },
  {
    id: 'candy_swirl',
    name: 'Strawberry Mint',
    subtitle: 'Sweet strawberry pink, mint aqua & vanilla cream swirl',
    badgeColor: '#F472B6',
    primaryColors: ['#F472B6', '#6EE7B7', '#FFFBEB'],
    trailHex: [0xf472b6, 0x6ee7b7, 0xfde047],
  },
  {
    id: 'emerald_dragon',
    name: 'Tropical Kiwi',
    subtitle: 'Bright kiwi green, sunny lime & golden citrus panels',
    badgeColor: '#4ADE80',
    primaryColors: ['#4ADE80', '#A3E635', '#FEF08A'],
    trailHex: [0x4ade80, 0xa3e635, 0xfacc15],
  },
];

export interface OutfitConfig {
  id: OutfitId;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  emblemType:
    | 'crown'
    | 'number'
    | 'star'
    | 'skull'
    | 'paw'
    | 'bolt'
    | 'planet'
    | 'burger'
    | 'berry'
    | 'pineapple';
  accentColor: string;
}

export interface FaceConfig {
  id: FaceId;
  name: string;
  subtitle: string;
  defaultHeadShape: HeadShape;
}

export interface EmoteConfig {
  id: EmoteId;
  name: string;
  subtitle: string;
}

export interface CharacterConfig {
  id: CharacterId;
  name: string;
  title: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  level: number;
  skinTone: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  cheekColor: string;
  hatStyle: HatStyle;
  headShape: HeadShape;
  defaultOutfit: OutfitId;
  defaultFace: FaceId;
  outfitId?: OutfitId;
  faceId?: FaceId;
  emoteId?: EmoteId;
  speed: number;
  floatiness: number;
  power: number;
  reach: number;
  tagline: string;
  superMoveName: string;
}

export interface CourtTheme {
  id: CourtThemeId;
  name: string;
  subtitle: string;
  badgeText: string;
  playersTag: string;
  skyTop: string;
  skyHorizon: string;
  waterColor: string;
  groundColor: string;
  courtInnerColor: string;
  lineColor: string;
  netColor: string;
  postColor: string;
  sunColor: string;
  hemisphereSky: string;
  hemisphereGround: string;
  islandCliffColor: string;
  foliagePrimary: string;
  foliageSecondary: string;
  hasWaterPlane: boolean;
}

export interface TourLevelConfig {
  level: number;
  title: string;
  subtitle: string;
  opponentId: CharacterId;
  opponentPartnerId: CharacterId;
  partnerId: CharacterId;
  format: '1v1' | '2v2';
  subGame: GameMode;
  themeId: CourtThemeId;
  difficulty: AIDifficulty;
  winScore: number;
  modifier: LevelModifier;
  modifierLabel: string;
  nodeX: number;
  nodeY: number;
}

export interface SubGameInfo {
  id: GameMode;
  title: string;
  tabLabel: string;
  subtitle: string;
  badge: string;
  accentHex: string;
  cardGradient: string;
  playersTag: string;
  defaultTheme: CourtThemeId;
  modeThemes: CourtThemeId[];
}

export interface CalloutPopup {
  id: number;
  text: string;
  subtext?: string;
  color: string;
  bgHex: string;
  x: number;
  y: number;
}

export interface MatchStats {
  playerScore: number;
  aiScore: number;
  targetWinScore: number;
  currentRally: number;
  bestRally: number;
  perfectSpikes: number;
  partnerSets: number;
  bonusHits: number;
  superCharge: number;
  servingSide: 'player' | 'ai';
  lastPointWinner: 'player' | 'ai' | null;
  lastPointReason: string;
  matchWinner?: 'player' | 'ai' | null;
  raceTimeSec?: number;
  raceTimeLeftSec?: number;
  raceFalls?: number;
  raceMaxFalls?: number;
  raceProgressPct?: number;
  arenaStandings?: Array<{
    id: string;
    name: string;
    kills: number;
    deaths: number;
    isPlayer: boolean;
    charId: CharacterId;
  }>;
}

export const HEAD_SHAPES: Array<{ id: HeadShape; label: string }> = [
  { id: 'round', label: 'Round' },
  { id: 'bean', label: 'Bean' },
  { id: 'squircle', label: 'Blocky' },
  { id: 'mochi', label: 'Mochi' },
  { id: 'angular', label: 'Hero Jaw' },
];

export const CHARACTER_OUTFITS: OutfitConfig[] = [
  {
    id: 'crown_hoodie',
    name: 'Crown Hoodie',
    primaryColor: '#4ADE80',
    secondaryColor: '#1E293B',
    emblemType: 'crown',
    accentColor: '#FFFFFF',
  },
  {
    id: 'cat_hoodie',
    name: 'Neko Hoodie',
    primaryColor: '#A855F7',
    secondaryColor: '#312E81',
    emblemType: 'paw',
    accentColor: '#F472B6',
  },
  {
    id: 'banana_suit',
    name: 'Tropi-Gold Track',
    primaryColor: '#FACC15',
    secondaryColor: '#713F12',
    emblemType: 'star',
    accentColor: '#FEF08A',
  },
  {
    id: 'beach_jersey',
    name: 'Striker Jersey',
    primaryColor: '#EF4444',
    secondaryColor: '#1E293B',
    emblemType: 'number',
    accentColor: '#FDE047',
  },
  {
    id: 'pirate_coat',
    name: 'Captain Coat',
    primaryColor: '#DC2626',
    secondaryColor: '#0F172A',
    emblemType: 'skull',
    accentColor: '#FACC15',
  },
  {
    id: 'cyber_jacket',
    name: 'Volt Jacket',
    primaryColor: '#2563EB',
    secondaryColor: '#0F172A',
    emblemType: 'bolt',
    accentColor: '#38BDF8',
  },
  {
    id: 'king_royal',
    name: 'Berry Suit',
    primaryColor: '#EC4899',
    secondaryColor: '#4C1D95',
    emblemType: 'crown',
    accentColor: '#FDE047',
  },
  {
    id: 'astro_suit',
    name: 'Galaxy Suit',
    primaryColor: '#38BDF8',
    secondaryColor: '#0F172A',
    emblemType: 'planet',
    accentColor: '#FACC15',
  },
  {
    id: 'viking_tunic',
    name: 'Viking Armor',
    primaryColor: '#B45309',
    secondaryColor: '#1E293B',
    emblemType: 'crown',
    accentColor: '#FACC15',
  },
  {
    id: 'burger_suit',
    name: 'Burger Grill',
    primaryColor: '#EA580C',
    secondaryColor: '#78350F',
    emblemType: 'burger',
    accentColor: '#FACC15',
  },
  {
    id: 'strawberry_suit',
    name: 'Strawberry Pop',
    primaryColor: '#F43F5E',
    secondaryColor: '#15803D',
    emblemType: 'berry',
    accentColor: '#FEF08A',
  },
  {
    id: 'pineapple_suit',
    name: 'Pineapple Aloha',
    primaryColor: '#EAB308',
    secondaryColor: '#166534',
    emblemType: 'pineapple',
    accentColor: '#4ADE80',
  },
];

export const CHARACTER_FACES: FaceConfig[] = [
  {
    id: 'happy_laugh',
    name: 'Happy Laugh',
    subtitle: 'Big glossy eyes & cheerful tongue!',
    defaultHeadShape: 'round',
  },
  {
    id: 'viking_beard',
    name: 'Viking Beard',
    subtitle: 'Mighty braided beard & handlebar mustache!',
    defaultHeadShape: 'squircle',
  },
  {
    id: 'chef_beard',
    name: 'Boss Beard',
    subtitle: 'Thick grill-master mustache & goatee!',
    defaultHeadShape: 'round',
  },
  {
    id: 'cool_shades',
    name: 'Cool Shades',
    subtitle: 'Dark pro shades & confident grin!',
    defaultHeadShape: 'bean',
  },
  {
    id: 'star_eyes',
    name: 'Star Struck',
    subtitle: 'Sparkling golden star eyes!',
    defaultHeadShape: 'mochi',
  },
  {
    id: 'fierce_pro',
    name: 'Pro Striker',
    subtitle: 'Focused eyebrows & game-face grin!',
    defaultHeadShape: 'angular',
  },
  {
    id: 'cheeky_wink',
    name: 'Cheeky Wink',
    subtitle: 'Playful wink & sideways tongue!',
    defaultHeadShape: 'squircle',
  },
  {
    id: 'kawaii_blush',
    name: 'Cozy Blush',
    subtitle: 'Big anime sparkles & rosy cheeks!',
    defaultHeadShape: 'mochi',
  },
  {
    id: 'shock_rally',
    name: 'Match Point',
    subtitle: 'Hyped wide-eyed rally reaction!',
    defaultHeadShape: 'bean',
  },
  {
    id: 'cyber_visor',
    name: 'Neon Visor',
    subtitle: 'Glowing cyan holo-visor!',
    defaultHeadShape: 'round',
  },
];

/**
 * 12 Chibi Humanoid Athletes Including Bearded Heroes, Food & Juicy Fruit Characters!
 */
export const CRAYON_CHARACTERS: CharacterConfig[] = [
  {
    id: 'green_hoodie',
    name: 'LEO',
    title: 'Crown Hoodie Kid',
    rarity: 'Common',
    level: 12,
    skinTone: '#FFDFC4',
    primaryColor: '#4ADE80',
    secondaryColor: '#1E293B',
    accentColor: '#EF4444',
    cheekColor: '#FB7185',
    hatStyle: 'baseball_cap',
    headShape: 'round',
    defaultOutfit: 'crown_hoodie',
    defaultFace: 'happy_laugh',
    speed: 3,
    floatiness: 3,
    power: 3,
    reach: 3,
    tagline: 'Cheerful street-court hero in his signature lime crown hoodie & backwards cap!',
    superMoveName: 'Emerald Comet Smash',
  },
  {
    id: 'viking_beard',
    name: 'BJORN',
    title: 'Bearded Viking',
    rarity: 'Legendary',
    level: 15,
    skinTone: '#FCD5B5',
    primaryColor: '#B45309',
    secondaryColor: '#1E293B',
    accentColor: '#FACC15',
    cheekColor: '#F87171',
    hatStyle: 'viking',
    headShape: 'squircle',
    defaultOutfit: 'viking_tunic',
    defaultFace: 'viking_beard',
    speed: 3,
    floatiness: 2,
    power: 5,
    reach: 4,
    tagline: 'Mighty bearded Norse legend with a horned helm, braided ginger beard & thunderous power!',
    superMoveName: 'Valhalla Hammer Slam',
  },
  {
    id: 'burger_chef',
    name: 'BURGER',
    title: 'Bearded Burger Boss',
    rarity: 'Epic',
    level: 13,
    skinTone: '#FBBF94',
    primaryColor: '#EA580C',
    secondaryColor: '#78350F',
    accentColor: '#FACC15',
    cheekColor: '#FB923C',
    hatStyle: 'burger',
    headShape: 'round',
    defaultOutfit: 'burger_suit',
    defaultFace: 'chef_beard',
    speed: 3,
    floatiness: 3,
    power: 4,
    reach: 3,
    tagline: 'Sizzling bearded grill-master rocking a giant double-cheeseburger sesame hat!',
    superMoveName: 'Flame-Broiled Smash',
  },
  {
    id: 'strawberry_kid',
    name: 'BERRY',
    title: 'Strawberry Pop',
    rarity: 'Epic',
    level: 12,
    skinTone: '#FFE4E6',
    primaryColor: '#F43F5E',
    secondaryColor: '#15803D',
    accentColor: '#FEF08A',
    cheekColor: '#FB7185',
    hatStyle: 'strawberry',
    headShape: 'mochi',
    defaultOutfit: 'strawberry_suit',
    defaultFace: 'kawaii_blush',
    speed: 4,
    floatiness: 4,
    power: 3,
    reach: 3,
    tagline: 'Sweet & speedy strawberry fruit sprinter with a leafy green berry crown & seed hoodie!',
    superMoveName: 'Berry Blast Volley',
  },
  {
    id: 'pineapple_king',
    name: 'PINE',
    title: 'Pineapple King',
    rarity: 'Legendary',
    level: 14,
    skinTone: '#FDE68A',
    primaryColor: '#EAB308',
    secondaryColor: '#166534',
    accentColor: '#4ADE80',
    cheekColor: '#FB923C',
    hatStyle: 'pineapple',
    headShape: 'bean',
    defaultOutfit: 'pineapple_suit',
    defaultFace: 'cool_shades',
    speed: 4,
    floatiness: 3,
    power: 4,
    reach: 3,
    tagline: 'Tropical pineapple fruit powerhouse with a spiky green palm crown & island swagger!',
    superMoveName: 'Tropical Aloha Cannon',
  },
  {
    id: 'purple_shades',
    name: 'MAYA',
    title: 'Cat-Ear Hoodie',
    rarity: 'Rare',
    level: 10,
    skinTone: '#FFE4C8',
    primaryColor: '#A855F7',
    secondaryColor: '#312E81',
    accentColor: '#F472B6',
    cheekColor: '#F472B6',
    hatStyle: 'ears_hood',
    headShape: 'mochi',
    defaultOutfit: 'cat_hoodie',
    defaultFace: 'kawaii_blush',
    speed: 4,
    floatiness: 3,
    power: 2,
    reach: 3,
    tagline: 'Playful purple cat-hoodie acrobat with squishy mochi cheeks & lightning reflexes!',
    superMoveName: 'Nebula Laser Spike',
  },
  {
    id: 'gold_king',
    name: 'BANANZO',
    title: 'Cool Shades',
    rarity: 'Legendary',
    level: 15,
    skinTone: '#FDE68A',
    primaryColor: '#FACC15',
    secondaryColor: '#713F12',
    accentColor: '#0F172A',
    cheekColor: '#FB923C',
    hatStyle: 'shades',
    headShape: 'bean',
    defaultOutfit: 'banana_suit',
    defaultFace: 'cool_shades',
    speed: 3,
    floatiness: 3,
    power: 4,
    reach: 3,
    tagline: 'Tall stumble-bean contour, cool shades, and tropical golden energy on every spike!',
    superMoveName: 'Royal Thunder Smash',
  },
  {
    id: 'red_cap',
    name: 'RIKO',
    title: 'Red Cap Striker',
    rarity: 'Rare',
    level: 9,
    skinTone: '#FCD5B5',
    primaryColor: '#EF4444',
    secondaryColor: '#1E293B',
    accentColor: '#F8FAFC',
    cheekColor: '#FCA5A5',
    hatStyle: 'visor',
    headShape: 'angular',
    defaultOutfit: 'beach_jersey',
    defaultFace: 'fierce_pro',
    speed: 4,
    floatiness: 2,
    power: 4,
    reach: 2,
    tagline: 'Explosive court sprinter with a sculpted athletic jawline & blazing serve!',
    superMoveName: 'Meteor Flame Drive',
  },
  {
    id: 'pirate_capt',
    name: 'FINN',
    title: 'Pirate Captain',
    rarity: 'Epic',
    level: 11,
    skinTone: '#FBBF94',
    primaryColor: '#DC2626',
    secondaryColor: '#0F172A',
    accentColor: '#FACC15',
    cheekColor: '#F87171',
    hatStyle: 'pirate',
    headShape: 'round',
    defaultOutfit: 'pirate_coat',
    defaultFace: 'cheeky_wink',
    speed: 3,
    floatiness: 2,
    power: 4,
    reach: 3,
    tagline: 'Swashbuckling cove captain with a bold tricorn hat & cannonball serve!',
    superMoveName: 'Cannonball Barrage',
  },
  {
    id: 'blue_sporty',
    name: 'VOLT',
    title: 'Headband Pro',
    rarity: 'Common',
    level: 12,
    skinTone: '#FFDFC4',
    primaryColor: '#2563EB',
    secondaryColor: '#0F172A',
    accentColor: '#F8FAFC',
    cheekColor: '#FB7185',
    hatStyle: 'headband',
    headShape: 'angular',
    defaultOutfit: 'cyber_jacket',
    defaultFace: 'happy_laugh',
    speed: 4,
    floatiness: 3,
    power: 3,
    reach: 3,
    tagline: 'High-flying court captain with a crisp white athletic headband!',
    superMoveName: 'Sky Bolt Smash',
  },
  {
    id: 'pink_visor',
    name: 'MOCHI',
    title: 'Bear Hoodie',
    rarity: 'Epic',
    level: 8,
    skinTone: '#FFE4E6',
    primaryColor: '#EC4899',
    secondaryColor: '#4C1D95',
    accentColor: '#FDE047',
    cheekColor: '#FB7185',
    hatStyle: 'crown',
    headShape: 'mochi',
    defaultOutfit: 'king_royal',
    defaultFace: 'star_eyes',
    speed: 4,
    floatiness: 4,
    power: 2,
    reach: 3,
    tagline: 'Bouncy pink bear-hoodie star with extra-squishy marshmallow cheeks!',
    superMoveName: 'Starlight Curve Shot',
  },
  {
    id: 'astro_bean',
    name: 'NOVA',
    title: 'Space Cadet',
    rarity: 'Legendary',
    level: 14,
    skinTone: '#FFE4C8',
    primaryColor: '#38BDF8',
    secondaryColor: '#0F172A',
    accentColor: '#FACC15',
    cheekColor: '#FB7185',
    hatStyle: 'astronaut',
    headShape: 'round',
    defaultOutfit: 'astro_suit',
    defaultFace: 'happy_laugh',
    speed: 3,
    floatiness: 4,
    power: 3,
    reach: 4,
    tagline: 'Zero-gravity cosmic captain with a sleek starlight visor cap & orbital hangtime!',
    superMoveName: 'Supernova Slam',
  },
];

/**
 * 5 Difficulty Tiers Across All Modes (Easy, Medium, Hard, Extreme, Nightmare)
 */
export const DIFFICULTY_LEVELS: DifficultyConfig[] = [
  {
    id: 'chill',
    label: 'Easy',
    shortLabel: 'Easy',
    badgeColor: '#4ADE80',
    rushSpeedMult: 0.78,
    rushTimeLimitSec: 300,
    rushMaxFalls: 0,
    bridgeShakeSec: 0.65,
    description: 'Relaxed AI aim & fire-rate, 4P Solo Free-For-All',
  },
  {
    id: 'breezy',
    label: 'Medium',
    shortLabel: 'Med',
    badgeColor: '#38BDF8',
    rushSpeedMult: 1.0,
    rushTimeLimitSec: 300,
    rushMaxFalls: 0,
    bridgeShakeSec: 0.45,
    description: 'Balanced 4-Player Solo Gun Fight · 3, 5, or 6 Min Timer',
  },
  {
    id: 'spicy',
    label: 'Hard',
    shortLabel: 'Hard',
    badgeColor: '#FACC15',
    rushSpeedMult: 1.2,
    rushTimeLimitSec: 300,
    rushMaxFalls: 0,
    bridgeShakeSec: 0.32,
    description: 'Active AI rivals, tactical cover & fun knockback physics',
  },
  {
    id: 'extreme',
    label: 'Extreme',
    shortLabel: 'Extrm',
    badgeColor: '#F97316',
    rushSpeedMult: 1.38,
    rushTimeLimitSec: 300,
    rushMaxFalls: 0,
    bridgeShakeSec: 0.22,
    description: 'Fast AI reflexes, elevated rampart control & intense duels',
  },
  {
    id: 'nightmare',
    label: 'Nightmare',
    shortLabel: 'Night',
    badgeColor: '#F43F5E',
    rushSpeedMult: 1.55,
    rushTimeLimitSec: 300,
    rushMaxFalls: 0,
    bridgeShakeSec: 0.15,
    description: 'Deadeye AI sharpshooters & non-stop Solo Arena chaos!',
  },
];

/**
 * 2 Flagship Gun Fight Arena Maps:
 * 1. Blaster Battle Grand Fort (Coastal Island Citadel)
 * 2. Jungle Run Mayan Temple (Mayan Pyramid Temple, Twin Waterfalls & Lush Jungle Court)
 */
export const OBSTACLE_RUSH_MAPS: ObstacleRushMapConfig[] = [
  {
    id: 'sky_carnival',
    name: 'Blaster Battle Grand Fort',
    subtitle:
      'Coastal Island Grand Fort! 4-Player Solo Free-For-All with North Castle Citadel, West & East Stone Forts, Lighthouse Cove, Walkable Cargo Containers & Multi-Weapon Pickups!',
    badgeText: '4P GRAND FORT',
    environmentTag: '4P Solo · 3m / 5m / 6m',
    accentHex: '#FACC15',
    skyTop: '#1D4ED8',
    skyHorizon: '#93C5FD',
    abyssColor: '#38BDF8',
    deckPrimary: '#38BDF8',
    deckSecondary: '#10B981',
    railColor: '#3B82F6',
    hammerColor: '#DC2626',
    hammerAccent: '#FACC15',
    iceColor: '#38BDF8',
    bridgeColor: '#A16207',
    parTimeSec: 180,
    hazardsSummary: [
      'Coastal Castle Citadel & Lighthouse Cove',
      'West & East Stone Bastions + Ramps',
      'Walkable Cargo Containers & Cover Walls',
      'Shotgun, Fire Blaster & Random Medkits',
    ],
  },
  {
    id: 'lava_foundry',
    name: 'Jungle Run Mayan Temple',
    subtitle:
      'Lush Tropical Jungle Run Arena! Battle around the Ancient Stepped Mayan Pyramid Temple, Twin Cascading Jungle Waterfalls, Mossy Stone Bastions, Coconut Palms & Emerald Court!',
    badgeText: '4P JUNGLE RUN',
    environmentTag: '4P Solo · Jungle Vibe',
    accentHex: '#10B981',
    skyTop: '#0284C7',
    skyHorizon: '#A7F3D0',
    abyssColor: '#0D9488',
    deckPrimary: '#22C55E',
    deckSecondary: '#15803D',
    railColor: '#D97706',
    hammerColor: '#16A34A',
    hammerAccent: '#FACC15',
    iceColor: '#2DD4BF',
    bridgeColor: '#78350F',
    parTimeSec: 180,
    hazardsSummary: [
      'Stepped Mayan Pyramid & Golden Braziers',
      'Twin Jungle Waterfalls & Turquoise Lagoon',
      'Mossy Temple Bastions & Expedition Crates',
      'Shotgun, Fire Blaster & Random Medkits',
    ],
  },
];

export const FLOOR_IS_LAVA_MAPS: FloorIsLavaMapConfig[] = [
  {
    id: 'volcano_summit',
    name: 'Sunlit Cove Nuke',
    subtitle:
      '4-Player Free-For-All Stadium Nuke! 2 Dodgeballs in every round, 160 HP (3–4 Ball Hits to Eliminate), 3 Elimination Rounds — grab, dodge & knock out all rivals!',
    badgeText: '4P NUKE · 2 BALLS',
    environmentTag: '4P Solo · 3 Rounds · 2 Balls',
    accentHex: '#38BDF8',
    skyTop: '#0284C7',
    skyHorizon: '#BAE6FD',
    lavaColor: '#0284C7',
    lavaGlow: '#38BDF8',
  },
  {
    id: 'hex_colosseum',
    name: 'Jungle Temple Nuke',
    subtitle:
      '4-Player Emerald Mayan Temple Nuke! Battle across the jungle stadium with 2 Super Dodgeballs, 160 HP (3–4 Hits to KO), and 3 Elimination Rounds!',
    badgeText: '4P NUKE · 2 BALLS',
    environmentTag: '4P Solo · Jungle Court',
    accentHex: '#22C55E',
    skyTop: '#0369A1',
    skyHorizon: '#A7F3D0',
    lavaColor: '#0D9488',
    lavaGlow: '#4ADE80',
  },
];

/**
 * 6 Game Modes in Panel 3 ("MODES") — Includes Gun Fight, Nuke, Custom Multiplayer, and Volleyball Modes!
 */
export const SUB_GAMES_LIST: SubGameInfo[] = [
  {
    id: 'obstacle_rush',
    title: 'Gun Fight',
    tabLabel: 'Gun Fight',
    subtitle:
      'Solo & Custom Multiplayer (up to 5 Players) in Blaster Battle Grand Fort or Jungle Run Mayan Temple! Choose 3, 5, or 6 Min timer — highest kills wins!',
    badge: 'SOLO / 5P CUSTOM',
    accentHex: '#FACC15',
    cardGradient: 'from-amber-400 via-orange-500 to-red-500',
    playersTag: '4P Solo · 5P Custom',
    defaultTheme: 'sky_island',
    modeThemes: ['sky_island', 'space_station'],
  },
  {
    id: 'floor_is_lava',
    title: 'Nuke',
    tabLabel: 'Nuke',
    subtitle:
      '2-Ball Nuke Showdown! 160 HP (3–4 Hits to Eliminate) across 3 Elimination Rounds — grab or catch either dodgeball and knock out every rival!',
    badge: '4P NUKE · 2 BALLS',
    accentHex: '#EF4444',
    cardGradient: 'from-rose-400 via-red-500 to-orange-500',
    playersTag: '4P · 3 Rounds · 2 Balls',
    defaultTheme: 'sky_island',
    modeThemes: ['sky_island', 'space_station'],
  },
  {
    id: 'duo_2v2',
    title: 'Casual',
    tabLabel: 'Casual',
    subtitle: 'Classic 1v1 or 2v2 beach volleyball match — first to reach target points wins!',
    badge: 'CASUAL MODE',
    accentHex: '#FACC15',
    cardGradient: 'from-amber-300 via-yellow-400 to-amber-500',
    playersTag: '1v1 or 2v2',
    defaultTheme: 'pirate_cove',
    modeThemes: ['pirate_cove', 'sky_island', 'space_station', 'cozy_beach', 'toy_park', 'glacier_fort'],
  },
  {
    id: 'survival',
    title: 'Elimination',
    tabLabel: 'Elimination',
    subtitle: 'High-stakes 1v1 knockout duel — score target points without losing a single point!',
    badge: 'ELIMINATION MODE',
    accentHex: '#F43F5E',
    cardGradient: 'from-rose-400 via-red-500 to-rose-600',
    playersTag: '1v1 Solo Duel',
    defaultTheme: 'space_station',
    modeThemes: ['space_station', 'sky_island', 'glacier_fort', 'pirate_cove', 'toy_park', 'cozy_beach'],
  },
  {
    id: 'hoop_volley',
    title: 'Team Play',
    tabLabel: 'Team Play',
    subtitle: 'Coordinated 2v2 team rallies with fast partner sets and power spikes!',
    badge: 'TEAM MODE',
    accentHex: '#38BDF8',
    cardGradient: 'from-sky-400 via-blue-500 to-indigo-600',
    playersTag: '2v2 Team Match',
    defaultTheme: 'sky_island',
    modeThemes: ['sky_island', 'space_station', 'pirate_cove', 'toy_park', 'glacier_fort', 'cozy_beach'],
  },
];

/**
 * 6 Curated 3D World Maps for "Select a Map" (Lava Bounce Removed!)
 * (1: Sky Islands, 2: Jungle Run, 3: Portrait Court, 4: Candy Chaos, 5: Ice Break, 6: Cozy Beach)
 */
export const COURT_THEMES: CourtTheme[] = [
  {
    id: 'sky_island',
    name: 'Sky Islands',
    subtitle: 'Celestial floating sanctuary above a golden-lit cloud sea with sky temples, waterfalls, rainbow arch & airships!',
    badgeText: 'SKY ISLANDS',
    playersTag: '2-4 Players',
    skyTop: '#1D4ED8',
    skyHorizon: '#BAE6FD',
    waterColor: '#38BDF8',
    groundColor: '#22C55E',
    courtInnerColor: '#38BDF8',
    lineColor: '#FFFFFF',
    netColor: '#FFFFFF',
    postColor: '#F59E0B',
    sunColor: '#FFFFFF',
    hemisphereSky: '#EFF6FF',
    hemisphereGround: '#93C5FD',
    islandCliffColor: '#D97706',
    foliagePrimary: '#22C55E',
    foliageSecondary: '#4ADE80',
    hasWaterPlane: true,
  },
  {
    id: 'space_station',
    name: 'Jungle Run',
    subtitle: 'Ancient Mayan temple pyramid with twin jungle waterfalls, mossy cliffs & palms!',
    badgeText: 'JUNGLE RUN',
    playersTag: '2-4 Players',
    skyTop: '#0284C7',
    skyHorizon: '#A7F3D0',
    waterColor: '#0D9488',
    groundColor: '#22C55E',
    courtInnerColor: '#4ADE80',
    lineColor: '#FFFFFF',
    netColor: '#FFFFFF',
    postColor: '#D97706',
    sunColor: '#FFFFFF',
    hemisphereSky: '#DCFCE7',
    hemisphereGround: '#15803D',
    islandCliffColor: '#57534E',
    foliagePrimary: '#16A34A',
    foliageSecondary: '#4ADE80',
    hasWaterPlane: true,
  },
  {
    id: 'pirate_cove',
    name: 'Portrait Court',
    subtitle: 'Sunny tropical island cove with striped lighthouse, coconut palms, pier & sky blimp!',
    badgeText: 'PORTRAIT COURT',
    playersTag: '2-4 Players',
    skyTop: '#0284C7',
    skyHorizon: '#7DD3FC',
    waterColor: '#0284C7',
    groundColor: '#4ADE80',
    courtInnerColor: '#38BDF8',
    lineColor: '#FFFFFF',
    netColor: '#FFFFFF',
    postColor: '#EF4444',
    sunColor: '#FFFFFF',
    hemisphereSky: '#E0F2FE',
    hemisphereGround: '#38BDF8',
    islandCliffColor: '#FDE047',
    foliagePrimary: '#22C55E',
    foliageSecondary: '#16A34A',
    hasWaterPlane: true,
  },
  {
    id: 'toy_park',
    name: 'Candy Chaos',
    subtitle: 'Sweet sugar kingdom with pastel rainbow, candy castle, lollipops & frosted donuts!',
    badgeText: 'CANDY CHAOS',
    playersTag: '2-4 Players',
    skyTop: '#38BDF8',
    skyHorizon: '#FCE7F3',
    waterColor: '#F472B6',
    groundColor: '#F9A8D4',
    courtInnerColor: '#F472B6',
    lineColor: '#FFFFFF',
    netColor: '#FFFFFF',
    postColor: '#EC4899',
    sunColor: '#FFFFFF',
    hemisphereSky: '#FDF2F8',
    hemisphereGround: '#F9A8D4',
    islandCliffColor: '#F59E0B',
    foliagePrimary: '#F472B6',
    foliageSecondary: '#C084FC',
    hasWaterPlane: true,
  },
  {
    id: 'glacier_fort',
    name: 'Ice Break',
    subtitle: 'Frozen arctic glacier with crystal icebergs, snow-capped pines, igloo & snowman!',
    badgeText: 'ICE BREAK',
    playersTag: '2-4 Players',
    skyTop: '#1D4ED8',
    skyHorizon: '#BAE6FD',
    waterColor: '#0284C7',
    groundColor: '#F0F9FF',
    courtInnerColor: '#7DD3FC',
    lineColor: '#FFFFFF',
    netColor: '#FFFFFF',
    postColor: '#0284C7',
    sunColor: '#FFFFFF',
    hemisphereSky: '#F0F9FF',
    hemisphereGround: '#38BDF8',
    islandCliffColor: '#38BDF8',
    foliagePrimary: '#0D9488',
    foliageSecondary: '#F8FAFC',
    hasWaterPlane: true,
  },
  {
    id: 'cozy_beach',
    name: 'Cozy Beach',
    subtitle: 'Warm golden sandy beach island with coconut palms, striped umbrellas & sandcastles!',
    badgeText: 'COZY BEACH',
    playersTag: '2-4 Players',
    skyTop: '#0284C7',
    skyHorizon: '#BAE6FD',
    waterColor: '#0EA5E9',
    groundColor: '#FDE68A',
    courtInnerColor: '#FEF08A',
    lineColor: '#FFFFFF',
    netColor: '#FFFBEB',
    postColor: '#F43F5E',
    sunColor: '#FFFBEB',
    hemisphereSky: '#E0F2FE',
    hemisphereGround: '#FDE68A',
    islandCliffColor: '#F59E0B',
    foliagePrimary: '#10B981',
    foliageSecondary: '#34D399',
    hasWaterPlane: true,
  },
];

export const WORLD_TOUR_LEVELS: TourLevelConfig[] = [
  {
    level: 1,
    title: 'Portrait Court Opener',
    subtitle: '2v2 Beach Volley by the Lighthouse!',
    opponentId: 'pirate_capt',
    opponentPartnerId: 'red_cap',
    partnerId: 'blue_sporty',
    format: '2v2',
    subGame: 'duo_2v2',
    themeId: 'pirate_cove',
    difficulty: 'chill',
    winScore: 5,
    modifier: 'none',
    modifierLabel: 'Standard Rules',
    nodeX: 16,
    nodeY: 66,
  },
  {
    level: 2,
    title: 'Sky Islands Breeze',
    subtitle: 'High-altitude floating island match!',
    opponentId: 'purple_shades',
    opponentPartnerId: 'pink_visor',
    partnerId: 'blue_sporty',
    format: '2v2',
    subGame: 'hoop_volley',
    themeId: 'sky_island',
    difficulty: 'breezy',
    winScore: 7,
    modifier: 'low_gravity',
    modifierLabel: 'Feather Gravity',
    nodeX: 50,
    nodeY: 45,
  },
  {
    level: 3,
    title: 'Candy Chaos Finals',
    subtitle: 'Championship finale against King Bananzo!',
    opponentId: 'gold_king',
    opponentPartnerId: 'astro_bean',
    partnerId: 'blue_sporty',
    format: '2v2',
    subGame: 'duo_2v2',
    themeId: 'toy_park',
    difficulty: 'spicy',
    winScore: 7,
    modifier: 'turbo',
    modifierLabel: 'Championship Speed',
    nodeX: 82,
    nodeY: 32,
  },
];
