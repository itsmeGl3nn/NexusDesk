import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Link, Paper, TextField, Typography } from '@mui/material';
import { useTicketStore } from '../store/ticketStore';
import type { CreateTicketInput } from '../types/ticket';

const emptyForm: CreateTicketInput = { customerName: '', customerEmail: '', subject: '', description: '' };

export default function ContactPage() {
  const createTicket = useTicketStore((s) => s.createTicket);
  const selectTicket = useTicketStore((s) => s.selectTicket);
  const [form, setForm] = useState<CreateTicketInput>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdTicketId, setCreatedTicketId] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const input: CreateTicketInput = {
      customerName: form.customerName.trim(), customerEmail: form.customerEmail.trim(),
      subject: form.subject.trim(), description: form.description.trim(),
    };
    if (Object.values(input).some((value) => !value)) {
      setError('Please complete every field.');
      return;
    }
    setSubmitting(true);
    setError('');
    setCreatedTicketId(null);
    try {
      const ticket = await createTicket(input);
      selectTicket(ticket.ticketId);
      setCreatedTicketId(ticket.ticketId);
      setForm(emptyForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Your request could not be sent. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const setField = (field: keyof CreateTicketInput) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 900, mx: 'auto' }}>
      <Typography component="h1" variant="h5" fontWeight={700}>Contact Support</Typography>
      <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>Send a customer request and track its progress in Tickets.</Typography>
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {createdTicketId && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Request sent. <Link component={RouterLink} to="/tickets">View ticket {createdTicketId}</Link>
          </Alert>
        )}
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 3 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
            <TextField label="Customer name" name="customerName" autoComplete="name" required value={form.customerName} onChange={setField('customerName')} disabled={submitting} />
            <TextField label="Customer email" name="customerEmail" autoComplete="email" type="email" required value={form.customerEmail} onChange={setField('customerEmail')} disabled={submitting} />
          </Box>
          <TextField label="Subject" name="subject" required value={form.subject} onChange={setField('subject')} disabled={submitting} />
          <TextField label="How can we help?" name="description" required multiline minRows={5} value={form.description} onChange={setField('description')} disabled={submitting} />
          <Button type="submit" variant="contained" disabled={submitting} startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined} sx={{ justifySelf: 'start' }}>
            {submitting ? 'Sending…' : 'Send request'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
