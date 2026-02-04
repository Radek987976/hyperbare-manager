import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Gauge, AlertCircle, Loader2 } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Left panel - Branding */}
      <div className="login-left">
        <div className="text-center">
          <div className="w-20 h-20 bg-white/10 rounded-lg flex items-center justify-center mx-auto mb-6">
            <Gauge className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold font-['Barlow_Condensed'] uppercase tracking-tight mb-2">
            HyperMaint
          </h1>
          <p className="text-[#94e2d5] text-lg">
            Gestion de Maintenance Assistée par Ordinateur
          </p>
          <p className="text-white/60 mt-4 max-w-sm mx-auto">
            Solution complète pour la maintenance de votre caisson hyperbare
          </p>
        </div>
        
        <div className="mt-12 grid grid-cols-3 gap-6 text-center text-sm">
          <div>
            <div className="text-3xl font-bold font-['Barlow_Condensed'] text-white">100%</div>
            <div className="text-white/60 mt-1">Disponibilité</div>
          </div>
          <div>
            <div className="text-3xl font-bold font-['Barlow_Condensed'] text-white">24/7</div>
            <div className="text-white/60 mt-1">Surveillance</div>
          </div>
          <div>
            <div className="text-3xl font-bold font-['Barlow_Condensed'] text-white">ISO</div>
            <div className="text-white/60 mt-1">Conforme</div>
          </div>
        </div>
      </div>

      {/* Right panel - Login form */}
      <div className="login-right">
        <Card className="w-full max-w-md border-0 shadow-none">
          <CardHeader className="text-center pb-2">
            <div className="md:hidden flex justify-center mb-4">
              <div className="w-14 h-14 bg-[#005F73] rounded-lg flex items-center justify-center">
                <Gauge className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-['Barlow_Condensed'] uppercase tracking-tight">
              Connexion
            </CardTitle>
            <CardDescription>
              Accédez à votre espace de gestion
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" data-testid="login-error">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="login-email"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  data-testid="login-password"
                  className="h-11"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-[#005F73] hover:bg-[#004C5C]"
                disabled={loading}
                data-testid="login-submit"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connexion...
                  </>
                ) : (
                  'Se connecter'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-600">
                Pas encore de compte ?{' '}
                <Link
                  to="/register"
                  className="text-[#005F73] hover:underline font-medium"
                  data-testid="register-link"
                >
                  Créer un compte
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
