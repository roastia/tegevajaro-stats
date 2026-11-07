// 日程（fixtures.csv）→ カレンダーのファイル（iCalendar / .ics）。/schedule.ics で配る
// iPhone・Mac は webcal:// で購読すると、サイトの更新に合わせて日程が自動で新しくなる

const pad = n => String(n).padStart(2, '0');
/** 日本時間の日付・時刻 → UTC の「YYYYMMDDTHHMMSSZ」 */
const utc = (date, time) => {
  const [y, m, d] = date.split('-').map(Number), [hh, mm] = time.split(':').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d, hh - 9, mm));
  return `${t.getUTCFullYear()}${pad(t.getUTCMonth() + 1)}${pad(t.getUTCDate())}T${pad(t.getUTCHours())}${pad(t.getUTCMinutes())}00Z`;
};
const ymd = date => date.replace(/-/g, '');
const nextDay = date => { const [y, m, d] = date.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d + 1)); return `${t.getUTCFullYear()}${pad(t.getUTCMonth() + 1)}${pad(t.getUTCDate())}`; };
/** 文字の中の \ ; , と改行を、カレンダーの書き方に合わせて逃がす */
export const esc = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
/** 1行75バイトまでで折り返す（続きの行は空白から始める）。日本語の文字の途中では切らない */
export function fold(line) {
  const enc = new TextEncoder(), out = [];
  let cur = '', n = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (n + b > (out.length ? 74 : 75)) { out.push(cur); cur = ''; n = 0; }
    cur += ch; n += b;
  }
  out.push(cur);
  return out.join('\r\n ');
}

/**
 * @param fixtures fixtures.csv の行（round,date,kickoff,opponent,opponent_full,ha,venue）
 * @param o { url: サイトのURL, stamp: 'YYYY-MM-DD'（データの時点）, team: チーム名 }
 */
export function buildIcs(fixtures, { url, stamp, team }) {
  const L = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//tegestats.com//テゲスタ！//JA', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(`${team} 試合日程（テゲスタ！）`)}`, 'X-WR-TIMEZONE:Asia/Tokyo',
    `X-WR-CALDESC:${esc(`非公式サポーターサイト「テゲスタ！」の日程です。日程・会場はクラブ公式の発表をもとにしています。${url}/schedule/`)}`,
    'REFRESH-INTERVAL;VALUE=DURATION:PT12H', 'X-PUBLISHED-TTL:PT12H',
  ];
  for (const f of [...fixtures].sort((a, b) => Number(a.round) - Number(b.round))) {
    const ha = f.ha === 'H' ? 'ホーム' : 'アウェイ';
    L.push('BEGIN:VEVENT', `UID:j2-2026-r${f.round}@tegestats.com`, `DTSTAMP:${ymd(stamp)}T000000Z`);
    if (f.kickoff) {
      const [hh, mm] = f.kickoff.split(':').map(Number);
      L.push(`DTSTART:${utc(f.date, f.kickoff)}`, `DTEND:${utc(f.date, `${hh + 2}:${pad(mm)}`)}`);
    } else {
      L.push(`DTSTART;VALUE=DATE:${ymd(f.date)}`, `DTEND;VALUE=DATE:${nextDay(f.date)}`);
    }
    L.push(
      `SUMMARY:${esc(`⚽ J2 第${f.round}節 ${ha} vs ${f.opponent_full || f.opponent}`)}`,
      `LOCATION:${esc(f.venue)}`,
      `DESCRIPTION:${esc(`${f.kickoff ? `キックオフ ${f.kickoff}` : 'キックオフ時間は未定'}（${ha}）\n日程・会場は変更されることがあります。クラブ公式サイトで確かめてください。\nテゲスタ！ ${url}/schedule/`)}`,
      `URL:${url}/schedule/`,
      'END:VEVENT',
    );
  }
  L.push('END:VCALENDAR');
  return L.map(fold).join('\r\n') + '\r\n';
}
