import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usersAPI } from '../lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { KeyRound, AlertCircle, Loader2, LogOut } from 'lucide-react';

export const ForcePasswordChange = () => {
  const { clearMustChangePassword, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    setLoading(true);
    try {
      await usersAPI.changeMyPassword(currentPassword, newPassword);
      clearMustChangePassword();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors du changement de mot de passe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] p-4" data-testid="force-password-change">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-14 h-14 bg-[#005F73] rounded-lg flex items-center justify-center mx-auto mb-3">
            <KeyRound className="w-7 h-7 text-white" />
          </div>
          <CardTitle className="text-2xl font-['Barlow_Condensed'] uppercase tracking-tight">
            Nouveau mot de passe requis
          </CardTitle>
          <CardDescription>
            Vous vous êtes connecté avec un mot de passe temporaire. Veuillez définir un nouveau mot de passe pour continuer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive" data-testid="force-pwd-error">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="current">Mot de passe temporaire</Label>
              <Input id="current" type="password" value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)} required
                data-testid="force-current-password" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new">Nouveau mot de passe</Label>
              <Input id="new" type="password" value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)} required
                data-testid="force-new-password" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirmer le mot de passe</Label>
              <Input id="confirm" type="password" value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)} required
                data-testid="force-confirm-password" className="h-11" />
            </div>
            <Button type="submit" className="w-full h-11 bg-[#005F73] hover:bg-[#004C5C]"
              disabled={loading} data-testid="force-submit">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enregistrement...</> : 'Définir le mot de passe'}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button onClick={logout} className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1" data-testid="force-logout">
              <LogOut className="w-3.5 h-3.5" /> Se déconnecter
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForcePasswordChange;
