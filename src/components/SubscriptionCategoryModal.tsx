import { useState } from 'react';
import { Check, Pencil, Plus, Tag, Trash2, X } from 'lucide-react';
import { Modal, inputClass, labelClass } from '@/components/Modal';
import { useSubscriptionCategories } from '@/hooks/useSubscriptionCategories';
import { useToast } from '@/context/ToastContext';

interface SubscriptionCategoryModalProps {
  open: boolean;
  onClose: () => void;
}

export function SubscriptionCategoryModal({ open, onClose }: SubscriptionCategoryModalProps) {
  const { categories, addCategory, updateCategory, removeCategory } = useSubscriptionCategories();
  const { showToast } = useToast();
  const [newCategory, setNewCategory] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const handleAdd = () => {
    if (!newCategory.trim()) return;
    if (categories.some((c) => c.toLowerCase() === newCategory.trim().toLowerCase())) {
      showToast('Category already exists', 'error');
      return;
    }
    addCategory(newCategory);
    setNewCategory('');
    showToast('Category added');
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditingValue(categories[index]);
  };

  const handleSaveEdit = () => {
    if (editingIndex === null) return;
    if (!editingValue.trim()) {
      setEditingIndex(null);
      return;
    }
    updateCategory(categories[editingIndex], editingValue);
    setEditingIndex(null);
    setEditingValue('');
    showToast('Category updated');
  };

  const handleDelete = (name: string) => {
    removeCategory(name);
    showToast('Category deleted');
  };

  return (
    <Modal open={open} onClose={onClose} title="Manage Subscription Categories" size="lg">
      <div className="space-y-5">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          These categories appear in the Quotation Builder and Invoice Modal when creating recurring subscriptions.
        </p>

        <div className="space-y-2">
          {categories.map((category, index) => (
            <div
              key={`${category}-${index}`}
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600/10 text-brand-600 dark:bg-brand-600/20 dark:text-brand-400">
                <Tag className="h-4 w-4" />
              </div>
              {editingIndex === index ? (
                <div className="flex flex-1 items-center gap-2">
                  <input
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); handleSaveEdit(); }
                      if (e.key === 'Escape') { setEditingIndex(null); setEditingValue(''); }
                    }}
                    autoFocus
                    className={`${inputClass} py-2`}
                  />
                  <button onClick={handleSaveEdit} className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-600 text-white hover:bg-emerald-700" aria-label="Save">
                    <Check className="h-4 w-4" />
                  </button>
                  <button onClick={() => { setEditingIndex(null); setEditingValue(''); }} className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700" aria-label="Cancel">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <p className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-300">{category}</p>
                  <button onClick={() => handleStartEdit(index)} className="text-slate-400 transition-colors hover:text-brand-600" aria-label="Edit">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(category)} className="text-slate-400 transition-colors hover:text-rose-600" aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          ))}
          {categories.length === 0 && (
            <p className="py-4 text-center text-sm text-slate-400">No categories — add one below</p>
          )}
        </div>

        <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
          <label className={labelClass}>Add New Category</label>
          <div className="flex gap-2">
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
              placeholder="e.g. Backup & Disaster Recovery"
              className={inputClass}
            />
            <button
              onClick={handleAdd}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
          <button onClick={onClose} className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700">
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}
