#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

let raw = '';
for await (const chunk of process.stdin) raw += chunk;
const request = raw ? JSON.parse(raw) : {};
const fixture = JSON.parse(await readFile(new URL('../data/index/opencrab-real-project-run-sample.json', import.meta.url), 'utf8'));
console.error(`mock live OpenCrab command query=${request.query ?? ''}`);
console.log(JSON.stringify({
  ...fixture,
  status: 'ok',
  task: request.query || fixture.task,
  command_mock: true
}));
