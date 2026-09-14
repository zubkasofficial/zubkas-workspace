import { useState } from 'react';
import { Modal, inputClass, labelClass } from '@/components/Modal';
import { newAccountingEntry } from '@/utils/calculations';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useToast } from '@/context/ToastContext';

interface TransactionModalProps { open: boolean; onClose: () => void; }
export function TransactionModal({ open, onClose }: TransactionModalProps) {
  const { addAccountingEntry } = useWorkspace();
  const { showToast } = useToast();
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Office');
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (!Number(amount) || !description) return; addAccountingEntry(newAccountingEntry(type, Number(amount), category, description, reference)); onClose(); showToast('Transaction added to accounting'); setAmount(''); setDescription(''); setReference(''); };
  return <Modal open={open} onClose={onClose} title="Add Transaction"><form onSubmit={submit} className="space-y-4"><div><label className={labelClass}>Transaction Type</label><div className="grid grid-cols-2 gap-2">{(['income', 'expense'] as const).map((value) => <button key={value} type="button" onClick={() => setType(value)} className={`rounded-lg border px-3 py-2.5 text-sm font-semibold capitalize ${type === value ? value === 'income' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-300'}`}>{value}</button>)}</div></div><div className="grid gap-4 sm:grid-cols-2"><div><label className={labelClass}>Amount</label><input required type="number" min="1" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className={inputClass} /></div><div><label className={labelClass}>Category</label><input required value={category} onChange={(event) => setCategory(event.target.value)} className={inputClass} /></div></div><div><label className={labelClass}>Description</label><input required value={description} onChange={(event) => setDescription(event.target.value)} className={inputClass} /></div><div><label className={labelClass}>Reference</label><input value={reference} onChange={(event) => setReference(event.target.value)} className={inputClass} /></div><div className="flex justify-end gap-3 pt-3"><button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancel</button><button type="submit" className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">Add Transaction</button></div></form></Modal>;
}
