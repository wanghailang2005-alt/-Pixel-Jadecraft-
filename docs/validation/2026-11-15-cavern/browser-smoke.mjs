// Actual keyboard and pointer input in a dedicated QA browser. No state injection.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {connect,sleep} from '../2026-11-15-museum-craft/browser-driver.mjs';
const qa=await connect(Number(process.argv[2])),phase=process.argv[3]??'route';
const dir=new URL('./',import.meta.url);
const shot=name=>qa.screenshot(new URL(`${name}.png`,dir));
const save=()=>qa.evaluate(`JSON.parse(localStorage.getItem('pixel-jadecraft.save.v1'))`);
async function hold(code,key,duration=70,during){
  await qa.send('Input.dispatchKeyEvent',{type:'keyDown',code,key,windowsVirtualKeyCode:key===' '?32:key.toUpperCase().charCodeAt(0)});
  await sleep(duration);
  if(during)await shot(during);
  await qa.send('Input.dispatchKeyEvent',{type:'keyUp',code,key,windowsVirtualKeyCode:key===' '?32:key.toUpperCase().charCodeAt(0)});
  await sleep(220);
}
try{
  await qa.send('Page.bringToFront');
  if(await qa.evaluate(`Boolean(document.querySelector('.landscape-menu [data-action="continue"]'))`)){
    await qa.click('.landscape-menu [data-action="continue"]');await sleep(700);
  }
  if(phase==='route'){
    assert.equal((await save()).inventory.length,0);
    await shot('entrance-final');
    await hold('Space',' ',250,'entrance-jump');await sleep(700);
    await shot('entrance-landed');
    await hold('KeyA','a',1180);
    await shot('entrance-ladder');
    await hold('KeyW','w',5000);
    await shot('upper-route');
    await hold('KeyD','d',365);await hold('KeyS','s',1450);await hold('KeyD','d',240);
    await hold('KeyR','r');assert.deepEqual((await save()).mineSurvey,['C1']);
    await shot('first-vein-observed');
    await hold('Digit2','2');await hold('KeyE','e',1600);await hold('KeyD','d',205);
    await hold('Digit1','1');await hold('KeyE','e',380);
    assert.ok((await save()).inventory.some(item=>item.id==='C1-L'));
    await shot('first-jade');
    const state=await save();await fs.writeFile(new URL('actual-input-save.json',dir),JSON.stringify(state,null,2));
    console.log(JSON.stringify({phase,inventory:state.inventory,survey:state.mineSurvey,realInputs:true}));
  }
  if(phase==='restore'){
    const before=await save();
    await qa.send('Page.reload');await sleep(1600);
    await qa.click('.landscape-menu [data-action="continue"]');await sleep(500);
    const after=await save();assert.deepEqual(after.inventory,before.inventory);assert.deepEqual(after.mineVeins,before.mineVeins);assert.deepEqual(after.mineSurvey,before.mineSurvey);
    await shot('restored-entrance');
    await qa.send('Emulation.setDeviceMetricsOverride',{width:800,height:700,deviceScaleFactor:1,mobile:false});await sleep(400);
    await shot('entrance-small');assert.equal(await qa.evaluate(`document.documentElement.scrollWidth<=innerWidth`),true);
    await qa.click('[data-guide-toggle]');await shot('guide-small');
    await qa.send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
    console.log(JSON.stringify({phase,inventoryPreserved:true,finiteVeinsPreserved:true,smallViewport:true}));
  }
}finally{qa.close();}
