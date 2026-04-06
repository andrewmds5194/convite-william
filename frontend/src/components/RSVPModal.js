import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Plus, Trash2, UserPlus } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function RSVPModal({ open, onOpenChange, guest, onSuccess }) {
  const [name, setName] = useState(guest?.name || '');
  const [whatsapp, setWhatsapp] = useState('');
  const [companions, setCompanions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addCompanion = () => {
    setCompanions([...companions, { name: '', is_child: false }]);
  };

  const removeCompanion = (index) => {
    setCompanions(companions.filter((_, i) => i !== index));
  };

  const updateCompanion = (index, field, value) => {
    const updated = [...companions];
    updated[index][field] = value;
    setCompanions(updated);
  };

  const formatWhatsApp = (value) => {
    // Remove non-digits
    const digits = value.replace(/\D/g, '');
    // Format as (XX) XXXXX-XXXX
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const handleWhatsAppChange = (e) => {
    setWhatsapp(formatWhatsApp(e.target.value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Por favor, informe seu nome');
      return;
    }

    if (!whatsapp.trim() || whatsapp.replace(/\D/g, '').length < 10) {
      setError('Por favor, informe um WhatsApp válido');
      return;
    }

    // Validate companions
    for (let i = 0; i < companions.length; i++) {
      if (!companions[i].name.trim()) {
        setError(`Por favor, informe o nome do acompanhante ${i + 1}`);
        return;
      }
    }

    setLoading(true);

    try {
      await axios.post(`${API_URL}/api/rsvp`, {
        guest_slug: guest.slug,
        name: name.trim(),
        whatsapp: whatsapp.trim(),
        companions: companions.map(c => ({
          name: c.name.trim(),
          is_child: c.is_child
        }))
      });
      onSuccess();
    } catch (err) {
      const message = err.response?.data?.detail || 'Erro ao confirmar presença';
      setError(typeof message === 'string' ? message : 'Erro ao confirmar presença. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-brand-bg">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-brand-text text-center">
            Confirmar Presença
          </DialogTitle>
          <DialogDescription className="text-center text-brand-text-muted">
            Preencha seus dados para confirmar sua presença no evento.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg" data-testid="rsvp-error">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="rsvp-name" className="text-brand-text">Nome Completo *</Label>
            <Input
              id="rsvp-name"
              type="text"
              placeholder="Seu nome completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-brand-peach/50 focus:border-brand-pink focus:ring-brand-pink"
              required
              data-testid="rsvp-name-input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rsvp-whatsapp" className="text-brand-text">WhatsApp *</Label>
            <Input
              id="rsvp-whatsapp"
              type="tel"
              placeholder="(00) 00000-0000"
              value={whatsapp}
              onChange={handleWhatsAppChange}
              className="border-brand-peach/50 focus:border-brand-pink focus:ring-brand-pink"
              required
              data-testid="rsvp-whatsapp-input"
            />
          </div>

          {/* Companions Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-brand-text">Acompanhantes</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCompanion}
                className="border-brand-peach text-brand-text hover:bg-brand-peach/20"
                data-testid="add-companion-btn"
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>

            {companions.map((companion, index) => (
              <div key={index} className="p-4 bg-white rounded-lg border border-brand-peach/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-brand-text">Acompanhante {index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCompanion(index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                    data-testid={`remove-companion-${index}-btn`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <Input
                  type="text"
                  placeholder="Nome do acompanhante"
                  value={companion.name}
                  onChange={(e) => updateCompanion(index, 'name', e.target.value)}
                  className="border-brand-peach/50 focus:border-brand-pink focus:ring-brand-pink"
                  data-testid={`companion-${index}-name-input`}
                />
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`companion-${index}-child`}
                    checked={companion.is_child}
                    onCheckedChange={(checked) => updateCompanion(index, 'is_child', checked)}
                    className="border-brand-peach data-[state=checked]:bg-brand-pink data-[state=checked]:border-brand-pink"
                    data-testid={`companion-${index}-child-checkbox`}
                  />
                  <Label 
                    htmlFor={`companion-${index}-child`}
                    className="text-sm text-brand-text-muted cursor-pointer"
                  >
                    É criança?
                  </Label>
                </div>
              </div>
            ))}
          </div>

          <Button
            type="submit"
            className="w-full bg-brand-pink hover:bg-brand-orange text-white font-sans uppercase tracking-wider"
            disabled={loading}
            data-testid="rsvp-submit-btn"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Confirmando...
              </>
            ) : (
              'Confirmar Presença'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
