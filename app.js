// ใช้ URL และ Key ของคุณที่ส่งมาเรียบร้อยแล้ว
const SUPABASE_URL = "https://svqdlgauejvnrpqttzey.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_GIHmu2vW6FJA_o74k9hpjA_dWan3f2u";

// เชื่อมต่อระบบ Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// อ้างอิง HTML Elements
const tradeForm = document.getElementById('trade-form');
const tradeHistory = document.getElementById('trade-history');
const winRateEl = document.getElementById('win-rate');
const totalWinEl = document.getElementById('total-win');
const totalLossEl = document.getElementById('total-loss');

// ฟังก์ชัน: ดึงข้อมูลจากฐานข้อมูล
async function fetchTrades() {
    try {
        const { data: trades, error } = await supabaseClient
            .from('trades')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            alert(`❌ ดึงข้อมูลไม่สำเร็จ: ${error.message}\n\nกรุณาเช็กว่าคุณได้สร้างตารางชื่อ 'trades' ใน Supabase แล้วหรือยัง?`);
            return;
        }

        renderDashboard(trades || []);
    } catch (err) {
        console.error('Error:', err);
    }
}

// ฟังก์ชัน: คำนวณสถิติและวาดตารางลงหน้าเว็บ
function renderDashboard(trades) {
    tradeHistory.innerHTML = '';
    let wins = 0;
    let losses = 0;

    trades.forEach(trade => {
        if (trade.result === 'win') wins++;
        if (trade.result === 'loss') losses++;

        const date = new Date(trade.created_at).toLocaleDateString('th-TH', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'
        });
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${date}</td>
            <td><b>${trade.pair.toUpperCase()}</b></td>
            <td class="${trade.result === 'win' ? 'text-win' : 'text-loss'}">${trade.result.toUpperCase()}</td>
            <td class="${trade.pnl >= 0 ? 'text-win' : 'text-loss'}">${trade.pnl > 0 ? '+' : ''}${trade.pnl}</td>
            <td><button class="btn-delete" onclick="deleteTrade(${trade.id})">ลบ</button></td>
                `;
        tradeHistory.appendChild(row);
    });

    // คำนวณ Win Rate
    const totalTrades = wins + losses;
    const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : 0;

    // แสดงผลบนหน้าจอ
    totalWinEl.innerText = wins;
    totalLossEl.innerText = losses;
    winRateEl.innerText = `${winRate}%`;
}

// ฟังก์ชัน: กดปุ่มเพื่อบันทึกข้อมูลใหม่
tradeForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const pair = document.getElementById('pair').value.trim();
    const result = document.getElementById('result').value;
    const pnl = parseFloat(document.getElementById('pnl').value);

    const { error } = await supabaseClient
        .from('trades')
        .insert([{ pair, result, pnl }]);

    if (error) {
        alert(`❌ บันทึกข้อมูลไม่เข้า!\nเหตุผลจากระบบ: ${error.message}\n\n💡 วิธีแก้: ลองไปที่ตาราง trades บนเว็บ Supabase แล้วกดปุ่ม 'Disable RLS' เพื่อเปิดสิทธิ์บันทึกข้อมูลครับ`);
    } else {
        tradeForm.reset();
        fetchTrades();
    }
});

// ฟังก์ชัน: ลบข้อมูล
async function deleteTrade(id) {
    if (confirm('คุณแน่ใจใช่ไหมที่จะลบประวัติการเทรดนี้?')) {
        const { error } = await supabaseClient
            .from('trades')
            .delete()
            .eq('id', id);

        if (error) {
            alert(`❌ ลบไม่สำเร็จ: ${error.message}`);
        } else {
            fetchTrades();
        }
    }
}

// เริ่มต้นดึงข้อมูลเมื่อเปิดหน้าเว็บครั้งแรก
fetchTrades();
