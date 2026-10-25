'use strict';
// Pluggable status: a list of providers, each answering
//   read(member, now) -> { source, state?, activity?, lastActiveAt? } | null
// The first provider with a fresh `state` wins; lastActiveAt is the newest
// any provider reports. Without a fresh working/chatting state the bot is
// "on a break" (idle): if they're not on a task, they're idling.
//
// To add a source (e.g. an official Grok Bot activity API, if one appears),
// drop a file in src/providers/ and add it to PROVIDERS below.
const path = require('path');
const { EventEmitter } = require('events');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const PROVIDERS = [
  require('./providers/checkins')({ dir: path.join(ROOT, 'status', 'checkins') }),
  require('./providers/box-traces')({ root: process.env.AGENT_DATA || '/home/box/agent-data/agents' }),
];

// How each state appears in the office (reusing the original's animations):
// working -> at a desk, typing with a ⚙ bubble; chatting -> at a desk with
// a typing bubble; idle -> on a break in their own room or the chill zone.
const OFFICE_STATUS = { working: 'tool', chatting: 'typing', idle: 'done' };

class TeamStatus extends EventEmitter {
  constructor() {
    super();
    this.team = JSON.parse(fs.readFileSync(path.join(ROOT, 'team.json'), 'utf8'));
    this.startedAt = Date.now();
  }
  providers() { return PROVIDERS.map((p) => ({ id: p.id, describe: p.describe })); }
  start() {
    for (const p of PROVIDERS) for (const dir of p.watchPaths) {
      try { fs.watch(dir, () => this.emit('change')); } catch {}
    }
    return this;
  }
  sessions() {
    const now = Date.now();
    return this.team.team.map((m, i) => {
      let state = null, activity = null, source = null, last = 0;
      for (const p of PROVIDERS) {
        let r = null;
        try { r = p.read(m, now); } catch {}
        if (!r) continue;
        if (r.lastActiveAt) last = Math.max(last, r.lastActiveAt);
        if (!state && r.state) { state = r.state; activity = r.activity; source = r.source; }
      }
      const st = state || 'idle';
      return {
        key: `grokbot:${m.name.toLowerCase()}`,
        agent: 'grokbot',
        id: m.name.toLowerCase(),
        name: m.name,
        role: m.role,
        color: m.color,
        avatar: m.avatar || null,
        project: m.name,          // the label the office draws over each head
        state: st,
        status: OFFICE_STATUS[st],
        activity: activity || (st === 'chatting' ? `In the ${this.team.groupRoom} room` : null),
        source,
        lastEventAt: last || null,
        // Seat order: keeps everyone at the same desk between updates.
        startedAt: this.startedAt + (m.desk ?? i),
        turnStartedAt: null,
        subagent: false,
        parentId: null,
      };
    });
  }
}

module.exports = { TeamStatus };
