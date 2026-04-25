// ============================================================
//  Campus Companion XR — Mini Games
//  Four canvas-based games rendered inside the game panel.
//  Games: Mindful Coloring | Gomoku | Go | Chinese Chess
// ============================================================

const Games = (() => {

  let canvas, ctx, currentGame = 'coloring', statusEl;

  // ── Shared helpers ────────────────────────────────────────
  function init(canvasEl, statusElement) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    statusEl = statusElement;
  }

  function setStatus(en, zh) {
    if (statusEl) statusEl.textContent = `${en} · ${zh}`;
  }

  function launch(game) {
    currentGame = game;
    canvas.onclick = null;
    canvas.onmousemove = null;
    canvas.onmousedown = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    switch (game) {
      case 'coloring': Coloring.start(); break;
      case 'gomoku':   Gomoku.start();   break;
      case 'go':       Go.start();       break;
      case 'chess':    Chess.start();    break;
    }
  }

  // ╔══════════════════════════════════════════════════════════╗
  // ║  MINDFUL COLORING                                       ║
  // ╚══════════════════════════════════════════════════════════╝
  const Coloring = (() => {
    const palette = [
      '#E8A898','#F5D5A8','#A8D8A8','#A8C8E8',
      '#D8A8E8','#E8D8A8','#A8E8D8','#E8C8A8',
      '#C8A8D8','#98D898',
    ];
    let selected = palette[0];
    let segments = [];
    const W = 480, H = 480;
    const CX = W / 2, CY = H / 2;

    function start() {
      canvas.width = W; canvas.height = H;
      segments = buildSegments();
      drawAll();
      canvas.onclick = e => {
        const r = canvas.getBoundingClientRect();
        const mx = (e.clientX - r.left) * (W / r.width);
        const my = (e.clientY - r.top) * (H / r.height);
        // Check palette row
        const py = H - 40;
        if (my > py) {
          const col = Math.floor(mx / (W / palette.length));
          selected = palette[col];
          drawAll();
          return;
        }
        // Hit-test segments
        for (const seg of segments) {
          if (ctx.isPointInPath(seg.path2d, mx, my)) {
            seg.fill = selected;
            drawAll();
            break;
          }
        }
      };
      setStatus('Click a petal to color it · Change colors below', '点击花瓣上色，下方选择颜色');
    }

    function buildSegments() {
      const segs = [];
      const rings = [
        { count: 1,  r1: 0,   r2: 38,  type: 'center' },
        { count: 12, r1: 38,  r2: 90,  type: 'petal' },
        { count: 8,  r1: 90,  r2: 140, type: 'ring' },
        { count: 16, r1: 140, r2: 185, type: 'petal' },
        { count: 12, r1: 185, r2: 215, type: 'ring' },
        { count: 24, r1: 215, r2: 0,   type: 'outer', outerR: 220 },
      ];

      for (const ring of rings) {
        if (ring.type === 'center') {
          const p = new Path2D();
          p.arc(CX, CY, ring.r2, 0, Math.PI * 2);
          segs.push({ path2d: p, fill: null, stroke: '#bbb', isCircle: true, cx: CX, cy: CY, r: ring.r2 });
          continue;
        }
        const count = ring.count;
        for (let i = 0; i < count; i++) {
          const a0 = (i / count) * Math.PI * 2 - Math.PI / 2;
          const a1 = ((i + 1) / count) * Math.PI * 2 - Math.PI / 2;
          const r2 = ring.outerR || ring.r2;
          const p = new Path2D();
          p.moveTo(CX + ring.r1 * Math.cos(a0), CY + ring.r1 * Math.sin(a0));
          p.arc(CX, CY, r2, a0, a1);
          p.arc(CX, CY, ring.r1, a1, a0, true);
          p.closePath();
          segs.push({ path2d: p, fill: null, stroke: '#bbb' });
        }
      }
      return segs;
    }

    function drawAll() {
      ctx.clearRect(0, 0, W, H);

      // Background
      const grad = ctx.createRadialGradient(CX, CY, 0, CX, CY, CX);
      grad.addColorStop(0, '#fff8f0');
      grad.addColorStop(1, '#f0e8d8');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Segments
      for (const seg of segments) {
        ctx.save();
        if (seg.fill) {
          ctx.fillStyle = seg.fill;
          ctx.fill(seg.path2d);
        } else {
          ctx.fillStyle = '#f9f4ec';
          ctx.fill(seg.path2d);
        }
        ctx.strokeStyle = '#c8b898';
        ctx.lineWidth = 1.5;
        ctx.stroke(seg.path2d);
        ctx.restore();
      }

      // Palette bar
      const pH = 36, py = H - pH - 4;
      ctx.fillStyle = 'rgba(255,248,235,0.9)';
      ctx.fillRect(0, py - 4, W, pH + 12);
      palette.forEach((col, i) => {
        const bw = W / palette.length;
        const bx = i * bw + 4;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.roundRect(bx, py + 2, bw - 8, pH - 6, 6);
        ctx.fill();
        if (col === selected) {
          ctx.strokeStyle = '#4a3020';
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }
      });

      // Reset hint
      ctx.fillStyle = '#a08060';
      ctx.font = '11px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('R = reset / 重置', W / 2, H - 2);
    }

    document.addEventListener('keydown', e => {
      if (currentGame === 'coloring' && e.key.toLowerCase() === 'r') {
        segments.forEach(s => s.fill = null);
        drawAll();
      }
    });

    return { start };
  })();

  // ╔══════════════════════════════════════════════════════════╗
  // ║  GOMOKU (五子棋) 15×15                                   ║
  // ╚══════════════════════════════════════════════════════════╝
  const Gomoku = (() => {
    const SIZE = 15, W = 480, H = 480;
    const MARGIN = 24, CELL = (W - MARGIN * 2) / (SIZE - 1);
    let board, turn, gameOver;

    function start() {
      canvas.width = W; canvas.height = H;
      board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0)); // 0=empty 1=black 2=white
      turn = 1; gameOver = false;
      draw();
      canvas.onclick = e => {
        if (gameOver) { start(); return; }
        if (turn !== 1) return;
        const r = canvas.getBoundingClientRect();
        const mx = (e.clientX - r.left) * (W / r.width);
        const my = (e.clientY - r.top) * (H / r.height);
        const col = Math.round((mx - MARGIN) / CELL);
        const row = Math.round((my - MARGIN) / CELL);
        if (col < 0 || col >= SIZE || row < 0 || row >= SIZE) return;
        if (board[row][col] !== 0) return;
        board[row][col] = 1;
        draw();
        if (checkWin(row, col, 1)) { gameOver = true; setStatus('You win! 🎉 Click to restart', '你赢了！点击重开'); draw(); return; }
        if (isFull()) { gameOver = true; setStatus("It's a draw! Click to restart", '平局！点击重开'); return; }
        turn = 2;
        setStatus("AI is thinking... / AI思考中", '');
        setTimeout(() => { aiMove(); }, 300);
      };
      setStatus('Your turn (Black ●) · Play 5 in a row', '轮到你（黑棋●），五子连线获胜');
    }

    function aiMove() {
      // Simple heuristic: score each cell
      let best = -1, br = -1, bc = -1;
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          if (board[r][c] !== 0) continue;
          const s = scoreCell(r, c, 2) * 1.1 + scoreCell(r, c, 1);
          if (s > best) { best = s; br = r; bc = c; }
        }
      }
      if (br === -1) return;
      board[br][bc] = 2;
      draw();
      if (checkWin(br, bc, 2)) { gameOver = true; setStatus('AI wins! Click to restart', 'AI赢了！点击重开'); draw(); return; }
      if (isFull()) { gameOver = true; setStatus("Draw! Click to restart", '平局！'); return; }
      turn = 1;
      setStatus('Your turn (Black ●)', '轮到你（黑棋●）');
    }

    function scoreCell(r, c, player) {
      const dirs = [[1,0],[0,1],[1,1],[1,-1]];
      let total = 0;
      board[r][c] = player;
      for (const [dr, dc] of dirs) {
        let count = 1;
        for (let d = 1; d < 5; d++) {
          const nr = r+dr*d, nc = c+dc*d;
          if (nr<0||nr>=SIZE||nc<0||nc>=SIZE||board[nr][nc]!==player) break;
          count++;
        }
        for (let d = 1; d < 5; d++) {
          const nr = r-dr*d, nc = c-dc*d;
          if (nr<0||nr>=SIZE||nc<0||nc>=SIZE||board[nr][nc]!==player) break;
          count++;
        }
        total += Math.pow(10, count);
      }
      board[r][c] = 0;
      return total;
    }

    function checkWin(r, c, player) {
      const dirs = [[1,0],[0,1],[1,1],[1,-1]];
      for (const [dr, dc] of dirs) {
        let count = 1;
        for (let d = 1; d < 5; d++) { const nr=r+dr*d,nc=c+dc*d; if(nr<0||nr>=SIZE||nc<0||nc>=SIZE||board[nr][nc]!==player) break; count++; }
        for (let d = 1; d < 5; d++) { const nr=r-dr*d,nc=c-dc*d; if(nr<0||nr>=SIZE||nc<0||nc>=SIZE||board[nr][nc]!==player) break; count++; }
        if (count >= 5) return true;
      }
      return false;
    }

    function isFull() { return board.every(row => row.every(c => c !== 0)); }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      // Board background
      ctx.fillStyle = '#d4a844';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#c89030';
      ctx.fillRect(MARGIN - CELL/2, MARGIN - CELL/2, W - MARGIN + CELL - MARGIN/2, H - MARGIN + CELL - MARGIN/2);

      // Grid
      ctx.strokeStyle = '#5a3a10';
      ctx.lineWidth = 1;
      for (let i = 0; i < SIZE; i++) {
        ctx.beginPath(); ctx.moveTo(MARGIN + i * CELL, MARGIN); ctx.lineTo(MARGIN + i * CELL, H - MARGIN); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(MARGIN, MARGIN + i * CELL); ctx.lineTo(W - MARGIN, MARGIN + i * CELL); ctx.stroke();
      }
      // Star points
      [3, 7, 11].forEach(r => [3, 7, 11].forEach(c => {
        ctx.beginPath(); ctx.arc(MARGIN + c * CELL, MARGIN + r * CELL, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#5a3a10'; ctx.fill();
      }));

      // Pieces
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          if (!board[r][c]) continue;
          const cx = MARGIN + c * CELL, cy = MARGIN + r * CELL;
          const grad = ctx.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, CELL * 0.44);
          if (board[r][c] === 1) {
            grad.addColorStop(0, '#888'); grad.addColorStop(1, '#111');
          } else {
            grad.addColorStop(0, '#fff'); grad.addColorStop(1, '#bbb');
          }
          ctx.beginPath(); ctx.arc(cx, cy, CELL * 0.44, 0, Math.PI * 2);
          ctx.fillStyle = grad; ctx.fill();
          ctx.strokeStyle = board[r][c] === 1 ? '#333' : '#999';
          ctx.lineWidth = 0.5; ctx.stroke();
        }
      }

      if (gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#fff8e8';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over · 游戏结束', W/2, H/2 - 16);
        ctx.font = '18px Arial';
        ctx.fillText('Click to play again · 点击重开', W/2, H/2 + 24);
      }
    }

    return { start };
  })();

  // ╔══════════════════════════════════════════════════════════╗
  // ║  GO (围棋) 9×9 Beginner Board                           ║
  // ╚══════════════════════════════════════════════════════════╝
  const Go = (() => {
    const SIZE = 9, W = 480, H = 480;
    const MARGIN = 36, CELL = (W - MARGIN * 2) / (SIZE - 1);
    let board, turn, captured, gameOver, lastMove;

    function start() {
      canvas.width = W; canvas.height = H;
      board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
      turn = 1; gameOver = false;
      captured = { black: 0, white: 0 };
      lastMove = null;
      draw();
      canvas.onclick = e => {
        if (gameOver) { start(); return; }
        if (turn !== 1) return;
        const r = canvas.getBoundingClientRect();
        const mx = (e.clientX - r.left) * (W / r.width);
        const my = (e.clientY - r.top) * (H / r.height);
        const col = Math.round((mx - MARGIN) / CELL);
        const row = Math.round((my - MARGIN) / CELL);
        if (col < 0 || col >= SIZE || row < 0 || row >= SIZE) return;
        if (board[row][col] !== 0) return;
        if (!placeStone(row, col, 1)) return;
        lastMove = [row, col];
        draw();
        if (isFull()) { gameOver = true; setStatus('Board full! Click to restart', '棋盘已满，点击重开'); return; }
        turn = 2;
        setTimeout(() => { aiGoMove(); }, 400);
      };
      setStatus('Black goes first · Place stones to surround territory', '黑棋先行，围地多者胜');
    }

    function placeStone(r, c, player) {
      board[r][c] = player;
      const opp = player === 1 ? 2 : 1;
      // Capture opponent groups without liberty
      let cap = 0;
      [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc]) => {
        const nr = r+dr, nc = c+dc;
        if (nr>=0&&nr<SIZE&&nc>=0&&nc<SIZE&&board[nr][nc]===opp) {
          const group = getGroup(nr, nc);
          if (liberties(group) === 0) {
            cap += group.length;
            group.forEach(([gr,gc]) => board[gr][gc] = 0);
          }
        }
      });
      if (player === 1) captured.white += cap; else captured.black += cap;
      // Suicide check (simplified: if own group has no liberty, disallow)
      const ownGroup = getGroup(r, c);
      if (liberties(ownGroup) === 0) { board[r][c] = 0; return false; }
      return true;
    }

    function getGroup(r, c) {
      const color = board[r][c], visited = new Set(), queue = [[r,c]];
      visited.add(`${r},${c}`);
      while (queue.length) {
        const [cr, cc] = queue.shift();
        [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc]) => {
          const nr=cr+dr, nc=cc+dc;
          if (nr>=0&&nr<SIZE&&nc>=0&&nc<SIZE&&!visited.has(`${nr},${nc}`)&&board[nr][nc]===color) {
            visited.add(`${nr},${nc}`); queue.push([nr,nc]);
          }
        });
      }
      return [...visited].map(k => k.split(',').map(Number));
    }

    function liberties(group) {
      const seen = new Set();
      let libs = 0;
      group.forEach(([r,c]) => {
        [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc]) => {
          const nr=r+dr, nc=c+dc, key=`${nr},${nc}`;
          if (nr>=0&&nr<SIZE&&nc>=0&&nc<SIZE&&board[nr][nc]===0&&!seen.has(key)) {
            seen.add(key); libs++;
          }
        });
      });
      return libs;
    }

    function aiGoMove() {
      // Find move that captures most opponent, or just random valid
      let best = -1, br = -1, bc = -1;
      const shuffled = [];
      for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (!board[r][c]) shuffled.push([r,c]);
      shuffled.sort(() => Math.random() - 0.5);
      for (const [r,c] of shuffled) {
        const tempBoard = board.map(row => [...row]);
        board[r][c] = 2;
        const capCount = countCaptures(r, c, 1);
        board[r][c] = 0;
        const s = capCount * 10 + Math.random() * 2;
        if (s > best && canPlace(r, c, 2)) { best = s; br = r; bc = c; }
      }
      if (br === -1) { setStatus('AI passes · Click to continue', 'AI过一手'); turn = 1; return; }
      placeStone(br, bc, 2);
      lastMove = [br, bc];
      draw();
      turn = 1;
      setStatus(`Black: cap ${captured.black} · White: cap ${captured.white}`, `黑：${captured.black} · 白：${captured.white}`);
    }

    function canPlace(r, c, player) {
      board[r][c] = player;
      const g = getGroup(r, c);
      const ok = liberties(g) > 0;
      board[r][c] = 0;
      return ok;
    }

    function countCaptures(r, c, opp) {
      let cap = 0;
      [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc]) => {
        const nr=r+dr, nc=c+dc;
        if (nr>=0&&nr<SIZE&&nc>=0&&nc<SIZE&&board[nr][nc]===opp) {
          const g = getGroup(nr,nc);
          if (liberties(g) === 0) cap += g.length;
        }
      });
      return cap;
    }

    function isFull() { return board.every(row => row.every(c => c !== 0)); }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#d4a844';
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#5a3a10';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < SIZE; i++) {
        ctx.beginPath(); ctx.moveTo(MARGIN + i * CELL, MARGIN); ctx.lineTo(MARGIN + i * CELL, H - MARGIN); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(MARGIN, MARGIN + i * CELL); ctx.lineTo(W - MARGIN, MARGIN + i * CELL); ctx.stroke();
      }
      // Star points (4 corners + center for 9x9)
      [[2,2],[2,6],[6,2],[6,6],[4,4]].forEach(([r,c]) => {
        ctx.beginPath(); ctx.arc(MARGIN + c * CELL, MARGIN + r * CELL, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#5a3a10'; ctx.fill();
      });
      // Stones
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          if (!board[r][c]) continue;
          const cx = MARGIN + c * CELL, cy = MARGIN + r * CELL;
          const isLast = lastMove && lastMove[0] === r && lastMove[1] === c;
          const g = ctx.createRadialGradient(cx-3, cy-3, 1, cx, cy, CELL*0.46);
          if (board[r][c] === 1) { g.addColorStop(0,'#888'); g.addColorStop(1,'#111'); }
          else { g.addColorStop(0,'#fff'); g.addColorStop(1,'#ccc'); }
          ctx.beginPath(); ctx.arc(cx, cy, CELL*0.46, 0, Math.PI*2);
          ctx.fillStyle = g; ctx.fill();
          if (isLast) {
            ctx.strokeStyle = board[r][c] === 1 ? '#f00' : '#00f';
            ctx.lineWidth = 2; ctx.stroke();
          }
        }
      }
      // Score bar
      ctx.fillStyle = 'rgba(255,248,235,0.88)';
      ctx.fillRect(0, H - 28, W, 28);
      ctx.fillStyle = '#4a3020';
      ctx.font = '13px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`Captured — Black: ${captured.black}  White: ${captured.white}   |   Turn: ${turn===1?'Black ●':'AI White ○'}`, W/2, H-10);
    }

    return { start };
  })();

  // ╔══════════════════════════════════════════════════════════╗
  // ║  CHINESE CHESS (象棋)                                    ║
  // ╚══════════════════════════════════════════════════════════╝
  const Chess = (() => {
    const ROWS = 10, COLS = 9, W = 480, H = 530;
    const MX = 28, MY = 28;
    const CW = (W - MX * 2) / (COLS - 1);
    const CH = (H - MY * 2 - 30) / (ROWS - 1);

    // Pieces: { type, side:1=red/2=black, row, col, label:{en,zh} }
    const TYPES = {
      K: { en:'King', zhR:'帅', zhB:'將' },
      A: { en:'Adv', zhR:'仕', zhB:'士' },
      B: { en:'Ele', zhR:'相', zhB:'象' },
      N: { en:'Horse', zhR:'馬', zhB:'馬' },
      R: { en:'Rook', zhR:'車', zhB:'車' },
      C: { en:'Cannon', zhR:'炮', zhB:'砲' },
      P: { en:'Pawn', zhR:'兵', zhB:'卒' },
    };

    let pieces, selected, turn, gameOver;

    function initPieces() {
      const mk = (t, s, r, c) => ({ type: t, side: s, row: r, col: c });
      return [
        // Black (top, side=2)
        mk('R',2,0,0),mk('N',2,0,1),mk('B',2,0,2),mk('A',2,0,3),mk('K',2,0,4),mk('A',2,0,5),mk('B',2,0,6),mk('N',2,0,7),mk('R',2,0,8),
        mk('C',2,2,1),mk('C',2,2,7),
        mk('P',2,3,0),mk('P',2,3,2),mk('P',2,3,4),mk('P',2,3,6),mk('P',2,3,8),
        // Red (bottom, side=1)
        mk('R',1,9,0),mk('N',1,9,1),mk('B',1,9,2),mk('A',1,9,3),mk('K',1,9,4),mk('A',1,9,5),mk('B',1,9,6),mk('N',1,9,7),mk('R',1,9,8),
        mk('C',1,7,1),mk('C',1,7,7),
        mk('P',1,6,0),mk('P',1,6,2),mk('P',1,6,4),mk('P',1,6,6),mk('P',1,6,8),
      ];
    }

    function at(r, c) { return pieces.find(p => p.row === r && p.col === c) || null; }

    function start() {
      canvas.width = W; canvas.height = H;
      pieces = initPieces();
      selected = null; turn = 1; gameOver = false;
      draw();
      canvas.onclick = e => {
        if (gameOver) { start(); return; }
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (W / rect.width);
        const my = (e.clientY - rect.top) * (H / rect.height);
        const col = Math.round((mx - MX) / CW);
        const row = Math.round((my - MY) / CH);
        if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return;
        handleClick(row, col);
      };
      setStatus('Red moves first · Click a piece then a destination', '红方先走，点击棋子再点击目标');
    }

    function handleClick(r, c) {
      if (turn !== 1) return;
      const piece = at(r, c);
      if (selected) {
        const moves = getMoves(selected);
        if (moves.some(([mr, mc]) => mr === r && mc === c)) {
          movePiece(selected, r, c);
          selected = null;
          draw();
          if (isKingCaptured(1)) { gameOver = true; setStatus('AI wins! Click to restart','AI赢了！'); draw(); return; }
          turn = 2;
          setTimeout(() => { aiChessMove(); }, 500);
        } else if (piece && piece.side === 1) {
          selected = piece;
          draw();
        } else {
          selected = null;
          draw();
        }
      } else {
        if (piece && piece.side === 1) { selected = piece; draw(); }
      }
    }

    function movePiece(p, r, c) {
      const target = at(r, c);
      if (target) pieces = pieces.filter(q => q !== target);
      p.row = r; p.col = c;
    }

    function isKingCaptured(side) {
      return !pieces.find(p => p.type === 'K' && p.side === side);
    }

    function getMoves(p) {
      const { type, side, row, col } = p;
      const moves = [];
      const opp = side === 1 ? 2 : 1;
      const fwd = side === 1 ? -1 : 1; // forward direction

      const add = (r, c) => {
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
        const t = at(r, c);
        if (t && t.side === side) return false;
        moves.push([r, c]);
        return !t; // continue sliding if empty
      };

      switch (type) {
        case 'R': // Rook — slides in 4 directions
          [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc]) => {
            for (let i = 1; i < 10; i++) if (!add(row+dr*i, col+dc*i)) break;
          });
          break;

        case 'N': // Horse — L-shape with blocking
          [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]].forEach(([dr,dc]) => {
            const br = row + (Math.abs(dr)===2 ? dr/2 : 0);
            const bc = col + (Math.abs(dc)===2 ? dc/2 : 0);
            if (!at(br,bc)) add(row+dr, col+dc);
          });
          break;

        case 'B': // Elephant — diagonal 2, no river crossing
          [[2,2],[2,-2],[-2,2],[-2,-2]].forEach(([dr,dc]) => {
            const nr = row+dr, nc = col+dc;
            if (side===1&&nr<5) return; if (side===2&&nr>4) return;
            if (!at(row+dr/2, col+dc/2)) add(nr, nc);
          });
          break;

        case 'A': // Advisor — diagonal 1 in palace
          [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc]) => {
            const nr=row+dr, nc=col+dc;
            if (nc<3||nc>5) return;
            if (side===1&&nr<7) return; if (side===2&&nr>2) return;
            add(nr,nc);
          });
          break;

        case 'K': // King — 1 step in palace
          [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc]) => {
            const nr=row+dr, nc=col+dc;
            if (nc<3||nc>5) return;
            if (side===1&&nr<7) return; if (side===2&&nr>2) return;
            add(nr,nc);
          });
          break;

        case 'C': // Cannon — rook-move, captures by jumping one
          [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc]) => {
            let jumping = false;
            for (let i = 1; i < 10; i++) {
              const nr=row+dr*i, nc=col+dc*i;
              if (nr<0||nr>=ROWS||nc<0||nc>=COLS) break;
              const t = at(nr,nc);
              if (!jumping) {
                if (!t) moves.push([nr,nc]);
                else jumping = true;
              } else {
                if (t) { if (t.side !== side) moves.push([nr,nc]); break; }
              }
            }
          });
          break;

        case 'P': // Pawn
          add(row+fwd, col); // always forward
          if ((side===1&&row<5)||(side===2&&row>4)) { // crossed river
            add(row, col+1); add(row, col-1);
          }
          break;
      }
      return moves;
    }

    function aiChessMove() {
      const myPieces = pieces.filter(p => p.side === 2);
      let best = null, bestScore = -Infinity;
      for (const p of myPieces) {
        for (const [r, c] of getMoves(p)) {
          const target = at(r, c);
          const score = target ? (target.type === 'K' ? 10000 : 10) : Math.random();
          if (score > bestScore) { bestScore = score; best = { p, r, c }; }
        }
      }
      if (!best) { setStatus('AI resigns! You win! / AI认负！', ''); gameOver = true; draw(); return; }
      movePiece(best.p, best.r, best.c);
      draw();
      if (isKingCaptured(2)) { gameOver = true; setStatus('You win! Click to restart','你赢了！'); draw(); return; }
      turn = 1;
      setStatus('Your turn (Red) · Click a piece', '轮到你（红方）');
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      // Board
      ctx.fillStyle = '#e8c878';
      ctx.fillRect(0, 0, W, H);

      // Grid
      ctx.strokeStyle = '#5a3a10';
      ctx.lineWidth = 1.5;
      for (let r = 0; r < ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(MX, MY + r * CH);
        ctx.lineTo(MX + (COLS-1) * CW, MY + r * CH);
        ctx.stroke();
      }
      for (let c = 0; c < COLS; c++) {
        // Columns are split at river
        ctx.beginPath(); ctx.moveTo(MX + c*CW, MY); ctx.lineTo(MX + c*CW, MY + 4*CH); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(MX + c*CW, MY + 5*CH); ctx.lineTo(MX + c*CW, MY + 9*CH); ctx.stroke();
      }

      // River
      ctx.fillStyle = 'rgba(100,160,220,0.25)';
      ctx.fillRect(MX, MY + 4*CH + 1, (COLS-1)*CW, CH - 2);
      ctx.fillStyle = '#5a3a10';
      ctx.font = 'bold 16px "Microsoft YaHei", Arial';
      ctx.textAlign = 'center';
      ctx.fillText('楚　河', MX + (COLS-1)*CW*0.28, MY + 4*CH + CH*0.6);
      ctx.fillText('汉　界', MX + (COLS-1)*CW*0.72, MY + 4*CH + CH*0.6);

      // Palace diagonals
      const drawDiag = (r1,c1,r2,c2) => {
        ctx.beginPath();
        ctx.moveTo(MX+c1*CW, MY+r1*CH); ctx.lineTo(MX+c2*CW, MY+r2*CH);
        ctx.strokeStyle='#5a3a10'; ctx.lineWidth=1; ctx.stroke();
      };
      drawDiag(0,3,2,5); drawDiag(0,5,2,3);
      drawDiag(7,3,9,5); drawDiag(7,5,9,3);

      // Pieces
      for (const p of pieces) {
        const cx = MX + p.col * CW, cy = MY + p.row * CH;
        const isSelected = selected === p;
        const info = TYPES[p.type];
        const label = p.side === 1 ? info.zhR : info.zhB;

        ctx.beginPath();
        ctx.arc(cx, cy, CW * 0.42, 0, Math.PI * 2);
        const g = ctx.createRadialGradient(cx-3, cy-3, 1, cx, cy, CW*0.42);
        if (p.side === 1) { g.addColorStop(0,'#fff4e0'); g.addColorStop(1,'#d4b060'); }
        else { g.addColorStop(0,'#e8e8e8'); g.addColorStop(1,'#a0a0a0'); }
        ctx.fillStyle = g; ctx.fill();

        ctx.strokeStyle = isSelected ? '#ff4400' : (p.side===1?'#8b4000':'#333');
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        ctx.stroke();

        ctx.fillStyle = p.side === 1 ? '#8b1010' : '#000';
        ctx.font = `bold ${Math.round(CW*0.38)}px "Microsoft YaHei", Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, cx, cy);
        ctx.textBaseline = 'alphabetic';
      }

      // Highlight valid moves
      if (selected) {
        getMoves(selected).forEach(([r, c]) => {
          const cx = MX + c*CW, cy = MY + r*CH;
          ctx.beginPath(); ctx.arc(cx, cy, CW*0.18, 0, Math.PI*2);
          ctx.fillStyle = 'rgba(255,100,50,0.45)'; ctx.fill();
        });
      }

      // Turn indicator
      ctx.fillStyle = 'rgba(255,248,230,0.92)';
      ctx.fillRect(0, H-28, W, 28);
      ctx.fillStyle = turn===1?'#cc2200':'#222';
      ctx.font = '13px "Microsoft YaHei", Arial';
      ctx.textAlign = 'center';
      ctx.fillText(turn===1?'Red\'s turn — click a piece / 红方走棋':'AI (Black) is thinking / AI思考中', W/2, H-10);

      if (gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#fff8e8';
        ctx.font = 'bold 26px "Microsoft YaHei", Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over · 游戏结束', W/2, H/2-14);
        ctx.font = '17px Arial';
        ctx.fillText('Click to restart · 点击重开', W/2, H/2+22);
      }
    }

    return { start };
  })();

  // ── Public API ────────────────────────────────────────────
  return { init, launch };
})();
