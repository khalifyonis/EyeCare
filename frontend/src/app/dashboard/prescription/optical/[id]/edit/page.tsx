'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Loader2, Save } from 'lucide-react';

type OpticalPrescription = {
  id: string;
  patient?: { id: string; fullName?: string | null; patientNumber?: string | null } | null;
  type: 'SPECTACLES' | 'CONTACT_LENS' | 'BOTH' | string;
  status: 'FILLED' | 'DISPENSED' | string;
  validityMonths?: number;
  notes?: string | null;

  odSphere?: string | null;
  odCylinder?: string | null;
  odAxis?: number | null;
  odAdd?: string | null;
  odPd?: number | null;
  odPrism?: string | null;

  osSphere?: string | null;
  osCylinder?: string | null;
  osAxis?: number | null;
  osAdd?: string | null;
  osPd?: number | null;
  osPrism?: string | null;

  lensType?: string | null;
  lensMaterial?: string | null;
  frameType?: string | null;
  coatings?: string[];
};

const LABEL_CN = 'text-xs font-semibold uppercase text-slate-500';

export default function EditPrescriptionPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [patientLabel, setPatientLabel] = useState('');
  const [type, setType] = useState('SPECTACLES');
  const [status, setStatus] = useState('FILLED');
  const [notes, setNotes] = useState('');

  const [odSphere, setOdSphere] = useState('');
  const [odCylinder, setOdCylinder] = useState('');
  const [odAxis, setOdAxis] = useState('');
  const [odAdd, setOdAdd] = useState('');
  const [odPd, setOdPd] = useState('');
  const [odPrism, setOdPrism] = useState('');

  const [osSphere, setOsSphere] = useState('');
  const [osCylinder, setOsCylinder] = useState('');
  const [osAxis, setOsAxis] = useState('');
  const [osAdd, setOsAdd] = useState('');
  const [osPd, setOsPd] = useState('');
  const [osPrism, setOsPrism] = useState('');

  const [lensType, setLensType] = useState('');
  const [lensMaterial, setLensMaterial] = useState('');
  const [frameType, setFrameType] = useState('');
  const [coatings, setCoatings] = useState('');

  useEffect(() => {
    if (!id) return;

    api
      .get(`/prescriptions/${id}`)
      .then((res) => {
        const row = res.data as OpticalPrescription;
        const name = row.patient?.fullName?.trim() || 'Unknown Patient';
        const pno = row.patient?.patientNumber || row.patient?.id || '—';
        setPatientLabel(`${name} (${pno})`);

        setType(row.type || 'SPECTACLES');
        setStatus(row.status || 'FILLED');
        setNotes(row.notes || '');

        setOdSphere(row.odSphere || '');
        setOdCylinder(row.odCylinder || '');
        setOdAxis(row.odAxis == null ? '' : String(row.odAxis));
        setOdAdd(row.odAdd || '');
        setOdPd(row.odPd == null ? '' : String(row.odPd));
        setOdPrism(row.odPrism || '');

        setOsSphere(row.osSphere || '');
        setOsCylinder(row.osCylinder || '');
        setOsAxis(row.osAxis == null ? '' : String(row.osAxis));
        setOsAdd(row.osAdd || '');
        setOsPd(row.osPd == null ? '' : String(row.osPd));
        setOsPrism(row.osPrism || '');

        setLensType(row.lensType || '');
        setLensMaterial(row.lensMaterial || '');
        setFrameType(row.frameType || '');
        setCoatings((row.coatings || []).join(', '));
      })
      .catch(() => toast.error('Failed to load prescription'))
      .finally(() => setLoading(false));
  }, [id]);

  const onSave = async () => {

    setSaving(true);
    try {
      await api.put(`/prescriptions/${id}`, {
        type,
        status,
        notes: notes || null,

        odSphere,
        odCylinder,
        odAxis: odAxis === '' ? null : Number(odAxis),
        odAdd,
        odPd: odPd === '' ? null : Number(odPd),
        odPrism,

        osSphere,
        osCylinder,
        osAxis: osAxis === '' ? null : Number(osAxis),
        osAdd,
        osPd: osPd === '' ? null : Number(osPd),
        osPrism,

        lensType,
        lensMaterial,
        frameType,
        coatings: coatings
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
      });

      toast.success('Prescription updated');
      router.push(`/dashboard/prescription/optical/${id}`);
    } catch {
      toast.error('Failed to update prescription');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-sm text-slate-500 inline-flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading...
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 p-4 sm:p-5 md:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Edit Prescription</h1>
        <p className="mt-1 text-sm text-slate-500">Update optical prescription details</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
        <div>
          <label className={LABEL_CN}>Patient</label>
          <Input value={patientLabel} disabled className="mt-1 h-11" />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={LABEL_CN}>Type</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="mt-1 h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SPECTACLES">Spectacles</SelectItem>
                <SelectItem value="CONTACT_LENS">Contact Lens</SelectItem>
                <SelectItem value="BOTH">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className={LABEL_CN}>Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1 h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="FILLED">Filled</SelectItem>
                <SelectItem value="DISPENSED">Dispensed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Input value={odSphere} onChange={(e) => setOdSphere(e.target.value)} placeholder="OD Sphere" />
          <Input value={odCylinder} onChange={(e) => setOdCylinder(e.target.value)} placeholder="OD Cylinder" />
          <Input value={odAxis} onChange={(e) => setOdAxis(e.target.value)} placeholder="OD Axis" />
          <Input value={odAdd} onChange={(e) => setOdAdd(e.target.value)} placeholder="OD Add" />
          <Input value={odPd} onChange={(e) => setOdPd(e.target.value)} placeholder="OD PD" />
          <Input value={odPrism} onChange={(e) => setOdPrism(e.target.value)} placeholder="OD Prism" />

          <Input value={osSphere} onChange={(e) => setOsSphere(e.target.value)} placeholder="OS Sphere" />
          <Input value={osCylinder} onChange={(e) => setOsCylinder(e.target.value)} placeholder="OS Cylinder" />
          <Input value={osAxis} onChange={(e) => setOsAxis(e.target.value)} placeholder="OS Axis" />
          <Input value={osAdd} onChange={(e) => setOsAdd(e.target.value)} placeholder="OS Add" />
          <Input value={osPd} onChange={(e) => setOsPd(e.target.value)} placeholder="OS PD" />
          <Input value={osPrism} onChange={(e) => setOsPrism(e.target.value)} placeholder="OS Prism" />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Input value={lensType} onChange={(e) => setLensType(e.target.value)} placeholder="Lens Type" />
          <Input value={lensMaterial} onChange={(e) => setLensMaterial(e.target.value)} placeholder="Lens Material" />
          <Input value={frameType} onChange={(e) => setFrameType(e.target.value)} placeholder="Frame Type" />
        </div>

        <div>
          <label className={LABEL_CN}>Coatings (comma separated)</label>
          <Input value={coatings} onChange={(e) => setCoatings(e.target.value)} className="mt-1 h-11" />
        </div>

        <div>
          <label className={LABEL_CN}>Notes</label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 min-h-[88px]" />
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/prescription/optical/${id}`}>Cancel</Link>
          </Button>
          <Button onClick={onSave} disabled={saving} className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
