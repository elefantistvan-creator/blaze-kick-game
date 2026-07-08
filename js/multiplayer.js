// ============================================================
// MULTIPLAYER - WebSocket szerver alapú (szerver számolja a fizikát)
// ============================================================
var WS_SERVER = 'wss://blaze-kick-server.onrender.com';

var mpMode = false;
var mpRole = null;
var mpCode = null;
var mpConnected = false;
var mpWs = null;
var mpSendTimer = null;

function mpSetStatus(msg) {
  var el = document.getElementById('mpStatus');
  if (el) el.textContent = msg;
}

function mpConnect(onOpen) {
  mpSetStatus('Connecting... (first launch may take ~30s)');
  var ws = new WebSocket(WS_SERVER);
  mpWs = ws;
  var connected = false;

  var timeout = setTimeout(function() {
    if (!connected) {
      mpSetStatus('Timed out - try again!');
      try { ws.close(); } catch(e) {}
    }
  }, 45000);

  ws.onopen = function() {
    connected = true;
    clearTimeout(timeout);
    mpSetStatus('Connected!');
    onOpen(ws);
  };

  ws.onmessage = function(e) {
    try {
      var msg = JSON.parse(e.data);

      if (msg.type === 'created') {
        document.getElementById('mpRoomCode').textContent = msg.code;
        document.getElementById('mpCreate').style.display = 'none';
        document.getElementById('mpWaiting').style.display = 'flex';
        document.getElementById('mpCancelBtn').style.display = 'none';
        mpSetStatus('Waiting for the other player...');
      }

      if (msg.type === 'start') {
        mpRole = msg.role;
        mpConnected = true;
        mpStartGame();
      }

      if (msg.type === 'state') {
        if (!mpMode) return;
        // Server sends the full state
        bx  = msg.bx * W;
        by  = msg.by * H;
        bvx = msg.bvx * W;
        bvy = msg.bvy * H;
        // Paddle positions
        py  = msg.h_py * H;
        my  = msg.h_my * H;
        ay  = msg.g_py * H;
        amy = msg.g_my * H;
        // Score
        if (msg.sc1 !== undefined) {
          sc1 = msg.sc1; sc2 = msg.sc2;
          if (s1El) s1El.textContent = sc1;
          if (s2El) s2El.textContent = sc2;
        }
      }

      if (msg.type === 'gameover') {
        running = false;
        var won = mpRole === 'host' ? msg.sc1 > msg.sc2 : msg.sc2 > msg.sc1;
        overlay.querySelector('h2').textContent = won ? '🏆 You won!' : '😞 You lost!';
        overlay.querySelectorAll('p')[0].textContent = won ? 'Congratulations!' : 'Try again!';
        overlay.querySelectorAll('p')[1].textContent = '';
        startBtn.textContent = '▶ Continue';
        overlay.style.display = 'flex';
        mpMode = false;
      }

      if (msg.type === 'error') {
        mpSetStatus(msg.msg || 'Error!');
      }

      if (msg.type === 'disconnect') {
        mpSetStatus('Opponent left.');
        mpMode = false;
        overlay.style.display = 'flex';
      }

    } catch(err) {}
  };

  ws.onerror = function() {
    clearTimeout(timeout);
    mpSetStatus('Connection error - try again!');
  };

  ws.onclose = function() {
    clearTimeout(timeout);
    if (!connected) mpSetStatus('Failed to connect - try again!');
    else if (mpMode) mpSetStatus('Connection lost.');
  };

  return ws;
}

function mpCreateRoom() {
  var code = Math.floor(1000 + Math.random()*9000).toString();
  mpCode = code;
  mpConnect(function(ws) {
    ws.send(JSON.stringify({ type: 'create', code: code }));
  });
}

function mpJoinRoom() {
  var code = prompt('Enter the 4-digit room code:');
  if (!code || code.trim().length !== 4) {
    if (code !== null) mpSetStatus('A 4-digit code is required!');
    return;
  }
  mpCode = code.trim();
  mpConnect(function(ws) {
    ws.send(JSON.stringify({ type: 'join', code: mpCode }));
  });
}

function mpStartGame() {
  overlay.style.display = 'none';
  document.getElementById('mpOverlay').style.display = 'none';
  mpMode = true;
  running = true;
  gameStartTime = Date.now();
  // Input küldés 30fps - csak ütők pozíciója
  mpSendTimer = setInterval(function() {
    if (!mpMode || !mpWs || mpWs.readyState !== 1) return;
    mpWs.send(JSON.stringify({
      type: 'input',
      py: py/H, my: my/H
    }));
  }, 33);
  // Játék inicializálás
  initAudio();
  isNight = Math.random() > 0.5;
  sc1=0; sc2=0;
  if (s1El) s1El.textContent='0';
  if (s2El) s2El.textContent='0';
  goalTime=0; spd=baseSpd;
  touchLeft=null; touchRight=null; lastLeftY=null; lastRightY=null;
  pb=null; powerLeft=null; powerRight=null;
  countdown=0;
  setup();
}

function mpCancel() {
  if (mpSendTimer) { clearInterval(mpSendTimer); mpSendTimer = null; }
  if (mpWs) { try { mpWs.close(); } catch(e){} mpWs = null; }
  mpMode=false; mpRole=null; mpCode=null; mpConnected=false;
  document.getElementById('mpOverlay').style.display = 'none';
  document.getElementById('mpCreate').style.display = 'flex';
  document.getElementById('mpWaiting').style.display = 'none';
  document.getElementById('mpCancelBtn').style.display = 'block';
  mpSetStatus('');
}

function showMpOverlay() {
  var el = document.getElementById('mpOverlay');
  el.style.display = 'flex';
  el.style.zIndex = '200';
}

