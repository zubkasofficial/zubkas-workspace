import { useEffect, useState } from 'react';
import type { Client } from '@/types';
import { Modal, inputClass, labelClass } from '@/components/Modal';
import { generateId, newClient, todayISO } from '@/utils/calculations';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useToast } from '@/context/ToastContext';
import { useSettings } from '@/context/SettingsContext';

interface ClientModalProps {
  open: boolean;
  onClose: () => void;
  editingClient?: Client | null;
}

export function ClientModal({ open, onClose, editingClient }: ClientModalProps) {
  const { addClient, updateClient } = useWorkspace();
  const { showToast } = useToast();
  const { settings } = useSettings();
  const taxName = settings.profile.taxLabel || settings.tax.name || 'Tax';
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [notes, setNotes] = useState('');

  const reset = () => {
    setName('');
    setCompany('');
    setEmail('');
    setPhone('');
    setAddress('');
    setGstin('');
    setNotes('');
  };

  useEffect(() => {
    if (open && editingClient) {
      const storedName = editingClient.name;
      const dashIndex = storedName.indexOf(' - ');
      if (dashIndex >= 0) {
        setCompany(storedName.substring(0, dashIndex));
        setName(storedName.substring(dashIndex + 3));
      } else {
        setName(storedName);
        setCompany('');
      }
      setEmail(editingClient.email);
      setPhone(editingClient.phone);
      setAddress(editingClient.address);
      setGstin(editingClient.taxNumber ?? editingClient.gstin ?? '');
      setNotes('');
    } else if (open && !editingClient) {
      reset();
    }
  }, [open, editingClient]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name || !email || !phone) {
      showToast('Name, email and phone are required', 'error');
      return;
    }
    const displayName = company ? `${company} - ${name}` : name;
    if (editingClient) {
      updateClient({
        ...editingClient,
        name: displayName,
        email,
        phone,
        address,
        gstin,
        taxNumber: gstin,
      });
      showToast('Client updated successfully');
    } else {
      const client: Client = {
        ...newClient(displayName, email, phone, address, gstin),
        id: generateId('cli'),
        createdAt: todayISO(),
        taxNumber: gstin,
      };
      addClient(client);
      showToast('Client added successfully');
    }
    onClose();
    reset();
  };

  return (
    <Modal open={open} onClose={onClose} title={editingClient ? 'Edit Client' : 'Add New Client'} size="lg">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Client Name *</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Contact person name" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Company Name *</label>
            <input required value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company / Business name" className={inputClass} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Email *</label>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="accounts@company.in" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Phone *</label>
            <input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Address</label>
          <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} placeholder="Full billing address" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>{taxName} Number</label>
          <input value={gstin} onChange={(e) => setGstin(e.target.value)} placeholder={`e.g. ${taxName} Number`} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Any internal notes about this client" className={inputClass} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancel</button>
          <button type="submit" className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">{editingClient ? 'Save Changes' : 'Add Client'}</button>
        </div>
      </form>
    </Modal>
  );
}
