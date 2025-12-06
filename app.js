// Simple client-side generator for group secret assignments and short ids
(function(){
  const el = id => document.getElementById(id);
  const base = window.location.origin + window.location.pathname.replace(/index\.html$/, '');

  function shortId(len=6){
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let s='';
    for(let i=0;i<len;i++) s += chars[Math.floor(Math.random()*chars.length)];
    return s;
  }

  // --- trivial reversible encryption using seeded PRNG + XOR ---
  function hashStr(s){let h=2166136261; for(let i=0;i<s.length;i++){h ^= s.charCodeAt(i); h += (h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24);} return h>>>0}
  function mulberry32(seed){ let t = seed >>> 0; return function(){ t += 0x6D2B79F5; let r = Math.imul(t ^ t >>> 15, t | 1); r ^= r + Math.imul(r ^ r >>> 7, r | 61); return ((r ^ r >>> 14) >>> 0) / 4294967296 }}
  function utf8ToBytes(str){ return new TextEncoder().encode(str) }
  function bytesToUtf8(b){ return new TextDecoder().decode(b) }
  function base64UrlEncode(bytes){ let bin=''; for(let i=0;i<bytes.length;i++) bin += String.fromCharCode(bytes[i]); let b64 = btoa(bin); return b64.replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'') }
  function base64UrlDecode(s){ s = s.replace(/-/g,'+').replace(/_/g,'/'); while(s.length %4) s += '='; const bin = atob(s); const arr = new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i); return arr }
  function xorEncrypt(text, seed){ const data = utf8ToBytes(text); const rnd = mulberry32(hashStr(seed.toString())); const out = new Uint8Array(data.length); for(let i=0;i<data.length;i++){ out[i] = data[i] ^ Math.floor(rnd()*256) } return base64UrlEncode(out) }
  function xorDecrypt(encoded, seed){ try{ const bytes = base64UrlDecode(encoded); const rnd = mulberry32(hashStr(seed.toString())); const out = new Uint8Array(bytes.length); for(let i=0;i<bytes.length;i++){ out[i] = bytes[i] ^ Math.floor(rnd()*256) } return bytesToUtf8(out) }catch(e){ return null } }
  // --- end encryption helpers ---

  function seededShuffle(arr, seed){
    if(!seed) return arr.slice().sort(()=>Math.random()-0.5);
    let state = hashStr(seed);
    function rnd(){ state += 0x6D2B79F5; let t = state; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296 }
    let a = arr.slice();
    for(let i=a.length-1;i>0;i--){
      const j = Math.floor(rnd()*(i+1));
      [a[i],a[j]] = [a[j],a[i]];
    }
    return a;
  }

  function generate(){
    const groupAName = el('groupName').value.trim() || 'GroupA';
    const membersA = el('members').value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    const groupBName = el('groupNameB').value.trim() || 'GroupB';
    const membersB = el('membersB').value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    if(membersA.length ===0 || membersB.length ===0){ alert('Enter members for both groups'); return }
    if(membersA.length !== membersB.length){ alert('Both groups must have the same number of members'); return }
    if(membersA.length < 2){ alert('Each group must have at least 2 members to avoid reciprocal pairs'); return }
    const seed = el('seed').value.trim();

    // cross-assign: create permutation p (A->B indices), then set q (B->A indices) = rotate(p inverse)
    const perGroupSeed = seed || Math.random().toString(36).slice(2);
    const n = membersA.length;
    const idx = Array.from({length:n}, (_,i)=>i);
    const p = seededShuffle(idx, perGroupSeed + '|p');
    const pInv = new Array(n);
    for(let i=0;i<n;i++) pInv[p[i]] = i;
    const q = new Array(n);
    for(let j=0;j<n;j++) q[j] = pInv[(j+1) % n];

    const list = el('linksList'); list.innerHTML='';

    // A -> B using p
    for(let i=0;i<n;i++){
      const giver = membersA[i];
      const receiver = membersB[p[i]];
      const perSeed = perGroupSeed + '|A|' + i;
      const enc = xorEncrypt(receiver, perSeed);
      const href = base + 'display.html?e=' + encodeURIComponent(enc) + '&s=' + encodeURIComponent(perSeed) + '&giver=' + encodeURIComponent(giver) + '&group=' + encodeURIComponent(groupAName);
      const a = document.createElement('a'); a.href = href; a.target = '_blank'; a.textContent = groupAName + ': ' + giver;
      const li = document.createElement('li'); li.appendChild(a); list.appendChild(li);
    }

    // B -> A using q
    for(let j=0;j<n;j++){
      const giver = membersB[j];
      const receiver = membersA[q[j]];
      const perSeed = perGroupSeed + '|B|' + j;
      const enc = xorEncrypt(receiver, perSeed);
      const href = base + 'display.html?e=' + encodeURIComponent(enc) + '&s=' + encodeURIComponent(perSeed) + '&giver=' + encodeURIComponent(giver) + '&group=' + encodeURIComponent(groupBName);
      const a = document.createElement('a'); a.href = href; a.target = '_blank'; a.textContent = groupBName + ': ' + giver;
      const li = document.createElement('li'); li.appendChild(a); list.appendChild(li);
    }
  }

  el('generateBtn').addEventListener('click', generate);
})();
