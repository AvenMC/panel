export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);

  Object.entries(props).forEach(([key, value]) => {
    if (value === null || value === undefined || value === false) return;
    if (key === "className") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key.startsWith("on")) node.addEventListener(key.slice(2).toLowerCase(), value);
    else node.setAttribute(key, value === true ? "" : value);
  });

  appendChildren(node, children);
  return node;
}

export function appendChildren(node, children) {
  children.flat(Infinity).forEach((child) => {
    if (child === null || child === undefined || child === false) return;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  });
}

export function replaceContent(node, ...children) {
  node.replaceChildren();
  appendChildren(node, children);
}

export function icon(name, size = 20) {
  const span = document.createElement("span");
  span.className = "icon";
  span.style.setProperty("--iconSize", `${size}px`);
  span.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;
  return span;
}

// Static, trusted SVG path data only.
const ICONS = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
  users: '<circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-7 7-7s7 3 7 7"/><path d="M16 4a4 4 0 010 8M22 21c0-3-2-6-5-7"/>',
  flag: '<path d="M5 21V4M5 4h12l-2 4 2 4H5"/>',
  gavel: '<path d="M14 13l-8 8M3 21h8M10 4l6 6M13 1l7 7-4 4-7-7z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  server: '<rect x="3" y="3" width="18" height="7" rx="2"/><rect x="3" y="14" width="18" height="7" rx="2"/><path d="M7 7h.01M7 17h.01"/>',
  tool: '<path d="M14 6a4 4 0 005 5l-9 9a2 2 0 01-3-3l9-9a4 4 0 00-2-2z"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3 8-8 9-5-1-8-4-8-9V6z"/>',
  log: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  more: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  out: '<path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
  send: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>',
};
