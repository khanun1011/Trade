// Supabase Configuration 
const SUPABASE_URL = "https://svqdlgauejvnrpqttzey.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2cWRsZ2F1ZWp2bnJwcXR0emV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNTg3NjQsImV4cCI6MjA5NjkzNDc2NH0.glkc753AH_F50WowGozeQtWQxkIO4lf9t1-IIG3NNfE";
const TABLE        = "gold_trades"; // ตัวแปรชื่อตารางหลักของฐานข้อมูล

let supabase;

// เปิดใช้งาน Client และดึงคลาสเชื่อมต่อจาก window object
try {
    const supabaseClient = window.supabase;
    if (supabaseClient) {
        supabase = supabaseClient.createClient(SUPABASE_URL, SUPABASE_KEY);
    } else {
        console.error("ผิดพลาด: ไม่สามารถโหลด Supabase SDK จากหน้าเว็บได้");
    }
} catch (err) {
    console.error("Initialization error:", err);
}

// ระบบเซ็ตล็อกวันที่ปัจจุบันให้กับฟอร์มโดยอัตโนมัติ
try {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('trade_date').value = today;
} catch (e) {
    console.error("Error setting auto date:", e);
}

// โหลดประวัติทันทีเมื่อเปิดหน้าเบราว์เซอร์สำเร็จ
document.addEventListener('DOMContentLoaded', () => {
    fetchTrades();
});

// ดึงข้อมูลเรียลไทม์จากตารางและนำส่งเข้าสู่อาร์เรย์วิเคราะห์
async function fetchTrades() {
    const listContainer = document.getElementById('trade-list');
    try {
        if (!supabase) {
            listContainer.innerHTML = `<tr><td colspan="5" class="px-6 py-10 text-center text-red-400">ตัวเชื่อมต่อฐานข้อมูลว่างเปล่า (ตรวจสอบคลาสเชื่อมโยง)</td></tr>`;
            return;
        }

        // เรียกฐานข้อมูลโดยใช้ตัวแปร TABLE ที่ประกาศไว้ด้านบนอย่างสมบูรณ์
        const { data, error } = await supabase
            .from(TABLE) 
            .select('*')
            .order('trade_date', { ascending: false })
            .order('id', { ascending: false });

        if (error) throw error;
        renderTrades(data);
        calculateStats(data);
    } catch (error) {
        console.error("Error fetching data:", error);
        listContainer.innerHTML = `<tr><td colspan="5" class="px-6 py-10 text-center text-red-400">เกิดข้อผิดพลาด: ${error.message || 'ไม่สามารถดึงข้อมูลได้'}</td></tr>`;
    }
}

// ฟังก์ชันเรนเดอร์ข้อมูลลงตาราง HTML
function renderTrades(trades) {
    const listContainer = document.getElementById('trade-list');
    document.getElementById('trade-count').innerText = `${trades.length} ออเดอร์`;

    if (!trades || trades.length === 0) {
        listContainer.innerHTML = `<tr><td colspan="5" class="px-6 py-10 text-center text-gray-500">ยังไม่มีข้อมูลบันทึกในประวัติการเทรดของคุณ</td></tr>`;
        return;
    }

    let html = '';
    trades.forEach(trade => {
        const isWin = trade.result_status === 'WIN';
        const statusClass = isWin ? 'text-green-500 bg-green-500/10' : 'text-red-400 bg-red-400/10';
        const typeClass = trade.type === 'BUY' ? 'text-green-500 border-green-500/30' : 'text-red-500 border-red-500/30';
        const formattedPoints = isWin ? `+${trade.points_result}` : `-${Math.abs(trade.points_result)}`;

        html += `
            <tr class="hover:bg-gray-800/40 transition">
                <td class="px-6 py-4 text-gray-300 font-medium">${formatDate(trade.trade_date)}</td>
                <td class="px-6 py-4">
                    <span class="px-2 py-0.5 border text-xs font-bold rounded-md ${typeClass}">${trade.type}</span>
                </td>
                <td class="px-6 py-4 text-xs font-mono text-gray-400">
                    <div>Entry: <span class="text-gray-200">${parseFloat(trade.entry_price).toFixed(2)}</span></div>
                    <div class="mt-0.5 text-[11px] text-gray-500">SL: ${parseFloat(trade.sl_price).toFixed(2)} | TP: ${parseFloat(trade.tp_price).toFixed(2)}</div>
                </td>
                <td class="px-6 py-4 text-right font-semibold font-mono">
                    <span class="px-2.5 py-1 rounded-lg text-sm ${statusClass}">${formattedPoints}</span>
                </td>
                <td class="px-6 py-4 text-center">
                    <button onclick="deleteTrade(${trade.id})" class="text-gray-500 hover:text-red-400 transition cursor-pointer">
                        <svg class="w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </td>
            </tr>
        `;
    });
    listContainer.innerHTML = html;
}

// ประมวลผลคิดคำนวณแดชบอร์ดสรุปภาพรวมสถิติ
function calculateStats(trades) {
    const total = trades.length;
    if (total === 0) {
        updateStatDOM(0, 0, 0, 0, 0, 0);
        return;
    }

    const winsList = trades.filter(t => t.result_status === 'WIN');
    const lossesList = trades.filter(t => t.result_status === 'LOSS');
    
    const totalWins = winsList.length;
    const totalLosses = lossesList.length;
    const winRate = ((totalWins / total) * 100).toFixed(1);
    
    const totalProfitPoints = winsList.reduce((sum, t) => sum + parseFloat(t.points_result), 0);
    const totalLossPoints = lossesList.reduce((sum, t) => sum + Math.abs(parseFloat(t.points_result)), 0);

    updateStatDOM(winRate, total, totalWins, totalLosses, totalProfitPoints, totalLossPoints);
}

// ดันตัวเลขอัปเดตลงโครงสร้างแสดงผลหน้าเว็บ
function updateStatDOM(winRate, total, wins, losses, profitPoints, lossPoints) {
    if(document.getElementById('stat-winrate')) document.getElementById('stat-winrate').innerText = `${winRate}%`;
    if(document.getElementById('stat-winrate-bar')) document.getElementById('stat-winrate-bar').style.width = `${winRate}%`;
    if(document.getElementById('stat-total')) document.getElementById('stat-total').innerText = total;
    if(document.getElementById('stat-wins')) document.getElementById('stat-wins').innerText = wins;
    if(document.getElementById('stat-losses')) document.getElementById('stat-losses').innerText = losses;
    if(document.getElementById('stat-profit-points')) document.getElementById('stat-profit-points').innerText = `+${Math.round(profitPoints)}`;
    if(document.getElementById('stat-loss-points')) document.getElementById('stat-loss-points').innerText = `-${Math.round(lossPoints)}`;
}

// ตรวจจับพฤติกรรมฟอร์มส่งออกข้อมูลเพื่อบันทึกและคำนวณจุดอัตโนมัติ
document.getElementById('trade-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const trade_date = document.getElementById('trade_date').value;
    const entry_price = parseFloat(document.getElementById('entry_price').value);
    const sl_price = parseFloat(document.getElementById('sl_price').value);
    const tp_price = parseFloat(document.getElementById('tp_price').value);
    const result_status = document.querySelector('input[name="result_status"]:checked').value;

    if (sl_price === tp_price || entry_price === sl_price) {
        alert("ราคาที่คุณกรอกมีค่าซ้ำกัน กรุณาตรวจสอบทิศทางของราคาใหม่อีกครั้งครับ");
        return;
    }

    // 1. ตรรกะแยกแยะอัตโนมัติ: เป้ากำไร (TP) ค้ำอยู่เหนือโซนตัดขาดทุน (SL) แสดงว่าเป็นฝั่งขาขึ้น BUY
    const type = tp_price > sl_price ? 'BUY' : 'SELL';

    // 2. คำนวณหาระยะทางจุดวิ่งสะสม (Points) ตามผลลัพธ์ที่คุณเลือกกดจริง
    let points_result = 0;
    if (result_status === 'WIN') {
        // หากออเดอร์ชนะ คิดจุดจากการเคลื่อนที่ของ ราคาเข้า -> ไปหาจุดทำกำไร TP
        points_result = Math.abs(tp_price - entry_price) * 100;
    } else {
        // หากออเดอร์แพ้ คิดจุดลากจากระยะห่าง ราคาเข้า -> ไปโดนคัดขาดทุน SL
        points_result = Math.abs(entry_price - sl_price) * 100;
    }
    points_result = Math.round(points_result);

    try {
        // อ้างอิงและบันทึกข้อมูลเข้าตารางหลักตามตัวแปร TABLE
        const { error } = await supabase
            .from(TABLE) 
            .insert([
                { 
                    trade_date, 
                    type, 
                    entry_price,
                    sl_price, 
                    tp_price, 
                    points_result: points_result, 
                    result_status 
                }
            ]);

        if (error) throw error;

        // ล้างช่องข้อมูลตัวเลขเพื่อให้สะดวกในการกดกรอกรายการชุดใหม่
        document.getElementById('entry_price').value = '';
        document.getElementById('sl_price').value = '';
        document.getElementById('tp_price').value = '';
