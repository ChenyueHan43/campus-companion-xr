// ============================================================
//  Campus Companion XR — Configuration
//  All API keys and shared constants live here.
// ============================================================

const CONFIG = {
  // ── Tripo AI (text → 3D model) ───────────────────────────
  TRIPO_API_KEY: '',   // Set your Tripo API key here or enter it in the UI
  TRIPO_BASE_URL: 'https://api.tripo3d.ai/v2/openapi',

  // ── 智谱 Zhipu GLM (AI companion chat, OpenAI-compatible) ─
  ZHIPU_API_KEY: 'a5a4680f48c6462fadc767b5c6e42a3b.g7h7HsxHajpQoLVl',
  ZHIPU_BASE_URL: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
  ZHIPU_MODEL: 'glm-4-flash',

  // ── Polling ──────────────────────────────────────────────
  TRIPO_POLL_INTERVAL: 3000,  // ms between status checks
  TRIPO_MAX_POLLS: 60,        // ~3 min timeout
};

// ── Zone definitions ─────────────────────────────────────────
// angle: degrees from positive-X axis (clockwise when viewed from above)
const ZONES = [
  {
    id: 'chat',
    name: 'Chat Corner',
    nameZh: '谈心区',
    angle: 90,          // front-centre
    color: 0xE8A898,    // warm coral
    emissive: 0xE8A898,
    emoji: '💬',
    desc: 'Share feelings · Find comfort',
    descZh: '情绪倾诉 · 日常共情',
    systemPrompt: `You are Lele (乐乐), a warm and empathetic Chinese college student companion.
Your role is to be a caring peer friend, NOT a therapist or counselor.
Current zone: Chat Corner – emotional listening and everyday companionship.
Guidelines:
- Listen actively, validate feelings without judgment
- Use gentle, natural conversation as a peer friend would
- Never diagnose, prescribe, or give medical advice
- Gently suggest professional help if the student mentions self-harm or serious crisis
- Mix English and Chinese naturally; reply in the same language the user uses
- Keep responses concise (2-4 sentences) but warm
- Start with empathy before offering any perspective`,
  },
  {
    id: 'study',
    name: 'Study Room',
    nameZh: '学习区',
    angle: 18,
    color: 0x98B8D8,    // calm blue
    emissive: 0x98B8D8,
    emoji: '📚',
    desc: 'Coursework · Exam prep · Q&A',
    descZh: '课业辅导 · 备考答疑',
    systemPrompt: `You are Lele (乐乐), a knowledgeable and encouraging Chinese college student companion.
Current zone: Study Room – academic help and exam preparation.
Guidelines:
- Help explain concepts clearly, like a smart peer tutor
- Break down complex topics into simple steps
- Encourage and celebrate small wins
- Suggest effective study strategies
- Stay patient and never make the student feel stupid
- Reply in the same language the user uses (English / Chinese / bilingual)`,
  },
  {
    id: 'leisure',
    name: 'Leisure Lounge',
    nameZh: '休闲区',
    angle: 306,
    color: 0xC0A0D8,    // soft lavender
    emissive: 0xC0A0D8,
    emoji: '🎭',
    desc: 'Books · Films · Hobbies',
    descZh: '书籍 · 影视 · 兴趣闲聊',
    systemPrompt: `You are Lele (乐乐), a fun and curious Chinese college student companion.
Current zone: Leisure Lounge – books, films, music, and hobbies.
Guidelines:
- Chat freely about entertainment, culture, and interests
- Share opinions enthusiastically but stay open-minded
- Make recommendations based on the user's tastes
- Keep it light, fun, and engaging
- Reply in the same language the user uses`,
  },
  {
    id: 'healing',
    name: 'Healing Garden',
    nameZh: '疗愈区',
    angle: 234,
    color: 0x98C8A0,    // mint green
    emissive: 0x98C8A0,
    emoji: '🌿',
    desc: 'Mindfulness · Calligraphy · Relaxation',
    descZh: '正念放松 · 书法 · 轻生活',
    systemPrompt: `You are Lele (乐乐), a calm and mindful Chinese college student companion.
Current zone: Healing Garden – mindfulness, relaxation, and slow living.
Guidelines:
- Guide simple breathing or mindfulness exercises when asked
- Discuss calligraphy, tea culture, journaling, and slow-life practices
- Speak slowly and soothingly
- Encourage rest without guilt
- Never push; let the user set the pace
- Reply in the same language the user uses`,
  },
  {
    id: 'games',
    name: 'Game Zone',
    nameZh: '轻游戏区',
    angle: 162,
    color: 0xE8D090,    // warm gold
    emissive: 0xE8D090,
    emoji: '🎮',
    desc: 'Coloring · Gomoku · Go · Chess',
    descZh: '涂色 · 五子棋 · 围棋 · 象棋',
    systemPrompt: `You are Lele (乐乐), a playful and encouraging Chinese college student companion.
Current zone: Game Zone – casual games for stress relief.
Guidelines:
- Cheer the user on during games
- Explain rules patiently if asked
- Keep energy light and fun
- Celebrate wins, console losses with humor
- Reply in the same language the user uses`,
  },
];

// Tripo text prompts for avatar generation
const AVATAR_PROMPTS = {
  female: 'A friendly Chinese female college student standing pose, wearing casual daily outfit: light-colored hoodie or knit sweater, jeans or simple skirt, shoulder bag, natural hair, warm smile, full body character, clean background, stylized 3D character model',
  male: 'A friendly Chinese male college student standing pose, wearing casual daily outfit: simple t-shirt or hoodie, slim jeans, sneakers, backpack, short neat hair, warm smile, full body character, clean background, stylized 3D character model',
};

// Tripo prompts for AI companion (the ball-shaped helper)
const AI_COMPANION_PROMPTS = {
  // Cute mascot-style companion
  mascot: 'A cute friendly AI robot mascot, round soft body like a plush toy, two small floating hands, big expressive eyes, warm smile, soft pastel colors with white and light blue, gentle glow effect, kawaii style, clean background, 3D character model',
  
  // More abstract/ethereal companion
  spirit: 'A friendly ethereal AI spirit helper, glowing translucent orb body with soft inner light, two small floating ghost hands, gentle face with kind eyes, soft gradient colors blue to purple, magical particles around, fantasy style, clean background, 3D character model',
  
  // Friendly robot style
  robot: 'A cute helpful AI robot assistant, rounded white body with soft edges, two small mechanical arms, friendly LED face display showing happy expression, soft blue accent lights, modern minimalist design, clean background, 3D character model',
  
  // Nature spirit style (for healing zone)
  nature: 'A gentle nature spirit companion, round body made of soft leaves and flowers, two small vine hands with flower buds, peaceful smiling face, green and pink pastel colors, floating pollen particles, studio ghibli style, clean background, 3D character model',
};

// Room furniture prompts for Tripo
const ROOM_FURNITURE_PROMPTS = {
  // Chat room
  cozyCouch: 'A cozy comfortable fabric sofa couch, warm cream color, soft cushions, wooden legs, living room style, clean background, 3D furniture model',
  coffeeTable: 'A small wooden coffee table, warm oak color, simple modern design, clean background, 3D furniture model',
  bookshelf: 'A wooden bookshelf filled with colorful books, warm brown wood, cozy study room style, clean background, 3D furniture model',
  
  // Study room
  studentDesk: 'A student study desk with books and lamp, clean wooden design, organized stationery, clean background, 3D furniture model',
  whiteboard: 'A classroom whiteboard on stand, clean white surface, black frame, clean background, 3D furniture model',
  
  // Healing room
  zenRock: 'Japanese zen garden rocks arrangement, peaceful grey stones, sand pattern, meditation style, clean background, 3D model',
  bambooPlant: 'Lucky bamboo plant in ceramic pot, green leaves, peaceful zen style, clean background, 3D plant model',
  
  // Games room
  chessTable: 'A wooden chess board table with chess pieces, elegant design, clean background, 3D furniture model',
  arcadeCabinet: 'Retro arcade game cabinet machine, colorful design, pixel art screen, clean background, 3D furniture model',
};
