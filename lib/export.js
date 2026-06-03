// PDF generation via expo-print. We deliberately separate "generate" from
// "save / share" so the caller can show the user a clear choice instead of
// silently jumping into the share sheet.
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { fmt } from '../utils/date';
import { formatAmount } from '../utils/currency';

const escapeHtml = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildHtml = ({ transactions, categories, currency, monthLabel }) => {
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + Number(t.amount), 0);
  const net = totalIncome - totalExpense;

  const rows = transactions
    .slice()
    .sort((a, b) => new Date(a.created_at || a.date) - new Date(b.created_at || b.date))
    .map((t) => {
      const dateStr = escapeHtml(fmt(t.created_at || t.date, 'MMM d, yyyy'));
      const title = escapeHtml(t.title || (t.type === 'income' ? 'Income' : 'Expense'));
      const cat = escapeHtml(catMap.get(t.category_id) || '—');
      const amt = escapeHtml(formatAmount(t.amount, currency));
      const sign = t.type === 'income' ? '+' : '-';
      const color = t.type === 'income' ? '#1E7E34' : '#B91C1C';
      return `<tr>
        <td>${dateStr}</td>
        <td>${title}</td>
        <td>${cat}</td>
        <td class="amt" style="color:${color}">${sign}${amt}</td>
      </tr>`;
    })
    .join('');

  const safeMonthLabel = escapeHtml(monthLabel || fmt(new Date(), 'MMMM yyyy'));
  const generatedAt = escapeHtml(fmt(new Date(), 'EEE, MMM d, yyyy h:mm a'));

  // Print-friendly: white background, dark text, neutral typography. The
  // font stack is wide enough that whichever device renders this can pick
  // up Bengali glyphs (Noto Sans Bengali / system Bangla fonts) so the
  // ৳ symbol doesn't come out as ▢.
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>MoneyMate – ${safeMonthLabel}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family:
        -apple-system, BlinkMacSystemFont,
        "Segoe UI", "Roboto",
        "Noto Sans", "Noto Sans Bengali",
        "Bangla Sangam MN", "Helvetica Neue",
        Helvetica, Arial, sans-serif;
      color: #111827;
      background: #ffffff;
      margin: 0;
      padding: 32px;
      line-height: 1.4;
    }
    h1 { font-size: 22px; margin: 0; color: #111827; }
    .subtitle { color: #6B7280; font-size: 13px; margin-top: 4px; }
    .meta { color: #9CA3AF; font-size: 11px; margin-top: 2px; }
    .stats {
      display: flex; gap: 12px;
      margin: 20px 0;
      page-break-inside: avoid;
    }
    .stat {
      flex: 1;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      padding: 12px 14px;
      background: #F9FAFB;
    }
    .stat .label {
      color: #6B7280;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
    }
    .stat .val {
      font-size: 18px;
      margin-top: 4px;
      font-weight: 600;
    }
    .stat.income .val { color: #1E7E34; }
    .stat.expense .val { color: #B91C1C; }
    .stat.net .val { color: #111827; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      font-size: 12px;
    }
    thead th {
      background: #F3F4F6;
      color: #374151;
      text-align: left;
      padding: 10px 12px;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      border-bottom: 1px solid #E5E7EB;
    }
    tbody td {
      padding: 9px 12px;
      border-bottom: 1px solid #F3F4F6;
      vertical-align: top;
    }
    tbody tr:nth-child(even) td { background: #FAFAFA; }
    td.amt {
      text-align: right;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
      font-weight: 600;
    }
    .empty {
      text-align: center;
      color: #9CA3AF;
      padding: 24px 0;
    }
    .footer {
      margin-top: 24px;
      font-size: 10px;
      color: #9CA3AF;
      text-align: center;
    }
  </style>
</head>
<body>
  <h1>MoneyMate – ${safeMonthLabel}</h1>
  <div class="subtitle">${transactions.length} ${transactions.length === 1 ? 'transaction' : 'transactions'}</div>
  <div class="meta">Generated ${generatedAt}</div>

  <div class="stats">
    <div class="stat income">
      <div class="label">Income</div>
      <div class="val">${escapeHtml(formatAmount(totalIncome, currency))}</div>
    </div>
    <div class="stat expense">
      <div class="label">Expense</div>
      <div class="val">${escapeHtml(formatAmount(totalExpense, currency))}</div>
    </div>
    <div class="stat net">
      <div class="label">Net</div>
      <div class="val">${escapeHtml(formatAmount(net, currency))}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 22%">Date</th>
        <th>Title</th>
        <th style="width: 22%">Category</th>
        <th style="width: 20%; text-align: right">Amount</th>
      </tr>
    </thead>
    <tbody>${rows || '<tr><td colspan="4" class="empty">No transactions</td></tr>'}</tbody>
  </table>

  <div class="footer">moneymate.app</div>
</body>
</html>`;
};

// Sanitise the user-facing month label into a safe filename. "May 2026" → "May-2026"
const fileNameForMonth = (monthLabel) => {
  const safe = (monthLabel || fmt(new Date(), 'MMMM yyyy'))
    .replace(/[^A-Za-z0-9 \-_]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return `MoneyMate-${safe}.pdf`;
};

// Returns { ok, uri, fileName, error? } — does NOT auto-share. Caller
// decides what to do with the file (save to device, share, both, neither).
export const generateTransactionsPdf = async ({
  transactions,
  categories,
  currency = 'BDT',
  monthLabel,
}) => {
  let Print;
  try {
    Print = require('expo-print');
  } catch (e) {
    return { ok: false, error: 'PDF engine unavailable on this device.' };
  }
  if (!transactions || transactions.length === 0) {
    return { ok: false, error: 'No transactions to export.' };
  }
  const html = buildHtml({ transactions, categories, currency, monthLabel });
  try {
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
      // 8.27 x 11.69 inches (A4). printToFileAsync handles width/height
      // automatically based on the html content, but explicit values keep
      // results consistent across devices.
    });
    return { ok: true, uri, fileName: fileNameForMonth(monthLabel) };
  } catch (e) {
    return { ok: false, error: e?.message || 'Failed to render PDF.' };
  }
};

// Save the PDF to a folder the user picks. Android: Storage Access
// Framework prompt → file lands in Downloads / Documents / wherever and
// shows up in the Files app. iOS: fall back to the share sheet (Save to
// Files is the canonical destination there).
//
// Returns { ok, uri, fileName, reason?, error? }. reason='cancelled' when
// the user dismisses the directory picker.
export const savePdfToDevice = async (sourceUri, fileName) => {
  if (!sourceUri) return { ok: false, error: 'No PDF to save.' };
  const safeName = fileName || 'MoneyMate.pdf';

  if (Platform.OS === 'android') {
    try {
      const SAF = FileSystem.StorageAccessFramework;
      if (!SAF) return { ok: false, error: 'Storage Access Framework unavailable.' };
      const perm = await SAF.requestDirectoryPermissionsAsync();
      if (!perm?.granted) return { ok: false, reason: 'cancelled', fileName: safeName };
      const destUri = await SAF.createFileAsync(perm.directoryUri, safeName, 'application/pdf');
      // Read the cache PDF as base64, then write to the user-picked URI.
      // expo-file-system needs base64 for binary-safe copy through SAF.
      const content = await FileSystem.readAsStringAsync(sourceUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await FileSystem.writeAsStringAsync(destUri, content, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return { ok: true, uri: destUri, fileName: safeName };
    } catch (e) {
      return { ok: false, error: e?.message || 'Failed to save PDF.', fileName: safeName };
    }
  }

  // iOS / web — share sheet exposes "Save to Files" as the way to put a
  // PDF onto the device. UTI hints to iOS that this is a PDF so the right
  // destinations show up.
  try {
    if (!(await Sharing.isAvailableAsync())) {
      return { ok: false, error: 'Sharing not available.', fileName: safeName };
    }
    await Sharing.shareAsync(sourceUri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Save PDF',
      UTI: 'com.adobe.pdf',
    });
    return { ok: true, uri: sourceUri, fileName: safeName };
  } catch (e) {
    return { ok: false, error: e?.message || 'Failed to share PDF.', fileName: safeName };
  }
};

export const sharePdf = async (sourceUri) => {
  if (!sourceUri) return { ok: false, error: 'No PDF to share.' };
  try {
    if (!(await Sharing.isAvailableAsync())) {
      return { ok: false, error: 'Sharing not available.' };
    }
    await Sharing.shareAsync(sourceUri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Share PDF',
      UTI: 'com.adobe.pdf',
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message };
  }
};

// Backwards-compat wrapper — still used elsewhere (currently nowhere, but
// keeps the door open). Defaults to the save flow.
export const exportTransactionsPDF = async (params) => {
  const gen = await generateTransactionsPdf(params);
  if (!gen.ok) return null;
  await savePdfToDevice(gen.uri, gen.fileName);
  return gen.uri;
};
