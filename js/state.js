
var W, H, GY, GH, WL;
var PR;   // kapus pálcika fél-magasság
var MR;   // mezőnyjátékos pálcika fél-magasság (rövidebb)
var PW;   // pálcika szélesség

// --- Pálya-téglalap (behúzott keret) + hangolható paraméterek ---
var PLX, PLY, PLW, PLH;      // pálya bal-fent sarok + méret
var MARGIN_X, MARGIN_Y;      // keret-margó (dekor-sáv) a W/H arányában
var BALL_VANISH;             // labda eltűnési mélység a gólvonal mögött (px)

// --- Gól / szünet állapot ---
var ballVisible = true;      // false = labda a hálóban eltűnt
var goalScored = null;       // null | 'left' | 'right' (labda begurul a hálóba)
var paused = false;          // szünet

// Játékos: kapus (bal fal) + mezőnyjátékos (30%-os vonal előtt)
var px, py;   // kapus pozíció
var mx, my;   // mezőnyjátékos pozíció

// Gép: kapus + mezőnyjátékos
var ax, ay;   // gép kapus
var amx, amy; // gép mezőnyjátékos

var bx, by, bvx, bvy, BR;
var sc1=0, sc2=0;
var spd, baseSpd;
var running=false, goalTime=0;
var gameStartTime=0;

// Sebesség nyomonkövetés (csavar)
var prevPY=0, prevMY=0, prevAY=0, prevAmY=0;
var padVY=0, midVY=0, aiVY=0, aiMidVY=0;

// Multi-touch: két ujj egyszerre
var touchLeft=null, touchRight=null;
var lastLeftY=null, lastRightY=null;

// --- Screen shake ---
var shakeTime=0, shakeMag=0;
function triggerShake(mag) { shakeMag=mag; shakeTime=Date.now(); }

// --- Motion trail ---
var ballTrail = [];  // [{x,y,age}]

// --- Pálya háttérkép (tier-enként) + zöld-téglalap kalibráció (a kép arányában) ---
// A kép úgy rajzolódik, hogy a zöld-téglalapja PONTOSAN a pálya-keretre essen.
var pitchImg = new Image();
var pitchImgReady = false;
pitchImg.onload = function(){ pitchImgReady = true; };
pitchImg.src = 'assets/pitch1.jpg';
var PITCH_GL = 0.116, PITCH_GR = 0.87, PITCH_GT = 0.13, PITCH_GB = 0.86; // zöld szélek
