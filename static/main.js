const signsGrid = document.getElementById("signsGrid");
const preview = document.getElementById("preview");
const resultCard = document.getElementById("resultCard");
const resSign = document.getElementById("resSign");
const resText = document.getElementById("resText");
const againBtn = document.getElementById("againBtn");
const shareBtn = document.getElementById("shareBtn");
const toneButtons = document.querySelectorAll(".tone-toggle button");

let tone = "light";

toneButtons.forEach((b) => {
  b.addEventListener("click", (ev) => {
    toneButtons.forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    tone = b.dataset.tone;
    
    const selectedSign = document.querySelector(".sign.active");
    if (selectedSign) {
      selectSign(selectedSign.dataset.sign);
    }
  });
});

document.querySelectorAll(".sign").forEach((btn) => {
  btn.addEventListener("click", () => selectSign(btn.dataset.sign));
});

async function selectSign(signName) {
  document.querySelectorAll(".sign").forEach((s) => s.classList.remove("active"));
  document.querySelector(`[data-sign="${signName}"]`).classList.add("active");

  const emoji = document.querySelector(`[data-sign="${signName}"] .emoji`).innerHTML;
  
  preview.innerHTML = `
    <div style="text-align:center;">
      <div class="emoji" style="font-size:28px">${emoji}</div>
      <div style="margin-top:8px; font-weight:700">${signName}</div>
    </div>
  `;

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sign: signName, tone }),
    });
    const data = await res.json();
    
    if (data.error) {
      resText.textContent = "Kļūda: " + data.error;
    } else {
      resSign.textContent = signName;
      resText.textContent = data.text;
      document.getElementById("resRate").textContent = `Sarkasms: ${data.sarcasm || 0}/100`;
    }
    
    resultCard.style.display = "block";
  } catch (err) {
    resText.textContent = "Tīkla kļūda. Mēģiniet vēlreiz.";
    resultCard.style.display = "block";
  }
}

againBtn?.addEventListener("click", () => {
  resultCard.style.display = "none";
});

shareBtn?.addEventListener("click", async () => {
  const text = resText.textContent;
  if (navigator.share) {
    try {
      await navigator.share({
        title: "Mans Brutālais Horoskops",
        text: text,
      });
    } catch (err) {
      console.log("Dalīšanās atcelta");
    }
  } else {
    navigator.clipboard.writeText(text);
    alert("Horoskops nokopēts starpliktuvē!");
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const signsGrid = document.getElementById("signsGrid");
  if (!signsGrid) return;

  const signs = signsGrid.querySelectorAll(".sign");
  const preview = document.getElementById("preview");
  const resultCard = document.getElementById("resultCard");
  const resSign = document.getElementById("resSign");
  const resText = document.getElementById("resText");

  function selectSign(button) {
    signs.forEach((s) => s.classList.remove("active"));
    button.classList.add("active");

    const name =
      button.dataset.sign || button.querySelector("b")?.textContent || "---";
    const emoji = button.querySelector(".emoji")?.innerHTML || "";

    preview.innerHTML = `
      <div style="text-align:center;">
        <div class="emoji" style="font-size:28px">${emoji}</div>
        <div style="margin-top:8px; font-weight:700">${name}</div>
      </div>
    `;

    if (resultCard && resSign && resText) {
      resSign.textContent = name;
      resText.textContent = "Šeit būs sarkastisks horoskops izvēlētajam zīmei.";
      resultCard.style.display = "block";
    }
  }

  signs.forEach((btn) => {
    btn.addEventListener("click", () => selectSign(btn));

    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectSign(btn);
      }
    });
  });
});

(function () {
  const btn = document.querySelector('button[type="submit"]');
  if (!btn) return;

  function onPressStart() {
    btn.style.cursor = "grabbing";
    document.body.style.cursor = "grabbing";
  }

  function onPressEnd() {
    btn.style.cursor = "pointer";
    document.body.style.cursor = "";
  }

  btn.addEventListener("mousedown", onPressStart);
  window.addEventListener("mouseup", onPressEnd);

  btn.addEventListener("touchstart", onPressStart, { passive: true });
  window.addEventListener("touchend", onPressEnd, { passive: true });
})();
