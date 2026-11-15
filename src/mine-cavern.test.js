import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMine, moveMiner, WALK_SPEED, TILE, createMining } from './mining.js';
import { GameStore, freshState, SAVE_KEY } from './state.js';
import { mineRouteHint } from './mine-exploration.js';

function walkTo(body, x, world) {
  for (let frame=0; Math.abs(body.x-x)>.01 && frame<900; frame++) {
    body=moveMiner(body,{x:Math.sign(x-body.x),y:0},Math.min(16,Math.abs(x-body.x)/WALK_SPEED*1000),world);
    assert.ok(world.canStand(body.x,body.y));
  }
  assert.ok(Math.abs(body.x-x)<.01,`walking stopped at ${body.x}, wanted ${x}`);
  return body;
}

test('entrance: wide floor supports a full crossing, jump and real right buttress collision',()=>{
  const world=generateMine();
  let body={...world.spawn,velocityY:0,climbing:false};
  body=walkTo(body,80,world);assert.ok(Math.abs(body.y-864)<.01);
  body=walkTo(body,580,world);assert.ok(Math.abs(body.y-864)<.01);
  body=moveMiner(body,{x:0,y:0,jump:true},16,world);
  assert.ok(body.y<864 && body.velocityY<0);
  for(let frame=0;frame<70;frame++)body=moveMiner(body,{x:0,y:0},16,world);
  assert.ok(Math.abs(body.y-864)<.01);
  for(let frame=0;frame<100;frame++)body=moveMiner(body,{x:1,y:0},16,world);
  assert.ok(body.x<=596.001 && body.x>=595.99,'right wall is real collision');
  assert.equal(world.map[25][19],TILE.STONE);
});

test('entrance: actual walking and climbing from the new spawn reaches every original landing',()=>{
  for(const id of ['C1','C2','C3','C4','C5','C6']){
    const world=generateMine(),entrance=world.ladders.find(l=>l.id==='entrance'),ladder=world.ladders.find(l=>l.id===id);
    let body={...world.spawn,velocityY:0,climbing:false};
    assert.match(mineRouteHint(world,body,world.clusters.find(c=>c.id===id)),/向左.*入口木梯/);
    body=walkTo(body,entrance.x,world);
    for(let frame=0;frame<350;frame++)body=moveMiner(body,{x:0,y:-1},16,world);
    assert.equal(body.y,entrance.top);
    body=walkTo(body,ladder.x,world);
    for(let frame=0;frame<400;frame++)body=moveMiner(body,{x:0,y:1},16,world);
    assert.equal(body.x,ladder.x);assert.equal(body.y,ladder.bottom,`${id} cannot reach landing`);
    assert.ok(world.canStand(body.x,body.y));
  }
});

test('entrance: an old C4 waiting drop keeps its position, remains finite, and can still be recovered',()=>{
  const old=freshState();old.location='mine';old.mineVeins[3]=[true,false];old.mineSurvey=['C4'];
  old.pendingDrops=[{id:'C4-L',material:'jadeite',x:656,y:688}];
  const disk=new Map([[SAVE_KEY,JSON.stringify(old)]]);
  const store=new GameStore({getItem:k=>disk.get(k)??null,setItem:(k,v)=>disk.set(k,v)});store.resume();
  const world=generateMine({mineVeins:store.state.mineVeins}),mining=createMining(store,world);
  assert.deepEqual(mining.drops.get('C4-L'),old.pendingDrops[0]);
  assert.equal(world.map[21][20],TILE.AIR);assert.equal(world.map[21][21],TILE.JADE_VEIN);
  // Reopen the headroom above this old waiting drop, as on the existing map.
  world.map[20][20]=TILE.AIR;
  const body={x:656,y:704};assert.ok(world.canStand(body.x,body.y));
  assert.equal(mining.pickup(body).collected.length,1);
  assert.equal(mining.pickup(body).collected.length,0);
  assert.deepEqual(store.state.inventory,[{id:'C4-L',material:'jadeite'}]);
  assert.equal(store.state.pendingDrops.length,0);
});
