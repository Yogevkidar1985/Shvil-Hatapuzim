/* ============================================================
   בקרת תצוגה לטבלת ההקצאה והאיזון — גוש 6446 · הוד השרון
   תוסף עצמאי: זום (+/-) ורווח בין עמודות (+/-).
   לא נוגע בקוד האפליקציה ולא בנתונים; ההעדפות נשמרות בדפדפן.
   ============================================================ */
(function () {
  "use strict";

  var LS_ZOOM = "alloc_view_zoom";
  var LS_PAD = "alloc_view_pad";

  var ZOOM_MIN = 0.6, ZOOM_MAX = 1.6, ZOOM_STEP = 0.1, ZOOM_DEF = 1;
  var PAD_MIN = 2, PAD_MAX = 24, PAD_STEP = 2, PAD_DEF = 10;

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  var zoom = clamp(parseFloat(localStorage.getItem(LS_ZOOM)) || ZOOM_DEF, ZOOM_MIN, ZOOM_MAX);
  var pad = clamp(parseInt(localStorage.getItem(LS_PAD), 10) || PAD_DEF, PAD_MIN, PAD_MAX);

  /* גיליון סגנון דינמי — חסין לרינדורים מחדש של React */
  var styleEl = document.createElement("style");
  styleEl.id = "view-enhance-style";
  document.head.appendChild(styleEl);

  /* עיצוב הבקרה — תואם לשפת העיצוב של האתר (משתני ה-CSS הקיימים) */
  var uiCss = document.createElement("style");
  uiCss.id = "view-enhance-ui-css";
  uiCss.textContent =
    "#viewCtrls{display:flex;align-items:center;gap:8px;flex-wrap:wrap}" +
    "#viewCtrls .vc-group{display:flex;align-items:center;gap:4px;background:var(--surface-2,#faf8f3);" +
    "border:1px solid var(--line-strong,#d6d0c4);border-radius:9px;padding:3px 6px}" +
    "#viewCtrls .vc-label{font-size:.72rem;color:var(--muted,#6b7f88);font-weight:600;padding-inline-end:2px;white-space:nowrap}" +
    "#viewCtrls button.vc-btn{font-family:inherit;width:26px;height:26px;border-radius:7px;border:1px solid var(--line-strong,#d6d0c4);" +
    "background:#fff;color:var(--ink,#14232b);font-size:15px;font-weight:700;line-height:1;cursor:pointer;" +
    "display:inline-flex;align-items:center;justify-content:center;transition:all .12s;padding:0}" +
    "#viewCtrls button.vc-btn:hover{background:var(--accent-soft,#e6f1ee);border-color:var(--accent,#0f6e63);color:var(--accent,#0f6e63)}" +
    "#viewCtrls button.vc-btn:disabled{opacity:.3;cursor:default}" +
    "#viewCtrls .vc-val{min-width:42px;text-align:center;font-size:.78rem;font-weight:700;color:var(--ink,#14232b);font-variant-numeric:tabular-nums}" +
    "#viewCtrls .vc-reset{font-family:inherit;font-size:.72rem;color:var(--muted,#6b7f88);background:none;border:none;cursor:pointer;padding:4px 6px;border-radius:7px}" +
    "#viewCtrls .vc-reset:hover{background:var(--gold-soft,#f3ebdb);color:var(--ink,#14232b)}" +
    "@media (max-width:760px){#viewCtrls{display:none}}"; /* בקרה למסך מלא בלבד */
  document.head.appendChild(uiCss);

  function apply() {
    /* הזום מוחל על הטבלאות; הריווח על תאי הגוף והכותרות (דסקטופ בלבד,
       כדי לא לשבש את חוקי ה-responsive של מסכים צרים) */
    styleEl.textContent =
      "@media (min-width:761px){" +
      ".table-wrap table.alloc{zoom:" + zoom + ";}" +
      "table.alloc tbody td{padding-inline:" + pad + "px !important;}" +
      "table.alloc thead th{padding-inline:" + Math.max(3, pad - 2) + "px !important;}" +
      "}";
    var z = document.getElementById("vcZoomVal");
    if (z) z.textContent = Math.round(zoom * 100) + "%";
    var p = document.getElementById("vcPadVal");
    if (p) p.textContent = pad + "px";
    var r = document.getElementById("vcReset");
    if (r) r.style.visibility = (zoom !== ZOOM_DEF || pad !== PAD_DEF) ? "visible" : "hidden";
    syncDisabled();
    try {
      localStorage.setItem(LS_ZOOM, String(zoom));
      localStorage.setItem(LS_PAD, String(pad));
    } catch (e) { /* דפדפן ללא localStorage */ }
  }

  function syncDisabled() {
    var map = {
      vcZoomMinus: zoom <= ZOOM_MIN + 0.001,
      vcZoomPlus: zoom >= ZOOM_MAX - 0.001,
      vcPadMinus: pad <= PAD_MIN,
      vcPadPlus: pad >= PAD_MAX
    };
    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.disabled = map[id];
    });
  }

  function buildUI(controls) {
    if (document.getElementById("viewCtrls")) return;

    var wrap = document.createElement("div");
    wrap.id = "viewCtrls";
    wrap.innerHTML =
      '<div class="vc-group" title="הגדלה/הקטנה של כל הטבלה">' +
      '<span class="vc-label">גודל טבלה</span>' +
      '<button type="button" class="vc-btn" id="vcZoomMinus" aria-label="הקטן טבלה">−</button>' +
      '<span class="vc-val" id="vcZoomVal">100%</span>' +
      '<button type="button" class="vc-btn" id="vcZoomPlus" aria-label="הגדל טבלה">+</button>' +
      "</div>" +
      '<div class="vc-group" title="צמצום/הרחבה של הרווח בין העמודות">' +
      '<span class="vc-label">רווח עמודות</span>' +
      '<button type="button" class="vc-btn" id="vcPadMinus" aria-label="צמצם רווח בין עמודות">−</button>' +
      '<span class="vc-val" id="vcPadVal">10px</span>' +
      '<button type="button" class="vc-btn" id="vcPadPlus" aria-label="הרחב רווח בין עמודות">+</button>' +
      "</div>" +
      '<button type="button" class="vc-reset" id="vcReset" title="חזרה לתצוגת ברירת המחדל">↺ איפוס תצוגה</button>';

    /* הבקרה נכנסת לפני מונה "מציג X מתוך Y" כדי שהמונה יישאר בקצה */
    var chip = controls.querySelector(".count-chip");
    controls.insertBefore(wrap, chip || null);

    document.getElementById("vcZoomMinus").addEventListener("click", function () {
      zoom = clamp(Math.round((zoom - ZOOM_STEP) * 10) / 10, ZOOM_MIN, ZOOM_MAX); apply();
    });
    document.getElementById("vcZoomPlus").addEventListener("click", function () {
      zoom = clamp(Math.round((zoom + ZOOM_STEP) * 10) / 10, ZOOM_MIN, ZOOM_MAX); apply();
    });
    document.getElementById("vcPadMinus").addEventListener("click", function () {
      pad = clamp(pad - PAD_STEP, PAD_MIN, PAD_MAX); apply();
    });
    document.getElementById("vcPadPlus").addEventListener("click", function () {
      pad = clamp(pad + PAD_STEP, PAD_MIN, PAD_MAX); apply();
    });
    document.getElementById("vcReset").addEventListener("click", function () {
      zoom = ZOOM_DEF; pad = PAD_DEF; apply();
    });

    apply();
  }

  function tryAttach() {
    var controls = document.querySelector(".controls");
    if (controls) buildUI(controls);
  }

  /* React מרנדר אחרי טעינה, והטאבים מתחלפים — לכן מאזינים לשינויי DOM */
  var root = document.getElementById("root") || document.body;
  new MutationObserver(tryAttach).observe(root, { childList: true, subtree: true });

  apply();
  tryAttach();
})();
