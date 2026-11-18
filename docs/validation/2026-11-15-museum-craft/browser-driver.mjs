// Local review helper. Connect only to the isolated agent-browser QA session.
import fs from 'node:fs/promises';
export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
export async function connect(port = 52366) {
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const target = targets.find(p => p.type === 'page' && p.url.includes('127.0.0.1:'));
  if (!target) throw new Error('Local game review page is not open');
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
  const pending = new Map(), handlers = new Map(); let sequence = 0;
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    const p = pending.get(message.id);
    if (p) { pending.delete(message.id); message.error ? p.reject(message.error) : p.resolve(message.result); }
    handlers.get(message.method)?.forEach(handler => handler(message.params));
  });
  const on = (method, handler) => {
    if (!handlers.has(method)) handlers.set(method, new Set());
    handlers.get(method).add(handler);
    return () => handlers.get(method).delete(handler);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  async function click(selector) {
    const box = await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing '+${JSON.stringify(selector)});e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return{x:b.x+b.width/2,y:b.y+b.height/2};})()`);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...box, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...box, button: 'left', clickCount: 1 });
    await sleep(140);
  }
  const screenshot = async path => {
    const result = await send('Page.captureScreenshot', { format: 'png' });
    await fs.writeFile(path, Buffer.from(result.data, 'base64'));
  };
  return {send, on, evaluate, click, screenshot, close: () => socket.close()};
}
