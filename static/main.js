// main.js — фронтенд, обращается к /api/generate
const signsGrid = document.getElementById('signsGrid');
const preview = document.getElementById('preview');
const resultCard = document.getElementById('resultCard');
const resSign = document.getElementById('resSign');
const resText = document.getElementById('resText');
const resRate = document.getElementById('resRate');
const toneButtons = document.querySelectorAll('.tone-toggle button');
const againBtn = document.getElementById('againBtn');
const shareBtn = document.getElementById('shareBtn');

let tone = 'light';

// wire tone buttons
toneButtons.forEach(b=>{
  b.addEventListener('click', (ev)=>{
    toneButtons.forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    tone = b.dataset.tone || b.getAttribute('data-tone') || b.textContent.trim().toLowerCase();
    preview.innerHTML = `<div style="text-align:center;color:var(--muted)">Тон: ${tone}</div>`;
  });
});

// sign buttons
document.querySelectorAll('.sign').forEach(btn=>{
  btn.addEventListener('click', ()=>selectSign(btn.dataset.sign));
});

function selectSign(sign){
  preview.innerHTML = `<div style="text-align:center"><div style="font-size:28px;margin-bottom:6px">${getEmojiFor(sign)}</div><div style="font-weight:700">${sign}</div><div style="color:var(--muted);margin-top:6px">Генерируем...</div></div>`;
  fetchFor(sign);
}

function getEmojiFor(sign){
  const el = Array.from(document.querySelectorAll('.sign')).find(s => s.dataset.sign === sign);
  if(!el) return '✨';
  return el.querySelector('.emoji').textContent || '✨';
}

async function fetchFor(sign){
  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({sign, tone})
    });
    const data = await res.json();
    if(!data.ok){
      preview.innerHTML = `<div style="text-align:center;color:#ff8a8a">Ошибка: ${data.error||'неизвестно'}</div>`;
      return;
    }
    resSign.textContent = data.sign;
    resText.textContent = data.text;
    resRate.textContent = `Сарказм: ${data.sarcasm}/100`;
    resultCard.style.display = 'block';
    preview.innerHTML = `<div style="text-align:center;color:var(--muted)">Готово — смотри справа</div>`;
  } catch (e){
    preview.innerHTML = `<div style="text-align:center;color:#ff8a8a">Сервер недоступен</div>`;
  }
}

againBtn?.addEventListener('click', ()=>{
  const sign = resSign.textContent;
  if(sign) fetchFor(sign);
});

shareBtn?.addEventListener('click', async ()=>{
  const text = `${resSign.textContent}: ${resText.textContent} (сарказм ${resRate.textContent})`;
  if(navigator.share){
    try{ await navigator.share({title:`Гороскоп ${resSign.textContent}`, text}); }catch(e){}
  } else if(navigator.clipboard){
    await navigator.clipboard.writeText(text);
    alert('Скопировано в буфер обмена');
  } else {
    prompt('Скопируйте текст:', text);
  }
});
