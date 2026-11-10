const paths = {
  stone: '<path d="M8 13 22 5 38 11 44 28 33 42 12 40 4 27Z" fill="#77a88b"/><path d="m8 13 15 4 15-6-5 18-21 11 5-16Z" fill="#b9d4a5"/><path d="m17 24 8 4 8-7M22 5l1 12" fill="none" stroke="#e4e2b4" stroke-width="2"/>',
  bi: '<circle cx="24" cy="24" r="18" fill="#709b77" stroke="#c2d09a" stroke-width="2"/><circle cx="24" cy="24" r="7" fill="#243b32" stroke="#bfce9a" stroke-width="2"/><path d="M11 17h6v-5m14 0v6h6m0 13h-6v6m-14 0v-6h-6" fill="none" stroke="#a9bd81" stroke-width="2"/>',
  fish: '<path d="m5 25 10-13 16 1 7 9 8-9v24l-8-9-7 10-17-1Z" fill="#7cae86" stroke="#b5cca0" stroke-width="2"/><circle cx="16" cy="22" r="2" fill="#213e30"/><path d="m25 15-3 19m5-14 7 5-7 5" fill="none" stroke="#bdd4a0" stroke-width="2"/>',
  seal: '<path d="M8 25h32v17H8Z" fill="#608e70" stroke="#c0c99a" stroke-width="2"/><path d="M15 25V13l9-7 9 7v12" fill="#87af85" stroke="#c0c99a" stroke-width="2"/><path d="M12 34h24M24 13v12" stroke="#b8cc95" stroke-width="2"/>',
  cong: '<path d="m9 13 15-7 15 7v25l-15 7-15-7Z" fill="#6b9c7c" stroke="#c0c99a" stroke-width="2"/><ellipse cx="24" cy="13" rx="10" ry="5" fill="#243b32"/><path d="M9 21h10m10 0h10M9 30h10m10 0h10M24 19v24" stroke="#c0c99a" stroke-width="2"/>',
  huang: '<path d="M5 17q19 23 38 0l-3 15q-16 18-32 0Z" fill="#7eaa85" stroke="#bfd2a4" stroke-width="2"/><circle cx="10" cy="22" r="2" fill="#243b32"/><circle cx="38" cy="22" r="2" fill="#243b32"/>',
  dragon: '<path d="m34 8-13 2-9 10 1 12 10 7 12-4 3-10-7-4-9 3 4 6 6-1" fill="none" stroke="#91b88b" stroke-width="7"/><path d="m33 7 9-4-2 9-9 3" fill="#b8cd9b"/><circle cx="35" cy="9" r="2" fill="#243b32"/>',
  bag: '<path d="m16 9 4 9h8l4-9M18 18 8 31v10h32V31L30 18Z" fill="none" stroke="currentColor" stroke-width="3"/><path d="M13 28h22M24 30v7" stroke="currentColor" stroke-width="2"/>',
  scroll: '<path d="M10 7h27v31H14V12H8V7h8m-2 31v5h28v-6h-5M21 17h10m-10 7h10m-10 7h7" fill="none" stroke="currentColor" stroke-width="3"/>',
  book: '<path d="M24 12Q14 5 5 10v29q10-5 19 1 9-6 19-1V10q-10-5-19 2v28" fill="none" stroke="currentColor" stroke-width="3"/>',
};
export function icon(name, className = '') {
  return `<svg class="item-icon ${className}" viewBox="0 0 48 48" aria-hidden="true">${paths[name] ?? paths.stone}</svg>`;
}
export const CODEX = [
  {id:'bi',name:'玉璧'}, {id:'cong',name:'玉琮'}, {id:'huang',name:'玉璜'},
  {id:'dragon',name:'玉龙形佩'}, {id:'fish',name:'玉鱼佩'}, {id:'seal',name:'玉印'},
];
