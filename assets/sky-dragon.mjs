/* PCK Skyforge decorative atmosphere. CSS/SVG only, no external network or scheduling API. */
const svg=String.raw;
const scene=svg`
  <span class="storm-cloud one"></span><span class="storm-cloud two"></span>
  <svg class="storm-dragon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 920 340" fill="none" focusable="false" aria-hidden="true">
    <defs>
      <linearGradient id="sky-dragon-flame" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#ffcf49"/><stop offset=".47" stop-color="#ff971b"/><stop offset="1" stop-color="#ec7123"/>
      </linearGradient>
      <linearGradient id="sky-dragon-light" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffca34" stop-opacity=".1"/><stop offset=".4" stop-color="#ffa82c"/><stop offset="1" stop-color="#ffdd69" stop-opacity=".06"/></linearGradient>
    </defs>
    <path d="M45 241C155 114 214 295 318 171S462 90 539 155 654 240 735 132 828 102 877 64" stroke="url(#sky-dragon-light)" stroke-width="48" stroke-linecap="round" opacity=".34"/>
    <path d="M44 247C154 111 218 297 316 174S461 86 541 154 654 236 739 130 823 106 882 64" stroke="url(#sky-dragon-flame)" stroke-width="12" stroke-linecap="round"/>
    <path d="M35 258Q65 228 84 237L40 276 52 247 27 247Z" fill="#f5a42e" opacity=".88"/>
    <path d="M210 216L168 170 196 175 191 148 250 184Z" fill="#ffc34a" stroke="#d17b13" stroke-width="2"/>
    <path d="M395 118L353 57 395 78 413 46 432 115Z" fill="#ffbf3a" stroke="#d17b13" stroke-width="2"/>
    <path d="M528 146L573 73 553 140 626 97 587 171Z" fill="#ffc751" stroke="#df9021" stroke-width="3"/>
    <path d="M643 185L633 242 675 201Z" fill="#ffb830" stroke="#cd7a12" stroke-width="2"/>
    <path d="M739 130Q758 99 784 111L780 88 809 96 822 74 851 81 870 61 900 65 887 78 905 86 880 96 861 108 841 104 818 115 796 121 770 140Z" fill="url(#sky-dragon-flame)" stroke="#bd6a11" stroke-width="2.5"/>
    <path d="M814 89L802 60 831 76 850 49 851 87" fill="#ffc34d" stroke="#d67f14" stroke-width="2"/>
    <path d="M867 77L916 56M873 91L920 99M839 106L852 136" stroke="#e38e24" stroke-width="3" stroke-linecap="round"/>
    <circle cx="870" cy="79" r="4.5" fill="#fff9c0"/><circle cx="870" cy="79" r="2" fill="#8a4710"/>
    <g class="storm-spark" stroke="#f1a021" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M294 84l-15 31h23l-21 37"/><path d="M620 265l-14 24h16l-16 27"/></g>
    <g class="storm-spark" stroke="#ffd350" stroke-width="4" stroke-linecap="round"><path d="M710 59l-8 18h13l-7 18"/><path d="M134 83l-7 20h12l-6 19"/></g>
  </svg>`;
for(const host of document.querySelectorAll("[data-dragon-scene]"))host.innerHTML=scene;
for(const btn of document.querySelectorAll("[data-sky-toggle]")){
  const reduced=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches===true;
  let paused=reduced;
  function sync(){document.body.classList.toggle("sky-paused",paused);btn.setAttribute("aria-pressed",String(paused));btn.textContent=paused?"Play sky animation":"Pause sky animation";}
  sync();
  btn.addEventListener("click",()=>{paused=!paused;sync();});
}
