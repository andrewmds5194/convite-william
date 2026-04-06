import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Gift, 
  Loader2,
  ExternalLink,
  Tag,
  Store,
  MapPin
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function GiftManagement() {
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGift, setEditingGift] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    external_link: '',
    coupon_code: '',
    is_local: false,
    is_fixed_store: false,
    store_map_link: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchGifts = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/gifts/admin`, {
        withCredentials: true
      });
      setGifts(response.data);
    } catch (error) {
      toast.error('Erro ao carregar presentes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGifts();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Por favor, informe o nome do presente');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        image_url: formData.image_url || null,
        external_link: formData.external_link || null,
        coupon_code: formData.coupon_code || null,
        store_map_link: formData.store_map_link || null
      };

      if (editingGift) {
        await axios.put(`${API_URL}/api/gifts/${editingGift.id}`, payload, {
          withCredentials: true
        });
        toast.success('Presente atualizado com sucesso!');
      } else {
        await axios.post(`${API_URL}/api/gifts`, payload, {
          withCredentials: true
        });
        toast.success('Presente adicionado com sucesso!');
      }
      setShowModal(false);
      setEditingGift(null);
      resetForm();
      fetchGifts();
    } catch (error) {
      const message = error.response?.data?.detail || 'Erro ao salvar presente';
      toast.error(typeof message === 'string' ? message : 'Erro ao salvar presente');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/gifts/${id}`, {
        withCredentials: true
      });
      toast.success('Presente removido com sucesso!');
      setDeleteConfirm(null);
      fetchGifts();
    } catch (error) {
      const message = error.response?.data?.detail || 'Erro ao remover presente';
      toast.error(typeof message === 'string' ? message : 'Erro ao remover presente');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      image_url: '',
      external_link: '',
      coupon_code: '',
      is_local: false,
      is_fixed_store: false,
      store_map_link: ''
    });
  };

  const openEditModal = (gift) => {
    setEditingGift(gift);
    setFormData({
      name: gift.name,
      description: gift.description || '',
      image_url: gift.image_url || '',
      external_link: gift.external_link || '',
      coupon_code: gift.coupon_code || '',
      is_local: gift.is_local || false,
      is_fixed_store: gift.is_fixed_store || false,
      store_map_link: gift.store_map_link || ''
    });
    setShowModal(true);
  };

  const openAddModal = () => {
    setEditingGift(null);
    resetForm();
    setShowModal(true);
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
          <h1 className="font-serif text-3xl text-brand-text mb-2">Presentes</h1>
          <p className="text-brand-text-muted">Gerencie a lista de presentes</p>
        </div>
        <Button
          onClick={openAddModal}
          className="bg-brand-pink hover:bg-brand-orange text-white"
          data-testid="add-gift-btn"
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar
        </Button>
      </div>

      <Card className="soft-shadow">
        <CardContent className="p-0">
          {gifts.length === 0 ? (
            <div className="text-center py-12">
              <Gift className="h-12 w-12 mx-auto text-brand-peach mb-4" />
              <p className="text-brand-text-muted">Nenhum presente cadastrado</p>
              <Button
                onClick={openAddModal}
                variant="link"
                className="text-brand-pink mt-2"
              >
                Adicionar primeiro presente
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-brand-text">Presente</TableHead>
                  <TableHead className="text-brand-text">Tipo</TableHead>
                  <TableHead className="text-brand-text">Status</TableHead>
                  <TableHead className="text-brand-text">Reservado por</TableHead>
                  <TableHead className="text-brand-text text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gifts.map((gift) => (
                  <TableRow 
                    key={gift.id} 
                    data-testid={`gift-row-${gift.id}`}
                    className={gift.is_fixed_store ? 'bg-brand-yellow/10' : ''}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {gift.image_url && (
                          <img 
                            src={gift.image_url} 
                            alt={gift.name}
                            className="w-10 h-10 rounded object-cover"
                          />
                        )}
                        <div>
                          <span className="font-medium">{gift.name}</span>
                          {gift.is_fixed_store && (
                            <div className="flex items-center gap-1 text-xs text-brand-orange">
                              <Store className="h-3 w-3" />
                              Loja Fixa
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {gift.is_fixed_store ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-brand-orange/20 text-brand-orange">
                          Loja de Enxovais
                        </span>
                      ) : (
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          gift.is_local 
                            ? 'bg-brand-yellow/30 text-brand-text' 
                            : 'bg-brand-peach/20 text-brand-orange'
                        }`}>
                          {gift.is_local ? 'Enxoval Local' : 'Link Externo'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {gift.is_fixed_store ? (
                        <span className="text-brand-text-muted text-sm">-</span>
                      ) : gift.reserved_by_guest_id ? (
                        <span className="text-green-600 text-sm">Reservado</span>
                      ) : (
                        <span className="text-brand-text-muted text-sm">Disponível</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {gift.is_fixed_store ? '-' : (gift.reserved_by_guest_name || '-')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {gift.external_link && (
                          <a 
                            href={gift.external_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-brand-pink hover:bg-brand-pink/10"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </a>
                        )}
                        {gift.store_map_link && (
                          <a 
                            href={gift.store_map_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-brand-orange hover:bg-brand-orange/10"
                            >
                              <MapPin className="h-4 w-4" />
                            </Button>
                          </a>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(gift)}
                          className="text-brand-text hover:bg-brand-peach/20"
                          data-testid={`edit-gift-${gift.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {!gift.is_fixed_store && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirm(gift)}
                            className="text-red-500 hover:bg-red-50"
                            data-testid={`delete-gift-${gift.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-brand-bg max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-brand-text">
              {editingGift ? (editingGift.is_fixed_store ? 'Editar Loja de Enxovais' : 'Editar Presente') : 'Adicionar Presente'}
            </DialogTitle>
            <DialogDescription>
              {editingGift?.is_fixed_store 
                ? 'Atualize as informações da loja de enxovais fixa' 
                : (editingGift ? 'Atualize as informações do presente' : 'Preencha as informações do novo presente')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gift-name" className="text-brand-text">Nome *</Label>
              <Input
                id="gift-name"
                placeholder="Nome do presente"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="border-brand-peach/50 focus:border-brand-pink focus:ring-brand-pink"
                required
                data-testid="gift-name-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gift-description" className="text-brand-text">Descrição</Label>
              <Textarea
                id="gift-description"
                placeholder="Descrição opcional"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="border-brand-peach/50 focus:border-brand-pink focus:ring-brand-pink"
                rows={3}
                data-testid="gift-description-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gift-image" className="text-brand-text">URL da Imagem</Label>
              <Input
                id="gift-image"
                type="url"
                placeholder="https://exemplo.com/imagem.jpg"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                className="border-brand-peach/50 focus:border-brand-pink focus:ring-brand-pink"
                data-testid="gift-image-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gift-link" className="text-brand-text">
                {formData.is_fixed_store ? 'Link da Lista de Presentes' : 'Link Externo'}
              </Label>
              <Input
                id="gift-link"
                type="url"
                placeholder="https://loja.com/produto"
                value={formData.external_link}
                onChange={(e) => setFormData({ ...formData, external_link: e.target.value })}
                className="border-brand-peach/50 focus:border-brand-pink focus:ring-brand-pink"
                data-testid="gift-link-input"
              />
            </div>

            {/* Fixed store specific fields */}
            {(formData.is_fixed_store || editingGift?.is_fixed_store) && (
              <div className="space-y-2">
                <Label htmlFor="gift-map-link" className="text-brand-text">Link do Mapa da Loja</Label>
                <Input
                  id="gift-map-link"
                  type="url"
                  placeholder="https://share.google/..."
                  value={formData.store_map_link}
                  onChange={(e) => setFormData({ ...formData, store_map_link: e.target.value })}
                  className="border-brand-peach/50 focus:border-brand-pink focus:ring-brand-pink"
                  data-testid="gift-map-link-input"
                />
              </div>
            )}

            {/* Only show these options for non-fixed-store items */}
            {!editingGift?.is_fixed_store && !formData.is_fixed_store && (
              <>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="gift-local"
                    checked={formData.is_local}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_local: checked })}
                    className="border-brand-peach data-[state=checked]:bg-brand-pink data-[state=checked]:border-brand-pink"
                    data-testid="gift-local-checkbox"
                  />
                  <Label 
                    htmlFor="gift-local"
                    className="text-sm text-brand-text cursor-pointer"
                  >
                    É enxoval local (com cupom)?
                  </Label>
                </div>

                {formData.is_local && (
                  <div className="space-y-2">
                    <Label htmlFor="gift-coupon" className="text-brand-text">Código do Cupom</Label>
                    <Input
                      id="gift-coupon"
                      placeholder="CUPOM123"
                      value={formData.coupon_code}
                      onChange={(e) => setFormData({ ...formData, coupon_code: e.target.value })}
                      className="border-brand-peach/50 focus:border-brand-pink focus:ring-brand-pink"
                      data-testid="gift-coupon-input"
                    />
                  </div>
                )}
              </>
            )}

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
                data-testid="save-gift-btn"
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

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="bg-brand-bg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-brand-text">
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover o presente "{deleteConfirm?.name}"? 
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
              data-testid="confirm-delete-gift-btn"
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
