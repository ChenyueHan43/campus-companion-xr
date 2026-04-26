// ============================================================
//  VR Interactive Panels - Canvas-based 3D UI for VR rooms
//  Provides interactive game boards and chat panels in VR
// ============================================================

import * as THREE from 'three';

// ── Helpers ────────────────────────────────────────────────
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function makeCanvasMesh(w, h, cw, ch) {
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh._canvas = canvas;
  mesh._ctx = ctx;
  mesh._tex = tex;
  return mesh;
}

// ============================================================
//  VR Coloring Game Panel
// ============================================================
export class VRColoringGame {
  constructor(parent, options = {}) {
    this.parent = parent;
    this.position = options.position || new THREE.Vector3(0, 1.2, 0);
    this.width = options.width || 1.2;
    this.height = options.height || 1.2;
    this.onInteract = options.onInteract || (() => {});

    this.palette = [
      '#E8A898', '#F5D5A8', '#A8D8A8', '#A8C8E8',
      '#D8A8E8', '#E8D8A8', '#A8E8D8', '#E8C8A8',
      '#C8A8D8', '#98D898',
    ];
    this.selectedColor = this.palette[0];
    this.segments = [];
    
    this.group = new THREE.Group();
    this.group.position.copy(this.position);
    
    this.build();
    parent.add(this.group);
  }

  build() {
    const cw = 512, ch = 512;
    this.mesh = makeCanvasMesh(this.width, this.height, cw, ch);
    this.mesh.userData.isInteractive = true;
    this.mesh.userData.onPointerDown = (uv) => this.handleClick(uv);
    this.group.add(this.mesh);

    // Build segments for mandala
    this.segments = this._buildSegments(cw, ch);
    this.render();

    // Title
    const titleMesh = makeCanvasMesh(0.8, 0.15, 320, 60);
    const tctx = titleMesh._ctx;
    tctx.fillStyle = 'rgba(255,248,235,0.95)';
    rrect(tctx, 4, 4, 312, 52, 10);
    tctx.fill();
    tctx.fillStyle = '#4a3020';
    tctx.font = 'bold 24px Arial';
    tctx.textAlign = 'center';
    tctx.fillText('Mindful Coloring', 160, 38);
    titleMesh._tex.needsUpdate = true;
    titleMesh.position.set(0, this.height / 2 + 0.1, 0);
    this.group.add(titleMesh);
  }

  _buildSegments(W, H) {
    const segs = [];
    const CX = W / 2, CY = H / 2;
    const rings = [
      { count: 1, r1: 0, r2: 38, type: 'center' },
      { count: 12, r1: 38, r2: 90, type: 'petal' },
      { count: 8, r1: 90, r2: 140, type: 'ring' },
      { count: 16, r1: 140, r2: 185, type: 'petal' },
      { count: 12, r1: 185, r2: 215, type: 'ring' },
      { count: 24, r1: 215, r2: 0, type: 'outer', outerR: 220 },
    ];

    for (const ring of rings) {
      if (ring.type === 'center') {
        segs.push({
          type: 'circle',
          cx: CX,
          cy: CY,
          r: ring.r2,
          fill: null
        });
        continue;
      }
      const count = ring.count;
      for (let i = 0; i < count; i++) {
        const a0 = (i / count) * Math.PI * 2 - Math.PI / 2;
        const a1 = ((i + 1) / count) * Math.PI * 2 - Math.PI / 2;
        const r2 = ring.outerR || ring.r2;
        segs.push({
          type: 'arc',
          cx: CX,
          cy: CY,
          r1: ring.r1,
          r2: r2,
          a0: a0,
          a1: a1,
          fill: null
        });
      }
    }
    return segs;
  }

  handleClick(uv) {
    const cw = this.mesh._canvas.width;
    const ch = this.mesh._canvas.height;
    const mx = uv.x * cw;
    const my = (1 - uv.y) * ch;

    // Check palette
    const paletteY = ch - 50;
    if (my > paletteY) {
      const col = Math.floor(mx / (cw / this.palette.length));
      if (col >= 0 && col < this.palette.length) {
        this.selectedColor = this.palette[col];
        this.render();
        return;
      }
    }

    // Check segments
    const CX = cw / 2, CY = ch / 2;
    for (const seg of this.segments) {
      if (this._hitTest(seg, mx, my, CX, CY)) {
        seg.fill = this.selectedColor;
        this.render();
        this.onInteract('color', seg);
        return;
      }
    }
  }

  _hitTest(seg, mx, my, CX, CY) {
    const dx = mx - CX;
    const dy = my - CY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    if (seg.type === 'circle') {
      return dist <= seg.r;
    }
    if (seg.type === 'arc') {
      if (dist < seg.r1 || dist > seg.r2) return false;
      let a = angle;
      let a0 = seg.a0;
      let a1 = seg.a1;
      // Normalize angles
      while (a < a0) a += Math.PI * 2;
      while (a1 < a0) a1 += Math.PI * 2;
      return a >= a0 && a <= a1;
    }
    return false;
  }

  render() {
    const ctx = this.mesh._ctx;
    const cw = this.mesh._canvas.width;
    const ch = this.mesh._canvas.height;
    const CX = cw / 2, CY = ch / 2;

    ctx.clearRect(0, 0, cw, ch);

    // Background
    const grad = ctx.createRadialGradient(CX, CY, 0, CX, CY, CX);
    grad.addColorStop(0, '#fff8f0');
    grad.addColorStop(1, '#f0e8d8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cw, ch);

    // Draw segments
    for (const seg of this.segments) {
      ctx.save();
      ctx.beginPath();
      if (seg.type === 'circle') {
        ctx.arc(seg.cx, seg.cy, seg.r, 0, Math.PI * 2);
      } else {
        ctx.arc(CX, CY, seg.r2, seg.a0, seg.a1);
        ctx.arc(CX, CY, seg.r1, seg.a1, seg.a0, true);
        ctx.closePath();
      }
      ctx.fillStyle = seg.fill || '#f9f4ec';
      ctx.fill();
      ctx.strokeStyle = '#c8b898';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }

    // Palette bar
    const pH = 40, py = ch - pH - 8;
    ctx.fillStyle = 'rgba(255,248,235,0.9)';
    ctx.fillRect(0, py - 4, cw, pH + 12);
    this.palette.forEach((col, i) => {
      const bw = cw / this.palette.length;
      const bx = i * bw + 4;
      ctx.fillStyle = col;
      ctx.beginPath();
      rrect(ctx, bx, py + 2, bw - 8, pH - 6, 6);
      ctx.fill();
      if (col === this.selectedColor) {
        ctx.strokeStyle = '#4a3020';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    });

    this.mesh._tex.needsUpdate = true;
  }

  reset() {
    this.segments.forEach(s => s.fill = null);
    this.render();
  }

  dispose() {
    this.parent.remove(this.group);
  }
}

// ============================================================
//  VR Gomoku (Five in a Row) Game Panel
// ============================================================
export class VRGomokuGame {
  constructor(parent, options = {}) {
    this.parent = parent;
    this.position = options.position || new THREE.Vector3(0, 1.2, 0);
    this.width = options.width || 1.2;
    this.height = options.height || 1.2;
    this.onInteract = options.onInteract || (() => {});

    this.SIZE = 15;
    this.board = [];
    this.turn = 1; // 1 = player (black), 2 = AI (white)
    this.gameOver = false;
    this.winner = null;

    this.group = new THREE.Group();
    this.group.position.copy(this.position);

    this.build();
    parent.add(this.group);
  }

  build() {
    const cw = 512, ch = 512;
    this.mesh = makeCanvasMesh(this.width, this.height, cw, ch);
    this.mesh.userData.isInteractive = true;
    this.mesh.userData.onPointerDown = (uv) => this.handleClick(uv);
    this.group.add(this.mesh);

    this.reset();

    // Title
    const titleMesh = makeCanvasMesh(0.7, 0.15, 280, 60);
    const tctx = titleMesh._ctx;
    tctx.fillStyle = 'rgba(255,248,235,0.95)';
    rrect(tctx, 4, 4, 272, 52, 10);
    tctx.fill();
    tctx.fillStyle = '#4a3020';
    tctx.font = 'bold 24px Arial';
    tctx.textAlign = 'center';
    tctx.fillText('Gomoku', 140, 38);
    titleMesh._tex.needsUpdate = true;
    titleMesh.position.set(0, this.height / 2 + 0.1, 0);
    this.group.add(titleMesh);
  }

  reset() {
    this.board = Array.from({ length: this.SIZE }, () => Array(this.SIZE).fill(0));
    this.turn = 1;
    this.gameOver = false;
    this.winner = null;
    this.render();
  }

  handleClick(uv) {
    if (this.gameOver) {
      this.reset();
      return;
    }
    if (this.turn !== 1) return;

    const cw = this.mesh._canvas.width;
    const ch = this.mesh._canvas.height;
    const mx = uv.x * cw;
    const my = (1 - uv.y) * ch;

    const MARGIN = 24;
    const CELL = (cw - MARGIN * 2) / (this.SIZE - 1);

    const col = Math.round((mx - MARGIN) / CELL);
    const row = Math.round((my - MARGIN) / CELL);

    if (col < 0 || col >= this.SIZE || row < 0 || row >= this.SIZE) return;
    if (this.board[row][col] !== 0) return;

    this.board[row][col] = 1;
    this.render();

    if (this._checkWin(row, col, 1)) {
      this.gameOver = true;
      this.winner = 1;
      this.render();
      this.onInteract('win', { player: 1 });
      return;
    }

    this.turn = 2;
    setTimeout(() => this._aiMove(), 300);
  }

  _aiMove() {
    if (this.gameOver) return;

    let best = -1, br = -1, bc = -1;
    for (let r = 0; r < this.SIZE; r++) {
      for (let c = 0; c < this.SIZE; c++) {
        if (this.board[r][c] !== 0) continue;
        const s = this._scoreCell(r, c, 2) * 1.1 + this._scoreCell(r, c, 1);
        if (s > best) {
          best = s;
          br = r;
          bc = c;
        }
      }
    }

    if (br === -1) return;
    this.board[br][bc] = 2;
    this.render();

    if (this._checkWin(br, bc, 2)) {
      this.gameOver = true;
      this.winner = 2;
      this.render();
      this.onInteract('win', { player: 2 });
      return;
    }

    this.turn = 1;
    this.onInteract('turn', { turn: 1 });
  }

  _scoreCell(r, c, player) {
    const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
    let total = 0;
    this.board[r][c] = player;
    for (const [dr, dc] of dirs) {
      let count = 1;
      for (let d = 1; d < 5; d++) {
        const nr = r + dr * d, nc = c + dc * d;
        if (nr < 0 || nr >= this.SIZE || nc < 0 || nc >= this.SIZE || this.board[nr][nc] !== player) break;
        count++;
      }
      for (let d = 1; d < 5; d++) {
        const nr = r - dr * d, nc = c - dc * d;
        if (nr < 0 || nr >= this.SIZE || nc < 0 || nc >= this.SIZE || this.board[nr][nc] !== player) break;
        count++;
      }
      total += Math.pow(10, count);
    }
    this.board[r][c] = 0;
    return total;
  }

  _checkWin(r, c, player) {
    const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
    for (const [dr, dc] of dirs) {
      let count = 1;
      for (let d = 1; d < 5; d++) {
        const nr = r + dr * d, nc = c + dc * d;
        if (nr < 0 || nr >= this.SIZE || nc < 0 || nc >= this.SIZE || this.board[nr][nc] !== player) break;
        count++;
      }
      for (let d = 1; d < 5; d++) {
        const nr = r - dr * d, nc = c - dc * d;
        if (nr < 0 || nr >= this.SIZE || nc < 0 || nc >= this.SIZE || this.board[nr][nc] !== player) break;
        count++;
      }
      if (count >= 5) return true;
    }
    return false;
  }

  render() {
    const ctx = this.mesh._ctx;
    const cw = this.mesh._canvas.width;
    const ch = this.mesh._canvas.height;
    const MARGIN = 24;
    const CELL = (cw - MARGIN * 2) / (this.SIZE - 1);

    ctx.clearRect(0, 0, cw, ch);

    // Board background
    ctx.fillStyle = '#d4a844';
    ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = '#c89030';
    ctx.fillRect(MARGIN - CELL / 2, MARGIN - CELL / 2, cw - MARGIN + CELL - MARGIN / 2, ch - MARGIN + CELL - MARGIN / 2);

    // Grid
    ctx.strokeStyle = '#5a3a10';
    ctx.lineWidth = 1;
    for (let i = 0; i < this.SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(MARGIN + i * CELL, MARGIN);
      ctx.lineTo(MARGIN + i * CELL, ch - MARGIN);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(MARGIN, MARGIN + i * CELL);
      ctx.lineTo(cw - MARGIN, MARGIN + i * CELL);
      ctx.stroke();
    }

    // Star points
    [3, 7, 11].forEach(r => [3, 7, 11].forEach(c => {
      ctx.beginPath();
      ctx.arc(MARGIN + c * CELL, MARGIN + r * CELL, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#5a3a10';
      ctx.fill();
    }));

    // Pieces
    for (let r = 0; r < this.SIZE; r++) {
      for (let c = 0; c < this.SIZE; c++) {
        if (!this.board[r][c]) continue;
        const cx = MARGIN + c * CELL;
        const cy = MARGIN + r * CELL;
        const grad = ctx.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, CELL * 0.44);
        if (this.board[r][c] === 1) {
          grad.addColorStop(0, '#888');
          grad.addColorStop(1, '#111');
        } else {
          grad.addColorStop(0, '#fff');
          grad.addColorStop(1, '#bbb');
        }
        ctx.beginPath();
        ctx.arc(cx, cy, CELL * 0.44, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }
    }

    // Game over overlay
    if (this.gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(this.winner === 1 ? 'You Win!' : 'AI Wins!', cw / 2, ch / 2 - 20);
      ctx.font = '20px Arial';
      ctx.fillText('Click to play again', cw / 2, ch / 2 + 20);
    }

    this.mesh._tex.needsUpdate = true;
  }

  dispose() {
    this.parent.remove(this.group);
  }
}

// ============================================================
//  VR Chat Panel (for all zones)
// ============================================================
export class VRChatPanel {
  constructor(parent, options = {}) {
    this.parent = parent;
    this.position = options.position || new THREE.Vector3(0.8, 1.2, 0);
    this.width = options.width || 1.0;
    this.height = options.height || 1.4;
    this.zoneName = options.zoneName || 'Chat';
    this.zoneColor = options.zoneColor || 0x4a3020;
    this.onSendMessage = options.onSendMessage || (() => {});

    this.messages = [];
    this.quickReplies = options.quickReplies || [
      { en: "Hello", zh: "你好" },
      { en: "Help me", zh: "帮帮我" },
      { en: "Thanks", zh: "谢谢" }
    ];

    this.group = new THREE.Group();
    this.group.position.copy(this.position);

    this.build();
    parent.add(this.group);
  }

  build() {
    // Main chat panel - higher resolution for readability
    const cw = 600, ch = 800;
    this.mesh = makeCanvasMesh(this.width, this.height, cw, ch);
    this.group.add(this.mesh);

    // Quick reply buttons - larger and more spread out
    this.buttons = [];
    const btnW = 0.35;
    const btnH = 0.15;
    const btnSpacing = 0.4;
    const startX = -(this.quickReplies.length - 1) * btnSpacing / 2;
    const btnY = -this.height / 2 - 0.12;
    
    this.quickReplies.forEach((reply, i) => {
      const btn = this._createButton(reply.zh, reply.en, btnW, btnH);
      btn.position.set(startX + i * btnSpacing, btnY, 0.02);
      btn.userData.onClick = () => {
        this.onSendMessage(reply.en);
      };
      this.group.add(btn);
      this.buttons.push(btn);
    });

    this.render();
  }

  _createButton(labelMain, labelSub, w, h) {
    const mesh = makeCanvasMesh(w, h, 200, 80);
    const ctx = mesh._ctx;
    
    // Button background with gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 80);
    grad.addColorStop(0, 'rgba(255,252,245,0.98)');
    grad.addColorStop(1, 'rgba(245,235,215,0.98)');
    ctx.fillStyle = grad;
    rrect(ctx, 3, 3, 194, 74, 12);
    ctx.fill();
    
    // Border
    ctx.strokeStyle = `#${this.zoneColor.toString(16).padStart(6, '0')}`;
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Main label (Chinese) - larger
    ctx.fillStyle = '#3a2515';
    ctx.font = 'bold 26px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(labelMain, 100, 38);
    
    // Sub label (English) - smaller
    ctx.font = '16px Arial, sans-serif';
    ctx.fillStyle = '#8a6545';
    ctx.fillText(labelSub, 100, 62);
    
    mesh._tex.needsUpdate = true;
    mesh.userData.isInteractive = true;
    return mesh;
  }

  addMessage(content, role) {
    this.messages.push({ content, role });
    if (this.messages.length > 8) {
      this.messages.shift();
    }
    this.render();
  }

  render() {
    const ctx = this.mesh._ctx;
    const cw = this.mesh._canvas.width;
    const ch = this.mesh._canvas.height;

    ctx.clearRect(0, 0, cw, ch);

    // Background with slight gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, ch);
    bgGrad.addColorStop(0, 'rgba(255,252,245,0.96)');
    bgGrad.addColorStop(1, 'rgba(250,245,230,0.96)');
    ctx.fillStyle = bgGrad;
    rrect(ctx, 6, 6, cw - 12, ch - 12, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(160,120,60,0.6)';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Header - larger
    const headerH = 80;
    ctx.fillStyle = `#${this.zoneColor.toString(16).padStart(6, '0')}20`;
    rrect(ctx, 6, 6, cw - 12, headerH, [20, 20, 0, 0]);
    ctx.fill();
    ctx.fillStyle = '#3a2515';
    ctx.font = 'bold 36px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.zoneName, cw / 2, 55);

    // Messages - larger text
    let y = headerH + 20;
    const fontSize = 24;
    const lineHeight = 32;
    
    for (const msg of this.messages) {
      const isUser = msg.role === 'user';
      const maxW = cw - 80;

      ctx.font = `${fontSize}px Arial, sans-serif`;
      const lines = this._wrapText(ctx, msg.content, maxW * 0.75);
      const boxH = lines.length * lineHeight + 20;

      if (isUser) {
        // User message - right aligned, blue
        ctx.fillStyle = 'rgba(60,110,200,0.92)';
        rrect(ctx, cw - 30 - maxW * 0.75, y, maxW * 0.75, boxH, 14);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        lines.forEach((ln, li) => ctx.fillText(ln, cw - 26 - maxW * 0.72, y + 28 + li * lineHeight));
      } else {
        // AI message - left aligned, light bg
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        rrect(ctx, 24, y, maxW * 0.8, boxH, 14);
        ctx.fill();
        ctx.strokeStyle = 'rgba(160,120,60,0.35)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#3a2515';
        ctx.textAlign = 'left';
        lines.forEach((ln, li) => ctx.fillText(ln, 34, y + 28 + li * lineHeight));
      }
      y += boxH + 12;
    }

    // Hint at bottom - larger
    ctx.fillStyle = '#9a7550';
    ctx.font = '22px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('点击下方按钮开始对话', cw / 2, ch - 30);

    this.mesh._tex.needsUpdate = true;
  }

  _wrapText(ctx, text, maxW) {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
      const test = line + (line ? ' ' : '') + w;
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines.length ? lines : [text];
  }

  getInteractables() {
    return [this.mesh, ...this.buttons];
  }

  dispose() {
    this.parent.remove(this.group);
  }
}

// ============================================================
//  VR Video Player (for Leisure zone)
// ============================================================
export class VRVideoPanel {
  constructor(parent, options = {}) {
    this.parent = parent;
    this.position = options.position || new THREE.Vector3(0, 2, -4);
    this.width = options.width || 4;
    this.height = options.height || 2.25;
    this.onInteract = options.onInteract || (() => {});

    this.group = new THREE.Group();
    this.group.position.copy(this.position);
    
    this.isPlaying = false;
    this.currentVideo = 0;
    this.videos = [
      { title: '放松自然风景', type: 'nature', color: '#4CAF50' },
      { title: '冥想引导', type: 'meditation', color: '#9C27B0' },
      { title: '轻音乐', type: 'music', color: '#2196F3' },
      { title: '励志短片', type: 'motivation', color: '#FF9800' }
    ];

    this.build();
    parent.add(this.group);
  }

  build() {
    // Screen frame
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5 });
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(this.width + 0.2, this.height + 0.2, 0.1),
      frameMat
    );
    this.group.add(frame);

    // Main screen - canvas for video simulation
    const cw = 800, ch = 450;
    this.screenMesh = makeCanvasMesh(this.width, this.height, cw, ch);
    this.screenMesh.position.z = 0.06;
    this.screenMesh.userData.isInteractive = true;
    this.screenMesh.userData.onPointerDown = (uv) => this._onScreenClick(uv);
    this.group.add(this.screenMesh);

    // Control buttons below screen
    this.controls = [];
    const btnY = -this.height / 2 - 0.2;
    const btnLabels = ['⏮', '⏯', '⏭', '🔊'];
    btnLabels.forEach((label, i) => {
      const btn = this._createControlButton(label, 0.25, 0.15);
      btn.position.set(-0.5 + i * 0.35, btnY, 0);
      btn.userData.action = ['prev', 'play', 'next', 'volume'][i];
      btn.userData.onClick = () => this._onControlClick(btn.userData.action);
      this.group.add(btn);
      this.controls.push(btn);
    });

    this.render();
  }

  _createControlButton(label, w, h) {
    const mesh = makeCanvasMesh(w, h, 100, 60);
    const ctx = mesh._ctx;
    
    ctx.fillStyle = 'rgba(40,40,50,0.9)';
    rrect(ctx, 2, 2, 96, 56, 10);
    ctx.fill();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.fillStyle = '#fff';
    ctx.font = '32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(label, 50, 42);
    
    mesh._tex.needsUpdate = true;
    mesh.userData.isInteractive = true;
    return mesh;
  }

  _onScreenClick(uv) {
    // Toggle play/pause when clicking screen
    this.isPlaying = !this.isPlaying;
    this.render();
    this.onInteract('toggle', { playing: this.isPlaying });
  }

  _onControlClick(action) {
    switch (action) {
      case 'prev':
        this.currentVideo = (this.currentVideo - 1 + this.videos.length) % this.videos.length;
        break;
      case 'play':
        this.isPlaying = !this.isPlaying;
        break;
      case 'next':
        this.currentVideo = (this.currentVideo + 1) % this.videos.length;
        break;
      case 'volume':
        // Volume toggle
        break;
    }
    this.render();
    this.onInteract(action, { video: this.videos[this.currentVideo], playing: this.isPlaying });
  }

  render() {
    const ctx = this.screenMesh._ctx;
    const cw = this.screenMesh._canvas.width;
    const ch = this.screenMesh._canvas.height;
    const video = this.videos[this.currentVideo];

    ctx.clearRect(0, 0, cw, ch);

    // Video background gradient based on type
    const grad = ctx.createRadialGradient(cw/2, ch/2, 0, cw/2, ch/2, cw/2);
    switch (video.type) {
      case 'nature':
        grad.addColorStop(0, '#4a8c4a');
        grad.addColorStop(1, '#1a3a1a');
        break;
      case 'meditation':
        grad.addColorStop(0, '#6a4a8c');
        grad.addColorStop(1, '#2a1a4a');
        break;
      case 'music':
        grad.addColorStop(0, '#4a6a8c');
        grad.addColorStop(1, '#1a2a4a');
        break;
      case 'motivation':
        grad.addColorStop(0, '#8c6a4a');
        grad.addColorStop(1, '#4a3a1a');
        break;
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cw, ch);

    // Animated visual elements based on type
    ctx.globalAlpha = 0.3;
    if (video.type === 'nature') {
      // Draw stylized trees/mountains
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = '#2a5a2a';
        ctx.beginPath();
        ctx.moveTo(100 + i * 150, ch);
        ctx.lineTo(150 + i * 150, ch - 150 - Math.random() * 50);
        ctx.lineTo(200 + i * 150, ch);
        ctx.fill();
      }
    } else if (video.type === 'meditation') {
      // Draw mandala circles
      ctx.strokeStyle = '#a080c0';
      ctx.lineWidth = 2;
      for (let r = 50; r < 200; r += 30) {
        ctx.beginPath();
        ctx.arc(cw/2, ch/2, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (video.type === 'music') {
      // Draw sound waves
      ctx.strokeStyle = '#80a0c0';
      ctx.lineWidth = 3;
      for (let i = 0; i < 8; i++) {
        const h = 30 + Math.random() * 100;
        ctx.fillStyle = '#80a0c0';
        ctx.fillRect(100 + i * 80, ch/2 - h/2, 40, h);
      }
    } else if (video.type === 'motivation') {
      // Draw sun rays
      ctx.fillStyle = '#c0a060';
      for (let i = 0; i < 12; i++) {
        ctx.save();
        ctx.translate(cw/2, ch/2);
        ctx.rotate(i * Math.PI / 6);
        ctx.fillRect(-10, -200, 20, 150);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;

    // Video title
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, ch - 80, cw, 80);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 36px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(video.title, cw/2, ch - 35);

    // Play/Pause indicator
    if (!this.isPlaying) {
      // Draw play button
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.moveTo(cw/2 - 40, ch/2 - 50);
      ctx.lineTo(cw/2 + 50, ch/2);
      ctx.lineTo(cw/2 - 40, ch/2 + 50);
      ctx.closePath();
      ctx.fill();
      
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.font = '24px Arial';
      ctx.fillText('点击播放', cw/2, ch/2 + 100);
    } else {
      // Playing indicator
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '20px Arial';
      ctx.fillText('▶ 正在播放...', cw/2, 40);
    }

    // Video progress bar
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(50, ch - 15, cw - 100, 6);
    ctx.fillStyle = video.color;
    ctx.fillRect(50, ch - 15, (cw - 100) * (this.isPlaying ? 0.35 : 0), 6);

    this.screenMesh._tex.needsUpdate = true;
  }

  update(delta) {
    // Animate when playing
    if (this.isPlaying) {
      this.render();
    }
  }

  getInteractables() {
    return [this.screenMesh, ...this.controls];
  }

  dispose() {
    this.parent.remove(this.group);
  }
}

// ============================================================
//  Export all
// ============================================================
export const VRInteractive = {
  VRColoringGame,
  VRGomokuGame,
  VRChatPanel,
  VRVideoPanel
};
