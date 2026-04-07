import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Heart, MapPin, ExternalLink, Gift, Music, Volume2, VolumeX, Loader2, Clock, Utensils, Waves, Wine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import RSVPModal from '@/components/RSVPModal';
import GiftList from '@/components/GiftList';
import NotFound from './NotFound';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Couple photo URL
const COUPLE_PHOTO = "https://arquivos.andrewmendes.com.br/api/public/dl/G4bFlZ5W/arquivosn8n/WhatsApp%20Image%202026-04-06%20at%2014.15.22.jpeg";

// Floral decoration image (lírios)
const FLORAL_DECORATION = "https://arquivos.andrewmendes.com.br/api/public/dl/2qRkdtdW/arquivosn8n/l%C3%ADrios%20moldura.png";

// Background music (royalty-free wedding music)
const BACKGROUND_MUSIC = "https://arquivos.andrewmendes.com.br/api/public/dl/CEXkxp5u/arquivosn8n/Alok%20%26%20Bhaskar%20-%20Chatuba%20de%20Mesquita%20(Extended%20Version)%20-%20Chatuba%20Nation%20(youtube).mp3";

export default function InvitationPage() {
  const { slug } = useParams();
  const [guest, setGuest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showRSVPModal, setShowRSVPModal] = useState(false);
  const [showGiftsModal, setShowGiftsModal] = useState(false);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio] = useState(() => typeof Audio !== 'undefined' ? new Audio(BACKGROUND_MUSIC) : null);
  const [rsvpDisabled, setRsvpDisabled] = useState(false);

  // Event date: June 21, 2026 at 13:00 BRT (16:00 UTC)
  const eventDate = new Date('2026-06-21T16:00:00Z');
  // RSVP deadline: June 19, 2026 at 13:00 BRT (16:00 UTC)
  const rsvpDeadline = new Date('2026-06-19T16:00:00Z');

  const fetchGuest = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/invite/${slug}`);
      setGuest(response.data);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchGuest();
  }, [fetchGuest]);

  // Countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const diff = eventDate.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Check RSVP deadline
  useEffect(() => {
    const checkDeadline = () => {
      setRsvpDisabled(new Date() > rsvpDeadline);
    };
    checkDeadline();
    const interval = setInterval(checkDeadline, 60000);
    return () => clearInterval(interval);
  }, []);

  // Audio controls
  useEffect(() => {
    if (audio) {
      audio.loop = true;
      audio.volume = 0.3;
    }
    return () => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, [audio]);

  const toggleMusic = () => {
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {
        toast.info('Clique novamente para tocar a música');
      });
    }
    setIsPlaying(!isPlaying);
  };

  const handleRSVPSuccess = () => {
    setShowRSVPModal(false);
    fetchGuest();
    toast.success('Presença confirmada com sucesso!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-brand-pink" />
          <p className="text-brand-text-muted font-sans">Carregando convite...</p>
        </div>
      </div>
    );
  }

  if (error || !guest) {
    return <NotFound />;
  }

  const isCouple = guest.guest_type === 'couple';
  const hasConfirmed = !!guest.rsvp;

  return (
    <div className="min-h-screen bg-brand-bg relative overflow-x-hidden">
      {/* Music Button */}
      <button
        onClick={toggleMusic}
        className={`music-btn fixed top-4 right-4 z-50 p-3 rounded-full bg-white soft-shadow ${isPlaying ? 'playing' : ''}`}
        data-testid="music-toggle-btn"
        aria-label={isPlaying ? 'Pausar música' : 'Tocar música'}
      >
        {isPlaying ? (
          <Volume2 className="h-5 w-5 text-brand-pink" />
        ) : (
          <VolumeX className="h-5 w-5 text-brand-text-muted" />
        )}
      </button>

      {/* Floral Decorations - Lírios */}
      <img 
        src={FLORAL_DECORATION} 
        alt="" 
        className="absolute top-0 left-0 w-32 sm:w-40 md:w-48 lg:w-56 opacity-80 pointer-events-none z-10"
        style={{ transform: 'rotate(0deg)' }}
      />
      <img 
        src={FLORAL_DECORATION} 
        alt="" 
        className="absolute bottom-0 right-0 w-24 sm:w-40 md:w-48 lg:w-56 opacity-80 pointer-events-none z-10"
        style={{ transform: 'rotate(180deg)' }}
      />

      {/* Hero Section */}
      <section className="min-h-screen flex flex-col items-center justify-center px-4 py-8 sm:py-16 relative">
        <div className="pt-16 text-center animate-fade-in-up">
          <p className="font-serif text-base sm:text-lg md:text-xl text-brand-text-muted mb-2 sm:mb-4 tracking-widest uppercase">
            Chá de Casa Nova
          </p>
          <h1 className="font-cursive text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-brand-pink mb-2 sm:mb-6">
            William & Mallu
          </h1>
          <div className="decorative-divider max-w-xs mx-auto">
            <Heart className="h-5 w-5 text-brand-peach fill-brand-peach" />
          </div>
        </div>

        {/* Couple Photo - Full width on mobile */}
        <div className="mt-3 sm:mt-4 animate-fade-in-up w-full max-w-sm sm:max-w-md px-4" style={{ animationDelay: '0.2s' }}>
          <div className="photo-frame rounded-t-full rounded-b-3xl overflow-hidden">
            <img 
              src={COUPLE_PHOTO} 
              alt="William & Mallu" 
              className="w-full h-full object-cover"
              data-testid="couple-photo"
            />
          </div>
        </div>

        {/* Countdown */}
        <div className="mt-10 sm:mt-16 animate-fade-in-up w-full px-4" style={{ animationDelay: '0.4s' }}>
          <p className="text-center font-serif text-lg sm:text-xl md:text-2xl text-brand-text mb-6 sm:mb-8">
            21 de Junho de 2026 • 13h
          </p>
          <div className="flex justify-center gap-3 sm:gap-4 md:gap-8" data-testid="countdown-timer">
            <div className="countdown-item">
              <span className="countdown-number text-3xl sm:text-4xl md:text-5xl">{String(countdown.days).padStart(2, '0')}</span>
              <span className="countdown-label text-xs">Dias</span>
            </div>
            <div className="countdown-item">
              <span className="countdown-number text-3xl sm:text-4xl md:text-5xl">{String(countdown.hours).padStart(2, '0')}</span>
              <span className="countdown-label text-xs">Horas</span>
            </div>
            <div className="countdown-item">
              <span className="countdown-number text-3xl sm:text-4xl md:text-5xl">{String(countdown.minutes).padStart(2, '0')}</span>
              <span className="countdown-label text-xs">Min</span>
            </div>
            <div className="countdown-item">
              <span className="countdown-number text-3xl sm:text-4xl md:text-5xl">{String(countdown.seconds).padStart(2, '0')}</span>
              <span className="countdown-label text-xs">Seg</span>
            </div>
          </div>
        </div>
      </section>

      {/* Invitation Text Section */}
      <section className="py-16 sm:py-24 px-4 bg-white/50">
        <div className="max-w-2xl mx-auto text-center animate-fade-in-up">
          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl text-brand-text mb-6 sm:mb-8 italic">
            {isCouple ? `Queridos ${guest.name}` : `Querido(a) ${guest.name}`}
          </h2>
          <p className="font-sans text-base sm:text-lg leading-relaxed text-brand-text mb-4 sm:mb-6">
            {isCouple 
              ? 'Vocês são muito especiais para nós e gostaríamos muito de compartilhar esse momento tão especial em nossas vidas.'
              : 'Você é muito especial para nós e gostaríamos muito de compartilhar esse momento tão especial em nossas vidas.'
            }
          </p>
          <p className="font-sans text-base sm:text-lg leading-relaxed text-brand-text mb-4 sm:mb-6">
            {isCouple
              ? 'Por isso, temos o prazer de convidar vocês para o nosso Chá de Casa Nova, uma festa em comemoração da nossa casa própria e do nosso noivado!'
              : 'Por isso, temos o prazer de convidar você para o nosso Chá de Casa Nova, uma festa em comemoração da nossa casa própria e do nosso noivado!'
            }
          </p>
          <p className="font-serif text-lg sm:text-xl text-brand-pink italic mt-6 sm:mt-8">
            {isCouple ? 'Esperamos vocês!' : 'Esperamos você!'}
          </p>
        </div>
      </section>

      {/* Event Schedule Section */}
      <section className="py-16 sm:py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <Clock className="h-8 w-8 mx-auto text-brand-pink mb-4" />
            <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl text-brand-text mb-4">Programação</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="glass-card rounded-2xl p-6 soft-shadow text-center">
              <Clock className="h-8 w-8 mx-auto text-brand-orange mb-3" />
              <h3 className="font-serif text-lg sm:text-xl text-brand-text mb-2">Início às 13h</h3>
              <p className="text-sm text-brand-text-muted">Venha no horário para não perder nada!</p>
            </div>

            <div className="glass-card rounded-2xl p-6 soft-shadow text-center">
              <Utensils className="h-8 w-8 mx-auto text-brand-orange mb-3" />
              <h3 className="font-serif text-lg sm:text-xl text-brand-text mb-2">Almoço: Feijoada</h3>
              <p className="text-sm text-brand-text-muted">Teremos uma deliciosa feijoada completa!</p>
            </div>

            <div className="glass-card rounded-2xl p-6 soft-shadow text-center">
              <Waves className="h-8 w-8 mx-auto text-brand-orange mb-3" />
              <h3 className="font-serif text-lg sm:text-xl text-brand-text mb-2">Piscina Liberada</h3>
              <p className="text-sm text-brand-text-muted">Traga sua roupa de banho e fique à vontade!</p>
            </div>

            <div className="glass-card rounded-2xl p-6 soft-shadow text-center">
              <Wine className="h-8 w-8 mx-auto text-brand-orange mb-3" />
              <h3 className="font-serif text-lg sm:text-xl text-brand-text mb-2">Bebidas</h3>
              <p className="text-sm text-brand-text-muted">Não alcoólicas servidas no almoço. Para bebidas alcoólicas, traga seu cooler!</p>
            </div>
          </div>
        </div>
      </section>

      {/* Location Section */}
      <section className="py-16 sm:py-24 px-4 bg-white/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <MapPin className="h-8 w-8 mx-auto text-brand-pink mb-4" />
            <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl text-brand-text mb-4">Localização</h2>
            <p className="font-sans text-brand-text-muted text-sm sm:text-base max-w-md mx-auto">
              Chácara Mansão Santa Juliana, (Próximo ao Mercado Super Rick) - Setor Leste, Planaltina - GO
            </p>
          </div>

          <div className="map-container soft-shadow">
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d420.7431452419618!2d-47.593624176188406!3d-15.452462008851224!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x935a7100766fb919%3A0x68c092ad5d7d8f9c!2sMans%C3%A3o%20Santa%20Juliana!5e1!3m2!1spt-BR!2sbr!4v1775516612217!5m2!1spt-BR!2sbr" 
              width="100%" 
              height="350" 
              style={{ border: 0 }} 
              allowFullScreen="" 
              loading="lazy" 
              referrerPolicy="no-referrer-when-downgrade"
              title="Localização do evento"
              data-testid="map-iframe"
              className="sm:h-[400px]"
            />
          </div>

          <div className="text-center mt-6 sm:mt-8">
            <a 
              href="https://share.google/gzSNB3JkbChFuEkLf" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button
                className="bg-brand-pink hover:bg-brand-orange text-white font-sans uppercase tracking-wider rounded-full px-6 sm:px-8"
                data-testid="open-maps-btn"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Abrir no Google Maps
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Gift List Button Section - Only show if not confirmed OR always show */}
      <section className="py-16 sm:py-24 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <Gift className="h-8 w-8 mx-auto text-brand-pink mb-4" />
          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl text-brand-text mb-4">Lista de Presentes</h2>
          <p className="font-sans text-brand-text-muted mb-6 sm:mb-8 text-sm sm:text-base">
            Sua presença é o nosso maior presente, mas se quiser nos presentear, preparamos uma lista especial.
          </p>
          <Button
            onClick={() => setShowGiftsModal(true)}
            className="bg-brand-orange hover:bg-brand-pink text-white font-sans uppercase tracking-wider rounded-full px-6 sm:px-8"
            data-testid="view-gifts-btn"
          >
            Ver Lista de Presentes
          </Button>
        </div>
      </section>

      {/* RSVP Status Section */}
      {hasConfirmed ? (
        <section className="py-12 sm:py-16 px-4 bg-white/50">
          <div className="max-w-md mx-auto text-center glass-card rounded-2xl p-6 sm:p-8 soft-shadow">
            <Heart className="h-12 w-12 mx-auto text-brand-pink fill-brand-pink mb-4" />
            <h3 className="font-serif text-xl sm:text-2xl text-brand-text mb-2">Presença Confirmada!</h3>
            <p className="font-sans text-brand-text-muted mb-6">
              Obrigado por confirmar! Estamos ansiosos para {isCouple ? 'vê-los' : 'vê-lo(a)'} lá.
            </p>
            <Button
              onClick={() => setShowGiftsModal(true)}
              className="bg-brand-pink hover:bg-brand-orange text-white font-sans uppercase tracking-wider rounded-full px-6"
              data-testid="view-gifts-after-confirm-btn"
            >
              <Gift className="mr-2 h-4 w-4" />
              Ver Lista de Presentes
            </Button>
          </div>
        </section>
      ) : null}

      {/* Testimonials/Message Section */}
      <section className="py-16 sm:py-24 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <Heart className="h-8 w-8 mx-auto text-brand-pink mb-4" />
          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl text-brand-text mb-4">Deixe sua Mensagem</h2>
          <p className="font-sans text-brand-text-muted mb-6 text-sm sm:text-base">
            Ao confirmar sua presença, você pode deixar uma mensagem especial para nós. Mal podemos esperar para ler!
          </p>
          {hasConfirmed && guest.rsvp?.message && (
            <div className="glass-card rounded-2xl p-6 soft-shadow mt-6">
              <p className="font-serif text-lg italic text-brand-text">"{guest.rsvp.message}"</p>
              <p className="text-sm text-brand-text-muted mt-2">- {guest.rsvp.name}</p>
            </div>
          )}
        </div>
      </section>

      {/* Floating RSVP Button */}
      {!hasConfirmed && (
        <button
          onClick={() => !rsvpDisabled && setShowRSVPModal(true)}
          disabled={rsvpDisabled}
          className={`rsvp-floating-btn flex items-center gap-2 px-5 sm:px-6 py-3 sm:py-4 rounded-full text-white font-sans uppercase tracking-wider text-sm sm:text-base soft-shadow ${
            rsvpDisabled 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-brand-pink hover:bg-brand-orange animate-pulse-soft'
          }`}
          data-testid="rsvp-floating-button"
        >
          <Heart className="h-4 w-4 sm:h-5 sm:w-5" />
          {rsvpDisabled ? 'Prazo Encerrado' : 'Confirmar Presença'}
        </button>
      )}

      {/* RSVP Modal */}
      <RSVPModal
        open={showRSVPModal}
        onOpenChange={setShowRSVPModal}
        guest={guest}
        onSuccess={handleRSVPSuccess}
      />

      {/* Gifts Modal */}
      <Dialog open={showGiftsModal} onOpenChange={setShowGiftsModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-brand-bg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl sm:text-2xl text-brand-text text-center">
              Lista de Presentes
            </DialogTitle>
            <DialogDescription className="text-center text-brand-text-muted text-sm">
              Escolha um ou mais presentes para nos dar. Você pode cancelar sua escolha a qualquer momento.
            </DialogDescription>
          </DialogHeader>
          <GiftList guestSlug={slug} guestId={guest.id} onUpdate={fetchGuest} />
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="py-10 sm:py-12 px-4 text-center">
        <p className="font-cursive text-2xl sm:text-3xl text-brand-pink mb-2">William & Mallu</p>
        <p className="font-sans text-xs sm:text-sm text-brand-text-muted">21.06.2026</p>
      </footer>
    </div>
  );
}
