// Supabase Configuration
const SUPABASE_URL = "https://svqdlgauejvnrpqttzey.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2cWRsZ2F1ZWp2bnJwcXR0emV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNTg3NjQsImV4cCI6MjA5NjkzNDc2NH0.glkc753AH_F50WowGozeQtWQxkIO4lf9t1-IIG3NNfE";

let supabase;

try {
    if (window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    } else {
        console.error("Supabase library loading failed.");
    }
} catch (err) {
    console.error("Initialization error:", err);
}

// 1. ดึงวันที่ปัจจุบันมาเซ็ตใส่ Input อัตโนมัติ (เป็นเวลาเครื่องผู้ใช้)
try {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('trade_date').value = today;
} catch (e) {
    console.error("Error setting automatic date:", e);
}

document.addEventListener('DOMContentLoaded', fetchTrades);

// ดึงข้อมูลประวัติการเทรดจาก Supabase
async function fetchTrades() {
    const listContainer = document.getElementById('trade-list');
    try {
        if (!supabase) {
            listContainer.innerHTML = `<tr><td colspan="5" class="px-6 py-10 text-center text-red-400">เชื่อมต่อฐานข้อมูลไม่สำเร็จ</td></tr>`;
            return;
        }

        const { data, error } = await supabase
            .from('gold_trades')
            .select('*')
            .order('trade_date', { ascending: false })
            .order('id', { ascending: false });

        if (error) throw error;
        renderTrades(data);
        calculateStats(data);
    } catch (error) {
        console.error("Error fetching data:", error);
        listContainer.innerHTML = `<tr><td colspan="5" class="px-6 py-10 text-center text-red-400">เกิดข้อผิดพลาด: ${error.message || 'ไม่สามารถโหลดข้อมูลได้'}</td></tr>`;
    }
}

// แสดงผลตารางประวัติการเทรด
function renderTrades(trades) {
    const listContainer = document.getElementById('trade-list');
    document.getElementById('trade-count').innerText = `${trades.length} ออเดอร์`;

    if (!trades || trades.length === 0) {
        listContainer.innerHTML = `<tr><td colspan="5" class="px-6 py-10 text-center text-gray-500">ยังไม่มีประวัติการเทรดถูกบันทึกไว้</td></tr>`;
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
                    <div>SL: <span class="text-gray-200">${parseFloat(trade.sl_price).toFixed(2)}</span></div>
                    <div class="mt-0.5">TP: <span class="text-gray-200">${parseFloat(trade.tp_price).toFixed(2)}</span></div>
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

// คำนวณสถิติภาพรวมแดชบอร์ด
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

function updateStatDOM(winRate, total, wins, losses, profitPoints, lossPoints) {
    if(document.getElementById('stat-winrate')) document.getElementById('stat-winrate').innerText = `${winRate}%`;
    if(document.getElementById('stat-winrate-bar')) document.getElementById('stat-winrate-bar').style.width = `${winRate}%`;
    if(document.getElementById('stat-total')) document.getElementById('stat-total').innerText = total;
    if(document.getElementById('stat-wins')) document.getElementById('stat-wins').innerText = wins;
    if(document.getElementById('stat-losses')) document.getElementById('stat-losses').innerText = losses;
    if(document.getElementById('stat-profit-points')) document.getElementById('stat-profit-points').innerText = `+${Math.round(profitPoints)}`;
    if(document.getElementById('stat-loss-points')) document.getElementById('stat-loss-points').innerText = `-${Math.round(lossPoints)}`;
}

// ตรวจสอบการฟอร์มบันทึกข้อมูล
document.getElementById('trade-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const trade_date = document.getElementById('trade_date').value;
    const sl_price = parseFloat(document.getElementById('sl_price').value);
    const tp_price = parseFloat(document.getElementById('tp_price').value);
    const result_status = document.querySelector('input[name="result_status"]:checked').value;

    if (sl_price === tp_price) {
        alert("ราคา SL และ TP ไม่ควรเท่ากัน กรุณาตรวจสอบอีกครั้งครับ");
        return;
    }

    // 2. สรุปประเภทออเดอร์ BUY หรือ SELL อัตโนมัติจากโครงสร้างราคา SL / TP
    // หลักการ: ถ้าเป้าหมายทำกำไร (TP) อยู่สูงกว่า จุดตัดขาดทุน (SL) แสดงว่าเป็นขาขึ้นหรือ BUY
    const type = tp_price > sl_price ? 'BUY' : 'SELL';

    // 3. คำนวณหาระยะจุด (Points) อัตโนมัติจากผลต่างของราคาคูณด้วย 100 (ตามหลักของทองคำ XAUUSD)
    let points_result = Math.abs(tp_price - sl_price) * 100;
    points_result = Math.round(points_result);

    try {
        const { error } = await supabase
            .from('gold_trades')
            .insert([
                { 
                    trade_date, 
                    type, 
                    sl_price, 
                    tp_price, 
                    points_result: points_result, 
                    result_status 
                }
            ]);

        if (error) throw error;

        // ล้างกล่องข้อความราคากลับเป็นว่างเปล่าเพื่อรอกรอกออเดอร์ถัดไป
        document.getElementById('sl_price').value = '';
        document.getElementById('tp_price').value = '';
        fetchTrades();

    } catch (error) {
        console.error("Error inserting data:", error);
        alert("ไม่สามารถบันทึกข้อมูลได้: " + error.message);
    }
});

// ฟังก์ชันลบข้อมูล
async function deleteTrade(id) {
    if (!confirm('คุณแน่ใจใช่ไหมที่จะลบประวัติออเดอร์นี้?')) return;

    try {
        const { error } = await supabase
            .from('gold_trades')
            .delete()
            .eq('id', id);

        if (error) throw error;
        fetchTrades();
    } catch (error) {
        console.error("Error deleting data:", error);
        alert("ไม่สามารถลบข้อมูลได้");
    }
}

// แปลงฟอร์แมตวันแสดงผลในตารางเป็นภาษาไทย
function formatDate(dateString) {
    try {
        const options = { day: 'numeric', month: 'short', year: 'numeric' };
        return new Date(dateString).toLocaleDateString('th-TH', options);
    } catch(e) {
        return dateString;
    }
}
