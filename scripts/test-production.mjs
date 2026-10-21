import {spawn} from 'node:child_process';
import {staticServer} from './static-server.mjs';
const server=staticServer('dist');await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try{const child=spawn(process.execPath,['tests/browser.mjs'],{stdio:'inherit',env:{...process.env,APP_URL:`http://127.0.0.1:${server.address().port}/kohctpyktop/`}});process.exitCode=await new Promise(resolve=>child.on('exit',code=>resolve(code??1)));}finally{server.closeAllConnections();server.close();}
