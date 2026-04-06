import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ExternalLink, Gift, Loader2, Tag, Check, X, MapPin, Store } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function GiftList({ guestSlug, guestId, onUpdate }) {
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reservingId, setReservingId] = useState(null);

  const fetchGifts = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/gifts`);
      setGifts(response.data);
    } catch (error) {
      toast.error('Erro ao carregar lista de presentes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGifts();
  }, []);

  const handleReserve = async (giftId) => {
    setReservingId(giftId);
    try {
      await axios.post(`${API_URL}/api/gifts/${giftId}/reserve?slug=${guestSlug}`);
      toast.success('Presente reservado com sucesso!');
      fetchGifts();
      if (onUpdate) onUpdate();
    } catch (error) {
      const message = error.response?.data?.detail || 'Erro ao reservar presente';
      toast.error(typeof message === 'string' ? message : 'Erro ao reservar presente');
    } finally {
      setReservingId(null);
    }
  };

  const handleCancel = async (giftId) => {
    setReservingId(giftId);
    try {
      await axios.post(`${API_URL}/api/gifts/${giftId}/cancel?slug=${guestSlug}`);
      toast.success('Reserva cancelada com sucesso!');
      fetchGifts();
      if (onUpdate) onUpdate();
    } catch (error) {
      const message = error.response?.data?.detail || 'Erro ao cancelar reserva';
      toast.error(typeof message === 'string' ? message : 'Erro ao cancelar reserva');
    } finally {
      setReservingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-brand-pink" />
      </div>
    );
  }

  if (gifts.length === 0) {
    return (
      <div className="text-center py-12">
        <Gift className="h-12 w-12 mx-auto text-brand-peach mb-4" />
        <p className="text-brand-text-muted">Nenhum presente cadastrado ainda.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
      {gifts.map((gift) => {
        const isReserved = !!gift.reserved_by_guest_id;
        const isReservedByMe = gift.reserved_by_guest_id === guestId;
        const isFixedStore = gift.is_fixed_store;

        // Fixed store card has special rendering
        if (isFixedStore) {
          return (
            <div
              key={gift.id}
              className="gift-card bg-gradient-to-br from-brand-yellow/30 to-brand-peach/30 rounded-xl overflow-hidden border-2 border-brand-orange/50 md:col-span-2"
              data-testid="fixed-store-card"
            >
              <div className="flex flex-col md:flex-row">
                {gift.image_url && (
                  <div className="md:w-1/3 aspect-video md:aspect-square bg-brand-bg overflow-hidden">
                    <img 
                      src={gift.image_url} 
                      alt={gift.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <div className="flex-1 p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Store className="h-6 w-6 text-brand-orange" />
                    <h3 className="font-serif text-2xl text-brand-text">{gift.name}</h3>
                  </div>

                  {gift.description && (
                    <p className="text-brand-text-muted">{gift.description}</p>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    {gift.external_link && (
                      <a 
                        href={gift.external_link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1"
                      >
                        <Button
                          className="w-full bg-brand-pink hover:bg-brand-orange text-white"
                          data-testid="store-list-btn"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Ver Lista
                        </Button>
                      </a>
                    )}
                    
                    {gift.store_map_link && (
                      <a 
                        href={gift.store_map_link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1"
                      >
                        <Button
                          variant="outline"
                          className="w-full border-brand-orange text-brand-orange hover:bg-brand-orange/10"
                          data-testid="store-map-btn"
                        >
                          <MapPin className="h-4 w-4 mr-2" />
                          Mapa da Loja
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        }

        // Regular gift cards
        return (
          <div
            key={gift.id}
            className={`gift-card bg-white rounded-xl overflow-hidden border transition-all ${
              isReserved && !isReservedByMe 
                ? 'border-gray-200 opacity-60' 
                : isReservedByMe 
                  ? 'border-brand-pink' 
                  : 'border-brand-peach/30 hover:border-brand-peach'
            }`}
            data-testid={`gift-card-${gift.id}`}
          >
            {gift.image_url && (
              <div className="aspect-video bg-brand-bg overflow-hidden">
                <img 
                  src={gift.image_url} 
                  alt={gift.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <h3 className="font-serif text-lg text-brand-text">{gift.name}</h3>
                {isReserved && !isReservedByMe && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    Escolhido
                  </span>
                )}
                {isReservedByMe && (
                  <span className="text-xs bg-brand-pink/10 text-brand-pink px-2 py-1 rounded-full flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Sua escolha
                  </span>
                )}
              </div>

              {gift.description && (
                <p className="text-sm text-brand-text-muted">{gift.description}</p>
              )}

              {gift.coupon_code && gift.is_local && (
                <div className="flex items-center gap-2 bg-brand-yellow/30 rounded-lg p-2">
                  <Tag className="h-4 w-4 text-brand-orange" />
                  <span className="text-sm font-medium text-brand-text">
                    Cupom: {gift.coupon_code}
                  </span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {gift.external_link && !gift.is_local && (
                  <a 
                    href={gift.external_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1"
                  >
                    <Button
                      variant="outline"
                      className="w-full border-brand-peach text-brand-text hover:bg-brand-peach/20"
                      data-testid={`gift-external-link-${gift.id}`}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Ver Produto
                    </Button>
                  </a>
                )}

                {isReservedByMe ? (
                  <Button
                    onClick={() => handleCancel(gift.id)}
                    disabled={reservingId === gift.id}
                    variant="outline"
                    className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                    data-testid={`gift-cancel-${gift.id}`}
                  >
                    {reservingId === gift.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <X className="h-4 w-4 mr-2" />
                        Cancelar
                      </>
                    )}
                  </Button>
                ) : !isReserved ? (
                  <Button
                    onClick={() => handleReserve(gift.id)}
                    disabled={reservingId === gift.id}
                    className="flex-1 bg-brand-pink hover:bg-brand-orange text-white"
                    data-testid={`gift-reserve-${gift.id}`}
                  >
                    {reservingId === gift.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Gift className="h-4 w-4 mr-2" />
                        Escolher
                      </>
                    )}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
