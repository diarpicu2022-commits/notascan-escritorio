/* @ds-bundle: {"format":4,"namespace":"NotaScan","components":[{"name":"Logo"},{"name":"Icon"},{"name":"Button"},{"name":"Input"},{"name":"GradeInput"},{"name":"Badge"},{"name":"Avatar"},{"name":"Divider"},{"name":"Sticker"},{"name":"StatusDot"},{"name":"ConfidenceIndicator"},{"name":"NavigationItem"},{"name":"GradeInputGroup"},{"name":"ConfidenceBadge"},{"name":"UserProfile"},{"name":"SearchField"},{"name":"FilterGroup"},{"name":"ReviewStatus"},{"name":"UploadZone"},{"name":"Sidebar"},{"name":"Header"},{"name":"ReviewSummary"},{"name":"FiltersBar"},{"name":"StudentGradeCard"},{"name":"ReviewStepper"},{"name":"Marquee"},{"name":"ProcessingPanel"},{"name":"ConfirmDialog"},{"name":"Toast"},{"name":"EmptyState"},{"name":"DataTable"},{"name":"AppShell"},{"name":"GradeReviewDashboard"},{"name":"LoginPage"},{"name":"DashboardPage"},{"name":"UploadPage"},{"name":"StudentsPage"},{"name":"EvaluationsPage"},{"name":"ReportsPage"},{"name":"DesignSystemPage"},{"name":"NotaScanApp"}]} */
(function () {
  "use strict";
  var React = window.React;
  var h = React.createElement;
  var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef, useMemo = React.useMemo, Fragment = React.Fragment;

  function cx() {
    var out = [];
    for (var i = 0; i < arguments.length; i++) { if (arguments[i]) out.push(arguments[i]); }
    return out.join(" ");
  }
  function rest(props, omit) {
    var o = {};
    for (var k in props) { if (Object.prototype.hasOwnProperty.call(props, k) && omit.indexOf(k) < 0) o[k] = props[k]; }
    return o;
  }
  function prefersReducedMotion() {
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; }
  }
  var uid = 0;
  function useId(prefix) { var r = useRef(null); if (r.current === null) { uid += 1; r.current = (prefix || "ns") + "-" + uid; } return r.current; }

  /* ================= Domain helpers ================= */
  var GRADE_MIN = 1, GRADE_MAX = 5;
  function parseGrade(v) {
    if (typeof v === "number") return v;
    if (v === null || v === undefined) return NaN;
    var s = String(v).trim().replace(",", ".");
    if (!/^\d+(\.\d+)?$/.test(s)) return NaN;
    return parseFloat(s);
  }
  function validateGrade(v) {
    var n = parseGrade(v);
    if (String(v).trim() === "") return { valid: false, value: NaN, message: "Escribe una calificación." };
    if (isNaN(n) || n < GRADE_MIN || n > GRADE_MAX) return { valid: false, value: n, message: "La calificación debe estar entre 1.0 y 5.0." };
    return { valid: true, value: Math.round(n * 10) / 10, message: "" };
  }
  function formatGrade(n) { return isNaN(n) ? "—" : (Math.round(n * 10) / 10).toFixed(1); }
  function confidenceLevel(pct) { return pct >= 90 ? "high" : pct >= 75 ? "medium" : "low"; }
  var LEVEL_LABEL = { high: "Alta confianza", medium: "Confianza media", low: "Baja confianza" };
  var STATUS_LABEL = { pending: "Pendiente de revisión", verified: "Verificada", "needs-review": "Requiere revisión" };
  function initials(name) {
    var p = String(name || "").trim().split(/\s+/);
    return ((p[0] || "").charAt(0) + (p.length > 2 ? p[2] : p[1] || "").charAt(0)).toUpperCase();
  }
  function hashTone(s) { var n = 0; s = String(s || ""); for (var i = 0; i < s.length; i++) n = (n + s.charCodeAt(i)) % 4; return n; }

  /* ================= ATOMS ================= */
  var ICONS = {
    dashboard: ["R3,3,7,9,1", "R14,3,7,5,1", "R14,12,7,9,1", "R3,16,7,5,1"],
    grade: ["M3 7V5a2 2 0 0 1 2-2h2", "M17 3h2a2 2 0 0 1 2 2v2", "M21 17v2a2 2 0 0 1-2 2h-2", "M7 21H5a2 2 0 0 1-2-2v-2", "M7 12h10"],
    students: ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "C9,7,4", "M22 21v-2a4 4 0 0 0-3-3.87", "M16 3.13a4 4 0 0 1 0 7.75"],
    evaluations: ["R8,2,8,4,1", "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2", "M12 11h4", "M12 16h4", "M8 11h.01", "M8 16h.01"],
    reports: ["M3 3v18h18", "M18 17V9", "M13 17V5", "M8 17v-3"],
    system: ["M5.5 8.5 9 12l-3.5 3.5L2 12l3.5-3.5Z", "m12 2 3.5 3.5L12 9 8.5 5.5 12 2Z", "M18.5 8.5 22 12l-3.5 3.5L15 12l3.5-3.5Z", "m12 15 3.5 3.5L12 22l-3.5-3.5L12 15Z"],
    upload: ["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "M17 8l-5-5-5 5", "M12 3v12"],
    download: ["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "m7 10 5 5 5-5", "M12 15V3"],
    check: ["M20 6 9 17l-5-5"],
    warning: ["m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z", "M12 9v4", "M12 17h.01"],
    error: ["C12,12,10", "m15 9-6 6", "m9 9 6 6"],
    search: ["C11,11,8", "m21 21-4.3-4.3"],
    edit: ["M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z", "m15 5 4 4"],
    lock: ["R3,11,18,11,2", "M7 11V7a5 5 0 0 1 10 0v4"],
    ai: ["M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z", "M19 15v4", "M17 17h4"],
    arrow: ["M5 12h14", "m12 5 7 7-7 7"],
    settings: ["M21 4h-7", "M10 4H3", "M21 12h-9", "M8 12H3", "M21 20h-5", "M12 20H3", "M14 2v4", "M8 10v4", "M16 18v4"],
    close: ["M18 6 6 18", "m6 6 12 12"],
    menu: ["M4 6h16", "M4 12h16", "M4 18h16"],
    camera: ["M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z", "C12,13,3"],
    qr: ["R3,3,7,7,1", "R14,3,7,7,1", "R3,14,7,7,1", "M14 14h3v3h-3z", "M20 14v1", "M14 20h1", "M17 20h4v-3"],
    file: ["M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z", "M14 2v4a2 2 0 0 0 2 2h4", "M10 13H8", "M16 17H8", "M16 13h-2"],
    clock: ["C12,12,10", "M12 6v6l4 2"],
    user: ["C12,8,4", "M20 21a8 8 0 0 0-16 0"],
    chevron: ["m6 9 6 6 6-6"],
    filter: ["M22 3H2l8 9.46V19l4 2v-8.54L22 3z"],
    logout: ["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", "m16 17 5-5-5-5", "M21 12H9"],
    mail: ["R2,4,20,16,2", "m22 7-10 5L2 7"],
    plus: ["M5 12h14", "M12 5v14"],
    calendar: ["R3,4,18,18,2", "M16 2v4", "M8 2v4", "M3 10h18"],
    eye: ["M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z", "C12,12,3"],
    trash: ["M3 6h18", "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6", "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"],
    archive: ["R2,3,20,5,1", "M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8", "M10 12h4"],
    userx: ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "C9,7,4", "m17 8 5 5", "m22 8-5 5"],
    key: ["C7.5,15.5,5.5", "m21 2-9.6 9.6", "m15.5 7.5 3 3L22 7l-3-3"],
    trophy: ["M6 9H4.5a2.5 2.5 0 0 1 0-5H6", "M18 9h1.5a2.5 2.5 0 0 0 0-5H18", "M4 22h16", "M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22", "M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22", "M18 2H6v7a6 6 0 0 0 12 0V2Z"],
    book: ["M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"],
    bell: ["M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9", "M10.3 21a1.94 1.94 0 0 0 3.4 0"],
    wifi: ["M5 13a10 10 0 0 1 14 0", "M8.5 16.5a5 5 0 0 1 7 0", "M2 8.82a15 15 0 0 1 20 0", "M12 20h.01"],
    wifioff: ["M12 20h.01", "M8.5 16.5a5 5 0 0 1 7 0", "M2 8.82a15 15 0 0 1 4.17-2.65", "M10.66 5c4.01-.36 8.14.9 11.34 3.76", "M16.85 11.25a10 10 0 0 1 2.22 1.68", "M5 13a10 10 0 0 1 5.24-2.76", "m2 2 20 20"],
    refresh: ["M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8", "M21 3v5h-5", "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16", "M8 16H3v5"],
    sort: ["m7 15 5 5 5-5", "m7 9 5-5 5 5"],
    sortup: ["m7 9 5-5 5 5", "M12 4v16"],
    sortdown: ["m7 15 5 5 5-5", "M12 20V4"],
    chevleft: ["m15 18-6-6 6-6"],
    chevright: ["m9 18 6-6-6-6"],
    building: ["R4,2,16,20,2", "M9 22v-4h6v4", "M8 6h.01", "M16 6h.01", "M12 6h.01", "M12 10h.01", "M12 14h.01", "M16 10h.01", "M16 14h.01", "M8 10h.01", "M8 14h.01"],
    layers: ["m12 2 10 5-10 5L2 7l10-5Z", "m2 17 10 5 10-5", "m2 12 10 5 10-5"],
    link: ["M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71", "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"],
    shield: ["M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"],
    inbox: ["M22 12h-6l-2 3h-4l-2-3H2", "M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"],
    star: ["M11.5 2.3a.53.53 0 0 1 .95 0l2.3 4.67a2.12 2.12 0 0 0 1.6 1.16l5.17.76a.53.53 0 0 1 .3.9l-3.74 3.64a2.12 2.12 0 0 0-.61 1.88l.88 5.14a.53.53 0 0 1-.77.56l-4.62-2.43a2.12 2.12 0 0 0-1.97 0L6.4 21.01a.53.53 0 0 1-.77-.56l.88-5.13a2.12 2.12 0 0 0-.61-1.88L2.16 9.8a.53.53 0 0 1 .3-.9l5.16-.76a2.12 2.12 0 0 0 1.6-1.16z"],
    flame: ["M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"],
    target: ["C12,12,10", "C12,12,6", "C12,12,2"],
    home: ["m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", "M9 22V12h6v10"],
    heart: ["M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"],
    more: ["C12,12,1", "C19,12,1", "C5,12,1"],
    phone: ["M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"],
    minus: ["M5 12h14"],
    command: ["M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"]
  };
  function Icon(props) {
    var name = props.name, size = props.size || 20, label = props.label;
    var parts = ICONS[name] || ICONS.ai;
    var kids = parts.map(function (d, i) {
      if (d.charAt(0) === "R") { var r = d.slice(1).split(","); return h("rect", { key: i, x: r[0], y: r[1], width: r[2], height: r[3], rx: r[4] }); }
      if (d.charAt(0) === "C") { var c = d.slice(1).split(","); return h("circle", { key: i, cx: c[0], cy: c[1], r: c[2] }); }
      return h("path", { key: i, d: d });
    });
    return h("svg", {
      className: cx("ns-icon", props.className), width: size, height: size, viewBox: "0 0 24 24",
      strokeWidth: props.strokeWidth || 2, role: label ? "img" : undefined, "aria-label": label || undefined, "aria-hidden": label ? undefined : true, focusable: "false"
    }, kids);
  }
  Icon.names = Object.keys(ICONS);

  function Logo(props) {
    var size = props.size || 28;
    return h("span", { className: cx("ns-logo", props.className), style: { fontSize: size }, "aria-label": "NotaScan" },
      props.mark || props.markOnly ? h("span", { className: "ns-logo-mark", "aria-hidden": true }, "N") : null,
      props.markOnly ? null : h("span", { "aria-hidden": true }, "NotaScan"),
      props.markOnly ? null : h("span", { className: "ns-logo-dot", "aria-hidden": true }));
  }

  /* Firma de marca: la portada del sistema en miniatura (bloques + nombre + lema). */
  function BrandTile(props) {
    return h("div", { className: cx("ns-brand", props.className) },
      h("div", { className: "ns-brand-blocks", "aria-hidden": true },
        h("span", { className: "ns-brand-b ns-brand-b--gold" }),
        h("span", { className: "ns-brand-b ns-brand-b--navy" }, h("span", null, "4.5")),
        h("span", { className: "ns-brand-b ns-brand-b--sage" }),
        h("span", { className: "ns-brand-b ns-brand-b--burgundy" })),
      h(Logo, { size: props.size || 34 }),
      h("span", { className: "ns-brand-tag" }, props.tagline || "La IA detecta. Tú verificas."));
  }

  function Dots() { return h("span", { className: "ns-dots", "aria-hidden": true }, h("i"), h("i"), h("i")); }

  function Button(props) {
    var variant = props.variant || "primary", size = props.size || "md";
    var busy = !!props.loading, ok = !!props.success;
    var icon = props.icon ? h(Icon, { name: props.icon, size: size === "sm" ? 16 : 18 }) : null;
    var content;
    if (busy) content = [h(Dots, { key: "d" }), h("span", { key: "t" }, props.loadingText || "Guardando…")];
    else if (ok) content = [h(Icon, { key: "i", name: "check", size: 18 }), h("span", { key: "t" }, props.successText || props.children)];
    else content = [icon ? h(Fragment, { key: "i" }, icon) : null, h(Fragment, { key: "c" }, props.children), props.iconRight ? h(Icon, { key: "r", name: props.iconRight, size: 18 }) : null];
    var other = rest(props, ["variant", "size", "loading", "success", "icon", "iconRight", "children", "className", "state", "block", "loadingText", "successText", "type"]);
    return h("button", Object.assign({
      type: props.type || "button",
      className: cx("ns-btn", "ns-btn--" + (variant === "icon" ? "secondary ns-btn--icon" : variant), size !== "md" && "ns-btn--" + size, ok && "ns-btn--success", props.block && "ns-btn--block", props.state && "is-" + props.state, props.className),
      "aria-busy": busy || undefined,
      disabled: props.disabled || busy || undefined
    }, other), content);
  }

  function Input(props) {
    var autoId = useId("in");
    var id = props.id || autoId;
    var hintId = id + "-hint", errId = id + "-err";
    var other = rest(props, ["label", "hint", "error", "success", "id", "className", "state", "hideLabel"]);
    var describedBy = [props.hint ? hintId : null, props.error ? errId : null].filter(Boolean).join(" ") || undefined;
    return h("div", { className: cx("ns-field", props.className) },
      props.label ? h("label", { htmlFor: id, className: cx("ns-field-label", props.hideLabel && "ns-sr") }, props.label, props.required ? h("span", { className: "ns-req", "aria-hidden": true }, " *") : null) : null,
      h("input", Object.assign({ id: id, className: cx("ns-input", props.state && "is-" + props.state, props.success && "is-success"), "aria-invalid": props.error ? true : undefined, "aria-describedby": describedBy }, other)),
      props.error ? h("span", { id: errId, className: "ns-field-error", role: "alert" }, h(Icon, { name: "error", size: 16 }), props.error)
        : props.success ? h("span", { id: hintId, className: "ns-field-success" }, h(Icon, { name: "check", size: 16 }), props.success)
        : props.hint ? h("span", { id: hintId, className: "ns-field-hint" }, props.hint) : null);
  }

  function GradeInput(props) {
    var autoId = useId("grade");
    var id = props.id || autoId;
    var controlled = props.value !== undefined;
    var st = useState(props.defaultValue !== undefined ? String(props.defaultValue) : "");
    var raw = controlled ? String(props.value) : st[0];
    var check = validateGrade(raw);
    var showError = props.showError !== false && raw !== "" && !check.valid;
    function onChange(e) {
      var v = e.target.value.replace(/[^0-9.,]/g, "").slice(0, 4);
      if (!controlled) st[1](v);
      if (props.onChange) props.onChange(v, validateGrade(v));
    }
    return h("div", { className: cx("ns-field", props.className) },
      h("label", { htmlFor: id, className: cx("ns-field-label", props.hideLabel && "ns-sr") }, props.label || "Calificación"),
      h("div", { className: cx("ns-grade-input", showError && "is-invalid", props.disabled && "is-disabled") },
        h("input", {
          id: id, type: "text", inputMode: "decimal", autoComplete: "off", value: raw, onChange: onChange,
          onKeyDown: props.onKeyDown, disabled: props.disabled, readOnly: props.readOnly, autoFocus: props.autoFocus,
          placeholder: "0.0", "aria-invalid": showError || undefined, "aria-describedby": id + "-msg"
        }),
        h("span", { className: "ns-grade-input-scale", "aria-hidden": true }, h("span", null, "DE"), h("span", null, "5.0"))),
      h("span", { id: id + "-msg", className: showError ? "ns-field-error" : "ns-field-hint", role: showError ? "alert" : undefined },
        showError ? h(Icon, { name: "error", size: 16 }) : null,
        showError ? check.message : (props.hint || "Escala de 1.0 a 5.0")));
  }

  var BADGE_ICON = { high: "check", verified: "check", medium: "ai", low: "warning", review: "warning", pending: "clock" };
  function Badge(props) {
    var tone = props.tone || "neutral";
    var icon = props.icon === false ? null : (props.icon || BADGE_ICON[tone]);
    return h("span", { className: cx("ns-badge", "ns-badge--" + tone, props.className), title: props.title },
      icon ? h(Icon, { name: icon, size: 14 }) : null, props.children);
  }

  function Avatar(props) {
    return h("span", { className: cx("ns-avatar", props.size && props.size !== "md" && "ns-avatar--" + props.size, props.className), "data-tone": hashTone(props.name), role: "img", "aria-label": props.name },
      props.src ? h("img", { src: props.src, alt: "" }) : h("span", { "aria-hidden": true }, initials(props.name)));
  }

  function Divider(props) {
    var v = props.variant || "hairline";
    if (v === "ornament") return h("div", { className: cx("ns-divider ns-divider--ornament", props.className), role: "separator" }, h("span", { className: "ns-divider-mark" }, props.label || "NotaScan"));
    return h("hr", { className: cx("ns-divider", v === "strong" && "ns-divider--strong", props.className) });
  }

  function Sticker(props) {
    var tone = props.tone || "gold";
    var rot = props.rotate === undefined ? -4 : props.rotate;
    return h("span", { className: cx("ns-sticker", "ns-sticker--" + tone, props.className), style: Object.assign({ "--rot": rot + "deg" }, props.style) },
      props.icon ? h(Icon, { name: props.icon, size: 16, strokeWidth: 2.5 }) : null, props.children);
  }

  var DOT_LABEL = { processing: "Procesando", success: "Completado", warning: "Revisar", error: "Error" };
  function StatusDot(props) {
    var s = props.status || "success";
    return h("span", { className: cx("ns-dot", "ns-dot--" + s, props.className), role: s === "processing" ? "status" : undefined },
      h("span", { className: "ns-dot-mark", "aria-hidden": true }),
      props.hideLabel ? h("span", { className: "ns-sr" }, props.label || DOT_LABEL[s]) : (props.label || DOT_LABEL[s]));
  }

  function ConfidenceIndicator(props) {
    var v = Math.max(0, Math.min(100, Math.round(props.value || 0)));
    var lvl = confidenceLevel(v);
    var on = Math.round(v / 10);
    var segs = [];
    for (var i = 0; i < 10; i++) segs.push(h("span", { key: i, className: cx("ns-conf-seg", i < on && "is-on") }));
    return h("div", { className: cx("ns-conf", "ns-conf--" + lvl, props.className) },
      props.showHead === false ? null : h("div", { className: "ns-conf-head" },
        h("span", null, props.label || "Confianza de IA"),
        h("span", { className: "ns-conf-value" }, v + "%")),
      h("div", { className: "ns-conf-track", role: "meter", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": v, "aria-valuetext": v + "% · " + LEVEL_LABEL[lvl], "aria-label": props.label || "Confianza de IA" }, segs),
      props.showLevel === false ? null : h("span", { className: "ns-conf-level" }, h(Icon, { name: BADGE_ICON[lvl], size: 14 }), LEVEL_LABEL[lvl]));
  }

  /* ================= MOLECULES ================= */
  function NavigationItem(props) {
    var active = !!props.active, disabled = !!props.disabled, rail = !!props.collapsed;
    var Tag = props.href ? "a" : "button";
    return h(Tag, {
      href: props.href, type: props.href ? undefined : "button",
      className: cx("ns-nav-item", rail && "ns-nav-item--rail", props.state && "is-" + props.state, props.className),
      "aria-current": active ? "page" : undefined, "aria-disabled": disabled || undefined,
      "aria-label": rail ? props.label : undefined, title: rail ? props.label : undefined,
      onClick: function (e) { if (disabled) { e.preventDefault(); return; } if (props.onClick) props.onClick(e); }
    },
      h(Icon, { name: props.icon, size: 20 }),
      rail ? null : h("span", null, props.label),
      rail ? null : (props.count ? h("span", { className: "ns-nav-item-count", "aria-label": props.count + " pendientes" }, props.count)
        : props.index ? h("span", { className: "ns-nav-item-index", "aria-hidden": true }, props.index) : null));
  }

  function ConfidenceBadge(props) {
    var v = Math.round(props.value || 0), lvl = confidenceLevel(v);
    return h(Badge, { tone: lvl, className: props.className, title: LEVEL_LABEL[lvl] },
      h("span", null, (props.compact ? "IA " : "Confianza IA ") + v + "%"),
      h("span", { className: "ns-sr" }, " · " + LEVEL_LABEL[lvl]));
  }

  var STATUS_ICON = { pending: "clock", verified: "check", "needs-review": "warning" };
  function ReviewStatus(props) {
    var s = props.status || "pending";
    return h("span", { className: cx("ns-status", "ns-status--" + s, props.className) },
      h(Icon, { name: STATUS_ICON[s], size: 16 }), props.label || STATUS_LABEL[s]);
  }

  function GradeInputGroup(props) {
    var detected = props.detected;
    var value = props.value !== undefined ? props.value : formatGrade(detected);
    var check = validateGrade(value);
    var manual = detected === null || detected === undefined || isNaN(detected);
    var edited = !manual && check.valid && Math.abs(check.value - detected) > 0.001;
    return h("div", { className: cx("ns-gig", props.className) },
      h(GradeInput, { id: props.id, label: props.label || "Calificación detectada", value: value, onChange: props.onChange, autoFocus: props.autoFocus, onKeyDown: props.onKeyDown, hint: "Escala de 1.0 a 5.0" }),
      h("span", { className: cx("ns-gig-note", edited && "is-edited") },
        h(Icon, { name: edited || manual ? "edit" : "ai", size: 14 }),
        manual ? "La IA no detectó una nota: ingreso manual" : edited ? "Corregida por el docente · la IA detectó " + formatGrade(detected) : "La IA detectó esta calificación"),
      props.actions ? h("div", { className: "ns-row", style: { gap: 8 } }, props.actions) : null);
  }

  function UserProfile(props) {
    return h("div", { className: cx("ns-profile", props.className) },
      h(Avatar, { name: props.name, src: props.src, size: props.compact ? "sm" : "md" }),
      props.compact ? null : h("div", { className: "ns-profile-text" },
        h("span", { className: "ns-profile-name" }, props.name),
        h("span", { className: "ns-profile-role" }, props.role)));
  }

  function SearchField(props) {
    var id = useId("search");
    return h("div", { className: cx("ns-search", props.className), role: "search" },
      h("label", { htmlFor: id, className: "ns-sr" }, props.label || "Buscar"),
      h(Icon, { name: "search", size: 18 }),
      h("input", { id: id, type: "search", className: "ns-input", placeholder: props.placeholder || "Buscar estudiante o ID", value: props.value, defaultValue: props.defaultValue, onChange: function (e) { if (props.onChange) props.onChange(e.target.value); } }),
      props.value ? h(Button, { variant: "ghost", size: "sm", className: "ns-search-clear ns-btn--icon", "aria-label": "Limpiar búsqueda", onClick: function () { if (props.onChange) props.onChange(""); } }, h(Icon, { name: "close", size: 16 })) : null);
  }

  function FilterGroup(props) {
    var st = useState(props.defaultValue || (props.options[0] && props.options[0].value));
    var value = props.value !== undefined ? props.value : st[0];
    function pick(v) { if (props.value === undefined) st[1](v); if (props.onChange) props.onChange(v); }
    if (props.as === "select") {
      var id = "flt-" + props.label.replace(/\W/g, "");
      return h("div", { className: "ns-filter" },
        h("label", { htmlFor: id, className: "ns-filter-legend" }, props.label),
        h("select", { id: id, className: "ns-select", value: value, onChange: function (e) { pick(e.target.value); } },
          props.options.map(function (o) { return h("option", { key: o.value, value: o.value }, o.label); })));
    }
    return h("fieldset", { className: cx("ns-filter", props.className) },
      h("legend", { className: "ns-filter-legend" }, props.label),
      props.options.map(function (o) {
        return h("button", { key: o.value, type: "button", className: "ns-chip", "aria-pressed": value === o.value, onClick: function () { pick(o.value); } },
          o.label, o.count !== undefined ? h("span", { className: "ns-chip-count" }, o.count) : null);
      }));
  }

  function UploadZone(props) {
    var st = useState(false), over = st[0], setOver = st[1];
    var ref = useRef(null);
    function files(list) { if (props.onFiles) props.onFiles(Array.prototype.slice.call(list || [])); }
    return h("div", {
      className: cx("ns-drop", over && "is-over", props.className), role: "button", tabIndex: 0,
      "aria-label": "Subir fotografías de la evaluación",
      onClick: function () { if (ref.current) ref.current.click(); },
      onKeyDown: function (e) { if ((e.key === "Enter" || e.key === " ") && ref.current) { e.preventDefault(); ref.current.click(); } },
      onDragOver: function (e) { e.preventDefault(); setOver(true); }, onDragLeave: function () { setOver(false); },
      onDrop: function (e) { e.preventDefault(); setOver(false); files(e.dataTransfer.files); }
    },
      h("span", { className: "ns-empty-seal" }, h(Icon, { name: "camera", size: 26 })),
      h("strong", { className: "ns-serif", style: { fontSize: 22, lineHeight: "28px", fontWeight: 600 } }, props.title || "Subir fotografía"),
      h("span", { className: "ns-caption" }, props.hint || "Arrastra las fotos del examen o haz clic. JPG o PNG, una hoja por foto."),
      h("input", { ref: ref, type: "file", accept: "image/*", multiple: true, hidden: true, onChange: function (e) { files(e.target.files); } }));
  }

  /* ================= ORGANISMS ================= */
  var NAV = [
    { id: "dashboard", label: "Dashboard", icon: "dashboard" },
    { id: "grade", label: "Calificar", icon: "grade" },
    { id: "students", label: "Estudiantes", icon: "students" },
    { id: "evaluations", label: "Evaluaciones", icon: "evaluations" },
    { id: "reports", label: "Reportes", icon: "reports" },
    { id: "system", label: "Design System", icon: "system" }
  ];
  function Sidebar(props) {
    var items = props.items || NAV;
    var rail = !!props.collapsed;
    var user = props.user || { name: "Ana Lucía Rosero", role: "Docente · Ingeniería" };
    return h("aside", { className: cx("ns-sidebar", rail && "ns-sidebar--rail", props.className), "aria-label": "Navegación principal" },
      h("div", { className: "ns-sidebar-brand" }, rail ? h(Logo, { size: 30, markOnly: true }) : h(BrandTile, null), props.onClose ? h(Button, { variant: "ghost", size: "sm", className: "ns-btn--icon", "aria-label": "Cerrar menú", onClick: props.onClose }, h(Icon, { name: "close", size: 16 })) : null),
      h("nav", null,
        rail ? null : h("div", { className: "ns-sidebar-section" }, "Navegación"),
        h("ul", null, items.map(function (it, i) {
          return h("li", { key: it.id }, h(NavigationItem, {
            icon: it.icon, label: it.label, collapsed: rail, active: props.active === it.id, count: it.count, disabled: it.disabled,
            index: String(i + 1).padStart(2, "0"), onClick: function () { if (props.onNavigate) props.onNavigate(it.id); }
          }));
        }))),
      h("div", { className: "ns-sidebar-foot" },
        rail || !props.course ? null : h("div", { className: "ns-sidebar-course" },
          h("span", { className: "ns-overline" }, props.courseLabel || "Periodo 3 · 2026"),
          h("span", { style: { font: "600 14px/20px var(--font-ui)" } }, props.course)),
        h("div", { className: "ns-sidebar-user" }, h(UserProfile, { name: user.name, role: user.role, compact: rail }),
          props.onLogout && !rail ? h(Button, { variant: "ghost", size: "sm", className: "ns-btn--icon", "aria-label": "Cerrar sesión", title: "Cerrar sesión", onClick: props.onLogout }, h(Icon, { name: "logout", size: 16 })) : null)));
  }

  function renderTitle(title, hl) {
    if (!hl || String(title).indexOf(hl) < 0) return title;
    var i = title.indexOf(hl);
    return [title.slice(0, i), h("mark", { key: "m", className: "ns-mark" }, hl), title.slice(i + hl.length)];
  }
  function Header(props) {
    return h("header", { className: cx("ns-header", props.className) },
      h("div", null,
        props.eyebrow || props.sticker ? h("div", { className: "ns-header-eyebrow" }, props.eyebrow ? h("span", { className: "ns-overline" }, props.eyebrow) : null, props.sticker ? h(Sticker, { tone: "sage", rotate: -3, icon: "check", className: "ns-header-sticker" }, props.sticker) : null) : null,
        h("h1", { className: "ns-header-title" }, renderTitle(props.title, props.highlight)),
        props.description ? h("p", { className: "ns-header-desc" }, props.description) : null),
      props.actions ? h("div", { className: "ns-header-actions" }, props.actions) : null,
      props.tabs ? h("div", { className: "ns-tabs", role: "tablist", "aria-label": "Secciones de " + props.title },
        props.tabs.map(function (t) {
          return h("button", { key: t.value, role: "tab", type: "button", className: "ns-tab", "aria-selected": props.tab === t.value, onClick: function () { if (props.onTab) props.onTab(t.value); } }, t.label);
        })) : null);
  }

  function ReviewSummary(props) {
    var total = props.total, v = props.verified, p = props.pending, r = props.review;
    function pct(n) { return total ? Math.round(n / total * 100) : 0; }
    function tile(tone, value, label, icon, dot) {
      return h("div", { className: "ns-bento-tile ns-bento-tile--" + tone },
        h("div", { className: "ns-bento-top" },
          h("span", { className: "ns-bento-icon", "aria-hidden": true }, h(Icon, { name: icon, size: 18, strokeWidth: 2.5 })),
          h("span", { className: "ns-bento-pct" }, pct(value) + "%")),
        h("span", { className: "ns-bento-value" }, h(CountUp, { value: value })),
        h("span", { className: "ns-bento-label" }, h(StatusDot, { status: dot, hideLabel: true, label: label }), label));
    }
    return h("section", { className: cx("ns-bento", props.className), "aria-label": "Resumen de la revisión" },
      h("div", { className: "ns-bento-tile ns-bento-tile--lead" },
        h("span", { className: "ns-overline", style: { color: "var(--gold)" } }, props.evaluation || "Esta evaluación"),
        h("span", { className: "ns-bento-value ns-bento-value--xl" }, h(CountUp, { value: total }), h("small", null, " estudiantes")),
        h("div", { className: "ns-bento-progress", role: "img", "aria-label": v + " de " + total + " verificadas" },
          h("span", { className: "is-verified", style: { width: pct(v) + "%" } }),
          h("span", { className: "is-review", style: { width: pct(r) + "%" } })),
        h("span", { className: "ns-bento-foot" }, props.foot || (v === total ? "Todo verificado. Listo para guardar." : (total - v) + " por verificar antes de guardar"))),
      tile("sage", v, (props.labels || [])[0] || "verificadas", "check", "success"),
      tile("gold", p, (props.labels || [])[1] || "pendientes", "clock", "warning"),
      tile("burgundy", r, (props.labels || [])[2] || "requieren revisión", props.labels ? "shield" : "warning", "error"));
  }

  function FiltersBar(props) {
    return h("div", { className: cx("ns-filters", props.className) },
      h(SearchField, { value: props.search, onChange: props.onSearch, placeholder: props.placeholder }),
      (props.groups || []).map(function (g) { return h(FilterGroup, Object.assign({ key: g.label }, g)); }),
      props.count !== undefined ? h("span", { className: "ns-filters-count", "aria-live": "polite" }, props.count) : null);
  }

  function useCountUp(target, run) {
    var st = useState(run && !prefersReducedMotion() ? 0 : target), val = st[0], set = st[1];
    useEffect(function () {
      if (!run || prefersReducedMotion()) { set(target); return; }
      var start = null, raf, dur = 600;
      function tick(t) {
        if (start === null) start = t;
        var k = Math.min(1, (t - start) / dur), e = 1 - Math.pow(1 - k, 3);
        set(target * e);
        if (k < 1) raf = requestAnimationFrame(tick);
      }
      raf = requestAnimationFrame(tick);
      return function () { cancelAnimationFrame(raf); };
    }, [target, run]);
    return val;
  }

  /* Cifra que cuenta desde 0 al montarse. Conserva decimales, separadores y sufijo ("9%", "3.8", "1.240"). */
  function CountUp(props) {
    var raw = String(props.value), m = raw.match(/^([^0-9]*)([0-9][0-9.,]*)(.*)$/);
    var num = m ? parseFloat(m[2].replace(/,/g, "")) : NaN;
    var dec = m && /\.\d+$/.test(m[2]) ? m[2].split(".")[1].length : 0;
    var shown = useCountUp(isNaN(num) ? 0 : num, !isNaN(num) && props.animate !== false);
    if (!m || isNaN(num)) return raw;
    return h("span", { className: "ns-countup", "aria-label": raw }, h("span", { "aria-hidden": true }, m[1] + shown.toFixed(dec) + m[3]));
  }

  function StudentGradeCard(props) {
    var s = props.student || {};
    var detected = props.detected;
    var gradeState = useState(props.grade !== undefined ? props.grade : detected);
    var grade = props.grade !== undefined ? props.grade : gradeState[0];
    var statusState = useState(props.status || (confidenceLevel(props.confidence) === "low" ? "needs-review" : "pending"));
    var status = props.status !== undefined && props.onStatusChange ? props.status : statusState[0];
    var editState = useState(!!props.editing), editing = editState[0], setEditing = editState[1];
    var draftState = useState(formatGrade(grade)), draft = draftState[0], setDraft = draftState[1];
    var stampState = useState(false), stamping = stampState[0], setStamping = stampState[1];
    var shown = useCountUp(isNaN(grade) ? 0 : grade, props.animate !== false);
    var check = validateGrade(draft);
    var noDetection = detected === null || detected === undefined || isNaN(detected);
    var failed = noDetection && (grade === null || grade === undefined || isNaN(grade));
    var headingId = useId("card");

    function setStatus(v) { statusState[1](v); if (props.onStatusChange) props.onStatusChange(v); }
    function commitDraft() {
      if (!check.valid) return false;
      gradeState[1](check.value); if (props.onGradeChange) props.onGradeChange(check.value);
      return true;
    }
    function confirm() {
      if (editing && !commitDraft()) return;
      setEditing(false); setStamping(true); setStatus("verified");
      if (props.onConfirm) props.onConfirm(editing ? check.value : grade);
      setTimeout(function () { setStamping(false); }, 700);
    }
    function startEdit() { setDraft(failed ? "" : formatGrade(grade)); setEditing(true); if (status === "verified") setStatus("pending"); }
    function cancelEdit() { setEditing(false); setDraft(formatGrade(grade)); }

    var lvl = confidenceLevel(props.confidence || 0);
    var edited = !noDetection && Math.abs(grade - detected) > 0.001;
    var cardStatus = status;
    return h("article", {
      className: cx("ns-card", "ns-card--" + cardStatus, stamping && "is-stamping", props.className),
      "aria-labelledby": headingId, style: props.style
    },
      props.index ? h("span", { className: "ns-card-index", "aria-hidden": true }, "Nº " + String(props.index).padStart(2, "0")) : null,
      h("div", { className: "ns-card-head" },
        h(Avatar, { name: s.name, size: "sm" }),
        h("div", { className: "ns-card-who" },
          h("h3", { id: headingId, className: "ns-card-name", style: { margin: 0 } }, s.name),
          h("span", { className: "ns-card-id" }, "ID " + s.id + (s.course ? " · " + s.course : ""))),
        h("div", { style: { marginLeft: "auto" } }, noDetection ? h(Badge, { tone: "low", icon: "error" }, "Sin detección") : h(ConfidenceBadge, { value: props.confidence, compact: true }))),
      h("div", { className: "ns-card-body" },
        editing
          ? h("div", { className: "ns-card-edit", style: { gridColumn: "1 / -1" } },
            h(GradeInputGroup, {
              detected: noDetection ? NaN : detected, value: draft, autoFocus: true, label: noDetection ? "Introduce la calificación" : "Corregir calificación",
              onChange: function (v) { setDraft(v); },
              onKeyDown: function (e) { if (e.key === "Enter") confirm(); if (e.key === "Escape") cancelEdit(); }
            }))
          : failed
            ? h("div", { style: { gridColumn: "1 / -1", display: "grid", gap: 6, padding: "8px 0" } },
              h("strong", { className: "ns-serif", style: { fontSize: 20, lineHeight: "26px" } }, "No pudimos detectar una calificación."),
              h("span", { className: "ns-caption", style: { color: "var(--charcoal)" } }, "Puedes introducirla manualmente."))
            : h(Fragment, null,
              h("div", { className: "ns-card-grade-label" },
                h("span", { className: "ns-overline", style: { color: "var(--muted)" } }, noDetection ? "Introducida por el docente" : edited ? "Calificación corregida" : "Calificación detectada")),
              h("div", { className: "ns-card-grade", "aria-label": "Calificación " + formatGrade(grade) }, formatGrade(shown)),
              status === "verified" ? h("div", { className: "ns-card-side" }, h("div", { className: cx("ns-stamp", stamping && "is-new"), "aria-hidden": true }, h("span", null, h("b", null, formatGrade(grade)), "Verificada"))) : h("div", { className: "ns-card-side" },
                noDetection ? h("span", { className: "ns-gig-note is-edited" }, h(Icon, { name: "edit", size: 14 }), "Sin detección de la IA · ingreso manual") : h(ConfidenceIndicator, { value: props.confidence, label: "Lectura de la IA", showHead: false }),
                edited ? h("span", { className: "ns-gig-note is-edited" }, h(Icon, { name: "edit", size: 14 }), "IA detectó " + formatGrade(detected)) : null))),
      h("div", { className: "ns-card-foot" },
        h(ReviewStatus, { status: editing ? "pending" : status, label: editing ? "Editando" : undefined }),
        h("div", { className: "ns-card-actions" },
          editing
            ? [h(Button, { key: "c", variant: "ghost", size: "sm", onClick: cancelEdit }, "Cancelar"),
            h(Button, { key: "ok", size: "sm", icon: "check", onClick: confirm, disabled: !check.valid }, "Confirmar")]
            : status === "verified"
              ? h(Button, { variant: "ghost", size: "sm", icon: "edit", onClick: startEdit, "aria-label": "Editar calificación de " + s.name }, "Editar")
              : [h(Button, { key: "e", variant: "secondary", size: "sm", icon: "edit", onClick: startEdit, "aria-label": "Editar calificación de " + s.name }, failed ? "Introducir" : "Editar"),
              failed ? null : h(Button, { key: "ok", size: "sm", icon: "check", onClick: confirm, "aria-label": "Confirmar calificación de " + s.name }, "Confirmar")])));
  }

  function StudentGradeCardSkeleton() {
    return h("div", { className: "ns-card ns-card--skeleton", "aria-hidden": true },
      h("div", { className: "ns-card-head" }, h("span", { className: "ns-skel", style: { width: 40, height: 40, borderRadius: 999 } }), h("div", { style: { display: "grid", gap: 6, flex: 1 } }, h("span", { className: "ns-skel", style: { height: 14, width: "70%" } }), h("span", { className: "ns-skel", style: { height: 10, width: "40%" } }))),
      h("div", { className: "ns-card-body" }, h("span", { className: "ns-skel", style: { width: 96, height: 64 } }), h("span", { className: "ns-skel", style: { height: 30 } })),
      h("div", { className: "ns-card-foot" }, h("span", { className: "ns-skel", style: { height: 14, width: 120 } })));
  }

  var FLOW = ["Cargar fotografía", "Detectar estudiante", "Detectar calificación", "Calcular confianza", "Revisar", "Confirmar", "Guardar"];
  function ReviewStepper(props) {
    var cur = props.current || 1;
    var steps = props.steps || FLOW;
    return h("ol", { className: cx("ns-stepper", props.className), "aria-label": "Flujo de calificación" },
      steps.map(function (label, i) {
        var n = i + 1, done = n < cur, now = n === cur;
        return h("li", { key: label, className: cx("ns-step", done && "is-done", now && "is-current"), "aria-current": now ? "step" : undefined },
          h("span", { className: "ns-step-mark" }, done ? h(Icon, { name: "check", size: 14, strokeWidth: 3 }) : n),
          h("span", { className: "ns-step-label" }, label, done ? h("span", { className: "ns-sr" }, " (completado)") : null));
      }));
  }

  function Marquee(props) {
    var items = props.items || ["La IA detecta", "El docente verifica", "El sistema guarda", "Precisión con control humano"];
    var seq = [];
    for (var k = 0; k < 4; k++) items.forEach(function (t, i) { seq.push(h("span", { key: k + "-" + i, className: "ns-marquee-item" }, t, h("span", { className: "ns-marquee-sep", "aria-hidden": true }))); });
    return h("div", { className: cx("ns-marquee", "ns-marquee--" + (props.tone || "navy"), props.className), role: "note", "aria-label": items.join(". ") },
      h("span", { className: "ns-marquee-label", "aria-hidden": true }, h(Icon, { name: "ai", size: 16, strokeWidth: 2.5 }), props.label || "Principio"),
      h("div", { className: "ns-marquee-window" }, h("div", { className: "ns-marquee-track", "aria-hidden": true }, seq)));
  }

  var PROC_STEPS = ["Identificando estudiante", "Detectando calificación", "Calculando confianza"];
  function ProcessingPanel(props) {
    var auto = props.simulate !== false && props.step === undefined;
    var st = useState(auto ? 0 : props.step), step = auto ? st[0] : props.step;
    useEffect(function () {
      if (!auto) return;
      if (step >= PROC_STEPS.length) { var t2 = setTimeout(function () { st[1](0); }, 2600); return function () { clearTimeout(t2); }; }
      var t = setTimeout(function () { st[1](step + 1); }, 1100);
      return function () { clearTimeout(t); };
    }, [step, auto]);
    var done = step >= PROC_STEPS.length;
    var file = props.file || "parcial2_programacion_07.jpg";
    return h("section", { className: cx("ns-proc ns-glass", props.className), "aria-live": "polite", "aria-busy": !done },
      h("div", { className: "ns-row", style: { justifyContent: "space-between" } },
        h("span", { className: "ns-overline" }, "Foto " + (props.index || 7) + " de " + (props.total || 24)),
        h(StatusDot, { status: done ? "success" : "processing", label: done ? "Listo para revisar" : "Procesando" })),
      h("h2", { className: "ns-proc-title" }, done ? "Estudiante identificado" : "Analizando fotografía…"),
      h("div", { className: "ns-photo", role: "img", "aria-label": "Vista previa de " + file },
        h("span", { className: "ns-photo-qr" }),
        step >= 1 ? h("span", { className: "ns-photo-box", style: { left: "6%", top: "9%", width: 64, height: 64 } }) : null,
        h("span", { className: "ns-photo-grade", style: { opacity: step >= 1 ? 1 : .5 } }, props.grade || "4,5"),
        step >= 2 ? h("span", { className: "ns-photo-box", style: { right: "10%", top: "16%", width: 84, height: 56 } }) : null,
        done ? null : h("span", { className: "ns-photo-scan" })),
      h("ul", { className: "ns-proc-list" }, PROC_STEPS.map(function (label, i) {
        var d = i < step, a = i === step;
        return h("li", { key: label, className: cx("ns-proc-item", d && "is-done", a && "is-active") },
          d ? h(Icon, { name: "check", size: 18 }) : a ? h(StatusDot, { status: "processing", hideLabel: true }) : h(Icon, { name: "clock", size: 18 }),
          label,
          h("span", { className: "ns-proc-item-state" }, d ? (i === 0 ? (props.studentName || "María Fernanda López") : i === 1 ? (props.detected || "4.5") : (props.confidence || 98) + "%") : a ? "En curso" : "En espera"));
      })),
      h("div", { className: "ns-proc-bar", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": 3, "aria-valuenow": Math.min(step, 3), "aria-label": "Progreso del reconocimiento" },
        h("span", { style: { width: (Math.min(step, 3) / 3 * 100) + "%" } })),
      h("span", { className: "ns-caption" }, "La IA solo detecta. Tú revisas y confirmas cada nota."));
  }

  function ConfirmDialog(props) {
    var ref = useRef(null);
    var titleId = useId("dlg"), descId = titleId + "-d";
    useEffect(function () {
      if (!props.open) return;
      var prev = document.activeElement;
      var node = ref.current;
      var btn = node && node.querySelector("[data-autofocus]");
      if (btn) btn.focus();
      function onKey(e) {
        if (e.key === "Escape" && props.onCancel) props.onCancel();
        if (e.key === "Tab" && node) {
          var f = node.querySelectorAll("button:not([disabled])");
          if (!f.length) return;
          var first = f[0], last = f[f.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
      document.addEventListener("keydown", onKey);
      return function () { document.removeEventListener("keydown", onKey); if (prev && prev.focus) prev.focus(); };
    }, [props.open]);
    if (!props.open) return null;
    var n = props.count;
    return h("div", { className: cx("ns-scrim", props.inline && "ns-scrim--inline"), onMouseDown: function (e) { if (e.target === e.currentTarget && props.onCancel) props.onCancel(); } },
      h("div", { ref: ref, className: "ns-dialog ns-glass", role: "alertdialog", "aria-modal": true, "aria-labelledby": titleId, "aria-describedby": descId },
        h("span", { className: "ns-dialog-seal", "aria-hidden": true }, h(Icon, { name: "lock", size: 20 })),
        h("h2", { id: titleId, className: "ns-dialog-title" }, props.title || ("¿Confirmar " + n + " calificaciones?")),
        h("p", { id: descId, className: "ns-dialog-text" }, props.description || "Las calificaciones verificadas serán guardadas."),
        props.note ? h(Badge, { tone: "review" }, props.note) : null,
        h("div", { className: "ns-dialog-actions" },
          h(Button, { variant: "secondary", onClick: props.onCancel, "data-autofocus": true }, "Cancelar"),
          h(Button, { variant: "primary", icon: "lock", loading: props.loading, onClick: props.onConfirm }, props.confirmLabel || "Confirmar y guardar"))));
  }

  var TOAST_ICON = { success: "check", error: "error", info: "ai" };
  function Toast(props) {
    var tone = props.tone || "success";
    return h("div", { className: cx("ns-toast", "ns-toast--" + tone, props.className), role: tone === "error" ? "alert" : "status" },
      h("span", { className: "ns-toast-icon", "aria-hidden": true }, h(Icon, { name: TOAST_ICON[tone], size: 16, strokeWidth: 2.5 })),
      h("div", { style: { flex: 1, minWidth: 0 } },
        h("div", { className: "ns-toast-title" }, props.title),
        props.message ? h("div", { className: "ns-toast-text" }, props.message) : null),
      props.onClose ? h(Button, { variant: "ghost", size: "sm", className: "ns-btn--icon", "aria-label": "Cerrar aviso", onClick: props.onClose }, h(Icon, { name: "close", size: 16 })) : null);
  }

  function EmptyState(props) {
    var err = props.tone === "error";
    return h("section", { className: cx("ns-empty", err && "ns-empty--error", props.className) },
      h("span", { className: "ns-empty-seal", "aria-hidden": true }, h(Icon, { name: props.icon || (err ? "warning" : "evaluations"), size: 26 })),
      h("h3", { className: "ns-empty-title" }, props.title),
      props.message ? h("p", { className: "ns-empty-text" }, props.message) : null,
      props.action || null);
  }

  function DataTable(props) {
    return h("div", { className: cx("ns-table-wrap", props.className), role: "region", "aria-label": props.caption, tabIndex: 0 },
      h("table", { className: "ns-table" },
        h("caption", { className: "ns-sr" }, props.caption),
        h("thead", null, h("tr", null, props.columns.map(function (c) { return h("th", { key: c.key, scope: "col", className: c.numeric ? "is-num" : undefined }, c.label); }))),
        h("tbody", null, props.rows.map(function (r, i) {
          return h("tr", { key: r.id || i }, props.columns.map(function (c) {
            return h("td", { key: c.key, className: c.numeric ? "is-num" : undefined }, c.render ? c.render(r) : r[c.key]);
          }));
        }))));
  }

  /* ================= TEMPLATE ================= */
  var MOCK = [
    { student: { name: "María Fernanda López", id: "20261045", course: "7A" }, detected: 4.5, confidence: 98, status: "verified" },
    { student: { name: "Juan Sebastián Martínez", id: "20261051", course: "7A" }, detected: 3.8, confidence: 62 },
    { student: { name: "Valentina Guerrero", id: "20261063", course: "7A" }, detected: 4.2, confidence: 94 },
    { student: { name: "Carlos Andrés Rodríguez", id: "20261070", course: "7A" }, detected: 2.9, confidence: 81 },
    { student: { name: "Laura Camila Benavides", id: "20261078", course: "7A" }, detected: 4.8, confidence: 97 },
    { student: { name: "Santiago Muñoz", id: "20261082", course: "7A" }, detected: NaN, confidence: 0 },
    { student: { name: "Daniela Alejandra Pantoja", id: "20261089", course: "7A" }, detected: 3.5, confidence: 91 },
    { student: { name: "Andrés Felipe Erazo", id: "20261094", course: "7A" }, detected: 4.0, confidence: 88 },
    { student: { name: "Isabella Chamorro", id: "20261101", course: "7A" }, detected: 1.9, confidence: 69 }
  ].map(function (r, i) {
    r.key = r.student.id; r.index = i + 1;
    r.status = r.status || (isNaN(r.detected) || confidenceLevel(r.confidence) === "low" ? "needs-review" : "pending");
    r.grade = r.detected;
    return r;
  });

  function GradeReviewDashboard(props) {
    var rowsState = useState(function () { return (props.rows || MOCK).map(function (r) { return Object.assign({}, r); }); });
    var rows = rowsState[0], setRows = rowsState[1];
    var q = useState(""), search = q[0];
    var f = useState("all"), filter = f[0];
    var dlg = useState(false), saving = useState(false), toast = useState(null);
    var loading = useState(!!props.loading);

    function update(key, patch) { setRows(function (rs) { return rs.map(function (r) { return r.key === key ? Object.assign({}, r, patch) : r; }); }); }
    var counts = rows.reduce(function (a, r) { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});
    var verified = counts.verified || 0, review = counts["needs-review"] || 0, pending = counts.pending || 0;
    var visible = rows.filter(function (r) {
      var okF = filter === "all" || r.status === filter;
      var s = search.trim().toLowerCase();
      var okS = !s || r.student.name.toLowerCase().indexOf(s) >= 0 || r.student.id.indexOf(s) >= 0;
      return okF && okS;
    });

    function save() {
      saving[1](true);
      setTimeout(function () {
        saving[1](false); dlg[1](false);
        toast[1]({ tone: "success", title: verified + " calificaciones guardadas", message: "Parcial 2 · Matemáticas quedó actualizado." });
        setTimeout(function () { toast[1](null); }, 4200);
      }, 900);
    }

    return h(AppShell, { active: "grade", onNavigate: props.onNavigate, onLogout: props.onLogout, pending: pending + review, style: props.style,
      overlay: [h(ConfirmDialog, {
        key: "dlg", open: dlg[0], count: verified, loading: saving[0], inline: props.inlineDialog,
        note: pending + review > 0 ? (pending + review) + " sin verificar quedarán pendientes" : null,
        onCancel: function () { dlg[1](false); }, onConfirm: save
      }),
      toast[0] ? h("div", { key: "t", className: "ns-toast-region", style: props.inlineDialog ? { position: "absolute" } : undefined }, h(Toast, Object.assign({}, toast[0], { onClose: function () { toast[1](null); } }))) : null] },
          h(Header, {
            eyebrow: "Parcial 2 · Matemáticas · 7A",
            title: "Revisión de calificaciones", highlight: "calificaciones", sticker: "IA + docente",
            description: "La IA terminó el reconocimiento. Verifica las calificaciones antes de guardarlas.",
            actions: [
              h(Button, { key: "u", variant: "secondary", icon: "upload", onClick: function () { if (props.onNavigate) props.onNavigate("grade"); } }, "Subir más fotos"),
              h(Button, { key: "s", size: "lg", icon: "lock", disabled: verified === 0, onClick: function () { dlg[1](true); } }, "Confirmar y guardar")
            ]
          }),
          h(Marquee, {}),
          h(ReviewStepper, { current: 5 }),
          h(ReviewSummary, { total: rows.length, verified: verified, pending: pending, review: review, evaluation: "Parcial 2" }),
          h("div", null,
            h(FiltersBar, {
              search: search, onSearch: q[1], count: visible.length + " de " + rows.length + " estudiantes",
              groups: [{
                label: "Estado", value: filter, onChange: f[1], options: [
                  { value: "all", label: "Todas", count: rows.length },
                  { value: "needs-review", label: "Requiere revisión", count: review },
                  { value: "pending", label: "Pendientes", count: pending },
                  { value: "verified", label: "Verificadas", count: verified }]
              }]
            })),
          loading[0]
            ? h("div", { className: "ns-grid" }, [0, 1, 2].map(function (i) { return h(StudentGradeCardSkeleton, { key: i }); }))
            : visible.length
              ? h("div", { className: "ns-grid" }, visible.map(function (r) {
                return h(StudentGradeCard, {
                  key: r.key, index: r.index, student: r.student, detected: r.detected, confidence: r.confidence,
                  status: r.status, onStatusChange: function (s) { update(r.key, { status: s }); },
                  onGradeChange: function (g) { update(r.key, { grade: g }); }
                });
              }))
              : h(EmptyState, { title: "No hay calificaciones con este filtro.", message: "Prueba con otro estado o limpia la búsqueda.", action: h(Button, { variant: "secondary", onClick: function () { f[1]("all"); q[1](""); } }, "Ver todas") }));
  }

  /* ================= APP SHELL ================= */
  function AppShell(props) {
    var shellCtx = React.useContext(ShellCtx);
    if (shellCtx && !props.items) return h(RoleShell, Object.assign({}, props, { role: shellCtx.role, active: { grade: "grades", review: "grades", evaluations: "grades" }[props.active] || props.active }));
    var drawer = useState(false);
    var pending = props.pending === undefined ? 8 : props.pending;
    var ALIAS = { grade: "grades", review: "grades", evaluations: "grades" };
    var items = props.items || NAV.map(function (n) { return n.id === "grade" ? Object.assign({}, n, { count: pending || undefined }) : n; });
    var hasActive = items.some(function (n) { return n.id === props.active; });
    var sidebar = h(Sidebar, {
      active: hasActive ? props.active : (ALIAS[props.active] || props.active), course: props.course || "Matemáticas · 7A", courseLabel: props.courseLabel,
      user: props.user, onLogout: props.onLogout,
      onNavigate: function (id) { drawer[1](false); if (props.onNavigate) props.onNavigate(id); },
      items: items,
      onClose: drawer[0] ? function () { drawer[1](false); } : undefined
    });
    return h("div", { className: "ns ns-app ns-canvas", style: props.style },
      h("div", { className: cx("ns-app-side", drawer[0] && "is-open") }, sidebar),
      h("div", { style: { minWidth: 0 } },
        h("div", { className: "ns-app-topbar" }, h(Logo, { size: 24 }), h(Button, { variant: "icon", size: "sm", "aria-label": "Abrir menú", onClick: function () { drawer[1](true); } }, h(Icon, { name: "menu", size: 18 }))),
        h("main", { className: cx("ns-app-main", props.density && "ns-density-" + props.density) }, props.topbar ? h("div", { className: "ns-app-tools" }, props.topbar) : null, props.children)),
      props.overlay || null);
  }

  /* ================= MOCK DATA (páginas) ================= */
  var STUDENTS = [
    ["María Fernanda López", "20261045", "7A", 4.5, "verified", "Parcial 2"],
    ["Juan Sebastián Martínez", "20261051", "7A", 3.8, "needs-review", "Parcial 2"],
    ["Valentina Guerrero", "20261063", "7A", 4.2, "pending", "Parcial 2"],
    ["Carlos Andrés Rodríguez", "20261070", "7A", 2.9, "pending", "Taller 3"],
    ["Laura Camila Benavides", "20261078", "7A", 4.8, "verified", "Parcial 2"],
    ["Santiago Muñoz", "20261082", "7A", NaN, "needs-review", "Parcial 2"],
    ["Daniela Alejandra Pantoja", "20261089", "7B", 3.5, "verified", "Taller 3"],
    ["Andrés Felipe Erazo", "20261094", "7B", 4.0, "verified", "Quiz 4"],
    ["Isabella Chamorro", "20261101", "7B", 1.9, "needs-review", "Quiz 4"],
    ["Sebastián Delgado", "20261107", "7B", 3.2, "pending", "Taller 3"]
  ].map(function (r) { return { name: r[0], id: r[1], course: r[2], avg: r[3], status: r[4], last: r[5] }; });

  var EVALUATIONS = [
    { id: "e1", name: "Parcial 2", subject: "Matemáticas", kind: "examen", weight: 25, status: "en-revision", reviewed: 18, total: 24, date: "28 sep" },
    { id: "e2", name: "Taller 3 · Ecuaciones", subject: "Matemáticas", kind: "taller", weight: 15, status: "cerrada", reviewed: 24, total: 24, date: "21 sep" },
    { id: "e3", name: "Quiz 4", subject: "Matemáticas", kind: "actividad", weight: 10, status: "en-revision", reviewed: 9, total: 24, date: "30 sep" },
    { id: "e4", name: "Parcial 1", subject: "Matemáticas", kind: "examen", weight: 25, status: "cerrada", reviewed: 24, total: 24, date: "31 ago" },
    { id: "e5", name: "Proyecto final", subject: "Matemáticas", kind: "taller", weight: 15, status: "borrador", reviewed: 0, total: 24, date: "25 nov" },
    { id: "e6", name: "Examen final", subject: "Matemáticas", kind: "examen", weight: 10, status: "borrador", reviewed: 0, total: 24, date: "2 dic" }
  ];
  var EVAL_STATUS = { "en-revision": ["En revisión", "pending"], cerrada: ["Cerrada", "verified"], borrador: ["Borrador", "neutral"] };
  var KIND = { examen: ["Examen", "navy"], taller: ["Taller", "gold"], actividad: ["Actividad", "sage"] };

  function Block(props) {
    return h("section", { className: cx("ns-block", props.tone && "ns-block--" + props.tone, props.className), "aria-label": props.label, style: props.style }, props.children);
  }
  function BlockTitle(props) {
    return h("div", { className: "ns-block-title" },
      h("h2", null, props.children),
      props.action || null);
  }
  function Progress(props) {
    var pct = props.total ? Math.round(props.value / props.total * 100) : 0;
    return h("div", { className: cx("ns-progress", props.tone && "ns-progress--" + props.tone), role: "progressbar", "aria-valuemin": 0, "aria-valuemax": props.total, "aria-valuenow": props.value, "aria-label": props.label || "Avance" },
      h("span", { style: { width: pct + "%" } }));
  }

  /* ================= LOGIN ================= */
  /* Ilustración propia del login: hoja de examen + teléfono escaneando, dentro de manchas orgánicas. */
  function LoginIllustration() {
    return h("svg", { className: "ns-auth-illus", viewBox: "0 0 640 600", role: "img", "aria-label": "Un teléfono escanea la hoja de un examen y detecta la nota 4.5" },
      h("path", { className: "f-sage-soft a-blob a-blob1", d: "M318 22c96-8 196 36 250 118 52 80 70 190 24 276-44 84-146 132-246 150-104 18-214-6-276-86C8 402-6 282 30 186 66 90 214 30 318 22Z" }),
      h("path", { className: "f-sage a-blob a-blob2", d: "M322 88c80-6 162 30 206 98 42 66 54 156 16 226-36 70-120 108-202 120-86 12-176-6-226-72-50-66-58-164-28-242C118 140 238 94 322 88Z" }),
      h("path", { className: "f-ivory-deep a-blob a-blob3", d: "M326 160c58-4 116 22 146 70 30 48 36 110 10 160-26 48-86 76-146 82-60 6-122-8-156-54-34-46-38-114-16-168 24-52 104-86 162-90Z" }),
      h("circle", { className: "f-gold a-sun", cx: 470, cy: 170, r: 62 }),
      h("circle", { className: "f-sage-soft o-7 a-bub", cx: 92, cy: 110, r: 26 }),
      h("circle", { className: "f-sage-soft o-7 a-bub a-bub2", cx: 574, cy: 430, r: 34 }),
      h("circle", { className: "f-sage-soft o-7 a-bub a-bub3", cx: 60, cy: 470, r: 18 }),
      h("circle", { className: "f-gold-soft a-bub a-bub2", cx: 548, cy: 70, r: 14 }),
      h("circle", { className: "f-sage-soft o-7 a-bub a-bub3", cx: 150, cy: 560, r: 12 }),
      /* hoja del examen */
      h("g", { className: "a-paper", transform: "rotate(-7 280 330)" },
        h("rect", { className: "f-navy", x: 176, y: 186, width: 214, height: 280, rx: 14, transform: "translate(8 8)" }),
        h("rect", { className: "f-paper s-navy", x: 176, y: 186, width: 214, height: 280, rx: 14 }),
        h("rect", { className: "f-navy", x: 196, y: 208, width: 44, height: 44, rx: 4 }),
        h("rect", { className: "f-paper", x: 204, y: 216, width: 10, height: 10 }),
        h("rect", { className: "f-paper", x: 222, y: 230, width: 10, height: 10 }),
        h("rect", { className: "f-paper", x: 206, y: 236, width: 8, height: 8 }),
        h("rect", { className: "f-navy", x: 252, y: 212, width: 96, height: 8, rx: 4 }),
        h("rect", { className: "f-hair", x: 252, y: 230, width: 64, height: 6, rx: 3 }),
        [276, 300, 324, 348, 372, 396, 420].map(function (y, i) { return h("rect", { key: y, className: "f-hair", x: 196, y: y, width: i % 3 === 2 ? 110 : 172, height: 6, rx: 3 }); }),
        h("path", { className: "s-burgundy", d: "M290 257c13-21 54-27 79-14 21 11 21 36 0 48-25 13-66 11-83-4-13-11-13-27 4-34" }),
        h("text", { className: "t-hand", x: 327, y: 270, textAnchor: "middle", dominantBaseline: "central" }, "4,5")),
      /* lápiz */
      h("g", { className: "a-pencil", transform: "rotate(38 160 470)" },
        h("rect", { className: "f-gold s-navy", x: 110, y: 458, width: 110, height: 22, rx: 4 }),
        h("path", { className: "f-paper s-navy", d: "M220 458l26 11-26 11Z" }),
        h("rect", { className: "f-burgundy s-navy", x: 98, y: 458, width: 14, height: 22, rx: 4 })),
      /* teléfono escaneando */
      h("g", { className: "a-phone", transform: "rotate(8 470 390)" },
        h("rect", { className: "f-gold", x: 404, y: 262, width: 150, height: 262, rx: 26, transform: "translate(8 8)" }),
        h("rect", { className: "f-navy", x: 404, y: 262, width: 150, height: 262, rx: 26 }),
        h("rect", { className: "f-ivory", x: 416, y: 290, width: 126, height: 206, rx: 14 }),
        h("rect", { className: "f-navy", x: 458, y: 272, width: 42, height: 8, rx: 4, opacity: .6 }),
        h("path", { className: "s-gold-thick", d: "M430 318v-14h14M528 304h14v14M542 400v14h-14M444 414h-14v-14" }),
        h("text", { className: "t-grade", x: 479, y: 378, textAnchor: "middle" }, "4.5"),
        h("rect", { className: "f-sage-soft s-sage", x: 436, y: 432, width: 86, height: 26, rx: 13 }),
        h("text", { className: "t-chip", x: 479, y: 450, textAnchor: "middle" }, "IA 98%"),
        h("rect", { className: "ns-scanline", x: 420, y: 300, width: 118, height: 3, rx: 1.5 })),
      /* sello */
      h("g", { transform: "translate(560 300)" }, h("g", { className: "a-seal" },
        h("circle", { className: "f-sage s-navy", r: 30 }),
        h("path", { className: "s-paper-thick", d: "M-12 0l8 9 16-18" }))));
  }

  function LoginPage(props) {
    var email = useState(""), pass = useState(""), tried = useState(false), busy = useState(false), show = useState(false), role = useState(props.defaultRole || "teacher");
    var okEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email[0]), okPass = pass[0].length >= 6;
    var emailErr = tried[0] && !okEmail ? "Escribe tu correo institucional completo." : null;
    var passErr = tried[0] && !okPass ? "La contraseña tiene al menos 6 caracteres." : null;
    function submit(e) {
      e.preventDefault(); tried[1](true);
      if (!okEmail || !okPass) return;
      busy[1](true);
      setTimeout(function () { busy[1](false); if (props.onLogin) props.onLogin(role[0]); }, 900);
    }
    function field(o) {
      return h("div", { className: cx("ns-auth-field", o.error && "is-invalid") },
        h("label", { htmlFor: o.id }, o.label),
        h("div", { className: "ns-auth-input" },
          h(Icon, { name: o.icon, size: 18 }),
          h("input", { id: o.id, type: o.type, value: o.value, placeholder: o.placeholder, autoComplete: o.auto, onChange: o.onChange, "aria-invalid": o.error ? true : undefined, "aria-describedby": o.error ? o.id + "-err" : undefined }),
          o.after || null),
        o.error ? h("span", { id: o.id + "-err", className: "ns-auth-error", role: "alert" }, h(Icon, { name: "warning", size: 14 }), o.error) : null);
    }
    return h("div", { className: "ns ns-auth", style: props.style },
      h("section", { className: "ns-auth-art" },
        h("div", { className: "ns-auth-brand" }, h(Logo, { size: 30 })),
        h(LoginIllustration, null),
        h("div", { className: "ns-auth-steps" },
          h("span", { className: "is-on" }, "01"), h("i", null), h("span", null, "03"),
          h("p", null, "La IA detecta · ", h("b", null, "tú verificas"), " · el sistema guarda"))),
      h("svg", { className: "ns-auth-wave", viewBox: "0 0 120 900", preserveAspectRatio: "none", "aria-hidden": true },
        h("path", { d: "M120 0H60C10 90 96 170 54 280 12 390 0 450 44 560c44 110 66 200 16 340h60Z" })),
      h("main", { className: "ns-auth-panel" },
        h("div", { className: "ns-auth-hello" },
          h("div", { className: "ns-auth-mobile-brand" }, h(Logo, { size: 26 })),
          h("h1", null, "¡Hola", h("span", null, "!")),
          h("p", null, "Bienvenido de nuevo a NotaScan.")),
        h("form", { className: "ns-auth-form", onSubmit: submit, noValidate: true },
          h("h2", null, "Iniciar sesión"),
          h("fieldset", { className: "ns-auth-roles" }, h("legend", null, "Entrar como"),
            [["teacher", "Docente"], ["admin", "Secretaría"], ["principal", "Rectoría"]].map(function (x) {
              return h("label", { key: x[0], className: cx("ns-auth-role", role[0] === x[0] && "is-on") }, h("input", { type: "radio", name: "ns-role", value: x[0], checked: role[0] === x[0], onChange: function () { role[1](x[0]); } }), x[1]);
            })),
          field({ id: "auth-email", label: "Correo institucional", icon: "mail", type: "email", placeholder: "nombre@ucc.edu.co", auto: "email", value: email[0], onChange: function (e) { email[1](e.target.value); }, error: emailErr }),
          field({ id: "auth-pass", label: "Contraseña", icon: "lock", type: show[0] ? "text" : "password", placeholder: "••••••••", auto: "current-password", value: pass[0], onChange: function (e) { pass[1](e.target.value); }, error: passErr,
            after: h("button", { type: "button", className: "ns-auth-eye", "aria-label": show[0] ? "Ocultar contraseña" : "Mostrar contraseña", "aria-pressed": show[0], onClick: function () { show[1](!show[0]); } }, h(Icon, { name: "eye", size: 18 })) }),
          h("div", { className: "ns-auth-row" },
            h("label", { className: "ns-auth-check" }, h("input", { type: "checkbox", defaultChecked: true }), "Recordarme"),
            h("a", { href: "#", onClick: function (e) { e.preventDefault(); } }, "¿Olvidaste tu contraseña?")),
          h("button", { type: "submit", className: "ns-auth-submit", "aria-busy": busy[0] || undefined, disabled: busy[0] }, busy[0] ? [h(Dots, { key: "d" }), " Entrando…"] : ["Entrar ", h(Icon, { key: "a", name: "arrow", size: 18 })]),
          h("div", { className: "ns-auth-or" }, h("span", null, "o entra con")),
          h("button", { type: "button", className: "ns-auth-sso", onClick: function () { if (props.onLogin) props.onLogin(role[0]); } }, h(Icon, { name: "students", size: 18 }), "Cuenta institucional"),
          h("a", { className: "ns-auth-mobile-link", href: "#/movil" }, h(Icon, { name: "phone", size: 16 }), "¿Eres estudiante o acudiente? Entra a la app móvil"),
          h("p", { className: "ns-auth-foot" }, "¿Primera vez? ", h("a", { href: "#", onClick: function (e) { e.preventDefault(); } }, "Solicita acceso a tu coordinación")))));
  }

  /* ================= INICIO ================= */
  function DashboardPage(props) {
    function go(id) { if (props.onNavigate) props.onNavigate(id); }
    var active = EVALUATIONS.filter(function (e) { return e.status === "en-revision"; });
    return h(AppShell, { active: "dashboard", onNavigate: props.onNavigate, onLogout: props.onLogout, style: props.style },
      h(Header, {
        eyebrow: "Martes 30 de septiembre · Periodo 3 · 2026", title: "Buenos días, Ana Lucía", highlight: "Ana Lucía",
        description: "Tienes 2 evaluaciones en revisión y 8 notas esperando tu verificación.",
        actions: [h(Button, { key: "n", variant: "secondary", icon: "plus", onClick: function () { go("evaluations"); } }, "Nueva evaluación"),
          h(Button, { key: "c", size: "lg", icon: "grade", onClick: function () { go("grade"); } }, "Calificar")]
      }),
      h("div", { className: "ns-home-bento" },
        h(Block, { tone: "navy", className: "ns-home-hero", label: "Continuar revisión" },
          h("div", { className: "ns-row", style: { justifyContent: "space-between" } },
            h("span", { className: "ns-overline", style: { color: "var(--gold)" } }, "Continúa donde quedaste"),
            h(Sticker, { tone: "gold", rotate: 4 }, "8 pendientes")),
          h("div", null,
            h("h2", { className: "ns-home-hero-title" }, "Parcial 2 · Matemáticas"),
            h("p", { className: "ns-home-hero-meta" }, "7A · 24 estudiantes · subido hace 2 horas")),
          h("div", { className: "ns-home-hero-progress" },
            h("div", { className: "ns-row", style: { justifyContent: "space-between" } }, h("span", null, "18 de 24 verificadas"), h("strong", null, "75%")),
            h(Progress, { value: 18, total: 24, tone: "inverse", label: "Avance de revisión" })),
          h("div", null, h(Button, { iconRight: "arrow", onClick: function () { go("review"); } }, "Continuar revisión"))),
        h(Block, { tone: "gold", className: "ns-home-stat" },
          h("span", { className: "ns-bento-icon", "aria-hidden": true }, h(Icon, { name: "clock", size: 18, strokeWidth: 2.5 })),
          h("span", { className: "ns-bento-value" }, h(CountUp, { value: "8" })), h("span", { className: "ns-bento-label" }, "notas por verificar")),
        h(Block, { tone: "sage", className: "ns-home-stat" },
          h("span", { className: "ns-bento-icon", "aria-hidden": true }, h(Icon, { name: "check", size: 18, strokeWidth: 2.5 })),
          h("span", { className: "ns-bento-value" }, h(CountUp, { value: "112" })), h("span", { className: "ns-bento-label" }, "verificadas este mes")),
        h(Block, { className: "ns-home-stat" },
          h("span", { className: "ns-bento-icon", "aria-hidden": true }, h(Icon, { name: "reports", size: 18, strokeWidth: 2.5 })),
          h("span", { className: "ns-bento-value" }, h(CountUp, { value: "3.9" })), h("span", { className: "ns-bento-label" }, "promedio de Matemáticas 7A"))),
      h("div", { className: "ns-home-cols" },
        h(Block, { label: "Evaluaciones en curso" },
          h(BlockTitle, { action: h(Button, { variant: "ghost", size: "sm", iconRight: "arrow", onClick: function () { go("evaluations"); } }, "Ver todas") }, "Evaluaciones en curso"),
          h("ul", { className: "ns-list" }, active.concat(EVALUATIONS.filter(function (e) { return e.status === "borrador"; }).slice(0, 1)).map(function (e) {
            var st = EVAL_STATUS[e.status];
            return h("li", { key: e.id, className: "ns-list-item" },
              h(Sticker, { tone: KIND[e.kind][1], rotate: 0 }, KIND[e.kind][0]),
              h("div", { className: "ns-list-main" }, h("strong", null, e.name), h("span", { className: "ns-caption" }, e.subject + " · " + e.weight + "% · " + e.date)),
              h("div", { className: "ns-list-progress" }, h(Progress, { value: e.reviewed, total: e.total, label: "Avance de " + e.name }), h("span", { className: "ns-caption" }, e.reviewed + "/" + e.total)),
              h(Badge, { tone: st[1] }, st[0]));
          }))),
        h(Block, { tone: "paper", label: "Requieren tu atención" },
          h(BlockTitle, null, "Requieren tu atención"),
          h("ul", { className: "ns-list" }, STUDENTS.filter(function (s) { return s.status === "needs-review"; }).map(function (s) {
            return h("li", { key: s.id, className: "ns-list-item" },
              h(Avatar, { name: s.name, size: "sm" }),
              h("div", { className: "ns-list-main" }, h("strong", null, s.name), h("span", { className: "ns-caption" }, isNaN(s.avg) ? "Sin detección · " + s.last : "Baja confianza · " + s.last)),
              h(Button, { variant: "secondary", size: "sm", icon: "edit", onClick: function () { go("review"); }, "aria-label": "Revisar nota de " + s.name }, "Revisar"));
          })))));
  }

  /* ================= CALIFICAR (carga + procesamiento) ================= */
  function UploadPage(props) {
    function go(id) { if (props.onNavigate) props.onNavigate(id); }
    var files = useState([
      { name: "parcial2_programacion_05.jpg", status: "success", note: "Valentina Guerrero · 4.2" },
      { name: "parcial2_programacion_06.jpg", status: "success", note: "Santiago Muñoz · sin detección" },
      { name: "parcial2_programacion_07.jpg", status: "processing", note: "Detectando calificación…" },
      { name: "parcial2_programacion_08.jpg", status: "warning", note: "En espera" }
    ]);
    return h(AppShell, { active: "grade", onNavigate: props.onNavigate, onLogout: props.onLogout, style: props.style },
      h(Header, {
        eyebrow: "Paso 1 a 4 · la IA trabaja, tú esperas", title: "Calificar una evaluación", highlight: "evaluación",
        description: "Elige la evaluación, sube las fotografías y NotaScan identificará a cada estudiante por su código QR.",
        actions: [h(Button, { key: "r", size: "lg", iconRight: "arrow", onClick: function () { go("review"); } }, "Ir a revisión")]
      }),
      h(ReviewStepper, { current: 3 }),
      h("div", { className: "ns-upload-grid" },
        h("div", { className: "ns-col", style: { gap: 24 } },
          h(Block, { label: "Evaluación" },
            h(BlockTitle, null, "1 · Evaluación"),
            h("div", { className: "ns-row" },
              h(FilterGroup, { as: "select", label: "Asignatura", options: [{ value: "p", label: "Matemáticas" }, { value: "f", label: "Física" }, { value: "t", label: "Tecnología" }] }),
              h(FilterGroup, { as: "select", label: "Curso", options: [{ value: "5a", label: "7A" }, { value: "5b", label: "7B" }] }),
              h(FilterGroup, { as: "select", label: "Evaluación", options: EVALUATIONS.map(function (e) { return { value: e.id, label: e.name }; }) }))),
          h(Block, { label: "Fotografías" },
            h(BlockTitle, null, "2 · Fotografías"),
            h(UploadZone, { onFiles: function (list) { files[1](files[0].concat(list.map(function (f) { return { name: f.name, status: "warning", note: "En espera" }; }))); } }),
            h("ul", { className: "ns-list", style: { marginTop: 16 } }, files[0].map(function (f, i) {
              return h("li", { key: f.name + i, className: "ns-list-item" },
                h("span", { className: "ns-file-icon", "aria-hidden": true }, h(Icon, { name: "file", size: 18 })),
                h("div", { className: "ns-list-main" }, h("strong", null, f.name), h("span", { className: "ns-caption" }, f.note)),
                h(StatusDot, { status: f.status, label: f.status === "success" ? "Listo" : f.status === "processing" ? "Procesando" : "En cola" }));
            })))),
        h(ProcessingPanel, { index: 7, total: 24 })));
  }

  /* ================= ESTUDIANTES ================= */
  function StudentsPage(props) {
    var q = useState(""), c = useState("all"), st = useState("all");
    var rows = STUDENTS.filter(function (s) {
      var t = q[0].trim().toLowerCase();
      return (!t || s.name.toLowerCase().indexOf(t) >= 0 || s.id.indexOf(t) >= 0) && (c[0] === "all" || s.course === c[0]) && (st[0] === "all" || s.status === st[0]);
    });
    return h(AppShell, { active: "students", onNavigate: props.onNavigate, onLogout: props.onLogout, style: props.style },
      h(Header, {
        eyebrow: "Matemáticas · Periodo 3 · 2026", title: "Estudiantes", highlight: "Estudiantes",
        description: "Consulta el desempeño de cada estudiante y el estado de su última calificación.",
        actions: [h(Button, { key: "d", variant: "secondary", icon: "download" }, "Exportar lista")]
      }),
      h(FiltersBar, {
        search: q[0], onSearch: q[1], count: rows.length + " de " + STUDENTS.length + " estudiantes",
        groups: [
          { label: "Curso", value: c[0], onChange: c[1], options: [{ value: "all", label: "Todos" }, { value: "7A", label: "7A" }, { value: "7B", label: "7B" }] },
          { label: "Estado", as: "select", value: st[0], onChange: st[1], options: [{ value: "all", label: "Todos" }, { value: "verified", label: "Verificada" }, { value: "pending", label: "Pendiente" }, { value: "needs-review", label: "Requiere revisión" }] }]
      }),
      rows.length ? h(DataTable, {
        caption: "Estudiantes de Matemáticas", rows: rows, columns: [
          { key: "name", label: "Estudiante", render: function (r) { return h(UserProfile, { name: r.name, role: "ID " + r.id }); } },
          { key: "course", label: "Curso", render: function (r) { return h(Sticker, { tone: r.course === "7A" ? "gold" : "sage", rotate: 0 }, r.course); } },
          { key: "avg", label: "Promedio", numeric: true, render: function (r) { return h("span", { className: "ns-table-grade" }, formatGrade(r.avg)); } },
          { key: "perf", label: "Desempeño", render: function (r) { return isNaN(r.avg) ? h("span", { className: "ns-caption" }, "Sin datos") : h("div", { style: { minWidth: 120 } }, h(Progress, { value: r.avg - 1, total: 4, tone: r.avg >= 4 ? "sage" : r.avg >= 3 ? "gold" : "burgundy", label: "Desempeño de " + r.name })); } },
          { key: "last", label: "Última evaluación" },
          { key: "status", label: "Estado", render: function (r) { return h(ReviewStatus, { status: r.status }); } }
        ]
      }) : h(EmptyState, { title: "Ningún estudiante coincide.", message: "Prueba con otro nombre, ID o curso.", icon: "students" }));
  }

  /* ================= EVALUACIONES ================= */
  function EvaluationsPage(props) {
    var tab = useState("all");
    var list = EVALUATIONS.filter(function (e) { return tab[0] === "all" || e.kind === tab[0]; });
    var assigned = EVALUATIONS.reduce(function (a, e) { return a + e.weight; }, 0);
    return h(AppShell, { active: "evaluations", onNavigate: props.onNavigate, onLogout: props.onLogout, style: props.style },
      h(Header, {
        eyebrow: "Matemáticas · 7A", title: "Evaluaciones", highlight: "Evaluaciones",
        description: "Exámenes, talleres y actividades del periodo con su porcentaje y estado de revisión.",
        actions: [h(Button, { key: "n", size: "lg", icon: "plus" }, "Nueva evaluación")],
        tabs: [{ value: "all", label: "Todas" }, { value: "examen", label: "Exámenes" }, { value: "taller", label: "Talleres" }, { value: "actividad", label: "Actividades" }],
        tab: tab[0], onTab: tab[1]
      }),
      h(Block, { tone: "gold", className: "ns-weight" },
        h("div", null, h("span", { className: "ns-overline", style: { color: "var(--navy)" } }, "Porcentaje asignado"),
          h("div", { className: "ns-weight-value" }, assigned, h("small", null, "% de 100%"))),
        h("div", { className: "ns-weight-bar", role: "img", "aria-label": "Distribución de porcentajes" }, EVALUATIONS.map(function (e) {
          return h("span", { key: e.id, className: "ns-weight-seg ns-weight-seg--" + e.kind, style: { flex: e.weight }, title: e.name + " " + e.weight + "%" }, e.weight + "%");
        }))),
      h("div", { className: "ns-eval-grid" }, list.map(function (e, i) {
        var st = EVAL_STATUS[e.status];
        return h("article", { key: e.id, className: cx("ns-eval", "ns-eval--" + e.kind) },
          h("div", { className: "ns-eval-head" },
            h(Sticker, { tone: KIND[e.kind][1], rotate: i % 2 ? 3 : -3 }, KIND[e.kind][0]),
            h(Badge, { tone: st[1] }, st[0])),
          h("div", { className: "ns-eval-body" },
            h("div", null, h("h3", { className: "ns-eval-title" }, e.name), h("span", { className: "ns-caption" }, e.subject + " · " + e.date)),
            h("div", { className: "ns-eval-weight" }, e.weight, h("small", null, "%"))),
          h("div", { className: "ns-eval-foot" },
            h("div", { style: { flex: 1, display: "grid", gap: 6 } },
              h("span", { className: "ns-caption" }, e.reviewed + " de " + e.total + " verificadas"),
              h(Progress, { value: e.reviewed, total: e.total, tone: e.status === "cerrada" ? "sage" : "gold", label: "Avance de " + e.name })),
            h(Button, { variant: e.status === "en-revision" ? "primary" : "secondary", size: "sm", iconRight: "arrow", onClick: function () { if (props.onNavigate) props.onNavigate(e.status === "borrador" ? "grade" : "review"); } }, e.status === "en-revision" ? "Revisar" : e.status === "borrador" ? "Calificar" : "Ver")));
      })));
  }

  /* ================= REPORTES ================= */
  function ReportsPage(props) {
    var fmt = useState("pdf"), toast = useState(null);
    function gen(name) { toast[1]({ tone: "success", title: "Reporte listo", message: name + " · " + fmt[0].toUpperCase() }); setTimeout(function () { toast[1](null); }, 3500); }
    var types = [
      { t: "Consolidado por curso", d: "Notas definitivas y promedio ponderado de cada estudiante.", tone: "navy", icon: "reports" },
      { t: "Por estudiante", d: "Historial de calificaciones y observaciones de un estudiante.", tone: "sage", icon: "user" },
      { t: "Por evaluación", d: "Distribución de notas, confianza de IA y correcciones manuales.", tone: "gold", icon: "evaluations" }
    ];
    return h(AppShell, { active: "reports", onNavigate: props.onNavigate, onLogout: props.onLogout, style: props.style,
      overlay: toast[0] ? h("div", { className: "ns-toast-region", style: props.inlineToast ? { position: "absolute" } : undefined }, h(Toast, toast[0])) : null },
      h(Header, {
        eyebrow: "Consultar · exportar · revisar", title: "Reportes", highlight: "Reportes",
        description: "Genera reportes solo con calificaciones verificadas por ti."
      }),
      h("div", { className: "ns-row", style: { justifyContent: "space-between" } },
        h(FilterGroup, { label: "Formato", value: fmt[0], onChange: fmt[1], options: [{ value: "pdf", label: "PDF" }, { value: "xlsx", label: "Excel" }, { value: "csv", label: "CSV" }] }),
        h("div", { className: "ns-row" },
          h(FilterGroup, { as: "select", label: "Curso", options: [{ value: "5a", label: "7A" }, { value: "5b", label: "7B" }] }),
          h(FilterGroup, { as: "select", label: "Periodo", options: [{ value: "2026-2", label: "2026-2" }, { value: "2026-1", label: "2026-1" }] }))),
      h("div", { className: "ns-report-grid" }, types.map(function (r) {
        return h("article", { key: r.t, className: cx("ns-block ns-report", "ns-block--" + r.tone) },
          h("span", { className: "ns-bento-icon", "aria-hidden": true }, h(Icon, { name: r.icon, size: 18, strokeWidth: 2.5 })),
          h("h3", { className: "ns-report-title" }, r.t),
          h("p", { className: "ns-report-text" }, r.d),
          h(Button, { variant: r.tone === "navy" ? "primary" : "secondary", icon: "download", onClick: function () { gen(r.t); } }, "Generar"));
      })),
      h(Block, { label: "Reportes recientes" },
        h(BlockTitle, null, "Recientes"),
        h(DataTable, {
          caption: "Reportes generados recientemente", rows: [
            { id: 1, name: "Consolidado 7A · corte 2", date: "29 sep 2026", f: "PDF", by: "Ana Lucía Rosero" },
            { id: 2, name: "Parcial 1 · Matemáticas", date: "2 sep 2026", f: "Excel", by: "Ana Lucía Rosero" },
            { id: 3, name: "María Fernanda López", date: "30 ago 2026", f: "PDF", by: "Ana Lucía Rosero" }],
          columns: [
            { key: "name", label: "Reporte", render: function (r) { return h("strong", { style: { color: "var(--navy)" } }, r.name); } },
            { key: "date", label: "Fecha" },
            { key: "f", label: "Formato", render: function (r) { return h(Badge, { tone: "neutral", icon: "file" }, r.f); } },
            { key: "by", label: "Generado por" },
            { key: "a", label: "Acción", render: function (r) { return h(Button, { variant: "ghost", size: "sm", icon: "download", "aria-label": "Descargar " + r.name }, "Descargar"); } }]
        })));
  }

  /* ================= DESIGN SYSTEM (página del producto) ================= */
  var DS_COLORS = [["navy", "#1B2A4A", "Estructura"], ["gold", "#B8924B", "Acción y activo"], ["ivory", "#F7F3EC", "Lienzo"], ["charcoal", "#2B2B2B", "Texto secundario"], ["sage", "#6B8F71", "Alta confianza"], ["burgundy", "#7A2E2E", "Revisión"]];
  function DesignSystemPage(props) {
    return h(AppShell, { active: "system", onNavigate: props.onNavigate, onLogout: props.onLogout, style: props.style },
      h(Header, { eyebrow: "Foundations → Átomos → Moléculas → Organismos → Plantillas", title: "Design System", highlight: "System", description: "El laboratorio de NotaScan: cada pieza que ves en la app, funcionando." }),
      h(Block, { label: "Color" }, h(BlockTitle, null, "01 · Color"),
        h("div", { className: "ns-swatches" }, DS_COLORS.map(function (c) {
          return h("div", { key: c[0], className: "ns-swatch" }, h("span", { className: "ns-swatch-chip", style: { background: "var(--" + c[0] + ")" } }), h("strong", null, c[0]), h("span", { className: "ns-caption" }, c[1] + " · " + c[2]));
        }))),
      h(Block, { label: "Tipografía" }, h(BlockTitle, null, "02 · Tipografía"),
        h("div", { className: "ns-type-specimen" },
          h("div", { className: "ns-serif", style: { fontSize: 56, lineHeight: 1, fontWeight: 800 } }, "Aa 4.5"),
          h("div", null, h("strong", null, "Fraunces"), h("p", { className: "ns-caption" }, "Títulos, notas y cifras.")),
          h("div", { style: { fontSize: 56, lineHeight: 1, fontWeight: 800 } }, "Aa 98%"),
          h("div", null, h("strong", null, "Inter"), h("p", { className: "ns-caption" }, "Botones, tablas, navegación y metadata.")))),
      h(Block, { label: "Átomos" }, h(BlockTitle, null, "03 · Átomos"),
        h("div", { className: "ns-row" }, h(Button, { icon: "check" }, "Confirmar"), h(Button, { variant: "secondary", icon: "edit" }, "Editar"), h(Button, { variant: "ghost" }, "Cancelar"), h(Badge, { tone: "high" }, "IA 98%"), h(Badge, { tone: "medium" }, "IA 82%"), h(Badge, { tone: "low" }, "IA 64%"), h(Sticker, { tone: "navy" }, "Nº 03"), h(GradeInput, { defaultValue: "4.5", label: "Nota" }))),
      h(Block, { label: "Organismos" }, h(BlockTitle, null, "04 · Organismos"),
        h("div", { className: "ns-grid", style: { paddingTop: 12 } },
          h(StudentGradeCard, { index: 1, student: { name: "María Fernanda López", id: "20261045", course: "7A" }, detected: 4.5, confidence: 98 }),
          h(StudentGradeCard, { index: 2, student: { name: "Juan Sebastián Martínez", id: "20261051", course: "7A" }, detected: 3.8, confidence: 62 }),
          h(StudentGradeCard, { index: 3, student: { name: "Valentina Guerrero", id: "20261063", course: "7A" }, detected: 4.2, confidence: 94, status: "verified", animate: false }))));
  }

  /* =====================================================================
     EXTENSIÓN · ECOSISTEMA ACADÉMICO
     Infraestructura compartida: formularios, tablas, modales, drawers,
     gráficos, búsqueda global, conectividad, roles y datos simulados.
     ===================================================================== */

  var ShellCtx = React.createContext(null);

  /* ---------- Datos simulados ---------- */
  var FIRST = ["María Fernanda", "Juan Sebastián", "Valentina", "Carlos Andrés", "Laura Camila", "Santiago", "Daniela Alejandra", "Andrés Felipe", "Isabella", "Sebastián", "Sara Lucía", "Mateo", "Gabriela", "Nicolás", "Mariana", "Samuel", "Luciana", "Tomás", "Antonella", "Emiliano", "Valeria", "Juan José", "Salomé", "David Esteban"];
  var LAST = ["López", "Martínez", "Guerrero", "Rodríguez", "Benavides", "Muñoz", "Pantoja", "Erazo", "Chamorro", "Delgado", "Ortiz", "Burbano", "Rosero", "Villota", "Cabrera", "Ordóñez", "Insuasty", "Bravo", "Narváez", "Enríquez", "Paz", "Zambrano", "Riascos", "Mora"];
  var COURSES = ["6A", "6B", "7A", "7B", "8A", "8B"];
  var GRADE_NAME = { "6": "Sexto", "7": "Séptimo", "8": "Octavo", "9": "Noveno", "10": "Décimo", "11": "Undécimo" };
  var SUBJECTS = [
    { id: "mat", name: "Matemáticas", code: "MAT-01", category: "Ciencias exactas" },
    { id: "fis", name: "Física", code: "FIS-02", category: "Ciencias exactas" },
    { id: "len", name: "Lengua Castellana", code: "LEN-03", category: "Humanidades" },
    { id: "ing", name: "Inglés", code: "ING-04", category: "Humanidades" },
    { id: "cna", name: "Ciencias Naturales", code: "CNA-05", category: "Ciencias naturales" },
    { id: "tec", name: "Tecnología", code: "TEC-06", category: "Tecnología e informática" }
  ];
  var TEACHERS = [
    { id: "t1", name: "Ana Lucía Rosero", subjects: ["Matemáticas"], courses: ["6A", "7A", "7B"], pending: 0, pct: 100, last: "Hoy, 08:42", status: "ok" },
    { id: "t2", name: "Carlos Pérez", subjects: ["Física"], courses: ["7A", "8A", "8B"], pending: 2, pct: 82, last: "Ayer, 17:10", status: "warn" },
    { id: "t3", name: "Laura Benavides", subjects: ["Lengua Castellana"], courses: ["6A", "6B"], pending: 0, pct: 100, last: "Hoy, 07:55", status: "ok" },
    { id: "t4", name: "Jorge Insuasty", subjects: ["Inglés"], courses: ["6B", "7B", "8B"], pending: 5, pct: 48, last: "Hace 9 días", status: "late" },
    { id: "t5", name: "Diana Cabrera", subjects: ["Ciencias Naturales"], courses: ["6A", "6B", "7A"], pending: 1, pct: 91, last: "Hoy, 09:20", status: "warn" },
    { id: "t6", name: "Mauricio Ordóñez", subjects: ["Tecnología"], courses: ["8A", "8B"], pending: 0, pct: 100, last: "Ayer, 15:02", status: "ok" }
  ];
  function seeded(i) { var x = Math.sin(i * 9301 + 49297) * 233280; return x - Math.floor(x); }
  var ALL_STUDENTS = (function () {
    var out = [], n = 0;
    COURSES.forEach(function (c, ci) {
      for (var k = 0; k < 12; k++) {
        var f = FIRST[(k * 2 + ci * 4) % FIRST.length], l1 = LAST[(k * 5 + ci * 7) % LAST.length], l2 = LAST[(k * 11 + ci * 3 + 13) % LAST.length];
        if (l2 === l1) l2 = LAST[(k * 11 + ci * 3 + 14) % LAST.length];
        if (ci === 2 && k === 0) { f = "María Fernanda"; l1 = "López"; l2 = "Rosero"; }
        if (ci === 2 && k === 1) { f = "Juan Sebastián"; l1 = "Martínez"; l2 = "Paz"; }
        var r = seeded(++n);
        var r2 = seeded(n * 31 + 7), r3 = seeded(n * 17 + 3);
        var avg = Math.round((2.7 + r * 2.2) * 10) / 10;
        var status = n % 23 === 0 ? "retired" : n % 17 === 0 ? "archived" : n % 11 === 0 ? "pending" : "active";
        out.push({
          id: String(20261000 + n * 7), name: f + " " + l1 + " " + l2, first: f, last: l1 + " " + l2,
          document: "TI " + (1084000000 + Math.round(r * 899999)), docType: "Tarjeta de identidad",
          grade: c.charAt(0), course: c, guardian: (k % 2 ? "Gloria " : "Jorge ") + l1, guardianRel: k % 2 ? "Madre" : "Padre",
          guardianPhone: "31" + (2000000 + Math.round(r * 7999999)), status: status,
          enrolled: (1 + (n % 27)) + " ene 2026", avg: avg, attendance: Math.round(86 + r * 14), subjectsPassed: avg >= 3 ? 6 : Math.max(2, Math.round(r * 6)),
          library: r2 > .05, fees: r3 > .09, documents: seeded(n * 5 + 1) > .06
        });
      }
    });
    return out;
  })();
  function findStudent(id) { for (var i = 0; i < ALL_STUDENTS.length; i++) if (ALL_STUDENTS[i].id === id) return ALL_STUDENTS[i]; return ALL_STUDENTS[24]; }
  var ENROLL_STATUS = { active: ["Activo", "verified", "check"], pending: ["Pendiente", "pending", "clock"], retired: ["Retirado", "review", "userx"], archived: ["Archivado", "neutral", "archive"] };
  function EnrollBadge(props) { var s = ENROLL_STATUS[props.status] || ENROLL_STATUS.active; return h(Badge, { tone: s[1], icon: s[2] }, s[0]); }

  /* ---------- Roles ---------- */
  var ROLES = {
    admin: { label: "Administración", user: { name: "Patricia Ortega", role: "Secretaría académica" }, courseLabel: "Año lectivo", course: "2026 · Calendario A", density: "dense",
      nav: [["dashboard", "Dashboard", "dashboard"], ["students", "Estudiantes", "students"], ["enrollment", "Matrículas", "file"], ["users", "Usuarios", "user"], ["structure", "Estructura académica", "layers"], ["curriculum", "Mallas curriculares", "link"], ["periods", "Periodos", "calendar"], ["reportcards", "Boletines", "book"], ["clearances", "Paz y Salvos", "shield"], ["ranking", "Ranking académico", "trophy"]] },
    principal: { label: "Rectoría", user: { name: "Hernando Villota", role: "Rector" }, courseLabel: "Institución", course: "Colegio Los Andes", density: "balanced",
      nav: [["dashboard", "Dashboard", "dashboard"], ["analytics", "Analítica", "reports"], ["teachers", "Seguimiento docente", "students"], ["requests", "Solicitudes", "inbox"], ["students", "Estudiantes", "user"], ["observer", "Observador", "eye"], ["reports", "Reportes", "file"]] },
    teacher: { label: "Docente", user: { name: "Ana Lucía Rosero", role: "Docente · Matemáticas" }, courseLabel: "Periodo 3 · 2026", course: "Matemáticas · 7A", density: "dense",
      nav: [["dashboard", "Dashboard", "dashboard"], ["grades", "Calificaciones", "grade"], ["gradebook", "Planilla", "evaluations"], ["concepts", "Conceptos", "ai"], ["recoveries", "Recuperaciones", "refresh"], ["attendance", "Asistencia", "calendar"], ["behavior", "Comportamiento", "heart"], ["students", "Estudiantes", "students"], ["reports", "Reportes", "reports"]] },
    student: { label: "Estudiante", user: { name: "María Fernanda López", role: "7A" } },
    parent: { label: "Acudiente", user: { name: "Gloria López", role: "Acudiente de María Fernanda" } }
  };
  function roleNav(role, counts) {
    return ROLES[role].nav.map(function (n, i) { return { id: n[0], label: n[1], icon: n[2], count: counts && counts[n[0]] }; });
  }

  /* ---------- Átomos de formulario ---------- */
  function Switch(props) {
    var id = useId("sw");
    var on = !!props.checked;
    return h("div", { className: cx("ns-switch-wrap", props.className) },
      h("button", { id: id, type: "button", role: "switch", "aria-checked": on, "aria-label": props.ariaLabel || props.label, disabled: props.disabled, className: cx("ns-switch", on && "is-on"), onClick: function () { if (props.onChange) props.onChange(!on); } },
        h("span", { className: "ns-switch-knob", "aria-hidden": true }, h(Icon, { name: on ? "check" : "close", size: 12, strokeWidth: 3 }))),
      props.label && !props.hideLabel ? h("label", { htmlFor: id, className: "ns-switch-label" }, props.label) : null,
      props.onText ? h("span", { className: cx("ns-switch-state", on ? "is-on" : "is-off") }, on ? props.onText : props.offText) : null);
  }
  function Checkbox(props) {
    var ref = useRef(null);
    useEffect(function () { if (ref.current) ref.current.indeterminate = !!props.indeterminate; }, [props.indeterminate]);
    return h("label", { className: cx("ns-checkbox", props.hideLabel && "ns-checkbox--bare", props.className) },
      h("input", { ref: ref, type: "checkbox", checked: !!props.checked, disabled: props.disabled, onChange: function (e) { if (props.onChange) props.onChange(e.target.checked); }, "aria-label": props.hideLabel ? props.label : undefined }),
      h("span", { className: "ns-checkbox-box", "aria-hidden": true }, h(Icon, { name: props.indeterminate ? "minus" : "check", size: 14, strokeWidth: 3 })),
      props.hideLabel ? null : h("span", null, props.label));
  }
  function FieldShell(props) {
    return h("div", { className: cx("ns-field", props.className) },
      h("label", { htmlFor: props.id, className: "ns-field-label" }, props.label, props.required ? h("span", { className: "ns-req", "aria-hidden": true }, " *") : null),
      props.children,
      props.error ? h("span", { className: "ns-field-error", role: "alert", id: props.id + "-msg" }, h(Icon, { name: "error", size: 16 }), props.error)
        : props.success ? h("span", { className: "ns-field-success", id: props.id + "-msg" }, h(Icon, { name: "check", size: 16 }), props.success)
          : props.hint ? h("span", { className: "ns-field-hint", id: props.id + "-msg" }, props.hint) : null);
  }
  function Select(props) {
    var autoId = useId("sel"), id = props.id || autoId;
    return h(FieldShell, { id: id, label: props.label, required: props.required, hint: props.hint, error: props.error, className: props.className },
      h("select", { id: id, className: cx("ns-input ns-select-input", props.error && "is-invalid"), value: props.value, defaultValue: props.defaultValue, disabled: props.disabled, required: props.required, "aria-invalid": props.error ? true : undefined, "aria-describedby": id + "-msg", onChange: function (e) { if (props.onChange) props.onChange(e.target.value); } },
        props.placeholder ? h("option", { value: "" }, props.placeholder) : null,
        props.options.map(function (o) { var v = typeof o === "string" ? o : o.value; return h("option", { key: v, value: v }, typeof o === "string" ? o : o.label); })));
  }
  function Textarea(props) {
    var autoId = useId("ta"), id = props.id || autoId;
    return h(FieldShell, { id: id, label: props.label, required: props.required, hint: props.hint, error: props.error, className: props.className },
      h("textarea", { id: id, className: "ns-input ns-textarea", rows: props.rows || 3, value: props.value, defaultValue: props.defaultValue, placeholder: props.placeholder, readOnly: props.readOnly, disabled: props.disabled, "aria-describedby": id + "-msg", onChange: function (e) { if (props.onChange) props.onChange(e.target.value); } }));
  }
  function ProgressBar(props) {
    var pct = props.total ? Math.round(props.value / props.total * 100) : 0;
    return h("div", { className: "ns-pbar" },
      props.label || props.showValue ? h("div", { className: "ns-pbar-head" }, h("span", null, props.label), props.showValue ? h("strong", null, props.valueText || pct + "%") : null) : null,
      h(Progress, { value: props.value, total: props.total, tone: props.tone, label: props.label || "Progreso" }));
  }
  function IconAction(props) {
    return h("button", { type: "button", className: cx("ns-iconbtn", props.tone && "ns-iconbtn--" + props.tone), "aria-label": props.label, "data-tip": props.label, disabled: props.disabled, onClick: props.onClick },
      h(Icon, { name: props.icon, size: 16 }));
  }
  function SegmentedTabs(props) {
    function key(e, i) {
      var n = props.tabs.length, j = e.key === "ArrowRight" ? (i + 1) % n : e.key === "ArrowLeft" ? (i - 1 + n) % n : -1;
      if (j < 0) return; e.preventDefault(); props.onChange(props.tabs[j].value);
      var btns = e.currentTarget.parentNode.querySelectorAll("[role=tab]"); if (btns[j]) btns[j].focus();
    }
    return h("div", { className: cx("ns-seg", props.className), role: "tablist", "aria-label": props.label },
      props.tabs.map(function (t, i) {
        var on = props.value === t.value;
        return h("button", { key: t.value, type: "button", role: "tab", "aria-selected": on, tabIndex: on ? 0 : -1, className: "ns-seg-tab", onClick: function () { props.onChange(t.value); }, onKeyDown: function (e) { key(e, i); } },
          t.icon ? h(Icon, { name: t.icon, size: 16 }) : null, t.label, t.count !== undefined ? h("span", { className: "ns-chip-count" }, t.count) : null);
      }));
  }

  /* ---------- Modal y Drawer ---------- */
  function useDialogFocus(open, ref, onClose) {
    useEffect(function () {
      if (!open) return;
      var prev = document.activeElement, node = ref.current;
      var first = node && (node.querySelector("[data-autofocus]") || node.querySelector("input,select,textarea,button"));
      if (first) first.focus();
      function onKey(e) {
        if (e.key === "Escape" && onClose) onClose();
        if (e.key === "Tab" && node) {
          var f = node.querySelectorAll("button:not([disabled]),input,select,textarea,a[href]");
          if (!f.length) return;
          var a = f[0], b = f[f.length - 1];
          if (e.shiftKey && document.activeElement === a) { e.preventDefault(); b.focus(); }
          else if (!e.shiftKey && document.activeElement === b) { e.preventDefault(); a.focus(); }
        }
      }
      document.addEventListener("keydown", onKey);
      return function () { document.removeEventListener("keydown", onKey); if (prev && prev.focus) prev.focus(); };
    }, [open]);
  }
  function Modal(props) {
    var ref = useRef(null), tid = useId("mdl");
    useDialogFocus(props.open, ref, props.onClose);
    if (!props.open) return null;
    return h("div", { className: cx("ns-scrim", props.inline && "ns-scrim--inline"), onMouseDown: function (e) { if (e.target === e.currentTarget && props.onClose) props.onClose(); } },
      h("div", { ref: ref, className: cx("ns-dialog ns-modal", props.size && "ns-modal--" + props.size), role: props.alert ? "alertdialog" : "dialog", "aria-modal": true, "aria-labelledby": tid },
        props.icon ? h("span", { className: cx("ns-dialog-seal", props.tone && "ns-dialog-seal--" + props.tone), "aria-hidden": true }, h(Icon, { name: props.icon, size: 20 })) : null,
        h("h2", { id: tid, className: "ns-dialog-title" }, props.title),
        props.description ? h("p", { className: "ns-dialog-text" }, props.description) : null,
        props.children,
        props.actions ? h("div", { className: "ns-dialog-actions" }, props.actions) : null));
  }
  function Drawer(props) {
    var ref = useRef(null), tid = useId("drw");
    useDialogFocus(props.open, ref, props.onClose);
    if (!props.open) return null;
    return h("div", { className: cx("ns-scrim ns-scrim--drawer", props.inline && "ns-scrim--inline"), onMouseDown: function (e) { if (e.target === e.currentTarget && props.onClose) props.onClose(); } },
      h("aside", { ref: ref, className: "ns-drawer", role: "dialog", "aria-modal": true, "aria-labelledby": tid },
        h("header", { className: "ns-drawer-head" },
          h("div", null, props.eyebrow ? h("span", { className: "ns-overline" }, props.eyebrow) : null, h("h2", { id: tid }, props.title)),
          h(IconAction, { icon: "close", label: "Cerrar panel", onClick: props.onClose })),
        h("div", { className: "ns-drawer-body" }, props.children),
        props.footer ? h("footer", { className: "ns-drawer-foot" }, props.footer) : null));
  }

  /* ---------- PasswordResetDialog ---------- */
  function PasswordResetDialog(props) {
    var st = useState("ask");
    useEffect(function () { if (props.open) st[1]("ask"); }, [props.open]);
    var u = props.user || { name: "" };
    function go() { st[1]("busy"); setTimeout(function () { st[1]("done"); }, 900); }
    return h(Modal, {
      open: props.open, inline: props.inline, onClose: props.onClose, alert: true, icon: st[0] === "done" ? "check" : "key", tone: st[0] === "done" ? "sage" : undefined,
      title: st[0] === "done" ? "Solicitud enviada" : "Restablecer contraseña",
      description: st[0] === "done" ? "La solicitud de restablecimiento fue realizada correctamente." : "¿Deseas generar un nuevo acceso para este usuario?",
      actions: st[0] === "done" ? [h(Button, { key: "c", onClick: props.onClose, "data-autofocus": true }, "Entendido")]
        : [h(Button, { key: "x", variant: "secondary", onClick: props.onClose, "data-autofocus": true }, "Cancelar"), h(Button, { key: "ok", icon: "key", loading: st[0] === "busy", loadingText: "Generando…", onClick: go }, "Restablecer contraseña")]
    }, h("div", { className: "ns-mini-profile" }, h(Avatar, { name: u.name, size: "sm" }), h("div", null, h("strong", null, u.name), h("span", { className: "ns-caption" }, u.email))),
      st[0] === "done" ? h("p", { className: "ns-caption" }, "Se envió un enlace de un solo uso a " + (u.email || "su correo") + ". NotaScan nunca muestra contraseñas.") : h("p", { className: "ns-caption" }, h(Icon, { name: "lock", size: 14 }), " La contraseña actual no se muestra ni se recupera: se genera un acceso nuevo."));
  }

  /* ---------- DataGrid: la infraestructura de tablas ---------- */
  function DataGrid(props) {
    var sortSt = useState(props.initialSort || null), sort = sortSt[0];
    var pageSt = useState(0), page = pageSt[0];
    var selSt = useState({}), sel = selSt[0];
    var denSt = useState(props.density || "comfortable"), density = denSt[0];
    var size = props.pageSize || 10;
    var rk = props.rowKey || function (r) { return r.id; };
    var rows = props.rows || [];
    useEffect(function () { pageSt[1](0); }, [rows.length, props.resetKey]);
    var sorted = useMemo(function () {
      if (!sort) return rows;
      var col = props.columns.filter(function (c) { return c.key === sort.key; })[0];
      var get = col && col.sortValue ? col.sortValue : function (r) { return r[sort.key]; };
      return rows.slice().sort(function (a, b) {
        var x = get(a), y = get(b);
        if (typeof x === "number" && typeof y === "number") { x = isNaN(x) ? -1e9 : x; y = isNaN(y) ? -1e9 : y; return (x - y) * (sort.dir === "asc" ? 1 : -1); }
        return String(x).localeCompare(String(y), "es") * (sort.dir === "asc" ? 1 : -1);
      });
    }, [rows, sort]);
    var pages = Math.max(1, Math.ceil(sorted.length / size));
    var p = Math.min(page, pages - 1);
    var view = props.paginate === false ? sorted : sorted.slice(p * size, p * size + size);
    var selected = rows.filter(function (r) { return sel[rk(r)]; });
    var allOnPage = view.length > 0 && view.every(function (r) { return sel[rk(r)]; });
    var someOnPage = view.some(function (r) { return sel[rk(r)]; });
    function toggleAll(v) { var n = Object.assign({}, sel); view.forEach(function (r) { if (v) n[rk(r)] = true; else delete n[rk(r)]; }); selSt[1](n); }
    function toggle(r, v) { var n = Object.assign({}, sel); if (v) n[rk(r)] = true; else delete n[rk(r)]; selSt[1](n); }
    function clickSort(c) {
      if (!c.sortable) return;
      sortSt[1](!sort || sort.key !== c.key ? { key: c.key, dir: c.numeric ? "desc" : "asc" } : { key: c.key, dir: sort.dir === "asc" ? "desc" : "asc" });
    }
    var cols = props.columns.length + (props.selectable ? 1 : 0) + (props.rowActions ? 1 : 0);
    var body;
    if (props.loading) body = [0, 1, 2, 3, 4].map(function (i) { return h("tr", { key: i, "aria-hidden": true }, Array.apply(null, Array(cols)).map(function (_, j) { return h("td", { key: j }, h("span", { className: "ns-skel", style: { display: "block", height: 14, width: j === 0 ? "70%" : "50%" } })); })); });
    else if (props.error) body = h("tr", null, h("td", { colSpan: cols, className: "ns-grid-state" }, h(EmptyState, { tone: "error", title: props.error, message: "Revisa tu conexión e inténtalo de nuevo.", action: props.onRetry ? h(Button, { variant: "secondary", icon: "refresh", onClick: props.onRetry }, "Reintentar") : null })));
    else if (!view.length) body = h("tr", null, h("td", { colSpan: cols, className: "ns-grid-state" }, h(EmptyState, { icon: props.emptyIcon || "search", title: props.emptyTitle || "No hay resultados para esta búsqueda.", message: props.emptyMessage, action: props.emptyAction })));
    else body = view.map(function (r) {
      var key = rk(r), on = !!sel[key];
      return h("tr", { key: key, className: cx(on && "is-selected", props.rowClass && props.rowClass(r)) },
        props.selectable ? h("td", { className: "ns-grid-check" }, h(Checkbox, { hideLabel: true, label: "Seleccionar " + (r.name || key), checked: on, onChange: function (v) { toggle(r, v); } })) : null,
        props.columns.map(function (c) { return h(c.header ? "th" : "td", { key: c.key, scope: c.header ? "row" : undefined, className: cx(c.numeric && "is-num", c.className) }, c.render ? c.render(r) : r[c.key]); }),
        props.rowActions ? h("td", { className: "ns-grid-actions" }, h("div", null, props.rowActions(r))) : null);
    });
    return h("div", { className: cx("ns-grid-wrap", "ns-grid--" + density, props.className) },
      props.toolbar || props.densityToggle ? h("div", { className: "ns-grid-toolbar" }, h("div", { className: "ns-grid-toolbar-main" }, props.toolbar),
        props.densityToggle ? h(SegmentedTabs, { label: "Densidad de la tabla", value: density, onChange: denSt[1], tabs: [{ value: "comfortable", label: "Cómoda" }, { value: "compact", label: "Compacta" }] }) : null) : null,
      props.selectable && selected.length ? h("div", { className: "ns-bulkbar", role: "region", "aria-label": "Acciones en lote" },
        h("strong", null, selected.length + (selected.length === 1 ? " seleccionado" : " seleccionados")),
        h("div", { className: "ns-bulkbar-actions" }, props.bulkActions ? props.bulkActions(selected, function () { selSt[1]({}); }) : null),
        h(Button, { variant: "ghost", size: "sm", onClick: function () { selSt[1]({}); } }, "Limpiar selección")) : null,
      h("div", { className: "ns-table-wrap ns-grid-table", role: "region", "aria-label": props.caption, tabIndex: 0 },
        h("table", { className: "ns-table" },
          h("caption", { className: "ns-sr" }, props.caption),
          h("thead", null, h("tr", null,
            props.selectable ? h("th", { className: "ns-grid-check", scope: "col" }, h(Checkbox, { hideLabel: true, label: "Seleccionar todos en esta página", checked: allOnPage, indeterminate: someOnPage && !allOnPage, onChange: toggleAll })) : null,
            props.columns.map(function (c) {
              var active = sort && sort.key === c.key;
              return h("th", { key: c.key, scope: "col", className: cx(c.numeric && "is-num"), style: c.width ? { width: c.width } : undefined, "aria-sort": active ? (sort.dir === "asc" ? "ascending" : "descending") : c.sortable ? "none" : undefined },
                c.sortable ? h("button", { type: "button", className: cx("ns-sort", active && "is-active"), onClick: function () { clickSort(c); } }, c.label, h(Icon, { name: active ? (sort.dir === "asc" ? "sortup" : "sortdown") : "sort", size: 14 })) : c.label);
            }),
            props.rowActions ? h("th", { scope: "col", className: "is-num" }, "Acciones") : null)),
          h("tbody", null, body))),
      props.paginate === false || props.loading || props.error || !sorted.length ? null : h("nav", { className: "ns-pager", "aria-label": "Paginación" },
        h("span", { className: "ns-caption" }, "Mostrando " + (p * size + 1) + "–" + Math.min(sorted.length, p * size + size) + " de " + sorted.length),
        h("div", { className: "ns-pager-btns" },
          h(IconAction, { icon: "chevleft", label: "Página anterior", disabled: p === 0, onClick: function () { pageSt[1](p - 1); } }),
          Array.apply(null, Array(pages)).map(function (_, i) { return h("button", { key: i, type: "button", className: cx("ns-pager-num", i === p && "is-on"), "aria-current": i === p ? "page" : undefined, "aria-label": "Página " + (i + 1), onClick: function () { pageSt[1](i); } }, i + 1); }),
          h(IconAction, { icon: "chevright", label: "Página siguiente", disabled: p >= pages - 1, onClick: function () { pageSt[1](p + 1); } }))));
  }

  /* ---------- Gráficos (SVG accesible) ----------
     Paleta: navy (serie principal) + gold (comparación / meta). Validada:
     separación ΔE 39 entre ambas; gold lleva borde navy y etiqueta directa. */
  function ChartTable(props) {
    return h("table", { className: "ns-sr" }, h("caption", null, props.caption),
      h("thead", null, h("tr", null, props.head.map(function (x) { return h("th", { key: x, scope: "col" }, x); }))),
      h("tbody", null, props.rows.map(function (r, i) { return h("tr", { key: i }, r.map(function (c, j) { return h(j ? "td" : "th", { key: j, scope: j ? undefined : "row" }, c); })); })));
  }
  function ChartFrame(props) {
    return h("figure", { className: cx("ns-chart", props.className) },
      h("figcaption", { className: "ns-chart-head" }, h("strong", null, props.title), props.subtitle ? h("span", { className: "ns-caption" }, props.subtitle) : null),
      props.legend ? h("div", { className: "ns-chart-legend" }, props.legend.map(function (l) { return h("span", { key: l.label }, h("i", { className: "ns-swatch-dot ns-swatch-dot--" + l.tone }), l.label); })) : null,
      props.children);
  }
  function BarChart(props) {
    var tip = useState(null);
    var data = props.data, W = props.width || 560, H = props.height || 240, pad = { l: 36, r: 12, t: 28, b: 34 };
    var max = props.max || Math.max.apply(null, data.map(function (d) { return d.value; })) * 1.15;
    var bw = (W - pad.l - pad.r) / data.length, fmt = props.format || function (v) { return v; };
    var y = function (v) { return pad.t + (H - pad.t - pad.b) * (1 - v / max); };
    var ticks = props.ticks || [0, max / 2, max];
    return h(ChartFrame, { title: props.title, subtitle: props.subtitle, legend: props.target !== undefined ? [{ label: props.seriesLabel || "Valor", tone: "navy" }, { label: (props.targetLabel || "Meta") + " " + fmt(props.target), tone: "gold" }] : null },
      h("div", { className: "ns-chart-body" },
        h("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": props.title + ". " + data.map(function (d) { return d.label + ": " + fmt(d.value); }).join(", ") },
          ticks.map(function (t) { return h("g", { key: t }, h("line", { className: "ns-grid-line", x1: pad.l, x2: W - pad.r, y1: y(t), y2: y(t) }), h("text", { className: "ns-axis", x: pad.l - 8, y: y(t) + 4, textAnchor: "end" }, fmt(Math.round(t * 10) / 10))); }),
          props.target !== undefined ? h("g", null, h("line", { className: "ns-target-line", x1: pad.l, x2: W - pad.r, y1: y(props.target), y2: y(props.target) }), null) : null,
          data.map(function (d, i) {
            var x = pad.l + i * bw + bw * .2, w = bw * .6, yy = y(d.value), hh = H - pad.b - yy, low = props.lowBelow !== undefined && d.value < props.lowBelow;
            return h("g", { key: d.label, className: "ns-bar-g", onMouseEnter: function () { tip[1](i); }, onMouseLeave: function () { tip[1](null); } },
              h("rect", { className: "ns-bar-hit", x: pad.l + i * bw, y: pad.t, width: bw, height: H - pad.t - pad.b }),
              h("path", { className: cx("ns-bar", low && "ns-bar--low"), style: { "--i": i }, d: "M" + x + " " + (H - pad.b) + "V" + (yy + 4) + "q0-4 4-4h" + (w - 8) + "q4 0 4 4V" + (H - pad.b) + "Z" }),
              h("text", { className: "ns-bar-val", x: x + w / 2, y: yy - 7, textAnchor: "middle" }, fmt(d.value)),
              h("text", { className: "ns-axis", x: x + w / 2, y: H - pad.b + 18, textAnchor: "middle" }, d.label));
          }),
          h("line", { className: "ns-base-line", x1: pad.l, x2: W - pad.r, y1: H - pad.b, y2: H - pad.b })),
        tip[0] !== null ? h("div", { className: "ns-chart-tip", style: { left: ((pad.l + tip[0] * bw + bw / 2) / W * 100) + "%" } }, h("strong", null, data[tip[0]].label), " · " + fmt(data[tip[0]].value) + (data[tip[0]].note ? " · " + data[tip[0]].note : "")) : null),
      h(ChartTable, { caption: props.title, head: ["Categoría", "Valor"], rows: data.map(function (d) { return [d.label, fmt(d.value)]; }) }));
  }
  function LineChart(props) {
    var tip = useState(null);
    var W = props.width || 560, H = props.height || 240, pad = { l: 36, r: props.width && props.width < 400 ? 40 : 64, t: 20, b: 34 };
    var labels = props.labels, series = props.series, fmt = props.format || function (v) { return v; };
    var min = props.min !== undefined ? props.min : 0, max = props.max || 5;
    var x = function (i) { return pad.l + (W - pad.l - pad.r) * (labels.length === 1 ? .5 : i / (labels.length - 1)); };
    var y = function (v) { return pad.t + (H - pad.t - pad.b) * (1 - (v - min) / (max - min)); };
    var ticks = props.ticks || [min, (min + max) / 2, max];
    return h(ChartFrame, { title: props.title, subtitle: props.subtitle, legend: series.length > 1 ? series.map(function (s) { return { label: s.name, tone: s.tone || "navy" }; }) : null },
      h("div", { className: "ns-chart-body", onMouseLeave: function () { tip[1](null); } },
        h("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": props.title + ". " + series.map(function (s) { return s.name + ": " + s.points.map(function (v, i) { return labels[i] + " " + fmt(v); }).join(", "); }).join(". ") },
          ticks.map(function (t) { return h("g", { key: t }, h("line", { className: "ns-grid-line", x1: pad.l, x2: W - pad.r, y1: y(t), y2: y(t) }), h("text", { className: "ns-axis", x: pad.l - 8, y: y(t) + 4, textAnchor: "end" }, fmt(t))); }),
          props.threshold !== undefined ? h("g", null, h("line", { className: "ns-target-line", x1: pad.l, x2: W - pad.r, y1: y(props.threshold), y2: y(props.threshold) }), h("text", { className: "ns-axis ns-axis--gold", x: pad.l + 4, y: y(props.threshold) - 6 }, props.thresholdLabel || "Mínimo " + fmt(props.threshold))) : null,
          tip[0] !== null ? h("line", { className: "ns-crosshair", x1: x(tip[0]), x2: x(tip[0]), y1: pad.t, y2: H - pad.b }) : null,
          series.map(function (s) {
            var d = s.points.map(function (v, i) { return (i ? "L" : "M") + x(i) + " " + y(v); }).join("");
            var last = s.points.length - 1;
            return h("g", { key: s.name, className: "ns-line-g ns-line-g--" + (s.tone || "navy") },
              h("path", { className: cx("ns-line", s.dashed && "is-dashed"), pathLength: s.dashed ? undefined : 1, d: d }),
              s.points.map(function (v, i) { return h("circle", { key: i, className: "ns-dot-mark", cx: x(i), cy: y(v), r: tip[0] === i ? 6 : 4.5 }); }),
              h("text", { className: "ns-line-label", x: x(last) + 10, y: y(s.points[last]) + 4 }, fmt(s.points[last])));
          }),
          labels.map(function (l, i) { return h("g", { key: l }, h("text", { className: "ns-axis", x: x(i), y: H - pad.b + 18, textAnchor: "middle" }, l), h("rect", { className: "ns-bar-hit", x: x(i) - (W - pad.l - pad.r) / labels.length / 2, y: pad.t, width: (W - pad.l - pad.r) / labels.length, height: H - pad.t - pad.b, onMouseEnter: function () { tip[1](i); } })); })),
        tip[0] !== null ? h("div", { className: "ns-chart-tip", style: { left: (x(tip[0]) / W * 100) + "%" } }, h("strong", null, labels[tip[0]]), series.map(function (s) { return h("span", { key: s.name }, " · " + (series.length > 1 ? s.name + " " : "") + fmt(s.points[tip[0]])); })) : null),
      h(ChartTable, { caption: props.title, head: ["Serie"].concat(labels), rows: series.map(function (s) { return [s.name].concat(s.points.map(fmt)); }) }));
  }
  function DonutChart(props) {
    var total = props.data.reduce(function (a, d) { return a + d.value; }, 0), acc = 0, R = 70, C = 2 * Math.PI * R;
    return h(ChartFrame, { title: props.title, subtitle: props.subtitle, legend: props.data.map(function (d) { return { label: d.label + " · " + Math.round(d.value / total * 100) + "%", tone: d.tone }; }) },
      h("div", { className: "ns-donut" },
        h("svg", { viewBox: "0 0 200 200", role: "img", "aria-label": props.title + ". " + props.data.map(function (d) { return d.label + " " + Math.round(d.value / total * 100) + "%"; }).join(", ") },
          props.data.map(function (d) {
            var len = d.value / total * C, gap = props.data.length > 1 ? 3 : 0;
            var el = h("circle", { key: d.label, className: "ns-donut-seg ns-donut-seg--" + d.tone, cx: 100, cy: 100, r: R, strokeDasharray: Math.max(0, len - gap) + " " + (C - len + gap), strokeDashoffset: -acc, transform: "rotate(-90 100 100)" });
            acc += len; return el;
          }),
          h("text", { className: "ns-donut-value", x: 100, y: 104, textAnchor: "middle" }, props.centerValue),
          h("text", { className: "ns-donut-label", x: 100, y: 126, textAnchor: "middle" }, props.centerLabel))),
      h(ChartTable, { caption: props.title, head: ["Categoría", "Cantidad"], rows: props.data.map(function (d) { return [d.label, d.value]; }) }));
  }

  /* ---------- ConnectivityStatus ---------- */
  var SYNC = { online: ["Conectado", "success", "wifi"], syncing: ["Sincronizando", "processing", "refresh"], offline: ["Modo offline", "warning", "wifioff"], error: ["Error de sincronización", "error", "warning"] };
  function ConnectivityStatus(props) {
    var open = useState(!!props.defaultOpen);
    var s = SYNC[props.status] || SYNC.online;
    return h("div", { className: "ns-conn" },
      h("button", { type: "button", className: cx("ns-conn-pill", "ns-conn-pill--" + props.status), "aria-expanded": open[0], onClick: function () { open[1](!open[0]); } },
        h(StatusDot, { status: s[1], hideLabel: true, label: s[0] }), h("span", null, s[0]), props.pending ? h("span", { className: "ns-chip-count" }, props.pending) : null),
      open[0] ? h("div", { className: "ns-conn-pop", role: "dialog", "aria-label": "Estado de sincronización" },
        h("div", { className: "ns-row", style: { gap: 10 } }, h(Icon, { name: s[2], size: 20 }), h("strong", null, s[0])),
        props.status === "offline" ? h("p", null, "Tus cambios quedarán pendientes de sincronización.") : props.status === "error" ? h("p", null, "No pudimos sincronizar. Tus cambios siguen guardados en este equipo.") : null,
        h("p", { className: "ns-caption" }, "Última sincronización: ", h("strong", null, props.lastSync || "08:42")),
        props.pending ? h("p", { className: "ns-caption" }, props.pending + " cambios pendientes") : null,
        h(Button, { size: "sm", icon: "refresh", block: true, loading: props.status === "syncing", loadingText: "Sincronizando…", disabled: props.status === "offline", onClick: props.onSync }, "Sincronizar ahora"),
        props.onToggleOffline ? h(Switch, { label: "Trabajar sin conexión (demostración)", checked: props.status === "offline", onChange: props.onToggleOffline }) : null) : null);
  }

  /* ---------- Búsqueda global ---------- */
  var SEARCH_LINKS = [["profile", "Perfil", "user"], ["grades", "Calificaciones", "grade"], ["history", "Historial académico", "book"], ["attendance", "Asistencia", "calendar"], ["observer", "Observador", "eye"], ["reportcards", "Boletines", "file"]];
  function GlobalSearch(props) {
    var open = useState(false), q = useState(""), idx = useState(0), recent = useState(["María Fernanda López", "7A"]);
    var inputRef = useRef(null), boxRef = useRef(null);
    var gsId = useId("gs");
    useEffect(function () {
      if (window.__nsSearchOwner) return;
      window.__nsSearchOwner = gsId;
      function onKey(e) { if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); open[1](true); } }
      document.addEventListener("keydown", onKey);
      return function () { document.removeEventListener("keydown", onKey); if (window.__nsSearchOwner === gsId) window.__nsSearchOwner = null; };
    }, []);
    useDialogFocus(open[0], boxRef, function () { open[1](false); });
    var t = q[0].trim().toLowerCase();
    var results = t ? ALL_STUDENTS.filter(function (s) { return s.name.toLowerCase().indexOf(t) >= 0 || s.id.indexOf(t) >= 0 || s.document.toLowerCase().indexOf(t) >= 0 || s.course.toLowerCase() === t; }).slice(0, 7) : [];
    var cur = results[Math.min(idx[0], results.length - 1)];
    function go(s, tab) {
      recent[1]([s.name].concat(recent[0].filter(function (r) { return r !== s.name; })).slice(0, 4));
      open[1](false); q[1]("");
      if (props.onOpenStudent) props.onOpenStudent(s, tab || "profile");
    }
    return h(Fragment, null,
      h("button", { type: "button", className: "ns-gsearch-trigger", onClick: function () { open[1](true); }, "aria-label": "Buscar estudiante (Ctrl + K)" },
        h(Icon, { name: "search", size: 18 }), h("span", null, "Buscar estudiante…"), h("kbd", null, "Ctrl K")),
      open[0] ? h("div", { className: "ns-scrim ns-scrim--top", onMouseDown: function (e) { if (e.target === e.currentTarget) open[1](false); } },
        h("div", { ref: boxRef, className: "ns-gsearch", role: "dialog", "aria-modal": true, "aria-label": "Búsqueda global de estudiantes" },
          h("div", { className: "ns-gsearch-input" }, h(Icon, { name: "search", size: 20 }),
            h("input", { ref: inputRef, "data-autofocus": true, value: q[0], placeholder: "Nombre, ID estudiantil, documento o curso", "aria-label": "Buscar estudiante", role: "combobox", "aria-expanded": results.length > 0, "aria-controls": "ns-gs-list", "aria-activedescendant": cur ? "gs-" + cur.id : undefined,
              onChange: function (e) { q[1](e.target.value); idx[1](0); },
              onKeyDown: function (e) {
                if (e.key === "ArrowDown") { e.preventDefault(); idx[1](Math.min(idx[0] + 1, results.length - 1)); }
                if (e.key === "ArrowUp") { e.preventDefault(); idx[1](Math.max(idx[0] - 1, 0)); }
                if (e.key === "Enter" && cur) go(cur);
              } }),
            h("kbd", null, "Esc")),
          h("div", { className: "ns-gsearch-body" },
            h("div", { className: "ns-gsearch-list" },
              !t ? h(Fragment, null, h("span", { className: "ns-overline" }, "Búsquedas recientes"),
                h("ul", { className: "ns-gs-recent" }, recent[0].map(function (r) { return h("li", { key: r }, h("button", { type: "button", onClick: function () { q[1](r); } }, h(Icon, { name: "clock", size: 14 }), r)); })),
                h("span", { className: "ns-overline" }, "Por curso"),
                h("div", { className: "ns-row", style: { gap: 6 } }, COURSES.map(function (c) { return h("button", { key: c, type: "button", className: "ns-chip", onClick: function () { q[1](c); } }, c); })))
                : results.length ? h(Fragment, null, h("span", { className: "ns-overline" }, "Estudiantes · " + results.length),
                  h("ul", { id: "ns-gs-list", role: "listbox", className: "ns-gs-results" }, results.map(function (s, i) {
                    return h("li", { key: s.id, id: "gs-" + s.id, role: "option", "aria-selected": i === idx[0], className: cx(i === idx[0] && "is-on"), onMouseEnter: function () { idx[1](i); }, onClick: function () { go(s); } },
                      h(Avatar, { name: s.name, size: "sm" }), h("div", null, h("strong", null, s.name), h("span", { className: "ns-caption" }, s.course + " · " + s.id)), h(Icon, { name: "arrow", size: 16 }));
                  })))
                  : h("p", { className: "ns-gs-empty" }, "No hay resultados para esta búsqueda.")),
            cur ? h("div", { className: "ns-gsearch-preview" },
              h(Avatar, { name: cur.name, size: "lg" }), h("strong", { className: "ns-gs-name" }, cur.name),
              h("span", { className: "ns-caption" }, "Curso " + cur.course + " · ID " + cur.id), h("span", { className: "ns-caption" }, cur.document), h(EnrollBadge, { status: cur.status }),
              h("div", { className: "ns-gs-links" }, SEARCH_LINKS.map(function (l) { return h("button", { key: l[0], type: "button", onClick: function () { go(cur, l[0]); } }, h(Icon, { name: l[2], size: 16 }), l[1]); }))) : null),
          h("div", { className: "ns-gsearch-foot" }, h("span", null, h("kbd", null, "↑"), h("kbd", null, "↓"), " navegar"), h("span", null, h("kbd", null, "Enter"), " abrir perfil"), h("span", null, h("kbd", null, "Esc"), " cerrar")))) : null);
  }

  /* ---------- RoleShell: AppShell + navegación por rol + herramientas ---------- */
  function RoleShell(props) {
    var r = ROLES[props.role];
    var ctx = React.useContext(ShellCtx);
    var local = useState({ status: "online", last: "08:42", pending: 0 });
    var useCtx = ctx && ctx.role === props.role && ctx.sync;
    var sync = useCtx ? ctx.sync : local[0], setSync = useCtx ? ctx.setSync : local[1];
    function doSync() {
      setSync(Object.assign({}, sync, { status: "syncing" }));
      setTimeout(function () { var d = new Date(); setSync({ status: "online", last: ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2), pending: 0 }); }, 1200);
    }
    var tools = h(Fragment, null,
      h("span", { className: "ns-role-chip" }, h(Icon, { name: "shield", size: 14 }), r.label),
      props.role !== "student" && props.role !== "parent" ? h(GlobalSearch, { onOpenStudent: function (s, tab) { if (props.onNavigate) props.onNavigate("profile", { id: s.id, tab: tab }); } }) : null,
      props.role === "teacher" ? h(ConnectivityStatus, { status: sync.status, lastSync: sync.last, pending: sync.pending, onSync: doSync,
        onToggleOffline: function (v) { setSync(Object.assign({}, sync, { status: v ? "offline" : "online" })); } }) : null);
    var counts = props.counts || (props.role === "teacher" ? { grades: 8 } : props.role === "principal" ? { requests: 3 } : null);
    return h(AppShell, {
      active: props.active, onNavigate: props.onNavigate, onLogout: props.onLogout, style: props.style, overlay: props.overlay,
      items: roleNav(props.role, counts), user: r.user, course: r.course, courseLabel: r.courseLabel, density: r.density, topbar: tools
    }, props.children);
  }

  /* =====================================================================
     ADMINISTRACIÓN Y SECRETARÍA · densidad alta, tablas y formularios
     ===================================================================== */
  function useToast() {
    var t = useState(null);
    function show(x) { t[1](x); setTimeout(function () { t[1](function (cur) { return cur === x ? null : cur; }); }, 3800); }
    var node = t[0] ? h("div", { className: "ns-toast-region" }, h(Toast, Object.assign({}, t[0], { onClose: function () { t[1](null); } }))) : null;
    return [show, node];
  }
  function ConfirmAction(props) {
    return h(Modal, { open: props.open, onClose: props.onCancel, alert: true, inline: props.inline, icon: props.icon || "warning", tone: props.tone, title: props.title, description: props.description,
      actions: [h(Button, { key: "c", variant: "secondary", onClick: props.onCancel, "data-autofocus": true }, "Cancelar"), h(Button, { key: "o", variant: props.danger ? "danger" : "primary", icon: props.confirmIcon, onClick: props.onConfirm }, props.confirmLabel)] }, props.children);
  }
  function PageGrid(props) { return h("div", { className: cx("ns-pagegrid", props.className), style: props.style }, props.children); }

  /* ---------- Dashboard de administración ---------- */
  function AdminDashboardPage(props) {
    function go(id) { if (props.onNavigate) props.onNavigate(id); }
    var active = ALL_STUDENTS.filter(function (s) { return s.status === "active"; }).length;
    var pend = ALL_STUDENTS.filter(function (s) { return s.status === "pending"; });
    var blocked = ALL_STUDENTS.filter(function (s) { return !(s.library && s.fees && s.documents); }).length;
    return h(RoleShell, { role: "admin", active: "dashboard", onNavigate: props.onNavigate, onLogout: props.onLogout, style: props.style },
      h(Header, { eyebrow: "Secretaría académica · Año lectivo 2026", title: "Buenos días, Patricia", highlight: "Patricia", description: "Esto es lo que necesita gestión hoy.",
        actions: [h(Button, { key: "i", variant: "secondary", icon: "upload", onClick: function () { go("enrollment"); } }, "Importar estudiantes"), h(Button, { key: "r", icon: "plus", size: "lg", onClick: function () { go("enrollment"); } }, "Registrar estudiante")] }),
      h(ReviewSummary, { total: ALL_STUDENTS.length, verified: active, pending: pend.length, review: blocked, evaluation: "Matrícula 2026", labels: ["matrículas activas", "matrículas pendientes", "paz y salvos bloqueados"], foot: (ALL_STUDENTS.length - active) + " registros requieren gestión" }),
      h("div", { className: "ns-admin-cols" },
        h(Block, { label: "Matrículas pendientes" }, h(BlockTitle, { action: h(Button, { variant: "ghost", size: "sm", iconRight: "arrow", onClick: function () { go("students"); } }, "Ver estudiantes") }, "Matrículas pendientes"),
          h(DataGrid, { caption: "Matrículas pendientes", rows: pend, paginate: false, density: "compact", columns: [
            { key: "name", label: "Estudiante", header: true, render: function (r) { return h(UserProfile, { name: r.name, role: r.document }); } },
            { key: "course", label: "Curso" }, { key: "guardian", label: "Acudiente" },
            { key: "status", label: "Estado", render: function (r) { return h(EnrollBadge, { status: r.status }); } }],
            rowActions: function (r) { return h(Button, { size: "sm", variant: "secondary", onClick: function () { go("students"); } }, "Completar"); } })),
        h(Block, { tone: "gold", label: "Tareas del periodo" }, h(BlockTitle, null, "Tareas del periodo"),
          h("ul", { className: "ns-list" },
            [["Cerrar Periodo 3", "Cierre programado el 15 de octubre", "calendar", "periods"], ["Generar boletines", "432 boletines del Periodo 2 listos", "book", "reportcards"], [blocked + " paz y salvos bloqueados", "Revisar documentos y pensiones", "shield", "clearances"], ["Asignar docente a 8B · Inglés", "La malla curricular tiene un hueco", "link", "curriculum"]].map(function (t) {
              return h("li", { key: t[0], className: "ns-list-item" }, h("span", { className: "ns-file-icon", "aria-hidden": true }, h(Icon, { name: t[2], size: 18 })), h("div", { className: "ns-list-main" }, h("strong", null, t[0]), h("span", { className: "ns-caption" }, t[1])), h(IconAction, { icon: "arrow", label: "Ir a " + t[0], onClick: function () { go(t[3]); } }));
            })))));
  }

  /* ---------- StudentTable · Estudiantes ---------- */
  function StudentTable(props) {
    var q = useState(""), course = useState("all"), status = useState("all");
    var rowsSt = useState(ALL_STUDENTS), rows = rowsSt[0];
    var drawer = useState(null), confirm = useState(null);
    var toast = useToast();
    var ro = !!props.readOnly;
    var t = q[0].trim().toLowerCase();
    var list = rows.filter(function (s) {
      return (!t || s.name.toLowerCase().indexOf(t) >= 0 || s.id.indexOf(t) >= 0 || s.document.toLowerCase().indexOf(t) >= 0) && (course[0] === "all" || s.course === course[0]) && (status[0] === "all" || s.status === status[0]);
    });
    function setStatus(ids, st) { rowsSt[1](rows.map(function (r) { return ids.indexOf(r.id) >= 0 ? Object.assign({}, r, { status: st }) : r; })); }
    function ask(kind, list2, clear) {
      var many = list2.length > 1;
      confirm[1]({ kind: kind, rows: list2, clear: clear,
        title: (kind === "retire" ? "¿Retirar " : "¿Archivar ") + (many ? list2.length + " estudiantes?" : "a " + list2[0].first + "?"),
        description: kind === "retire" ? "El estudiante deja de aparecer en listas de clase. Su historial académico se conserva." : "Los registros archivados se ocultan de la gestión diaria y pueden restaurarse." });
    }
    var counts = { all: rows.length }; rows.forEach(function (r) { counts[r.status] = (counts[r.status] || 0) + 1; });
    return h(Fragment, null,
      h(DataGrid, {
        caption: "Estudiantes y matrículas", rows: list, selectable: !ro, densityToggle: true, density: "compact", pageSize: 12, resetKey: t + course[0] + status[0],
        initialSort: { key: "name", dir: "asc" },
        emptyTitle: rows.length ? "No hay resultados para esta búsqueda." : "No hay estudiantes registrados.", emptyMessage: "Prueba con otro nombre, documento o curso.", emptyIcon: "students",
        toolbar: h(Fragment, null,
          h(SearchField, { value: q[0], onChange: q[1], placeholder: "Nombre, documento o ID", label: "Buscar estudiante" }),
          h(FilterGroup, { as: "select", label: "Curso", value: course[0], onChange: course[1], options: [{ value: "all", label: "Todos" }].concat(COURSES.map(function (c) { return { value: c, label: c }; })) }),
          h(FilterGroup, { label: "Estado", value: status[0], onChange: status[1], options: [{ value: "all", label: "Todos", count: counts.all }, { value: "active", label: "Activo", count: counts.active || 0 }, { value: "pending", label: "Pendiente", count: counts.pending || 0 }, { value: "retired", label: "Retirado", count: counts.retired || 0 }, { value: "archived", label: "Archivado", count: counts.archived || 0 }] })),
        bulkActions: function (sel, clear) { return [
          h(Button, { key: "x", size: "sm", variant: "secondary", icon: "download", onClick: function () { toast[0]({ tone: "success", title: "Exportación lista", message: sel.length + " estudiantes exportados a Excel." }); } }, "Exportar"),
          h(Button, { key: "b", size: "sm", variant: "secondary", icon: "book", onClick: function () { toast[0]({ tone: "info", title: "Boletines en cola", message: "Se generarán " + sel.length + " boletines." }); } }, "Generar boletines"),
          h(Button, { key: "a", size: "sm", icon: "archive", onClick: function () { ask("archive", sel, clear); } }, "Archivar")]; },
        columns: [
          { key: "name", label: "Nombre completo", sortable: true, header: true, render: function (r) { return h("button", { type: "button", className: "ns-cell-link", onClick: function () { drawer[1](r); } }, h(Avatar, { name: r.name, size: "sm" }), h("span", null, r.name)); } },
          { key: "document", label: "Documento", sortable: true },
          { key: "id", label: "ID estudiantil", sortable: true, className: "ns-mono" },
          { key: "grade", label: "Grado", sortable: true, render: function (r) { return GRADE_NAME[r.grade]; } },
          { key: "course", label: "Curso", sortable: true, render: function (r) { return h("span", { className: "ns-course-tag" }, r.course); } },
          { key: "guardian", label: "Acudiente", sortable: true },
          { key: "status", label: "Estado", sortable: true, render: function (r) { return h(EnrollBadge, { status: r.status }); } },
          { key: "enrolled", label: "Fecha de matrícula" }],
        rowActions: function (r) { return [
          h(IconAction, { key: "v", icon: "eye", label: "Ver perfil de " + r.name, onClick: function () { drawer[1](r); } }),
          ro ? null : h(IconAction, { key: "e", icon: "edit", label: "Editar " + r.name, onClick: function () { drawer[1](Object.assign({ _edit: true }, r)); } }),
          ro ? null : h(IconAction, { key: "a", icon: "archive", label: "Archivar " + r.name, disabled: r.status === "archived", onClick: function () { ask("archive", [r]); } }),
          ro ? null : h(IconAction, { key: "r", icon: "userx", tone: "danger", label: "Retirar " + r.name, disabled: r.status === "retired", onClick: function () { ask("retire", [r]); } })]; }
      }),
      h(StudentDrawer, { student: drawer[0], readOnly: ro, onClose: function () { drawer[1](null); }, onOpenProfile: function (s) { drawer[1](null); if (props.onNavigate) props.onNavigate("profile", { id: s.id }); },
        onSave: function (s) { rowsSt[1](rows.map(function (r) { return r.id === s.id ? s : r; })); drawer[1](null); toast[0]({ tone: "success", title: "Cambios guardados", message: s.name + " fue actualizado." }); } }),
      h(ConfirmAction, { open: !!confirm[0], onCancel: function () { confirm[1](null); }, title: confirm[0] && confirm[0].title, description: confirm[0] && confirm[0].description, danger: confirm[0] && confirm[0].kind === "retire", icon: confirm[0] && confirm[0].kind === "retire" ? "userx" : "archive",
        confirmLabel: confirm[0] && confirm[0].kind === "retire" ? "Retirar" : "Archivar",
        onConfirm: function () { var c = confirm[0]; setStatus(c.rows.map(function (r) { return r.id; }), c.kind === "retire" ? "retired" : "archived"); if (c.clear) c.clear(); confirm[1](null); toast[0]({ tone: "success", title: c.kind === "retire" ? "Estudiante retirado" : "Registros archivados", message: c.rows.length + (c.rows.length === 1 ? " registro actualizado." : " registros actualizados.") }); } }),
      toast[1]);
  }
  function StudentDrawer(props) {
    var s = props.student;
    var form = useState(null);
    useEffect(function () { form[1](s ? Object.assign({}, s) : null); }, [s]);
    var edit = s && s._edit && !props.readOnly;
    var f = form[0] || s || {};
    return h(Drawer, { open: !!s, onClose: props.onClose, eyebrow: edit ? "Editar estudiante" : "Vista rápida", title: s ? s.name : "",
      footer: s ? (edit ? [h(Button, { key: "c", variant: "secondary", onClick: props.onClose }, "Cancelar"), h(Button, { key: "s", icon: "check", onClick: function () { var o = Object.assign({}, f); delete o._edit; o.name = o.first + " " + o.last; props.onSave(o); } }, "Guardar cambios")]
        : [h(Button, { key: "p", variant: "secondary", iconRight: "arrow", onClick: function () { props.onOpenProfile(s); } }, "Abrir perfil completo")]) : null },
      s ? (edit ? h("div", { className: "ns-form-grid" },
        h(Input, { label: "Nombres", required: true, value: f.first, onChange: function (e) { form[1](Object.assign({}, f, { first: e.target.value })); } }),
        h(Input, { label: "Apellidos", required: true, value: f.last, onChange: function (e) { form[1](Object.assign({}, f, { last: e.target.value })); } }),
        h(Input, { label: "Documento", readOnly: true, value: f.document, hint: "El documento solo se corrige desde Matrículas." }),
        h(Select, { label: "Curso", value: f.course, onChange: function (v) { form[1](Object.assign({}, f, { course: v, grade: v.charAt(0) })); }, options: COURSES }),
        h(Input, { label: "Acudiente", value: f.guardian, onChange: function (e) { form[1](Object.assign({}, f, { guardian: e.target.value })); } }),
        h(Input, { label: "Teléfono del acudiente", value: f.guardianPhone, onChange: function (e) { form[1](Object.assign({}, f, { guardianPhone: e.target.value })); } }))
        : h("div", { className: "ns-col", style: { gap: 18 } },
          h("div", { className: "ns-row" }, h(Avatar, { name: s.name, size: "lg" }), h("div", { className: "ns-col", style: { gap: 4 } }, h(EnrollBadge, { status: s.status }), h("span", { className: "ns-caption" }, "ID " + s.id + " · " + GRADE_NAME[s.grade] + " · " + s.course))),
          h("dl", { className: "ns-dl" },
            [["Documento", s.document], ["Acudiente", s.guardian + " (" + s.guardianRel + ")"], ["Teléfono", s.guardianPhone], ["Fecha de matrícula", s.enrolled], ["Promedio actual", formatGrade(s.avg)], ["Asistencia", s.attendance + "%"]].map(function (x) { return h(Fragment, { key: x[0] }, h("dt", null, x[0]), h("dd", null, x[1])); })),
          h(Block, { tone: s.library && s.fees && s.documents ? "sage" : "burgundy" }, h("strong", null, s.library && s.fees && s.documents ? "Paz y salvo al día" : "Paz y salvo con pendientes"), h("span", { className: "ns-caption" }, "Biblioteca " + (s.library ? "✓" : "×") + " · Pensiones " + (s.fees ? "✓" : "×") + " · Documentos " + (s.documents ? "✓" : "×"))))) : null);
  }
  function StudentsAdminPage(props) {
    var ro = props.role === "principal";
    return h(RoleShell, { role: props.role || "admin", active: "students", onNavigate: props.onNavigate, onLogout: props.onLogout, style: props.style },
      h(Header, { eyebrow: ro ? "Consulta institucional" : "Gestión de matrícula", title: "Estudiantes y Matrículas", highlight: "Matrículas", description: ro ? "Consulta estudiantes y abre su perfil completo." : "Busca, edita, archiva o retira estudiantes. Selecciona varios para acciones en lote.",
        actions: ro ? null : [h(Button, { key: "i", variant: "secondary", icon: "upload", onClick: function () { props.onNavigate && props.onNavigate("enrollment", { tab: "import" }); } }, "Importar estudiantes"), h(Button, { key: "n", icon: "plus", onClick: function () { props.onNavigate && props.onNavigate("enrollment"); } }, "Registrar estudiante")] }),
      h(StudentTable, { readOnly: ro, onNavigate: props.onNavigate }));
  }

  /* ---------- Formulario de matrícula por secciones ---------- */
  var REG_SECTIONS = [["personal", "Datos personales", "user"], ["medical", "Información médica", "heart"], ["guardian", "Acudiente", "students"], ["academic", "Información académica", "book"]];
  function StudentRegistrationForm(props) {
    var step = useState(0), tried = useState({}), done = useState(false);
    var d = useState({ first: "", last: "", docType: "Tarjeta de identidad", doc: "", birth: "", phone: "", email: "", allergies: "", conditions: "", medNotes: "", emName: "", emPhone: "", gName: "", gRel: "", gDoc: "", gPhone: "", gEmail: "", year: "2026", grade: "7", course: "7A", state: "Activo" });
    var v = d[0];
    function set(k) { return function (e) { var o = {}; o[k] = e && e.target ? e.target.value : e; d[1](Object.assign({}, v, o)); }; }
    var REQ = { 0: ["first", "last", "doc", "birth"], 2: ["gName", "gRel", "gPhone"], 3: ["year", "grade", "course"] };
    function err(k) { return tried[0][step[0]] && REQ[step[0]] && REQ[step[0]].indexOf(k) >= 0 && !String(v[k]).trim() ? "Este campo es obligatorio." : null; }
    function emailErr(k) { return v[k] && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v[k]) ? "Escribe un correo válido." : null; }
    function valid(i) { return (REQ[i] || []).every(function (k) { return String(v[k]).trim(); }); }
    function next() { var o = Object.assign({}, tried[0]); o[step[0]] = true; tried[1](o); if (!valid(step[0])) return; if (step[0] < 3) step[1](step[0] + 1); else done[1](true); }
    if (done[0]) return h(Block, { tone: "sage", className: "ns-reg-done" },
      h("span", { className: "ns-dialog-seal ns-dialog-seal--sage", "aria-hidden": true }, h(Icon, { name: "check", size: 22 })),
      h("h2", { className: "ns-block-h" }, "Matrícula registrada"),
      h("p", null, v.first + " " + v.last + " quedó matriculado en " + GRADE_NAME[v.grade] + " · " + v.course + " para el año lectivo " + v.year + "."),
      h("div", { className: "ns-row" }, h(Button, { icon: "plus", onClick: function () { done[1](false); step[1](0); tried[1]({}); d[1](Object.assign({}, v, { first: "", last: "", doc: "", birth: "" })); } }, "Registrar otro estudiante"), h(Button, { variant: "secondary", onClick: function () { props.onNavigate && props.onNavigate("students"); } }, "Ver estudiantes")));
    var body;
    if (step[0] === 0) body = h("div", { className: "ns-form-grid" },
      h(Input, { label: "Nombres", required: true, value: v.first, onChange: set("first"), error: err("first"), autoComplete: "off" }),
      h(Input, { label: "Apellidos", required: true, value: v.last, onChange: set("last"), error: err("last") }),
      h(Select, { label: "Tipo de documento", required: true, value: v.docType, onChange: set("docType"), options: ["Tarjeta de identidad", "Registro civil", "Cédula de ciudadanía", "Cédula de extranjería", "Pasaporte"] }),
      h(Input, { label: "Número de documento", required: true, inputMode: "numeric", value: v.doc, onChange: set("doc"), error: err("doc"), hint: "Sin puntos ni espacios." }),
      h(Input, { label: "Fecha de nacimiento", required: true, type: "date", value: v.birth, onChange: set("birth"), error: err("birth") }),
      h(Input, { label: "Teléfono de contacto", type: "tel", value: v.phone, onChange: set("phone") }),
      h(Input, { label: "Correo electrónico", type: "email", value: v.email, onChange: set("email"), error: emailErr("email"), className: "ns-span-2" }));
    else if (step[0] === 1) body = h(Fragment, null,
      h("p", { className: "ns-sensitive" }, h(Icon, { name: "lock", size: 16 }), "Información sensible. Solo la ven Secretaría y Rectoría. Todos los campos son opcionales."),
      h("div", { className: "ns-form-grid" },
        h(Input, { label: "Alergias", value: v.allergies, onChange: set("allergies"), placeholder: "Ninguna conocida" }),
        h(Input, { label: "Condiciones relevantes", value: v.conditions, onChange: set("conditions") }),
        h(Textarea, { label: "Observaciones médicas", value: v.medNotes, onChange: set("medNotes"), className: "ns-span-2", rows: 2 }),
        h(Input, { label: "Contacto de emergencia", value: v.emName, onChange: set("emName") }),
        h(Input, { label: "Teléfono de emergencia", type: "tel", value: v.emPhone, onChange: set("emPhone") })));
    else if (step[0] === 2) body = h("div", { className: "ns-form-grid" },
      h(Input, { label: "Nombre completo", required: true, value: v.gName, onChange: set("gName"), error: err("gName") }),
      h(Select, { label: "Parentesco", required: true, value: v.gRel, onChange: set("gRel"), placeholder: "Selecciona", options: ["Madre", "Padre", "Abuela", "Abuelo", "Tía", "Tío", "Tutor legal"], error: err("gRel") }),
      h(Input, { label: "Documento", value: v.gDoc, onChange: set("gDoc") }),
      h(Input, { label: "Teléfono", required: true, type: "tel", value: v.gPhone, onChange: set("gPhone"), error: err("gPhone") }),
      h(Input, { label: "Correo electrónico", type: "email", value: v.gEmail, onChange: set("gEmail"), error: emailErr("gEmail"), hint: "Recibirá el acceso de acudiente.", className: "ns-span-2" }));
    else body = h("div", { className: "ns-form-grid" },
      h(Select, { label: "Año lectivo", required: true, value: v.year, onChange: set("year"), options: ["2026", "2027"] }),
      h(Select, { label: "Grado", required: true, value: v.grade, onChange: function (x) { d[1](Object.assign({}, v, { grade: x, course: x + "A" })); }, options: ["6", "7", "8", "9", "10", "11"].map(function (g) { return { value: g, label: GRADE_NAME[g] }; }) }),
      h(Select, { label: "Curso", required: true, value: v.course, onChange: set("course"), options: [v.grade + "A", v.grade + "B"] }),
      h(Select, { label: "Estado de matrícula", value: v.state, onChange: set("state"), options: ["Activo", "Pendiente"] }),
      h("div", { className: "ns-span-2 ns-summary-card" }, h("span", { className: "ns-overline" }, "Resumen"), h("strong", null, (v.first || "—") + " " + v.last), h("span", { className: "ns-caption" }, v.docType + " " + (v.doc || "—") + " · Acudiente: " + (v.gName || "—") + " · " + GRADE_NAME[v.grade] + " " + v.course)));
    return h("div", { className: "ns-reg" },
      h("ol", { className: "ns-reg-steps", "aria-label": "Secciones del formulario" }, REG_SECTIONS.map(function (s, i) {
        var ok = i < step[0];
        return h("li", { key: s[0] }, h("button", { type: "button", className: cx("ns-reg-step", i === step[0] && "is-on", ok && "is-done"), "aria-current": i === step[0] ? "step" : undefined, onClick: function () { if (i <= step[0] || valid(step[0])) step[1](i); } },
          h("span", { className: "ns-reg-num" }, ok ? h(Icon, { name: "check", size: 14, strokeWidth: 3 }) : i + 1), h("span", null, s[1], s[0] === "medical" ? h("small", null, "Opcional") : null)));
      })),
      h(Block, { className: "ns-reg-body" },
        h("div", { className: "ns-block-title" }, h("h2", null, REG_SECTIONS[step[0]][1]), h("span", { className: "ns-caption" }, "Sección " + (step[0] + 1) + " de 4 · ", h("span", { className: "ns-req" }, "*"), " obligatorio")),
        body,
        h("div", { className: "ns-reg-actions" },
          step[0] > 0 ? h(Button, { variant: "ghost", icon: "chevleft", onClick: function () { step[1](step[0] - 1); } }, "Anterior") : h("span"),
          h(Button, { icon: step[0] === 3 ? "check" : undefined, iconRight: step[0] < 3 ? "arrow" : undefined, onClick: next }, step[0] === 3 ? "Guardar matrícula" : "Siguiente"))));
  }

  /* ---------- Importación masiva ---------- */
  var IMPORT_STEPS = ["Seleccionar archivo", "Previsualizar", "Validar", "Corregir errores", "Confirmar importación", "Resultados"];
  var IMPORT_ISSUES = [
    { row: 12, name: "Samuel Ortiz Bravo", doc: "TI 10843", course: "6A", state: "error", msg: "Documento incompleto (mínimo 8 dígitos)", field: "doc" },
    { row: 37, name: "Luciana Paz Mora", doc: "TI 1084412233", course: "6C", state: "error", msg: "El curso 6C no existe en la estructura académica", field: "course" },
    { row: 58, name: "Tomás Riascos", doc: "TI 1084523310", course: "7A", state: "warning", msg: "Falta el teléfono del acudiente", field: null },
    { row: 91, name: "María Fernanda López Rosero", doc: "TI 1084655210", course: "7A", state: "duplicate", msg: "Ya existe un estudiante con este documento", field: null },
    { row: 120, name: "Gabriela Zambrano", doc: "", course: "7B", state: "error", msg: "Documento vacío", field: "doc" },
    { row: 166, name: "Nicolás Cabrera", doc: "TI 1084812290", course: "8A", state: "duplicate", msg: "Fila repetida (igual a la fila 165)", field: null },
    { row: 203, name: "Antonella Burbano", doc: "TI 1084933302", course: "8B", state: "error", msg: "Fecha de nacimiento inválida: 31/02/2014", field: "birth" }
  ];
  var ROW_STATE = { valid: ["Válido", "verified", "check"], warning: ["Advertencia", "medium", "warning"], error: ["Error", "review", "error"], duplicate: ["Duplicado", "pending", "layers"], fixed: ["Corregido", "verified", "edit"], skipped: ["Omitido", "neutral", "minus"] };
  function ImportFileZone(props) {
    var over = useState(false), ref = useRef(null);
    function pick(list) { var f = list && list[0]; if (!f) return; if (!/\.(xlsx|xls|csv)$/i.test(f.name)) { props.onError && props.onError("Solo se aceptan archivos Excel (.xlsx) o CSV."); return; } props.onFile({ name: f.name, size: f.size }); }
    return h("div", { className: cx("ns-drop ns-import-drop", over[0] && "is-over"), role: "button", tabIndex: 0, "aria-label": "Seleccionar archivo Excel o CSV de estudiantes",
      onClick: function () { ref.current && ref.current.click(); }, onKeyDown: function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ref.current && ref.current.click(); } },
      onDragOver: function (e) { e.preventDefault(); over[1](true); }, onDragLeave: function () { over[1](false); }, onDrop: function (e) { e.preventDefault(); over[1](false); pick(e.dataTransfer.files); } },
      h("span", { className: "ns-empty-seal" }, h(Icon, { name: "upload", size: 26 })),
      h("strong", { className: "ns-serif", style: { fontSize: 22 } }, "Arrastra tu archivo aquí"),
      h("span", { className: "ns-caption" }, "o haz clic para seleccionarlo"),
      h("div", { className: "ns-row", style: { gap: 8 } }, h(Badge, { tone: "neutral", icon: "file" }, "Excel .xlsx"), h(Badge, { tone: "neutral", icon: "file" }, "CSV")),
      h("input", { ref: ref, type: "file", accept: ".xlsx,.xls,.csv", hidden: true, onChange: function (e) { pick(e.target.files); } }));
  }
  function BulkImportPanel(props) {
    var step = useState(props.initialStep || 0), file = useState(props.initialStep ? { name: "estudiantes_2026.xlsx", size: 48213 } : null), err = useState(null);
    var issues = useState(IMPORT_ISSUES.map(function (x) { return Object.assign({}, x); })), filter = useState("all"), confirm = useState(false), busy = useState(false);
    var total = 245;
    var pendingIssues = issues[0].filter(function (x) { return x.state === "error" || x.state === "duplicate" || x.state === "warning"; });
    var blocking = issues[0].filter(function (x) { return x.state === "error"; }).length;
    var valid = total - issues[0].length + issues[0].filter(function (x) { return x.state === "fixed" || x.state === "warning"; }).length;
    function upd(i, patch) { issues[1](issues[0].map(function (x, j) { return j === i ? Object.assign({}, x, patch) : x; })); }
    var stepper = h("ol", { className: "ns-stepper ns-stepper--6", "aria-label": "Pasos de la importación" }, IMPORT_STEPS.map(function (s, i) {
      return h("li", { key: s, className: cx("ns-step", i < step[0] && "is-done", i === step[0] && "is-current"), "aria-current": i === step[0] ? "step" : undefined },
        h("span", { className: "ns-step-mark" }, i < step[0] ? h(Icon, { name: "check", size: 14, strokeWidth: 3 }) : i + 1), h("span", { className: "ns-step-label" }, s));
    }));
    var content;
    if (step[0] === 0) content = h("div", { className: "ns-import-grid" },
      h(ImportFileZone, { onFile: function (f) { file[1](f); err[1](null); step[1](1); }, onError: err[1] }),
      h(Block, { tone: "gold" }, h(BlockTitle, null, "Antes de importar"),
        h("ul", { className: "ns-checklist" }, ["Una fila por estudiante, con encabezados en la primera fila.", "Columnas: nombres, apellidos, tipo y número de documento, fecha de nacimiento, curso, acudiente, teléfono.", "Los cursos deben existir en Estructura Académica.", "Nada se guarda hasta que confirmes la importación."].map(function (t) { return h("li", { key: t }, h(Icon, { name: "check", size: 16 }), t); })),
        h("div", { className: "ns-row" }, h(Button, { variant: "secondary", icon: "download" }, "Descargar plantilla"), h(Button, { variant: "ghost", onClick: function () { file[1]({ name: "estudiantes_2026.xlsx", size: 48213 }); step[1](1); } }, "Usar archivo de ejemplo")),
        err[0] ? h("span", { className: "ns-field-error", role: "alert" }, h(Icon, { name: "error", size: 16 }), err[0]) : null));
    else if (step[0] === 1) content = h(Block, null,
      h(BlockTitle, { action: h(Badge, { tone: "neutral", icon: "file" }, file[0].name + " · " + Math.round(file[0].size / 1024) + " KB") }, total + " registros encontrados"),
      h("p", { className: "ns-caption" }, "Así leímos las primeras filas. Revisa que cada columna corresponda."),
      h(DataTable, { caption: "Vista previa del archivo", columns: ["Nombres", "Apellidos", "Documento", "Nacimiento", "Curso", "Acudiente", "Teléfono"].map(function (c, i) { return { key: "c" + i, label: c }; }),
        rows: ALL_STUDENTS.slice(0, 5).map(function (s, i) { return { id: i, c0: s.first, c1: s.last, c2: s.document, c3: "1" + (i + 2) + "/0" + (i + 3) + "/2013", c4: s.course, c5: s.guardian, c6: s.guardianPhone }; }) }),
      h("div", { className: "ns-reg-actions" }, h(Button, { variant: "ghost", icon: "chevleft", onClick: function () { step[1](0); } }, "Cambiar archivo"), h(Button, { iconRight: "arrow", onClick: function () { busy[1](true); setTimeout(function () { busy[1](false); step[1](2); }, 900); }, loading: busy[0], loadingText: "Validando…" }, "Validar archivo")));
    else if (step[0] === 2 || step[0] === 3) {
      var shown = issues[0].map(function (x, i) { return Object.assign({ _i: i }, x); }).filter(function (x) { return filter[0] === "all" || x.state === filter[0]; });
      content = h(Fragment, null,
        h("div", { className: "ns-import-summary" },
          h("div", { className: "ns-bento-tile ns-bento-tile--lead" }, h("span", { className: "ns-bento-value ns-bento-value--xl" }, total, h("small", null, " registros encontrados"))),
          h("div", { className: "ns-bento-tile ns-bento-tile--sage" }, h("span", { className: "ns-bento-value" }, valid), h("span", { className: "ns-bento-label" }, h(Icon, { name: "check", size: 16 }), "registros válidos")),
          h("div", { className: "ns-bento-tile ns-bento-tile--burgundy" }, h("span", { className: "ns-bento-value" }, pendingIssues.length), h("span", { className: "ns-bento-label" }, h(Icon, { name: "warning", size: 16 }), "requieren revisión"))),
        h(Block, null,
          h(BlockTitle, { action: h(FilterGroup, { label: "Mostrar", value: filter[0], onChange: filter[1], options: [{ value: "all", label: "Todos" }, { value: "error", label: "Error" }, { value: "duplicate", label: "Duplicado" }, { value: "warning", label: "Advertencia" }] }) }, step[0] === 2 ? "Validación por fila" : "Corregir errores"),
          h(DataGrid, { caption: "Validación de filas importadas", rows: shown, rowKey: function (r) { return r.row; }, paginate: false, density: "compact",
            columns: [
              { key: "row", label: "Fila", numeric: true },
              { key: "name", label: "Estudiante", header: true },
              { key: "doc", label: "Documento", render: function (r) { return step[0] === 3 && r.field === "doc" && r.state === "error" ? h(Input, { hideLabel: true, label: "Corregir documento de " + r.name, defaultValue: r.doc, onBlur: function (e) { if (/\d{8,}/.test(e.target.value)) upd(r._i, { doc: e.target.value, state: "fixed", msg: "Documento corregido" }); } }) : r.doc || "—"; } },
              { key: "course", label: "Curso", render: function (r) { return step[0] === 3 && r.field === "course" && r.state === "error" ? h("select", { className: "ns-select", "aria-label": "Corregir curso de " + r.name, defaultValue: "", onChange: function (e) { upd(r._i, { course: e.target.value, state: "fixed", msg: "Curso corregido" }); } }, h("option", { value: "", disabled: true }, r.course + " → ?"), COURSES.map(function (c) { return h("option", { key: c, value: c }, c); })) : r.course; } },
              { key: "state", label: "Resultado", render: function (r) { var s = ROW_STATE[r.state]; return h(Badge, { tone: s[1], icon: s[2] }, s[0]); } },
              { key: "msg", label: "Detalle" }],
            rowActions: step[0] === 3 ? function (r) { return r.state === "error" || r.state === "duplicate" ? h(Button, { size: "sm", variant: "ghost", onClick: function () { upd(r._i, { state: "skipped", msg: "No se importará" }); } }, "Omitir fila") : r.state === "warning" ? h(Badge, { tone: "neutral", icon: false }, "Se importa") : null; } : null,
            emptyTitle: "No hay filas con este estado." }),
          h("div", { className: "ns-reg-actions" },
            h(Button, { variant: "ghost", icon: "chevleft", onClick: function () { step[1](step[0] - 1); } }, "Anterior"),
            step[0] === 2 ? h(Button, { iconRight: "arrow", onClick: function () { step[1](3); } }, "Corregir errores")
              : h(Button, { iconRight: "arrow", disabled: blocking > 0, onClick: function () { step[1](4); } }, blocking ? "Resuelve " + blocking + (blocking === 1 ? " error" : " errores") : "Continuar"))));
    }
    else if (step[0] === 4) content = h(Block, { tone: "gold", className: "ns-reg-done" },
      h("h2", { className: "ns-block-h" }, "Confirmar importación"),
      h("p", null, "Se registrarán ", h("strong", null, valid + " estudiantes"), ". " + issues[0].filter(function (x) { return x.state === "skipped"; }).length + " filas omitidas no se importarán."),
      h("div", { className: "ns-row" }, h(Button, { variant: "ghost", icon: "chevleft", onClick: function () { step[1](3); } }, "Revisar de nuevo"), h(Button, { icon: "upload", size: "lg", onClick: function () { confirm[1](true); } }, "Confirmar importación")));
    else content = h(Block, { tone: "sage", className: "ns-reg-done" },
      h("span", { className: "ns-dialog-seal ns-dialog-seal--sage", "aria-hidden": true }, h(Icon, { name: "check", size: 22 })),
      h("h2", { className: "ns-block-h" }, "Importación completada"),
      h("p", null, valid + " estudiantes fueron registrados correctamente."),
      h("div", { className: "ns-row" }, h(Button, { variant: "secondary", icon: "download" }, "Descargar informe"), h(Button, { iconRight: "arrow", onClick: function () { props.onNavigate && props.onNavigate("students"); } }, "Ver estudiantes"), h(Button, { variant: "ghost", onClick: function () { step[1](0); file[1](null); issues[1](IMPORT_ISSUES.map(function (x) { return Object.assign({}, x); })); } }, "Importar otro archivo")));
    return h("div", { className: "ns-col", style: { gap: 24 } }, stepper, content,
      h(ConfirmAction, { open: confirm[0], onCancel: function () { confirm[1](false); }, icon: "upload", title: "¿Importar " + valid + " estudiantes?", description: "Los registros quedarán activos en la matrícula 2026.", confirmLabel: "Confirmar importación", onConfirm: function () { confirm[1](false); step[1](5); } }));
  }
  function EnrollmentPage(props) {
    var tab = useState(props.tab === "import" ? "import" : "register");
    return h(RoleShell, { role: "admin", active: "enrollment", onNavigate: props.onNavigate, onLogout: props.onLogout, style: props.style },
      h(Header, { eyebrow: "Matrícula 2026", title: "Matrículas", highlight: "Matrículas", description: "Registra estudiantes uno a uno o importa un archivo completo." }),
      h(SegmentedTabs, { label: "Tipo de matrícula", value: tab[0], onChange: tab[1], tabs: [{ value: "register", label: "Registrar estudiante", icon: "plus" }, { value: "import", label: "Importación masiva", icon: "upload" }] }),
      tab[0] === "register" ? h(StudentRegistrationForm, { onNavigate: props.onNavigate }) : h(BulkImportPanel, { onNavigate: props.onNavigate, initialStep: props.importStep }));
  }

  /* ---------- Directorio de usuarios ---------- */
  var USER_ROLES = { teacher: "Docente", guardian: "Acudiente", staff: "Administrativo", director: "Directivo" };
  var USERS = (function () {
    var out = [];
    TEACHERS.forEach(function (t, i) { out.push({ id: "u" + i, name: t.name, email: t.name.split(" ")[0].toLowerCase() + "." + t.name.split(" ")[1].toLowerCase().replace(/[áéíóú]/g, function (c) { return "aeiou"["áéíóú".indexOf(c)]; }) + "@losandes.edu.co", role: "teacher", status: i === 3 ? "inactive" : "active", last: ["Hoy, 08:42", "Ayer, 17:10", "Hoy, 07:55", "Hace 9 días", "Hoy, 09:20", "Ayer, 15:02"][i] }); });
    ALL_STUDENTS.slice(0, 16).forEach(function (s, i) { out.push({ id: "g" + i, name: s.guardian + " " + s.last.split(" ")[1], email: s.guardian.split(" ")[0].toLowerCase() + i + "@correo.com", role: "guardian", status: i % 7 === 3 ? "invited" : "active", last: i % 7 === 3 ? "Nunca" : "Hace " + (i + 1) + " días" }); });
    [["Patricia Ortega", "staff"], ["Rubén Bravo", "staff"], ["Claudia Enríquez", "staff"], ["Hernando Villota", "director"], ["Marcela Narváez", "director"]].forEach(function (x, i) { out.push({ id: "s" + i, name: x[0], email: x[0].split(" ")[0].toLowerCase() + "@losandes.edu.co", role: x[1], status: "active", last: "Hoy, 0" + (7 + i) + ":1" + i }); });
    return out;
  })();
  var USER_STATUS = { active: ["Activo", "verified", "check"], inactive: ["Desactivado", "neutral", "minus"], invited: ["Invitación enviada", "pending", "mail"] };
  function UserDirectory(props) {
    var tab = useState("all"), q = useState(""), rows = useState(USERS), reset = useState(null), deact = useState(null), drawer = useState(null);
    var toast = useToast();
    var t = q[0].toLowerCase();
    var list = rows[0].filter(function (u) { return (tab[0] === "all" || u.role === tab[0]) && (!t || u.name.toLowerCase().indexOf(t) >= 0 || u.email.indexOf(t) >= 0); });
    function count(r) { return rows[0].filter(function (u) { return r === "all" || u.role === r; }).length; }
    return h(Fragment, null,
      h(SegmentedTabs, { label: "Tipo de usuario", value: tab[0], onChange: tab[1], tabs: [["all", "Todos"], ["teacher", "Docentes"], ["guardian", "Acudientes"], ["staff", "Administrativos"], ["director", "Directivos"]].map(function (x) { return { value: x[0], label: x[1], count: count(x[0]) }; }) }),
      h(DataGrid, { caption: "Directorio de usuarios", rows: list, pageSize: 10, density: "compact", densityToggle: true, resetKey: tab[0] + t,
        toolbar: h(SearchField, { value: q[0], onChange: q[1], placeholder: "Nombre o correo", label: "Buscar usuario" }),
        columns: [
          { key: "name", label: "Nombre", sortable: true, header: true, render: function (u) { return h("div", { className: "ns-cell-link ns-cell-link--static" }, h(Avatar, { name: u.name, size: "sm" }), h("span", null, u.name)); } },
          { key: "email", label: "Correo", sortable: true },
          { key: "role", label: "Rol", sortable: true, render: function (u) { return h("span", { className: "ns-course-tag" }, USER_ROLES[u.role]); } },
          { key: "status", label: "Estado", sortable: true, render: function (u) { var s = USER_STATUS[u.status]; return h(Badge, { tone: s[1], icon: s[2] }, s[0]); } },
          { key: "last", label: "Último acceso" }],
        rowActions: function (u) { return [
          h(IconAction, { key: "e", icon: "edit", label: "Editar " + u.name, onClick: function () { drawer[1](u); } }),
          h(IconAction, { key: "v", icon: "eye", label: "Ver perfil de " + u.name, onClick: function () { drawer[1](Object.assign({ _view: true }, u)); } }),
          h(IconAction, { key: "k", icon: "key", label: "Restablecer contraseña de " + u.name, onClick: function () { reset[1](u); } }),
          h(IconAction, { key: "d", icon: "userx", tone: "danger", label: "Desactivar a " + u.name, disabled: u.status === "inactive", onClick: function () { deact[1](u); } })]; } }),
      h(PasswordResetDialog, { open: !!reset[0], user: reset[0], onClose: function () { reset[1](null); } }),
      h(ConfirmAction, { open: !!deact[0], onCancel: function () { deact[1](null); }, danger: true, icon: "userx", title: deact[0] ? "¿Desactivar a " + deact[0].name + "?" : "", description: "No podrá iniciar sesión hasta que se reactive su cuenta. Sus registros se conservan.", confirmLabel: "Desactivar",
        onConfirm: function () { var u = deact[0]; rows[1](rows[0].map(function (x) { return x.id === u.id ? Object.assign({}, x, { status: "inactive" }) : x; })); deact[1](null); toast[0]({ tone: "success", title: "Usuario desactivado", message: u.name + " ya no tiene acceso." }); } }),
      h(Drawer, { open: !!drawer[0], onClose: function () { drawer[1](null); }, eyebrow: drawer[0] && drawer[0]._view ? "Perfil de usuario" : "Editar usuario", title: drawer[0] ? drawer[0].name : "",
        footer: drawer[0] && !drawer[0]._view ? [h(Button, { key: "c", variant: "secondary", onClick: function () { drawer[1](null); } }, "Cancelar"), h(Button, { key: "s", icon: "check", onClick: function () { drawer[1](null); toast[0]({ tone: "success", title: "Cambios guardados" }); } }, "Guardar cambios")] : null },
        drawer[0] ? (drawer[0]._view ? h("dl", { className: "ns-dl" }, [["Correo", drawer[0].email], ["Rol", USER_ROLES[drawer[0].role]], ["Estado", USER_STATUS[drawer[0].status][0]], ["Último acceso", drawer[0].last]].map(function (x) { return h(Fragment, { key: x[0] }, h("dt", null, x[0]), h("dd", null, x[1])); }))
          : h("div", { className: "ns-form-grid ns-form-grid--1" }, h(Input, { label: "Nombre completo", required: true, defaultValue: drawer[0].name }), h(Input, { label: "Correo", type: "email", required: true, defaultValue: drawer[0].email }),
            h(Select, { label: "Rol", defaultValue: drawer[0].role, options: Object.keys(USER_ROLES).map(function (k) { return { value: k, label: USER_ROLES[k] }; }) }))) : null),
      toast[1]);
  }
  function UsersPage(props) {
    return h(RoleShell, { role: "admin", active: "users", onNavigate: props.onNavigate, onLogout: props.onLogout, style: props.style },
      h(Header, { eyebrow: "Accesos", title: "Usuarios", highlight: "Usuarios", description: "Docentes, acudientes, administrativos y directivos con acceso a NotaScan.", actions: h(Button, { icon: "plus" }, "Invitar usuario") }),
      h(UserDirectory, null));
  }

  /* ---------- Estructura académica ---------- */
  function AcademicStructureManager(props) {
    var tab = useState(props.tab || "grades"), drawer = useState(null), archive = useState(null);
    var toast = useToast();
    var grades = useState(["6", "7", "8", "9", "10", "11"].map(function (g, i) { return { id: g, name: GRADE_NAME[g], level: i < 4 ? "Básica secundaria" : "Media", courses: i < 3 ? 2 : 0, status: i < 3 ? "active" : "draft" }; }));
    var courses = useState(COURSES.map(function (c, i) { return { id: c, grade: GRADE_NAME[c.charAt(0)], name: c, director: TEACHERS[i % TEACHERS.length].name, students: ALL_STUDENTS.filter(function (s) { return s.course === c && s.status !== "retired"; }).length, status: "active" }; }));
    var subjects = useState(SUBJECTS.map(function (s) { return Object.assign({ status: "active" }, s); }).concat([{ id: "is", name: "Ingeniería de Software", code: "ISW-07", category: "Tecnología e informática", status: "archived" }]));
    var ST = { active: ["Activo", "verified", "check"], draft: ["Sin cursos", "pending", "clock"], archived: ["Archivado", "neutral", "archive"] };
    function badge(s) { var x = ST[s]; return h(Badge, { tone: x[1], icon: x[2] }, x[0]); }
    var cfg = {
      grades: { label: "grado", data: grades, cols: [{ key: "name", label: "Grado", header: true, sortable: true }, { key: "level", label: "Nivel" }, { key: "courses", label: "Cursos", numeric: true }, { key: "status", label: "Estado", render: function (r) { return badge(r.status); } }] },
      courses: { label: "curso", data: courses, cols: [{ key: "name", label: "Curso", header: true, sortable: true, render: function (r) { return h("span", { className: "ns-course-tag" }, r.name); } }, { key: "grade", label: "Grado", sortable: true }, { key: "director", label: "Director de grupo", sortable: true }, { key: "students", label: "Estudiantes", numeric: true, sortable: true }, { key: "status", label: "Estado", render: function (r) { return badge(r.status); } }] },
      subjects: { label: "materia", data: subjects, cols: [{ key: "name", label: "Materia", header: true, sortable: true }, { key: "code", label: "Código", className: "ns-mono" }, { key: "category", label: "Categoría", sortable: true }, { key: "status", label: "Estado", render: function (r) { return badge(r.status); } }] }
    }[tab[0]];
    function save(form) {
      var data = cfg.data, list = data[0].slice(), i = list.findIndex(function (x) { return x.id === form.id; });
      if (i >= 0) list[i] = form; else list.push(Object.assign({ id: "n" + Date.now(), status: "active" }, form));
      data[1](list); drawer[1](null); toast[0]({ tone: "success", title: i >= 0 ? "Cambios guardados" : "Creado correctamente", message: (form.name || "") + "" });
    }
    return h(Fragment, null,
      h("div", { className: "ns-row", style: { justifyContent: "space-between" } },
        h(SegmentedTabs, { label: "Elemento de la estructura", value: tab[0], onChange: tab[1], tabs: [{ value: "grades", label: "Grados", icon: "layers", count: grades[0].length }, { value: "courses", label: "Cursos", icon: "students", count: courses[0].length }, { value: "subjects", label: "Materias", icon: "book", count: subjects[0].length }] }),
        h(Button, { icon: "plus", onClick: function () { drawer[1]({ _new: true }); } }, "Crear " + cfg.label)),
      h(DataGrid, { caption: "Estructura académica · " + cfg.label + "s", rows: cfg.data[0], paginate: false, density: "compact", columns: cfg.cols, resetKey: tab[0], emptyTitle: "No hay elementos configurados.",
        rowActions: function (r) { return [h(IconAction, { key: "e", icon: "edit", label: "Editar " + r.name, onClick: function () { drawer[1](r); } }), h(IconAction, { key: "a", icon: "archive", label: "Archivar " + r.name, disabled: r.status === "archived", onClick: function () { archive[1](r); } })]; } }),
      h(StructureDrawer, { kind: tab[0], item: drawer[0], onClose: function () { drawer[1](null); }, onSave: save }),
      h(ConfirmAction, { open: !!archive[0], onCancel: function () { archive[1](null); }, icon: "archive", title: archive[0] ? "¿Archivar " + archive[0].name + "?" : "", description: "Dejará de aparecer al crear asignaciones y matrículas. El historial se conserva.", confirmLabel: "Archivar",
        onConfirm: function () { var r = archive[0]; cfg.data[1](cfg.data[0].map(function (x) { return x.id === r.id ? Object.assign({}, x, { status: "archived" }) : x; })); archive[1](null); toast[0]({ tone: "success", title: "Archivado", message: r.name }); } }),
      toast[1]);
  }
  function StructureDrawer(props) {
    var f = useState({});
    useEffect(function () { f[1](props.item ? Object.assign({}, props.item) : {}); }, [props.item]);
    var v = f[0], tried = useState(false);
    function set(k) { return function (e) { var o = {}; o[k] = e && e.target ? e.target.value : e; f[1](Object.assign({}, v, o)); }; }
    var isNew = props.item && props.item._new;
    var label = { grades: "grado", courses: "curso", subjects: "materia" }[props.kind];
    var fields = props.kind === "grades" ? [h(Input, { key: 1, label: "Nombre del grado", required: true, value: v.name || "", onChange: set("name"), error: tried[0] && !v.name ? "Escribe el nombre del grado." : null, placeholder: "Noveno" }), h(Select, { key: 2, label: "Nivel", value: v.level || "Básica secundaria", onChange: set("level"), options: ["Básica primaria", "Básica secundaria", "Media"] })]
      : props.kind === "courses" ? [h(Select, { key: 1, label: "Grado", required: true, value: v.grade || "Sexto", onChange: set("grade"), options: Object.keys(GRADE_NAME).map(function (k) { return GRADE_NAME[k]; }) }), h(Input, { key: 2, label: "Nombre del curso", required: true, value: v.name || "", onChange: set("name"), placeholder: "9A", error: tried[0] && !v.name ? "Escribe el nombre del curso." : null }), h(Select, { key: 3, label: "Director de grupo", value: v.director || "", placeholder: "Sin asignar", onChange: set("director"), options: TEACHERS.map(function (t) { return t.name; }) }), h(Input, { key: 4, label: "Cupo máximo", type: "number", defaultValue: 35 })]
        : [h(Input, { key: 1, label: "Nombre de la materia", required: true, value: v.name || "", onChange: set("name"), error: tried[0] && !v.name ? "Escribe el nombre de la materia." : null }), h(Input, { key: 2, label: "Código", value: v.code || "", onChange: set("code"), placeholder: "MAT-01" }), h(Select, { key: 3, label: "Categoría", value: v.category || "Ciencias exactas", onChange: set("category"), options: ["Ciencias exactas", "Ciencias naturales", "Humanidades", "Tecnología e informática", "Artes", "Educación física"] })];
    return h(Drawer, { open: !!props.item, onClose: props.onClose, eyebrow: "Estructura académica", title: (isNew ? "Crear " : "Editar ") + label,
      footer: [h(Button, { key: "c", variant: "secondary", onClick: props.onClose }, "Cancelar"), h(Button, { key: "s", icon: "check", onClick: function () { tried[1](true); if (!v.name) return; var o = Object.assign({}, v); delete o._new; props.onSave(o); tried[1](false); } }, isNew ? "Crear " + label : "Guardar cambios")] },
      h("div", { className: "ns-form-grid ns-form-grid--1" }, fields));
  }
  function AcademicStructurePage(props) {
    return h(RoleShell, { role: "admin", active: "structure", onNavigate: props.onNavigate, onLogout: props.onLogout, style: props.style },
      h(Header, { eyebrow: "Configuración", title: "Estructura Académica", highlight: "Académica", description: "Grados, cursos y materias que usa toda la institución." }),
      h(AcademicStructureManager, null));
  }

  /* ---------- Malla curricular ---------- */
  var PERIODS = ["Periodo 1", "Periodo 2", "Periodo 3", "Periodo 4"];
  var INITIAL_ASSIGN = (function () {
    var out = [], k = 0;
    COURSES.forEach(function (c) { SUBJECTS.forEach(function (s) {
      var t = TEACHERS.filter(function (x) { return x.subjects[0] === s.name; })[0];
      if (c === "8B" && s.id === "ing") return;
      out.push({ id: "a" + (k++), teacher: t ? t.name : TEACHERS[0].name, subject: s.name, course: c, period: "Periodo 3" });
    }); });
    return out;
  })();
  function AcademicAssignmentSelector(props) {
    var v = props.value, err = props.error;
    function set(k) { return function (x) { var o = {}; o[k] = x; props.onChange(Object.assign({}, v, o)); }; }
    return h("div", { className: "ns-assign" },
      h("div", { className: "ns-assign-fields" },
        h(Select, { label: "Docente", required: true, value: v.teacher, onChange: set("teacher"), placeholder: "Selecciona", options: TEACHERS.map(function (t) { return t.name; }) }),
        h("span", { className: "ns-assign-plus", "aria-hidden": true }, "+"),
        h(Select, { label: "Materia", required: true, value: v.subject, onChange: set("subject"), placeholder: "Selecciona", options: SUBJECTS.map(function (s) { return s.name; }) }),
        h("span", { className: "ns-assign-plus", "aria-hidden": true }, "+"),
        h(Select, { label: "Curso", required: true, value: v.course, onChange: set("course"), placeholder: "Selecciona", options: COURSES }),
        h("span", { className: "ns-assign-plus", "aria-hidden": true }, "+"),
        h(Select, { label: "Periodo", required: true, value: v.period, onChange: set("period"), options: PERIODS }),
        h(Button, { icon: props.editing ? "check" : "link", onClick: props.onSubmit, className: "ns-assign-btn" }, props.editing ? "Guardar cambios" : "Asignar")),
      err ? h("span", { className: "ns-field-error", role: "alert" }, h(Icon, { name: "error", size: 16 }), err) : null);
  }
  function CurriculumManager(props) {
    var list = useState(INITIAL_ASSIGN), form = useState({ teacher: "", subject: "", course: "", period: "Periodo 3" }), err = useState(null), editing = useState(null), del = useState(null), view = useState("matrix"), courseF = useState("all");
    var toast = useToast();
    function submit() {
      var v = form[0];
      if (!v.teacher || !v.subject || !v.course) { err[1]("Completa docente, materia y curso."); return; }
      var clash = list[0].filter(function (a) { return a.course === v.course && a.subject === v.subject && a.period === v.period && a.id !== editing[0]; })[0];
      if (clash) { err[1]("Ya existe una asignación de " + v.subject + " en " + v.course + " (" + clash.teacher + "). Edítala o elimínala primero."); return; }
      if (editing[0]) list[1](list[0].map(function (a) { return a.id === editing[0] ? Object.assign({}, a, v) : a; }));
      else list[1](list[0].concat([Object.assign({ id: "a" + Date.now() }, v)]));
      toast[0]({ tone: "success", title: editing[0] ? "Asignación actualizada" : "Docente asignado", message: v.teacher + " · " + v.subject + " · " + v.course });
      err[1](null); editing[1](null); form[1]({ teacher: "", subject: "", course: "", period: v.period });
    }
    function edit(a) { editing[1](a.id); form[1]({ teacher: a.teacher, subject: a.subject, course: a.course, period: a.period }); err[1](null); window.scrollTo && window.scrollTo({ top: 0, behavior: "smooth" }); }
    function cellFor(c, s) { return list[0].filter(function (a) { return a.course === c && a.subject === s && a.period === form[0].period; })[0]; }
    var courses = courseF[0] === "all" ? COURSES : [courseF[0]];
    return h(Fragment, null,
      h(Block, { tone: "gold", label: editing[0] ? "Editar asignación" : "Nueva asignación" }, h(BlockTitle, { action: editing[0] ? h(Button, { variant: "ghost", size: "sm", onClick: function () { editing[1](null); form[1]({ teacher: "", subject: "", course: "", period: form[0].period }); } }, "Cancelar edición") : null }, editing[0] ? "Editar asignación" : "Asignar docente"),
        h(AcademicAssignmentSelector, { value: form[0], onChange: function (v) { form[1](v); err[1](null); }, onSubmit: submit, error: err[0], editing: !!editing[0] })),
      h("div", { className: "ns-row", style: { justifyContent: "space-between" } },
        h(SegmentedTabs, { label: "Vista de la malla", value: view[0], onChange: view[1], tabs: [{ value: "matrix", label: "Malla por curso", icon: "layers" }, { value: "list", label: "Lista de asignaciones", icon: "menu" }] }),
        h(FilterGroup, { as: "select", label: "Curso", value: courseF[0], onChange: courseF[1], options: [{ value: "all", label: "Todos" }].concat(COURSES.map(function (c) { return { value: c, label: c }; })) })),
      view[0] === "matrix" ? h("div", { className: "ns-table-wrap ns-matrix-wrap", role: "region", "aria-label": "Malla curricular por curso y materia", tabIndex: 0 },
        h("table", { className: "ns-table ns-matrix" },
          h("caption", { className: "ns-sr" }, "¿Qué docente dicta qué materia en qué curso? " + form[0].period),
          h("thead", null, h("tr", null, h("th", { scope: "col" }, "Curso · " + form[0].period), SUBJECTS.map(function (s) { return h("th", { key: s.id, scope: "col" }, s.name); }))),
          h("tbody", null, courses.map(function (c) {
            return h("tr", { key: c }, h("th", { scope: "row" }, h("span", { className: "ns-course-tag" }, c)), SUBJECTS.map(function (s) {
              var a = cellFor(c, s.name);
              return h("td", { key: s.id }, a ? h("button", { type: "button", className: "ns-assign-chip", onClick: function () { edit(a); }, "aria-label": "Editar: " + a.teacher + " dicta " + s.name + " en " + c }, h(Avatar, { name: a.teacher, size: "sm" }), h("span", null, a.teacher.split(" ").slice(0, 2).join(" ")))
                : h("button", { type: "button", className: "ns-assign-empty", onClick: function () { form[1](Object.assign({}, form[0], { course: c, subject: s.name, teacher: "" })); editing[1](null); }, "aria-label": "Asignar docente a " + s.name + " en " + c }, h(Icon, { name: "plus", size: 14 }), "Sin docente"));
            }));
          }))))
        : h(DataGrid, { caption: "Asignaciones", rows: list[0].filter(function (a) { return courseF[0] === "all" || a.course === courseF[0]; }), pageSize: 12, density: "compact", initialSort: { key: "course", dir: "asc" },
          columns: [{ key: "teacher", label: "Docente", sortable: true, header: true, render: function (a) { return h("div", { className: "ns-cell-link ns-cell-link--static" }, h(Avatar, { name: a.teacher, size: "sm" }), a.teacher); } }, { key: "subject", label: "Materia", sortable: true }, { key: "course", label: "Curso", sortable: true, render: function (a) { return h("span", { className: "ns-course-tag" }, a.course); } }, { key: "period", label: "Periodo" }],
          rowActions: function (a) { return [h(IconAction, { key: "e", icon: "edit", label: "Editar asignación", onClick: function () { edit(a); } }), h(IconAction, { key: "d", icon: "trash", tone: "danger", label: "Eliminar asignación", onClick: function () { del[1](a); } })]; } }),
      h(ConfirmAction, { open: !!del[0], danger: true, icon: "trash", onCancel: function () { del[1](null); }, title: "¿Eliminar asignación?", description: del[0] ? del[0].teacher + " dejará de dictar " + del[0].subject + " en " + del[0].course + ". Las calificaciones registradas se conservan." : "", confirmLabel: "Eliminar asignación",
        onConfirm: function () { var a = del[0]; list[1](list[0].filter(function (x) { return x.id !== a.id; })); del[1](null); toast[0]({ tone: "success", title: "Asignación eliminada" }); } }),
      toast[1]);
  }
  function CurriculumPage(props) {
    return h(RoleShell, { role: "admin", active: "curriculum", onNavigate: props.onNavigate, onLogout: props.onLogout, style: props.style },
      h(Header, { eyebrow: "Docente + Materia + Curso + Periodo", title: "Malla Curricular", highlight: "Curricular", description: "¿Qué docente dicta qué materia en qué curso? Haz clic en una celda para asignar o editar." }),
      h(CurriculumManager, null));
  }

  /* ---------- Periodos académicos ---------- */
  function PeriodWeightEditor(props) {
    var items = props.items, total = items.reduce(function (a, x) { return a + (Number(x.weight) || 0); }, 0), ok = total === 100;
    function set(i, patch) { props.onChange(items.map(function (x, j) { return j === i ? Object.assign({}, x, patch) : x; })); }
    var TONES = ["navy", "gold", "sage", "paper", "ivory-deep"];
    return h("div", { className: "ns-weights" },
      h("div", { className: "ns-weight-bar ns-weight-bar--edit", role: "img", "aria-label": "Distribución: " + items.map(function (x) { return x.name + " " + x.weight + "%"; }).join(", ") },
        items.map(function (x, i) { return Number(x.weight) > 0 ? h("span", { key: i, className: "ns-weight-seg ns-weight-seg--t" + (i % 5), style: { flex: Number(x.weight) } }, x.weight + "%") : null; }),
        total < 100 ? h("span", { className: "ns-weight-seg ns-weight-seg--empty", style: { flex: 100 - total } }, "Falta " + (100 - total) + "%") : null),
      h("ul", { className: "ns-weight-list" }, items.map(function (x, i) {
        return h("li", { key: i, className: "ns-weight-row" },
          h("i", { className: "ns-swatch-dot ns-weight-dot--t" + (i % 5), "aria-hidden": true }),
          h(Input, { label: "Componente", hideLabel: true, value: x.name, onChange: function (e) { set(i, { name: e.target.value }); }, "aria-label": "Nombre del componente " + (i + 1) }),
          h("input", { type: "range", min: 0, max: 100, step: 5, value: x.weight, "aria-label": "Porcentaje de " + x.name, className: "ns-range", onChange: function (e) { set(i, { weight: Number(e.target.value) }); } }),
          h("div", { className: "ns-pct-input" }, h("input", { type: "number", min: 0, max: 100, value: x.weight, "aria-label": "Porcentaje de " + x.name + " en números", onChange: function (e) { set(i, { weight: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }); } }), h("span", null, "%")),
          h(IconAction, { icon: "trash", tone: "danger", label: "Quitar " + x.name, disabled: items.length <= 1, onClick: function () { props.onChange(items.filter(function (_, j) { return j !== i; })); } }));
      })),
      h("div", { className: "ns-weight-foot" },
        h(Button, { variant: "ghost", size: "sm", icon: "plus", onClick: function () { props.onChange(items.concat([{ name: props.newName || "Nuevo componente", weight: 0 }])); } }, props.addLabel || "Agregar componente"),
        h("div", { className: cx("ns-weight-total", ok ? "is-ok" : "is-bad"), role: "status" },
          h("span", { className: "ns-overline" }, "Total configurado"), h("strong", null, total + "%"),
          h("span", null, h(Icon, { name: ok ? "check" : "warning", size: 16 }), ok ? "Distribución completa" : "La distribución de porcentajes debe sumar 100%."))));
  }
  function PeriodConfigurator(props) {
    var periods = useState([
      { id: "p1", name: "Periodo 1", open: "2026-01-26", close: "2026-04-03", status: "closed", items: [{ name: "Actividades", weight: 40 }, { name: "Exámenes", weight: 30 }, { name: "Talleres", weight: 20 }, { name: "Actitudinal", weight: 10 }] },
      { id: "p2", name: "Periodo 2", open: "2026-04-13", close: "2026-06-19", status: "closed", items: [{ name: "Actividades", weight: 40 }, { name: "Exámenes", weight: 30 }, { name: "Talleres", weight: 20 }, { name: "Actitudinal", weight: 10 }] },
      { id: "p3", name: "Periodo 3", open: "2026-07-13", close: "2026-10-15", status: "open", items: [{ name: "Actividades", weight: 40 }, { name: "Exámenes", weight: 30 }, { name: "Talleres", weight: 20 }, { name: "Actitudinal", weight: 10 }] },
      { id: "p4", name: "Periodo 4", open: "2026-10-19", close: "2026-11-27", status: "draft", items: [{ name: "Actividades", weight: 35 }, { name: "Exámenes", weight: 30 }, { name: "Talleres", weight: 20 }, { name: "Actitudinal", weight: 10 }] }
    ]);
    var sel = useState("p4"), toast = useToast();
    var pw = useState(PERIOD_SETUP.names.map(function (n, i) { return { name: n, weight: PERIOD_SETUP.weights[i] }; }));
    var pwTotal = pw[0].reduce(function (a, x) { return a + (Number(x.weight) || 0); }, 0);
    var p = periods[0].filter(function (x) { return x.id === sel[0]; })[0];
    var total = p.items.reduce(function (a, x) { return a + (Number(x.weight) || 0); }, 0);
    var badDates = p.open && p.close && p.close <= p.open;
    var PST = { closed: ["Cerrado", "neutral", "lock"], open: ["Abierto", "verified", "check"], draft: ["Borrador", "pending", "clock"] };
    function upd(patch) { periods[1](periods[0].map(function (x) { return x.id === p.id ? Object.assign({}, x, patch) : x; })); }
    var locked = p.status === "closed";
    return h(Fragment, null, h(Block, { tone: "gold", label: "Peso de cada periodo en la nota final" },
      h(BlockTitle, { action: h(Button, { size: "sm", icon: "check", disabled: pwTotal !== 100, onClick: function () { PERIOD_SETUP.names = pw[0].map(function (x) { return x.name; }); PERIOD_SETUP.weights = pw[0].map(function (x) { return Number(x.weight) || 0; }); toast[0]({ tone: "success", title: "Pesos de los periodos guardados", message: "Los boletines calcularán el acumulado con " + pw[0].map(function (x) { return x.weight + "%"; }).join(" · ") + "." }); } }, "Guardar pesos") }, "Periodos del año y su peso en la nota final"),
      h("p", { className: "ns-caption", style: { margin: 0 } }, "Cada boletín muestra la nota del periodo, las notas de los periodos anteriores y el acumulado ponderado con estos pesos."),
      h(PeriodWeightEditor, { items: pw[0], onChange: pw[1], addLabel: "Agregar periodo", newName: "Periodo " + (pw[0].length + 1) })),
      h("div", { className: "ns-period" },
      h("div", { className: "ns-period-list", role: "tablist", "aria-label": "Periodos del año lectivo 2026", "aria-orientation": "vertical" }, periods[0].map(function (x) {
        var s = PST[x.status];
        return h("button", { key: x.id, type: "button", role: "tab", "aria-selected": x.id === sel[0], className: "ns-period-item", onClick: function () { sel[1](x.id); } },
          h("strong", null, x.name), h("span", { className: "ns-caption" }, x.open.split("-").reverse().slice(0, 2).join("/") + " – " + x.close.split("-").reverse().slice(0, 2).join("/")), h(Badge, { tone: s[1], icon: s[2] }, s[0]));
      })),
      h(Block, { className: "ns-period-editor" },
        h(BlockTitle, { action: h(Badge, { tone: PST[p.status][1], icon: PST[p.status][2] }, PST[p.status][0]) }, p.name + " · 2026"),
        locked ? h("p", { className: "ns-sensitive" }, h(Icon, { name: "lock", size: 16 }), "Este periodo está cerrado. Sus porcentajes se conservan como parte del historial.") : null,
        h("div", { className: "ns-form-grid" },
          h(Select, { label: "Año lectivo", value: "2026", options: ["2026"], disabled: locked }),
          h(Select, { label: "Estado", value: p.status, onChange: function (v) { upd({ status: v }); }, options: [{ value: "draft", label: "Borrador" }, { value: "open", label: "Abierto" }, { value: "closed", label: "Cerrado" }] }),
          h(Input, { label: "Fecha de apertura", type: "date", value: p.open, readOnly: locked, onChange: function (e) { upd({ open: e.target.value }); } }),
          h(Input, { label: "Fecha de cierre", type: "date", value: p.close, readOnly: locked, onChange: function (e) { upd({ close: e.target.value }); }, error: badDates ? "La fecha de cierre debe ser posterior a la apertura." : null })),
        h("h3", { className: "ns-subhead" }, "Distribución de la nota"),
        locked ? h(PeriodWeightReadonly, { items: p.items }) : h(PeriodWeightEditor, { items: p.items, onChange: function (items) { upd({ items: items }); } }),
        locked ? null : h("div", { className: "ns-reg-actions" }, h("span"), h(Button, { icon: "check", disabled: total !== 100 || badDates, onClick: function () { toast[0]({ tone: "success", title: "Periodo guardado", message: p.name + " · " + p.items.map(function (x) { return x.weight + "% " + x.name; }).join(" · ") }); } }, "Guardar periodo")))),
      toast[1]);
  }
  function PeriodWeightReadonly(props) {
    return h("div", { className: "ns-weight-bar ns-weight-bar--edit", role: "img", "aria-label": props.items.map(function (x) { return x.name + " " + x.weight + "%"; }).join(", ") },
      props.items.map(function (x, i) { return h("span", { key: i, className: "ns-weight-seg ns-weight-seg--t" + (i % 5), style: { flex: x.weight } }, x.weight + "% " + x.name); }));
  }
  function PeriodsPage(props) {
    return h(RoleShell, { role: "admin", active: "periods", onNavigate: props.onNavigate, onLogout: props.onLogout, style: props.style },
      h(Header, { eyebrow: "Año lectivo 2026", title: "Periodos Académicos", highlight: "Académicos", description: "Fechas de apertura y cierre, estado y cómo se compone la nota de cada periodo.", actions: h(Button, { variant: "secondary", icon: "plus" }, "Crear periodo") }),
      h(PeriodConfigurator, null));
  }

  /* ---------- Boletines ---------- */
  var PERF = function (g) { return g >= 4.6 ? "Superior" : g >= 4.0 ? "Alto" : g >= 3.0 ? "Básico" : "Bajo"; };
  var SUBJECT_GOAL = {
    "Matemáticas": "resuelve problemas con ecuaciones lineales, proporcionalidad y porcentajes",
    "Física": "explica el movimiento rectilíneo y aplica las leyes de Newton en situaciones cotidianas",
    "Lengua Castellana": "comprende, interpreta y produce textos narrativos y argumentativos",
    "Inglés": "se comunica en situaciones cotidianas usando el presente y el pasado simple",
    "Ciencias Naturales": "explica la estructura de la célula y los procesos de nutrición en los seres vivos",
    "Tecnología": "diseña soluciones sencillas con algoritmos y herramientas digitales"
  };
  function conceptFor(subject, grade, absences, prev) {
    var c = SUBJECT_GOAL[subject] || "alcanza los logros propuestos para el periodo";
    var p = PERF(grade), v = (subject.length + Math.round(grade * 10)) % 3, t;
    var NEXT = {
      Superior: ["Demuestra autonomía, argumenta sus procesos y apoya el aprendizaje de sus compañeros.", "Sus trabajos son rigurosos y creativos; se le invita a asumir retos de profundización.", "Participa con criterio y lidera el trabajo en equipo de manera ejemplar."],
      Alto: ["Cumple con sus compromisos; puede profundizar en la presentación ordenada de sus procedimientos.", "Participa activamente; le falta precisión en algunos ejercicios de mayor complejidad.", "Su desempeño es constante; se recomienda revisar con más cuidado antes de entregar."],
      "Básico": ["Debe reforzar la práctica diaria y la entrega puntual de talleres para consolidar lo aprendido.", "Comprende lo esencial, pero necesita más práctica autónoma y preguntar sus dudas a tiempo.", "Se sugiere repasar los temas del periodo y aprovechar las tutorías de la tarde."],
      Bajo: ["Se recomienda plan de mejoramiento, asistencia a las tutorías y acompañamiento en casa.", "Presenta vacíos en los temas base; debe realizar las actividades de recuperación programadas.", "Requiere compromiso con la entrega de trabajos y acompañamiento cercano de la familia."]
    };
    var OPEN = { Superior: "Alcanza de manera sobresaliente el logro: ", Alto: "Alcanza satisfactoriamente el logro: ", "Básico": "Alcanza el logro mínimo: ", Bajo: "Aún no alcanza el logro: " };
    t = OPEN[p] + c + ". " + NEXT[p][v];
    if (prev !== undefined && !isNaN(prev)) { var d = Math.round((grade - prev) * 10) / 10; if (d >= .3) t += " Mejoró " + formatGrade(d) + " frente al periodo anterior."; else if (d <= -.3) t += " Bajó " + formatGrade(-d) + " frente al periodo anterior; conviene revisar sus causas."; }
    if (absences >= 2) t += " Registra " + absences + " faltas en el periodo.";
    return t;
  }
  /* Periodos del año: los configura Secretaría (Periodos Académicos). Peso de cada periodo en la nota final. */
  var PERIOD_SETUP = { names: ["Periodo 1", "Periodo 2", "Periodo 3", "Periodo 4"], weights: [25, 25, 25, 25] };
  function periodIndex(p) { var n = parseInt(String(p || "Periodo 3").replace(/\D/g, ""), 10); return isNaN(n) ? 3 : Math.max(1, Math.min(PERIOD_SETUP.names.length, n)); }
  function cumulative(vals) {
    var sw = 0, sum = 0;
    vals.forEach(function (v, i) { var w = PERIOD_SETUP.weights[i] || 0; sum += v * w; sw += w; });
    return sw ? Math.round(sum / sw * 10) / 10 : NaN;
  }
  function subjectGrades(s, period) {
    var N = periodIndex(period || "Periodo 3");
    return SUBJECTS.map(function (sub, i) {
      var id = Number(s.id);
      var g3 = Math.max(1.5, Math.min(5, Math.round((s.avg + (seeded(id + i) - .5) * 1.2) * 10) / 10));
      var all = [
        Math.max(1.5, Math.min(5, Math.round((g3 + (seeded(id * 7 + i) - .6) * .8) * 10) / 10)),
        Math.max(1.5, Math.min(5, Math.round((g3 + (seeded(id * 13 + i) - .55) * .6) * 10) / 10)),
        g3,
        Math.max(1.5, Math.min(5, Math.round((g3 + (seeded(id * 19 + i) - .4) * .6) * 10) / 10))
      ];
      var periods = all.slice(0, N), g = periods[N - 1], prev = N > 1 ? periods[N - 2] : undefined;
      var abs = Math.round(seeded(id * 3 + i + N) * 3);
      return { subject: sub.name, grade: g, periods: periods, cumulative: cumulative(periods), p1: all[0], p2: all[1], absences: abs, teacher: (TEACHERS.filter(function (t) { return t.subjects[0] === sub.name; })[0] || TEACHERS[0]).name, concept: conceptFor(sub.name, g, abs, prev) };
    });
  }
  function directorMessage(s, rows, avg) {
    var sorted = rows.slice().sort(function (a, b) { return b.grade - a.grade; });
    var best = sorted[0], low = sorted[sorted.length - 1], name = s.first.split(" ")[0];
    var open = avg >= 4.6 ? name + " cerró el periodo con un desempeño superior que refleja disciplina y gusto por aprender."
      : avg >= 4 ? name + " tuvo un periodo muy positivo: es responsable, participa en clase y mantiene buenas relaciones con sus compañeros."
        : avg >= 3 ? name + " cumplió con los procesos del periodo y muestra disposición para mejorar."
          : name + " atravesó un periodo difícil y necesita nuestro acompañamiento cercano para recuperar el ritmo.";
    var mid = " Se destaca en " + best.subject + " (" + formatGrade(best.grade) + ")" + (low.grade < 4 ? " y debe concentrar su esfuerzo en " + low.subject + " (" + formatGrade(low.grade) + ")" : "") + ".";
    var att = s.attendance >= 95 ? " Su asistencia es ejemplar." : " Le pedimos cuidar la asistencia y la puntualidad.";
    var close = avg < 3 ? " Invitamos a la familia a una reunión para acordar un plan de mejoramiento." : " Contamos con el apoyo de la familia para seguir creciendo en el próximo periodo.";
    return open + mid + att + close;
  }
  function ReportCardDocument(props) {
    var period = props.period || "Periodo 3", N = periodIndex(period);
    var s = props.student, rows = subjectGrades(s, period);
    var avg = Math.round(rows.reduce(function (a, r) { return a + r.grade; }, 0) / rows.length * 10) / 10;
    var cum = Math.round(rows.reduce(function (a, r) { return a + r.cumulative; }, 0) / rows.length * 10) / 10;
    var director = TEACHERS[COURSES.indexOf(s.course) % TEACHERS.length].name;
    var past = []; for (var k = 1; k < N; k++) past.push(k);
    var cols = 5 + past.length;
    var wText = PERIOD_SETUP.names.map(function (n, i) { return "P" + (i + 1) + " " + PERIOD_SETUP.weights[i] + "%"; }).join(" · ");
    return h("article", { className: cx("ns-paper", props.compact && "ns-paper--compact"), "aria-label": "Boletín de " + s.name + ", " + period },
      h("header", { className: "ns-paper-head" },
        h("div", { className: "ns-paper-crest", "aria-hidden": true }, h("span", null, "LA")),
        h("div", null, h("strong", { className: "ns-paper-school" }, "Colegio Los Andes"), h("span", null, "Pasto, Nariño · Resolución 0123 de 2015 · DANE 152001000000")),
        h("div", { className: "ns-paper-title" }, h("span", null, "Informe académico"), h("strong", null, period + " · 2026"), h("small", null, "Periodo " + N + " de " + PERIOD_SETUP.names.length))),
      h("section", { className: "ns-paper-student" },
        [["Estudiante", s.name], ["Documento", s.document], ["Grado", GRADE_NAME[s.grade]], ["Curso", s.course], ["Director de grupo", director], ["Puesto en el curso", (1 + Math.floor(seeded(Number(s.id) + N) * 12)) + " de 12"]].map(function (x) { return h("div", { key: x[0] }, h("span", null, x[0]), h("strong", null, x[1])); })),
      h("table", { className: "ns-paper-table ns-paper-table--rich" },
        h("caption", { className: "ns-sr" }, "Calificaciones de " + period + " por materia, periodos anteriores, acumulado y concepto de cada docente"),
        h("thead", null, h("tr", null,
          h("th", { scope: "col" }, "Área / Materia"),
          past.map(function (k) { return h("th", { key: k, scope: "col", className: "is-num" }, "P" + k); }),
          h("th", { scope: "col", className: "is-num is-current" }, "Nota del periodo", h("small", null, "P" + N)),
          h("th", { scope: "col", className: "is-num is-cum" }, "Acumulado", h("small", null, N === 1 ? "P1" : "P1–P" + N)),
          h("th", { scope: "col" }, "Desempeño"), h("th", { scope: "col", className: "is-num" }, "Faltas"))),
        rows.map(function (r) {
          return h("tbody", { key: r.subject, className: "ns-paper-subject" },
            h("tr", null,
              h("th", { scope: "row" }, r.subject, h("small", null, r.teacher)),
              past.map(function (k) { return h("td", { key: k, className: "is-num is-past" }, formatGrade(r.periods[k - 1])); }),
              h("td", { className: "is-grade is-current" }, formatGrade(r.grade)),
              h("td", { className: "is-grade is-cum" }, formatGrade(r.cumulative)),
              h("td", null, h("span", { className: "ns-perf ns-perf--" + PERF(r.grade).toLowerCase() }, PERF(r.grade))),
              h("td", { className: "is-num" }, r.absences)),
            h("tr", { className: "ns-paper-concept" }, h("td", { colSpan: cols }, h("span", null, "Concepto del docente"), r.concept)));
        }),
        h("tfoot", null, h("tr", null, h("th", { scope: "row", colSpan: 1 + past.length }, "Promedio"), h("td", { className: "is-grade is-current" }, formatGrade(avg)), h("td", { className: "is-grade is-cum" }, formatGrade(cum)), h("td", null, PERF(avg)), h("td", { className: "is-num" }, rows.reduce(function (a, r) { return a + r.absences; }, 0))))),
      h("p", { className: "ns-paper-note" }, "Desempeño según la nota del periodo. El acumulado pondera los periodos cursados con los pesos que configura Secretaría (" + wText + ")."),
      h("div", { className: "ns-paper-cols" },
        h("section", null, h("h4", null, "Asistencia"), h("p", null, s.attendance + "% de asistencia · " + rows.reduce(function (a, r) { return a + r.absences; }, 0) + " faltas registradas en el periodo")),
        h("section", null, h("h4", null, "Escala de valoración"), h("p", null, "Superior 4.6–5.0 · Alto 4.0–4.5 · Básico 3.0–3.9 · Bajo 1.0–2.9 (Decreto 1290 de 2009)"))),
      h("section", { className: "ns-paper-msg" },
        h("h4", null, "Mensaje del director de grupo"),
        h("p", null, directorMessage(s, rows, avg)),
        h("span", { className: "ns-paper-msg-by" }, "— " + director + ", director(a) de grupo " + s.course)),
      h("footer", { className: "ns-paper-sign" },
        h("div", null, h("em", { className: "ns-paper-signature", "aria-hidden": true }, director.split(" ").slice(0, 2).join(" ")), h("span", null), h("strong", null, director), "Director(a) de grupo · " + s.course),
        h("div", null, h("em", { className: "ns-paper-signature", "aria-hidden": true }, "H. Villota"), h("span", null), h("strong", null, "Hernando Villota"), "Rector"),
        h("div", { className: "ns-paper-seal", "aria-hidden": true }, "NotaScan.", h("small", null, "Verificado"))));
  }

  /* ---------- Conceptos del periodo (docente) · la IA propone, el docente decide ---------- */
  var CONCEPT_STATE = { empty: ["Sin concepto", "pending", "clock"], ai: ["Borrador de IA · revisar", "medium", "ai"], teacher: ["Escrito por el docente", "neutral", "edit"], reviewed: ["Revisado", "verified", "check"] };
  function ConceptEditor(props) {
    var subject = props.subject || "Matemáticas";
    var rows = useState(ALL_STUDENTS.filter(function (s) { return s.course === "7A" && s.status !== "retired"; }).map(function (s, i) {
      var g = subjectGrades(s).filter(function (x) { return x.subject === subject; })[0];
      return { id: s.id, name: s.name, grade: g.grade, prev: g.periods[g.periods.length - 2], absences: g.absences, text: i < 2 ? g.concept : "", state: i === 0 ? "reviewed" : i === 1 ? "ai" : "empty", busy: false };
    }));
    var toast = useToast(), confirm = useState(false);
    function upd(id, patch) { rows[1](function (rs) { return rs.map(function (r) { return r.id === id ? Object.assign({}, r, patch) : r; }); }); }
    function suggest(list) {
      list.forEach(function (r, k) {
        upd(r.id, { busy: true });
        setTimeout(function () { upd(r.id, { busy: false, text: conceptFor(subject, r.grade, r.absences, r.prev), state: "ai" }); }, 700 + k * 180);
      });
    }
    var c = { empty: 0, ai: 0, teacher: 0, reviewed: 0 }; rows[0].forEach(function (r) { c[r.state]++; });
    var done = c.reviewed + c.teacher, total = rows[0].length;
    return h(Fragment, null,
      h("div", { className: "ns-ai-banner", role: "note" },
        h("span", { className: "ns-ai-banner-icon", "aria-hidden": true }, h(Icon, { name: "ai", size: 20 })),
        h("div", null, h("strong", null, "La IA te propone un borrador; tú decides el texto final."), h("span", null, "Lo redacta a partir de la nota del periodo, su evolución y las faltas. Ningún concepto llega al boletín sin tu revisión.")),
        h(Button, { variant: "secondary", icon: "ai", disabled: !c.empty, onClick: function () { suggest(rows[0].filter(function (r) { return r.state === "empty"; })); } }, c.empty ? "Sugerir los " + c.empty + " vacíos" : "Sin conceptos vacíos")),
      h("div", { className: "ns-concept-progress" }, h(ProgressBar, { label: done + " de " + total + " conceptos listos para el boletín", value: done, total: total, showValue: true, tone: done === total ? "sage" : "gold" })),
      h("ul", { className: "ns-concepts" }, rows[0].map(function (r) {
        var st = CONCEPT_STATE[r.state];
        return h("li", { key: r.id, className: cx("ns-concept", "is-" + r.state) },
          h("div", { className: "ns-concept-head" },
            h(Avatar, { name: r.name, size: "sm" }),
            h("div", { className: "ns-concept-who" }, h("strong", null, r.name), h("span", { className: "ns-caption" }, "Periodo 2: " + formatGrade(r.prev) + " · Faltas: " + r.absences)),
            h("span", { className: "ns-concept-grade" }, formatGrade(r.grade), h("small", null, PERF(r.grade))),
            h(Badge, { tone: st[1], icon: st[2] }, st[0])),
          h("label", { className: "ns-sr", htmlFor: "cpt-" + r.id }, "Concepto de " + r.name),
          h("textarea", { id: "cpt-" + r.id, className: cx("ns-input ns-textarea", r.state === "ai" && "is-ai"), rows: 3, value: r.busy ? "" : r.text, placeholder: r.busy ? "La IA está redactando un borrador…" : "Escribe el concepto o pide una sugerencia.", disabled: r.busy,
            onChange: function (e) { upd(r.id, { text: e.target.value, state: e.target.value.trim() ? (r.state === "ai" || r.state === "reviewed" ? "teacher" : "teacher") : "empty" }); } }),
          h("div", { className: "ns-concept-actions" },
            h(Button, { size: "sm", variant: "ghost", icon: "ai", loading: r.busy, loadingText: "Redactando…", onClick: function () { suggest([r]); } }, r.text ? "Sugerir otra redacción" : "Sugerir con IA"),
            r.state === "ai" ? h(Button, { size: "sm", icon: "check", onClick: function () { upd(r.id, { state: "reviewed" }); } }, "Aprobar borrador") : null));
      })),
      h("div", { className: "ns-sticky-cta" }, h(Button, { size: "lg", icon: "book", onClick: function () { confirm[1](true); } }, "Enviar a boletines")),
      h(ConfirmAction, { open: confirm[0], icon: "book", onCancel: function () { confirm[1](false); }, title: done === total ? "¿Enviar " + total + " conceptos a boletines?" : "Faltan " + (total - done) + " conceptos por revisar",
        description: done === total ? "Aparecerán en el boletín del Periodo 3 junto a la nota de " + subject + "." : "Solo se enviarán los " + done + " conceptos revisados o escritos por ti. Los borradores de IA sin revisar no se publican.",
        confirmLabel: done === total ? "Enviar a boletines" : "Enviar los " + done + " listos", onConfirm: function () { confirm[1](false); toast[0]({ tone: "success", title: "Conceptos enviados", message: done + " conceptos de " + subject + " · 7A quedaron en los boletines." }); } }),
      toast[1]);
  }
  function ConceptsPage(props) {
    return h(RoleShell, { role: "teacher", active: "concepts", onNavigate: props.onNavigate, onLogout: props.onLogout, style: props.style },
      h(Header, { eyebrow: "Matemáticas · 7A · Periodo 3", title: "Conceptos del periodo", highlight: "Conceptos", description: "El concepto que acompaña la nota de cada estudiante en el boletín. La IA te ayuda con el primer borrador." }),
      h(ConceptEditor, null));
  }

  function ReportCardManager(props) {
    var course = useState("7A"), period = useState("Periodo 3"), status = useState("all"), preview = useState(null), toast = useToast(), confirmAll = useState(false);
    var gen = useState({});
    var rows = ALL_STUDENTS.filter(function (s) { return s.course === course[0] && s.status !== "retired"; }).map(function (s) {
      var blocked = !(s.library && s.fees && s.documents);
      return Object.assign({}, s, { rc: blocked ? "blocked" : gen[0][s.id] ? "generated" : "pending" });
    }).filter(function (s) { return status[0] === "all" || s.rc === status[0]; });
    var RC = { pending: ["Pendiente", "pending", "clock"], generated: ["Generado", "verified", "check"], blocked: ["Bloqueado · paz y salvo", "review", "lock"] };
    function generate(list) { var o = Object.assign({}, gen[0]); var n = 0; list.forEach(function (s) { if (s.rc !== "blocked") { o[s.id] = true; n++; } }); gen[1](o); toast[0]({ tone: "success", title: n + (n === 1 ? " boletín generado" : " boletines generados"), message: "PDF listos para descargar · " + period[0] }); }
    return h(Fragment, null,
      h(DataGrid, { caption: "Boletines por estudiante", rows: rows, selectable: true, pageSize: 12, density: "compact", resetKey: course[0] + status[0],
        toolbar: h(Fragment, null,
          h(FilterGroup, { as: "select", label: "Grado", value: course[0].charAt(0), onChange: function (g) { course[1](g + "A"); }, options: ["6", "7", "8"].map(function (g) { return { value: g, label: GRADE_NAME[g] }; }) }),
          h(FilterGroup, { as: "select", label: "Curso", value: course[0], onChange: course[1], options: COURSES.filter(function (c) { return c.charAt(0) === course[0].charAt(0); }).map(function (c) { return { value: c, label: c }; }) }),
          h(FilterGroup, { as: "select", label: "Periodo", value: period[0], onChange: period[1], options: PERIODS.map(function (p) { return { value: p, label: p }; }) }),
          h(FilterGroup, { label: "Estado", value: status[0], onChange: status[1], options: [{ value: "all", label: "Todos" }, { value: "pending", label: "Pendiente" }, { value: "generated", label: "Generado" }, { value: "blocked", label: "Bloqueado" }] })),
        bulkActions: function (sel, clear) { return h(Button, { size: "sm", icon: "book", onClick: function () { generate(sel); clear(); } }, "Generar selección"); },
        columns: [
          { key: "name", label: "Estudiante", header: true, sortable: true, render: function (r) { return h("div", { className: "ns-cell-link ns-cell-link--static" }, h(Avatar, { name: r.name, size: "sm" }), r.name); } },
          { key: "course", label: "Curso", render: function (r) { return h("span", { className: "ns-course-tag" }, r.course); } },
          { key: "avg", label: "Promedio", numeric: true, sortable: true, render: function (r) { return h("span", { className: "ns-table-grade" }, formatGrade(r.avg)); } },
          { key: "rc", label: "Estado", sortable: true, render: function (r) { var s = RC[r.rc]; return h(Badge, { tone: s[1], icon: s[2] }, s[0]); } }],
        rowActions: function (r) { return [h(Button, { key: "p", size: "sm", variant: "ghost", icon: "eye", onClick: function () { preview[1](r); } }, "Previsualizar"), h(IconAction, { key: "g", icon: "download", label: "Generar PDF de " + r.name, disabled: r.rc === "blocked", onClick: function () { generate([r]); } })]; } }),
      h(ConfirmAction, { open: confirmAll[0], icon: "book", onCancel: function () { confirmAll[1](false); }, title: "¿Generar todos los boletines de " + course[0] + "?", description: "Los estudiantes con paz y salvo bloqueado se omiten automáticamente.", confirmLabel: "Generar todos", onConfirm: function () { confirmAll[1](false); generate(rows); } }),
      h(Modal, { open: !!preview[0], onClose: function () { preview[1](null); }, size: "doc", title: "Vista previa del boletín", description: preview[0] ? preview[0].name + " · " + period[0] : "",
        actions: [h(Button, { key: "c", variant: "secondary", onClick: function () { preview[1](null); }, "data-autofocus": true }, "Cerrar"), preview[0] && preview[0].rc !== "blocked" ? h(Button, { key: "g", icon: "download", onClick: function () { generate([preview[0]]); preview[1](null); } }, "Generar PDF") : h(Badge, { key: "b", tone: "review", icon: "lock" }, "Bloqueado por paz y salvo")] },
        preview[0] ? h("div", { className: "ns-paper-scroll" }, h(ReportCardDocument, { student: preview[0], period: period[0] })) : null),
      h("div", { className: "ns-sticky-cta" }, h(Button, { size: "lg", icon: "book", onClick: function () { confirmAll[1](true); } }, "Generar todos")),
      toast[1]);
  }
  function ReportCardsPage(props) {
    return h(RoleShell, { role: "admin", active: "reportcards", onNavigate: props.onNavigate, onLogout: props.onLogout, style: props.style },
      h(Header, { eyebrow: "Periodo 3 · 2026", title: "Boletines", highlight: "Boletines", description: "Previsualiza y genera boletines en PDF. Los estudiantes sin paz y salvo quedan bloqueados." }),
      h(ReportCardManager, null));
  }

  /* ---------- Paz y Salvos ---------- */
  function PazYSalvosTable(props) {
    var rows = useState(ALL_STUDENTS.filter(function (s) { return s.status === "active" || s.status === "pending"; })), course = useState("7A"), only = useState("all"), toast = useToast();
    function upd(id, k, v) { rows[1](rows[0].map(function (r) { if (r.id !== id) return r; var o = Object.assign({}, r); o[k] = v; return o; })); }
    var list = rows[0].filter(function (r) { var ok = r.library && r.fees && r.documents; return (course[0] === "all" || r.course === course[0]) && (only[0] === "all" || (only[0] === "blocked" ? !ok : ok)); });
    var blocked = rows[0].filter(function (r) { return r.course === course[0] && !(r.library && r.fees && r.documents); }).length;
    function sw(r, k, label) { return h(Switch, { ariaLabel: label + " de " + r.name, checked: r[k], onChange: function (v) { upd(r.id, k, v); }, onText: "Al día", offText: "Pendiente" }); }
    return h(Fragment, null,
      h(DataGrid, { caption: "Paz y salvos por estudiante", rows: list, selectable: true, pageSize: 12, density: "compact", resetKey: course[0] + only[0],
        toolbar: h(Fragment, null,
          h(FilterGroup, { as: "select", label: "Curso", value: course[0], onChange: course[1], options: [{ value: "all", label: "Todos" }].concat(COURSES.map(function (c) { return { value: c, label: c }; })) }),
          h(FilterGroup, { label: "Acceso", value: only[0], onChange: only[1], options: [{ value: "all", label: "Todos" }, { value: "blocked", label: "Bloqueado", count: blocked }, { value: "ok", label: "Habilitado" }] })),
        bulkActions: function (sel, clear) { return [h(Button, { key: "d", size: "sm", variant: "secondary", icon: "check", onClick: function () { rows[1](rows[0].map(function (r) { return sel.some(function (x) { return x.id === r.id; }) ? Object.assign({}, r, { documents: true }) : r; })); clear(); toast[0]({ tone: "success", title: "Documentos al día", message: sel.length + " estudiantes actualizados." }); } }, "Marcar documentos al día")]; },
        columns: [
          { key: "name", label: "Estudiante", header: true, sortable: true, render: function (r) { return h("div", { className: "ns-cell-link ns-cell-link--static" }, h(Avatar, { name: r.name, size: "sm" }), h("span", null, r.name, h("small", { className: "ns-caption", style: { display: "block" } }, r.course))); } },
          { key: "library", label: "Biblioteca", render: function (r) { return sw(r, "library", "Biblioteca"); } },
          { key: "fees", label: "Pensiones", render: function (r) { return sw(r, "fees", "Pensiones"); } },
          { key: "documents", label: "Documentos", render: function (r) { return sw(r, "documents", "Documentos"); } },
          { key: "general", label: "Estado general", render: function (r) { var n = [r.library, r.fees, r.documents].filter(Boolean).length; return h("span", { className: "ns-caption", style: { color: "var(--navy)", fontWeight: 700 } }, n + " de 3 al día"); } },
          { key: "access", label: "Reportes y boletines", sortValue: function (r) { return r.library && r.fees && r.documents ? 1 : 0; }, sortable: true, render: function (r) { var ok = r.library && r.fees && r.documents; return h(Badge, { tone: ok ? "verified" : "review", icon: ok ? "check" : "lock" }, ok ? "Habilitado" : "Bloqueado"); } }] }),
      toast[1]);
  }
  function ClearancesPage(props) {
    return h(RoleShell, { role: "admin", active: "clearances", onNavigate: props.onNavigate, onLogout: props.onLogout, style: props.style },
      h(Header, { eyebrow: "Control administrativo", title: "Paz y Salvos", highlight: "Salvos", description: "Si alguna obligación está pendiente, los reportes y boletines del estudiante quedan bloqueados para el acudiente." }),
      h(PazYSalvosTable, null));
  }

  /* ---------- Ranking académico ---------- */
  function exportCSV(name, head, rows) {
    try {
      var csv = "﻿" + [head].concat(rows).map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(";"); }).join("\n");
      var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    } catch (e) { /* algunos visores bloquean descargas */ }
  }
  function RankingTable(props) {
    var grade = useState("all"), course = useState("all"), period = useState("Periodo 3"), subject = useState("all"), toast = useToast();
    var list = ALL_STUDENTS.filter(function (s) { return s.status === "active" && (grade[0] === "all" || s.grade === grade[0]) && (course[0] === "all" || s.course === course[0]); }).map(function (s) {
      var g = subject[0] === "all" ? s.avg : subjectGrades(s).filter(function (x) { return x.subject === subject[0]; })[0].grade;
      return Object.assign({}, s, { score: g });
    }).sort(function (a, b) { return b.score - a.score; }).map(function (s, i) { return Object.assign({}, s, { pos: i + 1 }); });
    var ST = function (s) { return s.score >= 4.6 ? ["Destacado", "high", "star"] : s.score >= 3 ? ["Aprobado", "verified", "check"] : ["En riesgo", "review", "warning"]; };
    return h(Fragment, null,
      h(DataGrid, { caption: "Ranking académico", rows: list, pageSize: 15, densityToggle: true, density: "compact", initialSort: { key: "pos", dir: "asc" }, resetKey: grade[0] + course[0] + subject[0] + period[0],
        toolbar: h(Fragment, null,
          h(FilterGroup, { as: "select", label: "Año", value: "2026", options: [{ value: "2026", label: "2026" }, { value: "2025", label: "2025" }] }),
          h(FilterGroup, { as: "select", label: "Periodo", value: period[0], onChange: period[1], options: PERIODS.map(function (p) { return { value: p, label: p }; }).concat([{ value: "Año", label: "Acumulado anual" }]) }),
          h(FilterGroup, { as: "select", label: "Grado", value: grade[0], onChange: function (v) { grade[1](v); course[1]("all"); }, options: [{ value: "all", label: "Todos" }, { value: "6", label: "Sexto" }, { value: "7", label: "Séptimo" }, { value: "8", label: "Octavo" }] }),
          h(FilterGroup, { as: "select", label: "Curso", value: course[0], onChange: course[1], options: [{ value: "all", label: "Todos" }].concat(COURSES.filter(function (c) { return grade[0] === "all" || c.charAt(0) === grade[0]; }).map(function (c) { return { value: c, label: c }; })) }),
          h(FilterGroup, { as: "select", label: "Materia", value: subject[0], onChange: subject[1], options: [{ value: "all", label: "Todas" }].concat(SUBJECTS.map(function (s) { return { value: s.name, label: s.name }; })) }),
          h(Button, { size: "sm", variant: "secondary", icon: "download", onClick: function () { exportCSV("ranking_" + period[0].replace(" ", "_") + ".csv", ["Posición", "Estudiante", "Curso", "Promedio", "Materias aprobadas", "Estado"], list.map(function (s) { return [s.pos, s.name, s.course, formatGrade(s.score), s.subjectsPassed + "/6", ST(s)[0]]; })); toast[0]({ tone: "success", title: "Ranking exportado a Excel", message: list.length + " estudiantes · " + period[0] }); } }, "Exportar a Excel")),
        columns: [
          { key: "pos", label: "Posición", numeric: true, sortable: true, render: function (s) { return s.pos <= 3 ? h("span", { className: "ns-medal ns-medal--" + s.pos, "aria-label": "Puesto " + s.pos }, s.pos) : h("span", { className: "ns-pos" }, s.pos); } },
          { key: "name", label: "Estudiante", sortable: true, header: true, render: function (s) { return h("div", { className: "ns-cell-link ns-cell-link--static" }, h(Avatar, { name: s.name, size: "sm" }), s.name); } },
          { key: "course", label: "Curso", sortable: true, render: function (s) { return h("span", { className: "ns-course-tag" }, s.course); } },
          { key: "score", label: subject[0] === "all" ? "Promedio" : "Nota en " + subject[0], numeric: true, sortable: true, render: function (s) { return h("span", { className: "ns-table-grade" }, formatGrade(s.score)); } },
          { key: "subjectsPassed", label: "Materias aprobadas", numeric: true, sortable: true, render: function (s) { return s.subjectsPassed + " / 6"; } },
          { key: "state", label: "Estado", sortValue: function (s) { return s.score; }, sortable: true, render: function (s) { var x = ST(s); return h(Badge, { tone: x[1], icon: x[2] }, x[0]); } }] }),
      toast[1]);
  }
  function RankingPage(props) {
    return h(RoleShell, { role: props.role || "admin", active: "ranking", onNavigate: props.onNavigate, onLogout: props.onLogout, style: props.style },
      h(Header, { eyebrow: "Año lectivo 2026", title: "Ranking Académico", highlight: "Académico", description: "Ordena, filtra y exporta el desempeño por periodo, grado, curso o materia." }),
      h(RankingTable, null));
  }
  function UsersOrStructure() { return null; }

  /* =====================================================================
     RECTORÍA · panorama, supervisión y decisiones
     ===================================================================== */
  var GRADE_AVG = [{ label: "Sexto", value: 3.9 }, { label: "Séptimo", value: 3.7 }, { label: "Octavo", value: 3.4 }, { label: "Noveno", value: 3.6 }, { label: "Décimo", value: 3.8 }, { label: "Undécimo", value: 4.0 }];
  var EVOL = { labels: PERIODS.concat([]).map(function (p) { return p.replace("Periodo ", "P"); }), now: [3.6, 3.7, 3.8, 3.8], prev: [3.5, 3.5, 3.6, 3.7] };
  var ABSENCE = [{ label: "Sexto", value: 5 }, { label: "Séptimo", value: 6 }, { label: "Octavo", value: 9 }, { label: "Noveno", value: 7 }, { label: "Décimo", value: 4 }, { label: "Undécimo", value: 3 }];
  var REQUESTS = [
    { id: 245, teacher: "Laura Benavides", student: "Juan Sebastián Martínez Paz", course: "7A", subject: "Lengua Castellana", from: 4.2, to: 4.7, reason: "Corrección de evaluación", detail: "Al revisar el examen se encontró una pregunta mal calificada (punto 4). Se adjunta la hoja escaneada.", date: "1 oct 2026, 08:15", status: "pending", history: [["Creada por Laura Benavides", "1 oct, 08:15"]] },
    { id: 244, teacher: "Carlos Pérez", student: "Valentina Guerrero Ortiz", course: "8A", subject: "Física", from: 2.8, to: 3.2, reason: "Error de digitación", detail: "La nota registrada en la planilla no coincide con la hoja física del taller 2.", date: "30 sep 2026, 16:40", status: "pending", history: [["Creada por Carlos Pérez", "30 sep, 16:40"]] },
    { id: 243, teacher: "Diana Cabrera", student: "Mateo Bravo Rosero", course: "6B", subject: "Ciencias Naturales", from: 3.0, to: 3.6, reason: "Recuperación aprobada", detail: "El estudiante presentó la actividad de recuperación del Periodo 2.", date: "29 sep 2026, 10:02", status: "pending", history: [["Creada por Diana Cabrera", "29 sep, 10:02"]] },
    { id: 241, teacher: "Ana Lucía Rosero", student: "Sara Lucía Cabrera Paz", course: "7B", subject: "Matemáticas", from: 3.9, to: 4.3, reason: "Corrección de evaluación", detail: "Revisión solicitada por la acudiente; procede.", date: "26 sep 2026, 11:30", status: "approved", history: [["Creada por Ana Lucía Rosero", "26 sep, 11:30"], ["Aprobada por Hernando Villota", "26 sep, 15:12"]] },
    { id: 238, teacher: "Jorge Insuasty", student: "Tomás Ordóñez Mora", course: "8B", subject: "Inglés", from: 2.5, to: 3.5, reason: "Ajuste de nota", detail: "Sin soporte adjunto.", date: "22 sep 2026, 09:45", status: "rejected", history: [["Creada por Jorge Insuasty", "22 sep, 09:45"], ["Rechazada por Hernando Villota: falta el soporte de la evaluación", "22 sep, 12:00"]] }
  ];
  var REQ_STATUS = { pending: ["Pendiente", "pending", "clock"], approved: ["Aprobada", "verified", "check"], rejected: ["Rechazada", "review", "close"] };
  var TSTATUS = { ok: ["Al día", "success", "check"], warn: ["Requiere atención", "warning", "warning"], late: ["Retraso", "error", "clock"] };
  function TeacherStatus(props) { var s = TSTATUS[props.status]; return h(StatusDot, { status: s[1], label: s[0] }); }

  function InstitutionalAnalytics(props) {
    var period = useState("Periodo 3");
    return h("div", { className: "ns-col", style: { gap: 24 } },
      props.hideFilters ? null : h("div", { className: "ns-row" },
        h(FilterGroup, { as: "select", label: "Año", value: "2026", options: [{ value: "2026", label: "2026" }] }),
        h(FilterGroup, { as: "select", label: "Periodo", value: period[0], onChange: period[1], options: PERIODS.map(function (p) { return { value: p, label: p }; }) })),
      h("section", { className: "ns-kpis", "aria-label": "Indicadores institucionales" },
        h("div", { className: "ns-kpi ns-kpi--lead" }, h("span", { className: "ns-overline", style: { color: "var(--gold)" } }, "Promedio institucional"), h("strong", null, h(CountUp, { value: "3.8" })), h("span", null, h(Icon, { name: "sortup", size: 14 }), "+0.1 frente al periodo anterior")),
        h("div", { className: "ns-kpi" }, h("span", { className: "ns-overline" }, "Índice de reprobación"), h("strong", null, h(CountUp, { value: "9%" })), h("span", null, h(Icon, { name: "sortdown", size: 14 }), "−2 puntos · 39 estudiantes")),
        h("div", { className: "ns-kpi" }, h("span", { className: "ns-overline" }, "Tasa de inasistencia"), h("strong", null, h(CountUp, { value: "6%" })), h("span", null, h(Icon, { name: "warning", size: 14 }), "Octavo concentra la mayor tasa"))),
      h("div", { className: "ns-charts" },
        h(Block, { className: "ns-chart-block" }, h(BarChart, { title: "Promedio por grado", subtitle: "¿Qué grados están por debajo de la meta institucional?", data: GRADE_AVG, max: 5, ticks: [0, 2.5, 5], target: 3.5, targetLabel: "Meta", seriesLabel: "Promedio", lowBelow: 3.5, format: function (v) { return (Math.round(v * 10) / 10).toFixed(1); } })),
        h(Block, { className: "ns-chart-block" }, h(LineChart, { title: "Evolución del rendimiento", subtitle: "¿Mejoramos frente al año pasado?", labels: EVOL.labels, min: 3, max: 4.2, ticks: [3, 3.6, 4.2], series: [{ name: "2026", points: EVOL.now }, { name: "2025", points: EVOL.prev, tone: "gold", dashed: true }], format: function (v) { return v.toFixed(1); } })),
        h(Block, { className: "ns-chart-block" }, h(DonutChart, { title: "Índice de reprobación", subtitle: "¿Cuántos estudiantes pierden al menos una materia?", centerValue: "9%", centerLabel: "reprueban", data: [{ label: "Aprueban todas", value: 393, tone: "navy" }, { label: "Reprueban 1 o más", value: 39, tone: "gold" }] })),
        h(Block, { className: "ns-chart-block" }, h(BarChart, { title: "Tasa de inasistencia por grado", subtitle: "¿Dónde intervenir primero?", data: ABSENCE, max: 12, ticks: [0, 6, 12], format: function (v) { return Math.round(v) + "%"; } }))));
  }
  function PrincipalDashboardPage(props) {
    function go(id) { if (props.onNavigate) props.onNavigate(id); }
    var pend = REQUESTS.filter(function (r) { return r.status === "pending"; });
    var attention = TEACHERS.filter(function (t) { return t.status !== "ok"; });
    return h(RoleShell, { role: "principal", active: "dashboard", onNavigate: props.onNavigate, onLogout: props.onLogout, style: props.style, counts: { requests: pend.length } },
      h(Header, { eyebrow: "Rectoría · Periodo 3 · 2026", title: "Panorama Institucional", highlight: "Institucional", description: "Cómo va el colegio y qué necesita tu decisión hoy.", actions: h(Button, { iconRight: "arrow", onClick: function () { go("analytics"); } }, "Ver analítica completa") }),
      h("div", { className: "ns-principal-top" },
        h(Block, { tone: "navy", className: "ns-decide" },
          h("div", { className: "ns-row", style: { justifyContent: "space-between" } }, h("span", { className: "ns-overline", style: { color: "var(--gold)" } }, "Esperan tu decisión"), h(Sticker, { tone: "gold", rotate: 3 }, pend.length + " solicitudes")),
          h("ul", { className: "ns-list ns-list--inverse" }, pend.map(function (r) {
            return h("li", { key: r.id, className: "ns-list-item" },
              h("div", { className: "ns-list-main" }, h("strong", null, "Solicitud #" + r.id + " · " + r.subject), h("span", { className: "ns-caption" }, r.teacher + " · " + r.student.split(" ").slice(0, 2).join(" "))),
              h("span", { className: "ns-change" }, formatGrade(r.from), h(Icon, { name: "arrow", size: 14 }), formatGrade(r.to)));
          })),
          h("div", null, h(Button, { iconRight: "arrow", onClick: function () { go("requests"); } }, "Revisar solicitudes"))),
        h(Block, { label: "Docentes que requieren atención" }, h(BlockTitle, { action: h(Button, { variant: "ghost", size: "sm", iconRight: "arrow", onClick: function () { go("teachers"); } }, "Seguimiento") }, "Docentes con pendientes"),
          h("ul", { className: "ns-list" }, attention.map(function (t) {
            return h("li", { key: t.id, className: "ns-list-item" }, h(Avatar, { name: t.name, size: "sm" }), h("div", { className: "ns-list-main" }, h("strong", null, t.name), h("span", { className: "ns-caption" }, t.pending + (t.pending === 1 ? " evaluación pendiente" : " evaluaciones pendientes") + " · " + t.last)), h(TeacherStatus, { status: t.status }));
          })))),
      h(InstitutionalAnalytics, { hideFilters: true }));
  }
  function AnalyticsPage(props) {
    return h(RoleShell, { role: "principal", active: "analytics", onNavigate: props.onNavigate, onLogout: props.onLogout, style: props.style, counts: { requests: 3 } },
      h(Header, { eyebrow: "Analítica", title: "Rendimiento institucional", highlight: "institucional", description: "Cada gráfico responde una pregunta. Pasa el cursor sobre las barras y puntos para ver el detalle.", actions: h(Button, { variant: "secondary", icon: "download" }, "Exportar informe") }),
      h(InstitutionalAnalytics, null));
  }

  function TeacherMonitoringPanel(props) {
    var f = useState("all"), toast = useToast();
    var counts = { ok: 0, warn: 0, late: 0 }; TEACHERS.forEach(function (t) { counts[t.status]++; });
    var list = TEACHERS.filter(function (t) { return f[0] === "all" || t.status === f[0]; });
    return h(Fragment, null,
      h("div", { className: "ns-tstatus-strip", role: "group", "aria-label": "Resumen por estado" }, [["ok", "Verde"], ["warn", "Amarillo"], ["late", "Rojo"]].map(function (x) {
        var s = TSTATUS[x[0]];
        return h("button", { key: x[0], type: "button", className: cx("ns-tstatus", "ns-tstatus--" + x[0]), "aria-pressed": f[0] === x[0], onClick: function () { f[1](f[0] === x[0] ? "all" : x[0]); } },
          h("strong", null, counts[x[0]]), h(StatusDot, { status: s[1], label: s[0] }), h("span", { className: "ns-caption" }, x[1]));
      })),
      h(DataGrid, { caption: "Seguimiento docente", rows: list, paginate: false, initialSort: { key: "pct", dir: "asc" }, resetKey: f[0],
        columns: [
          { key: "name", label: "Docente", header: true, sortable: true, render: function (t) { return h("div", { className: "ns-cell-link ns-cell-link--static" }, h(Avatar, { name: t.name, size: "sm" }), t.name); } },
          { key: "subjects", label: "Materias", render: function (t) { return t.subjects.join(", "); } },
          { key: "courses", label: "Cursos", render: function (t) { return h("div", { className: "ns-row", style: { gap: 4, flexWrap: "nowrap" } }, t.courses.map(function (c) { return h("span", { key: c, className: "ns-course-tag" }, c); })); } },
          { key: "pending", label: "Evaluaciones pendientes", numeric: true, sortable: true },
          { key: "pct", label: "Calificaciones registradas", sortable: true, render: function (t) { return h("div", { style: { minWidth: 150 } }, h(ProgressBar, { value: t.pct, total: 100, showValue: true, label: "", tone: t.pct === 100 ? "sage" : t.pct >= 80 ? "gold" : "burgundy" })); } },
          { key: "last", label: "Última actualización" },
          { key: "status", label: "Estado", sortable: true, sortValue: function (t) { return { ok: 2, warn: 1, late: 0 }[t.status]; }, render: function (t) { return h(TeacherStatus, { status: t.status }); } }],
        rowActions: function (t) { return t.status === "ok" ? null : h(Button, { size: "sm", variant: "secondary", icon: "bell", onClick: function () { toast[0]({ tone: "success", title: "Recordatorio enviado", message: "Se notificó a " + t.name + "." }); } }, "Enviar recordatorio"); } }),
      toast[1]);
  }
  function TeacherMonitoringPage(props) {
    return h(RoleShell, { role: "principal", active: "teachers", onNavigate: props.onNavigate, onLogout: props.onLogout, style: props.style, counts: { requests: 3 } },
      h(Header, { eyebrow: "Supervisión · Periodo 3", title: "Seguimiento Docente", highlight: "Docente", description: "Avance del registro de calificaciones por docente. Verde: al día · Amarillo: requiere atención · Rojo: retraso." }),
      h(TeacherMonitoringPanel, null));
  }

  function AuthorizationInbox(props) {
    var items = useState(REQUESTS.map(function (r) { return Object.assign({}, r); })), tab = useState("pending"), sel = useState(245), confirm = useState(null), note = useState(""), toast = useToast();
    var list = items[0].filter(function (r) { return r.status === tab[0]; });
    var cur = items[0].filter(function (r) { return r.id === sel[0]; })[0];
    if (cur && cur.status !== tab[0]) cur = list[0];
    function decide(kind) {
      var r = cur, now = "1 oct, " + new Date().toTimeString().slice(0, 5);
      items[1](items[0].map(function (x) { return x.id === r.id ? Object.assign({}, x, { status: kind, history: x.history.concat([[(kind === "approved" ? "Aprobada" : "Rechazada") + " por Hernando Villota" + (note[0] ? ": " + note[0] : ""), now]]) }) : x; }));
      confirm[1](null); note[1]("");
      toast[0]({ tone: "success", title: "Solicitud #" + r.id + (kind === "approved" ? " aprobada" : " rechazada"), message: kind === "approved" ? "La nota de " + r.student.split(" ")[0] + " cambió a " + formatGrade(r.to) + "." : "Se notificó a " + r.teacher + "." });
    }
    function cnt(s) { return items[0].filter(function (r) { return r.status === s; }).length; }
    return h("div", { className: "ns-inbox" },
      h("div", { className: "ns-inbox-list" },
        h(SegmentedTabs, { label: "Estado de las solicitudes", value: tab[0], onChange: tab[1], tabs: [{ value: "pending", label: "Pendientes", count: cnt("pending") }, { value: "approved", label: "Aprobadas", count: cnt("approved") }, { value: "rejected", label: "Rechazadas", count: cnt("rejected") }] }),
        list.length ? h("ul", { role: "listbox", "aria-label": "Solicitudes" }, list.map(function (r) {
          var on = cur && r.id === cur.id;
          return h("li", { key: r.id }, h("button", { type: "button", role: "option", "aria-selected": on, className: cx("ns-inbox-item", on && "is-on"), onClick: function () { sel[1](r.id); } },
            h("div", { className: "ns-row", style: { justifyContent: "space-between", gap: 8 } }, h("strong", null, "Solicitud #" + r.id), h("span", { className: "ns-caption" }, r.date.split(",")[0])),
            h("span", null, r.subject + " · " + r.course), h("span", { className: "ns-caption" }, r.teacher),
            h("span", { className: "ns-change ns-change--sm" }, formatGrade(r.from), h(Icon, { name: "arrow", size: 12 }), formatGrade(r.to))));
        })) : h(EmptyState, { icon: "inbox", title: tab[0] === "pending" ? "No hay solicitudes pendientes." : "No hay solicitudes en este estado.", message: "Las nuevas solicitudes de los docentes aparecerán aquí." })),
      cur ? h(Block, { className: "ns-inbox-detail", label: "Detalle de la solicitud" },
        h("div", { className: "ns-row", style: { justifyContent: "space-between" } }, h("h2", { className: "ns-block-h" }, "Solicitud #" + cur.id), h(Badge, { tone: REQ_STATUS[cur.status][1], icon: REQ_STATUS[cur.status][2] }, REQ_STATUS[cur.status][0])),
        h("dl", { className: "ns-dl ns-dl--2" }, [["Docente", cur.teacher], ["Estudiante", cur.student + " · " + cur.course], ["Materia", cur.subject], ["Fecha", cur.date]].map(function (x) { return h(Fragment, { key: x[0] }, h("dt", null, x[0]), h("dd", null, x[1])); })),
        h("div", { className: "ns-change-big", "aria-label": "Cambio solicitado de " + formatGrade(cur.from) + " a " + formatGrade(cur.to) },
          h("div", null, h("span", { className: "ns-overline" }, "Nota actual"), h("strong", null, formatGrade(cur.from))),
          h(Icon, { name: "arrow", size: 28 }),
          h("div", { className: "is-new" }, h("span", { className: "ns-overline" }, "Cambio solicitado"), h("strong", null, formatGrade(cur.to)))),
        h("div", null, h("span", { className: "ns-overline" }, "Motivo"), h("p", { className: "ns-reason" }, h("strong", null, cur.reason), " · " + cur.detail)),
        h("div", null, h("span", { className: "ns-overline" }, "Historial"), h("ol", { className: "ns-history" }, cur.history.map(function (x, i) { return h("li", { key: i }, h("span", null, x[0]), h("span", { className: "ns-caption" }, x[1])); }))),
        cur.status === "pending" ? h("div", { className: "ns-reg-actions" }, h(Button, { variant: "danger", icon: "close", onClick: function () { confirm[1]("rejected"); } }, "Rechazar"), h(Button, { icon: "check", size: "lg", onClick: function () { confirm[1]("approved"); } }, "Aprobar")) : null)
        : h(EmptyState, { icon: "inbox", title: "Selecciona una solicitud", message: "Verás el cambio solicitado, el motivo y el historial." }),
      h(Modal, { open: !!confirm[0], alert: true, onClose: function () { confirm[1](null); }, icon: confirm[0] === "approved" ? "check" : "close", tone: confirm[0] === "approved" ? "sage" : "burgundy",
        title: confirm[0] === "approved" ? "¿Aprobar el cambio de nota?" : "¿Rechazar la solicitud?",
        description: cur ? cur.student + " · " + cur.subject + ": " + formatGrade(cur.from) + " → " + formatGrade(cur.to) + (confirm[0] === "approved" ? ". La nota original queda en el historial." : ". El docente recibirá tu motivo.") : "",
        actions: [h(Button, { key: "c", variant: "secondary", onClick: function () { confirm[1](null); }, "data-autofocus": true }, "Cancelar"), h(Button, { key: "o", variant: confirm[0] === "approved" ? "primary" : "danger", icon: confirm[0] === "approved" ? "check" : "close", disabled: confirm[0] === "rejected" && !note[0].trim(), onClick: function () { decide(confirm[0]); } }, confirm[0] === "approved" ? "Aprobar" : "Rechazar")] },
        h(Textarea, { label: confirm[0] === "rejected" ? "Motivo del rechazo" : "Comentario (opcional)", required: confirm[0] === "rejected", value: note[0], onChange: note[1], rows: 2, hint: confirm[0] === "rejected" ? "Obligatorio para rechazar." : null })),
      toast[1]);
  }
  function RequestsPage(props) {
    return h(RoleShell, { role: "principal", active: "requests", onNavigate: props.onNavigate, onLogout: props.onLogout, style: props.style, counts: { requests: 3 } },
      h(Header, { eyebrow: "Bandeja de autorizaciones", title: "Solicitudes", highlight: "Solicitudes", description: "Cambios de nota que los docentes solicitan después del cierre. Cada decisión queda en el historial." }),
      h(AuthorizationInbox, null));
  }

  /* ---------- Observador (línea de tiempo) ---------- */
  var OBS = [
    { date: "28 de septiembre", type: "positive", title: "Participación destacada", context: "Matemáticas", by: "Ana Lucía Rosero", student: "María Fernanda López Rosero", course: "7A" },
    { date: "24 de septiembre", type: "neutral", title: "Inasistencia justificada", context: "Cita médica · excusa entregada", by: "Coordinación", student: "María Fernanda López Rosero", course: "7A" },
    { date: "22 de septiembre", type: "attention", title: "Llamado de atención", context: "Llegó tarde a clase", by: "Carlos Pérez", student: "María Fernanda López Rosero", course: "7A" },
    { date: "18 de septiembre", type: "positive", title: "Excelente trabajo grupal", context: "Proyecto de ciencias", by: "Diana Cabrera", student: "María Fernanda López Rosero", course: "7A" },
    { date: "11 de septiembre", type: "attention", title: "Tarea sin entregar", context: "Inglés · taller 3", by: "Jorge Insuasty", student: "Juan Sebastián Martínez Paz", course: "7A" },
    { date: "5 de septiembre", type: "positive", title: "Representó al colegio", context: "Olimpiadas de matemáticas", by: "Rectoría", student: "Juan Sebastián Martínez Paz", course: "7A" }
  ];
  var OBS_TYPE = { positive: ["Positiva", "check", "sage"], neutral: ["Informativa", "file", "navy"], attention: ["Atención", "warning", "burgundy"] };
  function ObserverTimeline(props) {
    var f = useState("all");
    var items = (props.items || OBS).filter(function (o) { return f[0] === "all" || o.type === f[0]; });
    var groups = []; items.forEach(function (o) { var g = groups[groups.length - 1]; if (!g || g.date !== o.date) groups.push({ date: o.date, items: [o] }); else g.items.push(o); });
    return h("div", { className: cx("ns-observer", props.compact && "ns-observer--compact") },
      props.hideFilter ? null : h(FilterGroup, { label: "Tipo", value: f[0], onChange: f[1], options: [{ value: "all", label: "Todas" }, { value: "positive", label: "Positivas" }, { value: "neutral", label: "Informativas" }, { value: "attention", label: "Atención" }] }),
      groups.length ? h("ol", { className: "ns-timeline" }, groups.map(function (g) {
        return h("li", { key: g.date, className: "ns-tl-group" }, h("h3", { className: "ns-tl-date" }, g.date.toUpperCase()),
          h("ul", null, g.items.map(function (o, i) {
            var t = OBS_TYPE[o.type];
            return h("li", { key: i, className: "ns-tl-item ns-tl-item--" + o.type },
              h("span", { className: "ns-tl-icon", "aria-hidden": true }, h(Icon, { name: t[1], size: 16, strokeWidth: 2.5 })),
              h("div", null, h("span", { className: "ns-tl-type" }, t[0]), h("strong", null, o.title), h("span", { className: "ns-caption" }, o.context + (props.showStudent ? " · " + o.student.split(" ").slice(0, 3).join(" ") + " (" + o.course + ")" : "") + (o.by ? " · " + o.by : ""))));
          })));
      })) : h(EmptyState, { icon: "eye", title: "No hay anotaciones de este tipo.", message: "Las observaciones aparecerán en orden cronológico." }));
  }
  function ObserverPage(props) {
    return h(RoleShell, { role: props.role || "principal", active: props.role === "teacher" ? "behavior" : "observer", onNavigate: props.onNavigate, onLogout: props.onLogout, style: props.style, counts: { requests: 3 } },
      h(Header, { eyebrow: "Convivencia", title: "Observador", highlight: "Observador", description: "Anotaciones recientes de toda la institución, en orden cronológico." }),
      h(Block, null, h(ObserverTimeline, { showStudent: true })));
  }

  /* ---------- Perfil completo del estudiante (según rol) ---------- */
  function StudentProfilePage(props) {
    var s = findStudent(props.studentId);
    var role = props.role || "admin";
    var canInfo = role === "admin" || role === "principal";
    var TABS = [["summary", "Resumen"], ["grades", "Calificaciones"], ["attendance", "Asistencia"], ["observer", "Observador"], ["reportcards", "Boletines"]].concat(canInfo ? [["info", "Información"]] : []);
    var map = { profile: "summary", history: "grades" };
    var tab = useState(map[props.tab] || props.tab || "summary");
    var t = TABS.some(function (x) { return x[0] === tab[0]; }) ? tab[0] : "summary";
    var rows = subjectGrades(s);
    var body;
    if (t === "summary") body = h("div", { className: "ns-profile-grid" },
      h(Block, { tone: "navy" }, h("span", { className: "ns-overline", style: { color: "var(--gold)" } }, "Promedio · Periodo 3"), h("strong", { className: "ns-big-ivory" }, formatGrade(s.avg)), h("span", { style: { color: "#d9cfbd", fontWeight: 600 } }, PERF(s.avg) + " · " + s.subjectsPassed + " de 6 materias aprobadas")),
      h(Block, { tone: "sage" }, h("span", { className: "ns-overline" }, "Asistencia"), h("strong", { className: "ns-big" }, s.attendance + "%"), h(ProgressBar, { value: s.attendance, total: 100, tone: "sage", label: "Asistencia" })),
      h(Block, { tone: s.library && s.fees && s.documents ? "paper" : "burgundy" }, h("span", { className: "ns-overline" }, "Paz y salvo"), h("strong", { className: "ns-big" }, s.library && s.fees && s.documents ? "Al día" : "Pendiente"), h("span", { className: "ns-caption" }, "Biblioteca " + (s.library ? "✓" : "×") + " · Pensiones " + (s.fees ? "✓" : "×") + " · Documentos " + (s.documents ? "✓" : "×"))),
      h(Block, { className: "ns-span-3" }, h(LineChart, { title: "Evolución del promedio", subtitle: "Periodos 1 a 3", labels: ["P1", "P2", "P3"], min: 1, max: 5, ticks: [1, 3, 5], threshold: 3, thresholdLabel: "Mínimo 3.0", height: 200, series: [{ name: "Promedio", points: [Math.max(1, s.avg - .3), Math.max(1, s.avg - .1), s.avg] }], format: function (v) { return v.toFixed(1); } })));
    else if (t === "grades") body = h(DataTable, { caption: "Calificaciones por materia", rows: rows.map(function (r, i) { return Object.assign({ id: i }, r); }), columns: [{ key: "subject", label: "Materia" }, { key: "teacher", label: "Docente" }, { key: "grade", label: "Nota", numeric: true, render: function (r) { return h("span", { className: "ns-table-grade" }, formatGrade(r.grade)); } }, { key: "perf", label: "Desempeño", render: function (r) { return h("span", { className: "ns-perf ns-perf--" + PERF(r.grade).toLowerCase() }, PERF(r.grade)); } }, { key: "absences", label: "Faltas", numeric: true }] });
    else if (t === "attendance") body = h(Block, null, h(AttendanceCalendar, { attendance: s.attendance }));
    else if (t === "observer") body = h(Block, null, h(ObserverTimeline, { items: OBS.filter(function (o) { return o.student.indexOf(s.first) === 0; }).concat(OBS.slice(0, 2)) }));
    else if (t === "reportcards") body = s.library && s.fees && s.documents ? h(Block, null, h("div", { className: "ns-paper-scroll" }, h(ReportCardDocument, { student: s, compact: true }))) : h(EmptyState, { tone: "error", icon: "lock", title: "Boletines bloqueados", message: "El estudiante tiene obligaciones pendientes en Paz y Salvos." });
    else body = h(Block, null, h("dl", { className: "ns-dl ns-dl--2" }, [["Documento", s.document], ["Fecha de matrícula", s.enrolled], ["Acudiente", s.guardian + " (" + s.guardianRel + ")"], ["Teléfono del acudiente", s.guardianPhone]].map(function (x) { return h(Fragment, { key: x[0] }, h("dt", null, x[0]), h("dd", null, x[1])); })),
      role === "admin" || role === "principal" ? h("p", { className: "ns-sensitive" }, h(Icon, { name: "lock", size: 16 }), "Información médica: sin alergias registradas. Visible solo para Secretaría y Rectoría.") : null);
    return h(RoleShell, { role: role, active: "students", onNavigate: props.onNavigate, onLogout: props.onLogout, style: props.style, counts: role === "principal" ? { requests: 3 } : null },
      h("div", { className: "ns-profile-head" },
        h(Button, { variant: "ghost", size: "sm", icon: "chevleft", onClick: function () { props.onNavigate && props.onNavigate("students"); } }, "Estudiantes"),
        h("div", { className: "ns-profile-id" }, h(Avatar, { name: s.name, size: "lg" }),
          h("div", null, h("h1", { className: "ns-header-title", style: { fontSize: 40 } }, s.name), h("div", { className: "ns-row", style: { gap: 8 } }, h("span", { className: "ns-course-tag" }, s.course), h("span", { className: "ns-caption" }, "ID " + s.id), h(EnrollBadge, { status: s.status }))))),
      h(SegmentedTabs, { label: "Secciones del perfil", value: t, onChange: tab[1], tabs: TABS.map(function (x) { return { value: x[0], label: x[1] }; }) }),
      body);
  }
  function AttendanceCalendar(props) {
    var days = []; for (var d = 1; d <= 30; d++) { var wd = (d + 1) % 7; var weekend = wd === 0 || wd === 6; var st = weekend ? "off" : d === 24 ? "absent" : d === 22 ? "late" : d > 30 ? "off" : "present"; days.push({ d: d, st: st, wd: wd }); }
    var L = { present: ["Presente", "check"], absent: ["Inasistencia", "close"], late: ["Tarde", "clock"], off: ["Sin clase", null] };
    return h("div", { className: "ns-cal" },
      h("div", { className: "ns-row", style: { justifyContent: "space-between" } }, h("strong", { className: "ns-serif", style: { fontSize: 20 } }, "Septiembre 2026"), h("span", { className: "ns-caption" }, (props.attendance || 96) + "% de asistencia")),
      h("div", { className: "ns-cal-grid", role: "grid", "aria-label": "Asistencia de septiembre" },
        ["L", "M", "M", "J", "V", "S", "D"].map(function (x, i) { return h("span", { key: "h" + i, className: "ns-cal-h", "aria-hidden": true }, x); }),
        h("span", { className: "ns-cal-pad", "aria-hidden": true }),
        days.map(function (x) { var l = L[x.st]; return h("span", { key: x.d, role: "gridcell", className: "ns-cal-day ns-cal-day--" + x.st, "aria-label": x.d + " de septiembre: " + l[0], title: l[0] }, x.d, l[1] ? h(Icon, { name: l[1], size: 10, strokeWidth: 3 }) : null); })),
      h("div", { className: "ns-cal-legend" }, ["present", "late", "absent"].map(function (k) { return h("span", { key: k, className: "ns-cal-day ns-cal-day--" + k + " ns-cal-day--legend" }, h(Icon, { name: L[k][1], size: 10, strokeWidth: 3 }), L[k][0]); })));
  }

  /* =====================================================================
     DOCENTE · productividad, teclado y trabajo sin conexión
     ===================================================================== */
  var GB_COLS = [["a1", "Actividad 1", 15], ["a2", "Actividad 2", 15], ["ws", "Taller", 20], ["ex", "Examen", 35], ["at", "Actitudinal", 15]];
  function gbAvg(r) {
    var sum = 0, w = 0;
    GB_COLS.forEach(function (c) { var v = r[c[0]]; if (typeof v === "number" && !isNaN(v)) { sum += v * c[2]; w += c[2]; } });
    return w ? Math.round(sum / w * 10) / 10 : NaN;
  }
  function gbRows(course) {
    return ALL_STUDENTS.filter(function (s) { return s.course === course && s.status !== "retired"; }).map(function (s, i) {
      var b = s.avg, r = { id: s.id, name: s.name };
      GB_COLS.forEach(function (c, j) { var v = Math.round(Math.max(1, Math.min(5, b + (seeded(Number(s.id) + j * 3) - .5) * 1.4)) * 10) / 10; r[c[0]] = c[0] === "ex" && i % 5 === 3 ? NaN : v; });
      return r;
    });
  }
  function GradeCell(props) {
    var v = props.value, bad = props.error;
    return h("td", { role: "gridcell", tabIndex: props.active ? 0 : -1, "aria-selected": props.active, "aria-invalid": bad ? true : undefined, "aria-label": props.label + ": " + (isNaN(v) ? "sin nota" : formatGrade(v)),
      className: cx("ns-gcell", props.active && "is-active", props.editing && "is-editing", bad && "is-invalid", props.pending && "is-pending", !isNaN(v) && v < 3 && "is-low"),
      onMouseDown: props.onSelect, onDoubleClick: props.onEdit, ref: props.cellRef },
      props.editing ? h("input", { className: "ns-gcell-input", autoFocus: true, value: props.draft, inputMode: "decimal", "aria-label": "Editar " + props.label, onChange: function (e) { props.onDraft(e.target.value.replace(/[^0-9.,]/g, "").slice(0, 4)); }, onKeyDown: props.onInputKey, onBlur: props.onBlur })
        : h("span", null, isNaN(v) ? "—" : formatGrade(v)),
      props.pending ? h("i", { className: "ns-gcell-dot", title: "Pendiente de sincronizar", "aria-hidden": true }) : null);
  }
  function Gradebook(props) {
    var ctx = React.useContext(ShellCtx);
    var course = useState("7A"), rows = useState(gbRows("7A")), pos = useState({ r: 0, c: 0 }), edit = useState(null), draft = useState(""), msg = useState(null), pend = useState({});
    var refs = useRef({});
    useEffect(function () { rows[1](gbRows(course[0])); pos[1]({ r: 0, c: 0 }); edit[1](null); }, [course[0]]);
    useEffect(function () { var el = refs.current[pos[0].r + "-" + pos[0].c]; if (el && !edit[0]) el.focus({ preventScroll: false }); }, [pos[0], edit[0]]);
    var R = rows[0].length, C = GB_COLS.length;
    var offline = ctx && ctx.sync && ctx.sync.status === "offline";
    function move(dr, dc) { var r = pos[0].r + dr, c = pos[0].c + dc; if (c >= C) { c = 0; r++; } if (c < 0) { c = C - 1; r--; } r = Math.max(0, Math.min(R - 1, r)); pos[1]({ r: r, c: c }); }
    function startEdit(initial) { var row = rows[0][pos[0].r], k = GB_COLS[pos[0].c][0]; draft[1](initial !== undefined ? initial : (isNaN(row[k]) ? "" : formatGrade(row[k]))); edit[1](pos[0]); msg[1](null); }
    function commit() {
      var chk = validateGrade(draft[0]);
      if (draft[0].trim() === "") { edit[1](null); return true; }
      if (!chk.valid) { msg[1]({ tone: "error", text: chk.message }); return false; }
      var k = GB_COLS[pos[0].c][0];
      rows[1](rows[0].map(function (x, i) { if (i !== pos[0].r) return x; var o = Object.assign({}, x); o[k] = chk.value; return o; }));
      edit[1](null);
      var key = rows[0][pos[0].r].id + k;
      if (offline) { var p = Object.assign({}, pend[0]); p[key] = true; pend[1](p); if (ctx.setSync) ctx.setSync(Object.assign({}, ctx.sync, { pending: Object.keys(p).length })); msg[1]({ tone: "warn", text: "Guardado en este equipo. Se sincronizará al reconectar." }); }
      else msg[1]({ tone: "ok", text: "Guardado · " + rows[0][pos[0].r].name.split(" ")[0] + ", " + GB_COLS[pos[0].c][1] + ": " + formatGrade(chk.value) });
      return true;
    }
    useEffect(function () { if (ctx && ctx.sync && ctx.sync.status === "online" && Object.keys(pend[0]).length) pend[1]({}); }, [ctx && ctx.sync && ctx.sync.status]);
    function onGridKey(e) {
      if (edit[0]) return;
      var k = e.key;
      if (k === "ArrowRight") { e.preventDefault(); move(0, 1); }
      else if (k === "ArrowLeft") { e.preventDefault(); move(0, -1); }
      else if (k === "ArrowDown") { e.preventDefault(); move(1, 0); }
      else if (k === "ArrowUp") { e.preventDefault(); move(-1, 0); }
      else if (k === "Tab") { e.preventDefault(); move(0, e.shiftKey ? -1 : 1); }
      else if (k === "Enter" || k === "F2") { e.preventDefault(); startEdit(); }
      else if (k === "Delete" || k === "Backspace") { e.preventDefault(); startEdit(""); }
      else if (/^[0-9]$/.test(k)) { e.preventDefault(); startEdit(k); }
    }
    function onInputKey(e) {
      if (e.key === "Escape") { e.preventDefault(); edit[1](null); msg[1](null); }
      else if (e.key === "Enter") { e.preventDefault(); if (commit()) move(e.shiftKey ? -1 : 1, 0); }
      else if (e.key === "Tab") { e.preventDefault(); if (commit()) move(0, e.shiftKey ? -1 : 1); }
      else if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (commit()) move(e.key === "ArrowDown" ? 1 : -1, 0); }
    }
    var avgs = rows[0].map(gbAvg), valid = avgs.filter(function (x) { return !isNaN(x); });
    var courseAvg = valid.length ? Math.round(valid.reduce(function (a, b) { return a + b; }, 0) / valid.length * 10) / 10 : NaN;
    var cur = rows[0][pos[0].r];
    return h("div", { className: "ns-col", style: { gap: 16 } },
      h("div", { className: "ns-gb-bar" },
        h(FilterGroup, { as: "select", label: "Curso", value: course[0], onChange: course[1], options: ["6A", "7A", "7B"].map(function (c) { return { value: c, label: c + " · Matemáticas" }; }) }),
        h(FilterGroup, { as: "select", label: "Periodo", value: "3", options: [{ value: "3", label: "Periodo 3" }] }),
        h("div", { className: "ns-gb-keys", "aria-label": "Atajos de teclado" }, h("span", null, h("kbd", null, "↑↓←→"), " mover"), h("span", null, h("kbd", null, "Enter"), " editar / bajar"), h("span", null, h("kbd", null, "Tab"), " derecha"), h("span", null, h("kbd", null, "Esc"), " cancelar"), h("span", null, h("kbd", null, "0–9"), " escribir"))),
      h("div", { className: "ns-gb-wrap", role: "region", "aria-label": "Planilla de calificaciones" },
        h("table", { className: "ns-gb", role: "grid", "aria-rowcount": R + 1, "aria-colcount": C + 2, onKeyDown: onGridKey },
          h("caption", { className: "ns-sr" }, "Planilla de calificaciones de " + course[0] + ". Usa las flechas para moverte y Enter para editar."),
          h("thead", null, h("tr", null, h("th", { scope: "col", className: "ns-gb-sticky" }, "Estudiante"), GB_COLS.map(function (c) { return h("th", { key: c[0], scope: "col", className: "is-num" }, c[1], h("small", null, c[2] + "%")); }), h("th", { scope: "col", className: "is-num ns-gb-avg" }, "Promedio", h("small", null, "automático")))),
          h("tbody", null, rows[0].map(function (r, i) {
            var a = avgs[i];
            return h("tr", { key: r.id, className: cx(i === pos[0].r && "is-row") },
              h("th", { scope: "row", className: "ns-gb-sticky" }, h("span", { className: "ns-gb-n" }, i + 1), r.name),
              GB_COLS.map(function (c, j) {
                var active = pos[0].r === i && pos[0].c === j, editing = edit[0] && edit[0].r === i && edit[0].c === j;
                return h(GradeCell, { key: c[0], value: r[c[0]], label: r.name + ", " + c[1], active: active, editing: editing, draft: draft[0], onDraft: draft[1], error: editing && msg[0] && msg[0].tone === "error", pending: pend[0][r.id + c[0]],
                  cellRef: function (el) { refs.current[i + "-" + j] = el; },
                  onSelect: function () { if (edit[0]) commit(); pos[1]({ r: i, c: j }); }, onEdit: function () { pos[1]({ r: i, c: j }); startEdit(); }, onInputKey: onInputKey, onBlur: function () { if (!commit()) edit[1](null); } });
              }),
              h("td", { className: cx("is-num ns-gb-avg", !isNaN(a) && a < 3 && "is-low") }, isNaN(a) ? "—" : formatGrade(a), !isNaN(a) && a < 3 ? h(Icon, { name: "warning", size: 14 }) : null));
          })),
          h("tfoot", null, h("tr", null, h("th", { scope: "row", className: "ns-gb-sticky" }, "Promedio del curso"), GB_COLS.map(function (c) { var v = rows[0].map(function (r) { return r[c[0]]; }).filter(function (x) { return !isNaN(x); }); return h("td", { key: c[0], className: "is-num" }, v.length ? formatGrade(v.reduce(function (a, b) { return a + b; }, 0) / v.length) : "—"); }), h("td", { className: "is-num ns-gb-avg" }, formatGrade(courseAvg)))))),
      h("div", { className: cx("ns-gb-status", msg[0] && "is-" + msg[0].tone), role: "status", "aria-live": "polite" },
        h("span", null, cur ? h(Fragment, null, h("strong", null, GB_COLS[pos[0].c][1]), " · " + cur.name) : null),
        h("span", null, msg[0] ? msg[0].text : offline ? "Modo offline: los cambios se guardan en este equipo." : "Todo sincronizado.")));
  }
  function GradebookPage(props) {
    return h(RoleShell, { role: "teacher", active: "gradebook", onNavigate: props.onNavigate, onLogout: props.onLogout, style: props.style, counts: { grades: 8 } },
      h(Header, { eyebrow: "Matemáticas · Periodo 3", title: "Planilla de Calificaciones", highlight: "Calificaciones", description: "Escribe sin soltar el teclado. El promedio se calcula solo con los porcentajes del periodo." }),
      h(Gradebook, null));
  }

  /* ---------- Recuperaciones ---------- */
  function RecoveryTable(props) {
    var rows = useState(ALL_STUDENTS.filter(function (s) { return s.status === "active"; }).map(function (s) { return { s: s, g: subjectGrades(s).filter(function (x) { return x.grade < 3; })[0] }; }).filter(function (x) { return x.g; }).slice(0, 9).map(function (x, i) { return { id: x.s.id, name: x.s.name, course: x.s.course, subject: x.g.subject, original: x.g.grade, recovery: i === 0 ? "4.0" : i === 1 ? "2.6" : "", saved: i < 2 }; }));
    var toast = useToast();
    function upd(id, patch) { rows[1](rows[0].map(function (r) { return r.id === id ? Object.assign({}, r, patch) : r; })); }
    function result(r) {
      if (!r.recovery) return ["Pendiente", "pending", "clock", "Sin nota de recuperación"];
      var c = validateGrade(r.recovery); if (!c.valid) return ["Revisar", "review", "error", c.message];
      return c.value >= 3 ? ["Aprobada", "verified", "check", "Definitiva 3.0 · original " + formatGrade(r.original) + " conservada"] : ["No aprobada", "review", "warning", "Se mantiene " + formatGrade(Math.max(r.original, c.value))];
    }
    return h(Fragment, null,
      h("p", { className: "ns-sensitive" }, h(Icon, { name: "lock", size: 16 }), "La nota original nunca se reemplaza: queda en el historial académico junto a la de recuperación."),
      h(DataGrid, { caption: "Estudiantes que requieren recuperación", rows: rows[0], paginate: false, emptyTitle: "No hay estudiantes en recuperación.", emptyIcon: "check",
        columns: [
          { key: "name", label: "Estudiante", header: true, sortable: true, render: function (r) { return h("div", { className: "ns-cell-link ns-cell-link--static" }, h(Avatar, { name: r.name, size: "sm" }), h("span", null, r.name, h("small", { className: "ns-caption", style: { display: "block" } }, r.course))); } },
          { key: "subject", label: "Materia", sortable: true },
          { key: "original", label: "Nota original", numeric: true, render: function (r) { return h("span", { className: "ns-orig", title: "Se conserva en el historial" }, h(Icon, { name: "lock", size: 12 }), formatGrade(r.original)); } },
          { key: "recovery", label: "Nota de recuperación", render: function (r) { var c = r.recovery ? validateGrade(r.recovery) : null; return h("div", { className: "ns-rec-input" }, h("input", { className: cx("ns-input ns-input--grade", c && !c.valid && "is-invalid"), value: r.recovery, inputMode: "decimal", placeholder: "0.0", "aria-label": "Nota de recuperación de " + r.name, "aria-invalid": c && !c.valid ? true : undefined, onChange: function (e) { upd(r.id, { recovery: e.target.value.replace(/[^0-9.,]/g, "").slice(0, 4), saved: false }); } })); } },
          { key: "result", label: "Resultado", render: function (r) { var x = result(r); return h("div", { className: "ns-col", style: { gap: 2 } }, h(Badge, { tone: x[1], icon: x[2] }, x[0]), h("span", { className: "ns-caption" }, x[3])); } }],
        rowActions: function (r) { var x = result(r); return r.saved ? h(Badge, { tone: "neutral", icon: "check" }, "Guardada") : h(Button, { size: "sm", disabled: !r.recovery || x[0] === "Revisar", onClick: function () { upd(r.id, { saved: true }); toast[0]({ tone: "success", title: "Recuperación registrada", message: r.name.split(" ")[0] + " · " + r.subject + ": original " + formatGrade(r.original) + ", recuperación " + r.recovery }); } }, "Guardar"); } }),
      toast[1]);
  }
  function RecoveriesPage(props) {
    return h(RoleShell, { role: "teacher", active: "recoveries", onNavigate: props.onNavigate, onLogout: props.onLogout, style: props.style, counts: { grades: 8 } },
      h(Header, { eyebrow: "Periodo 2 · actividades de recuperación", title: "Recuperaciones", highlight: "Recuperaciones", description: "Solo aparecen los estudiantes con una materia por debajo de 3.0." }),
      h(RecoveryTable, null));
  }

  /* ---------- Asistencia ---------- */
  var ATT = [["present", "Presente", "P", "check"], ["absent", "Inasistencia", "A", "close"], ["late", "Tarde", "T", "clock"], ["excused", "Excusa", "E", "file"]];
  function AttendanceRow(props) {
    var r = props.row, open = useState(!!r.note);
    return h("li", { className: cx("ns-att-row", "is-" + (r.state || "none")), onKeyDown: function (e) { var m = { p: "present", a: "absent", t: "late", e: "excused" }[e.key.toLowerCase()]; if (m && e.target.tagName !== "TEXTAREA") { e.preventDefault(); props.onChange({ state: m }); } } },
      h("div", { className: "ns-att-main" },
        h("span", { className: "ns-gb-n" }, props.index + 1), h(Avatar, { name: r.name, size: "sm" }), h("strong", { className: "ns-att-name" }, r.name),
        h("div", { className: "ns-att-seg", role: "radiogroup", "aria-label": "Asistencia de " + r.name },
          ATT.map(function (a) { var on = r.state === a[0]; return h("button", { key: a[0], type: "button", role: "radio", "aria-checked": on, tabIndex: on || (!r.state && a[0] === "present") ? 0 : -1, className: cx("ns-att-btn", "ns-att-btn--" + a[0], on && "is-on"), onClick: function () { props.onChange({ state: a[0] }); }, title: a[1] + " (tecla " + a[2] + ")" }, h(Icon, { name: a[3], size: 14, strokeWidth: 2.5 }), h("span", null, a[1])); })),
        h(Button, { variant: "ghost", size: "sm", icon: open[0] ? "minus" : "plus", "aria-expanded": open[0], onClick: function () { open[1](!open[0]); } }, open[0] ? "Ocultar" : "Agregar observación")),
      open[0] ? h(Textarea, { label: "Observación", rows: 2, value: r.note || "", onChange: function (v) { props.onChange({ note: v }); }, placeholder: "El estudiante participó activamente durante la actividad." }) : null);
  }
  function AttendancePanel(props) {
    var rows = useState(ALL_STUDENTS.filter(function (s) { return s.course === "7A" && s.status !== "retired"; }).map(function (s, i) { return { id: s.id, name: s.name, state: i === 3 ? "absent" : i === 6 ? "late" : null, note: i === 0 ? "Participó activamente durante la actividad." : "" }; }));
    var toast = useToast();
    function upd(id, patch) { rows[1](rows[0].map(function (r) { return r.id === id ? Object.assign({}, r, patch) : r; })); }
    var c = {}; rows[0].forEach(function (r) { c[r.state || "none"] = (c[r.state || "none"] || 0) + 1; });
    return h(Fragment, null,
      h("div", { className: "ns-att-bar" },
        h("div", { className: "ns-row" }, h(FilterGroup, { as: "select", label: "Curso", value: "7A", options: [{ value: "7A", label: "7A · Matemáticas" }] }), h(Input, { label: "Fecha", hideLabel: true, type: "date", defaultValue: "2026-10-01", "aria-label": "Fecha de la clase" })),
        h("div", { className: "ns-att-counts", "aria-live": "polite" }, ATT.map(function (a) { return h("span", { key: a[0], className: "ns-att-count ns-att-count--" + a[0] }, h(Icon, { name: a[3], size: 14 }), (c[a[0]] || 0) + " " + a[1].toLowerCase()); }), h("span", { className: "ns-att-count" }, (c.none || 0) + " sin marcar")),
        h(Button, { variant: "secondary", icon: "check", onClick: function () { rows[1](rows[0].map(function (r) { return r.state ? r : Object.assign({}, r, { state: "present" }); })); } }, "Marcar el resto como presentes")),
      h("p", { className: "ns-caption" }, "Atajos: con una fila enfocada pulsa ", h("kbd", null, "P"), " presente, ", h("kbd", null, "A"), " inasistencia, ", h("kbd", null, "T"), " tarde, ", h("kbd", null, "E"), " excusa."),
      h("ul", { className: "ns-att-list" }, rows[0].map(function (r, i) { return h(AttendanceRow, { key: r.id, row: r, index: i, onChange: function (p) { upd(r.id, p); } }); })),
      h("div", { className: "ns-sticky-cta" }, h(Button, { size: "lg", icon: "check", disabled: !!c.none, onClick: function () { toast[0]({ tone: "success", title: "Asistencia guardada", message: "7A · 1 de octubre · " + (c.absent || 0) + " inasistencias." }); } }, c.none ? "Faltan " + c.none + " por marcar" : "Guardar asistencia")),
      toast[1]);
  }
  function AttendancePage(props) {
    return h(RoleShell, { role: "teacher", active: "attendance", onNavigate: props.onNavigate, onLogout: props.onLogout, style: props.style, counts: { grades: 8 } },
      h(Header, { eyebrow: "Jueves 1 de octubre · 2.ª hora", title: "Asistencia", highlight: "Asistencia", description: "Marca a todos en segundos. Agrega observaciones solo cuando haga falta." }),
      h(AttendancePanel, null));
  }

  /* ---------- Comportamiento ---------- */
  function BehaviorPage(props) {
    var items = useState(OBS.slice()), f = useState({ student: "", type: "positive", title: "", context: "" }), tried = useState(false), toast = useToast(), drafting = useState(false);
    var v = f[0];
    function add() {
      tried[1](true); if (!v.student || !v.title.trim()) return;
      items[1]([{ date: "1 de octubre", type: v.type, title: v.title, context: v.context || "Matemáticas", by: "Ana Lucía Rosero", student: v.student, course: "7A" }].concat(items[0]));
      f[1]({ student: "", type: v.type, title: "", context: "" }); tried[1](false);
      toast[0]({ tone: "success", title: "Observación registrada", message: "Se notificó al acudiente." });
    }
    return h(RoleShell, { role: "teacher", active: "behavior", onNavigate: props.onNavigate, onLogout: props.onLogout, style: props.style, counts: { grades: 8 } },
      h(Header, { eyebrow: "Observador del estudiante · 7A", title: "Comportamiento", highlight: "Comportamiento", description: "Registra anotaciones positivas, informativas o de atención. El acudiente las ve en su aplicación." }),
      h("div", { className: "ns-behavior" },
        h(Block, { tone: "gold", label: "Nueva observación" }, h(BlockTitle, null, "Nueva observación"),
          h("div", { className: "ns-form-grid ns-form-grid--1" },
            h(Select, { label: "Estudiante", required: true, value: v.student, placeholder: "Selecciona", onChange: function (x) { f[1](Object.assign({}, v, { student: x })); }, options: ALL_STUDENTS.filter(function (s) { return s.course === "7A"; }).map(function (s) { return s.name; }), error: tried[0] && !v.student ? "Selecciona un estudiante." : null }),
            h("div", { className: "ns-field" }, h("span", { className: "ns-field-label" }, "Tipo"), h(SegmentedTabs, { label: "Tipo de observación", value: v.type, onChange: function (x) { f[1](Object.assign({}, v, { type: x })); }, tabs: [{ value: "positive", label: "Positiva", icon: "check" }, { value: "neutral", label: "Informativa", icon: "file" }, { value: "attention", label: "Atención", icon: "warning" }] })),
            h(Input, { label: "Título", required: true, value: v.title, onChange: function (e) { f[1](Object.assign({}, v, { title: e.target.value })); }, placeholder: "Participación destacada", error: tried[0] && !v.title.trim() ? "Escribe un título breve." : null }),
            h(Textarea, { label: "Descripción", value: v.context, onChange: function (x) { f[1](Object.assign({}, v, { context: x })); }, placeholder: "El estudiante participó activamente durante la actividad.", hint: "Escribe notas cortas y deja que la IA las redacte; revisa antes de agregar." }),
            h(Button, { variant: "ghost", size: "sm", icon: "ai", loading: drafting[0], loadingText: "Redactando…", disabled: !v.title.trim() && !v.context.trim(), onClick: function () {
              drafting[1](true);
              setTimeout(function () {
                drafting[1](false);
                var who = v.student ? v.student.split(" ")[0] : "El estudiante";
                var base = v.context.trim() ? v.context.trim().replace(/\.$/, "") : v.title.trim().toLowerCase();
                var txt = v.type === "positive" ? who + " se destacó durante la clase: " + base + ". Se reconoce su compromiso y se le anima a mantener esta actitud." : v.type === "attention" ? "Durante la clase, " + who + " presentó la siguiente situación: " + base + ". Se dialogó con el estudiante y se acordó un compromiso de mejora." : "Se informa que " + who + ": " + base + ".";
                f[1](Object.assign({}, v, { context: txt }));
              }, 800);
            } }, "Redactar con IA"),
            h(Button, { icon: "plus", onClick: add }, "Agregar observación"))),
        h(Block, null, h(BlockTitle, null, "Anotaciones recientes"), h(ObserverTimeline, { items: items[0], showStudent: true }))),
      toast[1]);
  }

  /* =====================================================================
     MÓVIL · Estudiante (motivador) y Acudiente (claro y tranquilo)
     Diseñado para Flutter: mismos tokens, mismos iconos, misma voz.
     ===================================================================== */
  var MOBILE_NAV = {
    student: [["home", "Inicio", "home"], ["grades", "Notas", "book"], ["performance", "Rendimiento", "reports"], ["achievements", "Logros", "trophy"], ["simulator", "Simulador", "target"]],
    parent: [["home", "Inicio", "home"], ["grades", "Calificaciones", "book"], ["attendance", "Asistencia", "calendar"], ["observer", "Observador", "eye"], ["reportcards", "Boletines", "file"]]
  };
  function BottomSheet(props) {
    var ref = useRef(null), tid = useId("bs");
    useDialogFocus(props.open, ref, props.onClose);
    if (!props.open) return null;
    return h("div", { className: "ns-sheet-scrim", onMouseDown: function (e) { if (e.target === e.currentTarget) props.onClose(); } },
      h("div", { ref: ref, className: "ns-sheet", role: "dialog", "aria-modal": true, "aria-labelledby": tid },
        h("span", { className: "ns-sheet-grab", "aria-hidden": true }),
        h("h2", { id: tid, className: "ns-sheet-title" }, props.title),
        props.children,
        h(Button, { block: true, variant: "secondary", onClick: props.onClose, "data-autofocus": true }, props.closeLabel || "Cerrar")));
  }
  function MobileShell(props) {
    var nav = MOBILE_NAV[props.role], unread = props.unread === undefined ? 3 : props.unread;
    return h("div", { className: cx("ns ns-phone-stage ns-canvas", "ns-phone-stage--" + props.role), style: props.style },
      h("div", { className: cx("ns-phone", "ns-phone--" + props.role) },
        h("div", { className: "ns-phone-status", "aria-hidden": true }, h("span", null, "9:41"), h("span", { className: "ns-row", style: { gap: 4 } }, h(Icon, { name: "wifi", size: 13 }), h("i", { className: "ns-battery" }))),
        h("header", { className: "ns-m-top" },
          props.back ? h(IconAction, { icon: "chevleft", label: "Volver", onClick: props.back }) : h("div", { className: "ns-m-brand" }, h(Logo, { size: 22 }), h("span", { className: "ns-m-grade-tag" }, props.role === "student" ? "7A · Séptimo" : "Acudiente · 7A")),
          h("div", { className: "ns-row", style: { gap: 6 } },
            props.role === "student" ? h(IconAction, { icon: "eye", label: "Observador", onClick: function () { props.onNavigate("observer"); } }) : null,
            h("button", { type: "button", className: "ns-m-bell", "aria-label": "Notificaciones" + (unread ? ", " + unread + " sin leer" : ""), onClick: function () { props.onNavigate("notifications"); } }, h(Icon, { name: "bell", size: 20 }), unread ? h("span", { className: "ns-m-badge", "aria-hidden": true }, unread) : null),
            h("button", { type: "button", className: "ns-m-avatar", "aria-label": "Cerrar sesión", title: "Cerrar sesión", onClick: props.onLogout }, h(Avatar, { name: ROLES[props.role].user.name, size: "sm" })))),
        h("main", { className: "ns-m-main" }, props.title ? h("h1", { className: "ns-m-title" }, props.title) : null, props.children),
        h("nav", { className: "ns-m-nav", "aria-label": "Navegación principal" }, nav.map(function (n) {
          var on = props.active === n[0];
          return h("button", { key: n[0], type: "button", className: cx("ns-m-tab", on && "is-on"), "aria-current": on ? "page" : undefined, onClick: function () { props.onNavigate(n[0]); } }, h(Icon, { name: n[2], size: 20 }), h("span", null, n[1]));
        })),
        props.overlay || null));
  }

  /* ---------- Estudiante · datos ---------- */
  var ME = findStudent(ALL_STUDENTS[24].id);
  var MY_SUBJECTS = [["Matemáticas", 4.6], ["Física", 4.1], ["Lengua Castellana", 4.4], ["Inglés", 3.8], ["Ciencias Naturales", 4.7], ["Tecnología", 4.9]];
  var ACHIEVEMENTS = [
    { id: "a1", name: "Primera nota", desc: "Recibe tu primera calificación verificada.", req: "1 calificación", progress: 1, goal: 1, state: "unlocked", icon: "check", date: "3 feb" },
    { id: "a2", name: "Asistencia perfecta", desc: "Asiste a todas las clases durante un mes.", req: "20 días sin faltas", progress: 20, goal: 20, state: "unlocked", icon: "calendar", date: "28 feb" },
    { id: "a3", name: "Racha Imparable", desc: "Consigue dos calificaciones de 5.0 seguidas.", req: "2 notas de 5.0 consecutivas", progress: 1, goal: 2, state: "progress", icon: "flame" },
    { id: "a4", name: "Mente científica", desc: "Promedio de 4.5 o más en Ciencias Naturales.", req: "Promedio ≥ 4.5", progress: 1, goal: 1, state: "claimable", icon: "star" },
    { id: "a5", name: "Políglota", desc: "Supera 4.5 en Inglés durante un periodo.", req: "Inglés ≥ 4.5", progress: 3.8, goal: 4.5, state: "locked", icon: "book" },
    { id: "a6", name: "Cuadro de honor", desc: "Termina un periodo entre los tres mejores de tu curso.", req: "Puesto 1 a 3", progress: 0, goal: 1, state: "locked", icon: "trophy" },
    { id: "a7", name: "Constancia", desc: "Entrega 10 talleres a tiempo.", req: "10 talleres", progress: 7, goal: 10, state: "progress", icon: "target" },
    { id: "a8", name: "Buen compañero", desc: "Recibe 3 anotaciones positivas en el observador.", req: "3 anotaciones positivas", progress: 3, goal: 3, state: "unlocked", icon: "heart", date: "18 sep" }
  ];
  var ACH_STATE = { unlocked: "Desbloqueado", progress: "En progreso", locked: "Bloqueado", claimable: "¡Listo para reclamar!" };
  var NOTIFS = [
    { id: 1, type: "grade", title: "Nueva calificación", text: "Se registró una nueva calificación en Matemáticas: 4.8.", time: "Hace 15 min", unread: true },
    { id: 2, type: "achievement", title: "Logro desbloqueado", text: "Ganaste «Buen compañero» y 150 XP.", time: "Hace 2 h", unread: true },
    { id: 3, type: "behavior", title: "Llamado de atención", text: "Llegada tarde a clase de Física.", time: "Ayer", unread: true },
    { id: 4, type: "report", title: "Boletín disponible", text: "El boletín del Periodo 2 ya se puede consultar.", time: "Hace 3 días", unread: false },
    { id: 5, type: "attendance", title: "Inasistencia registrada", text: "24 de septiembre · excusa médica recibida.", time: "Hace 1 semana", unread: false }
  ];
  var NOTIF_ICON = { grade: "book", achievement: "trophy", behavior: "warning", report: "file", attendance: "calendar" };

  function XPBar(props) {
    var shown = useCountUp(props.xp, true);
    var pct = Math.min(100, props.xp / props.goal * 100);
    var w = useState(prefersReducedMotion() ? pct : 0);
    useEffect(function () { var t = setTimeout(function () { w[1](pct); }, 60); return function () { clearTimeout(t); }; }, [pct]);
    return h("div", { className: "ns-xp" },
      h("div", { className: "ns-xp-head" }, h("span", null, Math.round(shown).toLocaleString("es-CO") + " / " + props.goal.toLocaleString("es-CO") + " XP"), h("span", null, (props.goal - props.xp).toLocaleString("es-CO") + " para el nivel " + (props.level + 1))),
      h("div", { className: "ns-xp-track", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": props.goal, "aria-valuenow": props.xp, "aria-label": "Experiencia hacia el nivel " + (props.level + 1) }, h("span", { style: { width: w[0] + "%" } })));
  }
  function GamifiedHome(props) {
    var unread = NOTIFS.filter(function (n) { return n.unread; }).length;
    return h(Fragment, null,
      h("section", { className: "ns-m-hero" },
        h("div", { className: "ns-row", style: { gap: 14, flexWrap: "nowrap" } },
          h("div", { className: "ns-m-ava" }, h(Avatar, { name: ME.name, size: "lg" }), h("span", { className: "ns-m-level", "aria-hidden": true }, "5")),
          h("div", null, h("span", { className: "ns-m-hi" }, "¡Hola, María Fernanda!"), h("strong", { className: "ns-m-lvl" }, "Nivel 5 · ", h("span", null, "2.480 XP")), h("span", { className: "ns-m-grade-chip" }, h(Icon, { name: "book", size: 13 }), "Séptimo grado · Curso 7A"))),
        h(XPBar, { xp: 2480, goal: 3000, level: 5 }),
        h("div", { className: "ns-m-streak" }, h(Icon, { name: "flame", size: 18 }), h("span", null, h("strong", null, "Racha de 6 días"), " entregando a tiempo"))),
      h(WidgetBoard, { role: "student", onNavigate: props.onNavigate }),
      h("button", { type: "button", className: "ns-m-next", onClick: function () { props.onNavigate("achievements"); } },
        h("span", { className: "ns-ach-medal ns-ach-medal--progress", "aria-hidden": true }, h(Icon, { name: "flame", size: 22 })),
        h("span", { className: "ns-m-next-text" }, h("span", { className: "ns-overline" }, "Próximo logro"), h("strong", null, "Racha Imparable"), h("span", { className: "ns-caption" }, "Te falta una nota de 5.0")),
        h(Icon, { name: "chevright", size: 18 })),
      h("section", { className: "ns-m-card" },
        h("div", { className: "ns-row", style: { justifyContent: "space-between" } }, h("h2", { className: "ns-m-h2" }, "Últimas notas"), h("button", { type: "button", className: "ns-link-btn", onClick: function () { props.onNavigate("grades"); } }, "Ver todas")),
        h("ul", { className: "ns-m-grades" }, [["Matemáticas", "Parcial 2", 4.8], ["Inglés", "Quiz 4", 3.6], ["Física", "Taller 3", 4.2]].map(function (g) {
          return h("li", { key: g[0] }, h("div", null, h("strong", null, g[0]), h("span", { className: "ns-caption" }, g[1])), h("span", { className: cx("ns-m-grade", g[2] >= 4.6 ? "is-top" : g[2] < 3 ? "is-low" : null) }, formatGrade(g[2])));
        }))),
      h("div", { className: "ns-m-quick" },
        h("button", { type: "button", onClick: function () { props.onNavigate("simulator"); } }, h(Icon, { name: "target", size: 20 }), h("span", null, "¿Qué necesito para aprobar?")),
        h("button", { type: "button", onClick: function () { props.onNavigate("observer"); } }, h(Icon, { name: "eye", size: 20 }), h("span", null, "Mi observador")),
        h("button", { type: "button", onClick: function () { props.onNavigate("notifications"); } }, h(Icon, { name: "bell", size: 20 }), h("span", null, unread + " notificaciones nuevas"))));
  }
  function AchievementCard(props) {
    var a = props.a, locked = a.state === "locked";
    return h("button", { type: "button", className: cx("ns-ach", "ns-ach--" + a.state), onClick: props.onClick, "aria-label": a.name + ". " + ACH_STATE[a.state] + (a.state === "progress" ? ", " + a.progress + " de " + a.goal : "") },
      h("span", { className: cx("ns-ach-medal", "ns-ach-medal--" + a.state), "aria-hidden": true }, h(Icon, { name: locked ? "lock" : a.icon, size: 26 })),
      h("strong", null, a.name),
      a.state === "progress" ? h("span", { className: "ns-ach-prog" }, h("i", { style: { width: Math.round(a.progress / a.goal * 100) + "%" } })) : null,
      h("span", { className: "ns-ach-state" }, a.state === "unlocked" ? h(Icon, { name: "check", size: 12, strokeWidth: 3 }) : a.state === "locked" ? h(Icon, { name: "lock", size: 12 }) : null, a.state === "progress" ? a.progress + " de " + a.goal : ACH_STATE[a.state]));
  }
  function Celebration(props) {
    if (!props.open) return null;
    var reduce = prefersReducedMotion();
    var bits = reduce ? [] : Array.apply(null, Array(36)).map(function (_, i) { return h("i", { key: i, className: "ns-confetti ns-confetti--" + (i % 4), style: { left: (seeded(i + 3) * 100) + "%", animationDelay: (seeded(i + 9) * .35) + "s", transform: "rotate(" + Math.round(seeded(i) * 360) + "deg)" } }); });
    return h("div", { className: "ns-celebrate", role: "alertdialog", "aria-modal": true, "aria-labelledby": "ns-cel-t" },
      h("div", { className: "ns-confetti-layer", "aria-hidden": true }, bits),
      h("div", { className: "ns-celebrate-card" },
        h("span", { className: "ns-ach-medal ns-ach-medal--unlocked ns-ach-medal--big", "aria-hidden": true }, h(Icon, { name: props.a.icon, size: 40 })),
        h("span", { className: "ns-overline" }, "Logro desbloqueado"),
        h("h2", { id: "ns-cel-t" }, props.a.name),
        h("p", null, props.a.desc),
        h("strong", { className: "ns-xp-gain" }, "+150 XP"),
        h(Button, { block: true, onClick: props.onClose, "data-autofocus": true, autoFocus: true }, "¡Genial!")));
  }
  function AchievementGallery(props) {
    var list = useState(ACHIEVEMENTS.map(function (a) { return Object.assign({}, a); })), sel = useState(null), cel = useState(null), f = useState("all");
    var shown = list[0].filter(function (a) { return f[0] === "all" || (f[0] === "unlocked" ? a.state === "unlocked" : f[0] === "locked" ? a.state === "locked" : a.state === "progress" || a.state === "claimable"); });
    var unlocked = list[0].filter(function (a) { return a.state === "unlocked"; }).length;
    function claim(a) { list[1](list[0].map(function (x) { return x.id === a.id ? Object.assign({}, x, { state: "unlocked", date: "Hoy" }) : x; })); sel[1](null); cel[1](a); }
    return h(Fragment, null,
      h("p", { className: "ns-m-sub" }, unlocked + " de " + list[0].length + " logros desbloqueados"),
      h(SegmentedTabs, { className: "ns-seg--m", label: "Filtrar logros", value: f[0], onChange: f[1], tabs: [{ value: "all", label: "Todos" }, { value: "unlocked", label: "Desbloqueados" }, { value: "progress", label: "En progreso" }, { value: "locked", label: "Bloqueados" }] }),
      shown.length ? h("div", { className: "ns-ach-grid" }, shown.map(function (a) { return h(AchievementCard, { key: a.id, a: a, onClick: function () { sel[1](a); } }); }))
        : h(EmptyState, { icon: "trophy", title: "No hay logros desbloqueados.", message: "Sigue así: tus próximas notas cuentan." }),
      h(BottomSheet, { open: !!sel[0], onClose: function () { sel[1](null); }, title: sel[0] ? sel[0].name : "" },
        sel[0] ? h("div", { className: "ns-sheet-body" },
          h("span", { className: cx("ns-ach-medal ns-ach-medal--big", "ns-ach-medal--" + sel[0].state), "aria-hidden": true }, h(Icon, { name: sel[0].state === "locked" ? "lock" : sel[0].icon, size: 36 })),
          h(Badge, { tone: sel[0].state === "unlocked" ? "verified" : sel[0].state === "locked" ? "neutral" : "medium", icon: sel[0].state === "unlocked" ? "check" : sel[0].state === "locked" ? "lock" : "clock" }, ACH_STATE[sel[0].state]),
          h("p", null, sel[0].desc),
          h("dl", { className: "ns-dl" }, h("dt", null, "Requisito"), h("dd", null, sel[0].req), h("dt", null, "Progreso"), h("dd", null, sel[0].goal < 2 && sel[0].goal % 1 ? formatGrade(sel[0].progress) + " de " + formatGrade(sel[0].goal) : sel[0].progress + " de " + sel[0].goal), sel[0].date ? h(Fragment, null, h("dt", null, "Obtenido"), h("dd", null, sel[0].date)) : null),
          h("div", { className: "ns-ach-prog ns-ach-prog--lg" }, h("i", { style: { width: Math.min(100, Math.round(sel[0].progress / sel[0].goal * 100)) + "%" } })),
          sel[0].state === "claimable" ? h(Button, { block: true, icon: "trophy", onClick: function () { claim(sel[0]); } }, "Reclamar logro") : null) : null),
      h(Celebration, { open: !!cel[0], a: cel[0] || {}, onClose: function () { cel[1](null); } }));
  }
  function MyGrades(props) {
    var period = useState("3");
    return h(Fragment, null,
      h("p", { className: "ns-m-sub" }, "Séptimo grado · Curso 7A · Año lectivo 2026"),
      h(SegmentedTabs, { className: "ns-seg--m", label: "Periodo", value: period[0], onChange: period[1], tabs: ["1", "2", "3"].map(function (p) { return { value: p, label: "Periodo " + p }; }) }),
      h("ul", { className: "ns-m-subjects" }, MY_SUBJECTS.map(function (s, i) {
        var g = Math.max(1, Math.round((s[1] - (3 - Number(period[0])) * .15 * ((i % 3) - .5)) * 10) / 10);
        return h("li", { key: s[0] }, h("div", null, h("strong", null, s[0]), h("span", { className: "ns-caption" }, PERF(g) + " · " + (3 + i % 3) + " notas registradas"), h("span", { className: "ns-m-meter" }, h("i", { style: { width: (g / 5 * 100) + "%" } }))), h("span", { className: cx("ns-m-grade", g >= 4.6 ? "is-top" : g < 3 ? "is-low" : null) }, formatGrade(g)));
      })));
  }
  function PerformanceChart(props) {
    var pts = props.points || [3.9, 4.1, 4.3, 4.4];
    return h(Fragment, null,
      h("section", { className: "ns-m-card ns-m-card--navy" }, h("span", { className: "ns-overline", style: { color: "var(--gold)" } }, "Promedio actual"), h("strong", { className: "ns-big-ivory" }, formatGrade(pts[pts.length - 1])), h("span", { className: "ns-m-delta" }, h(Icon, { name: "sortup", size: 14 }), "+" + formatGrade(pts[pts.length - 1] - pts[pts.length - 2]) + " desde el periodo anterior")),
      h("section", { className: "ns-m-card" }, h(LineChart, { title: "Tu evolución", subtitle: "Promedio por periodo", labels: ["P1", "P2", "P3", "P4"].slice(0, pts.length), width: 330, min: 1, max: 5, ticks: [1, 3, 5], threshold: 3, thresholdLabel: "Mínimo 3.0", height: 220, series: [{ name: "Promedio", points: pts }], format: function (v) { return v.toFixed(1); } })),
      h("section", { className: "ns-m-card" }, h("h2", { className: "ns-m-h2" }, "Por materia"),
        h("ul", { className: "ns-hbars", role: "list" }, MY_SUBJECTS.slice().sort(function (a, b) { return b[1] - a[1]; }).map(function (s) {
          return h("li", { key: s[0] }, h("span", null, s[0]), h("span", { className: "ns-hbar" }, h("i", { className: s[1] < 4 ? "is-gold" : null, style: { width: (s[1] / 5 * 100) + "%" } })), h("strong", null, formatGrade(s[1])));
        })),
        h("p", { className: "ns-caption" }, "Inglés es la materia donde más puedes subir.")));
  }
  function Stepper(props) {
    var v = props.value;
    function set(x) { props.onChange(Math.max(1, Math.min(5, Math.round(x * 10) / 10))); }
    return h("div", { className: "ns-sim-row" },
      h("div", { className: "ns-sim-head" }, h("label", { htmlFor: props.id }, props.label, h("small", null, props.weight + "%")), props.fixed ? h(Badge, { tone: "neutral", icon: "lock" }, "Nota real") : h(Badge, { tone: "medium", icon: "target" }, "Hipotética")),
      h("div", { className: "ns-sim-ctrl" },
        h("button", { type: "button", className: "ns-step-btn", "aria-label": "Bajar " + props.label, disabled: props.fixed || v <= 1, onClick: function () { set(v - .1); } }, h(Icon, { name: "minus", size: 18 })),
        h("input", { id: props.id, type: "range", min: 1, max: 5, step: .1, value: v, disabled: props.fixed, className: "ns-range", "aria-valuetext": formatGrade(v), onChange: function (e) { set(Number(e.target.value)); } }),
        h("button", { type: "button", className: "ns-step-btn", "aria-label": "Subir " + props.label, disabled: props.fixed || v >= 5, onClick: function () { set(v + .1); } }, h(Icon, { name: "plus", size: 18 })),
        h("span", { className: "ns-sim-val", "aria-hidden": true }, formatGrade(v))));
  }
  function GradeSimulator(props) {
    var subj = useState("Inglés");
    var vals = useState({ a1: 4.0, a2: 3.2, ws: 4.2, ex: 3.5, at: 4.5 });
    var fixed = { a1: true, a2: true };
    var v = vals[0], sum = 0;
    GB_COLS.forEach(function (c) { sum += v[c[0]] * c[2]; });
    var proj = Math.round(sum / 100 * 10) / 10, ok = proj >= 3;
    var shown = useCountUp(proj, true);
    var need = Math.max(0, Math.round((3 - proj) * 10) / 10);
    return h(Fragment, null,
      h("p", { className: "ns-m-sub" }, "Mueve las notas que aún no tienes y mira cómo cambiaría tu promedio."),
      h("div", { className: "ns-row" }, h(FilterGroup, { as: "select", label: "Materia", value: subj[0], onChange: subj[1], options: MY_SUBJECTS.map(function (s) { return { value: s[0], label: s[0] }; }) })),
      h("section", { className: cx("ns-sim-result", ok ? "is-ok" : "is-low"), "aria-live": "polite" },
        h(Sticker, { tone: "paper", rotate: -3 }, "Proyección"),
        h("span", { className: "ns-overline" }, "Promedio proyectado"),
        h("strong", { className: "ns-sim-big" }, formatGrade(shown)),
        h("span", { className: "ns-sim-msg" }, h(Icon, { name: ok ? "check" : "warning", size: 16 }), ok ? "Tu promedio proyectado supera el mínimo." : "Necesitas mejorar " + formatGrade(need) + " puntos.")),
      h("section", { className: "ns-m-card" }, GB_COLS.map(function (c) { return h(Stepper, { key: c[0], id: "sim-" + c[0], label: c[1], weight: c[2], fixed: fixed[c[0]], value: v[c[0]], onChange: function (x) { var o = Object.assign({}, v); o[c[0]] = x; vals[1](o); } }); })),
      h("p", { className: "ns-caption ns-sim-note" }, h(Icon, { name: "lock", size: 12 }), " Esto es un simulador, no un resultado académico oficial."));
  }
  function NotificationItem(props) {
    var n = props.n;
    return h("li", null, h("button", { type: "button", className: cx("ns-notif", n.unread && "is-unread"), onClick: props.onClick, "aria-label": (n.unread ? "Sin leer. " : "") + n.title + ". " + n.text + ". " + n.time },
      h("span", { className: "ns-notif-icon ns-notif-icon--" + n.type, "aria-hidden": true }, h(Icon, { name: NOTIF_ICON[n.type], size: 18 })),
      h("span", { className: "ns-notif-text" }, h("strong", null, n.title), h("span", null, n.text), h("span", { className: "ns-caption" }, n.time)),
      n.unread ? h("i", { className: "ns-notif-dot", "aria-hidden": true }) : null));
  }
  function NotificationFeed(props) {
    var items = useState((props.items || NOTIFS).map(function (n) { return Object.assign({}, n); })), f = useState("all");
    var list = items[0].filter(function (n) { return f[0] === "all" || n.unread; }), unread = items[0].filter(function (n) { return n.unread; }).length;
    return h(Fragment, null,
      h("div", { className: "ns-row", style: { justifyContent: "space-between" } },
        h(SegmentedTabs, { className: "ns-seg--m", label: "Filtrar notificaciones", value: f[0], onChange: f[1], tabs: [{ value: "all", label: "Todas" }, { value: "unread", label: "Sin leer", count: unread }] }),
        unread ? h("button", { type: "button", className: "ns-link-btn", onClick: function () { items[1](items[0].map(function (n) { return Object.assign({}, n, { unread: false }); })); } }, "Marcar todas como leídas") : null),
      list.length ? h("ul", { className: "ns-notif-list" }, list.map(function (n) { return h(NotificationItem, { key: n.id, n: n, onClick: function () { items[1](items[0].map(function (x) { return x.id === n.id ? Object.assign({}, x, { unread: false }) : x; })); } }); }))
        : h(EmptyState, { icon: "bell", title: "Estás al día.", message: "No tienes notificaciones sin leer." }));
  }
  var STUDENT_TITLES = { home: null, grades: "Mis calificaciones", performance: "Mi Rendimiento", achievements: "Logros", simulator: "¿Qué necesito para aprobar?", notifications: "Notificaciones", observer: "Observador" };
  /* ---------- Login de la app móvil (Estudiante y Acudiente) ---------- */
  function MobileLoginPage(props) {
    var role = useState(props.defaultRole || "student"), user = useState(""), pass = useState(""), tried = useState(false), busy = useState(false), show = useState(false);
    var isS = role[0] === "student";
    var userErr = tried[0] && user[0].trim().length < 4 ? (isS ? "Escribe tu código estudiantil o tu correo." : "Escribe tu documento o tu correo.") : null;
    var passErr = tried[0] && pass[0].length < 6 ? "La contraseña tiene al menos 6 caracteres." : null;
    function submit(e) { e.preventDefault(); tried[1](true); if (user[0].trim().length < 4 || pass[0].length < 6) return; busy[1](true); setTimeout(function () { busy[1](false); if (props.onLogin) props.onLogin(role[0]); }, 800); }
    return h("div", { className: "ns ns-phone-stage ns-canvas", style: props.style },
      h("div", { className: "ns-phone ns-phone--login" },
        h("div", { className: "ns-phone-status ns-phone-status--inverse", "aria-hidden": true }, h("span", null, "9:41"), h("span", { className: "ns-row", style: { gap: 4 } }, h(Icon, { name: "wifi", size: 13 }), h("i", { className: "ns-battery ns-battery--inverse" }))),
        h("div", { className: "ns-ml-top" },
          h("svg", { className: "ns-ml-art", viewBox: "0 0 200 160", "aria-hidden": true },
            h("path", { className: "f-sage a-blob a-blob2", d: "M120 8c34-6 70 14 74 46 4 30-22 50-50 56-30 6-62-8-68-36-6-30 12-60 44-66Z" }),
            h("circle", { className: "f-gold a-sun", cx: 168, cy: 118, r: 22 }),
            h("g", { className: "a-paper", transform: "rotate(-8 118 72)" }, h("rect", { className: "f-paper", x: 92, y: 38, width: 58, height: 74, rx: 7 }), h("rect", { className: "f-navy-op", x: 100, y: 48, width: 14, height: 14, rx: 2 }), h("rect", { className: "f-line", x: 100, y: 70, width: 40, height: 4, rx: 2 }), h("rect", { className: "f-line", x: 100, y: 80, width: 32, height: 4, rx: 2 }), h("rect", { className: "f-line", x: 100, y: 90, width: 38, height: 4, rx: 2 }), h("text", { className: "t-hand", x: 138, y: 59, textAnchor: "middle" }, "4,8"))),
          h("div", { className: "ns-ml-brand" }, h(Logo, { size: 24 })),
          h("h1", { className: "ns-ml-hello" }, "¡Hola", h("span", null, "!")),
          h("p", { className: "ns-ml-sub" }, isS ? "Tus notas, tus logros y tu progreso." : "Sigue el proceso académico de tu hijo o hija.")),
        h("form", { className: "ns-ml-sheet", onSubmit: submit, noValidate: true },
          h(SegmentedTabs, { className: "ns-seg--m ns-ml-roles", label: "Entrar como", value: role[0], onChange: function (v) { role[1](v); tried[1](false); }, tabs: [{ value: "student", label: "Soy estudiante", icon: "user" }, { value: "parent", label: "Soy acudiente", icon: "heart" }] }),
          h("h2", { className: "ns-ml-title" }, "Iniciar sesión"),
          h("div", { className: cx("ns-auth-field", userErr && "is-invalid") },
            h("label", { htmlFor: "ml-user" }, isS ? "Código estudiantil o correo" : "Documento o correo"),
            h("div", { className: "ns-auth-input" }, h(Icon, { name: isS ? "user" : "mail", size: 18 }), h("input", { id: "ml-user", value: user[0], onChange: function (e) { user[1](e.target.value); }, placeholder: isS ? "20261168" : "gloria@correo.com", autoComplete: "username", inputMode: isS ? "text" : "email", "aria-invalid": userErr ? true : undefined })),
            userErr ? h("span", { className: "ns-auth-error", role: "alert" }, h(Icon, { name: "warning", size: 14 }), userErr) : null),
          h("div", { className: cx("ns-auth-field", passErr && "is-invalid") },
            h("label", { htmlFor: "ml-pass" }, "Contraseña"),
            h("div", { className: "ns-auth-input" }, h(Icon, { name: "lock", size: 18 }), h("input", { id: "ml-pass", type: show[0] ? "text" : "password", value: pass[0], onChange: function (e) { pass[1](e.target.value); }, placeholder: "••••••••", autoComplete: "current-password", "aria-invalid": passErr ? true : undefined }),
              h("button", { type: "button", className: "ns-auth-eye", "aria-label": show[0] ? "Ocultar contraseña" : "Mostrar contraseña", "aria-pressed": show[0], onClick: function () { show[1](!show[0]); } }, h(Icon, { name: "eye", size: 18 }))),
            passErr ? h("span", { className: "ns-auth-error", role: "alert" }, h(Icon, { name: "warning", size: 14 }), passErr) : null),
          h("a", { href: "#", className: "ns-ml-forgot", onClick: function (e) { e.preventDefault(); } }, "¿Olvidaste tu contraseña?"),
          h("button", { type: "submit", className: "ns-auth-submit", disabled: busy[0], "aria-busy": busy[0] || undefined }, busy[0] ? [h(Dots, { key: "d" }), " Entrando…"] : ["Entrar ", h(Icon, { key: "a", name: "arrow", size: 18 })]),
          h("p", { className: "ns-ml-foot" }, isS ? "¿No tienes cuenta? Pídela a tu director de grupo." : "¿Primera vez? Usa el enlace que te envió el colegio."))));
  }

  /* ================= WIDGETS MÓVILES ================= */
  /* Reloj simulado de la demo: arranca a las 9:41:00 y avanza en tiempo real. */
  function useDemoClock() {
    var base = useRef(Date.now()), st = useState(0);
    useEffect(function () { var t = setInterval(function () { st[1]((Date.now() - base.current) / 1000 | 0); }, 1000); return function () { clearInterval(t); }; }, []);
    return 9 * 3600 + 41 * 60 + st[0];
  }
  function hhmm(sec) { var h_ = Math.floor(sec / 3600) % 24, m = Math.floor(sec / 60) % 60; return h_ + ":" + (m < 10 ? "0" : "") + m; }
  function mmss(sec) { sec = Math.max(0, sec); var m = Math.floor(sec / 60), s = sec % 60; return m + ":" + (s < 10 ? "0" : "") + s; }
  var TODAY_7A = [
    { subject: "Matemáticas", start: 7 * 3600, end: 7 * 3600 + 55 * 60, room: "Aula 204", teacher: "Ana Lucía Rosero" },
    { subject: "Lengua Castellana", start: 8 * 3600, end: 8 * 3600 + 55 * 60, room: "Aula 204", teacher: "Claudia Benavides" },
    { subject: "Inglés", start: 9 * 3600, end: 9 * 3600 + 55 * 60, room: "Laboratorio de idiomas", teacher: "Mauricio Ortiz" },
    { subject: "Física", start: 10 * 3600 + 20 * 60, end: 11 * 3600 + 15 * 60, room: "Laboratorio 2", teacher: "Jorge Eraso" },
    { subject: "Tecnología", start: 11 * 3600 + 20 * 60, end: 12 * 3600 + 15 * 60, room: "Sala de sistemas", teacher: "Paola Insuasty" }
  ];
  function classNow(now) {
    var cur = null, next = null;
    TODAY_7A.forEach(function (c) { if (now >= c.start && now < c.end) cur = c; if (!next && c.start > now) next = c; });
    return { cur: cur, next: next };
  }

  /* Anillo de progreso: se llena al aparecer. */
  function WidgetRing(props) {
    var r = props.r || 30, c = 2 * Math.PI * r, pct = Math.max(0, Math.min(1, props.value / (props.max || 1))), s = (r + 7) * 2;
    return h("svg", { className: cx("ns-w-ring", props.tone && "ns-w-ring--" + props.tone), width: s, height: s, viewBox: "0 0 " + s + " " + s, "aria-hidden": true },
      h("circle", { className: "ns-w-ring-track", cx: s / 2, cy: s / 2, r: r }),
      h("circle", { className: "ns-w-ring-fill", cx: s / 2, cy: s / 2, r: r, transform: "rotate(-90 " + s / 2 + " " + s / 2 + ")", style: { strokeDasharray: c, strokeDashoffset: c * (1 - pct), "--c": c } }),
      h("text", { className: "ns-w-ring-val", x: s / 2, y: s / 2, textAnchor: "middle", dominantBaseline: "central" }, props.label));
  }
  function Sparkline(props) {
    var pts = props.points, W = props.width || 84, H = props.height || 26, min = props.min, max = props.max;
    var x = function (i) { return 4 + i * (W - 8) / (pts.length - 1); }, y = function (v) { return H - 4 - (v - min) / (max - min) * (H - 8); };
    var d = pts.map(function (v, i) { return (i ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1); }).join("");
    return h("svg", { className: "ns-w-spark", width: W, height: H, viewBox: "0 0 " + W + " " + H, "aria-hidden": true },
      h("path", { className: "ns-w-spark-line", d: d, pathLength: 1 }),
      pts.map(function (v, i) { return h("circle", { key: i, className: cx("ns-w-spark-dot", i === pts.length - 1 && "is-last"), cx: x(i), cy: y(v), r: i === pts.length - 1 ? 3.5 : 2.5, style: { "--i": i } }); }));
  }

  /* Contenedor base de un widget: tamaño s (1 columna) o m (2 columnas). */
  function MobileWidget(props) {
    var tag = props.onClick ? "button" : "div";
    return h("div", { className: cx("ns-w", "ns-w--" + (props.size || "s"), props.tone && "ns-w--" + props.tone, props.editing && "is-editing"), style: props.style },
      h(tag, { type: tag === "button" ? "button" : undefined, className: "ns-w-body", onClick: props.editing ? undefined : props.onClick, "aria-label": props.ariaLabel, "aria-disabled": tag === "button" && props.editing ? true : undefined, tabIndex: tag === "button" && props.editing ? -1 : undefined },
        h("span", { className: "ns-w-head" }, props.icon ? h(Icon, { name: props.icon, size: 14, strokeWidth: 2.5 }) : null, h("span", null, props.title)),
        props.children),
      props.editing && props.onRemove ? h("button", { type: "button", className: "ns-w-remove", "aria-label": "Quitar widget " + props.title, onClick: props.onRemove }, h(Icon, { name: "close", size: 14, strokeWidth: 3 })) : null);
  }

  function WidgetContent(props) {
    var k = props.kind, now = props.now, cn = classNow(now), go = props.onNavigate || function () {};
    if (k === "average") return h(MobileWidget, { key: k, title: props.parent ? "Promedio" : "Mi promedio", icon: "reports", tone: "navy", editing: props.editing, onRemove: props.onRemove, onClick: function () { go(props.parent ? "grades" : "performance"); }, ariaLabel: "Promedio del periodo 4.4, alto. Ver detalle" },
      h("div", { className: "ns-w-avg" }, h(WidgetRing, { value: 4.4, max: 5, label: "4.4", tone: "gold" }),
        h("div", { className: "ns-w-avg-side" }, h("strong", null, "Alto"), h(Sparkline, { points: [4.2, 4.3, 4.4], min: 4, max: 4.6, width: 64 }), h("span", null, "+0.1 vs P2"))));
    if (k === "next") {
      var target = cn.cur ? cn.cur : cn.next, inClass = !!cn.cur;
      var left = target ? (inClass ? target.end - now : target.start - now) : 0;
      var pct = inClass ? (now - target.start) / (target.end - target.start) : 0;
      return h(MobileWidget, { key: k, size: "m", title: inClass ? "En clase ahora" : "Próxima clase", icon: "clock", tone: "gold", editing: props.editing, onRemove: props.onRemove },
        target ? h("div", { className: "ns-w-next" },
          h("div", { className: "ns-w-next-main" },
            h("span", { className: "ns-w-live" }, h("i", { "aria-hidden": true }), inClass ? "Ahora" : "Hoy " + hhmm(target.start)),
            h("strong", null, target.subject),
            h("span", { className: "ns-w-meta" }, target.room + " · " + target.teacher)),
          h("div", { className: "ns-w-count", "aria-live": "off" }, h("span", null, inClass ? "termina en" : "empieza en"), h("b", null, mmss(left)))) : h("p", { className: "ns-w-meta" }, "No hay más clases hoy."),
        inClass ? h("span", { className: "ns-w-classbar", role: "progressbar", "aria-label": "Avance de la clase", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": Math.round(pct * 100) }, h("i", { style: { width: pct * 100 + "%" } })) : null,
        h("ol", { className: "ns-w-day", "aria-label": "Clases de hoy" }, TODAY_7A.map(function (c) { var st = now >= c.end ? "done" : now >= c.start ? "now" : "todo"; return h("li", { key: c.subject, className: "is-" + st, title: c.subject + " " + hhmm(c.start) }, h("span", { className: "ns-sr" }, c.subject + ", " + (st === "done" ? "terminada" : st === "now" ? "en curso" : "pendiente"))); })));
    }
    if (k === "attendance") {
      var week = [["L", "present"], ["M", "present"], ["M", "absent"], ["J", "present"], ["V", "today"]];
      return h(MobileWidget, { key: k, title: "Asistencia", icon: "calendar", tone: "sage", editing: props.editing, onRemove: props.onRemove, onClick: function () { go(props.parent ? "attendance" : "grades"); }, ariaLabel: "Asistencia 96 por ciento. Una falta justificada esta semana" },
        h("strong", { className: "ns-w-big" }, h(CountUp, { value: "96%" })),
        h("ul", { className: "ns-w-week", "aria-hidden": true }, week.map(function (d, i) { return h("li", { key: i, className: "is-" + d[1], style: { "--i": i } }, h("i", null), h("span", null, d[0])); })),
        h("span", { className: "ns-w-meta" }, "1 falta justificada"));
    }
    if (k === "streak") return h(MobileWidget, { key: k, title: "Racha", icon: "flame", tone: "burgundy", editing: props.editing, onRemove: props.onRemove, onClick: function () { go("achievements"); }, ariaLabel: "Racha de 6 días entregando a tiempo" },
      h("div", { className: "ns-w-streak" }, h("span", { className: "ns-w-flame", "aria-hidden": true }, h(Icon, { name: "flame", size: 34, strokeWidth: 2.2 })), h("strong", { className: "ns-w-big" }, h(CountUp, { value: "6" }), h("small", null, " días"))),
      h("span", { className: "ns-w-bars", "aria-hidden": true }, [1, 1, 1, 1, 1, 1, 0].map(function (v, i) { return h("i", { key: i, className: v ? "is-on" : null, style: { "--i": i } }); })),
      h("span", { className: "ns-w-meta" }, "Mañana llegas a 7"));
    if (k === "due") return h(MobileWidget, { key: k, title: "Próxima entrega", icon: "evaluations", editing: props.editing, onRemove: props.onRemove, onClick: function () { go("grades"); }, ariaLabel: "Próxima entrega: Taller 4 de Física, en 2 días" },
      h("div", { className: "ns-w-due" }, h("span", { className: "ns-w-cal", "aria-hidden": true }, h("small", null, "OCT"), h("b", null, "3")), h("div", null, h("strong", null, "Taller 4"), h("span", { className: "ns-w-meta" }, "Física · 15%"))),
      h("span", { className: "ns-w-pill" }, h(Icon, { name: "clock", size: 12 }), "en 2 días"));
    if (k === "goal") return h(MobileWidget, { key: k, title: "Próximo logro", icon: "trophy", tone: "gold-soft", editing: props.editing, onRemove: props.onRemove, onClick: function () { go("achievements"); }, ariaLabel: "Próximo logro Constancia, 7 de 10" },
      h("div", { className: "ns-w-avg" }, h(WidgetRing, { value: 7, max: 10, r: 24, label: "7/10", tone: "sage" }), h("div", { className: "ns-w-avg-side" }, h("strong", null, "Constancia"), h("span", null, "3 talleres más"))));
    if (k === "lastgrade") return h(MobileWidget, { key: k, title: "Última nota", icon: "book", editing: props.editing, onRemove: props.onRemove, onClick: function () { go("grades"); }, ariaLabel: "Última nota: Matemáticas, Parcial 2, 4.8" },
      h("div", { className: "ns-w-last" }, h("span", { className: "ns-w-gradetile" }, h(CountUp, { value: "4.8" })), h("div", null, h("strong", null, "Matemáticas"), h("span", { className: "ns-w-meta" }, "Parcial 2 · hace 15 min"))));
    if (k === "event") return h(MobileWidget, { key: k, size: "m", title: "Próximo en el colegio", icon: "calendar", tone: "gold", editing: props.editing, onRemove: props.onRemove, onClick: function () { go("reportcards"); }, ariaLabel: "Entrega de boletines del Periodo 3 el 10 de octubre" },
      h("div", { className: "ns-w-due" }, h("span", { className: "ns-w-cal", "aria-hidden": true }, h("small", null, "OCT"), h("b", null, "10")), h("div", null, h("strong", null, "Entrega de boletines · Periodo 3"), h("span", { className: "ns-w-meta" }, "Reunión con el director de grupo · 7:00 a. m."))),
      h("span", { className: "ns-w-pill" }, h(Icon, { name: "clock", size: 12 }), "en 9 días"));
    return null;
  }

  var WIDGETS_BY_ROLE = {
    student: { all: ["next", "average", "streak", "attendance", "due", "goal", "lastgrade"], start: ["next", "average", "streak", "attendance", "due"] },
    parent: { all: ["average", "attendance", "event", "lastgrade", "next"], start: ["average", "attendance", "event"] }
  };
  var WIDGET_NAMES = { next: "Clase de hoy", average: "Promedio", streak: "Racha", attendance: "Asistencia", due: "Próxima entrega", goal: "Próximo logro", lastgrade: "Última nota", event: "Próximo en el colegio" };

  /* Tablero de widgets en Inicio. "Editar" permite quitar, añadir y reordenar (mantener presionado = modo edición). */
  function WidgetBoard(props) {
    var role = props.role || "student", cfg = WIDGETS_BY_ROLE[role];
    var list = useState(props.initial || cfg.start), edit = useState(!!props.editing), now = useDemoClock();
    var hidden = cfg.all.filter(function (k) { return list[0].indexOf(k) < 0; });
    var press = useRef(null);
    function startPress() { press.current = setTimeout(function () { edit[1](true); }, 550); }
    function endPress() { clearTimeout(press.current); }
    return h("section", { className: cx("ns-wboard", "ns-wboard--" + role, edit[0] && "is-editing"), "aria-label": "Widgets" },
      h("div", { className: "ns-wboard-head" },
        h("h2", { className: "ns-m-h2" }, props.title || "Tus widgets"),
        h("button", { type: "button", className: "ns-link-btn", "aria-pressed": edit[0], onClick: function () { edit[1](!edit[0]); } }, edit[0] ? "Listo" : "Editar")),
      h("div", { className: "ns-wgrid", onPointerDown: edit[0] ? undefined : startPress, onPointerUp: endPress, onPointerLeave: endPress },
        list[0].map(function (k, i) {
          return h(WidgetContent, { key: k, kind: k, now: now, parent: role === "parent", editing: edit[0], onNavigate: props.onNavigate,
            onRemove: function () { list[1](list[0].filter(function (x) { return x !== k; })); } });
        })),
      edit[0] ? h("div", { className: "ns-wadd" },
        h("span", { className: "ns-overline" }, hidden.length ? "Añadir widget" : "Todos los widgets están en tu Inicio"),
        h("div", { className: "ns-wadd-list" }, hidden.map(function (k) {
          return h("button", { key: k, type: "button", className: "ns-wadd-chip", onClick: function () { list[1](list[0].concat([k])); } }, h(Icon, { name: "plus", size: 14, strokeWidth: 3 }), WIDGET_NAMES[k]);
        }))) : null);
  }

  /* Widgets en la pantalla de inicio del teléfono (fuera de la app): pequeño, mediano y grande. */
  function HomeScreenWidgets(props) {
    var role = props.role || "student", now = useDemoClock(), cn = classNow(now);
    var target = cn.cur || cn.next, inClass = !!cn.cur, left = target ? (inClass ? target.end - now : target.start - now) : 0;
    var apps = [["calendar", "Calendario"], ["mail", "Correo"], ["phone", "Teléfono"], ["settings", "Ajustes"]];
    function hs(size, label, children, tone) { return h("div", { className: cx("ns-hsw", "ns-hsw--" + size, tone && "ns-hsw--" + tone), role: "group", "aria-label": "Widget de NotaScan: " + label }, children, h("span", { className: "ns-hsw-brand", "aria-hidden": true }, h("i", null), "NotaScan")); }
    var small = role === "student"
      ? hs("s", "promedio 4.4", h(Fragment, null, h(WidgetRing, { value: 4.4, max: 5, r: 26, label: "4.4", tone: "gold" }), h("span", { className: "ns-hsw-cap" }, "Promedio · P3")), "navy")
      : hs("s", "María Fernanda llegó 6:52", h(Fragment, null, h("span", { className: "ns-hsw-ok" }, h(Icon, { name: "check", size: 22, strokeWidth: 3 })), h("strong", null, "Llegó 6:52"), h("span", { className: "ns-hsw-cap" }, "María Fernanda · hoy")), "sage");
    var small2 = target ? hs("s", (inClass ? "en clase de " : "próxima clase ") + target.subject, h(Fragment, null,
      h("span", { className: "ns-w-live" }, h("i", { "aria-hidden": true }), inClass ? "Ahora" : hhmm(target.start)),
      h("strong", null, target.subject), h("b", { className: "ns-hsw-count" }, mmss(left))), "gold") : null;
    var medium = hs("m", role === "student" ? "últimas notas" : "notas de María Fernanda", h(Fragment, null,
      h("span", { className: "ns-hsw-title" }, role === "student" ? "Últimas notas" : "Notas de María Fernanda"),
      h("ul", { className: "ns-hsw-list" }, [["Matemáticas", "Parcial 2", 4.8], ["Inglés", "Quiz 4", 3.6], ["Física", "Taller 3", 4.2]].map(function (g, i) {
        return h("li", { key: g[0], style: { "--i": i } }, h("span", null, h("strong", null, g[0]), " · " + g[1]), h("b", null, formatGrade(g[2])));
      }))));
    var large = hs("l", "horario de hoy", h(Fragment, null,
      h("span", { className: "ns-hsw-title" }, "Hoy · 7A"),
      h("ol", { className: "ns-hsw-day" }, TODAY_7A.map(function (c) {
        var st = now >= c.end ? "done" : now >= c.start ? "now" : "todo", p = st === "now" ? (now - c.start) / (c.end - c.start) : st === "done" ? 1 : 0;
        return h("li", { key: c.subject, className: "is-" + st }, h("span", { className: "ns-hsw-time" }, hhmm(c.start)), h("span", { className: "ns-hsw-subj" }, h("strong", null, c.subject), h("small", null, c.room)), h("span", { className: "ns-hsw-prog" }, h("i", { style: { width: p * 100 + "%" } })));
      }))));
    return h("div", { className: "ns ns-phone-stage ns-canvas", style: props.style },
      h("div", { className: "ns-phone ns-phone--home" },
        h("div", { className: "ns-phone-status ns-phone-status--inverse", "aria-hidden": true }, h("span", null, hhmm(now)), h("span", { className: "ns-row", style: { gap: 4 } }, h(Icon, { name: "wifi", size: 13 }), h("i", { className: "ns-battery ns-battery--inverse" }))),
        h("svg", { className: "ns-hs-wall", viewBox: "0 0 390 844", preserveAspectRatio: "xMidYMid slice", "aria-hidden": true },
          h("path", { className: "a-blob", d: "M300 40c60 10 110 70 96 140-14 72-90 104-160 92-70-12-110-70-96-130 14-62 90-114 160-102Z", fill: "rgba(107,143,113,.45)" }),
          h("circle", { className: "a-sun", cx: 60, cy: 700, r: 90, fill: "rgba(184,146,75,.28)" }),
          h("circle", { className: "a-bub", cx: 340, cy: 560, r: 24, fill: "rgba(247,243,236,.08)" })),
        h("div", { className: "ns-hs" },
          h("div", { className: "ns-hs-clock" }, h("span", null, "miércoles, 1 de octubre"), h("strong", null, hhmm(now))),
          h("div", { className: "ns-hs-grid" }, small, small2, medium, large),
          h("div", { className: "ns-hs-dock" },
            h("span", { className: "ns-hs-app ns-hs-app--ns" }, h("i", null, "N"), h("small", null, "NotaScan")),
            apps.map(function (a) { return h("span", { key: a[0], className: "ns-hs-app" }, h("i", null, h(Icon, { name: a[0], size: 22 })), h("small", null, a[1])); })))));
  }

  function StudentApp(props) {
    var page = props.page || "home";
    var nav = function (id) { if (props.onNavigate) props.onNavigate(id); };
    var body = page === "grades" ? h(MyGrades) : page === "performance" ? h(PerformanceChart) : page === "achievements" ? h(AchievementGallery) : page === "simulator" ? h(GradeSimulator) : page === "notifications" ? h(NotificationFeed) : page === "observer" ? h(ObserverTimeline, { compact: true, items: OBS.slice(0, 4) }) : h(Fragment, null, h("h1", { className: "ns-sr" }, "Inicio"), h(GamifiedHome, { onNavigate: nav }));
    return h(MobileShell, { role: "student", active: page, onNavigate: nav, onLogout: props.onLogout, title: STUDENT_TITLES[page], style: props.style, back: page === "notifications" || page === "observer" ? function () { nav("home"); } : null, unread: 3 }, body);
  }

  /* ---------- Acudiente ---------- */
  var PARENT_NOTIFS = [
    { id: 1, type: "attendance", title: "Inasistencia registrada", text: "María Fernanda no asistió el 24 de septiembre. Excusa médica recibida.", time: "Hace 1 semana", unread: true },
    { id: 2, type: "report", title: "Boletín del Periodo 2", text: "Ya puedes consultar y descargar el boletín.", time: "Hace 3 días", unread: true },
    { id: 3, type: "grade", title: "Nueva calificación", text: "Matemáticas · Parcial 2: 4.8.", time: "Hace 15 min", unread: false },
    { id: 4, type: "behavior", title: "Llamado de atención", text: "Llegó tarde a la clase de Física.", time: "Hace 9 días", unread: false }
  ];
  function ParentHome(props) {
    return h(Fragment, null,
      h("div", { className: "ns-child" }, h(Avatar, { name: ME.name }), h("div", null, h("strong", null, "María Fernanda López"), h("span", { className: "ns-caption" }, "Séptimo · 7A · Colegio Los Andes")), h(Badge, { tone: "verified", icon: "check" }, "Activa")),
      h("section", { className: "ns-p-alerts", "aria-label": "Avisos importantes" },
        h("h2", { className: "ns-m-h2" }, "Importante"),
        h("button", { type: "button", className: "ns-p-alert ns-p-alert--attention", onClick: function () { props.onNavigate("attendance"); } }, h(Icon, { name: "calendar", size: 18 }), h("span", null, h("strong", null, "Inasistencia el 24 de septiembre"), h("span", null, "Excusa médica recibida · no requiere acción")), h(Icon, { name: "chevright", size: 16 })),
        h("button", { type: "button", className: "ns-p-alert", onClick: function () { props.onNavigate("reportcards"); } }, h(Icon, { name: "file", size: 18 }), h("span", null, h("strong", null, "Boletín del Periodo 2 disponible"), h("span", null, "Consúltalo y descárgalo en PDF")), h(Icon, { name: "chevright", size: 16 }))),
      h(WidgetBoard, { role: "parent", title: "Resumen", onNavigate: props.onNavigate }),
      h("section", { className: "ns-m-card" }, h("h2", { className: "ns-m-h2" }, "Calificaciones recientes"),
        h("ul", { className: "ns-m-grades" }, [["Matemáticas", "Parcial 2 · 28 sep", 4.8], ["Inglés", "Quiz 4 · 26 sep", 3.6], ["Física", "Taller 3 · 22 sep", 4.2]].map(function (g) { return h("li", { key: g[0] }, h("div", null, h("strong", null, g[0]), h("span", { className: "ns-caption" }, g[1])), h("span", { className: "ns-m-grade" }, formatGrade(g[2]))); }))));
  }
  function ParentGrades() {
    return h(Fragment, null, h("p", { className: "ns-m-sub" }, "Periodo 3 · notas verificadas por cada docente."),
      h("ul", { className: "ns-m-subjects ns-m-subjects--calm" }, MY_SUBJECTS.map(function (s) {
        return h("li", { key: s[0] }, h("div", null, h("strong", null, s[0]), h("span", { className: "ns-caption" }, PERF(s[1]) + (s[1] < 4 ? " · puede mejorar" : ""))), h("span", { className: "ns-m-grade" }, formatGrade(s[1])));
      })),
      h("p", { className: "ns-caption" }, "Escala: Superior 4.6–5.0 · Alto 4.0–4.5 · Básico 3.0–3.9 · Bajo 1.0–2.9"));
  }
  function ParentReportCards(props) {
    var open = useState(null);
    var list = [["Periodo 3", "Se publica el 20 de octubre", "soon"], ["Periodo 2", "Notas de P1 y P2 · acumulado", "ok"], ["Periodo 1", "Primer informe del año", "ok"]];
    if (open[0]) return h(Fragment, null, h(Button, { variant: "ghost", size: "sm", icon: "chevleft", onClick: function () { open[1](null); } }, "Boletines"), h("div", { className: "ns-paper-scroll ns-paper-scroll--m" }, h(ReportCardDocument, { student: ME, period: open[0], compact: true })), h(Button, { block: true, icon: "download" }, "Descargar PDF"));
    return h("ul", { className: "ns-rc-list" }, list.map(function (r) {
      return h("li", { key: r[0] }, h("span", { className: "ns-file-icon", "aria-hidden": true }, h(Icon, { name: r[2] === "ok" ? "file" : "clock", size: 18 })),
        h("div", { className: "ns-list-main" }, h("strong", null, "Boletín · " + r[0]), h("span", { className: "ns-caption" }, r[1])),
        r[2] === "ok" ? h(Button, { size: "sm", variant: "secondary", onClick: function () { open[1](r[0]); } }, "Ver") : h(Badge, { tone: "pending", icon: "clock" }, "Pronto"));
    }));
  }
  var PARENT_TITLES = { home: "Hola, Gloria", grades: "Calificaciones", attendance: "Asistencia", observer: "Observador", reportcards: "Boletines", notifications: "Notificaciones" };
  function ParentApp(props) {
    var page = props.page || "home";
    var nav = function (id) { if (props.onNavigate) props.onNavigate(id); };
    var body = page === "grades" ? h(ParentGrades) : page === "attendance" ? h(Fragment, null, h(AttendanceCalendar, { attendance: 96 }), h("section", { className: "ns-m-card" }, h("h2", { className: "ns-m-h2" }, "Registro"), h("ul", { className: "ns-m-grades" }, h("li", null, h("div", null, h("strong", null, "24 de septiembre · Inasistencia"), h("span", { className: "ns-caption" }, "Excusa médica recibida")), h(Badge, { tone: "verified", icon: "check" }, "Justificada")), h("li", null, h("div", null, h("strong", null, "22 de septiembre · Llegada tarde"), h("span", { className: "ns-caption" }, "Física · 10 minutos")), h(Badge, { tone: "pending", icon: "clock" }, "Registrada")))))
      : page === "observer" ? h(ObserverTimeline, { compact: true, items: OBS.slice(0, 4) }) : page === "reportcards" ? h(ParentReportCards) : page === "notifications" ? h(NotificationFeed, { items: PARENT_NOTIFS }) : h(ParentHome, { onNavigate: nav });
    return h(MobileShell, { role: "parent", active: page, onNavigate: nav, onLogout: props.onLogout, title: PARENT_TITLES[page], style: props.style, back: page === "notifications" ? function () { nav("home"); } : null, unread: 2 }, body);
  }

  /* =====================================================================
     APP · enrutador por rol (#/rol/página[/id][?tab=])
     ===================================================================== */
  var ROUTE_ALIAS = { grade: "grades" };
  function parseHash() {
    var raw = (window.location.hash || "").replace(/^#\/?/, ""), q = raw.split("?"), parts = q[0].split("/").filter(Boolean);
    var params = {}; (q[1] || "").split("&").forEach(function (kv) { var p = kv.split("="); if (p[0]) params[p[0]] = decodeURIComponent(p[1] || ""); });
    if (parts[0] === "movil") return { role: null, page: "mobile-login", params: params };
    var role = ROLES[parts[0]] ? parts[0] : null;
    if (!role) {
      var legacy = { dashboard: "dashboard", grade: "grades", review: "review", students: "students", evaluations: "evaluations", reports: "reports", system: "system" }[parts[0]];
      return legacy ? { role: "teacher", page: legacy, params: params } : { role: null, page: "login", params: params };
    }
    return { role: role, page: parts[1] || (role === "student" || role === "parent" ? "home" : "dashboard"), id: parts[2], params: params };
  }
  function NotaScanApp(props) {
    var init = props.initial ? (typeof props.initial === "string" ? { role: props.role || "teacher", page: props.initial, params: {} } : props.initial) : parseHash();
    var route = useState(init);
    var sync = useState({ status: "online", last: "08:42", pending: 0 });
    useEffect(function () {
      if (props.initial) return;
      function on() { route[1](parseHash()); window.scrollTo(0, 0); }
      window.addEventListener("hashchange", on);
      return function () { window.removeEventListener("hashchange", on); };
    }, []);
    var r = route[0];
    function go(role, page, params) {
      page = ROUTE_ALIAS[page] || page;
      var hsh = "#/" + role + "/" + page + (params && params.id ? "/" + params.id : "") + (params && params.tab ? "?tab=" + params.tab : "");
      if (props.initial) route[1]({ role: role, page: page, id: params && params.id, params: params || {} });
      else if (window.location.hash !== hsh) window.location.hash = hsh; else route[1](parseHash());
    }
    if (r.page === "mobile-login") return h(MobileLoginPage, { onLogin: function (role) { go(role, "home"); } });
    if (!r.role || r.page === "login") return h(LoginPage, { onLogin: function (role) { go(role || "teacher", role === "student" || role === "parent" ? "home" : "dashboard"); } });
    var role = r.role;
    var nav = function (page, params) { go(role, page, params); };
    var mobile = role === "student" || role === "parent";
    var common = { onNavigate: nav, onLogout: function () { if (props.initial) route[1]({ role: null, page: mobile ? "mobile-login" : "login", params: {} }); else window.location.hash = mobile ? "#/movil" : "#/login"; }, role: role };
    var doSync = function () { sync[1](Object.assign({}, sync[0], { status: "syncing" })); setTimeout(function () { var d = new Date(); sync[1]({ status: "online", last: ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2), pending: 0 }); }, 1200); };
    var page;
    if (role === "student") page = h(StudentApp, { page: r.page, onNavigate: nav, onLogout: common.onLogout });
    else if (role === "parent") page = h(ParentApp, { page: r.page, onNavigate: nav, onLogout: common.onLogout });
    else {
      var P = r.page;
      var M = {
        admin: { dashboard: AdminDashboardPage, students: StudentsAdminPage, enrollment: EnrollmentPage, users: UsersPage, structure: AcademicStructurePage, curriculum: CurriculumPage, periods: PeriodsPage, reportcards: ReportCardsPage, clearances: ClearancesPage, ranking: RankingPage },
        principal: { dashboard: PrincipalDashboardPage, analytics: AnalyticsPage, teachers: TeacherMonitoringPage, requests: RequestsPage, students: StudentsAdminPage, observer: ObserverPage, reports: ReportsPage },
        teacher: { dashboard: DashboardPage, grades: UploadPage, review: GradeReviewDashboard, evaluations: EvaluationsPage, gradebook: GradebookPage, concepts: ConceptsPage, recoveries: RecoveriesPage, attendance: AttendancePage, behavior: BehaviorPage, students: StudentsPage, reports: ReportsPage, system: DesignSystemPage }
      }[role];
      if (P === "profile") page = h(StudentProfilePage, Object.assign({}, common, { studentId: r.id, tab: r.params && r.params.tab }));
      else page = h(M[P] || M.dashboard, common);
    }
    return h(ShellCtx.Provider, { value: { role: role, sync: sync[0], setSync: sync[1], onSync: doSync } }, page);
  }

  var api = {
    Logo: Logo, BrandTile: BrandTile, Icon: Icon, Button: Button, Input: Input, GradeInput: GradeInput, Badge: Badge, Avatar: Avatar, Divider: Divider, Sticker: Sticker, StatusDot: StatusDot, ConfidenceIndicator: ConfidenceIndicator,
    NavigationItem: NavigationItem, GradeInputGroup: GradeInputGroup, ConfidenceBadge: ConfidenceBadge, UserProfile: UserProfile, SearchField: SearchField, FilterGroup: FilterGroup, ReviewStatus: ReviewStatus, UploadZone: UploadZone,
    Sidebar: Sidebar, Header: Header, ReviewSummary: ReviewSummary, FiltersBar: FiltersBar, StudentGradeCard: StudentGradeCard, StudentGradeCardSkeleton: StudentGradeCardSkeleton, ReviewStepper: ReviewStepper, Marquee: Marquee, ProcessingPanel: ProcessingPanel,
    ConfirmDialog: ConfirmDialog, Toast: Toast, EmptyState: EmptyState, DataTable: DataTable,
    GradeReviewDashboard: GradeReviewDashboard, AppShell: AppShell, LoginPage: LoginPage, DashboardPage: DashboardPage, UploadPage: UploadPage,
    StudentsPage: StudentsPage, EvaluationsPage: EvaluationsPage, ReportsPage: ReportsPage, DesignSystemPage: DesignSystemPage, NotaScanApp: NotaScanApp,
    ShellCtx: ShellCtx, Switch: Switch, Checkbox: Checkbox, Select: Select, Textarea: Textarea, ProgressBar: ProgressBar, IconAction: IconAction, SegmentedTabs: SegmentedTabs, Modal: Modal, Drawer: Drawer, PasswordResetDialog: PasswordResetDialog, DataGrid: DataGrid, BarChart: BarChart, LineChart: LineChart, DonutChart: DonutChart, ConnectivityStatus: ConnectivityStatus, GlobalSearch: GlobalSearch, RoleShell: RoleShell, EnrollBadge: EnrollBadge, StudentTable: StudentTable, StudentDrawer: StudentDrawer, StudentsAdminPage: StudentsAdminPage, AdminDashboardPage: AdminDashboardPage, StudentRegistrationForm: StudentRegistrationForm, ImportFileZone: ImportFileZone, BulkImportPanel: BulkImportPanel, EnrollmentPage: EnrollmentPage, UserDirectory: UserDirectory, UsersPage: UsersPage, AcademicStructureManager: AcademicStructureManager, AcademicStructurePage: AcademicStructurePage, AcademicAssignmentSelector: AcademicAssignmentSelector, CurriculumManager: CurriculumManager, CurriculumPage: CurriculumPage, PeriodWeightEditor: PeriodWeightEditor, PeriodConfigurator: PeriodConfigurator, PeriodsPage: PeriodsPage, ReportCardDocument: ReportCardDocument, ReportCardManager: ReportCardManager, ReportCardsPage: ReportCardsPage, PazYSalvosTable: PazYSalvosTable, ClearancesPage: ClearancesPage, RankingTable: RankingTable, RankingPage: RankingPage, InstitutionalAnalytics: InstitutionalAnalytics, PrincipalDashboardPage: PrincipalDashboardPage, AnalyticsPage: AnalyticsPage, TeacherStatus: TeacherStatus, TeacherMonitoringPanel: TeacherMonitoringPanel, TeacherMonitoringPage: TeacherMonitoringPage, AuthorizationInbox: AuthorizationInbox, RequestsPage: RequestsPage, ObserverTimeline: ObserverTimeline, ObserverPage: ObserverPage, StudentProfilePage: StudentProfilePage, AttendanceCalendar: AttendanceCalendar, GradeCell: GradeCell, Gradebook: Gradebook, GradebookPage: GradebookPage, RecoveryTable: RecoveryTable, RecoveriesPage: RecoveriesPage, AttendanceRow: AttendanceRow, AttendancePanel: AttendancePanel, AttendancePage: AttendancePage, BehaviorPage: BehaviorPage, BottomSheet: BottomSheet, MobileShell: MobileShell, XPBar: XPBar, GamifiedHome: GamifiedHome, AchievementCard: AchievementCard, Celebration: Celebration, AchievementGallery: AchievementGallery, MyGrades: MyGrades, PerformanceChart: PerformanceChart, GradeSimulator: GradeSimulator, NotificationItem: NotificationItem, NotificationFeed: NotificationFeed, StudentApp: StudentApp, ParentHome: ParentHome, ParentApp: ParentApp,
    ConceptEditor: ConceptEditor, ConceptsPage: ConceptsPage, MobileLoginPage: MobileLoginPage, CountUp: CountUp, MobileWidget: MobileWidget, WidgetBoard: WidgetBoard, HomeScreenWidgets: HomeScreenWidgets, conceptFor: conceptFor,
    PERIOD_SETUP: PERIOD_SETUP, ROLES: ROLES, ALL_STUDENTS: ALL_STUDENTS, COURSES: COURSES, SUBJECTS: SUBJECTS, TEACHERS: TEACHERS,
    validateGrade: validateGrade, formatGrade: formatGrade, confidenceLevel: confidenceLevel, NAV: NAV, FLOW: FLOW, MOCK_ROWS: MOCK
  };
  window.NotaScan = Object.assign(window.NotaScan || {}, api);
})();
