const DASHBOARD_MENU = '収支ダッシュボード';
const SYNC_FUNCTION = 'scheduledSyncToGitHub';
const MOBILE_SHEET = '_設定';
const MOBILE_CHECKBOX = 'B2';

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu(DASHBOARD_MENU)
    .addItem('Webへ反映', 'syncToGitHub')
    .addSeparator()
    .addItem('10分ごとの自動反映を開始', 'installTenMinuteTrigger')
    .addItem('自動反映を停止', 'removeTenMinuteTrigger')
    .addSeparator()
    .addItem('スマホ用チェックボックスを作成', 'installMobileSync')
    .addToUi();
}

function syncToGitHub() {
  const result = syncToGitHub_();
  SpreadsheetApp.getActive().toast(result.message, DASHBOARD_MENU, 8);
}

function scheduledSyncToGitHub() {
  syncToGitHub_();
}

function installTenMinuteTrigger() {
  removeTriggers_(SYNC_FUNCTION);
  ScriptApp.newTrigger(SYNC_FUNCTION).timeBased().everyMinutes(10).create();
  SpreadsheetApp.getUi().alert('10分ごとの自動反映を開始しました。変更がない場合はGitHubを更新しません。');
}

function removeTenMinuteTrigger() {
  removeTriggers_(SYNC_FUNCTION);
  SpreadsheetApp.getUi().alert('自動反映を停止しました。');
}

function installMobileSync() {
  const book = SpreadsheetApp.getActive();
  const sheet = book.getSheetByName(MOBILE_SHEET) || book.insertSheet(MOBILE_SHEET);
  sheet.getRange('A1:B2').clearContent();
  sheet.getRange('A1').setValue('Web反映設定');
  sheet.getRange('A2').setValue('チェックするとWebへ反映');
  sheet.getRange(MOBILE_CHECKBOX).insertCheckboxes().setValue(false);
  removeTriggers_('mobileSyncOnEdit');
  ScriptApp.newTrigger('mobileSyncOnEdit').forSpreadsheet(book).onEdit().create();
  book.setActiveSheet(sheet);
  SpreadsheetApp.getUi().alert('スマホ用の反映チェックボックスを作成しました。');
}

function mobileSyncOnEdit(event) {
  if (!event || event.range.getSheet().getName() !== MOBILE_SHEET || event.range.getA1Notation() !== MOBILE_CHECKBOX || event.value !== 'TRUE') return;
  try {
    syncToGitHub_();
  } finally {
    event.range.setValue(false);
  }
}

function syncToGitHub_() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return { updated: false, message: '別の更新処理が実行中です。' };
  try {
    const records = collectRecords_();
    const dataFile = `window.KEIRIN_RECORDS = ${JSON.stringify(records)};\n`;
    const result = updateGitHubFile_(dataFile);
    return { updated: result.updated, message: result.updated ? `${records.length}件をGitHubへ反映しました。` : `変更はありません（${records.length}件）。` };
  } finally {
    lock.releaseLock();
  }
}

function collectRecords_() {
  const rows = [];
  SpreadsheetApp.getActive().getSheets()
    .filter(sheet => /^20\d{4}$/.test(sheet.getName()))
    .forEach(sheet => {
      const values = sheet.getDataRange().getValues();
      if (values.length < 2) return;
      const headerText = values[0].map(value => String(value).trim());
      const dateIndex = headerText.indexOf('日付');
      const venueIndex = headerText.findIndex(value => ['会場', '開催場'].includes(value));
      const raceIndex = headerText.findIndex(value => ['レース名', 'レース', 'レース番号'].includes(value));
      if (dateIndex < 0 || venueIndex < 0 || raceIndex < 0) return;
      const dataRows = values.slice(1).filter(row => normalizeDate_(row[dateIndex]) && String(row[venueIndex] || '').trim() && number_(row[raceIndex]));
      if (dataRows.length === 0) return;
      const columns = columnMap_(values[0]);
      dataRows.forEach(row => {
        const date = normalizeDate_(row[columns.date]);
        const venue = String(row[columns.venue] || '').trim();
        const race = number_(row[columns.race]);
        if (!date || !venue || !race) return;
        const record = {
          id: `${date}_${venue}_${race}R`,
          date,
          venue,
          race,
          time: String(row[columns.time] || '').trim(),
          points: number_(row[columns.points]),
          hit: Boolean(row[columns.hit]),
          confirmed: number_(row[columns.confirmed]),
          stake: number_(row[columns.stake]),
          payout: number_(row[columns.payout])
        };
        rows.push(record);
      });
    });

  rows.sort((a, b) => a.date.localeCompare(b.date) || a.venue.localeCompare(b.venue, 'ja') || a.race - b.race);
  const unique = new Map();
  rows.forEach(record => {
    if (unique.has(record.id)) throw new Error(`重複データがあります: ${record.id}`);
    unique.set(record.id, record);
  });
  return [...unique.values()];
}

function columnMap_(headers) {
  const aliases = {
    date: ['日付'], venue: ['会場', '開催場'], race: ['レース名', 'レース', 'レース番号'], time: ['開催時間', '時間帯'],
    points: ['点数'], hit: ['的中'], confirmed: ['確定金額'], stake: ['投資額', '購入金額', '購入額'], payout: ['払戻額', '払戻金額']
  };
  const map = {};
  Object.keys(aliases).forEach(key => {
    map[key] = headers.findIndex(value => aliases[key].includes(String(value).trim()));
    if (map[key] < 0) throw new Error(`必要な列がありません: ${aliases[key].join(' / ')}`);
  });
  return map;
}

function updateGitHubFile_(content) {
  const props = PropertiesService.getScriptProperties();
  const owner = requiredProperty_(props, 'GITHUB_OWNER');
  const repo = requiredProperty_(props, 'GITHUB_REPO');
  const token = requiredProperty_(props, 'GITHUB_TOKEN');
  const branch = props.getProperty('GITHUB_BRANCH') || 'main';
  const path = props.getProperty('GITHUB_DATA_PATH') || 'data/data.js';
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path.split('/').map(encodeURIComponent).join('/')}`;
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  const currentResponse = UrlFetchApp.fetch(`${url}?ref=${encodeURIComponent(branch)}`, { headers, muteHttpExceptions: true });
  const currentCode = currentResponse.getResponseCode();
  let sha;
  if (currentCode === 200) {
    const current = JSON.parse(currentResponse.getContentText());
    sha = current.sha;
    const existing = Utilities.newBlob(Utilities.base64Decode(String(current.content).replace(/\s/g, ''))).getDataAsString('UTF-8');
    if (existing === content) return { updated: false };
  } else if (currentCode !== 404) {
    throw new Error(`GitHubから現在のデータを取得できませんでした（${currentCode}）。`);
  }

  const payload = { message: `Update dashboard data (${new Date().toISOString()})`, content: Utilities.base64Encode(content, Utilities.Charset.UTF_8), branch };
  if (sha) payload.sha = sha;
  const response = UrlFetchApp.fetch(url, { method: 'put', contentType: 'application/json', headers, payload: JSON.stringify(payload), muteHttpExceptions: true });
  const code = response.getResponseCode();
  if (code < 200 || code >= 300) throw new Error(`GitHubへの更新に失敗しました（${code}）: ${response.getContentText().slice(0, 300)}`);
  return { updated: true };
}

function normalizeDate_(value) {
  if (value instanceof Date && !isNaN(value)) return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const match = String(value || '').trim().match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
  return match ? `${match[1]}-${String(match[2]).padStart(2, '0')}-${String(match[3]).padStart(2, '0')}` : '';
}

function number_(value) {
  const number = Number(String(value ?? '').replace(/[,円\s]/g, ''));
  return Number.isFinite(number) ? number : 0;
}

function requiredProperty_(props, key) {
  const value = props.getProperty(key);
  if (!value) throw new Error(`Apps Scriptのプロパティ ${key} を設定してください。`);
  return value;
}

function removeTriggers_(functionName) {
  ScriptApp.getProjectTriggers().filter(trigger => trigger.getHandlerFunction() === functionName).forEach(trigger => ScriptApp.deleteTrigger(trigger));
}
