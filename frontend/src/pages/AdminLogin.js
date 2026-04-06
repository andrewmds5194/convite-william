import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Loader2, Lock, User } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(username, password);
      toast.success('Login realizado com sucesso!');
      navigate('/admin');
    } catch (error) {
      const message = error.response?.data?.detail || 'Erro ao fazer login';
      toast.error(typeof message === 'string' ? message : 'Credenciais inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-fade-in">
          <Heart className="h-12 w-12 mx-auto text-brand-pink fill-brand-peach mb-4" />
          <h1 className="font-cursive text-4xl text-brand-pink">William & Mallu</h1>
          <p className="text-brand-text-muted mt-2">Painel Administrativo</p>
        </div>

        <Card className="soft-shadow animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <CardHeader className="text-center">
            <CardTitle className="font-serif text-2xl text-brand-text">Entrar</CardTitle>
            <CardDescription>Acesse o painel para gerenciar o chá de panela</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-brand-text">Usuário</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-text-muted" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Digite seu usuário"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 border-brand-peach/50 focus:border-brand-pink focus:ring-brand-pink"
                    required
                    data-testid="login-username-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-brand-text">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-text-muted" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 border-brand-peach/50 focus:border-brand-pink focus:ring-brand-pink"
                    required
                    data-testid="login-password-input"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-brand-pink hover:bg-brand-orange text-white font-sans uppercase tracking-wider"
                disabled={loading}
                data-testid="login-submit-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
