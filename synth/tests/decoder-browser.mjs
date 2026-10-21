import {chromium} from '../../node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173/');await page.click('#example-decoder');
 await page.waitForFunction(()=>document.querySelector('#status').className==='success');
 const net=JSON.parse(await page.locator('#ir').textContent());assert.equal(net.delayLines.length,0);assert.equal(net.transistors.length,8);assert.equal(await page.locator('#copy').isEnabled(),true);
 await page.setViewportSize({width:390,height:844});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile overflow');
 assert.deepEqual(errors,[]);console.log('Decoder UI: four output branches, export enabled, no browser errors, mobile fits.');
}finally{await browser.close();}
