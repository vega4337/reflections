// Offline level authoring: deterministic search, then export static level data.
// Run from the repository root with `node scripts/design-levels.js`.
import { writeFileSync } from 'node:fs';
import { buildLevel, traceBeam, raySegment } from '../optics.js';
let seed = 433738;
const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
const choose = items => items[Math.floor(random() * items.length)];
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function pointSegment(p, a, b) {
  const t = Math.max(0, Math.min(1, ((p.x-a.x)*(b.x-a.x)+(p.y-a.y)*(b.y-a.y)) / distance(a,b)**2));
  return distance(p, { x: a.x+t*(b.x-a.x), y: a.y+t*(b.y-a.y) });
}
const edges = r => {
  const p = [{x:r.x,y:r.y},{x:r.x+r.width,y:r.y},{x:r.x+r.width,y:r.y+r.height},{x:r.x,y:r.y+r.height}];
  return p.map((a,i)=>[a,p[(i+1)%4]]);
};
function intersects(a,b,r) {
  const length=distance(a,b), direction={x:(b.x-a.x)/length,y:(b.y-a.y)/length};
  return edges(r).some(edge=>{const t=raySegment(a,direction,...edge);return t!==null && t<length;});
}
const expand = (r, amount) => ({x:r.x-amount,y:r.y-amount,width:r.width+amount*2,height:r.height+amount*2});
const inside = (p,r) => p.x>=r.x && p.x<=r.x+r.width && p.y>=r.y && p.y<=r.y+r.height;
function clearObstacle(rect, points, clearance) {
  if (points.some(p=>inside(p,expand(rect,48)))) return false;
  return points.slice(1).every((p,i)=>!intersects(points[i],p,expand(rect,clearance)));
}
function route(count, diagonalMinimum) {
  const points = [{x:80,y:choose([120,200,300,400,480])}];
  let heading=0;
  for(let i=0;i<count+1;i++) {
    let found=false;
    for(let attempt=0;attempt<110;attempt++) {
      const nextHeading=i===0?0:choose(Array.from({length:36},(_,i)=>i*10));
      const turn=Math.abs(((nextHeading-heading+540)%360)-180);
      if(i>0 && (turn<40 || turn>140)) continue;
      const length=choose([140,160,180,200,220,240,260,280,300,320,360,400,440]);
      const from=points.at(-1), angle=nextHeading*Math.PI/180;
      const p={x:from.x+Math.cos(angle)*length,y:from.y+Math.sin(angle)*length};
      if(p.x<85 || p.x>865 || p.y<85 || p.y>510) continue;
      if(points.some(q=>distance(p,q)<110)) continue;
      if(points.slice(0,-1).some(q=>pointSegment(q,from,p)<52)) continue;
      if(points.slice(1).some((q,k)=>pointSegment(p,points[k],q)<52)) continue;
      points.push(p);heading=nextHeading;found=true;break;
    }
    if(!found)return null;
  }
  const spec={route:points.map(p=>[p.x,p.y])};
  const level=buildLevel(spec);
  const diagonal=level.mirrors.filter(m=>Math.abs(m.solution/45-Math.round(m.solution/45))>.01).length;
  if(diagonal<diagonalMinimum)return null;
  return points;
}
function obstaclesFor(points, count, clearance) {
  const candidates=[];
  for(let i=0;i<1800;i++) {
    const rect={x:40+Math.floor(random()*42)*20,y:40+Math.floor(random()*25)*20,width:choose([20,40,60,80,100]),height:choose([40,60,80,100,120,160])};
    if(rect.x+rect.width>920 || rect.y+rect.height>550 || !clearObstacle(rect,points,clearance))continue;
    candidates.push(rect);
  }
  const shortcuts=[];
  for(let a=0;a<points.length-2;a++)for(let b=a+2;b<points.length;b++)shortcuts.push({a:points[a],b:points[b]});
  const obstacles=[];
  for(let i=0;i<count;i++) {
    const scored=candidates.filter(r=>!obstacles.some(o=>!(r.x>o.x+o.width+10 || r.x+r.width<o.x-10 || r.y>o.y+o.height+10 || r.y+r.height<o.y-10)))
      .map(r=>({r,score:shortcuts.reduce((sum,s)=>sum+(intersects(s.a,s.b,r)?1:0),0)})).sort((a,b)=>b.score-a.score);
    if(!scored.length || scored[0].score===0)break;
    const selected=scored[0].r;obstacles.push(selected);
    for(let j=shortcuts.length-1;j>=0;j--)if(intersects(shortcuts[j].a,shortcuts[j].b,selected))shortcuts.splice(j,1);
  }
  return obstacles;
}
function shortestRoute(points, obstacles) {
  const distances=points.map(()=>Infinity), queue=[1];distances[1]=1;
  while(queue.length) {
    const from=queue.shift();
    for(let to=1;to<points.length;to++) {
      if(from===to || distances[to]<=distances[from]+1)continue;
      if(obstacles.some(r=>intersects(points[from],points[to],r)))continue;
      distances[to]=distances[from]+1;queue.push(to);
    }
  }
  return distances.at(-1)-1;
}
const chapters = [
  {difficulty:'Oblique thinking',titles:['Off the grid','The slant of light','Hidden passage','Changing course','The long way home'],description:'The familiar right angles give way to diagonal paths. Follow the open space between the barriers.'},
  {difficulty:'Interwoven',titles:['Crossing paths','A delicate balance','The switchback','Beyond the bend','Threads of light'],description:'Six reflections weave across the board. Crossing beams pass through each other; barriers do not.'},
  {difficulty:'Labyrinth',titles:['Into the maze','The narrow way','A second look','A path less obvious','The turning point'],description:'Plan several turns ahead. The nearest mirror is not always the next step toward the receiver.'},
  {difficulty:'Precision',titles:['Through the keyhole','Quiet complexity','The hidden corridor','A fine line','Perfect alignment'],description:'Tighter passages demand a deliberate angle. Build from the source, checking each outgoing reflection.'},
  {difficulty:'Mastery',titles:['Nine possibilities','The far side','An unexpected turn','Order in the chaos','The luminous labyrinth'],description:'Nine mirrors form a long chain around the barriers. Work patiently; every reflection has a purpose.'},
  {difficulty:'The final light',titles:['Tenfold','The last passage','A beautiful complication','Almost infinite','The whole spectrum'],description:'Ten mirrors, intricate angles, and narrow passages. Trace the light through the entire constellation.'},
];
const output=[];
for(let index=0;index<30;index++) {
  const tier=Math.floor(index/5), within=index%5, mirrorCount=5+tier;
  const clearance=30-index*0.5;
  let best=null;
  for(let attempt=0;attempt<60000;attempt++) {
    const points=route(mirrorCount,Math.min(mirrorCount,3+tier));
    if(!points)continue;
    const obstacles=obstaclesFor(points,5+tier*2+Math.floor(within/2),clearance);
    if(obstacles.length<2+Math.floor(tier/2))continue;
    const minimumReflections=3+tier;
    if(shortestRoute(points,obstacles)<minimumReflections)continue;
    const spec={title:chapters[tier].titles[within],difficulty:chapters[tier].difficulty,description:chapters[tier].description,clearance,minimumReflections,route:points.map(p=>[p.x,p.y]),obstacles};
    const level=buildLevel(spec);
    // Round the playable solution to the same 5-degree steps offered by the UI.
    const solved={...level,mirrors:level.mirrors.map(m=>({...m,angle:Math.round(m.solution/5)*5}))};
    const result=traceBeam(solved);
    if(!result.solved || result.hits.length!==mirrorCount || result.hits.some((hit,i)=>hit!==i))continue;
    if(traceBeam(level).solved || traceBeam(level).hits[0]!==0)continue;
    const prefix=structuredClone(level);
    let earlyWin=false;
    for(let i=0;i<mirrorCount-1;i++) {
      prefix.mirrors[i].angle=solved.mirrors[i].angle;
      if(traceBeam(prefix).solved) { earlyWin=true;break; }
    }
    if(earlyWin)continue;
    if(level.mirrors.some((_,i)=>traceBeam({...solved,mirrors:solved.mirrors.filter((_,j)=>i!==j)}).solved))continue;
    // Reject layouts whose receiver is visible directly from the first mirror.
    if(!obstacles.some(r=>intersects(points[1],points.at(-1),r)))continue;
    best=spec;break;
  }
  if(!best)throw new Error(`Unable to design experiment ${index+9}`);
  output.push(best);
  console.log(`Experiment ${index+9}: ${mirrorCount} mirrors, ${best.obstacles.length} barriers, ${clearance}px route clearance`);
}
writeFileSync(new URL('../advanced-levels.js',import.meta.url),`// Static, deterministic layouts authored by scripts/design-levels.js.\nexport const advancedLevels = ${JSON.stringify(output,null,2)};\n`);
