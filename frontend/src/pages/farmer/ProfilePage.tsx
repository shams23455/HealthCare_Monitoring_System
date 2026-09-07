import React, { useState } from 'react';
import { Mail, Phone, Shield, Calendar, Edit3, Check, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { updateProfile } from '@/services/api';
import { User } from '@/types';
import { formatShortDate } from '@/utils/formatters';

interface ProfilePageProps {
  user: User | null;
  onUserUpdate?: (updatedUser: User) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ user, onUserUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!user) return null;

  const handleStartEdit = () => {
    setName(user.name);
    setPhone(user.phone || '');
    setErrorMsg('');
    setSuccessMsg('');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setName(user.name);
    setPhone(user.phone || '');
    setIsEditing(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!name.trim()) {
      setErrorMsg('Full name cannot be empty.');
      return;
    }

    setLoading(true);
    try {
      const updated = await updateProfile({
        name: name.trim(),
        phone: phone.trim() || undefined,
      });

      if (onUserUpdate) {
        onUserUpdate(updated);
      }
      setSuccessMsg('Profile updated successfully.');
      setIsEditing(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-20 sm:pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            User Profile
          </h2>
          <p className="text-xs sm:text-sm font-medium text-slate-500">
            Account details, contact information, and role authorization
          </p>
        </div>

        {!isEditing && (
          <Button
            onClick={handleStartEdit}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 font-bold"
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit Profile</span>
          </Button>
        )}
      </div>

      {successMsg && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-800 text-sm font-semibold rounded-xl flex items-center gap-2">
          <Check className="w-4 h-4 text-green-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-sm font-semibold rounded-xl">
          {errorMsg}
        </div>
      )}

      <Card className="p-6 space-y-6">
        <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
          <div className="w-16 h-16 rounded-2xl bg-farm-100 text-farm-800 font-extrabold text-2xl flex items-center justify-center shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-extrabold text-slate-900 truncate">{user.name}</h3>
            <span className="inline-block px-3 py-0.5 rounded-md bg-farm-100 text-farm-800 text-xs font-bold uppercase mt-1">
              Role: {user.role}
            </span>
          </div>
        </div>

        {isEditing ? (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <Input
              label="Full Name / Farm Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <Input
              label="Phone Number"
              type="tel"
              placeholder="+1234567890"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              helperText="Used by veterinary experts for urgent case escalations."
            />

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 font-medium">
              <span className="font-bold text-slate-800">Note:</span> Email address and Role are fixed and cannot be modified directly.
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={handleCancelEdit}
                className="w-1/2"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-1/2 font-bold"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-3.5 text-sm font-medium text-slate-700">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="flex-1">
                <span className="block text-xs text-slate-400 font-bold uppercase">Email</span>
                <span className="text-slate-800 font-semibold">{user.email}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="flex-1">
                <span className="block text-xs text-slate-400 font-bold uppercase">Phone</span>
                <span className="text-slate-800 font-semibold">{user.phone || 'No phone number provided'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="flex-1">
                <span className="block text-xs text-slate-400 font-bold uppercase">Member Since</span>
                <span className="text-slate-800 font-semibold">{formatShortDate(user.created_at)}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
              <Shield className="w-4 h-4 text-farm-700 shrink-0" />
              <span className="text-xs text-slate-500 font-medium">
                Protected by JWT session authentication & role isolation
              </span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
