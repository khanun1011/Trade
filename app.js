// บันทึกการเชื่อมต่อ Supabase ด้วยลิงก์และ Key ของคุณ
const SUPABASE_URL = "https://svqdlgauejvnrpqttzey.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_GIHmu2vW6FJA_o74k9hpjA_dWan3f2u";

// เริ่มต้นใช้งาน Supabase Client
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// อ้างอิง DOM Elements จากหน้าเว็บ HTML
const tradeForm = document.getElementById('trade-form');
const tradeHistory = document.getElementById('trade-history');
const winRateEl = document.getElementById('win-rate');
const totalWinEl = document.getElementById('total-win');
const totalLossEl = document.getElementById('total-loss');

// 1. ฟังก์ชันดึงข้อมูลทั้งหมดมาจาก Supabase
async function fetchTrades() {
    try {
        const { data: trades, error } = await supabase
            .from('trades')
            .select('*')
            .order('created_at', { ascending: false });

        // หากดึงข้อมูลไม่สำเร็จ ให้แจ้งเตือนบอกสาเหตุ
        if (error) {
            console.error('ดึงข้อมูลไม่สำเร็จ:', error.message);
            alert(`ไม่สามารถดึงข้อมูลได้: ${error.message}\n(ใบ้: เช็กว่าสร้างตารางชื่อ trades หรือยัง?)`);
            return;
        }

        // หากดึงได้ปกติ ก็นำไปคำนวณและแสดงผล
        renderDashboard(trades || []);
    } catch (err) {
        console.error('เกิดข้อผิดพลาดร้ายแรง:', err);
    }
}

// 2. ฟังก์ชันคำนวณวินเรต และวาดตารางแสดงผลบนหน้าจอ
function renderDashboard(trades) {
    tradeHistory.innerHTML = ''; // ล้างข้อมูลเก่าในตารางก่อน
    let wins = 0;
    let losses = 0;

    trades.forEach(trade => {
        if (trade.result === 'win') wins++;
        if (trade.result === 'loss') losses++;

        // จัดรูปแบบวันที่ให้เป็นแบบไทยอ่านง่าย
        const date = new Date(trade.created_at).toLocaleDateString('th-TH');
        
        // สร้างแถวตารางใหม่
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${date}</td>
            <td>${trade.pair ? trade.pair.toUpperCase() : '-'}</td>
            <td class="${trade.result === 'win' ? 'text-win' : 'text-loss'}">${trade.result ? trade.result.toUpperCase() : '-'}</td>
            <td class="${trade.pnl >= 0 ? 'text-win' : 'text-loss'}">${trade.pnl > 0 ? '+' : ''}${trade.pnl}</td>
        `;
        tradeHistory.appendChild(row);
    });

    // สูตรคำนวณหา Win Rate %
    const totalTrades = wins + losses;
    const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : 0;

    // อัปเดตตัวเลขบน Dashboard การ์ดด้านบน
    totalWinEl.innerText = wins;
    totalLossEl.innerText = losses;
    winRateEl.innerText = `${winRate}%`;
}

// 3. ฟังก์ชันดักจับตอนกดปุ่ม "บันทึกข้อมูล"
tradeForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // ป้องกันหน้าเว็บรีเฟรชตัวเองดื้อๆ

    // ดึงค่าจากช่องอินพุตต่างๆ บนหน้าเว็บ
    const pair = document.getElementById('pair').value.trim();
    const result = document.getElementById('result').value;
    const pnl = parseFloat(document.getElementById('pnl').value);

    // ส่งชุดข้อมูลไปเพิ่มในตาราง 'trades' บน Supabase
    const { error } = await supabase
        .from('trades')
        .insert([{ pair, result, pnl }]);

    if (error) {
        // หากเซฟไม่เข้า จะมีป๊อปอัปเด้งบอกทันทีว่าเกิดจากอะไร เช่น ติด RLS หรือพิมพ์ชื่อคอลัมน์ผิด
        alert(`❌ บันทึกข้อมูลไม่เข้า!\nสาเหตุจากระบบ: ${error.message}`);
        console.error('Insert error details:', error);
    } else {
        // หากสำเร็จ ให้เคลียร์ช่องฟอร์มให้ว่าง และดึงข้อมูลใหม่มาโชว์ทันที
        tradeForm.reset();
        fetchTrades();
    }
});

// สั่งให้หน้าเว็บไปดึงข้อมูลมาแสดงทันทีที่เปิดหน้าเว็บขึ้นมาครั้งแรก
fetchTrades();
