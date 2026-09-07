import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-4 p-6">
      <h1 className="text-4xl font-extrabold text-slate-900">404</h1>
      <p className="text-base text-slate-600 font-medium">
        The requested page or livestock record could not be found.
      </p>
      <Button onClick={() => navigate('/')} variant="primary">
        Return to Home
      </Button>
    </div>
  );
};
