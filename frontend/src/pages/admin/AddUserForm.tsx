import { useState } from 'react';
import { Role } from '../../types';
import {
  validateName,
  validateEmail,
  validateAddress,
} from '../../utils/validation';
import { createUser } from '../../localStore';

interface Props {
  onCreated: () => void;
  onClose: () => void;
}

export default function AddUserForm({ onCreated, onClose }: Props) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    address: '',
    role: 'user' as Role,
  });
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update =
    (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm({ ...form, [field]: e.target.value });

  const validate = () => {
    const next = {
      name: validateName(form.name),
      email: validateEmail(form.email),
      address: validateAddress(form.address),
    };
    setErrors(next);
    return Object.values(next).every((v) => v === null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;
    setSubmitting(true);
    try {
      createUser(form);
      onCreated();
      onClose();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Unable to create user.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="stack">
      {serverError && <div className="alert error">{serverError}</div>}
      <label>
        Name
        <input value={form.name} onChange={update('name')} />
        {errors.name && <span className="field-error">{errors.name}</span>}
      </label>
      <label>
        Email
        <input type="email" value={form.email} onChange={update('email')} />
        {errors.email && <span className="field-error">{errors.email}</span>}
      </label>
      <label>
        Address
        <textarea value={form.address} onChange={update('address')} rows={2} />
        {errors.address && <span className="field-error">{errors.address}</span>}
      </label>
      <label>
        Role
        <select value={form.role} onChange={update('role')}>
          <option value="user">Normal User</option>
          <option value="owner">Store Owner</option>
        </select>
      </label>
      <div className="row gap">
        <button className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create OAuth user'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  );
}
