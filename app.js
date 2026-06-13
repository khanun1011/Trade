// ── CONFIG ──
const SUPABASE_URL = "https://svqdlgauejvnrpqttzey.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2cWRsZ2F1ZWp2bnJwcXR0emV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNTg3NjQsImV4cCI6MjA5NjkzNDc2NH0.glkc753AH_F50WowGozeQtWQxkIO4lf9t1-IIG3NNfE";
const TABLE       = "gold_trades";
const PTS_PER_UNIT = 100; // 1 unit = 100 จุด

// ── STATE ──
let trades  = [];
let result  = "WIN";
let sortKey = "date";
let sortDir = "desc";

// ── SUPABASE ──
async function sbFetch(path, opts = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      "apikey":        SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type":  "application/json",
      "Prefer":        opts.method === "POST" ? "return=representation" : "",
      ...(opts.headers || {})
    }
  });
  if (!r.ok) throw new Error(await r.text());
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

async function loadTrades() {
  showLoading(true);
  try {
    trades = await sbFetch(`${TABLE}?order=trade_date.desc&select=*`) || [];
    updateStats(); renderTable();
  } catch(e) {
    showToast("❌ โหลดไม่สำเร็จ: " + e.message);
  } finally { showLoading(false); }
}

// ── AUTO CALC ──
// Logic:
//   BUY  → TP > Entry > SL   (คาดว่าราคาขึ้น)
//   SELL → SL > Entry > TP   (คาดว่าราคาลง)
// จุด = ผลต่างราคา x 10 (ราคาทอง 1$ = 10 จุด, 0.1$ = 1 จุด)
// 1 unit = 100 จุด

function getValues() {
  return {
    entry: parseFloat(document.getElementById("entryPrice").value) || 0,
    tp:    parseFloat(document.getElementById("tpPrice").value)    || 0,
    sl:    parseFloat(document.getElementById("slPrice").value)    || 0,
    exit:  parseFloat(document.getElementById("exitPrice").value)  || 0,
  };
}

function priceToPts(diff) {
  // XAU/USD: 1 pip = $0.10, 1 จุด = $0.1 → diff * 10
  return Math.round(diff * 10 * 10) / 10;
}

function autoCalc() {
  const { entry, tp, sl, exit } = getValues();

  // ── ตรวจทิศทาง ──
  let dir = null;
  const dirChip = document.getElementById("dirChip");
  const dirValEl = document.getElementById("dirVal");

  if (entry && tp && sl) {
    if (tp > entry && entry > sl) {
      dir = "BUY";
      dirChip.className = "dir-chip is-buy";
      dirValEl.textContent = "📈 BUY";
    } else if (sl > entry && entry > tp) {
      dir = "SELL";
      dirChip.className = "dir-chip is-sell";
      dirValEl.textContent = "📉 SELL";
    } else {
      dirChip.className = "dir-chip";
      dirValEl.textContent = "⚠️ ตรวจสอบ TP/SL";
    }
  } else {
    dirChip.className = "dir-chip";
    dirValEl.textContent = "— กรอก Entry + TP/SL";
  }

  // ── คำนวณ TP/SL เป็นจุด ──
  const calcTP = document.getElementById("calcTP");
  const calcSL = document.getElementById("calcSL");
  const rrValEl = document.getElementById("rrVal");

  if (dir && entry && tp && sl) {
    const tpPts = dir === "BUY" ? priceToPts(tp - entry) : priceToPts(entry - tp);
    const slPts = dir === "BUY" ? priceToPts(entry - sl) : priceToPts(sl - entry);
    calcTP.textContent = `+${tpPts.toFixed(1)} pts (${(tpPts/PTS_PER_UNIT).toFixed(2)} u)`;
    calcSL.textContent = `-${slPts.toFixed(1)} pts (${(slPts/PTS_PER_UNIT).toFixed(2)} u)`;

    if (slPts > 0) {
      const rr = tpPts / slPts;
      document.getElementById("rrVal").textContent = "1 : " + rr.toFixed(2);
    } else {
      document.getElementById("rrVal").textContent = "—";
    }
  } else {
    calcTP.textContent = "— pts";
    calcSL.textContent = "— pts";
    document.getElementById("rrVal").textContent = "—";
  }

  // ── คำนวณผลจาก Exit ──
  const rp = document.getElementById("resultPreview");
  if (dir && entry && exit) {
    const pts = dir === "BUY" ? priceToPts(exit - entry) : priceToPts(entry - exit);
    const units = pts / PTS_PER_UNIT;
    if (pts > 0) {
      rp.className = "result-preview rp-win";
      rp.innerHTML = `<span class="rp-icon">✅</span> <span>กำไร +${pts.toFixed(1)} จุด (${units.toFixed(2)} units)</span>`;
    } else if (pts < 0) {
      rp.className = "result-preview rp-loss";
      rp.innerHTML = `<span class="rp-icon">❌</span> <span>ขาดทุน ${pts.toFixed(1)} จุด (${units.toFixed(2)} units)</span>`;
    } else {
      rp.className = "result-preview rp-be";
      rp.innerHTML = `<span class="rp-icon">⚡</span> <span>Breakeven 0.0 จุด</span>`;
    }
  } else {
    rp.className = "result-preview";
    rp.innerHTML = `<span class="rp-icon">⬡</span> <span id="resultText">กรอกราคาออกเพื่อดูผล</span>`;
  }
}

// ── RESULT TOGGLE ──
function setResult(res, btn) {
  result = res;
  document.querySelectorAll(".rb").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
}

// ── ADD TRADE ──
async function addTrade() {
  const { entry, tp, sl, exit } = getValues();
  const dateVal = document.getElementById("tradeDate").value;
  const note    = document.getElementById("tradeNote").value.trim();

  if (!dateVal || !entry || !exit) {
    showToast("⚠️ กรุณากรอกวันที่, Entry และ Exit"); return;
  }

  // คำนวณทิศทางอัตโนมัติ
  let dir = "BUY";
  if (tp && sl) {
    if (sl > entry && entry > tp) dir = "SELL";
  }

  const pts   = dir === "BUY" ? priceToPts(exit - entry) : priceToPts(entry - exit);
  const units = pts / PTS_PER_UNIT;

  // TP/SL เป็นจุด
  let tpPts = null, slPts = null;
  if (tp && sl) {
    tpPts = dir === "BUY" ? priceToPts(tp - entry) : priceToPts(entry - tp);
    slPts = dir === "BUY" ? priceToPts(entry - sl) : priceToPts(sl - entry);
  }

  const trade = {
    trade_date:  new Date(dateVal).toISOString(),
    direction:   dir,
    entry_price: entry,
    exit_price:  exit,
    tp_price:    tp || null,
    sl_price:    sl || null,
    tp_points:   tpPts,
    sl_points:   slPts,
    points:      pts,
    units:       Math.round(units * 100) / 100,
    result,
    note: note || null
  };

  const btn = document.querySelector(".btn-save");
  btn.textContent = "⏳ กำลังบันทึก...";
  btn.disabled = true;

  try {
    const saved = await sbFetch(TABLE, { method: "POST", body: JSON.stringify(trade) });
    trades.unshift(saved?.[0] || { ...trade, id: Date.now() });
    updateStats(); renderTable(); resetForm();
    showToast("✅ บันทึกสำเร็จ!");
  } catch(e) {
    showToast("❌ บันทึกไม่สำเร็จ: " + e.message);
  } finally {
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> บันทึกการเทรด`;
    btn.disabled = false;
  }
}

async function removeTrade(id) {
  if (!confirm("ลบรายการนี้?")) return;
  try {
    await sbFetch(`${TABLE}?id=eq.${id}`, { method:"DELETE", headers:{"Prefer":"return=minimal"} });
    trades = trades.filter(t => t.id !== id);
    updateStats(); renderTable();
    showToast("🗑️ ลบสำเร็จ");
  } catch(e) { showToast("❌ ลบไม่สำเร็จ"); }
}

function resetForm() {
  ["entryPrice","tpPrice","slPrice","exitPrice","tradeNote"].forEach(id => {
    document.getElementById(id).value = "";
  });
  document.getElementById("dirChip").className = "dir-chip";
  document.getElementById("dirVal").textContent = "— กรอก Entry + TP/SL";
  document.getElementById("rrVal").textContent = "—";
  document.getElementById("calcTP").textContent = "— pts";
  document.getElementById("calcSL").textContent = "— pts";
  document.getElementById("resultPreview").className = "result-preview";
  document.getElementById("resultPreview").innerHTML = `<span class="rp-icon">⬡</span> <span>กรอกราคาออกเพื่อดูผล</span>`;
  setNow();
}

// ── STATS ──
function updateStats() {
  const wins   = trades.filter(t => t.result === "WIN");
  const losses = trades.filter(t => t.result === "LOSS");
  const bes    = trades.filter(t => t.result === "BE");
  const total  = trades.length;
  const wRate  = total > 0 ? (wins.length / total) * 100 : 0;

  const winPts  = wins.reduce((s,t)   => s + (t.points||0), 0);
  const lossPts = losses.reduce((s,t) => s + Math.abs(t.points||0), 0);
  const netPts  = trades.reduce((s,t) => s + (t.points||0), 0);

  const avgWin  = wins.length   > 0 ? winPts / wins.length   : null;
  const avgLoss = losses.length > 0 ? lossPts / losses.length : null;
  const rr      = avgWin && avgLoss ? avgWin / avgLoss : null;
  const pf      = lossPts > 0 ? winPts / lossPts : null;

  const allPts = trades.map(t => t.points||0);
  const best   = allPts.length ? Math.max(...allPts) : null;
  const worst  = allPts.length ? Math.min(...allPts) : null;

  let maxStreak = 0, cur = 0;
  [...trades].reverse().forEach(t => {
    if (t.result === "WIN") { cur++; maxStreak = Math.max(maxStreak,cur); } else cur = 0;
  });

  set("winRate",     total > 0 ? wRate.toFixed(1)+"%" : "—");
  set("totalWins",   wins.length);
  set("totalLosses", losses.length);
  set("totalTrades", total);
  set("winPoints",   "+" + winPts.toFixed(1) + " pts");
  set("lossPoints",  "-" + lossPts.toFixed(1) + " pts");

  const netEl = document.getElementById("netPoints");
  if(netEl){ netEl.textContent = (netPts>=0?"+":"") + netPts.toFixed(1); netEl.className = "kpi-val "+(netPts>0?"green":netPts<0?"red":""); }
  set("netUnits", (netPts>=0?"+":"") + (netPts/PTS_PER_UNIT).toFixed(2) + " units");
  document.getElementById("winRateBar").style.width = wRate + "%";

  set("sumWinPts",  "+" + winPts.toFixed(1) + " pts  (+"+((winPts/PTS_PER_UNIT).toFixed(2))+" u)");
  set("sumLossPts", "-" + lossPts.toFixed(1) + " pts  (-"+((lossPts/PTS_PER_UNIT).toFixed(2))+" u)");

  const snEl = document.getElementById("sumNet");
  if(snEl){ snEl.textContent = (netPts>=0?"+":"") + netPts.toFixed(1) + " pts"; snEl.style.color = netPts>0?"var(--green)":netPts<0?"var(--red)":"var(--gold)"; }
  set("sumNetUnit", "= " + (netPts>=0?"+":"") + (netPts/PTS_PER_UNIT).toFixed(2) + " units");

  set("avgWin",       avgWin  ? "+"+avgWin.toFixed(1)+" pts" : "—");
  set("avgLoss",      avgLoss ? "-"+avgLoss.toFixed(1)+" pts" : "—");
  set("rr",           rr  ? "1 : "+rr.toFixed(2) : "—");
  set("profitFactor", pf  ? pf.toFixed(2) : "—");
  set("bestTrade",    best!==null  ? (best>=0?"+":"")+best.toFixed(1)+" pts" : "—");
  set("worstTrade",   worst!==null ? (worst>=0?"+":"")+worst.toFixed(1)+" pts" : "—");
  set("winStreak",    maxStreak > 0 ? maxStreak+" ครั้ง" : "—");
  set("beTrades",     bes.length || "—");
}

function set(id, v) { const e=document.getElementById(id); if(e) e.textContent=v; }

// ── TABLE ──
function sortTable(key) {
  if(sortKey===key) sortDir = sortDir==="asc"?"desc":"asc";
  else { sortKey=key; sortDir="desc"; }
  document.querySelectorAll(".tbl thead th i").forEach(e => e.className="");
  const el = document.getElementById("sort-"+key);
  if(el) el.className = sortDir;
  renderTable();
}

function renderTable() {
  const q = (document.getElementById("searchInput")?.value||"").toLowerCase();
  const f = document.getElementById("filterResult")?.value||"";
  const map = { date:"trade_date", entry:"entry_price", exit:"exit_price", points:"points" };

  let rows = trades.filter(t => {
    const mf = !f || t.result===f || t.direction===f;
    const ms = !q || (t.note||"").toLowerCase().includes(q) || (t.direction||"").toLowerCase().includes(q)
                  || String(t.entry_price||"").includes(q) || String(t.exit_price||"").includes(q);
    return mf && ms;
  });

  rows.sort((a,b) => {
    const k = map[sortKey]||"trade_date";
    const va=a[k]??"", vb=b[k]??"";
    return sortDir==="asc" ? (va<vb?-1:va>vb?1:0) : (va>vb?-1:va<vb?1:0);
  });

  const tbody = document.getElementById("tradeTableBody");
  if(!rows.length) {
    tbody.innerHTML = `<tr><td colspan="10"><div class="empty-st"><div class="em-ico">Au</div><p>ไม่พบข้อมูล</p><p class="em-sub">ลองเปลี่ยน filter</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((t,i) => {
    const d   = new Date(t.trade_date);
    const ds  = `${d.getDate().toString().padStart(2,"0")}/${(d.getMonth()+1).toString().padStart(2,"0")}/${d.getFullYear()}`;
    const ts  = `${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`;
    const pts = t.points||0;
    const u   = t.units ?? (pts/PTS_PER_UNIT);
    const pCls = pts>0?"pts-p":pts<0?"pts-n":"";
    const dCls = t.direction==="BUY"?"dir-b":"dir-s";
    const dIco = t.direction==="BUY"?"▲":"▼";
    const badge = t.result==="WIN"?"bw":t.result==="LOSS"?"bl":"bb";
    const tpStr = t.tp_points!=null ? `<span style="color:var(--green)">+${t.tp_points}</span>` : "—";
    const slStr = t.sl_points!=null ? `<span style="color:var(--red)">-${t.sl_points}</span>` : "—";

    return `<tr>
      <td><b class="td-num">${rows.length-i}</b><span class="td-date">${ds} ${ts}</span></td>
      <td class="${dCls}">${dIco} ${t.direction}</td>
      <td class="td-num">${t.entry_price?.toFixed(2)??"—"}</td>
      <td style="font-size:11px">${tpStr} / ${slStr}</td>
      <td class="td-num">${t.exit_price?.toFixed(2)??"—"}</td>
      <td class="${pCls}" style="font-weight:700">${(pts>=0?"+":"")+pts.toFixed(1)}</td>
      <td style="color:var(--cream2)">${(u>=0?"+":"")+u.toFixed(2)} u</td>
      <td><span class="badge ${badge}">${t.result}</span></td>
      <td class="note-c" title="${t.note||""}">${t.note||"—"}</td>
      <td><button class="btn-del" onclick="removeTrade('${t.id}')">✕</button></td>
    </tr>`;
  }).join("");
}

// ── HELPERS ──
function showToast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg; el.classList.add("show");
  setTimeout(()=>el.classList.remove("show"), 3000);
}

let ldEl = null;
function showLoading(show) {
  if(show) {
    if(!ldEl){ ldEl=document.createElement("div"); ldEl.className="ld-overlay"; ldEl.innerHTML="<div class='ld-spin'></div>"; document.body.appendChild(ldEl); }
  } else { if(ldEl){ ldEl.remove(); ldEl=null; } }
}

function setNow() {
  const now = new Date();
  document.getElementById("tradeDate").value =
    new Date(now.getTime() - now.getTimezoneOffset()*60000).toISOString().slice(0,16);
}

// ── INIT ──
document.addEventListener("DOMContentLoaded", () => {
  setNow();
  loadTrades();
});
