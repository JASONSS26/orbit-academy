#!/usr/bin/env node
/* set-role.js — promote or demote an account. Zero dependencies (Node built-ins only).
 *
 *   node tools/set-role.js                          list every account and its role
 *   node tools/set-role.js <email> instructor        promote
 *   node tools/set-role.js <email> student           demote
 *
 * WHY THIS EXISTS
 * A role is assigned exactly once, at registration: the FIRST account ever created becomes the
 * instructor and everyone after is a student (server.js, /api/register). There is deliberately no
 * API to change a role afterwards — an endpoint that grants instructor rights is the most valuable
 * privilege-escalation target the backend could possibly expose, and this course carries a real
 * auth surface. So role changes are an offline, filesystem-level operation: whoever can run this
 * already has full control of the data file anyway, so it grants nothing new.
 *
 * The common way to get stuck: someone registers a test account before the real instructor does,
 * and the instructor is then permanently a student with no way to reach the roster or the worksheet
 * editor. That is what this fixes.
 *
 * IMPORTANT — STOP THE SERVER FIRST. server.js holds the whole database in memory and rewrites the
 * file on every progress save, so a change made underneath a running server will be silently
 * clobbered the next time any student answers a question. This script refuses to guess: it warns if
 * the server looks live and always tells you to restart.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.resolve(__dirname, '..');
const FILE = process.env.ORBIT_DATA || path.join(ROOT, 'academy_data.json');

function die(msg) { console.error('ERROR: ' + msg); process.exit(1); }

if (!fs.existsSync(FILE)) {
  die('no data file at ' + FILE + '\n       Nobody has registered yet. Start the server and register — '
    + 'the first account\n       to register automatically becomes the instructor.');
}

let DB;
try { DB = JSON.parse(fs.readFileSync(FILE, 'utf8')); }
catch (e) { die('could not parse ' + FILE + ' — ' + e.message); }
const users = DB.users || {};
const list = Object.values(users);
if (!list.length) die('the data file has no accounts in it.');

const fmt = (u) => '  ' + (u.role === 'instructor' ? '★' : ' ') + ' '
  + String(u.name || '?').padEnd(22) + String(u.email || '?').padEnd(30)
  + String(u.role || '?').padEnd(11)
  + Object.keys(u.progress || {}).length + ' module(s) with progress';

function show(title) {
  console.log(title);
  list.sort((a, b) => (a.created || 0) - (b.created || 0)).forEach(u => console.log(fmt(u)));
  const n = list.filter(u => u.role === 'instructor').length;
  console.log('\n  ' + n + ' instructor' + (n === 1 ? '' : 's') + ', ' + (list.length - n) + ' student(s)');
}

// ---------------------------------------------------------------- list only
const email = (process.argv[2] || '').toLowerCase();
const role = process.argv[3];
if (!email) {
  show('Accounts in ' + path.relative(ROOT, FILE) + '  (★ = instructor, oldest first)');
  console.log('\nTo change one:\n  node tools/set-role.js <email> instructor'
    + '\n  node tools/set-role.js <email> student\n\nStop the server first.');
  process.exit(0);
}

if (role !== 'instructor' && role !== 'student') {
  die('second argument must be "instructor" or "student" (got ' + JSON.stringify(role) + ').\n'
    + '       Run with no arguments to list accounts.');
}

const target = list.find(u => String(u.email || '').toLowerCase() === email);
if (!target) {
  console.error('ERROR: no account with email ' + email + '\n');
  show('Accounts that DO exist:');
  process.exit(1);
}

if (target.role === role) {
  console.log(target.name + ' <' + target.email + '> is already ' + role + '. Nothing to do.');
  process.exit(0);
}

/* Refuse to leave the course with no instructor — nobody could reach the roster or the worksheet
   editor, and there is no way back except this script. */
if (role === 'student') {
  const others = list.filter(u => u.role === 'instructor' && u !== target).length;
  if (!others) die('that is the only instructor. Promote someone else first, or the course would be\n'
    + '       left with no access to the roster or the worksheet editor.');
}

/* Probe for a local server as a courtesy hint. This is NOT authoritative: the server may be running
   under a different port, on another machine sharing the folder, or otherwise invisible from here.
   The reliable check is the read-back below, which catches the clobber after the fact. */
const PORT = process.env.PORT || 8080;
const probe = http.get({ host: '127.0.0.1', port: PORT, path: '/api/me', timeout: 400 }, (res) => {
  res.resume(); write(true);
});
probe.on('error', () => write(false));
probe.on('timeout', () => { probe.destroy(); write(false); });

function write(serverSeen) {
  const before = target.role;
  target.role = role;

  // atomic-ish write, and keep a backup like the server does
  try {
    if (fs.existsSync(FILE)) fs.copyFileSync(FILE, FILE + '.bak');
    const tmp = FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(DB, null, 2));
    fs.renameSync(tmp, FILE);
  } catch (e) { die('could not write ' + FILE + ' — ' + e.message); }

  console.log('wrote ' + target.name + ' <' + target.email + '>: ' + before + ' → ' + role);
  if (serverSeen) {
    console.log('\n⚠  A server is answering on port ' + PORT + ' RIGHT NOW. It holds the database in');
    console.log('   memory and will undo this the next time anything saves. Stop it, re-run this');
    console.log('   command, then start it again.');
  }

  /* THE RELIABLE CHECK. A running server rewrites this file wholesale from its in-memory copy on
     every progress save, so an edit underneath it disappears — silently, and possibly seconds later.
     Re-read from disk after a pause and confirm the change actually survived. This is how the
     problem was originally caught: the role reverted to "student" with no error anywhere. */
  console.log('\nverifying the change stuck (a running server would undo it)…');
  setTimeout(() => {
    let fresh;
    try { fresh = JSON.parse(fs.readFileSync(FILE, 'utf8')); }
    catch (e) { die('could not re-read ' + FILE + ' — ' + e.message); }
    const now = Object.values(fresh.users || {})
      .find(u => String(u.email || '').toLowerCase() === email);
    if (!now) die('the account vanished from the file — something else is writing to it.');

    if (now.role === role) {
      console.log('✓ CONFIRMED — ' + now.name + ' is now ' + role + '.');
      console.log('  Log out and back in (or reload the hub) to see it.');
      console.log('  Previous file kept as ' + path.basename(FILE) + '.bak');
    } else {
      console.log('✗ REVERTED — the file now says "' + now.role + '" again.');
      console.log();
      console.log('  A RUNNING SERVER OVERWROTE IT. It keeps every account in memory and rewrites');
      console.log('  this file whenever anyone saves progress, so edits made underneath it are lost.');
      console.log();
      console.log('  Do this, in order:');
      console.log('    1. Stop the server — close the launcher window, or press Ctrl-C in it.');
      console.log('    2. node tools/set-role.js ' + email + ' ' + role);
      console.log('    3. Start the server again.');
      console.log('    4. Log out and back in.');
      process.exitCode = 1;
    }
    // re-list from the authoritative on-disk copy
    list.length = 0; Object.values(fresh.users || {}).forEach(u => list.push(u));
    show('\nAccounts on disk now:');
  }, 1500);
}
