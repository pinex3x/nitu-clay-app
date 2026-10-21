const paths = {
  craft:
    '<path d="M8 5C8 2 16 2 16 5M6 10c-3 7 0 11 6 11s9-4 6-11l-3-4H9l-3 4zM9 8c1 2 5 2 6 0"/>',
  people:
    '<path d="M6 3h13v18H6a3 3 0 010-6h13M6 3a3 3 0 00-3 3v12M9 7h7M9 10h7"/>',
  shop: '<path d="M5 8h14l2 13H3L5 8zM8 9V6a4 4 0 018 0v3"/>',
  me: '<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0116 0v2M8 16v5M16 16v5"/>',
  cart: '<path d="M2 3h3l3 12h10l3-9H6"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/>',
  back: '<path d="M15 4l-8 8 8 8"/>',
  next: '<path d="M9 5l7 7-7 7"/>',
  arrow: '<path d="M4 12h16M14 6l6 6-6 6"/>',
  play: '<path d="M8 4l11 8-11 8z"/>',
  pause: '<path d="M9 5v14M15 5v14"/>',
  heart:
    '<path d="M12 21S2 15 2 8a5 5 0 0110-2 5 5 0 0110 2c0 7-10 13-10 13z"/>',
  pin: '<path d="M19 10c0 5-7 12-7 12S5 15 5 10a7 7 0 0114 0z"/><circle cx="12" cy="10" r="2"/>',
  search: '<circle cx="10" cy="10" r="7"/><path d="M15 15l6 6"/>',
  box: '<path d="M3 7l9-4 9 4v11l-9 4-9-4V7zM3 7l9 4 9-4M12 11v11M7 5l10 4"/>',
  wallet:
    '<rect x="2" y="4" width="20" height="17" rx="3"/><path d="M2 8h17M17 13h5v5h-5a2.5 2.5 0 010-5z"/>',
  truck:
    '<path d="M2 5h12v13H2zM14 10h4l4 4v4h-8"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/>',
  check:
    '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 12l3 3 7-8"/>',
  edit: '<path d="M15 3l6 6M4 20l2-7L16 3a2 2 0 013 0l2 2a2 2 0 010 3L11 18l-7 2zM3 23h18"/>',
  close: '<path d="M5 5l14 14M19 5L5 19"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v1"/>',
  settings:
    '<path d="M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1 1-3z"/><circle cx="12" cy="12" r="3"/>',
  rotate: '<path d="M20 11a8 8 0 10-2 7M20 4v7h-7"/>',
  leaf: '<path d="M12 3c-5 4-5 8 0 12 5-4 5-8 0-12zM3 10c0 8 2 11 9 11 7 0 9-3 9-11-4 0-7 2-9 5-2-3-5-5-9-5z"/>',
  sound:
    '<path d="M3 9h4l5-5v16l-5-5H3zM16 8a6 6 0 010 8M19 4a11 11 0 010 16"/>',
  mute: '<path d="M3 9h4l5-5v16l-5-5H3zM16 9l6 6M22 9l-6 6"/>',
  wifi: '<path d="M2 8a16 16 0 0120 0M5 12a11 11 0 0114 0M9 16a5 5 0 016 0M12 20h.1"/>',
  battery:
    '<rect x="2" y="6" width="18" height="12" rx="2"/><path d="M23 10v4M5 9h12v6H5z"/>',
};
export const icon = (n) =>
  `<svg class="icon" aria-hidden="true" viewBox="0 0 24 24">${paths[n] || paths.craft}</svg>`;
