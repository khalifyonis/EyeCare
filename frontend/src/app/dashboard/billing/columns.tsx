import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2, DollarSign, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusPill, statusToVariant } from '@/components/ui/status-pill';

export type BillingStatus = 'PAID' | 'UNPAID' | 'PARTIAL' | (string & {});
export type ServiceType = 'APPOINTMENT' | 'PHARMACY' | 'OPTICAL' | 'SURGERY' | (string & {});

export interface BillingRow {
    id: string;
    serviceType: ServiceType;
    totalAmount?: number | string | null;
    discount?: number | string | null;
    finalAmount?: number | string | null;
    paymentMethod?: string | null;
    referenceNumber?: string | null;
    status?: BillingStatus | null;
    createdAt?: string | null;
    patient?: {
        id: string;
        fullName?: string | null;
        phone?: string | null;
    } | null;
    appointment?: { id: string; bookingNumber?: string | null } | null;
    surgery?: { id: string; surgeryType?: string | null } | null;
    prescription?: { id: string; itemType?: string | null } | null;
}

export interface BillingColumnsProps {
    onRecordPayment: (row: BillingRow) => void;
    onDelete: (id: string) => void;
    canManage: boolean;
}

export function getBillingColumns({
    onRecordPayment,
    onDelete,
    canManage,
}: BillingColumnsProps): ColumnDef<BillingRow>[] {
    return [
        {
            accessorKey: 'patient',
            header: 'Patient',
            cell: ({ row }) => {
                const patient = row.original.patient;
                if (!patient) return <span className="text-xs text-muted-foreground">—</span>;
                const fullName = patient.fullName || 'Unknown';
                return (
                    <Link
                        href={`/dashboard/patients/${patient.id}`}
                        className="font-medium text-sm text-foreground hover:text-[#0EA5E9]"
                    >
                        {fullName}
                    </Link>
                );
            },
        },
        {
            accessorKey: 'serviceType',
            header: 'Service',
            cell: ({ row }) => {
                const type = row.original.serviceType;
                const label = type?.replace('_', ' ') || '—';
                return <span className="text-sm capitalize">{label}</span>;
            },
        },
        {
            accessorKey: 'finalAmount',
            header: 'Amount',
            cell: ({ row }) => {
                const amount = row.original.finalAmount;
                const num = typeof amount === 'number' ? amount : parseFloat(String(amount || 0));
                return (
                    <span className="tabular-nums">
                        ${num.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                );
            },
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const status = row.original.status || 'UNPAID';
                return (
                    <StatusPill variant={statusToVariant(status)}>
                        {status}
                    </StatusPill>
                );
            },
        },
        {
            accessorKey: 'createdAt',
            header: 'Date',
            cell: ({ row }) => {
                const d = row.original.createdAt;
                if (!d) return '—';
                const date = new Date(d);
                return (
                    <span className="text-sm text-muted-foreground">
                        {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                );
            },
        },
        ...(canManage
            ? [
                  {
                      id: 'actions',
                      header: '',
                      cell: ({ row }: { row: { original: BillingRow } }) => (
                          <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreVertical className="h-4 w-4" />
                                  </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => onRecordPayment(row.original)}>
                                      <DollarSign className="mr-2 h-4 w-4" />
                                      Record payment
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() => onDelete(row.original.id)}
                                  >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                  </DropdownMenuItem>
                              </DropdownMenuContent>
                          </DropdownMenu>
                      ),
                  },
              ]
            : []),
    ];
}
