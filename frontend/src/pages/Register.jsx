import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Gauge, AlertCircle, Loader2, Clock, CheckCircle2 } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nom: '',
    prenom: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);

    try {
      const result = await register({
        email: formData.email,
        password: formData.password,
        nom: formData.nom,
        prenom: formData.prenom,
      });
      
      // Check if pending approval
      if (result.pending_approval) {
        setPendingApproval(true);
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  // Show pending approval message
  if (pendingApproval) {
    return (
      <div className="login-container">
        <div className="login-left">
          <div className="text-center">
            <div className="w-20 h-20 bg-white/10 rounded-lg flex items-center justify-center mx-auto mb-6">
              <Gauge className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold font-['Barlow_Condensed'] uppercase tracking-tight mb-2">
              HyperbareManager
            </h1>
            <p className="text-[#94e2d5] text-lg">
              Gestion de Maintenance Assistée par Ordinateur
            </p>
          </div>
        </div>

        <div className="login-right">
          <Card className="w-full max-w-md border-0 shadow-none">
            <CardContent className="pt-8">
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                  <Clock className="w-10 h-10 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    Inscription réussie !
                  </h2>
                  <p className="text-slate-600">
                    Votre compte a été créé avec succès.
                  </p>
                </div>
                <Alert className="bg-amber-50 border-amber-200 text-left">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    <strong>En attente d'approbation</strong><br />
                    Un administrateur doit approuver votre compte avant que vous puissiez vous connecter.
                    Vous serez notifié une fois votre compte activé.
                  </AlertDescription>
                </Alert>
                <Link to="/login">
                  <Button variant="outline" className="mt-4">
                    Retour à la connexion
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
            Créez votre compte pour accéder à la plateforme de gestion de maintenance
          </p>
        </div>
      </div>

      {/* Right panel - Register form */}
      <div className="login-right">
        <Card className="w-full max-w-md border-0 shadow-none">
          <CardHeader className="text-center pb-2">
            <div className="md:hidden flex justify-center mb-4">
              <div className="w-14 h-14 bg-[#005F73] rounded-lg flex items-center justify-center">
                <Gauge className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-['Barlow_Condensed'] uppercase tracking-tight">
              Créer un compte
            </CardTitle>
            <CardDescription>
              Inscrivez-vous pour demander l'accès
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4 bg-blue-50 border-blue-200">
              <Clock className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 text-sm">
                Votre compte nécessitera l'approbation d'un administrateur.
              </AlertDescription>
            </Alert>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" data-testid="register-error">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prenom">Prénom</Label>
                  <Input
                    id="prenom"
                    name="prenom"
                    placeholder="Jean"
                    value={formData.prenom}
                    onChange={handleChange}
                    required
                    data-testid="register-prenom"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom</Label>
                  <Input
                    id="nom"
                    name="nom"
                    placeholder="Dupont"
                    value={formData.nom}
                    onChange={handleChange}
                    required
                    data-testid="register-nom"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="votre@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  data-testid="register-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  data-testid="register-password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  data-testid="register-confirm-password"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-[#005F73] hover:bg-[#004C5C]"
                disabled={loading}
                data-testid="register-submit"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Création...
                  </>
                ) : (
                  'Demander l\'accès'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-600">
                Déjà un compte ?{' '}
                <Link
                  to="/login"
                  className="text-[#005F73] hover:underline font-medium"
                  data-testid="login-link"
                >
                  Se connecter
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;
