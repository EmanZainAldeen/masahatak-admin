import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box, Card, CardContent, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TablePagination, IconButton,
  Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Select, MenuItem, FormControl, InputLabel, TextField, CircularProgress,
  Alert, Tooltip, Grid, Switch, FormControlLabel, Divider, Paper,
  Checkbox, Stack
} from '@mui/material';
import {
  Visibility, CheckCircle, Cancel, Delete, FilterList,
  MeetingRoom, LocationOn, Add, Edit, Close, AddCircleOutline,
  RemoveCircleOutline
} from '@mui/icons-material';
import api from '../utils/api';
import MainLayout from '../components/Layout/MainLayout';

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_LABELS = { sun: 'Sunday', mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday' };
const PRICE_UNITS = ['day', 'week', 'month'];
const DEFAULT_AMENITIES = [
  { id: 'a1', name: 'WiFi' }, { id: 'a2', name: 'Electricity' },
  { id: 'a3', name: 'Meeting Room' }, { id: 'a4', name: 'Coffee' },
  { id: 'a5', name: 'Parking' }, { id: 'a6', name: 'Printer' },
];

const emptyForm = () => ({
  spaceName: '', address: '', description: '',
  basePriceValue: '', basePriceUnit: 'day',
  totalSeats: '', hidden: false,
  adminId: '', adminName: '',
  workingHours: DAYS.map((day, i) => ({ day, open: '08:00', close: '22:00', closed: i >= 5 })),
  amenities: DEFAULT_AMENITIES.map(a => ({ ...a, selected: false, isCustom: false })),
  images: [],
  policySections: [],
});

const formFromWorkspace = (ws) => ({
  spaceName: ws.spaceName || ws.name || '',
  address: ws.address || '',
  description: ws.description || '',
  basePriceValue: ws.basePriceValue || '',
  basePriceUnit: ws.basePriceUnit || 'day',
  totalSeats: ws.totalSeats || '',
  hidden: ws.hidden || false,
  adminId: ws.adminId || '',
  adminName: ws.adminName || '',
  workingHours: ws.workingHours?.length
    ? ws.workingHours
    : DAYS.map((day, i) => ({ day, open: '08:00', close: '22:00', closed: i >= 5 })),
  amenities: (() => {
    const existing = ws.amenities || [];
    const selectedIds = existing.filter(a => a.selected !== false).map(a => a.id || a.name);
    const base = DEFAULT_AMENITIES.map(a => ({
      ...a,
      selected: existing.some(e => (e.id === a.id || e.name === a.name) && e.selected !== false),
      isCustom: false,
    }));
    const custom = existing.filter(a => a.isCustom).map(a => ({ ...a, selected: true }));
    return [...base, ...custom.filter(c => !base.some(b => b.id === c.id))];
  })(),
  images: ws.images || [],
  policySections: ws.policySections || [],
});

const Workspaces = () => {
  const { t } = useTranslation();
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalWorkspaces, setTotalWorkspaces] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [actionDialog, setActionDialog] = useState({ open: false, type: '', reason: '' });
  const [workspaceDetails, setWorkspaceDetails] = useState(null);
  const [adminNames, setAdminNames] = useState({});
  const [subAdmins, setSubAdmins] = useState([]);

  // Add/Edit state
  const [editDialog, setEditDialog] = useState(false);
  const [editId, setEditId] = useState(null); // null = create
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newAmenityName, setNewAmenityName] = useState('');

  useEffect(() => { fetchWorkspaces(); }, [page, rowsPerPage, statusFilter]); // eslint-disable-line
  useEffect(() => { fetchSubAdmins(); }, []);

  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      const response = await api.get('/workspaces', { params: { page: page + 1, limit: rowsPerPage, status: statusFilter } });
      setWorkspaces(response.data.workspaces);
      setTotalWorkspaces(response.data.pagination.total);
    } catch (err) {
      setError('Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubAdmins = async () => {
    try {
      const res = await api.get('/workspaces/sub-admins');
      setSubAdmins(res.data.subAdmins || []);
    } catch (_) {}
  };

  const fetchWorkspaceDetails = async (workspaceId) => {
    try {
      const response = await api.get(`/workspaces/${workspaceId}`);
      setWorkspaceDetails(response.data);
      setDetailsDialog(true);
      const workspace = response.data.workspace;
      if (workspace.reviewedBy) fetchAdminName(workspace.reviewedBy);
      if (workspace.deletedBy) fetchAdminName(workspace.deletedBy);
    } catch (err) {
      setError('Failed to load workspace details');
    }
  };

  const fetchAdminName = async (adminId) => {
    if (!adminId || adminNames[adminId]) return;
    try {
      const response = await api.get(`/superadmin/admins/${adminId}`);
      const name = response.data.admin.fullName || 'Unknown Admin';
      setAdminNames(prev => ({ ...prev, [adminId]: name }));
    } catch (_) {}
  };

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm());
    setNewImageUrl('');
    setEditDialog(true);
  };

  const openEdit = (ws) => {
    setEditId(ws.id);
    setForm(formFromWorkspace(ws));
    setNewImageUrl('');
    setEditDialog(true);
  };

  const handleSave = async () => {
    if (!form.spaceName.trim()) { setError('Space name is required'); return; }
    if (!form.address.trim()) { setError('Address is required'); return; }
    if (!form.basePriceValue || parseFloat(form.basePriceValue) <= 0) { setError('Base price must be greater than 0'); return; }

    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        basePriceValue: parseFloat(form.basePriceValue) || 0,
        totalSeats: parseInt(form.totalSeats) || 0,
      };

      if (editId) {
        await api.put(`/workspaces/${editId}`, payload);
        setSuccess('Space updated successfully');
      } else {
        await api.post('/workspaces', payload);
        setSuccess('Space created successfully');
      }
      setEditDialog(false);
      fetchWorkspaces();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save space');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenActionDialog = (workspace, type) => {
    setSelectedWorkspace(workspace);
    setActionDialog({ open: true, type, reason: '' });
  };
  const handleCloseActionDialog = () => { setActionDialog({ open: false, type: '', reason: '' }); setSelectedWorkspace(null); };

  const handleAction = async () => {
    try {
      if (actionDialog.type === 'delete') {
        await api.delete(`/workspaces/${selectedWorkspace.id}`, { data: { reason: actionDialog.reason } });
      } else {
        await api.put(`/workspaces/${selectedWorkspace.id}/status`, { status: actionDialog.type, rejectionReason: actionDialog.reason });
      }
      handleCloseActionDialog();
      fetchWorkspaces();
    } catch (err) {
      setError(`Failed to ${actionDialog.type} workspace`);
    }
  };

  const getStatusColor = (status) => ({ active: 'success', pending: 'warning', rejected: 'error', deleted: 'default' }[status] || 'default');

  // Form helpers
  const setField = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const updateHour = (day, key, value) => setForm(f => ({
    ...f,
    workingHours: f.workingHours.map(h => h.day === day ? { ...h, [key]: value } : h),
  }));

  const toggleAmenity = (id) => setForm(f => ({
    ...f,
    amenities: f.amenities.map(a => a.id === id ? { ...a, selected: !a.selected } : a),
  }));

  const addCustomAmenity = () => {
    const name = newAmenityName.trim();
    if (!name) return;
    const id = `custom_${Date.now()}`;
    setForm(f => ({ ...f, amenities: [...f.amenities, { id, name, selected: true, isCustom: true }] }));
    setNewAmenityName('');
  };

  const addImage = () => {
    const url = newImageUrl.trim();
    if (!url) return;
    setForm(f => ({ ...f, images: [...f.images, url] }));
    setNewImageUrl('');
  };

  const removeImage = (i) => setForm(f => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }));

  const addPolicySection = () => setForm(f => ({
    ...f,
    policySections: [...f.policySections, { id: `sec_${Date.now()}`, title: '', bullets: [''] }],
  }));

  const removePolicySection = (id) => setForm(f => ({
    ...f,
    policySections: f.policySections.filter(s => s.id !== id),
  }));

  const updateSectionTitle = (id, title) => setForm(f => ({
    ...f,
    policySections: f.policySections.map(s => s.id === id ? { ...s, title } : s),
  }));

  const addBullet = (id) => setForm(f => ({
    ...f,
    policySections: f.policySections.map(s => s.id === id ? { ...s, bullets: [...s.bullets, ''] } : s),
  }));

  const updateBullet = (id, idx, text) => setForm(f => ({
    ...f,
    policySections: f.policySections.map(s => s.id === id ? { ...s, bullets: s.bullets.map((b, i) => i === idx ? text : b) } : s),
  }));

  const removeBullet = (id, idx) => setForm(f => ({
    ...f,
    policySections: f.policySections.map(s => s.id === id ? { ...s, bullets: s.bullets.filter((_, i) => i !== idx) } : s),
  }));

  return (
    <MainLayout>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>{t('workspaces.title')}</Typography>
          <Typography variant="body1" color="text.secondary">{t('workspaces.subtitle')}</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate} sx={{ mt: 1 }}>
          Add Space
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Card elevation={2}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>{t('workspaces.filterStatus')}</InputLabel>
              <Select value={statusFilter} label={t('workspaces.filterStatus')} onChange={(e) => setStatusFilter(e.target.value)} startAdornment={<FilterList sx={{ mr: 1, ml: 1 }} />}>
                <MenuItem value="all">{t('workspaces.allSpaces')}</MenuItem>
                <MenuItem value="active">{t('common.active')}</MenuItem>
                <MenuItem value="pending">{t('workspaces.pendingApproval')}</MenuItem>
                <MenuItem value="rejected">{t('common.rejected')}</MenuItem>
                <MenuItem value="deleted">{t('common.deleted')}</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('workspaces.spaceName')}</TableCell>
                  <TableCell>{t('workspaces.location')}</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Seats</TableCell>
                  <TableCell>{t('common.status')}</TableCell>
                  <TableCell align="center">{t('common.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}><CircularProgress /></TableCell></TableRow>
                ) : workspaces.length === 0 ? (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}><Typography color="text.secondary">{t('workspaces.noWorkspaces')}</Typography></TableCell></TableRow>
                ) : (
                  workspaces.map((workspace) => (
                    <TableRow key={workspace.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <MeetingRoom color="primary" />
                          {workspace.spaceName || workspace.name}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <LocationOn fontSize="small" color="action" />
                          {workspace.address || workspace.location?.city || 'N/A'}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {workspace.basePriceValue ? `$${workspace.basePriceValue}/${workspace.basePriceUnit || 'day'}` : (workspace.pricePerHour ? `$${workspace.pricePerHour}/hr` : 'N/A')}
                      </TableCell>
                      <TableCell>{workspace.totalSeats || workspace.capacity || 'N/A'}</TableCell>
                      <TableCell>
                        <Chip label={workspace.status || 'pending'} color={getStatusColor(workspace.status)} size="small" />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title={t('common.viewDetails')}>
                          <IconButton size="small" color="primary" onClick={() => fetchWorkspaceDetails(workspace.id)}>
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton size="small" color="info" onClick={() => openEdit(workspace)}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {workspace.status === 'pending' && (
                          <>
                            <Tooltip title={t('workspaces.approve')}>
                              <IconButton size="small" color="success" onClick={() => handleOpenActionDialog(workspace, 'active')}><CheckCircle fontSize="small" /></IconButton>
                            </Tooltip>
                            <Tooltip title={t('workspaces.reject')}>
                              <IconButton size="small" color="error" onClick={() => handleOpenActionDialog(workspace, 'rejected')}><Cancel fontSize="small" /></IconButton>
                            </Tooltip>
                          </>
                        )}
                        {workspace.status !== 'deleted' && (
                          <Tooltip title={t('common.delete')}>
                            <IconButton size="small" color="error" onClick={() => handleOpenActionDialog(workspace, 'delete')}><Delete fontSize="small" /></IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={totalWorkspaces}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </CardContent>
      </Card>

      {/* ============ ADD / EDIT DIALOG ============ */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="md" fullWidth scroll="paper">
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight="bold">{editId ? 'Edit Space' : 'Add New Space'}</Typography>
          <IconButton onClick={() => setEditDialog(false)}><Close /></IconButton>
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={3}>

            {/* Basic Info */}
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Basic Info</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField fullWidth label="Space Name *" value={form.spaceName} onChange={e => setField('spaceName', e.target.value)} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="Address *" value={form.address} onChange={e => setField('address', e.target.value)} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth multiline rows={3} label="Description" value={form.description} onChange={e => setField('description', e.target.value)} />
                </Grid>
              </Grid>
            </Box>

            <Divider />

            {/* Pricing & Settings */}
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Pricing & Settings</Typography>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={6} sm={4}>
                  <TextField fullWidth label="Base Price *" type="number" value={form.basePriceValue} onChange={e => setField('basePriceValue', e.target.value)} inputProps={{ min: 0, step: 0.01 }} />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <FormControl fullWidth>
                    <InputLabel>Price Unit</InputLabel>
                    <Select value={form.basePriceUnit} label="Price Unit" onChange={e => setField('basePriceUnit', e.target.value)}>
                      {PRICE_UNITS.map(u => <MenuItem key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <TextField fullWidth label="Total Seats" type="number" value={form.totalSeats} onChange={e => setField('totalSeats', e.target.value)} inputProps={{ min: 0 }} />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Switch checked={form.hidden} onChange={e => setField('hidden', e.target.checked)} color="primary" />}
                    label={`Availability: ${form.hidden ? 'Hidden' : 'Visible'}`}
                  />
                </Grid>
                {subAdmins.length > 0 && (
                  <Grid item xs={12} sm={8}>
                    <FormControl fullWidth>
                      <InputLabel>Space Admin (Sub Admin)</InputLabel>
                      <Select
                        value={form.adminId}
                        label="Space Admin (Sub Admin)"
                        onChange={e => {
                          const selected = subAdmins.find(s => s.id === e.target.value);
                          setField('adminId', e.target.value);
                          setField('adminName', selected?.fullName || '');
                        }}
                      >
                        <MenuItem value=""><em>None</em></MenuItem>
                        {subAdmins.map(s => <MenuItem key={s.id} value={s.id}>{s.fullName} ({s.email})</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                )}
              </Grid>
            </Box>

            <Divider />

            {/* Working Hours */}
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Working Hours</Typography>
              <Stack spacing={1}>
                {form.workingHours.map(h => (
                  <Paper key={h.day} variant="outlined" sx={{ p: 1.5 }}>
                    <Grid container spacing={1} alignItems="center">
                      <Grid item xs={3} sm={2}>
                        <FormControlLabel
                          control={<Checkbox checked={!h.closed} onChange={e => updateHour(h.day, 'closed', !e.target.checked)} size="small" />}
                          label={<Typography variant="body2" fontWeight="500">{DAY_LABELS[h.day]}</Typography>}
                        />
                      </Grid>
                      {!h.closed && (
                        <>
                          <Grid item xs={4} sm={3}>
                            <TextField size="small" label="Open" type="time" value={h.open} onChange={e => updateHour(h.day, 'open', e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
                          </Grid>
                          <Grid item xs={4} sm={3}>
                            <TextField size="small" label="Close" type="time" value={h.close} onChange={e => updateHour(h.day, 'close', e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
                          </Grid>
                        </>
                      )}
                      {h.closed && (
                        <Grid item xs={8} sm={6}>
                          <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>Closed</Typography>
                        </Grid>
                      )}
                    </Grid>
                  </Paper>
                ))}
              </Stack>
            </Box>

            <Divider />

            {/* Amenities */}
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Amenities</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {form.amenities.map(a => (
                  <Chip
                    key={a.id}
                    label={a.name}
                    clickable
                    color={a.selected ? 'primary' : 'default'}
                    variant={a.selected ? 'filled' : 'outlined'}
                    onClick={() => toggleAmenity(a.id)}
                    onDelete={a.isCustom ? () => setForm(f => ({ ...f, amenities: f.amenities.filter(x => x.id !== a.id) })) : undefined}
                  />
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField size="small" label="Add custom amenity" value={newAmenityName} onChange={e => setNewAmenityName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCustomAmenity()} />
                <Button variant="outlined" size="small" onClick={addCustomAmenity} startIcon={<Add />}>Add</Button>
              </Box>
            </Box>

            <Divider />

            {/* Images */}
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Images</Typography>
              <Stack spacing={1} sx={{ mb: 1 }}>
                {form.images.map((url, i) => (
                  <Paper key={i} variant="outlined" sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                      <Box component="img" src={url} alt="" sx={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 1 }} onError={e => { e.target.style.display = 'none'; }} />
                    )}
                    <Typography variant="body2" sx={{ flex: 1, wordBreak: 'break-all' }}>{url}</Typography>
                    <IconButton size="small" color="error" onClick={() => removeImage(i)}><RemoveCircleOutline fontSize="small" /></IconButton>
                  </Paper>
                ))}
              </Stack>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField size="small" fullWidth label="Image URL" value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && addImage()} />
                <Button variant="outlined" size="small" onClick={addImage} startIcon={<Add />}>Add</Button>
              </Box>
            </Box>

            <Divider />

            {/* Policy Sections */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold">Policy Sections</Typography>
                <Button size="small" startIcon={<AddCircleOutline />} onClick={addPolicySection}>Add Section</Button>
              </Box>
              <Stack spacing={2}>
                {form.policySections.map((section) => (
                  <Paper key={section.id} variant="outlined" sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <TextField size="small" fullWidth label="Section Title" value={section.title} onChange={e => updateSectionTitle(section.id, e.target.value)} />
                      <IconButton size="small" color="error" onClick={() => removePolicySection(section.id)}><RemoveCircleOutline /></IconButton>
                    </Box>
                    <Stack spacing={1} sx={{ pl: 2 }}>
                      {section.bullets.map((bullet, idx) => (
                        <Box key={idx} sx={{ display: 'flex', gap: 1 }}>
                          <TextField size="small" fullWidth label={`Bullet ${idx + 1}`} value={bullet} onChange={e => updateBullet(section.id, idx, e.target.value)} />
                          <IconButton size="small" color="error" onClick={() => removeBullet(section.id, idx)}><RemoveCircleOutline fontSize="small" /></IconButton>
                        </Box>
                      ))}
                      <Button size="small" startIcon={<Add />} onClick={() => addBullet(section.id)} sx={{ alignSelf: 'flex-start' }}>Add Bullet</Button>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Box>

          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setEditDialog(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : (editId ? 'Save Changes' : 'Create Space')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailsDialog} onClose={() => setDetailsDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MeetingRoom color="primary" />
            {t('workspaces.workspaceDetails')}
          </Box>
        </DialogTitle>
        <DialogContent>
          {workspaceDetails && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="h6">{workspaceDetails.workspace.spaceName || workspaceDetails.workspace.name}</Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>{workspaceDetails.workspace.description}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Address</Typography>
                <Typography variant="body1" gutterBottom>{workspaceDetails.workspace.address || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Price</Typography>
                <Typography variant="body1" gutterBottom>
                  {workspaceDetails.workspace.basePriceValue
                    ? `$${workspaceDetails.workspace.basePriceValue}/${workspaceDetails.workspace.basePriceUnit}`
                    : `$${workspaceDetails.workspace.pricePerHour || 0}/hr`}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Total Seats</Typography>
                <Typography variant="body1" gutterBottom>{workspaceDetails.workspace.totalSeats || workspaceDetails.workspace.capacity || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Space Admin</Typography>
                <Typography variant="body1" gutterBottom>{workspaceDetails.workspace.adminName || 'None'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">{t('workspaces.amenities')}</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                  {(workspaceDetails.workspace.amenities || [])
                    .filter(a => a.selected !== false)
                    .map((amenity, index) => (
                      <Chip key={index} label={amenity.name || amenity} size="small" />
                    ))}
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">{t('workspaces.recentBookings')}</Typography>
                <Typography variant="body2">{workspaceDetails.recentBookings?.length || 0} {t('common.booking')}</Typography>
              </Grid>
              {workspaceDetails.workspace.status === 'rejected' && workspaceDetails.workspace.statusReason && (
                <Grid item xs={12}>
                  <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                    <Typography variant="subtitle2" color="text.secondary">{t('workspaces.rejectionReason')}</Typography>
                    <Typography variant="body1" fontWeight="bold">{workspaceDetails.workspace.statusReason}</Typography>
                  </Box>
                </Grid>
              )}
              {workspaceDetails.workspace.status === 'deleted' && (
                <>
                  {workspaceDetails.workspace.statusReason && (
                    <Grid item xs={12}>
                      <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                        <Typography variant="subtitle2" color="text.secondary">{t('workspaces.deletionReason')}</Typography>
                        <Typography variant="body1" fontWeight="bold">{workspaceDetails.workspace.statusReason}</Typography>
                      </Box>
                    </Grid>
                  )}
                </>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          {workspaceDetails && (
            <Button onClick={() => { setDetailsDialog(false); openEdit(workspaceDetails.workspace); }} startIcon={<Edit />} color="primary">
              Edit
            </Button>
          )}
          <Button onClick={() => setDetailsDialog(false)}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={actionDialog.open} onClose={handleCloseActionDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {actionDialog.type === 'delete' ? t('workspaces.deleteWorkspace') : actionDialog.type === 'active' ? t('workspaces.approveWorkspace') : t('workspaces.rejectWorkspace')}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {t('common.confirm')} "{selectedWorkspace?.spaceName || selectedWorkspace?.name}"?
          </Typography>
          {(actionDialog.type === 'rejected' || actionDialog.type === 'delete') && (
            <TextField
              fullWidth multiline rows={3}
              label={actionDialog.type === 'rejected' ? t('workspaces.rejectionReason') : t('workspaces.deletionReason')}
              value={actionDialog.reason}
              onChange={(e) => setActionDialog({ ...actionDialog, reason: e.target.value })}
              required={actionDialog.type === 'rejected'}
              margin="normal"
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseActionDialog}>{t('common.cancel')}</Button>
          <Button onClick={handleAction} variant="contained" color={actionDialog.type === 'delete' || actionDialog.type === 'rejected' ? 'error' : 'primary'}>
            {t('common.confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
};

export default Workspaces;
