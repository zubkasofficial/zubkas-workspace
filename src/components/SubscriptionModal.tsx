import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import type { BillingCycle, Subscription, SubscriptionStatus } from '@/types';
import { Modal, inputClass, labelClass } from '@/components/Modal';
import { calculateNextBillingDate, generateId, todayISO } from '@/utils/calculations';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useToast } from '@/context/ToastContext';
import { useSubscriptionCategories } from '@/hooks/useSubscriptionCategories';

interface SubscriptionModalProps {
  open: boolean;
  onClose: () => void;
  subscription?: Subscription | null;
}

const CYCLES: BillingCycle[] = ['monthly', 'quarterly', 'yearly'];

export function SubscriptionModal({ open, onClose, subscription }: SubscriptionModalProps) {
  const { db, addSubscription, updateSubscription } = useWorkspace();
  const { showToast } = useToast();
  const { categories } = useSubscriptionCategories();
  const isEdit = Boolean(subscription);

  const [name, setName] = useState(subscription?.name ?? '');
  const [clientId, setClientId] = useState(subscription?.clientId ?? '');
  const [category, setCategory] = useState(subscription?.category ?? categories[0] ?? '');
  const [amount, setAmount] = useState(subscription ? String(subscription.amount) : '');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(subscription?.billingCycle ?? 'monthly');
  const [startDate, setStartDate] = useState(subscription?.startDate ?? todayISO());
  const [endDate, setEndDate] = useState(subscription?.endDate ?? '');
  const [status, setStatus] = useState<SubscriptionStatus>(subscription?.status ?? 'active');

  useEffect(() => {
    if (subscription) {
      setName(subscription.name ?? '');
      setClientId(subscription.clientId ?? '');
      setCategory(subscription.category ?? categories[0] ?? '');
      setAmount(subscription.amount ? String(subscription.amount) : '');
      setBillingCycle(subscription.billingCycle ?? 'monthly');
      setStartDate(subscription.startDate ?? todayISO());
      setEndDate(subscription.endDate ?? '');
      setStatus(subscription.status ?? 'active');
    } else {
      setName(''); setClientId(''); setCategory(categories[0] ?? ''); setAmount('');
      setBillingCycle('monthly'); setStartDate(todayISO()); setEndDate(''); setStatus('active');
    }
  }, [subscription, open, categories]);

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

    if (isEdit && subscription) {
      updateSubscription(subscription.id, {
        name: trimmedName,
        clientId: clientId.trim(),
        category: trimmedCategory,
        amount: subscription.amount,
        billingCycle,
        startDate,
        endDate: endDate || calculateNextBillingDate(startDate, billingCycle),
        status,
        nextBillingDate: calculateNextBillingDate(startDate, billingCycle),
      });
      onClose();
      showToast('Subscription updated successfully');
    } else {
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
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Subscription' : 'Add Subscription'} size="lg">
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
            <div className="relative">
              <input
                required
                type="number"
                min="1"
                value={amount}
                onChange={isEdit ? undefined : (e) => setAmount(e.target.value)}
                readOnly={isEdit}
                placeholder="0"
                className={isEdit
                  ? 'w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-500 outline-none cursor-not-allowed dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400 min-h-[44px] pr-10'
                  : inputClass}
              />
              {isEdit && (
                <Lock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              )}
            </div>
            {isEdit && (
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Amount cannot be edited directly from subscription. Price is fixed from invoice/quotation.</p>
            )}
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
            <option value="completed">Completed</option>
            <option value="expired">Expired</option>
          </select>
        </div>
        <div className="flex justify-end gap-3 pt-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancel</button>
          <button type="submit" className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
            {isEdit ? 'Save Changes' : 'Add Subscription'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
