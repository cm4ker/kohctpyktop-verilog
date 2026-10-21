import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch({channel:process.env.CI?undefined:'msedge',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.APP_URL??'http://127.0.0.1:5174/');
 await page.waitForFunction(()=>document.querySelector('#job-title').textContent==='KT411I');
 assert.equal(await page.locator('.original-link').count(),1);
 await page.click('#open-synth');const frame=page.frameLocator('#synth-frame');
 await frame.locator('#status.success').waitFor();await page.click('#new-module');
 await page.waitForFunction(()=>document.querySelector('#synth-frame').contentDocument.querySelector('.cm-content').textContent.includes('A0'));
 assert.match(await frame.locator('.cm-content').innerText(),/pin1.*A0/);
 await frame.locator('#example').click();await frame.locator('#status.success').waitFor();await frame.locator('#apply').click();
 await page.locator('#synth-dialog').waitFor({state:'hidden'});
 await page.selectOption('#speed','10000');await page.click('#run');await page.locator('#result.pass').waitFor();
 await page.click('#open-synth');
 const toggles=frame.locator('#library-manager input[type=checkbox]');assert.equal(await toggles.count(),4);for(let i=0;i<4;i++)assert.equal(await toggles.nth(i).isChecked(),false);
 await frame.locator('#example-edge').click();await frame.locator('#status.error').waitFor();
 await frame.getByText('Системный: positive_edge_detector.v',{exact:false}).locator('input').check();await frame.locator('#compile').click();await frame.locator('#status.success').waitFor();
 await frame.locator('#library-manager input[placeholder="Имя файла"]').fill('my_inverter.v');
 await frame.locator('textarea[aria-label="Код библиотечного модуля"]').fill('module my_inverter(input a,output z);assign z=~a;endmodule');
 await frame.getByRole('button',{name:'Сохранить модуль',exact:true}).click();
 await page.reload();await page.click('#open-synth');assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('kohctpyktop-library-v1')).users.filter(e=>e.name==='my_inverter.v').length),1);
 assert.equal(await frame.getByText('Системный: positive_edge_detector.v',{exact:false}).locator('input').isChecked(),true);
 await page.setViewportSize({width:390,height:844});await page.click('#close-synth');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(errors,[]);await mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/app.png',fullPage:true});
 console.log('Integrated game, level template, apply/grade, library persistence and mobile layout passed.');
}finally{await browser.close();}
