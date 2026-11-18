// ページに直接書く小さなスクリプト（CSP は astro.config.mjs で、この文字列のハッシュだけを許可する。1文字でも変えたらハッシュも自動で変わる）
// スコア予想：表示の前に、この端末で予想ずみか・締め切りかを決めておく（読み込んだ直後に「予想前の画面」が一瞬出てずれないように）
export const YOSOU_EARLY = "(function(c){try{if(localStorage.getItem('tg:yosou:'+c.dataset.key))c.dataset.state='voted';else if(Date.now()>=Date.parse(c.dataset.kickoff))c.dataset.state='closed';}catch(e){}})(document.currentScript.parentElement);";
