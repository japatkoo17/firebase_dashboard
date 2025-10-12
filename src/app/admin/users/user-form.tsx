'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';

// Define the shape of user data for the form
export interface UserFormData {
  email: string;
  role: 'admin' | 'manager' | 'viewer';
}

// Define the full user object shape
export interface UserProfile extends UserFormData {
  uid: string;
  displayName?: string;
  // We will store the role in Firestore as well for easy access
}


interface UserFormProps {
  onSubmit: (data: UserFormData) => void;
  initialData?: UserFormData | null;
  isLoading?: boolean;
}

export default function UserForm({ onSubmit, initialData, isLoading = false }: UserFormProps) {
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    role: 'viewer',
  });
  
  const isEditing = !!initialData;

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value as UserFormData['role'] }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium">Email Používateľa</label>
        <input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-border rounded-md bg-bg-muted"
          required
          disabled={isEditing} // Prevent email change on edit
        />
         {isEditing && <p className="text-xs text-text-muted">Email nie je možné po vytvorení meniť.</p>}
      </div>
      
       <div className="space-y-2">
        <label htmlFor="role" className="block text-sm font-medium">Rola</label>
        <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-border rounded-md bg-bg-muted"
        >
            <option value="viewer">Prehliadajúci (Viewer)</option>
            <option value="manager">Manažér</option>
            <option value="admin">Administrátor</option>
        </select>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Ukladám...' : (isEditing ? 'Uložiť Zmeny' : 'Pozvať Používateľa')}
        </Button>
      </DialogFooter>
    </form>
  );
}
