import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeUrl,
  isValidHttpUrl,
  getDomain,
  getOrigin,
  buildSearchUrl,
} from '../src/utils/url.js';

test('normalizeUrl añade https://', () => {
  assert.equal(normalizeUrl('youtube.com'), 'https://youtube.com/');
});

test('normalizeUrl respeta esquema existente', () => {
  assert.equal(normalizeUrl('https://example.com/path'), 'https://example.com/path');
});

test('normalizeUrl devuelve vacío para no válidas', () => {
  assert.equal(normalizeUrl(''), '');
  assert.equal(normalizeUrl('   '), '');
});

test('isValidHttpUrl valida http y https', () => {
  assert.ok(isValidHttpUrl('https://example.com'));
  assert.ok(isValidHttpUrl('http://example.com'));
  assert.equal(isValidHttpUrl('ftp://example.com'), false);
  assert.equal(isValidHttpUrl('no-scheme'), true); // se normaliza
});

test('getDomain y getOrigin', () => {
  assert.equal(getDomain('https://mail.google.com/x'), 'mail.google.com');
  assert.equal(getOrigin('https://mail.google.com/x'), 'https://mail.google.com');
});

test('buildSearchUrl sustituye query en cada motor', () => {
  assert.equal(buildSearchUrl('google', 'hola mundo'), 'https://www.google.com/search?q=hola%20mundo');
  assert.equal(buildSearchUrl('duckduckgo', 'a'), 'https://duckduckgo.com/?q=a');
  assert.equal(buildSearchUrl('custom', 'x', 'https://mi.bus/consulta?q={query}'), 'https://mi.bus/consulta?q=x');
});

test('buildSearchUrl con motor desconocido usa Google', () => {
  assert.ok(buildSearchUrl('desconocido', 'q').includes('google.com'));
});