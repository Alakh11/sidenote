// Google Pay style splits, shared with the app (SideNoteApp/src/api/groups.ts): each participant
// owes the payer their share, and each share can be marked paid.

export interface MemberBalance {
  user_id: number;
  name: string;
  upi_id?: string | null;
  /** Positive: they owe you. Negative: you owe them. */
  net: number;
}

export interface GroupBalances {
  members: MemberBalance[];
  you_owe: number;
  you_are_owed: number;
}

const parseJson = <T,>(value: unknown): T | null => {
  if (!value) return null;
  if (typeof value === 'string') {
    try { return JSON.parse(value) as T; } catch { return null; }
  }
  return value as T;
};

/** Each participant's share of an expense; old equal splits without details use every member */
export const sharesOf = (tx: { amount: number; split_details?: unknown }, memberIds: number[]): Record<number, number> => {
  const details = parseJson<Record<string, number>>(tx.split_details);
  if (details && Object.keys(details).length) {
    return Object.fromEntries(Object.entries(details).map(([id, v]) => [Number(id), Number(v)]));
  }
  const each = memberIds.length ? Number(tx.amount) / memberIds.length : 0;
  return Object.fromEntries(memberIds.map((id) => [id, Math.round(each * 100) / 100]));
};

export const paidSharesOf = (tx: { settled_shares?: unknown }): Set<number> =>
  new Set(Object.keys(parseJson<Record<string, unknown>>(tx.settled_shares) ?? {}).map(Number));

/** upi:// link that opens a UPI app with the amount filled in (works on phones) */
export const upiPayLink = (upiId: string, name: string, amount: number, note: string) =>
  `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note.slice(0, 50))}`;
