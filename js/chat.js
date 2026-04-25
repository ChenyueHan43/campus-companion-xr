// ============================================================
//  Campus Companion XR — Chat UI
//  Manages the floating chat panel: message rendering,
//  user input, send button, typing indicator, mode display.
// ============================================================

const Chat = (() => {

  let panelEl, messagesEl, inputEl, sendEl, modeEl, closeEl;
  let avatarIconEl;
  let onSend = null;   // callback(message: string) => Promise<string>
  let isOpen = false;
  let pendingGender = 'female';

  // ── Init ─────────────────────────────────────────────────
  function init(opts = {}) {
    panelEl     = document.getElementById('chat-panel');
    messagesEl  = document.getElementById('chat-messages');
    inputEl     = document.getElementById('chat-input');
    sendEl      = document.getElementById('chat-send');
    modeEl      = document.getElementById('chat-mode');
    closeEl     = document.getElementById('chat-close');
    avatarIconEl = document.getElementById('companion-avatar-icon');

    onSend = opts.onSend || null;

    sendEl.addEventListener('click', handleSend);
    inputEl.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    });
    closeEl.addEventListener('click', close);
  }

  // ── Open / close ─────────────────────────────────────────
  function open(zone) {
    panelEl.classList.remove('hidden');
    panelEl.classList.add('visible');
    isOpen = true;
    if (zone) setZone(zone);
    // Greet on first open
    if (messagesEl.children.length === 0) {
      setTimeout(() => greet(zone), 400);
    }
  }

  function close() {
    panelEl.classList.remove('visible');
    panelEl.classList.add('hidden');
    isOpen = false;
  }

  function toggle(zone) {
    isOpen ? close() : open(zone);
  }

  // ── Zone context ─────────────────────────────────────────
  function setZone(zone) {
    if (!zone) return;
    if (modeEl) modeEl.textContent = `${zone.emoji} ${zone.name}  ${zone.nameZh}`;
  }

  function setGender(gender) {
    pendingGender = gender;
    if (avatarIconEl) avatarIconEl.textContent = gender === 'female' ? '👩‍🎓' : '👨‍🎓';
  }

  // ── Greet ────────────────────────────────────────────────
  function greet(zone) {
    const greetings = {
      chat:    ["Hey! I'm Lele 👋 I'm here to listen — no judgment, just vibes. How are you doing today?\n\n嗨！我是乐乐 👋 我在这里陪你聊聊，没有评判，就是轻松地说说话。你今天怎么样？"],
      study:   ["Hey! Ready to tackle some studying? Tell me what you're working on!\n\n嗨！准备好学习了吗？跟我说说你在做什么课题！"],
      leisure: ["Hey! 🎭 Let's chill. Any good books or shows you've been into lately?\n\n嗨！🎭 放松一下嘛。最近有没有什么好书或好剧？"],
      healing: ["Welcome 🌿 Take a slow breath. This is your quiet corner. What do you need today?\n\n欢迎 🌿 慢慢呼吸。这是你的宁静角落。你今天需要什么？"],
      games:   ["Game time! 🎮 Choose a game above and let's have some fun!\n\n游戏时间！🎮 选个游戏，放松一下！"],
    };
    const pool = zone ? (greetings[zone.id] || greetings.chat) : greetings.chat;
    addBubble(pool[0], 'assistant');
  }

  // ── Send message ─────────────────────────────────────────
  async function handleSend() {
    const text = inputEl.value.trim();
    if (!text) return;
    inputEl.value = '';
    addBubble(text, 'user');

    const typingEl = addTyping();
    try {
      if (onSend) {
        const reply = await onSend(text);
        typingEl.remove();
        addBubble(reply, 'assistant');
      } else {
        typingEl.remove();
        addBubble('(Chat feature requires an API key / 需要API密钥才能使用聊天功能)', 'assistant');
      }
    } catch (err) {
      typingEl.remove();
      addBubble(`Sorry, something went wrong 😅 — ${err.message}\n\n抱歉，出现了问题。`, 'assistant');
    }
  }

  // ── Bubble rendering ─────────────────────────────────────
  function addBubble(text, role) {
    const wrap = document.createElement('div');
    wrap.className = `bubble-wrap ${role}`;

    if (role === 'assistant') {
      const icon = document.createElement('div');
      icon.className = 'bubble-icon';
      icon.textContent = pendingGender === 'female' ? '👩‍🎓' : '👨‍🎓';
      wrap.appendChild(icon);
    }

    const bubble = document.createElement('div');
    bubble.className = `bubble ${role}`;
    bubble.textContent = text;
    wrap.appendChild(bubble);

    messagesEl.appendChild(wrap);
    // Animate in
    requestAnimationFrame(() => bubble.classList.add('show'));
    scrollBottom();
    return wrap;
  }

  function addTyping() {
    const wrap = document.createElement('div');
    wrap.className = 'bubble-wrap assistant';
    const icon = document.createElement('div');
    icon.className = 'bubble-icon';
    icon.textContent = pendingGender === 'female' ? '👩‍🎓' : '👨‍🎓';
    wrap.appendChild(icon);
    const bubble = document.createElement('div');
    bubble.className = 'bubble assistant typing';
    bubble.innerHTML = '<span></span><span></span><span></span>';
    wrap.appendChild(bubble);
    messagesEl.appendChild(wrap);
    scrollBottom();
    return wrap;
  }

  function scrollBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // ── System message ────────────────────────────────────────
  function systemMsg(text) {
    const el = document.createElement('div');
    el.className = 'system-msg';
    el.textContent = text;
    messagesEl.appendChild(el);
    scrollBottom();
  }

  return { init, open, close, toggle, setZone, setGender, addBubble, systemMsg, greet };
})();
