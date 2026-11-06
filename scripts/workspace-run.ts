import { spawn, spawnSync } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { npmCommand } from './workspace-common.ts';

export interface Service { name: string; cwd: string; script: string }

function stopTree(child: ChildProcess): void {
  if (!child.pid || child.exitCode !== null) return;
  if (process.platform === 'win32') {
    const result = spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true, timeout: 5000 });
    if (result.error || result.status !== 0) child.kill('SIGTERM');
  } else {
    try { process.kill(-child.pid, 'SIGTERM'); } catch { child.kill('SIGTERM'); }
    setTimeout(() => { try { process.kill(-child.pid!, 'SIGKILL'); } catch { /* Already stopped. */ } }, 3000).unref();
  }
}

export async function runServices(services: Service[]): Promise<void> {
  if (services.length === 0) throw new Error('No runnable services selected.');
  const children: ChildProcess[] = [];
  let stopping = false;
  let exitCode = 0;
  const stop = (code: number) => {
    if (stopping) return;
    stopping = true;
    exitCode = code;
    console.log('Stopping local services...');
    for (const child of children) stopTree(child);
  };
  const onInterrupt = () => stop(130);
  const onTerminate = () => stop(143);
  const onInput = (chunk: Buffer) => { if (chunk.includes(3)) stop(130); };
  const wasRaw = process.stdin.isRaw;
  if (process.stdin.isTTY) process.stdin.setRawMode(true);
  process.stdin.on('data', onInput);
  process.stdin.resume();
  process.once('SIGINT', onInterrupt);
  process.once('SIGTERM', onTerminate);
  if (process.platform === 'win32') process.once('SIGBREAK', onInterrupt);
  try {
    await Promise.all(services.map((service) => new Promise<void>((done) => {
      console.log(`Starting ${service.name}; Ctrl+C stops the service group.`);
      const [command, args] = npmCommand(['run', service.script]);
      const child = spawn(command, args, { cwd: service.cwd, stdio: ['ignore', 'inherit', 'inherit'], detached: process.platform !== 'win32' });
      children.push(child);
      child.once('error', (error) => { console.error(error.message); stop(1); done(); });
      child.once('exit', (code) => {
        if (!stopping) { console.error(`${service.name} exited; stopping the other services.`); stop(code || 1); }
        done();
      });
    })));
  } finally {
    for (const child of children) stopTree(child);
    process.removeListener('SIGINT', onInterrupt);
    process.removeListener('SIGTERM', onTerminate);
    if (process.platform === 'win32') process.removeListener('SIGBREAK', onInterrupt);
    process.stdin.removeListener('data', onInput);
    if (process.stdin.isTTY) process.stdin.setRawMode(Boolean(wasRaw));
    process.stdin.pause();
  }
  process.exitCode = exitCode;
}
