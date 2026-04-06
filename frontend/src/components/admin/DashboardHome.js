import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Baby, 
  Gift, 
  CheckCircle, 
  Loader2, 
  Eye, 
  EyeOff, 
  Download, 
  Upload,
  Database
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function DashboardHome() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const fileInputRef = useRef(null);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/dashboard`, {
        withCredentials: true
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleDownloadBackup = async () => {
    setBackupLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/backup/download`, {
        withCredentials: true,
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from header or generate one
      const contentDisposition = response.headers['content-disposition'];
      let filename = `backup_cha_de_panela_${new Date().toISOString().slice(0,10)}.json`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename=(.+)/);
        if (match) filename = match[1];
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Backup baixado com sucesso!');
    } catch (error) {
      toast.error('Erro ao baixar backup');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleUploadBackup = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Confirm before restore
    if (!window.confirm('ATENÇÃO: Isso irá substituir todos os dados atuais pelo backup. Deseja continuar?')) {
      event.target.value = '';
      return;
    }
    
    setRestoreLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axios.post(`${API_URL}/api/backup/upload`, formData, {
        withCredentials: true,
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast.success(`Backup restaurado! Convidados: ${response.data.restored.guests}, RSVPs: ${response.data.restored.rsvps}, Presentes: ${response.data.restored.gifts}`);
      fetchStats();
    } catch (error) {
      const message = error.response?.data?.detail || 'Erro ao restaurar backup';
      toast.error(typeof message === 'string' ? message : 'Erro ao restaurar backup');
    } finally {
      setRestoreLoading(false);
      event.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-brand-pink" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-brand-text-muted">Erro ao carregar estatísticas</p>
      </div>
    );
  }

  const statCards = [
    { 
      title: 'Total de Convidados', 
      value: stats.total_guests, 
      icon: Users, 
      color: 'text-brand-pink',
      bg: 'bg-brand-pink/10'
    },
    { 
      title: 'Confirmados', 
      value: stats.total_confirmed, 
      icon: CheckCircle, 
      color: 'text-green-600',
      bg: 'bg-green-100'
    },
    { 
      title: 'Adultos Confirmados', 
      value: stats.total_adults, 
      icon: Users, 
      color: 'text-brand-orange',
      bg: 'bg-brand-orange/10'
    },
    { 
      title: 'Crianças', 
      value: stats.total_children, 
      icon: Baby, 
      color: 'text-brand-peach',
      bg: 'bg-brand-peach/20'
    },
    { 
      title: 'Presentes Cadastrados', 
      value: stats.total_gifts, 
      icon: Gift, 
      color: 'text-brand-yellow',
      bg: 'bg-brand-yellow/20'
    },
    { 
      title: 'Presentes Reservados', 
      value: stats.reserved_gifts, 
      icon: Gift, 
      color: 'text-green-600',
      bg: 'bg-green-100'
    },
  ];

  const viewStats = [
    {
      title: 'Total de Visualizações',
      value: stats.total_views,
      icon: Eye,
      color: 'text-blue-600',
      bg: 'bg-blue-100'
    },
    {
      title: 'Não Abriram o Convite',
      value: stats.guests_not_viewed,
      icon: EyeOff,
      color: 'text-red-500',
      bg: 'bg-red-100'
    }
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-brand-text mb-2">Dashboard</h1>
          <p className="text-brand-text-muted">Resumo do Chá de Panela</p>
        </div>
        
        {/* Backup Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleDownloadBackup}
            disabled={backupLoading}
            variant="outline"
            className="border-brand-peach text-brand-text hover:bg-brand-peach/20"
            data-testid="download-backup-btn"
          >
            {backupLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Baixar Backup
          </Button>
          
          <input
            type="file"
            accept=".json"
            onChange={handleUploadBackup}
            ref={fileInputRef}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={restoreLoading}
            variant="outline"
            className="border-brand-orange text-brand-orange hover:bg-brand-orange/10"
            data-testid="upload-backup-btn"
          >
            {restoreLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Restaurar Backup
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="soft-shadow" data-testid={`stat-card-${index}`}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className={`p-3 rounded-full ${stat.bg}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-brand-text-muted">{stat.title}</p>
                <p className="text-3xl font-serif text-brand-text">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* View Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {viewStats.map((stat, index) => (
          <Card key={index} className="soft-shadow" data-testid={`view-stat-${index}`}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className={`p-3 rounded-full ${stat.bg}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-brand-text-muted">{stat.title}</p>
                <p className="text-3xl font-serif text-brand-text">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Reserved Gifts Table */}
      <Card className="soft-shadow">
        <CardHeader>
          <CardTitle className="font-serif text-xl text-brand-text flex items-center gap-2">
            <Gift className="h-5 w-5 text-brand-pink" />
            Presentes Reservados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.reserved_gifts_list.length === 0 ? (
            <p className="text-center py-8 text-brand-text-muted">
              Nenhum presente reservado ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-brand-text">Presente</TableHead>
                  <TableHead className="text-brand-text">Reservado por</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.reserved_gifts_list.map((item, index) => (
                  <TableRow key={index} data-testid={`reserved-gift-${index}`}>
                    <TableCell className="font-medium">{item.gift_name}</TableCell>
                    <TableCell>{item.reserved_by}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
