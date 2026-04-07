import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  CheckCircle, 
  Loader2, 
  Users, 
  Baby, 
  ChevronRight,
  Gift,
  MessageSquare,
  FileText,
  Download
} from 'lucide-react';
import jsPDF from 'jspdf';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ConfirmedList() {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [guestGifts, setGuestGifts] = useState([]);
  const [loadingGifts, setLoadingGifts] = useState(false);

  const fetchGuests = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/guests`, {
        withCredentials: true
      });
      // Filter only confirmed guests
      const confirmed = response.data.filter(g => g.rsvp);
      setGuests(confirmed);
    } catch (error) {
      toast.error('Erro ao carregar convidados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuests();
  }, []);

  const openGuestDetails = async (guest) => {
    setSelectedGuest(guest);
    setLoadingGifts(true);
    
    try {
      const giftsResponse = await axios.get(`${API_URL}/api/gifts/admin`, {
        withCredentials: true
      });
      // Filter gifts reserved by this guest
      const reserved = giftsResponse.data.filter(g => g.reserved_by_guest_id === guest.id);
      setGuestGifts(reserved);
    } catch (error) {
      console.error('Error loading gifts:', error);
    } finally {
      setLoadingGifts(false);
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Lista de Confirmados - Chá de Casa Nova', 20, 20);
    doc.text('William & Mallu - 21/06/2026', 20, 28);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 20, 36);
    
    let y = 50;
    let totalAdults = 0;
    let totalChildren = 0;
    
    guests.forEach((guest, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      
      // Guest header
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}. ${guest.name} (${guest.guest_type === 'couple' ? 'Casal' : 'Individual'})`, 20, y);
      y += 7;
      
      // Main person
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`   • ${guest.rsvp.name} (adulto)`, 20, y);
      y += 5;
      totalAdults++;
      
      // Companions
      if (guest.rsvp.companions && guest.rsvp.companions.length > 0) {
        guest.rsvp.companions.forEach(c => {
          if (y > 280) {
            doc.addPage();
            y = 20;
          }
          const type = c.is_child ? 'criança' : 'adulto';
          doc.text(`   • ${c.name} (${type})`, 20, y);
          y += 5;
          if (c.is_child) {
            totalChildren++;
          } else {
            totalAdults++;
          }
        });
      }
      
      y += 3;
    });
    
    // Summary at the end
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    
    y += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMO:', 20, y);
    y += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total de convites confirmados: ${guests.length}`, 20, y);
    y += 6;
    doc.text(`Total de adultos: ${totalAdults}`, 20, y);
    y += 6;
    doc.text(`Total de crianças: ${totalChildren}`, 20, y);
    y += 6;
    doc.text(`Total de pessoas: ${totalAdults + totalChildren}`, 20, y);
    
    doc.save('lista-confirmados-cha-casa-nova.pdf');
    toast.success('PDF exportado com sucesso!');
  };

  const getTotalPeople = () => {
    let adults = 0;
    let children = 0;
    
    guests.forEach(g => {
      if (g.rsvp) {
        adults++; // Main person
        g.rsvp.companions?.forEach(c => {
          if (c.is_child) children++;
          else adults++;
        });
      }
    });
    
    return { adults, children, total: adults + children };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-brand-pink" />
      </div>
    );
  }

  const totals = getTotalPeople();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl text-brand-text mb-2">Confirmados</h1>
          <p className="text-brand-text-muted text-sm">Lista de todos que confirmaram presença</p>
        </div>
        <Button
          onClick={exportPDF}
          className="bg-brand-pink hover:bg-brand-orange text-white"
          data-testid="export-pdf-btn"
        >
          <Download className="h-4 w-4 mr-2" />
          Exportar PDF
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="soft-shadow">
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-6 w-6 mx-auto text-green-600 mb-2" />
            <p className="text-2xl font-serif text-brand-text">{guests.length}</p>
            <p className="text-xs text-brand-text-muted">Convites</p>
          </CardContent>
        </Card>
        <Card className="soft-shadow">
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 mx-auto text-brand-orange mb-2" />
            <p className="text-2xl font-serif text-brand-text">{totals.adults}</p>
            <p className="text-xs text-brand-text-muted">Adultos</p>
          </CardContent>
        </Card>
        <Card className="soft-shadow">
          <CardContent className="p-4 text-center">
            <Baby className="h-6 w-6 mx-auto text-brand-peach mb-2" />
            <p className="text-2xl font-serif text-brand-text">{totals.children}</p>
            <p className="text-xs text-brand-text-muted">Crianças</p>
          </CardContent>
        </Card>
        <Card className="soft-shadow">
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 mx-auto text-brand-pink mb-2" />
            <p className="text-2xl font-serif text-brand-text">{totals.total}</p>
            <p className="text-xs text-brand-text-muted">Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Confirmed List */}
      <Card className="soft-shadow">
        <CardHeader>
          <CardTitle className="font-serif text-xl text-brand-text">
            Convites Confirmados
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {guests.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 mx-auto text-brand-peach mb-4" />
              <p className="text-brand-text-muted">Nenhuma confirmação ainda</p>
            </div>
          ) : (
            <div className="divide-y divide-brand-peach/20">
              {guests.map((guest) => {
                const companionCount = guest.rsvp?.companions?.length || 0;
                const totalPeople = 1 + companionCount;
                
                return (
                  <button
                    key={guest.id}
                    onClick={() => openGuestDetails(guest)}
                    className="w-full p-4 flex items-center justify-between hover:bg-brand-peach/10 transition-colors text-left"
                    data-testid={`confirmed-guest-${guest.id}`}
                  >
                    <div>
                      <p className="font-medium text-brand-text">{guest.name}</p>
                      <p className="text-sm text-brand-text-muted">
                        {guest.rsvp.name}
                        {companionCount > 0 && ` +${companionCount} acompanhante${companionCount > 1 ? 's' : ''}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-brand-pink font-medium">{totalPeople} pessoa{totalPeople > 1 ? 's' : ''}</span>
                      <ChevronRight className="h-5 w-5 text-brand-text-muted" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Guest Details Modal */}
      <Dialog open={!!selectedGuest} onOpenChange={() => setSelectedGuest(null)}>
        <DialogContent className="bg-brand-bg max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-brand-text">
              {selectedGuest?.name}
            </DialogTitle>
            <DialogDescription>
              Detalhes da confirmação
            </DialogDescription>
          </DialogHeader>

          {selectedGuest && (
            <div className="space-y-6 mt-4">
              {/* Main person */}
              <div>
                <h4 className="font-medium text-brand-text mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4 text-brand-pink" />
                  Pessoas Confirmadas
                </h4>
                <div className="space-y-2">
                  <div className="p-3 bg-white rounded-lg border border-brand-peach/30">
                    <p className="font-medium text-brand-text">{selectedGuest.rsvp.name}</p>
                    <p className="text-sm text-brand-text-muted">Adulto • WhatsApp: {selectedGuest.rsvp.whatsapp}</p>
                  </div>
                  
                  {selectedGuest.rsvp.companions?.map((c, i) => (
                    <div key={i} className="p-3 bg-white rounded-lg border border-brand-peach/30">
                      <p className="font-medium text-brand-text">{c.name}</p>
                      <p className="text-sm text-brand-text-muted">{c.is_child ? 'Criança' : 'Adulto'}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Message */}
              {selectedGuest.rsvp.message && (
                <div>
                  <h4 className="font-medium text-brand-text mb-2 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-brand-pink" />
                    Mensagem
                  </h4>
                  <div className="p-4 bg-brand-yellow/20 rounded-lg border border-brand-yellow/50">
                    <p className="text-brand-text italic">"{selectedGuest.rsvp.message}"</p>
                  </div>
                </div>
              )}

              {/* Gifts */}
              <div>
                <h4 className="font-medium text-brand-text mb-2 flex items-center gap-2">
                  <Gift className="h-4 w-4 text-brand-pink" />
                  Presentes Escolhidos
                </h4>
                {loadingGifts ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-brand-pink" />
                  </div>
                ) : guestGifts.length === 0 ? (
                  <p className="text-sm text-brand-text-muted py-2">Nenhum presente escolhido</p>
                ) : (
                  <div className="space-y-2">
                    {guestGifts.map((gift) => (
                      <div key={gift.id} className="p-3 bg-white rounded-lg border border-brand-peach/30 flex items-center gap-3">
                        {gift.image_url && (
                          <img src={gift.image_url} alt={gift.name} className="w-12 h-12 rounded object-cover" />
                        )}
                        <p className="font-medium text-brand-text">{gift.name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
