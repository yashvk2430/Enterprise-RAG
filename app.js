/* =====================================================
   Enterprise RAG – Frontend JavaScript
   Connects to FastAPI backend at http://localhost:8000
   Multiple PDF & Image Upload + Cancel Support
===================================================== */

const API_BASE = "http://localhost:8000";

// ─── State ────────────────────────────────────────────
let pdfFiles = [];
let imgFiles = [];
let isQuerying = false;
let chatHistory = [];

// Cancel controllers
let pdfAbortController = null;
let imgAbortController = null;
let pdfCancelled = false;
let imgCancelled = false;

// ─── On Load ─────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  initTyping();
  initDragDrop();
  checkAPIStatus();
  setInterval(checkAPIStatus, 10000);
  navScrollEffect();
});

// ─── Navbar scroll effect ────────────────────────────
function navScrollEffect() {
  const nav = document.getElementById("navbar");
  window.addEventListener("scroll", () => {
    nav.classList.toggle("scrolled", window.scrollY > 40);
  });
}

// ─── Typing animation ────────────────────────────────
const typingWords = ["Your Documents", "PDFs & Reports", "Images & Files", "Enterprise Data"];
let wordIdx = 0, charIdx = 0, deleting = false;

function initTyping() {
  const el = document.getElementById("typingText");
  if (!el) return;

  function type() {
    const word = typingWords[wordIdx];
    if (!deleting) {
      el.textContent = word.slice(0, ++charIdx);
      if (charIdx === word.length) { deleting = true; setTimeout(type, 2000); return; }
    } else {
      el.textContent = word.slice(0, --charIdx);
      if (charIdx === 0) { deleting = false; wordIdx = (wordIdx + 1) % typingWords.length; }
    }
    setTimeout(type, deleting ? 50 : 90);
  }
  type();
}

// ─── API Status Check ────────────────────────────────
async function checkAPIStatus() {
  const dot = document.getElementById("statusDot");
  const txt = document.getElementById("statusText");
  try {
    const r = await fetch(`${API_BASE}/`, { method: "GET", signal: AbortSignal.timeout(4000) });
    if (r.ok) { dot.classList.add("online"); txt.textContent = "API Connected"; }
    else throw new Error();
  } catch {
    dot.classList.remove("online");
    txt.textContent = "Disconnected";
  }
}

// ─── Drag & Drop Setup ───────────────────────────────
function initDragDrop() {
  setupDrop("pdfDropZone", "pdfInput", handlePdfFiles);
  setupDrop("imgDropZone", "imgInput", handleImgFiles);

  document.getElementById("pdfDropZone").addEventListener("click", () => document.getElementById("pdfInput").click());
  document.getElementById("imgDropZone").addEventListener("click", () => document.getElementById("imgInput").click());

  document.getElementById("pdfInput").addEventListener("change", (e) => {
    if (e.target.files.length > 0) handlePdfFiles(Array.from(e.target.files));
  });
  document.getElementById("imgInput").addEventListener("change", (e) => {
    if (e.target.files.length > 0) handleImgFiles(Array.from(e.target.files));
  });
}

function setupDrop(zoneId, inputId, handler) {
  const zone = document.getElementById(zoneId);
  zone.addEventListener("dragenter", (e) => { e.preventDefault(); zone.classList.add("drag-over"); });
  zone.addEventListener("dragover",  (e) => { e.preventDefault(); zone.classList.add("drag-over"); });
  zone.addEventListener("dragleave", ()  => zone.classList.remove("drag-over"));
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("drag-over");
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) handler(files);
  });
}

// ─── PDF File Handler (Multiple) ─────────────────────
function handlePdfFiles(files) {
  const valid   = files.filter(f => f.name.toLowerCase().endsWith(".pdf"));
  const invalid = files.length - valid.length;
  if (invalid > 0) showToast(`⚠️ ${invalid} file(s) skip — sirf .pdf allowed`, "error");
  if (valid.length === 0) return;
  valid.forEach(f => { if (!pdfFiles.find(e => e.name === f.name)) pdfFiles.push(f); });
  renderPdfList();
}

function renderPdfList() {
  const listDiv  = document.getElementById("pdfFileList");
  const itemsUl  = document.getElementById("pdfItems");
  const badge    = document.getElementById("pdfCountBadge");
  const dropZone = document.getElementById("pdfDropZone");

  if (pdfFiles.length === 0) {
    listDiv.style.display  = "none";
    dropZone.style.display = "flex";
    return;
  }
  listDiv.style.display  = "block";
  dropZone.style.display = "none";
  badge.textContent = `${pdfFiles.length} file${pdfFiles.length > 1 ? "s" : ""}`;

  itemsUl.innerHTML = "";
  pdfFiles.forEach((file, idx) => {
    const li = document.createElement("li");
    li.className = "file-item";
    li.id = `pdf-item-${idx}`;
    li.innerHTML = `
      <span class="file-item-icon">📄</span>
      <span class="file-item-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
      <span class="file-item-size">${formatSize(file.size)}</span>
      <button class="file-item-remove" onclick="removePdfAt(${idx})" title="Remove">✕</button>
    `;
    itemsUl.appendChild(li);
  });
}

function removePdfAt(idx) {
  pdfFiles.splice(idx, 1);
  document.getElementById("pdfInput").value = "";
  renderPdfList();
}

function clearAllPdfs() {
  pdfFiles = [];
  document.getElementById("pdfInput").value = "";
  renderPdfList();
}

// ─── Image File Handler (Multiple) ───────────────────
function handleImgFiles(files) {
  const valid   = files.filter(f => f.type.startsWith("image/"));
  const invalid = files.length - valid.length;
  if (invalid > 0) showToast(`⚠️ ${invalid} file(s) skip — sirf images allowed`, "error");
  if (valid.length === 0) return;
  valid.forEach(f => { if (!imgFiles.find(e => e.name === f.name)) imgFiles.push(f); });
  renderImgList();
}

function renderImgList() {
  const listDiv  = document.getElementById("imgFileList");
  const itemsUl  = document.getElementById("imgItems");
  const badge    = document.getElementById("imgCountBadge");
  const dropZone = document.getElementById("imgDropZone");

  if (imgFiles.length === 0) {
    listDiv.style.display  = "none";
    dropZone.style.display = "flex";
    return;
  }
  listDiv.style.display  = "block";
  dropZone.style.display = "none";
  badge.textContent = `${imgFiles.length} file${imgFiles.length > 1 ? "s" : ""}`;

  itemsUl.innerHTML = "";
  imgFiles.forEach((file, idx) => {
    const li = document.createElement("li");
    li.className = "file-item";
    li.id = `img-item-${idx}`;
    li.innerHTML = `
      <span class="file-item-icon">🖼️</span>
      <span class="file-item-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
      <span class="file-item-size">${formatSize(file.size)}</span>
      <button class="file-item-remove" onclick="removeImgAt(${idx})" title="Remove">✕</button>
    `;
    itemsUl.appendChild(li);
  });
}

function removeImgAt(idx) {
  imgFiles.splice(idx, 1);
  document.getElementById("imgInput").value = "";
  renderImgList();
}

function clearAllImgs() {
  imgFiles = [];
  document.getElementById("imgInput").value = "";
  renderImgList();
}

// ─── Cancel Upload ─────────────────────────────────────
async function cancelUpload(type) {
  // 1. Local flag set — polling loop rokne ke liye
  if (type === "pdf") {
    pdfCancelled = true;
    if (pdfAbortController) pdfAbortController.abort();
  } else {
    imgCancelled = true;
    if (imgAbortController) imgAbortController.abort();
  }

  // 2. Backend ko TURANT signal bhejo — threading.Event set karega
  //    Ye vector_db = None bhi karta hai chahe thread finish ho ya na ho
  try {
    await fetch(`${API_BASE}/upload/cancel`, { method: "POST" });
  } catch { /* ignore network errors */ }

  // 3. Full UI reset — dono file lists clear
  pdfFiles = [];
  imgFiles = [];
  document.getElementById("pdfInput").value = "";
  document.getElementById("imgInput").value  = "";
  renderPdfList();
  renderImgList();

  // 4. Buttons hide
  setUploadLoading("pdf", false);
  setUploadLoading("img", false);
  setCancelVisible("pdf", false);
  setCancelVisible("img", false);

  // 5. Reset banner bhi chupa do
  hideResetBanner();
  
  // Reset chat history
  chatHistory = [];
  try {
    await fetch(`${API_BASE}/chat/clear`, { method: "POST" });
  } catch { /* ignore */ }
  clearChat();

  checkAPIStatus();
  showToast("🚫 Upload cancel — saara data clear ho gaya. Naya document select karo.", "error");
}

// ─── Reset All Data (upload ke BAAD bhi) ───────────────
async function resetAllData() {
  try {
    await fetch(`${API_BASE}/upload/cancel`, { method: "POST" });
  } catch { /* ignore */ }

  pdfFiles = [];
  imgFiles = [];
  document.getElementById("pdfInput").value = "";
  document.getElementById("imgInput").value  = "";
  renderPdfList();
  renderImgList();
  hideResetBanner();
  
  // Reset chat history frontend and backend
  chatHistory = [];
  try {
    await fetch(`${API_BASE}/chat/clear`, { method: "POST" });
  } catch { /* ignore */ }

  clearChat();
  checkAPIStatus();
  showToast("🗑️ Saara data reset ho gaya — naya document upload karo.", "error");
}

// ─── Reset Banner ─────────────────────────────────────
function showResetBanner(text) {
  const banner = document.getElementById("resetBanner");
  const label  = document.getElementById("resetBannerText");
  if (banner) { label.textContent = text; banner.style.display = "flex"; }
}
function hideResetBanner() {
  const banner = document.getElementById("resetBanner");
  if (banner) banner.style.display = "none";
}

// ─── Show/hide cancel button ──────────────────────────
function setCancelVisible(type, visible) {
  const btn = document.getElementById(type === "pdf" ? "cancelPdfBtn" : "cancelImgBtn");
  if (btn) btn.style.display = visible ? "inline-flex" : "none";
}

// ─── Mark file item as uploading / done / error ───────
function setFileItemStatus(type, idx, status) {
  const el = document.getElementById(`${type}-item-${idx}`);
  if (!el) return;
  el.classList.remove("item-uploading", "item-done", "item-error");
  if (status) el.classList.add(`item-${status}`);
}

// ─── Helper: format file size ─────────────────────────
function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

// ─── Poll upload status until done ────────────────────
function pollUploadStatus(type, onDone) {
  const interval = setInterval(async () => {
    // Stop polling if cancelled
    if (type === "pdf" && pdfCancelled) { clearInterval(interval); onDone(true); return; }
    if (type === "img" && imgCancelled) { clearInterval(interval); onDone(true); return; }

    try {
      const res  = await fetch(`${API_BASE}/upload/status`);
      const data = await res.json();

      if (data.status === "processing") {
        showToast("⏳ " + (data.message || "Processing..."), "success");
      } else if (data.status === "done") {
        clearInterval(interval); onDone(false);
      } else if (data.status === "error") {
        clearInterval(interval); onDone(true);
        showToast("❌ " + data.message, "error");
      }
    } catch { /* keep polling */ }
  }, 2000);

  setTimeout(() => { clearInterval(interval); onDone(true); }, 300000);
}

// ─── Upload PDFs (sequential, cancellable) ────────────
async function uploadPdf() {
  if (pdfFiles.length === 0) { showToast("⚠️ Pehle PDF file(s) select karo", "error"); return; }

  pdfCancelled = false;
  setUploadLoading("pdf", true);
  setCancelVisible("pdf", true);

  let successCount = 0;
  let failCount    = 0;

  for (let i = 0; i < pdfFiles.length; i++) {
    if (pdfCancelled) break;

    const file = pdfFiles[i];
    setFileItemStatus("pdf", i, "uploading");
    showToast(`📄 Upload ho raha hai (${i + 1}/${pdfFiles.length}): ${file.name}`, "success");

    try {
      pdfAbortController = new AbortController();
      const form = new FormData();
      form.append("pdf", file);

      const res  = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: form,
        signal: pdfAbortController.signal
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Upload failed");

      // Wait for backend to finish processing this file
      const isError = await new Promise((resolve) => {
        pollUploadStatus("pdf", (err) => resolve(err));
      });

      if (isError || pdfCancelled) {
        setFileItemStatus("pdf", i, "error");
        if (!pdfCancelled) failCount++;
        break;
      }

      setFileItemStatus("pdf", i, "done");
      successCount++;

    } catch (err) {
      if (err.name === "AbortError" || pdfCancelled) { break; }
      failCount++;
      setFileItemStatus("pdf", i, "error");
      showToast(`❌ ${file.name}: ${err.message}`, "error");
    }
  }

  setUploadLoading("pdf", false);
  setCancelVisible("pdf", false);
  checkAPIStatus();

  if (pdfCancelled) {
    showToast(`🚫 Upload cancel hua — ${successCount} file(s) uploaded`, "error");
  } else if (failCount === 0 && successCount > 0) {
    showResetBanner(`✅ ${successCount} PDF(s) uploaded — ab chat kar sakte ho`);
    showToast(`✅ Saare ${successCount} PDF(s) successfully uploaded! Ab chat karo.`, "success");
  } else if (successCount > 0) {
    showResetBanner(`⚠️ ${successCount} PDF(s) uploaded`);
    showToast(`⚠️ ${successCount} success, ${failCount} failed`, "error");
  }
}

// ─── Upload Images (sequential, cancellable) ──────────
async function uploadImg() {
  if (imgFiles.length === 0) { showToast("⚠️ Pehle image file(s) select karo", "error"); return; }

  imgCancelled = false;
  setUploadLoading("img", true);
  setCancelVisible("img", true);

  let successCount = 0;
  let failCount    = 0;

  for (let i = 0; i < imgFiles.length; i++) {
    if (imgCancelled) break;

    const file = imgFiles[i];
    setFileItemStatus("img", i, "uploading");
    showToast(`🖼️ Upload ho raha hai (${i + 1}/${imgFiles.length}): ${file.name}`, "success");

    try {
      imgAbortController = new AbortController();
      const form = new FormData();
      form.append("image", file);

      const res  = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: form,
        signal: imgAbortController.signal
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Upload failed");

      showToast(`⏳ AI image analyze kar raha hai: ${file.name}`, "success");

      const isError = await new Promise((resolve) => {
        pollUploadStatus("img", (err) => resolve(err));
      });

      if (isError || imgCancelled) {
        setFileItemStatus("img", i, "error");
        if (!imgCancelled) failCount++;
        break;
      }

      setFileItemStatus("img", i, "done");
      successCount++;

    } catch (err) {
      if (err.name === "AbortError" || imgCancelled) { break; }
      failCount++;
      setFileItemStatus("img", i, "error");
      showToast(`❌ ${file.name}: ${err.message}`, "error");
    }
  }

  setUploadLoading("img", false);
  setCancelVisible("img", false);
  checkAPIStatus();

  if (imgCancelled) {
    showToast(`🚫 Upload cancel hua — ${successCount} image(s) uploaded`, "error");
  } else if (failCount === 0 && successCount > 0) {
    showResetBanner(`✅ ${successCount} image(s) uploaded — ab chat kar sakte ho`);
    showToast(`✅ Saari ${successCount} image(s) successfully uploaded! Ab chat karo.`, "success");
  } else if (successCount > 0) {
    showResetBanner(`⚠️ ${successCount} image(s) uploaded`);
    showToast(`⚠️ ${successCount} success, ${failCount} failed`, "error");
  }
}

function setUploadLoading(type, loading) {
  const btn = document.getElementById(type === "pdf" ? "uploadPdfBtn" : "uploadImgBtn");
  btn.querySelector(".btn-text").style.display   = loading ? "none"        : "inline";
  btn.querySelector(".btn-loader").style.display = loading ? "inline-flex" : "none";
  btn.disabled = loading;
}

// ─── Chat: Send Query ─────────────────────────────────
async function sendQuery() {
  if (isQuerying) return;
  const input    = document.getElementById("queryInput");
  const question = input.value.trim();
  if (!question) return;

  clearWelcome();
  appendMessage("user", question);
  input.value = "";
  input.style.height = "auto";

  const typingId = showTyping();
  isQuerying = true;
  document.getElementById("sendBtn").disabled = true;

  try {
    const reqBody = JSON.stringify({ q: question, history: chatHistory });
    const res  = await fetch(`${API_BASE}/query`, { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: reqBody
    });
    const data = await res.json();
    removeTyping(typingId);

    if (data.error) {
      appendMessage("ai", "⚠️ " + data.error);
    } else {
      appendMessage("ai", data.answer);
      // Update frontend chat history
      chatHistory.push({ role: "user", content: question });
      chatHistory.push({ role: "assistant", content: data.answer });
    }
  } catch (err) {
    removeTyping(typingId);
    appendMessage("ai", "❌ Could not connect to the API. Make sure the FastAPI server is running on port 8000.");
  } finally {
    isQuerying = false;
    document.getElementById("sendBtn").disabled = false;
  }
}

function handleKey(e) {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendQuery(); }
}

function autoResize(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 140) + "px";
}

function useChip(el) {
  document.getElementById("queryInput").value = el.textContent;
  sendQuery();
}

// ─── Chat Helpers ─────────────────────────────────────
function clearWelcome() {
  const w = document.querySelector(".chat-welcome");
  if (w) w.remove();
}

function appendMessage(role, text) {
  const messages = document.getElementById("chatMessages");
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const msg = document.createElement("div");
  msg.className = `msg ${role}`;
  msg.innerHTML = `
    <div class="msg-content">${escapeHtml(text).replace(/\n/g, "<br>")}</div>
    <div class="msg-meta">${role === "user" ? "You" : "RAG Assistant"} · ${time}</div>
  `;
  messages.appendChild(msg);
  messages.scrollTop = messages.scrollHeight;
}

function showTyping() {
  const messages = document.getElementById("chatMessages");
  const id = "typing-" + Date.now();
  const el = document.createElement("div");
  el.id = id; el.className = "msg ai";
  el.innerHTML = `<div class="typing-indicator">
    <div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>
  </div>`;
  messages.appendChild(el);
  messages.scrollTop = messages.scrollHeight;
  return id;
}

function removeTyping(id) { document.getElementById(id)?.remove(); }

function clearChat() {
  document.getElementById("chatMessages").innerHTML = `
    <div class="chat-welcome">
      <div class="welcome-icon">👋</div>
      <h3>Hello! I'm your RAG Assistant</h3>
      <p>Upload documents first, then ask me anything. I'll search across ALL uploaded files.</p>
      <div class="suggestion-chips">
        <button class="chip" onclick="useChip(this)">Summarize the document</button>
        <button class="chip" onclick="useChip(this)">What are the key points?</button>
        <button class="chip" onclick="useChip(this)">What is the main topic?</button>
      </div>
    </div>`;
}

// ─── Toast ────────────────────────────────────────────
let toastTimer = null;
function showToast(msg, type = "success") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 4000);
}

// ─── Escape HTML ──────────────────────────────────────
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
