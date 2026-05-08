// SDK 55 split expo-file-system into a new class API and a legacy function API.
// We use the legacy path so writeAsStringAsync / cacheDirectory work.
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { fmt } from '../utils/date';
import { formatAmount } from '../utils/currency';

const escapeCSV = (val) => {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

export const exportTransactionsCSV = async (transactions, categories, currency = 'BDT') => {
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const header = ['Date', 'Type', 'Title', 'Category', 'Amount', 'Note'];
  const rows = transactions.map((t) => [
    fmt(t.created_at || t.date, 'yyyy-MM-dd HH:mm'),
    t.type,
    t.title || '',
    catMap.get(t.category_id) || '',
    t.amount,
    t.note || '',
  ]);
  const csv = [header, ...rows].map((r) => r.map(escapeCSV).join(',')).join('\n');
  const fileUri = `${FileSystem.cacheDirectory}moneymate-transactions-${Date.now()}.csv`;
  await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Export transactions' });
  }
  return fileUri;
};

export const exportBackupJSON = async ({ transactions, categories, recurring, settings }) => {
  const payload = {
    schema_version: 1,
    exported_at: new Date().toISOString(),
    transactions: transactions || [],
    categories: categories || [],
    recurring: recurring || [],
    settings: settings || null,
  };
  const fileUri = `${FileSystem.cacheDirectory}moneymate-backup-${Date.now()}.json`;
  await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(payload, null, 2), {
    encoding: FileSystem.EncodingType.UTF8,
  });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, { mimeType: 'application/json', dialogTitle: 'Backup data' });
  }
  return fileUri;
};

export const exportTransactionsPDF = async ({ transactions, categories, currency = 'BDT', monthLabel }) => {
  let Print;
  try {
    Print = require('expo-print');
  } catch {
    return null;
  }
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

  const rows = transactions
    .map(
      (t) => `<tr>
      <td>${fmt(t.created_at || t.date, 'MMM d')}</td>
      <td>${(t.title || '').replace(/[<>]/g, '')}</td>
      <td>${(catMap.get(t.category_id) || '').replace(/[<>]/g, '')}</td>
      <td style="color:${t.type === 'income' ? '#2CB67D' : '#EF4444'};text-align:right">${t.type === 'income' ? '+' : '-'}${formatAmount(t.amount, currency)}</td>
    </tr>`
    )
    .join('');

  const html = `<!doctype html>
  <html><head><meta charset="utf-8"/><style>
    body{font-family:-apple-system,Inter,sans-serif;background:#0A0A0F;color:#FFF;padding:32px}
    h1{font-size:28px;margin:0 0 8px}
    .meta{color:#A1A1AA;margin-bottom:24px}
    .stats{display:flex;gap:16px;margin-bottom:24px}
    .stat{flex:1;background:#16161D;border:1px solid rgba(255,255,255,.06);border-radius:16px;padding:16px}
    .stat .label{color:#A1A1AA;font-size:12px;text-transform:uppercase;letter-spacing:1.2px}
    .stat .val{font-size:24px;margin-top:4px}
    table{width:100%;border-collapse:collapse;background:#16161D;border-radius:16px;overflow:hidden}
    th{background:#1C1C26;color:#A1A1AA;font-size:12px;text-transform:uppercase;letter-spacing:1px;padding:12px;text-align:left}
    td{padding:12px;border-top:1px solid rgba(255,255,255,.06);font-size:13px}
  </style></head><body>
    <h1>MoneyMate Report</h1>
    <div class="meta">${monthLabel || fmt(new Date(), 'MMMM yyyy')}</div>
    <div class="stats">
      <div class="stat"><div class="label">Income</div><div class="val" style="color:#2CB67D">${formatAmount(totalIncome, currency)}</div></div>
      <div class="stat"><div class="label">Expense</div><div class="val" style="color:#EF4444">${formatAmount(totalExpense, currency)}</div></div>
      <div class="stat"><div class="label">Net</div><div class="val">${formatAmount(totalIncome - totalExpense, currency)}</div></div>
    </div>
    <table>
      <thead><tr><th>Date</th><th>Title</th><th>Category</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="4" style="text-align:center;color:#6B7280">No transactions</td></tr>'}</tbody>
    </table>
  </body></html>`;

  try {
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Export PDF' });
    }
    return uri;
  } catch {
    return null;
  }
};
