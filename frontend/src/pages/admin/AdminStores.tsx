import { useEffect, useState, useCallback } from 'react';
import { Store, User } from '../../types';
import DataTable, { Column } from '../../components/DataTable';
import Modal from '../../components/Modal';
import AddStoreForm from './AddStoreForm';
import { deleteStore, listStores, listUsers, updateStoreOwner } from '../../localStore';

export default function AdminStores() {
  const [stores, setStores] = useState<Store[]>([]);
  const [owners, setOwners] = useState<User[]>([]);
  const [filters, setFilters] = useState({ name: '', email: '', address: '' });
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [ownerEdit, setOwnerEdit] = useState<Store | null>(null);
  const [ownerDraft, setOwnerDraft] = useState('');
  const [savingOwner, setSavingOwner] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      setStores(listStores(filters));
      setOwners(listUsers().filter((u) => u.role === 'owner' || u.role === 'user'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load stores.');
    }
  }, [filters]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const updateFilter = (field: keyof typeof filters) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFilters({ ...filters, [field]: e.target.value });

  const handleDelete = async (s: Store) => {
    if (!window.confirm(`Delete store "${s.name}"? This also removes its ratings.`)) return;
    setError('');
    try {
      deleteStore(s.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete store.');
    }
  };

  const openOwnerEdit = (store: Store) => {
    setOwnerEdit(store);
    setOwnerDraft(store.ownerId ? String(store.ownerId) : '');
  };

  const ownerName = (ownerId: number | null) => {
    if (!ownerId) return 'Unassigned';
    const owner = owners.find((user) => user.id === ownerId);
    return owner ? `${owner.name} (${owner.email})` : 'Unknown owner';
  };

  const handleOwnerSave = async () => {
    if (!ownerEdit) return;
    setSavingOwner(true);
    setError('');
    try {
      updateStoreOwner(ownerEdit.id, ownerDraft ? Number(ownerDraft) : null);
      setOwnerEdit(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update owner.');
    } finally {
      setSavingOwner(false);
    }
  };

  const columns: Column<Store>[] = [
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'address', header: 'Address' },
    {
      key: 'ownerId',
      header: 'Owner',
      render: (s) => ownerName(s.ownerId),
      sortValue: (s) => ownerName(s.ownerId),
    },
    {
      key: 'overallRating',
      header: 'Rating',
      render: (s) => (s.ratingCount > 0 ? `${s.overallRating} (${s.ratingCount})` : 'No ratings'),
      sortValue: (s) => s.overallRating,
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (s) => (
        <div className="row gap">
          <button className="btn btn-link" onClick={() => openOwnerEdit(s)}>
            Edit owner
          </button>
          <button className="btn btn-link danger" onClick={() => handleDelete(s)}>
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <h1>Stores</h1>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          + Add store
        </button>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="filters">
        <input placeholder="Filter by name" value={filters.name} onChange={updateFilter('name')} />
        <input placeholder="Filter by email" value={filters.email} onChange={updateFilter('email')} />
        <input
          placeholder="Filter by address"
          value={filters.address}
          onChange={updateFilter('address')}
        />
      </div>

      <DataTable columns={columns} data={stores} rowKey={(s) => s.id} />

      {showAdd && (
        <Modal title="Add store" onClose={() => setShowAdd(false)}>
          <AddStoreForm onCreated={load} onClose={() => setShowAdd(false)} />
        </Modal>
      )}

      {ownerEdit && (
        <Modal title="Assign store owner" onClose={() => setOwnerEdit(null)}>
          <div className="stack">
            <div>
              <strong>{ownerEdit.name}</strong>
              <p className="muted">{ownerEdit.address}</p>
            </div>
            <label>
              Owner
              <select value={ownerDraft} onChange={(e) => setOwnerDraft(e.target.value)}>
                <option value="">— No owner —</option>
                {owners.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.name} ({owner.email}) {owner.role === 'user' ? '· will become owner' : ''}
                  </option>
                ))}
              </select>
            </label>
            <div className="row gap">
              <button className="btn btn-primary" disabled={savingOwner} onClick={handleOwnerSave}>
                {savingOwner ? 'Saving…' : 'Save owner'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setOwnerEdit(null)}>
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
