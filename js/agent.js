// ============================================================
//  Campus Companion XR — AI Companion Agent
//  Uses Zhipu GLM API (OpenAI-compatible interface).
//  Maintains per-session chat history and switches persona
//  context when the user enters a different zone.
// ============================================================

const Agent = (() => {

  // ── State ────────────────────────────────────────────────
  let apiKey = '';
  let currentZoneId = 'chat';
  let history = [];       // { role: 'user'|'assistant', content: string }[]
  const MAX_HISTORY = 20; // keep last N turns to stay within context limit

  // ── Demo responses (fallback when no API key) ────────────
  const DEMO_RESPONSES = {
    chat: [
      "Hey, I'm here for you. 😊 Want to tell me more about how you're feeling?\n\n嘿，我在这里陪着你。能跟我说说你的感受吗？",
      "That sounds really tough. I totally get why you'd feel that way. You're not alone in this.\n\n听起来真的很难熬。你有这种感觉完全可以理解，你不是一个人在面对这些。",
      "It's okay to not have everything figured out. College is a lot! How about we just talk — no pressure.\n\n什么都没想清楚也没关系，大学本来就很复杂。我们就聊聊，不用有压力。",
    ],
    study: [
      "Sure! Let's break it down step by step. Which part is confusing you the most?\n\n当然！我们一步一步来分析。哪个部分让你最困惑？",
      "Great question. Here's how I'd approach it: start with the core concept, then work through examples.\n\n好问题！我会这样入手：先掌握核心概念，再通过例题来巩固。",
      "Exam prep can feel overwhelming, but a structured study plan makes a huge difference. Want help making one?\n\n备考感觉很压迫，但有条理的计划真的很管用。要不要一起制定一个？",
    ],
    leisure: [
      "Oh, that book/film sounds so good! I've been meaning to check it out. What did you think?\n\n哦，那本书/那部电影听起来好棒！我一直想看。你觉得怎么样？",
      "Honestly, my current obsession is finding cozy café playlists and reading. Very campus-core. 😄\n\n说真的，我最近的最爱是找咖啡馆风格的歌单然后看书，超级校园风。😄",
      "We should totally make a watch list together! What genre are you into lately?\n\n我们应该一起搞一个观影清单！你最近喜欢什么类型？",
    ],
    healing: [
      "Let's take a slow breath together. In for 4 counts… hold for 4… out for 6. 🌿 How do you feel?\n\n我们一起慢慢呼吸吧。吸气4拍……屏住4拍……呼气6拍。🌿 感觉怎么样？",
      "Calligraphy is such a beautiful way to quiet the mind. Even just tracing strokes can be meditative.\n\n书法真的是平静内心的好方式。哪怕只是慢慢描字，也很有冥想的感觉。",
      "Rest is productive. You don't have to earn relaxation. 🍃\n\n休息本身就是一种生产力。放松不需要被任何东西换取。🍃",
    ],
    games: [
      "Let's play! 🎮 I warn you though — I've got beginner's luck on my side today. 😄\n\n开始吧！🎮 不过我要提醒你——今天我手气不错哦。😄",
      "Good move! But I think I see a better strategy brewing… your turn!\n\n好棋！不过我感觉有个更好的策略即将浮现……轮到你了！",
      "Games are a great way to recharge. Even 10 minutes can reset your brain. Ready for another round?\n\n游戏真的很适合充电。哪怕10分钟也能让大脑重启。再来一局？",
    ],
  };

  function getDemoResponse(zoneId) {
    const pool = DEMO_RESPONSES[zoneId] || DEMO_RESPONSES.chat;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // ── Zone switching ───────────────────────────────────────
  function setZone(zoneId) {
    if (currentZoneId === zoneId) return;
    currentZoneId = zoneId;
    // Clear history so the new zone context is clean
    history = [];
  }

  // ── Send a message ───────────────────────────────────────
  async function chat(userMessage) {
    if (!apiKey) {
      // Demo mode: simulate a small delay then return canned response
      await sleep(800 + Math.random() * 600);
      return getDemoResponse(currentZoneId);
    }

    // Find system prompt for current zone
    const zone = ZONES.find(z => z.id === currentZoneId);
    const systemPrompt = zone ? zone.systemPrompt : ZONES[0].systemPrompt;

    // Build messages array
    history.push({ role: 'user', content: userMessage });
    // Trim history
    if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
    ];

    try {
      const response = await fetch(CONFIG.ZHIPU_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: CONFIG.ZHIPU_MODEL,
          messages,
          temperature: 0.85,
          max_tokens: 300,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Zhipu API ${response.status}: ${errText}`);
      }

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || '…';
      history.push({ role: 'assistant', content: reply });
      return reply;

    } catch (err) {
      console.error('[Agent] API error:', err);
      history.pop(); // remove the failed user turn
      throw err;
    }
  }

  // ── Public API ───────────────────────────────────────────
  function setApiKey(key) {
    apiKey = key.trim();
    CONFIG.ZHIPU_API_KEY = apiKey;
  }

  function getApiKey() { return apiKey; }

  function clearHistory() { history = []; }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  return { chat, setZone, setApiKey, getApiKey, clearHistory };
})();
