// ページに直接書く小さなスクリプト（CSP は astro.config.mjs で、この文字列のハッシュだけを許可する。1文字でも変えたらハッシュも自動で変わる）
// スコア予想：表示の前に、この端末で予想ずみか・締め切りかを決めておく（読み込んだ直後に「予想前の画面」が一瞬出てずれないように）
// みやざきのスポット：この端末が前に受け取った「ハートが多い順」が、ページを作った時より新しければ、表示の前にその順に並べる
// （読み込んだあとに並びが入れかわって見えないように。新しい順は表示中には動かさず、次に開いたときに使う）
export const SPOTS_EARLY = "(function(u){try{var c=JSON.parse(localStorage.getItem('tg:spotOrder')||'null');if(!c||!c.o||!(c.t>+u.dataset.at))return;var r={};c.o.forEach(function(id,i){r[id]=i});var a=[].slice.call(u.children).map(function(li,i){return{li:li,i:i,r:(li.dataset.id in r)?r[li.dataset.id]:1e9}});a.sort(function(x,y){return x.r-y.r||x.i-y.i});a.forEach(function(x){u.appendChild(x.li)})}catch(e){}})(document.currentScript.previousElementSibling);";
export const YOSOU_EARLY = "(function(c){try{if(localStorage.getItem('tg:yosou:'+c.dataset.key))c.dataset.state='voted';else if(Date.now()>=Date.parse(c.dataset.kickoff))c.dataset.state='closed';}catch(e){}})(document.currentScript.parentElement);";
