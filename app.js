// ตั้งค่าการเชื่อมต่อ Supabase ด้วย Key ของคุณเรียบร้อยแล้ว
const SUPABASE_URL = "https://svqdlgauejvnrpqttzey.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_GIHmu2vW6FJA_o74k9hpjA_dWan3f2u";

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// อ้างอิง DOM Elements
const tradeForm = document.getElementById('trade-form');
const tradeHistory = document.getElementById('trade-history');
const winRateEl = document.getElementById('win-rate');
const totalWinEl = document.getElementById('total-win');
const totalLossEl = document.getElementById('total-loss');

// ฟังก์ชันดึงข้อมูลจาก Supabase
async function fetchTrades() {
    const { data: trades, error } = await supabase
        .from('trades')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching data:', error);
        return;
    }

    renderDashboard(trades);
}

// ฟังก์ชันคำนวณและแสดงผลสถิติ + ตาราง
function renderDashboard(trades) {
    tradeHistory.innerHTML = '';
    let wins = 0;
    let losses = 0;

    trades.forEach(trade => {
        if (trade.result === 'win') wins++;
        if (trade.result === 'loss') losses++;

        // ใส่ข้อมูลลงในตาราง
        const date = new Date(trade.created_at).toLocaleDateString('th-TH');
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${date}</td>
            <td>${trade.pair.toUpperCase()}</td>
            <td class="${trade.result === 'win' ? 'text-win' : 'text-loss'}">${trade.result.toUpperCase()}</td>
            <td class="${trade.pnl >= 0 ? 'text-win' : 'text-loss'}">${trade.pnl > 0 ? '+' : ''}${trade.pnl}</td>
        `;
        tradeHistory.appendChild(row);
    });

    // คำนวณ Win Rate
    const totalTrades = wins + losses;
    const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : 0;

    // อัปเดตตัวเลขบน Dashboard
    totalWinEl.innerText = wins;
    totalLossEl.innerText = losses;
    winRateEl.innerText = `${winRate}%`;
}

// ฟังก์ชันบันทึกข้อมูลเมื่อกด Submit Form
tradeForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const pair = document.getElementById('pair').value;
    const result = document.getElementById('result').value;
    const pnl = parseFloat(document.getElementById('pnl').value);

    const { error } = await supabase
        .from('trades')
        .insert([{ pair, result, pnl }]);

    if (error) {
        alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล (เช็กว่าได้สร้างตารางใน Supabase ชื่อ trades หรือยัง)');
        console.error(error);
    } else {
        tradeForm.reset();
        fetchTrades(); // ดึงข้อมูลใหม่มาแสดงทันที
    }
});

// เรียกทำงานครั้งแรกตอนเปิดหน้าเว็บ
fetchTrades();
