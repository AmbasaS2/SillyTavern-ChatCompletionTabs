import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

// Test the exact browser class with deterministic fake visibility and timer APIs.
const script = readFileSync(new URL('./components/tab-manager.js', import.meta.url), 'utf8')
  .replace('export class TabManager', 'class TabManager');

function makeHarness(initiallyHidden = false) {
  let hidden = initiallyHidden;
  let timerId = 0;
  let checks = 0;
  const intervals = new Map();
  const timeouts = [];
  const listeners = new Map();

  const document = {
    get hidden() { return hidden; },
    addEventListener(name, callback) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(callback);
    },
    removeEventListener(name, callback) { listeners.get(name)?.delete(callback); },
    querySelectorAll: () => []
  };
  const context = {
    document,
    setInterval(callback, delay) {
      assert.equal(delay, 2000, 'foreground polling must retain its original cadence');
      const id = ++timerId;
      intervals.set(id, callback);
      return id;
    },
    clearInterval(id) { intervals.delete(id); },
    setTimeout(callback, delay) { timeouts.push({ callback, delay }); return ++timerId; },
    console
  };
  const TabManager = vm.runInNewContext(script + '\nTabManager', context);
  const manager = new TabManager({
    tabs: { parameters: {}, prompts: {} },
    checkCondition: () => true
  });
  manager.checkConditionAndInitialize = () => { checks++; };

  return {
    manager, intervals, timeouts, listeners,
    setHidden(value) { hidden = value; },
    emitVisibility() { for (const callback of listeners.get('visibilitychange') || []) callback(); },
    tick() { for (const callback of [...intervals.values()]) callback(); },
    get checks() { return checks; }
  };
}

test('foreground keeps original two-second polling and initial check', () => {
  const h = makeHarness(false);
  assert.equal(h.intervals.size, 1);
  assert.equal(h.timeouts[0].delay, 300);
  h.timeouts[0].callback();
  h.tick();
  assert.equal(h.checks, 2);
  h.manager.destroy();
  assert.equal(h.intervals.size, 0);
  assert.equal(h.listeners.get('visibilitychange')?.size, 0);
});

test('hidden pages do not poll, and become ready immediately when visible again', () => {
  const h = makeHarness(false);
  h.setHidden(true);
  h.emitVisibility();
  assert.equal(h.intervals.size, 0);
  h.timeouts[0].callback();
  assert.equal(h.checks, 0, 'initial delayed check should skip hidden pages');

  h.setHidden(false);
  h.emitVisibility();
  assert.equal(h.intervals.size, 1);
  assert.equal(h.checks, 1, 'return to tab immediately rechecks API conditions');
  h.emitVisibility();
  assert.equal(h.intervals.size, 1, 'visibility events never duplicate polling intervals');
  h.tick();
  assert.equal(h.checks, 3);
  h.manager.destroy();
});

test('initially hidden and disabled managers only poll after a real foreground re-enable', () => {
  const h = makeHarness(true);
  assert.equal(h.intervals.size, 0);
  h.setHidden(false);
  h.emitVisibility();
  assert.equal(h.intervals.size, 1);
  assert.equal(h.checks, 1);

  h.manager.setEnabled(false);
  assert.equal(h.intervals.size, 0);
  h.setHidden(true);
  h.emitVisibility();
  h.setHidden(false);
  h.emitVisibility();
  assert.equal(h.intervals.size, 0, 'disabled manager never restarts in response to visibility');

  h.manager.setEnabled(true);
  assert.equal(h.intervals.size, 1);
  assert.equal(h.checks, 2);
  h.manager.destroy();
  assert.equal(h.intervals.size, 0);
  assert.equal(h.listeners.get('visibilitychange')?.size, 0);
});
