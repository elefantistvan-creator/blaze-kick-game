// --- Hang ---
var audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playBeep(freq, type, dur, vol) {
  if (!audioCtx) return;
  try {
    var o = audioCtx.createOscillator();
    var g = audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination);
    o.type = type || 'square';
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol||0.2, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    o.start(); o.stop(audioCtx.currentTime + dur);
  } catch(e) {}
}

function soundHit()  { playBeep(280, 'square', 0.07, 0.22); }
function soundWall() { playBeep(160, 'sine', 0.05, 0.12); }
function soundGoal() {
  // Fanfár
  playBeep(523, 'sine', 0.12, 0.4);
  setTimeout(function(){ playBeep(659, 'sine', 0.12, 0.4); }, 100);
  setTimeout(function(){ playBeep(784, 'sine', 0.15, 0.4); }, 200);
  setTimeout(function(){ playBeep(1047,'sine', 0.30, 0.5); }, 320);
  // Közönség zaj - fehér zaj burst
  crowd();
}

function crowd() {
  if (!audioCtx) return;
  try {
    var bufSize = audioCtx.sampleRate * 1.2;
    var buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i=0; i<bufSize; i++) data[i] = (Math.random()*2-1) * 0.15;
    var src = audioCtx.createBufferSource();
    src.buffer = buf;
    // Sávszűrő: 800-3000Hz = emberi hangra hasonlít
    var filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800;
    filter.Q.value = 0.8;
    var g = audioCtx.createGain();
    g.gain.setValueAtTime(0.0, audioCtx.currentTime);
    g.gain.linearRampToValueAtTime(0.4, audioCtx.currentTime + 0.1);
    g.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.5);
    g.gain.linearRampToValueAtTime(0.0, audioCtx.currentTime + 1.2);
    src.connect(filter); filter.connect(g); g.connect(audioCtx.destination);
    src.start(); src.stop(audioCtx.currentTime + 1.2);
  } catch(e) {}
}
