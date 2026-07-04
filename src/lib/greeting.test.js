// Dependency-free unit tests for the dashboard greeting logic.
// Run with:  node --test src/lib/greeting.test.js
import test from 'node:test';
import assert from 'node:assert/strict';

import { pickTimeGreeting, firstNameOf, buildGreeting } from './greeting.js';

test('pickTimeGreeting by hour of day', () => {
  assert.equal(pickTimeGreeting(0), 'Good morning');
  assert.equal(pickTimeGreeting(11), 'Good morning');
  assert.equal(pickTimeGreeting(12), 'Good afternoon');
  assert.equal(pickTimeGreeting(16), 'Good afternoon');
  assert.equal(pickTimeGreeting(17), 'Good evening');
  assert.equal(pickTimeGreeting(23), 'Good evening');
});

test('firstNameOf extracts the first name', () => {
  assert.equal(firstNameOf({ name: 'Sam Sales' }), 'Sam');
  assert.equal(firstNameOf({ name: '  Marie  Tremblay ' }), 'Marie');
  assert.equal(firstNameOf({ name: 'Cher' }), 'Cher');
});

test('firstNameOf is safe for missing/empty users', () => {
  assert.equal(firstNameOf(null), '');
  assert.equal(firstNameOf(undefined), '');
  assert.equal(firstNameOf({}), '');
  assert.equal(firstNameOf({ name: '' }), '');
});

test('buildGreeting includes the name when known', () => {
  assert.equal(buildGreeting({ name: 'Sam Sales' }, 9), 'Good morning, Sam');
  assert.equal(buildGreeting({ name: 'Ada Lovelace' }, 14), 'Good afternoon, Ada');
  assert.equal(buildGreeting({ name: 'Grace Hopper' }, 20), 'Good evening, Grace');
});

test('buildGreeting falls back to a nameless greeting', () => {
  assert.equal(buildGreeting(null, 9), 'Good morning');
  assert.equal(buildGreeting({}, 20), 'Good evening');
});
