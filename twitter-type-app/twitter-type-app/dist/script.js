/* ---------- domain logic (users, tweets, follows) ---------- */
const LIMIT = 280;
const KEY = 'murmur.v1';
let S;

function seed() {
  const now = Date.now(), m = 60000, h = 3600000, d = 86400000;
  const users = {
    u_you:  { id:'u_you',  name:'You',          handle:'you',        bio:'Just setting up my Murmur. Say hi.', location:'', hue:172, joined: now - 2*d },
    u_maya: { id:'u_maya', name:'Maya Okafor',  handle:'maya_codes', bio:'Backend dev. Rewrites things in Rust, then quietly rewrites them back.', location:'Lagos', hue:262, joined: now - 400*d },
    u_ravi: { id:'u_ravi', name:'Ravi Menon',   handle:'ravi_runs',  bio:'Marathon training, one bad knee at a time.', location:'Kochi', hue:18, joined: now - 310*d },
    u_lena: { id:'u_lena', name:'Lena Hartmann',handle:'lenabakes',  bio:'Sourdough, spreadsheets, and strong opinions about hydration ratios.', location:'Leipzig', hue:38, joined: now - 520*d },
    u_omar: { id:'u_omar', name:'Omar Haddad',  handle:'omar_maps',  bio:'Cartographer. Collector of old transit maps and new coffee shops.', location:'Amman', hue:200, joined: now - 240*d },
    u_sofia:{ id:'u_sofia',name:'Sofia Brandt', handle:'sofiadraws', bio:'Illustrator. Ink first, panic later.', location:'Gothenburg', hue:330, joined: now - 150*d },
    u_jun:  { id:'u_jun',  name:'Jun Tanaka',   handle:'jun_tinkers',bio:'Soldering irons and tiny keyboards.', location:'Osaka', hue:140, joined: now - 90*d }
  };
  const T = (id, uid, text, ago, likes, comments) => ({ id, uid, text, ts: now - ago, edited:false, likes: likes||[], comments: comments||[] });
  const C = (id, uid, text, ago) => ({ id, uid, text, ts: now - ago });
  const tweets = [
    T('t1','u_maya','Spent the morning deleting 400 lines of code and the tests still pass. Best commit of the week. #refactor', 12*m, ['u_omar','u_jun','u_you'], [C('c1','u_jun','Deleting code is the only real productivity metric.', 8*m), C('c2','u_omar','Send help, I have a 3,000 line function.', 5*m)]),
    T('t2','u_ravi','Long run done: 28 km at an easy pace. Knee held up. Tomorrow is rest and an unreasonable amount of rice. #marathon', 55*m, ['u_lena','u_maya']),
    T('t3','u_lena','Day 6 of the starter. It finally doubled in four hours. I am not being dramatic, I cried a little. #sourdough', 2*h, ['u_ravi','u_sofia','u_omar','u_you'], [C('c3','u_sofia','Photo or it did not happen.', 100*m)]),
    T('t4','u_omar','Found a 1974 tram map of the city in a flea market bin. Half the lines no longer exist. Mapping the ghosts this weekend. #maps', 3*h, ['u_maya','u_you','u_jun','u_lena']),
    T('t5','u_sofia','Sketchbook rule: no erasers for a month. Every mistake becomes part of the drawing. Day 11 and there is a lot of cat. #drawing', 5*h, ['u_lena']),
    T('t6','u_jun','Built a 36-key split keyboard on the kitchen table. One switch is dead, and I am calling it a feature. @maya_codes you need one.', 7*h, ['u_maya','u_sofia'], [C('c4','u_maya','Already ordering the parts.', 6*h)]),
    T('t7','u_you','Hello Murmur! Following a few people to see how the feed behaves.', 9*h, ['u_maya']),
    T('t8','u_maya','Hot take: the best logging library is the one your whole team actually reads. #backend', 20*h, ['u_jun','u_omar']),
    T('t9','u_ravi','Reminder that shoes have a lifespan and mine passed it 200 km ago.', 26*h),
    T('t10','u_omar','Coffee shop rating system: a place is good if I forget to check my phone. Currently one place in the whole city qualifies.', 30*h, ['u_lena']),
    T('t11','u_lena','Hydration ratio of 78% is not a personality, but it is close to mine.', 2*d, ['u_sofia','u_ravi']),
    T('t12','u_jun','Reflowed a board with a toaster oven today. It works. Do not tell the kitchen.', 3*d, ['u_omar','u_maya','u_you'])
  ];
  const follows = {
    u_you: ['u_maya','u_omar'],
    u_maya: ['u_jun','u_omar','u_you'],
    u_ravi: ['u_lena','u_maya'],
    u_lena: ['u_sofia','u_ravi','u_omar'],
    u_omar: ['u_maya','u_lena'],
    u_sofia: ['u_lena'],
    u_jun: ['u_maya','u_omar','u_sofia']
  };
  return { users, tweets, follows, seq: 100 };
}

const nid = p => { S.seq = (S.seq || 0) + 1; return p + Date.now().toString(36) + S.seq; };
const clean = t => String(t == null ? '' : t).replace(/\r/g, '').trim();
const findTweet = id => S.tweets.find(t => t.id === id);
const userByHandle = h => Object.values(S.users).find(u => u.handle.toLowerCase() === String(h).toLowerCase());
const initials = n => n.trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';

function postTweet(uid, text) {
  const t = clean(text);
  if (!S.users[uid] || !t || t.length > LIMIT) return null;
  const tw = { id: nid('t'), uid, text: t, ts: Date.now(), edited: false, likes: [], comments: [] };
  S.tweets.unshift(tw);
  return tw;
}
function editTweet(id, uid, text) {
  const tw = findTweet(id), t = clean(text);
  if (!tw || tw.rtOf || tw.uid !== uid || !t || t.length > LIMIT) return false;
  if (t !== tw.text) { tw.text = t; tw.edited = true; }
  return true;
}
function deleteTweet(id, uid) {
  const tw = findTweet(id);
  if (!tw || tw.uid !== uid) return false;
  S.tweets = S.tweets.filter(t => t.id !== id && t.rtOf !== id);
  return true;
}
function toggleLike(id, uid) {
  const tw = findTweet(id);
  if (!tw || tw.rtOf || !S.users[uid]) return false;
  const i = tw.likes.indexOf(uid);
  if (i >= 0) tw.likes.splice(i, 1); else tw.likes.push(uid);
  return true;
}
const rtEntry = (id, uid) => S.tweets.find(t => t.rtOf === id && t.uid === uid);
function toggleRetweet(id, uid) {
  const tw = findTweet(id);
  if (!tw || tw.rtOf || !S.users[uid]) return false;
  const ex = rtEntry(id, uid);
  if (ex) S.tweets = S.tweets.filter(t => t !== ex);
  else S.tweets.unshift({ id: nid('r'), uid, rtOf: id, ts: Date.now() });
  return true;
}
function addComment(id, uid, text) {
  const tw = findTweet(id), t = clean(text);
  if (!tw || tw.rtOf || !S.users[uid] || !t || t.length > LIMIT) return null;
  const c = { id: nid('c'), uid, text: t, ts: Date.now() };
  tw.comments.push(c);
  return c;
}
function deleteComment(tid, cid, uid) {
  const tw = findTweet(tid);
  if (!tw) return false;
  const c = tw.comments.find(x => x.id === cid);
  if (!c || c.uid !== uid) return false;
  tw.comments = tw.comments.filter(x => x.id !== cid);
  return true;
}
const followingOf = uid => (S.follows[uid] || []).filter(x => S.users[x]);
const followersOf = uid => Object.keys(S.follows).filter(k => S.users[k] && (S.follows[k] || []).includes(uid));
const isFollowing = (a, b) => (S.follows[a] || []).includes(b);
function toggleFollow(a, b) {
  if (a === b || !S.users[a] || !S.users[b]) return false;
  const list = S.follows[a] = S.follows[a] || [];
  const i = list.indexOf(b);
  if (i >= 0) list.splice(i, 1); else list.push(b);
  return true;
}
function feedFor(uid, mode) {
  let list = S.tweets;
  if (mode === 'following') {
    const set = new Set([uid, ...followingOf(uid)]);
    list = list.filter(t => {
      if (!set.has(t.uid)) return false;
      if (t.rtOf) { const o = findTweet(t.rtOf); if (!o || set.has(o.uid)) return false; }
      return true;
    });
  }
  return list.filter(t => !t.rtOf || findTweet(t.rtOf)).slice().sort((a, b) => b.ts - a.ts);
}
const tweetsOf = uid => S.tweets.filter(t => t.uid === uid && (!t.rtOf || findTweet(t.rtOf))).sort((a, b) => b.ts - a.ts);
const likedBy = uid => S.tweets.filter(t => !t.rtOf && t.likes.includes(uid)).sort((a, b) => b.ts - a.ts);
const countOwnTweets = uid => S.tweets.filter(t => t.uid === uid && !t.rtOf).length;

function validateProfile(p, selfId) {
  const name = clean(p.name), handle = clean(p.handle).replace(/^@/, ''), bio = clean(p.bio), loc = clean(p.location);
  if (!name) return 'Enter a display name.';
  if (name.length > 40) return 'Display name can be up to 40 characters.';
  if (!/^[A-Za-z0-9_]{3,15}$/.test(handle)) return 'Handle must be 3 to 15 letters, numbers or underscores.';
  const other = userByHandle(handle);
  if (other && other.id !== selfId) return '@' + handle + ' is taken. Try another.';
  if (bio.length > 160) return 'Bio can be up to 160 characters.';
  if (loc.length > 30) return 'Location can be up to 30 characters.';
  return '';
}
function updateProfile(uid, p) {
  const u = S.users[uid];
  if (!u) return { ok: false, error: 'Unknown user.' };
  const error = validateProfile(p, uid);
  if (error) return { ok: false, error };
  u.name = clean(p.name); u.handle = clean(p.handle).replace(/^@/, '');
  u.bio = clean(p.bio); u.location = clean(p.location);
  if (p.hue != null) u.hue = Math.max(0, Math.min(359, Number(p.hue) || 0));
  return { ok: true };
}
function createUser(name, handle) {
  const error = validateProfile({ name, handle, bio: '', location: '' }, null);
  if (error) return { ok: false, error };
  const id = nid('u');
  S.users[id] = { id, name: clean(name), handle: clean(handle).replace(/^@/, ''), bio: '', location: '', hue: Math.floor(Math.random() * 360), joined: Date.now() };
  S.follows[id] = [];
  return { ok: true, id };
}

/* ---------- persistence (per browser) ---------- */
let ME = 'u_you';
const memStore = {};
function loadState() {
  try { const r = localStorage.getItem(KEY); if (r) { const p = JSON.parse(r); if (p && p.users && p.tweets) return p; } } catch (e) {}
  return memStore.s || seed();
}
function save() {
  memStore.s = S;
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
}
function loadMe() {
  try { const m = sessionStorage.getItem(KEY + '.me'); if (m && S.users[m]) return m; } catch (e) {}
  return S.users.u_you ? 'u_you' : Object.keys(S.users)[0];
}
function saveMe() { try { sessionStorage.setItem(KEY + '.me', ME); } catch (e) {} }

/* ---------- ui state ---------- */
const ui = { view: { name: 'home' }, stack: [], mode: 'following', ptab: 'tweets', comments: new Set(), editing: null, confirm: null, drafts: {}, hidden: new Set(), modal: null, focus: null };
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'K' : String(n);
const ICON = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M18.5 13.8c1.6.8 2.5 2.4 2.5 5.2"/>',
  user: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6"/>',
  reply: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12Z"/>',
  rt: '<path d="m17 3 3.5 3.5L17 10"/><path d="M4 11V9.5A3 3 0 0 1 7 6.5h13.5"/><path d="m7 21-3.5-3.5L7 14"/><path d="M20 13v1.5a3 3 0 0 1-3 3H3.5"/>',
  heart: '<path d="M12 20.5s-8-4.8-8-10.6A4.4 4.4 0 0 1 12 7.4a4.4 4.4 0 0 1 8 2.5c0 5.8-8 10.6-8 10.6Z"/>',
  edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12.5h10L18 7M9 7V4.5h6V7"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>'
};
const ic = n => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICON[n]}</svg>`;
const av = (u, size) => `<span class="av ${size || ''}" style="--h:${u.hue}" aria-hidden="true">${esc(initials(u.name))}</span>`;
const U = id => S.users[id] || { id, name: 'Deleted user', handle: 'unknown', hue: 0, bio: '', location: '', joined: 0 };

function rel(ts) {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 45) return 'now';
  if (s < 3600) return Math.max(1, Math.round(s / 60)) + 'm';
  if (s < 86400) return Math.round(s / 3600) + 'h';
  if (s < 7 * 86400) return Math.round(s / 86400) + 'd';
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
}
const timeEl = ts => `<time data-ts="${ts}" datetime="${new Date(ts).toISOString()}" title="${esc(new Date(ts).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }))}">${rel(ts)}</time>`;

function rich(t) {
  return esc(t)
    .replace(/(^|[\s(])(#[\p{L}\p{N}_]+)/gu, '$1<span class="tag">$2</span>')
    .replace(/(^|[\s(])@([A-Za-z0-9_]{3,15})/g, (m, p, h) => {
      const u = userByHandle(h);
      return u ? `${p}<button type="button" class="mention" data-act="profile" data-uid="${u.id}">@${esc(h)}</button>` : m;
    })
    .replace(/\n/g, '<br>');
}

/* ---------- renderers ---------- */
function followBtn(uid, small) {
  if (uid === ME) return '';
  const f = isFollowing(ME, uid);
  return `<button type="button" class="btn ${small ? 'sm ' : ''}${f ? 'following' : 'primary'}" data-act="follow" data-uid="${uid}" aria-pressed="${f}">${f ? '<span class="a">Following</span><span class="h">Unfollow</span>' : 'Follow'}</button>`;
}

function renderNav() {
  const me = U(ME), v = ui.view;
  const item = (name, label, icon, cur) => `<button type="button" class="nav-item" data-act="nav" data-view="${name}" ${cur ? 'aria-current="page"' : ''}>${ic(icon)}<span>${label}</span></button>`;
  $('#nav').innerHTML =
    `<div class="nav-brand">murmur<i>.</i></div>` +
    item('home', 'Home', 'home', v.name === 'home') +
    item('people', 'People', 'users', v.name === 'people') +
    item('myprofile', 'Profile', 'user', v.name === 'profile' && v.uid === ME) +
    `<button type="button" class="nav-me" data-act="accounts" aria-label="Switch account">${av(me)}<span class="who"><b>${esc(me.name)}</b><small>@${esc(me.handle)}</small></span></button>`;
}

function renderTop() {
  const v = ui.view, me = U(ME);
  let left;
  if (v.name === 'profile') {
    const u = U(v.uid);
    left = (ui.stack.length ? `<button type="button" class="ibtn" data-act="back" aria-label="Back">${ic('back')}</button>` : '') +
      `<div class="grow"><h1>${esc(u.name)}</h1><div class="sub">${countOwnTweets(u.id)} tweets</div></div>`;
  } else {
    left = `<div class="grow"><h1>${v.name === 'home' ? 'Home' : 'People'}</h1></div>` + (v.name === 'home' ? `<span class="live">Live</span>` : '');
  }
  $('#top').innerHTML = left + `<button type="button" class="me-btn" data-act="accounts" aria-label="Switch account, signed in as ${esc(me.name)}">${av(me, 'sm')}</button>`;
}

function composeHTML() {
  const me = U(ME);
  return `<form class="compose" id="composeForm" autocomplete="off">${av(me, 'lg')}<div class="cmp-main">
    <label class="sr" for="composeText">Write a tweet</label>
    <textarea id="composeText" rows="2" maxlength="${LIMIT}" placeholder="What's happening?"></textarea>
    <div class="cmp-foot"><span class="count" id="composeCount" aria-live="off">${LIMIT}</span><button class="btn primary" id="composePost" type="submit" disabled>Post</button></div>
  </div></form>`;
}

function commentHTML(tw, c) {
  const u = U(c.uid);
  return `<div class="cm">${av(u, 'sm')}<div class="cm-b"><div class="cm-h"><button type="button" class="nm" data-act="profile" data-uid="${u.id}">${esc(u.name)}</button><span class="hd">@${esc(u.handle)}</span>${timeEl(c.ts)}${c.uid === ME ? `<button type="button" class="del" data-act="delcomment" data-id="${tw.id}" data-cid="${c.id}">Delete</button>` : ''}</div><p>${rich(c.text)}</p></div></div>`;
}

function tweetHTML(entry) {
  const orig = entry.rtOf ? findTweet(entry.rtOf) : entry;
  if (!orig) return '';
  const u = U(orig.uid), mine = orig.uid === ME;
  const rts = S.tweets.filter(t => t.rtOf === orig.id).length;
  const rted = !!rtEntry(orig.id, ME), liked = orig.likes.includes(ME);
  const open = ui.comments.has(orig.id), editing = ui.editing === orig.id;
  let banner = '';
  if (entry.rtOf) { const r = U(entry.uid); banner = `<div class="tw-rt">${ic('rt')}<span>${entry.uid === ME ? 'You' : esc(r.name)} retweeted</span></div>`; }
  let body;
  if (editing) {
    const val = ui.drafts['e' + orig.id] != null ? ui.drafts['e' + orig.id] : orig.text;
    body = `<div class="editor"><label class="sr" for="edit-${orig.id}">Edit tweet</label><textarea id="edit-${orig.id}" maxlength="${LIMIT}" data-draft="e${orig.id}">${esc(val)}</textarea><div class="row"><span class="count" data-count-for="edit-${orig.id}">${LIMIT - val.length}</span><button type="button" class="btn sm" data-act="canceledit">Cancel</button><button type="button" class="btn sm primary" data-act="saveedit" data-id="${orig.id}">Save</button></div></div>`;
  } else {
    body = `<p class="tw-text">${rich(orig.text)}</p>`;
  }
  let actions;
  if (ui.confirm === orig.id) {
    actions = `<div class="confirm" role="alertdialog"><span>Delete this tweet? This can't be undone.</span><button type="button" class="btn sm" data-act="cancelconfirm">Keep</button><button type="button" class="btn sm danger" data-act="confirmdelete" data-id="${orig.id}">Delete</button></div>`;
  } else if (!editing) {
    actions = `<div class="acts">
      <button type="button" class="act" data-act="togglecomments" data-id="${orig.id}" aria-expanded="${open}" aria-label="Comments, ${orig.comments.length}">${ic('reply')}<span>${fmt(orig.comments.length)}</span></button>
      <button type="button" class="act rt" data-act="retweet" data-id="${orig.id}" aria-pressed="${rted}" aria-label="Retweet, ${rts}">${ic('rt')}<span>${fmt(rts)}</span></button>
      <button type="button" class="act like" data-act="like" data-id="${orig.id}" aria-pressed="${liked}" aria-label="Like, ${orig.likes.length}">${ic('heart')}<span>${fmt(orig.likes.length)}</span></button>
    </div>`;
  } else actions = '';
  const tools = mine && !editing && ui.confirm !== orig.id ? `<span class="tools"><button type="button" class="ibtn" data-act="startedit" data-id="${orig.id}" aria-label="Edit tweet">${ic('edit')}</button><button type="button" class="ibtn" data-act="askdelete" data-id="${orig.id}" aria-label="Delete tweet">${ic('trash')}</button></span>` : '';
  let thread = '';
  if (open) {
    const draft = ui.drafts['c' + orig.id] || '';
    thread = `<div class="thread">${orig.comments.map(c => commentHTML(orig, c)).join('')}
      <form class="cmt-form" data-form="comment" data-id="${orig.id}">${av(U(ME), 'sm')}<label class="sr" for="cmt-${orig.id}">Write a comment</label><input id="cmt-${orig.id}" type="text" maxlength="${LIMIT}" placeholder="Write a comment" value="${esc(draft)}" data-draft="c${orig.id}" autocomplete="off"><button type="submit" class="btn sm primary">Reply</button></form></div>`;
  }
  return `<article class="tw" data-id="${orig.id}">${banner}<div class="tw-row"><button type="button" data-act="profile" data-uid="${u.id}" aria-label="${esc(u.name)}'s profile">${av(u)}</button><div class="tw-body"><header class="tw-head"><button type="button" class="nm" data-act="profile" data-uid="${u.id}">${esc(u.name)}</button><span class="hd">@${esc(u.handle)}</span>${timeEl(orig.ts)}${orig.edited ? '<span class="ed">edited</span>' : ''}${tools}</header>${body}${actions}${thread}</div></div></article>`;
}

function emptyHTML(title, text) { return `<div class="empty"><strong>${esc(title)}</strong>${esc(text)}</div>`; }

function renderHome() {
  const all = feedFor(ME, ui.mode);
  const visible = all.filter(t => !ui.hidden.has(t.id));
  const pending = all.length - visible.length;
  let list = visible.map(tweetHTML).join('');
  if (!list) list = ui.mode === 'following'
    ? emptyHTML('Your feed is quiet', 'Follow people from the People tab and their tweets will show up here.')
    : emptyHTML('Nothing here yet', 'Be the first to post.');
  return `<div class="tabs" role="tablist">
    <button type="button" class="tab" role="tab" data-act="mode" data-mode="following" aria-selected="${ui.mode === 'following'}">Following</button>
    <button type="button" class="tab" role="tab" data-act="mode" data-mode="everyone" aria-selected="${ui.mode === 'everyone'}">Everyone</button></div>` +
    (pending ? `<div class="newpill"><button type="button" class="btn sm primary" data-act="shownew">Show ${pending} new tweet${pending > 1 ? 's' : ''}</button></div>` : '') + list;
}

function userRow(u) {
  return `<div class="urow"><button type="button" data-act="profile" data-uid="${u.id}" aria-label="${esc(u.name)}'s profile">${av(u)}</button><button type="button" class="who" data-act="profile" data-uid="${u.id}"><b>${esc(u.name)}</b><small>@${esc(u.handle)}${u.bio ? ' · ' + esc(u.bio) : ''}</small></button>${followBtn(u.id, true)}</div>`;
}

function renderPeople() {
  const users = Object.values(S.users).filter(u => u.id !== ME).sort((a, b) => a.name.localeCompare(b.name));
  return `<div style="padding-top:6px">${users.map(userRow).join('') || emptyHTML('No one else yet', 'Create another account from the account menu.')}</div>`;
}

function renderProfile(uid) {
  const u = U(uid);
  if (!S.users[uid]) return emptyHTML('This account doesn\'t exist', 'It may have been removed.');
  const joined = new Date(u.joined).toLocaleDateString([], { month: 'long', year: 'numeric' });
  const list = ui.ptab === 'likes' ? likedBy(uid) : tweetsOf(uid);
  const body = list.map(tweetHTML).join('') || (ui.ptab === 'likes' ? emptyHTML('No likes yet', 'Tweets liked by ' + u.name + ' will appear here.') : emptyHTML('No tweets yet', uid === ME ? 'Your first tweet is one click away on Home.' : u.name + ' hasn\'t posted yet.'));
  return `<div class="cover" style="--h:${u.hue}"></div>
  <section class="p-info" aria-label="Profile">
    <div class="p-head"><span class="av xl" style="--h:${u.hue}" aria-hidden="true">${esc(initials(u.name))}</span>
      ${uid === ME ? '<button type="button" class="btn" data-act="editprofile">Edit profile</button>' : followBtn(uid)}</div>
    <h2 style="margin-top:10px">${esc(u.name)}</h2><div class="hd">@${esc(u.handle)}</div>
    ${u.bio ? `<p class="bio">${rich(u.bio)}</p>` : '<div style="height:10px"></div>'}
    <div class="meta">${u.location ? `<span>${esc(u.location)}</span>` : ''}<span>Joined ${esc(joined)}</span></div>
    <div class="stats"><button type="button" data-act="list" data-kind="following" data-uid="${uid}"><b>${fmt(followingOf(uid).length)}</b><span>Following</span></button><button type="button" data-act="list" data-kind="followers" data-uid="${uid}"><b>${fmt(followersOf(uid).length)}</b><span>Followers</span></button></div>
  </section>
  <div class="tabs" role="tablist"><button type="button" class="tab" role="tab" data-act="ptab" data-tab="tweets" aria-selected="${ui.ptab === 'tweets'}">Tweets</button><button type="button" class="tab" role="tab" data-act="ptab" data-tab="likes" aria-selected="${ui.ptab === 'likes'}">Likes</button></div>${body}`;
}

function renderView() {
  const v = ui.view;
  $('#view').innerHTML = v.name === 'home' ? renderHome() : v.name === 'people' ? renderPeople() : renderProfile(v.uid);
  restoreFocus();
}

function renderRail() {
  const sug = Object.values(S.users).filter(u => u.id !== ME && !isFollowing(ME, u.id)).slice(0, 4);
  $('#rail').innerHTML = `<div class="card"><h3>Who to follow</h3>${sug.length ? sug.map(userRow).join('') : '<p class="hint" style="margin:8px 0 0">You follow everyone here.</p>'}</div>`;
}

function renderModal() {
  const root = $('#modal-root'), m = ui.modal;
  if (!m) { root.innerHTML = ''; return; }
  let inner = '';
  const head = t => `<header><h2 id="mt">${t}</h2><button type="button" class="ibtn" data-act="closemodal" aria-label="Close">${ic('x')}</button></header>`;
  if (m.type === 'edit') {
    const u = U(ME);
    inner = `${head('Edit profile')}<form id="profileForm" autocomplete="off">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:12px"><span class="av xl" id="ep-av" style="--h:${u.hue}">${esc(initials(u.name))}</span><div class="field" style="flex:1;margin:0"><label for="ep-hue">Avatar color</label><input id="ep-hue" type="range" min="0" max="359" value="${u.hue}"></div></div>
      <div class="field"><label for="ep-name">Display name</label><input id="ep-name" maxlength="40" value="${esc(u.name)}"></div>
      <div class="field"><label for="ep-handle">Handle</label><input id="ep-handle" maxlength="16" value="${esc(u.handle)}"></div>
      <div class="field"><label for="ep-bio">Bio</label><textarea id="ep-bio" maxlength="160">${esc(u.bio)}</textarea></div>
      <div class="field"><label for="ep-loc">Location</label><input id="ep-loc" maxlength="30" value="${esc(u.location)}"></div>
      <p class="err" id="ep-err" role="alert"></p><div class="foot"><button type="button" class="btn" data-act="closemodal">Cancel</button><button type="submit" class="btn primary">Save changes</button></div></form>`;
  } else if (m.type === 'accounts') {
    const users = Object.values(S.users);
    inner = `${head('Accounts')}<p class="hint" style="margin:0 0 6px">Murmur runs in this browser. Switch accounts to test following from the other side.</p>
      ${users.map(u => `<div class="urow">${av(u)}<div class="who"><b>${esc(u.name)}</b><small>@${esc(u.handle)}</small></div>${u.id === ME ? '<span class="hint">Signed in</span>' : `<button type="button" class="btn sm" data-act="switch" data-uid="${u.id}">Switch</button>`}</div>`).join('')}
      <div class="sect">Create account</div>
      <form id="newUserForm" autocomplete="off"><div class="field"><label for="na-name">Display name</label><input id="na-name" maxlength="40"></div>
      <div class="field"><label for="na-handle">Handle</label><input id="na-handle" maxlength="15" placeholder="letters, numbers, underscores"></div>
      <p class="err" id="na-err" role="alert"></p><div class="foot"><button type="submit" class="btn primary">Create and switch</button></div></form>`;
  } else if (m.type === 'list') {
    const u = U(m.uid), ids = m.kind === 'followers' ? followersOf(m.uid) : followingOf(m.uid);
    inner = `${head(m.kind === 'followers' ? 'Followers of ' + esc(u.name) : esc(u.name) + ' follows')}${ids.length ? ids.map(id => userRow(U(id))).join('') : emptyHTML(m.kind === 'followers' ? 'No followers yet' : 'Not following anyone', '')}`;
  }
  root.innerHTML = `<div class="scrim" data-act="scrim"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="mt">${inner}</div></div>`;
  const first = root.querySelector('input,textarea,button.btn');
  if (first && m.type !== 'list') first.focus();
}

function restoreFocus() {
  if (!ui.focus) return;
  const el = document.getElementById(ui.focus);
  ui.focus = null;
  if (el) { el.focus(); if (el.setSelectionRange && el.value != null) { const n = el.value.length; try { el.setSelectionRange(n, n); } catch (e) {} } }
}

function build() {
  renderNav(); renderTop();
  const slot = $('#compose-slot');
  slot.innerHTML = ui.view.name === 'home' ? composeHTML() : '';
  renderView(); renderRail(); renderModal();
}
function refresh() { renderTop(); renderView(); renderRail(); if (ui.modal && ui.modal.type === 'list') renderModal(); }

function go(view, push) {
  if (push) ui.stack.push({ view: ui.view, ptab: ui.ptab });
  ui.view = view; ui.ptab = 'tweets'; ui.editing = null; ui.confirm = null;
  build(); window.scrollTo(0, 0);
}

let toastTimer;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 2200);
}
const commit = () => { save(); };

/* ---------- events ---------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act, id = el.dataset.id, uid = el.dataset.uid;
  if (act === 'scrim') { if (e.target === el) { ui.modal = null; renderModal(); } return; }
  switch (act) {
    case 'nav': {
      const v = el.dataset.view;
      ui.stack = [];
      go(v === 'myprofile' ? { name: 'profile', uid: ME } : { name: v }, false); break;
    }
    case 'profile': ui.modal = null; go({ name: 'profile', uid }, true); break;
    case 'back': { const p = ui.stack.pop(); ui.view = p.view; ui.ptab = p.ptab; ui.editing = null; ui.confirm = null; build(); break; }
    case 'mode': ui.mode = el.dataset.mode; ui.hidden.clear(); refresh(); break;
    case 'ptab': ui.ptab = el.dataset.tab; refresh(); break;
    case 'shownew': ui.hidden.clear(); refresh(); break;
    case 'follow': {
      toggleFollow(ME, uid); commit();
      const now = isFollowing(ME, uid);
      toast(now ? 'Following @' + U(uid).handle : 'Unfollowed @' + U(uid).handle);
      refresh(); break;
    }
    case 'like': toggleLike(id, ME); commit(); refresh(); break;
    case 'retweet': { toggleRetweet(id, ME); commit(); toast(rtEntry(id, ME) ? 'Retweeted' : 'Retweet removed'); refresh(); break; }
    case 'togglecomments':
      if (ui.comments.has(id)) ui.comments.delete(id); else { ui.comments.add(id); ui.focus = 'cmt-' + id; }
      refresh(); break;
    case 'delcomment': deleteComment(id, el.dataset.cid, ME); commit(); refresh(); break;
    case 'startedit': ui.editing = id; ui.confirm = null; ui.focus = 'edit-' + id; refresh(); break;
    case 'canceledit': delete ui.drafts['e' + ui.editing]; ui.editing = null; refresh(); break;
    case 'saveedit': {
      const ta = document.getElementById('edit-' + id), text = ta ? ta.value : '';
      if (!clean(text)) { toast('A tweet can\'t be empty'); break; }
      if (editTweet(id, ME, text)) { delete ui.drafts['e' + id]; ui.editing = null; commit(); toast('Tweet updated'); refresh(); }
      break;
    }
    case 'askdelete': ui.confirm = id; ui.editing = null; refresh(); break;
    case 'cancelconfirm': ui.confirm = null; refresh(); break;
    case 'confirmdelete': deleteTweet(id, ME); ui.confirm = null; ui.comments.delete(id); commit(); toast('Tweet deleted'); refresh(); break;
    case 'editprofile': ui.modal = { type: 'edit' }; renderModal(); break;
    case 'accounts': ui.modal = { type: 'accounts' }; renderModal(); break;
    case 'list': ui.modal = { type: 'list', kind: el.dataset.kind, uid }; renderModal(); break;
    case 'closemodal': ui.modal = null; renderModal(); break;
    case 'switch': ME = uid; saveMe(); ui.modal = null; ui.stack = []; ui.hidden.clear(); ui.comments.clear(); go({ name: 'home' }, false); toast('Signed in as @' + U(uid).handle); break;
  }
});

document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'composeText') {
    t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 260) + 'px';
    const left = LIMIT - t.value.length, c = $('#composeCount');
    c.textContent = left; c.className = 'count' + (left < 0 ? ' over' : left <= 20 ? ' warn' : '');
    $('#composePost').disabled = !clean(t.value) || left < 0;
  } else if (t.dataset && t.dataset.draft) {
    ui.drafts[t.dataset.draft] = t.value;
    const c = document.querySelector('[data-count-for="' + t.id + '"]');
    if (c) { const left = LIMIT - t.value.length; c.textContent = left; c.className = 'count' + (left < 0 ? ' over' : left <= 20 ? ' warn' : ''); }
  } else if (t.id === 'ep-hue') {
    $('#ep-av').style.setProperty('--h', t.value);
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && ui.modal) { ui.modal = null; renderModal(); return; }
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && e.target.id === 'composeText') { e.preventDefault(); $('#composeForm').requestSubmit(); }
});

document.addEventListener('submit', e => {
  const f = e.target;
  e.preventDefault();
  if (f.id === 'composeForm') {
    const ta = $('#composeText');
    if (postTweet(ME, ta.value)) {
      commit(); ta.value = ''; ta.style.height = ''; $('#composeCount').textContent = LIMIT; $('#composeCount').className = 'count'; $('#composePost').disabled = true;
      if (ui.view.name === 'home' && ui.mode !== 'following') ui.mode = 'following';
      toast('Tweet posted'); refresh();
    }
  } else if (f.dataset.form === 'comment') {
    const id = f.dataset.id, inp = f.querySelector('input');
    if (addComment(id, ME, inp.value)) { delete ui.drafts['c' + id]; ui.focus = 'cmt-' + id; commit(); refresh(); }
  } else if (f.id === 'profileForm') {
    const r = updateProfile(ME, { name: $('#ep-name').value, handle: $('#ep-handle').value, bio: $('#ep-bio').value, location: $('#ep-loc').value, hue: $('#ep-hue').value });
    if (!r.ok) { $('#ep-err').textContent = r.error; return; }
    commit(); ui.modal = null; build(); toast('Profile updated');
  } else if (f.id === 'newUserForm') {
    const r = createUser($('#na-name').value, $('#na-handle').value);
    if (!r.ok) { $('#na-err').textContent = r.error; return; }
    ME = r.id; saveMe(); commit(); ui.modal = null; ui.stack = []; go({ name: 'home' }, false); toast('Welcome to Murmur');
  }
});

/* ---------- live activity ---------- */
const LINES = [
  'Coffee number three and the build finally went green. #backend',
  'Anyone else think Tuesday is the real Monday?',
  'New sketch is up. The cat is back. #drawing',
  'Quick reminder to stretch. Your back says thanks.',
  'Found an old transit token in a coat pocket. Small joys. #maps',
  'Five more kilometres than planned today and zero regrets. #marathon',
  'The starter smells like green apples today. I will take it. #sourdough',
  'Soldered the last joint. Powering on in three, two, one...',
  'Shipping small and often beats shipping big and late. #refactor',
  'Rain on the window, music on, nothing on the calendar.'
];
const SIM = ['u_maya', 'u_ravi', 'u_lena', 'u_omar', 'u_sofia', 'u_jun'];
function simulate() {
  if (document.hidden) return;
  const pool = SIM.filter(id => S.users[id] && id !== ME);
  if (!pool.length) return;
  const uid = pool[Math.floor(Math.random() * pool.length)];
  const tw = postTweet(uid, LINES[Math.floor(Math.random() * LINES.length)]);
  if (!tw) return;
  if (ui.view.name === 'home') ui.hidden.add(tw.id);
  commit();
  if (ui.view.name === 'home') refresh();
}
function tick() {
  document.querySelectorAll('time[data-ts]').forEach(t => { t.textContent = rel(Number(t.dataset.ts)); });
}
window.addEventListener('storage', e => {
  if (e.key !== KEY || !e.newValue) return;
  try {
    const next = JSON.parse(e.newValue);
    if (!next || !next.users || !next.tweets) return;
    const before = new Set(S.tweets.map(t => t.id));
    S = next;
    if (!S.users[ME]) ME = loadMe();
    if (ui.view.name === 'home') S.tweets.forEach(t => { if (!before.has(t.id) && t.uid !== ME) ui.hidden.add(t.id); });
    if (!ui.editing && !ui.modal) refresh();
  } catch (err) {}
});

/* ---------- boot ---------- */
S = loadState();
ME = loadMe();
save();
build();
setInterval(tick, 30000);
setInterval(simulate, 45000);