
var W, H, GY, GH, WL;
var PR;   // kapus pálcika fél-magasság
var MR;   // mezőnyjátékos pálcika fél-magasság (rövidebb)
var PW;   // pálcika szélesség

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
