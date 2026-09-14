import { useState } from 'react';
import type { BillingCycle, Subscription, SubscriptionStatus } from '@/types';
import { Modal, inputClass, labelClass } from '@/components/Modal';
import { calculateNextBillingDate, generateId, todayISO } from '@/utils/calculations';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useToast } from '@/context/ToastContext';
import { useSubscriptionCategories } from '@/hooks/useSubscriptionCategories';

interface SubscriptionModalProps {
  open: boolean;
  onClose: () => void;
}

const CYCLES: BillingCycle[] = ['monthly', 'quarterly', 'yearly'];

export function SubscriptionModal({ open, onClose }: SubscriptionModalProps) {
  const { db, addSubscription } = useWorkspace();
  const { showToast } = useToast();
  const { categories } = useSubscriptionCategories();
  const [name, setName] = useState('');
  const [clientId, setClientId] = useState('');
  const [category, setCategory] = useState(categories[0] ?? '');
  const [amount, setAmount] = useState('');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<SubscriptionStatus>('active');

  const reset = () => {
    setName(''); setClientId(''); setCategory(categories[0] ?? ''); setAmount('');
    setBillingCycle('monthly'); setStartDate(todayISO()); setEndDate(''); setStatus('active');
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsedAmount = parseFloat(amount);
    const trimmedName = name.trim();
    const trimmedCategory = (category ?? '').trim();
    if (!trimmedName || !clientId?.trim() || !trimmedCategory || isNaN(parsedAmount) || parsedAmount <= 0) {
      showToast('Name, client, category, and a valid amount are required', 'error');
      return;
    }
    const sub: Subscription = {
      id: generateId('sub'),
      name: trimmedName,
      clientId: clientId.trim(),
      category: trimmedCategory,
      amount: parsedAmount,
      billingCycle,
      nextBillingDate: calculateNextBillingDate(startDate, billingCycle),
      status,
      startDate,
      endDate: endDate || calculateNextBillingDate(startDate, billingCycle),
      paymentMethod: 'Auto / Invoiced',
      origin: 'manual',
    };
    addSubscription(sub);
    onClose();
    showToast('Subscription added successfully');
    reset();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Subscription" size="lg">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Plan / Service Name *</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. AWS EC2 t3.medium" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Client *</label>
            <select required value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputClass}>
              <option value="" disabled>Select a client...</option>
              {db.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Category *</label>
            <select required value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
              {categories.length === 0 && <option value="" disabled>No categories configured</option>}
              {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Amount (₹) *</label>
            <input required type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className={inputClass} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass}>Billing Cycle</label>
            <select value={billingCycle} onChange={(e) => setBillingCycle(e.target.value as BillingCycle)} className={inputClass}>
              {CYCLES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as SubscriptionStatus)} className={inputClass}>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="flex justify-end gap-3 pt-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancel</button>
          <button type="submit" className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">Add Subscription</button>
        </div>
      </form>
    </Modal>
  );
}
