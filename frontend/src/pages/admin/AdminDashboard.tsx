import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Shield, Database, Activity } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { apiFetch } from '@/services/api';
import { User } from '@/types';
import { formatDate } from '@/utils/formatters';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUsers() {
      try {
        const data = await apiFetch<User[]>('/admin/users');
        setUsers(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadUsers();
  }, []);

  if (loading) return <LoadingSpinner message="Loading system administration dashboard..." />;

  const farmers = users.filter(u => u.role === 'FARMER');
  const experts = users.filter(u => u.role === 'EXPERT');
  const admins = users.filter(u => u.role === 'ADMIN');

  return (
    <div className="space-y-6 pb-20 sm:pb-8">
      <div className="bg-gradient-to-r from-purple-900 via-slate-900 to-farm-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl space-y-2">
        <span className="text-xs uppercase font-extrabold tracking-wider px-3 py-1 bg-purple-700/80 rounded-full text-purple-100 inline-block">
          System Administration
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          System Overview & Role Management
        </h2>
        <p className="text-sm font-medium text-purple-100 max-w-xl">
          Manage user accounts, monitor system health metrics, and inspect system audit logs.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-white border-l-4 border-l-farm-600 space-y-2">
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
            Registered Farmers
          </p>
          <span className="text-3xl font-extrabold text-farm-800">{farmers.length}</span>
        </Card>

        <Card className="bg-white border-l-4 border-l-amber-500 space-y-2">
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
            Veterinary Experts
          </p>
          <span className="text-3xl font-extrabold text-amber-600">{experts.length}</span>
        </Card>

        <Card className="bg-white border-l-4 border-l-purple-500 space-y-2">
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
            System Administrators
          </p>
          <span className="text-3xl font-extrabold text-purple-600">{admins.length}</span>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-700" />
            Registered User Accounts ({users.length})
          </h3>
          <Button
            onClick={() => navigate('/admin/users')}
            variant="outline"
            size="sm"
            className="font-bold text-xs"
          >
            Manage Users
          </Button>
        </div>

        <Card className="p-0 overflow-hidden border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold">{u.name}</td>
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-extrabold ${
                        u.role === 'ADMIN'
                          ? 'bg-purple-100 text-purple-800'
                          : u.role === 'EXPERT'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-farm-100 text-farm-900'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(u.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};
