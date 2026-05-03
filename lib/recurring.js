import { advanceRecurring, safeParse, toISO } from '../utils/date';
import { uuid } from '../utils/uuid';

export const computeDueRecurring = (recurringList = [], today = new Date()) => {
  const now = safeParse(today);
  const created = [];
  const updated = [];

  for (const r of recurringList) {
    if (!r.is_active) continue;
    const endDate = r.end_date ? safeParse(r.end_date) : null;
    if (endDate && endDate.getTime() < now.getTime()) {
      updated.push({ ...r, is_active: false, updated_at: new Date().toISOString() });
      continue;
    }
    let nextDue = r.next_due_date ? safeParse(r.next_due_date) : safeParse(r.start_date);
    if (!nextDue) continue;

    let mutableR = { ...r };
    let didChange = false;
    while (nextDue.getTime() <= now.getTime()) {
      created.push({
        id: uuid(),
        type: r.type,
        amount: r.amount,
        title: r.title,
        note: r.note || null,
        category_id: r.category_id || null,
        date: toISO(nextDue),
        recurring_id: r.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      nextDue = advanceRecurring(nextDue, r.frequency);
      mutableR = { ...mutableR, next_due_date: toISO(nextDue), updated_at: new Date().toISOString() };
      didChange = true;
      if (endDate && nextDue.getTime() > endDate.getTime()) {
        mutableR = { ...mutableR, is_active: false };
        break;
      }
    }
    if (didChange) updated.push(mutableR);
  }
  return { created, updated };
};
