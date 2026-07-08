
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

// --- Pattanás-fizika (hangolható) ---
var MAX_BOUNCE_ANGLE_DEG = 45;   // max eltérés a vízszintestől (fokban) - nincs fel-le pattogás
var PADDLE_DRAG = 0.75;          // az ütő húzásának ereje (a SZÖGRE hat, nem a sebességre)
var prePowerHitSpeed = 0;        // tap-ütés előtti sebesség (visszaállításhoz)

// --- Motion trail ---
var ballTrail = [];  // [{x,y,age}]

// --- Pálya háttérkép (tier-enként) + zöld-téglalap kalibráció (a kép arányában) ---
// A kép úgy rajzolódik, hogy a zöld-téglalapja PONTOSAN a pálya-keretre essen.
var pitchImg = new Image();
var pitchImgReady = false;
pitchImg.onload = function(){ pitchImgReady = true; };
pitchImg.src = 'assets/pitch1.jpg';
// zöld szélek (beljebb húzva ~5%, hogy a fehér keret a zöldön belülre essen)
var PITCH_GL = 0.135, PITCH_GR = 0.851, PITCH_GT = 0.148, PITCH_GB = 0.842;

// --- Pályavonal stílus (keret, felező, kör) ---
var LINE_ALPHA = 0.6;   // átlátszóság (kevésbé "világítós", illik a valós képhez)
var LINE_SCALE = 0.5;   // vonalvastagság a WL-hez képest (fele)
