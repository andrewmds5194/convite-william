import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound({ isHome = false }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg p-4">
      <div className="text-center max-w-md">
        <div className="mb-8 animate-float">
          <Heart className="h-16 w-16 mx-auto text-brand-pink fill-brand-peach" />
        </div>
        
        <h1 className="font-cursive text-4xl sm:text-5xl md:text-6xl text-brand-pink mb-4">
          {isHome ? 'William & Mallu' : 'Oops!'}
        </h1>
        
        <p className="font-serif text-lg sm:text-xl text-brand-text mb-6">
          {isHome 
            ? 'Acesse seu convite através do link exclusivo que você recebeu.'
            : 'Convite não encontrado. Verifique se você acessou o link correto.'}
        </p>
        
        <p className="text-brand-text-muted text-sm sm:text-base mb-8">
          {isHome
            ? 'Se você ainda não recebeu seu convite, entre em contato com os noivos.'
            : 'Entre em contato com os noivos se precisar de ajuda.'}
        </p>
        
        <Link to="/admin/login">
          <Button 
            variant="outline" 
            className="border-brand-peach text-brand-text hover:bg-brand-peach/20"
            data-testid="admin-link-btn"
          >
            Área Administrativa
          </Button>
        </Link>
      </div>
    </div>
  );
}
