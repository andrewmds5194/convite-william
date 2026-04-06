import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Users, 
  Copy, 
  Check, 
  Loader2,
  UserCheck,
  UserX,
  Eye,
  EyeOff,
  Clock
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function GuestManagement() {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewsModal, setShowViewsModal] = useState(false);
  const [selectedGuestViews, setSelectedGuestViews] = useState(null);
  const [editingGuest, setEditingGuest] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [formData, setFormData] = useState({ name: '', guest_type: 'individual' });
  const [submitting, setSubmitting] = useState(false);

  const fetchGuests = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/guests`, {
        withCredentials: true
      });
      setGuests(response.data);
    } catch (error) {
      toast.error('Erro ao carregar convidados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuests();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Por favor, informe o nome');
      return;
    }

    setSubmitting(true);
    try {
      if (editingGuest) {
        await axios.put(`${API_URL}/api/guests/${editingGuest.id}`, formData, {
          withCredentials: true
        });
        toast.success('Convidado atualizado com sucesso!');
      } else {
        await axios.post(`${API_URL}/api/guests`, formData, {
          withCredentials: true
        });
        toast.success('Convidado adicionado com sucesso!');
      }
      setShowModal(false);
      setEditingGuest(null);
      setFormData({ name: '', guest_type: 'individual' });
      fetchGuests();
    } catch (error) {
      const message = error.response?.data?.detail || 'Erro ao salvar convidado';
      toast.error(typeof message === 'string' ? message : 'Erro ao salvar convidado');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/guests/${id}`, {
        withCredentials: true
      });
      toast.success('Convidado removido com sucesso!');
      setDeleteConfirm(null);
      fetchGuests();
    } catch (error) {
      toast.error('Erro ao remover convidado');
    }
  };

  const handleCopyMessage = async (guestId) => {
    try {
      const response = await axios.get(`${API_URL}/api/guests/${guestId}/message`, {
        withCredentials: true
      });
      await navigator.clipboard.writeText(response.data.message);
      setCopiedId(guestId);
      toast.success('Mensagem copiada!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast.error('Erro ao copiar mensagem');
    }
  };

  const handleViewHistory = async (guest) => {
    try {
      const response = await axios.get(`${API_URL}/api/guests/${guest.id}/views`, {
        withCredentials: true
      });
      setSelectedGuestViews({ guest, views: response.data.views });
      setShowViewsModal(true);
    } catch (error) {
      toast.error('Erro ao carregar histórico');
    }
  };

  const openEditModal = (guest) => {
    setEditingGuest(guest);
    setFormData({ name: guest.name, guest_type: guest.guest_type });
    setShowModal(true);
  };

  const openAddModal = () => {
    setEditingGuest(null);
    setFormData({ name: '', guest_type: 'individual' });
    setShowModal(true);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-brand-pink" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-brand-text mb-2">Convidados</h1>
          <p className="text-brand-text-muted">Gerencie a lista de convidados do evento</p>
        </div>
        <Button
          onClick={openAddModal}
          className="bg-brand-pink hover:bg-brand-orange text-white"
          data-testid="add-guest-btn"
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar
        </Button>
      </div>

      <Card className="soft-shadow">
        <CardContent className="p-0">
          {guests.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-brand-peach mb-4" />
              <p className="text-brand-text-muted">Nenhum convidado cadastrado</p>
              <Button
                onClick={openAddModal}
                variant="link"
                className="text-brand-pink mt-2"
              >
                Adicionar primeiro convidado
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-brand-text">Nome</TableHead>
                    <TableHead className="text-brand-text">Tipo</TableHead>
                    <TableHead className="text-brand-text">Status</TableHead>
                    <TableHead className="text-brand-text">Visualizações</TableHead>
                    <TableHead className="text-brand-text">Última Abertura</TableHead>
                    <TableHead className="text-brand-text text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {guests.map((guest) => (
                    <TableRow key={guest.id} data-testid={`guest-row-${guest.id}`}>
                      <TableCell className="font-medium">{guest.name}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          guest.guest_type === 'couple' 
                            ? 'bg-brand-peach/20 text-brand-orange' 
                            : 'bg-brand-yellow/30 text-brand-text'
                        }`}>
                          {guest.guest_type === 'couple' ? 'Casal' : 'Individual'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {guest.rsvp ? (
                          <span className="flex items-center gap-1 text-green-600 text-sm">
                            <UserCheck className="h-4 w-4" />
                            Confirmado
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-brand-text-muted text-sm">
                            <UserX className="h-4 w-4" />
                            Pendente
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleViewHistory(guest)}
                          className={`flex items-center gap-1 text-sm ${
                            guest.view_count > 0 ? 'text-blue-600' : 'text-red-500'
                          } hover:underline`}
                          data-testid={`view-count-${guest.id}`}
                        >
                          {guest.view_count > 0 ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                          {guest.view_count || 0}x
                        </button>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-brand-text-muted flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(guest.last_viewed)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyMessage(guest.id)}
                            className="text-brand-pink hover:bg-brand-pink/10"
                            data-testid={`copy-message-${guest.id}`}
                          >
                            {copiedId === guest.id ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(guest)}
                            className="text-brand-text hover:bg-brand-peach/20"
                            data-testid={`edit-guest-${guest.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirm(guest)}
                            className="text-red-500 hover:bg-red-50"
                            data-testid={`delete-guest-${guest.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-brand-bg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-brand-text">
              {editingGuest ? 'Editar Convidado' : 'Adicionar Convidado'}
            </DialogTitle>
            <DialogDescription>
              {editingGuest ? 'Atualize as informações do convidado' : 'Preencha as informações do novo convidado'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="guest-name" className="text-brand-text">Nome</Label>
              <Input
                id="guest-name"
                placeholder="Nome do convidado"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="border-brand-peach/50 focus:border-brand-pink focus:ring-brand-pink"
                required
                data-testid="guest-name-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guest-type" className="text-brand-text">Tipo</Label>
              <Select
                value={formData.guest_type}
                onValueChange={(value) => setFormData({ ...formData, guest_type: value })}
              >
                <SelectTrigger 
                  className="border-brand-peach/50 focus:border-brand-pink focus:ring-brand-pink"
                  data-testid="guest-type-select"
                >
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="couple">Casal</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-brand-text-muted">
                Casais recebem textos no plural no convite.
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
                className="border-brand-peach text-brand-text"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-brand-pink hover:bg-brand-orange text-white"
                disabled={submitting}
                data-testid="save-guest-btn"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Views History Modal */}
      <Dialog open={showViewsModal} onOpenChange={setShowViewsModal}>
        <DialogContent className="bg-brand-bg max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-brand-text">
              Histórico de Visualizações
            </DialogTitle>
            <DialogDescription>
              {selectedGuestViews?.guest.name} - {selectedGuestViews?.views.length || 0} visualização(ões)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {selectedGuestViews?.views.length === 0 ? (
              <p className="text-center py-8 text-brand-text-muted">
                Este convidado ainda não abriu o convite.
              </p>
            ) : (
              selectedGuestViews?.views.map((view, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-brand-peach/20">
                  <Eye className="h-4 w-4 text-brand-pink" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-brand-text">
                      {formatDate(view.viewed_at)}
                    </p>
                    {view.user_agent && (
                      <p className="text-xs text-brand-text-muted truncate">
                        {view.user_agent.substring(0, 60)}...
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="bg-brand-bg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-brand-text">
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover o convidado "{deleteConfirm?.name}"? 
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              className="border-brand-peach text-brand-text"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => handleDelete(deleteConfirm?.id)}
              className="bg-red-500 hover:bg-red-600 text-white"
              data-testid="confirm-delete-btn"
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
