// Supabase Configuration การตั้งค่าของคุณ
const SUPABASE_URL = "https://svqdlgauejvnrpqttzey.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2cWRsZ2F1ZWp2bnJwcXR0emV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNTg3NjQsImV4cCI6MjA5NjkzNDc2NH0.glkc753AH_F50WowGozeQtWQxkIO4lf9t1-IIG3NNfE";

// เริ่มต้นเปิดใช้งานตัวช่วยของ Supabase Client
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ตั้งค่าปฏิทินในฟอร์มให้ตรงกับวันปัจจุบัน
document.getElementById('trade_date').valueAsDate = new Date();

// เมื่อหน้าเว็บโหลดโครงสร้างเสร็จ ให้ดึงข้อมูลมาแสดงผลทันที
document.addEventListener('DOMContentLoaded', fetchTrades);

// ดึงข้อมูลประวัติจากตาราง gold_trades บน Supabase
async function fetchTrades() {
    try {
        const { data, error } = await supabase
            .from('gold_trades')
            .select('*')
            .order('trade_date', { ascending: false })
            .order('id', { ascending: false });

        if (error) throw error;
        renderTrades(data);
        calculateStats(data);
    } catch (error) {
        console.error("Error fetching data:", error.message);
        alert("ไม่สามารถดึงข้อมูลได้ กรุณาตรวจสอบการตั้งค่าในระบบหลังบ้านหรือ RLS");
    }
}

// นำอาร์เรย์ของข้อมูลมาทำซ้ำแล้วเรนเดอร์ลงในตาราง HTML
function renderTrades(trades) {
    const listContainer = document.getElementById('trade-list');
    document.getElementById('trade-count').innerText = `${trades.length} ออเดอร์`;

    if (trades.length === 0) {
        listContainer.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-10 text-center text-gray-500">ยังไม่มีประวัติการเทรดถูกบันทึกไว้</td>
            </tr>
        `;
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
                    <div class="mt-0.5">Exit: <span class="text-gray-200">${parseFloat(trade.exit_price).toFixed(2)}</span></div>
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

// คำนวณเปอร์เซ็นต์ Win Rate และจำนวนจุดฝั่งบวกและลบทั้งหมด
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

// แสดงตัวเลขการคำนวณลงในโครงสร้าง UI ของแต่ละช่องการ์ดแบบเรียลไทม์
function updateStatDOM(winRate, total, wins, losses, profitPoints, lossPoints) {
    document.getElementById('stat-winrate').innerText = `${winRate}%`;
    document.getElementById('stat-winrate-bar').style.width = `${winRate}%`;
    document.getElementById('stat-total').innerText = total;
    document.getElementById('stat-wins').innerText = wins;
    document.getElementById('stat-losses').innerText = losses;
    document.getElementById('stat-profit-points').innerText = `+${Math.round(profitPoints)}`;
    document.getElementById('stat-loss-points').innerText = `-${Math.round(lossPoints)}`;
}

// ตรวจจับเหตุการณ์ฟอร์มส่งข้อมูล เพื่อคิดคำนวณจุดและอัปโหลดขึ้นเซิร์ฟเวอร์
document.getElementById('trade-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const trade_date = document.getElementById('trade_date').value;
    const type = document.querySelector('input[name="type"]:checked').value;
    const entry_price = parseFloat(document.getElementById('entry_price').value);
    const exit_price = parseFloat(document.getElementById('exit_price').value);

    let points_result = 0;
    let result_status = 'WIN';

    // คำนวณความต่างราคาแปลงเป็น Points (ราคาทองคำเคลื่อนที่ 1 USD = 100 จุด)
    if (type === 'BUY') {
        points_result = (exit_price - entry_price) * 100;
    } else {
        points_result = (entry_price - exit_price) * 100;
    }

    points_result = Math.round(points_result);
    result_status = points_result >= 0 ? 'WIN' : 'LOSS';

    try {
        const { error } = await supabase
            .from('gold_trades')
            .insert([
                { 
                    trade_date, 
                    type, 
                    entry_price, 
                    exit_price, 
                    points_result: Math.abs(points_result), 
                    result_status 
                }
            ]);

        if (error) throw error;

        // เคลียร์ค่ากล่องข้อความราคา เพื่อให้พร้อมพิมพ์ออเดอร์ถัดไป
        document.getElementById('entry_price').value = '';
        document.getElementById('exit_price').value = '';
        fetchTrades();

    } catch (error) {
        console.error("Error inserting data:", error.message);
        alert("ไม่สามารถบันทึกข้อมูลได้: " + error.message);
    }
});

// ฟังก์ชันลบแถวข้อมูลตามไอดี
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
        console.error("Error deleting data:", error.message);
        alert("ไม่สามารถลบข้อมูลได้");
    }
}

// จัดการรูปแบบวันที่แสดงผลให้เป็นภาษาไทยแบบย่ออ่านง่าย
function formatDate(dateString) {
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('th-TH', options);
}
