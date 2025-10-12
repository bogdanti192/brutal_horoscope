// main.js — фронтенд, обращается к /api/generate
const signsGrid = document.getElementById("signsGrid");
const preview = document.getElementById("preview");
const resultCard = document.getElementById("resultCard");
const resSign = document.getElementById("resSign");
const resText = document.getElementById("resText");
const resRate = document.getElementById("resRate");
const toneButtons = document.querySelectorAll(".tone-toggle button");
const againBtn = document.getElementById("againBtn");
const shareBtn = document.getElementById("shareBtn");

let tone = "light";

// wire tone buttons
toneButtons.forEach((b) => {
  b.addEventListener("click", (ev) => {
    toneButtons.forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    tone =
      b.dataset.tone ||
      b.getAttribute("data-tone") ||
      b.textContent.trim().toLowerCase();
    preview.innerHTML = `<div style="text-align:center;color:var(--muted)">Sarunas tons: ${tone}</div>`;
  });
});

// sign buttons
document.querySelectorAll(".sign").forEach((btn) => {
  btn.addEventListener("click", () => selectSign(btn.dataset.sign));
});

function selectSign(sign) {
  preview.innerHTML = `<div style="text-align:center"><div style="font-size:28px;margin-bottom:6px">${getEmojiFor(
    sign
  )}</div><div style="font-weight:700">${sign}</div><div style="color:var(--muted);margin-top:6px">Ģenerējam...</div></div>`;
  fetchFor(sign);
}

function getEmojiFor(sign) {
  const el = Array.from(document.querySelectorAll(".sign")).find(
    (s) => s.dataset.sign === sign
  );
  if (!el) return "✨";
  return el.querySelector(".emoji").textContent || "✨";
}

async function fetchFor(sign) {
  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sign, tone }),
    });
    const data = await res.json();
    if (!data.ok) {
      preview.innerHTML = `<div style="text-align:center;color:#ff8a8a">Kļūda: ${
        data.error || "Nezināms"
      }</div>`;
      return;
    }
    resSign.textContent = data.sign;
    resText.textContent = data.text;
    resRate.textContent = `Sarkasms: ${data.sarcasm}/100`;
    resultCard.style.display = "block";
    preview.innerHTML = `<div style="text-align:center;color:var(--muted)">Gatavs</div>`;
  } catch (e) {
    preview.innerHTML = `<div style="text-align:center;color:#ff8a8a">Servers nav pieejams 😭</div>`;
  }
}

againBtn?.addEventListener("click", () => {
  const sign = resSign.textContent;
  if (sign) fetchFor(sign);
});

shareBtn?.addEventListener("click", async () => {
  const text = `${resSign.textContent}: ${resText.textContent} (Sarkasms ${resRate.textContent})`;
  if (navigator.share) {
    try {
      await navigator.share({
        title: `Horoskops ${resSign.textContent}`,
        text,
      });
    } catch (e) {}
  } else if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    alert("Kopēts starpliktuvē");
  } else {
    prompt("Kopējiet tekstu:", text);
  }
});

// main.js (простой и надёжный)
document.addEventListener("DOMContentLoaded", () => {
  const signsGrid = document.getElementById("signsGrid");
  if (!signsGrid) return;

  const signs = Array.from(signsGrid.querySelectorAll(".sign"));
  const preview = document.getElementById("preview");
  const resultCard = document.getElementById("resultCard");
  const resSign = document.getElementById("resSign");
  const resText = document.getElementById("resText");

  function selectSign(button) {
    // снять активный класс со всех
    signs.forEach((s) => s.classList.remove("active"));
    // добавить активный класс выбранному
    button.classList.add("active");

    // взять имя и смайлик
    const name =
      button.dataset.sign || button.querySelector("b")?.textContent || "---";
    const emoji = button.querySelector(".emoji")?.innerHTML || "";

    // обновить превью
    preview.innerHTML = `
      <div style="text-align:center;">
        <div class="emoji" style="font-size:28px">${emoji}</div>
        <div style="margin-top:8px; font-weight:700">${name}</div>
      </div>
    `;

    // показать и заполнить resultCard (при желании)
    if (resultCard && resSign && resText) {
      resSign.textContent = name;
      // здесь можно подставить реальный текст; пока заглушка
      resText.textContent = "Šeit būs sarkastisks horoskops izvēlētajam zīmei.";
      resultCard.style.display = "block";
    }
  }

  // навесим обработчики
  signs.forEach((btn) => {
    btn.addEventListener("click", () => selectSign(btn));

    // для гарантированной клавиатурной поддержки (Enter/Space)
    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectSign(btn);
      }
    });
  });
});

// cursor-press.js — изменить курсор при нажатии/удержании кнопки
(function () {
  const btn = document.querySelector('button[type="submit"]');
  if (!btn) return;

  // при зажатии — показать "закрытую руку" (grabbing)
  function onPressStart() {
    // ставим курсор и на саму кнопку и на body (на случай быстрой дерганой мыши)
    btn.style.cursor = "grabbing";
    document.body.style.cursor = "grabbing";
  }

  // при отпускании — вернуть pointer
  function onPressEnd() {
    btn.style.cursor = "pointer";
    document.body.style.cursor = ""; // вернёт к стилю по умолчанию
  }

  btn.addEventListener("mousedown", onPressStart);
  window.addEventListener("mouseup", onPressEnd);

  // для тач-устройств
  btn.addEventListener("touchstart", onPressStart, { passive: true });
  window.addEventListener("touchend", onPressEnd, { passive: true });
})();
