// widget.js — Centro Virtual FamilySearch
// PERSISTENTE: guarda sesión en chrome.storage.local → sobrevive a cambios de página

const SUPABASE_URL = 'https://nbtfxxzkpgiddwimrwjx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_kE9VBRPXLtK9hSYXrwKwWA_y5oRFj7e';

// ── Helpers Supabase ─────────────────────────────────────────────────
const H = { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` };
const sbInsert = async (t, b) => { const r = await fetch(`${SUPABASE_URL}/rest/v1/${t}?select=*`, { method: 'POST', headers: { ...H, 'Prefer': 'return=representation' }, body: JSON.stringify(b) }); const d = await r.json(); return Array.isArray(d) ? d[0] : d; };
const sbSelect = async (t, q = '') => (await fetch(`${SUPABASE_URL}/rest/v1/${t}?${q}`, { headers: H })).json();
const sbPatch = async (t, id, b) => { const r = await fetch(`${SUPABASE_URL}/rest/v1/${t}?id=eq.${id}&select=*`, { method: 'PATCH', headers: { ...H, 'Prefer': 'return=representation' }, body: JSON.stringify(b) }); const d = await r.json(); return Array.isArray(d) ? d[0] : d; };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ── Persistencia ─────────────────────────────────────────────────────
const storageKey = 'fsChatSession';

// Comprueba si el contexto de la extensión sigue válido
const isValid = () => { try { return !!chrome.runtime?.id; } catch (e) { return false; } };

const saveState = (data) => { if (!isValid()) return; try { chrome.storage.local.set({ [storageKey]: data }); } catch (e) { } };
const clearState = () => { if (!isValid()) return; try { chrome.storage.local.remove(storageKey); } catch (e) { } };
const loadState = () => new Promise(res => {
  if (!isValid()) { res(null); return; }
  try { chrome.storage.local.get([storageKey], r => res((r && r[storageKey]) || null)); }
  catch (e) { res(null); }
});

// ── Estado reactivo ──────────────────────────────────────────────────
let S = {
  session: null,
  userData: null,
  pollTimer: null,
  msgTimer: null,
  view: 'form',
  rating: 0,
  lastMsgTimestamp: null,  // cursor: only fetch msgs NEWER than this
  topicsCache: null        // cache topics so we don't refetch them
};
let shadowRoot = null;

const $ = (id) => shadowRoot ? shadowRoot.getElementById(id) : null;
const $$ = (sel) => shadowRoot ? shadowRoot.querySelectorAll(sel) : [];

// ── Construir widget ─────────────────────────────────────────────────
function buildWidget() {
  const existingHost = document.getElementById('fs-chat-container');
  if (existingHost) {
    const el = existingHost.shadowRoot.getElementById('fs-chat-widget');
    if (el) el.style.display = 'flex';
    return;
  }

  // Crear host para Shadow DOM
  const host = document.createElement('div');
  host.id = 'fs-chat-container';
  // Bloquear interferencia con la página
  Object.assign(host.style, {
    position: 'fixed',
    bottom: '0',
    right: '0',
    width: '0',
    height: '0',
    zIndex: '2147483647',
    pointerEvents: 'none',
    display: 'block'
  });
  document.body.appendChild(host);

  shadowRoot = host.attachShadow({ mode: 'open' });

  // Inyectar Roboto desde Google Fonts directo en el Shadow DOM (garantizado)
  const fontLink = document.createElement('link');
  fontLink.rel = 'stylesheet';
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap';
  shadowRoot.appendChild(fontLink);

  // Inyectar CSS del widget dentro del Shadow DOM
  const styleLink = document.createElement('link');
  styleLink.rel = 'stylesheet';
  styleLink.href = chrome.runtime.getURL('widget.css');
  shadowRoot.appendChild(styleLink);

  // Inyectar variables y fuente oficial de FamilySearch en el Shadow DOM
  const vars = document.createElement('style');
  vars.textContent = `
    :host {
      font-family: 'HeritageBody:Sans', 'Roboto', system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif;
      --color-primary: #8CB83E;
      --color-primary-hover: #739634;
      --color-secondary: #005994;
      --color-fs-tree: #8CB83E;
      --color-fs-blue: #005994;
      --color-fs-text: #213547;
      --color-fs-border: #757575;
      --color-fs-bg-alt: #f8fafc;
      --radius-fs: 6px;
    }
  `;
  shadowRoot.appendChild(vars);

  const w = document.createElement('div');
  w.id = 'fs-chat-widget';
  w.style.pointerEvents = 'auto'; // Habilitar clics solo dentro del widget
  w.innerHTML = `
    <div id="fs-wh">
      <div class="fs-hl">
        <div class="fs-av-wrap">
          <svg class="fs-logo-svg" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="20" fill="rgba(255,255,255,0.2)"/>
            <!-- Silueta de personas / familia -->
            <circle cx="20" cy="13" r="5" fill="white"/>
            <path d="M10 30 Q10 22 20 22 Q30 22 30 30" fill="white"/>
          </svg>
        </div>
        <div>
          <b class="fs-hn">Centro Virtual · FamilySearch</b>
          <span class="fs-hs" id="fs-header-sub">
            <span class="fs-vol-dot" id="fs-vol-status-dot"></span>
            <span id="fs-vol-count-text">Verificando disponibilidad…</span>
          </span>
        </div>
      </div>
      <div class="fs-hbtns">
        <button id="fs-minimize" title="Minimizar">–</button>
        <button id="fs-widget-close" title="Cerrar">×</button>
      </div>
    </div>

    <!-- FORMULARIO -->
    <div id="fs-view-form" class="fs-view">
      <form id="fs-form">
        <div class="fs-row">
          <div class="fs-g"><label>Nombre *</label><input id="fs-nombre" placeholder="Juan" required /></div>
          <div class="fs-g"><label>Apellido *</label><input id="fs-apellido" placeholder="Pérez" required /></div>
        </div>
        <div class="fs-g"><label>Email</label><input id="fs-email" type="email" placeholder="ejemplo@correo.com" /></div>
        <div class="fs-row">
          <div class="fs-g"><label>País *</label>
            <select id="fs-pais" required>
              <option value="">— Selecciona —</option>
              <option value="Argentina">Argentina</option>
              <option value="Bolivia">Bolivia</option>
              <option value="Chile">Chile</option>
              <option value="Colombia">Colombia</option>
              <option value="Costa Rica">Costa Rica</option>
              <option value="Cuba">Cuba</option>
              <option value="Ecuador">Ecuador</option>
              <option value="El Salvador">El Salvador</option>
              <option value="España">España</option>
              <option value="Guatemala">Guatemala</option>
              <option value="Honduras">Honduras</option>
              <option value="México">México</option>
              <option value="Nicaragua">Nicaragua</option>
              <option value="Panamá">Panamá</option>
              <option value="Paraguay">Paraguay</option>
              <option value="Perú">Perú</option>
              <option value="Puerto Rico">Puerto Rico</option>
              <option value="República Dominicana">República Dominicana</option>
              <option value="Uruguay">Uruguay</option>
              <option value="Venezuela">Venezuela</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
          <div class="fs-g"><label>Idioma</label>
            <select id="fs-idioma">
              <option value="es">Español</option><option value="pt">Português</option>
              <option value="en">English</option><option value="fr">Français</option>
              <option value="qu">Quechua</option><option value="gn">Guaraní</option>
            </select>
          </div>
        </div>
        <div class="fs-g">
          <label>Tema *</label>
          <select id="fs-tema" required><option value="">Cargando temas…</option></select>
        </div>
        <div id="fs-form-err" class="fs-err" style="display:none"></div>
        <button type="submit" class="fs-btn-primary" id="fs-btn-submit">Entrar a la Sala de Espera</button>
      </form>
    </div>

    <!-- SALA DE ESPERA -->
    <div id="fs-view-waiting" class="fs-view" style="display:none">
      <div class="fs-wait-card">
        <div class="fs-spinner"></div>
        <h2 class="fs-wh2">Buscando un voluntario para ti…</h2>
        <p class="fs-wp">Hola <strong id="fs-w-nombre"></strong>, estamos conectando tu solicitud con un voluntario disponible. Esto puede tomar unos segundos.</p>
        <div class="fs-info-box">
          <div class="fs-info-row"><span class="fs-info-label">📋 Tema</span><span class="fs-info-value" id="fs-w-tema"></span></div>
        </div>
      </div>
      <div class="fs-support-panel">
        <div class="fs-sp-head"><p>¿Nadie responde? Contacta por otro canal:</p></div>
        <a href="https://chat.whatsapp.com/DGAXFWucF8w5NmQc21UGrl" target="_blank" class="fs-cr">
          <div class="fs-ci">📞</div>
          <div class="fs-ct"><b>Grupo de WhatsApp</b><span>Conectar con equipo de voluntarios</span></div>
        </a>
        <a href="https://wa.me/5219541409079" target="_blank" class="fs-cr">
          <div class="fs-ci">📱</div>
          <div class="fs-ct"><b>Soporte FamilySearch</b><span>+52 1 954 140 9079</span></div>
        </a>
        <a href="mailto:support@familysearch.org" class="fs-cr">
          <div class="fs-ci">✉️</div>
          <div class="fs-ct"><b>Correo electrónico</b><span>support@familysearch.org</span></div>
        </a>
      </div>
      <button id="fs-btn-cancel" class="fs-cancel-btn">Cancelar solicitud</button>
    </div>

    <!-- CHAT ACTIVO -->
    <div id="fs-view-chat" class="fs-view" style="display:none">
      <div id="fs-status-bar">
        <span class="fs-dot"></span>
        <span id="fs-vol-label">Voluntario conectado</span>
      </div>
      <div id="fs-messages"></div>
      <form id="fs-msg-form" class="fs-input-row">
        <input id="fs-msg-input" placeholder="Escribe un mensaje…" autocomplete="off" maxlength="500" />
        <button type="submit" class="fs-send-btn" title="Enviar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </form>
    </div>

    <!-- FEEDBACK -->
    <div id="fs-view-feedback" class="fs-view" style="display:none">
      <div class="fs-fb-ico">😊</div>
      <p class="fs-fb-title">¿Cómo estuvo la atención?</p>
      <p class="fs-fb-sub">Tu opinión nos ayuda a mejorar</p>
      <div class="fs-stars">
        <span class="fs-star" data-val="1">★</span><span class="fs-star" data-val="2">★</span>
        <span class="fs-star" data-val="3">★</span><span class="fs-star" data-val="4">★</span>
        <span class="fs-star" data-val="5">★</span>
      </div>
      <textarea id="fs-feedback-text" rows="3" placeholder="Comentario opcional…"></textarea>
      <button id="fs-btn-feedback" class="fs-btn-primary">Enviar Calificación</button>
      <button id="fs-skip-btn" class="fs-skip-btn">Cerrar sin calificar</button>
    </div>

    <!-- MINIMIZADO (burbuja flotante) -->
    <div id="fs-bubble" style="display:none">
      <span class="fs-bubble-icon">💬</span>
      <span id="fs-bubble-dot" class="fs-bubble-badge" style="display:none"></span>
    </div>
    `;

  shadowRoot.appendChild(w);

  // ── Chequear voluntarios en línea ───────────────────────────────
  async function checkOnlineVolunteers() {
    try {
      // select=count avoids transferring entire rows
      const volunteers = await sbSelect('volunteers', 'status=eq.online&select=id&limit=100');
      const count = Array.isArray(volunteers) ? volunteers.length : 0;
      const dot = $('fs-vol-status-dot');
      const txt = $('fs-vol-count-text');
      if (!dot || !txt) return;
      if (count > 0) {
        dot.className = 'fs-vol-dot fs-vol-dot-on';
        txt.textContent = count === 1 ? '1 voluntario disponible' : `${count} voluntarios disponibles`;
      } else {
        dot.className = 'fs-vol-dot fs-vol-dot-off';
        txt.textContent = 'Sin voluntarios en línea ahora';
      }
    } catch (e) {
      const txt = $('fs-vol-count-text');
      if (txt) txt.textContent = 'Servicio de atención';
    }
  }
  checkOnlineVolunteers();
  // Refresh every 2 minutes — volunteer status doesn't change every second
  setInterval(() => { if (isValid()) checkOnlineVolunteers(); }, 120000);

  // ── Vista ──────────────────────────────────────────────────────
  const views = ['form', 'waiting', 'chat', 'feedback'];
  const showView = (name) => {
    views.forEach(v => {
      const el = $(`fs-view-${v}`);
      if (el) el.style.display = v === name ? 'flex' : 'none';
    });
    // Vista de thanks es especial porque se inyecta dinámicamente
    const thView = $('fs-view-thanks');
    if (thView) thView.style.display = name === 'thanks' ? 'flex' : 'none';

    S.view = name;
    persistState();
  };

  // ── Minimizar / expandir ───────────────────────────────────────
  let minimized = false;
  const mainContent = () => [...views.map(v => $(`fs-view-${v}`)), $('fs-wh')];

  $('fs-minimize').onclick = () => {
    minimized = true;
    const widget = $('fs-chat-widget');
    widget.classList.add('fs-minimized');
    $('fs-bubble').style.display = 'flex';
    mainContent().forEach(el => { if (el) el.style.display = 'none'; });
  };

  $('fs-bubble').onclick = () => {
    minimized = false;
    const widget = $('fs-chat-widget');
    widget.classList.remove('fs-minimized');
    $('fs-bubble').style.display = 'none';
    $('fs-wh').style.display = 'flex';
    showView(S.view);
  };

  // ── Cerrar ─────────────────────────────────────────────────────
  $('fs-widget-close').onclick = () => {
    if (S.session && S.view === 'chat') {
      clearInterval(S.msgTimer);
      showView('feedback');
    } else if (!S.session) {
      host.remove();
      shadowRoot = null;
      clearState();
    } else {
      // En espera: solo minimizar para no perder sesión
      $('fs-minimize').click();
    }
  };

  // ── Cargar temas (con caché de sesión) ────────────────────────
  (async () => {
    try {
      // Use session-level cache: only query once per widget lifecycle
      if (!S.topicsCache) {
        S.topicsCache = await sbSelect('topics', 'active=eq.true&order=titulo.asc&select=titulo');
      }
      const sel = $('fs-tema');
      sel.innerHTML = '<option value="">— Selecciona —</option>';
      // Use DocumentFragment to batch DOM insertions
      const frag = document.createDocumentFragment();
      S.topicsCache.forEach(t => {
        const o = document.createElement('option');
        o.value = o.textContent = t.titulo;
        frag.appendChild(o);
      });
      sel.appendChild(frag);
    } catch (e) { }
  })();

  // ── Formulario ─────────────────────────────────────────────────
  $('fs-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = $('fs-btn-submit');
    btn.disabled = true; btn.textContent = 'Conectando…';

    const data = {
      nombre: $('fs-nombre').value.trim(),
      apellido: $('fs-apellido').value.trim(),
      email: $('fs-email').value.trim() || null,
      pais: $('fs-pais').value.trim(),
      idioma: $('fs-idioma').value,
      tema: $('fs-tema').value,
      type: 'chat', estado: 'esperando', fecha_ingreso: new Date().toISOString()
    };

    if (!data.nombre || !data.apellido || !data.pais || !data.tema) {
      const err = $('fs-form-err');
      err.textContent = 'Completa todos los campos obligatorios (*)'; err.style.display = 'block';
      setTimeout(() => { if ($('fs-form-err')) $('fs-form-err').style.display = 'none'; }, 3500);
      btn.disabled = false; btn.textContent = 'Entrar a la Sala de Espera';
      return;
    }

    S.userData = data;
    S.lastMsgTimestamp = null; // reset cursor for new session
    $('fs-w-nombre').textContent = data.nombre;
    $('fs-w-tema').textContent = data.tema;
    showView('waiting');

    try {
      S.session = await sbInsert('sessions', data);
      persistState();
      // Poll session status every 5s (was 3s) — 1 req per 5s per user = 240 req/min for 20 users
      S.pollTimer = setInterval(pollStatus, 5000);
    } catch (err) {
      showView('form');
      btn.disabled = false; btn.textContent = 'Entrar a la Sala de Espera';
    }
  };

  // ── Polling sala de espera ──────────────────────────────────────
  async function pollStatus() {
    if (!isValid()) { clearInterval(S.pollTimer); return; }
    if (!S.session) return;
    try {
      // Only select status fields — no need for full record while waiting
      const rows = await sbSelect('sessions', `id=eq.${S.session.id}&select=id,estado,voluntario_id`);
      if (!rows?.length) return;
      const s = rows[0];
      if (s.estado === 'en_atencion') {
        clearInterval(S.pollTimer);
        S.session = { ...S.session, ...s };
        persistState();
        showView('chat');
        await loadMsgs(); // Immediate first load
        // Poll messages every 4s (was 2.5s) — still feels real-time, cuts req by 37%
        S.msgTimer = setInterval(loadMsgs, 4000);
      } else if (['finalizado', 'abandonado'].includes(s.estado)) {
        clearInterval(S.pollTimer);
        S.session = null; clearState(); showView('form');
      }
    } catch (e) { }
  }

  $('fs-btn-cancel').onclick = async () => {
    clearInterval(S.pollTimer);
    if (S.session) {
      await sbPatch('sessions', S.session.id, { estado: 'abandonado', fecha_fin: new Date().toISOString() });
      S.session = null;
    }
    clearState(); showView('form');
  };

  // ── Mensajes: incremental (solo trae lo nuevo) ────────────────
  async function loadMsgs() {
    if (!isValid()) { clearInterval(S.msgTimer); return; }
    if (!S.session) return;
    try {
      // Use timestamp cursor to only fetch NEWER messages
      // This reduces payload from O(all messages) to O(new messages)
      const tsFilter = S.lastMsgTimestamp
        ? `&created_at=gt.${encodeURIComponent(S.lastMsgTimestamp)}`
        : '';

      const msgs = await sbSelect(
        'messages',
        `session_id=eq.${S.session.id}&order=created_at.asc&select=id,sender,text,created_at${tsFilter}`
      );

      if (!msgs || !msgs.length) return; // nothing new — zero DOM work

      const box = $('fs-messages');
      const atBottom = box.scrollHeight - box.scrollTop <= box.clientHeight + 80;

      // Incremental append: only add NEW messages, no full DOM rebuild
      const frag = document.createDocumentFragment();
      msgs.forEach(m => {
        const d = document.createElement('div');
        d.className = m.sender === 'user' ? 'fs-msg-user' : 'fs-msg-vol';
        d.innerHTML = `<span class="fs-bubble">${esc(m.text)}</span>`;
        frag.appendChild(d);
        // Advance cursor to the latest timestamp seen
        if (!S.lastMsgTimestamp || m.created_at > S.lastMsgTimestamp) {
          S.lastMsgTimestamp = m.created_at;
        }
      });
      box.appendChild(frag);

      if (atBottom) box.scrollTop = box.scrollHeight;
      if (minimized) $('fs-bubble-dot').style.display = 'block';
    } catch (e) { }
  }

  $('fs-msg-form').onsubmit = async (e) => {
    e.preventDefault();
    const inp = $('fs-msg-input');
    const text = inp.value.trim();
    if (!text || !S.session) return;
    inp.value = ''; inp.disabled = true;
    try {
      await sbInsert('messages', { session_id: S.session.id, sender: 'user', text });
      // After sending, immediately fetch new messages (cursor-based, lightweight)
      await loadMsgs();
    }
    finally { inp.disabled = false; inp.focus(); }
  };

  // ── Feedback ───────────────────────────────────────────────────
  $$('.fs-star').forEach(star => {
    star.onclick = () => {
      S.rating = parseInt(star.dataset.val);
      $$('.fs-star').forEach((s, i) => s.classList.toggle('fs-star-active', i < S.rating));
    };
  });

  const resetToForm = (showThanks = false) => {
    clearState();
    clearInterval(S.pollTimer);
    clearInterval(S.msgTimer);
    S.session = null; S.userData = null; S.rating = 0; S.view = 'form';
    // Limpiar estrellas y textarea
    $$('.fs-star').forEach(s => s.classList.remove('fs-star-active'));
    const ta = $('fs-feedback-text'); if (ta) ta.value = '';
    // Limpiar form
    ['fs-nombre', 'fs-apellido', 'fs-email', 'fs-pais'].forEach(id => { const el = $(id); if (el) el.value = ''; });
    const temaEl = $('fs-tema'); if (temaEl) temaEl.selectedIndex = 0;

    if (showThanks) {
      // Mostrar pantalla de agradecimiento breve
      showView('thanks');
      const tv = $('fs-view-thanks');
      if (!tv) {
        // Insertar vista de thanks si no existe
        const nt = document.createElement('div');
        nt.id = 'fs-view-thanks';
        nt.className = 'fs-view fs-thanks-view';
        nt.innerHTML = `
          <div class="fs-thanks-ico">✅</div>
          <p class="fs-fb-title">¡Gracias por tu calificación!</p>
          <p class="fs-fb-sub">Puedes iniciar una nueva consulta cuando quieras.</p>
          <button class="fs-btn-primary fs-new-chat-btn">Iniciar nueva charla</button>
        `;
        w.appendChild(nt);
        nt.querySelector('.fs-new-chat-btn').onclick = () => showView('form');
        nt.style.display = 'flex';
        // Ocultar otras vistas
        ['form', 'waiting', 'chat', 'feedback'].forEach(v => { const el = $(`fs-view-${v}`); if (el) el.style.display = 'none'; });
        S.view = 'thanks';
        // Auto-volver al form a los 4s
        setTimeout(() => { if (S.view === 'thanks') showView('form'); }, 4000);
      }
    } else {
      showView('form');
    }
  };

  $('fs-btn-feedback').onclick = async () => {
    if (S.session) {
      try {
        if (S.rating > 0) await sbInsert('surveys', { session_id: S.session.id, calificacion: S.rating, comentarios: $('fs-feedback-text').value.trim() || null });
        await sbPatch('sessions', S.session.id, { estado: 'finalizado', fecha_fin: new Date().toISOString() });
      } catch (e) { }
    }
    resetToForm(true);
  };

  $('fs-skip-btn').onclick = async () => {
    if (S.session) { try { await sbPatch('sessions', S.session.id, { estado: 'finalizado', fecha_fin: new Date().toISOString() }); } catch (e) { } }
    resetToForm(false);
  };

  // ── Persistir estado ───────────────────────────────────────────
  function persistState() {
    if (!S.session || !isValid()) return;
    saveState({ sessionId: S.session.id, session: S.session, userData: S.userData, view: S.view });
  }

  return { showView, loadMsgs, pollStatus };
}

// ── Restaurar sesión activa al cargar página ─────────────────────────
async function init() {
  const saved = await loadState();
  if (!saved) return; // Sin sesión activa — esperar mensaje OPEN_WIDGET

  // Hay sesión guardada → verificar que siga activa en Supabase
  try {
    const rows = await sbSelect('sessions', `id=eq.${saved.sessionId}&select=*`);
    if (!rows?.length) { clearState(); return; }
    const sess = rows[0];

    if (['finalizado', 'abandonado'].includes(sess.estado)) { clearState(); return; }

    // Sesión válida → restaurar widget
    S.session = sess;
    S.userData = saved.userData;
    S.view = saved.view;

    const ctrl = buildWidget();

    // Restaurar vista y datos
    if (S.userData) {
      const nEl = $('fs-w-nombre'); if (nEl) nEl.textContent = S.userData.nombre || '';
      const tEl = $('fs-w-tema'); if (tEl) tEl.textContent = S.userData.tema || '';
    }

    if (sess.estado === 'esperando') {
      ctrl.showView('waiting');
      S.pollTimer = setInterval(ctrl.pollStatus, 5000);
    } else if (sess.estado === 'en_atencion') {
      ctrl.showView('chat');
      ctrl.loadMsgs();
      S.msgTimer = setInterval(ctrl.loadMsgs, 4000);
    }

    const sub = $('fs-header-sub');
    if (sub) sub.textContent = '🔄 Sesión restaurada';
    setTimeout(() => {
      const sub2 = $('fs-header-sub');
      if (sub2) sub2.textContent = 'En línea · Voluntarios disponibles';
    }, 3000);

  } catch (e) { clearState(); }
}

// ── Listener desde popup.js ──────────────────────────────────────────
try {
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.action === 'OPEN_WIDGET') {
      const existingHost = document.getElementById('fs-chat-container');
      if (existingHost) {
        const el = existingHost.shadowRoot.getElementById('fs-chat-widget');
        if (el) el.style.display = 'flex';
        sendResponse({ ok: true }); return true;
      }
      buildWidget();
      sendResponse({ ok: true });
    }
    return true;
  });
} catch (e) {
  console.warn('[FS Widget] No se pudo registrar el listener — contexto inválido');
}

// ── Auto-restaurar al cargar ─────────────────────────────────────────
// Solo ejecutar si el contexto es válido
if (isValid()) init();
