/** HTML for Jazeera University title-page header (logo + motto). */
module.exports = function titleHeaderHtml() {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 24px 48px; font-family: 'Times New Roman', Times, serif; background: #fff; width: 720px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; }
  .logo-block { display: flex; align-items: center; gap: 14px; }
  .emblem { width: 78px; height: 78px; flex-shrink: 0; }
  .uni .jaamacadda { font-size: 13px; color: #222; letter-spacing: 0.5px; }
  .uni .jazeera { font-size: 30px; font-weight: 700; color: #1a5fb4; line-height: 1.05; letter-spacing: 1px; }
  .uni .university { font-size: 24px; font-weight: 700; color: #1a5fb4; line-height: 1.1; }
  .motto {
    border: 3px solid #1a5fb4; padding: 18px 22px; font-size: 13px; font-weight: 700;
    color: #1a5fb4; text-align: center; line-height: 1.45; max-width: 230px; margin-top: 4px;
  }
</style></head><body>
<div class="header">
  <div class="logo-block">
    <svg class="emblem" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#fff" stroke="#1a5fb4" stroke-width="2"/>
      <path d="M28 68 L50 22 L72 68 Z" fill="#2ec27e" opacity="0.85"/>
      <text x="50" y="58" text-anchor="middle" font-size="28" font-weight="bold" fill="#1a5fb4" font-family="Times New Roman">U</text>
      <path d="M22 72 Q50 82 78 72" fill="none" stroke="#1a5fb4" stroke-width="2"/>
    </svg>
    <div class="uni">
      <div class="jaamacadda">JAAMACADDA</div>
      <div class="jazeera">JAZEERA</div>
      <div class="university">UNIVERSITY</div>
    </div>
  </div>
  <div class="motto">TEACH ME GOODNESS,<br>DISCIPLINE AND<br>KNOWLEDGE</div>
</div>
</body></html>`;
};
