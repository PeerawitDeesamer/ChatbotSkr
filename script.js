document.addEventListener('DOMContentLoaded', () => {
  const chatWindow = document.getElementById('chat-window');
  const faqButtons = document.querySelectorAll('.faq-btn');
  const userInput = document.getElementById('user-input');
  const sendButton = document.getElementById('send-btn');

  // === 1) คลังความรู้ (เพิ่มได้เรื่อยๆ) ===
  // แนะนำย้ายไปไฟล์ knowledge.json แล้ว fetch มาก็ได้
  const KB = [
    {
      q: "โรงเรียนมีสายการเรียนอะไรบ้าง",
      a: "EP 2 ห้อง, GEP 2 ห้อง, วมว 2 ห้อง, วิทย์-คณิต 5 ห้อง, ศิลป์-คำนวณ 3 ห้อง, ศิลป์-ญี่ปุ่น 1 ห้อง, ศิลป์-จีน 1 ห้อง"
    },
    {
      q: "โรงเรียนก่อตั้งมากี่ปี",
      a: "โรงเรียนสวนกุหลาบวิทยาลัย รังสิต ก่อตั้งมาแล้วประมาณ 33 ปี"
    },
    // เพิ่มข้อมูลสำคัญอื่นๆ ในสโคปที่ต้องตอบได้ เช่น เวลาทำการ, ติดต่อครู, ค่าเทอม, ที่อยู่, เครื่องแบบ ฯลฯ
    {
      q: "ที่อยู่โรงเรียน",
      a: "ตำบล คลองสี่ อำเภอคลองหลวง ปทุมธานี 12120"
    },
    {
      q: "เวลาทำการ",
      a: "จันทร์–ศุกร์ 07:30–17:00"
    },
    {
      q: "ติดต่อครูฝ่ายวิชาการ",
      a: "อีเมล @Suankularbwittayalai Rangsit School หรือ โทร 02-904-9803-5"
    },
    {
      q:"ผู้อำนวยการคนปัจจุบัน",
      a:"นายชาลี วัฒนเขจร"
    }
  ];

  // === 2) ตัวช่วย normalize & tokenize (ง่ายๆให้พอ fuzzy) ===
  const normalize = (s) =>
    (s || "")
      .toLowerCase()
      .replace(/[^\p{Letter}\p{Number}\s]/gu, '')   // ตัดสัญลักษณ์
      .replace(/\s+/g, ' ')                          // เว้นวรรคซ้อน
      .trim();

  const tokenize = (s) => normalize(s).split(' ').filter(Boolean);

  // === 3) การวัดความคล้ายแบบง่าย (TF overlap + bonus) ===
  function similarity(a, b) {
    const ta = tokenize(a), tb = tokenize(b);
    if (ta.length === 0 || tb.length === 0) return 0;
    const setA = new Set(ta), setB = new Set(tb);
    const inter = [...setA].filter(x => setB.has(x)).length;
    const jaccard = inter / (setA.size + setB.size - inter);
    const substrBonus = normalize(b).includes(normalize(a)) || normalize(a).includes(normalize(b)) ? 0.1 : 0;
    return jaccard + substrBonus;
  }

  // === 4) ตัวจัดการ “แพตเทิร์นคำถาม” (intent ง่ายๆ) ===
  // ใส่ logic เฉพาะทางของสโคปโรงเรียน เช่น เวลาทำการ, เบอร์โทร, ค่าธรรมเนียม, อาคาร ฯลฯ
  const patternHandlers = [
    {
      match: /กี่ปี|ก่อตั้ง|ตั้งมากี่ปี/,
      handle: () => findBest("โรงเรียนก่อตั้งมากี่ปี")?.a || "ข้อมูลปีที่ก่อตั้งยังไม่อยู่ในคลังความรู้ครับ"
    },
    {
      match: /สายการเรียน|แผนการเรียน|program|โปรแกรม/,
      handle: () => findBest("โรงเรียนมีสายการเรียนอะไรบ้าง")?.a || "ยังไม่มีข้อมูลสายการเรียนในคลังครับ"
    },
    {
      match: /ที่อยู่|address|อยู่ที่ไหน/,
      handle: () => findBest("ที่อยู่โรงเรียน")?.a || "ยังไม่มีข้อมูลที่อยู่ครับ"
    },
    {
      match: /เวลา(ทำการ|เรียน)|เปิดกี่โมง|ปิดกี่โมง/,
      handle: () => findBest("เวลาทำการ")?.a || "ยังไม่มีข้อมูลเวลาเปิด–ปิดครับ"
    },
    {
      match: /ผู้อำนวยการ|ผอ.|ผ.อ.|ผ.อ|ผอ/,
      handle: () =>findBest("ผู้อำนวยการคนปัจจุบัน")?.a || "ยังไม่มีข้อมูลผู้อำนวยการคนปัจจุบัน"
    },
    // เพิ่ม intent อื่นๆ ได้เลยตามสโคป
  ];

  // === 5) ค้น KB แล้วจัดอันดับด้วย similarity ===
  function findBest(query) {
    let best = null;
    let bestScore = 0;
    for (const item of KB) {
      const score = Math.max(
        similarity(query, item.q),
        similarity(item.q, query)
      );
      if (score > bestScore) {
        bestScore = score;
        best = item;
      }
    }
    // กำหนด threshold กันหลุดประเด็น
    return bestScore >= 0.25 ? best : null;
  }

  // === 6) UI helper ===
  function addMessage(message, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('chat-message', isUser ? 'user-message' : 'bot-message');
    messageDiv.innerHTML = `<p>${message}</p>`;
    chatWindow.appendChild(messageDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  function thinkAnswer(question) {
    // 6.1 ลองจับ intent ก่อน
    for (const ph of patternHandlers) {
      if (ph.match.test(question)) {
        return ph.handle(question);
      }
    }
    // 6.2 ถ้าไม่เข้า intent ลองค้น KB
    const hit = findBest(question);
    if (hit) return hit.a;

    // 6.3 ไม่พบ → แนะนำผู้ใช้ขยายความ (แต่ยังไม่บังคับต้องถามนำ)
    return "ตอนนี้ยังไม่มีคำตอบในคลังความรู้ ลองพิมพ์ใหม่ให้ชัดขึ้นอีกนิดได้มั้ยครับ เช่น “ค่าเทอม ม.4 เท่าไหร่ ปี 2568” หรือบอกเพิ่มว่าอยากรู้ส่วนไหนของโรงเรียน";
  }

  function handleQuestion(question) {
    addMessage(question, true);
    setTimeout(() => {
      const answer = thinkAnswer(question);
      addMessage(answer);
    }, 400);
  }

  // ปุ่ม FAQ เดิมยังใช้ได้ เป็นเพียงทางลัด
  faqButtons.forEach(btn => btn.addEventListener('click', () => {
    const question = btn.getAttribute('data-question');
    handleQuestion(question);
  }));

  sendButton.addEventListener('click', () => {
    const q = userInput.value.trim();
    if (q) {
      handleQuestion(q);
      userInput.value = '';
    }
  });
  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendButton.click();
  });
});
