'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { fetchWithAdminAuth } from '@/lib/admin/fetch-with-auth';
import type {
  AdminAuditLeadListItem,
  AdminClientListItem,
  AdminOrderListItem,
} from '@/lib/types/admin-linking';

const SEARCH_INPUT_CLASS =
  'min-h-[40px] w-full rounded-md border border-[rgba(111,121,122,0.4)] bg-white px-5 py-3 pl-11 text-sm leading-[1.5] tracking-[-0.14px] text-gray-950 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] focus-visible:ring-offset-2';

type DrawerKind = 'client' | 'audit' | 'order';

type Props = {
  kind: DrawerKind;
  isOpen: boolean;
  linkedId: string | null;
  onClose: () => void;
  onSelect: (id: string) => Promise<void>;
  onRemove: () => Promise<void>;
};

const drawerConfig: Record<
  DrawerKind,
  { title: string; searchPlaceholder: string; emptyMessage: string }
> = {
  client: {
    title: 'Select client account',
    searchPlaceholder: 'Search business name or site',
    emptyMessage: 'No client accounts found.',
  },
  audit: {
    title: 'Select site audit',
    searchPlaceholder: 'Search by email or site URL',
    emptyMessage: 'No site audits found.',
  },
  order: {
    title: 'Select order',
    searchPlaceholder: 'Search by order ID or email',
    emptyMessage: 'No orders found.',
  },
};

function formatListDate(isoDate: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(isoDate));
}

function formatCurrency(amount: number | null): string {
  if (amount == null) {
    return '—';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function AdminLinkingDrawer({
  kind,
  isOpen,
  linkedId,
  onClose,
  onSelect,
  onRemove,
}: Props) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [clients, setClients] = useState<AdminClientListItem[]>([]);
  const [audits, setAudits] = useState<AdminAuditLeadListItem[]>([]);
  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const config = drawerConfig[kind];

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      return;
    }

    let cancelled = false;

    async function loadList() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const endpoint =
          kind === 'client'
            ? '/api/admin/users'
            : kind === 'audit'
              ? '/api/admin/audit-leads'
              : '/api/admin/orders';

        const response = await fetchWithAdminAuth(endpoint);
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? 'Failed to load list');
        }

        if (cancelled) {
          return;
        }

        if (kind === 'client') {
          setClients(payload.data as AdminClientListItem[]);
        } else if (kind === 'audit') {
          setAudits(payload.data as AdminAuditLeadListItem[]);
        } else {
          setOrders(payload.data as AdminOrderListItem[]);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Failed to load list');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadList();

    return () => {
      cancelled = true;
    };
  }, [isOpen, kind]);

  const filteredClients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return clients;

    return clients.filter((client) => {
      const haystack =
        `${client.businessName} ${client.contactName} ${client.websiteUrl ?? ''} ${client.industry ?? ''} ${client.email}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [clients, searchQuery]);

  const filteredAudits = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return audits;

    return audits.filter((audit) => {
      const haystack =
        `${audit.displayId} ${audit.websiteUrl} ${audit.email} ${audit.businessName}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [audits, searchQuery]);

  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return orders;

    return orders.filter((order) => {
      const haystack =
        `${order.displayId} ${order.orderId} ${order.normalizedEmail} ${order.skuDescription}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [orders, searchQuery]);

  async function handleSelect(id: string) {
    setPendingId(id);
    try {
      await onSelect(id);
      onClose();
    } finally {
      setPendingId(null);
    }
  }

  async function handleRemove(id: string) {
    setPendingId(id);
    try {
      await onRemove();
      onClose();
    } finally {
      setPendingId(null);
    }
  }

  return (
    <AdminDrawer isOpen={isOpen} title={config.title} onClose={onClose}>
      <div className="relative mb-4">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500"
          aria-hidden="true"
        />
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={config.searchPlaceholder}
          className={SEARCH_INPUT_CLASS}
        />
      </div>

      {isLoading && <p className="text-sm text-zinc-600">Loading…</p>}
      {loadError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{loadError}</p>}

      {!isLoading && !loadError && kind === 'client' && (
        <ul className="flex flex-col gap-3">
          {filteredClients.length === 0 ? (
            <li className="text-sm text-zinc-600">{config.emptyMessage}</li>
          ) : (
            filteredClients.map((client) => {
              const isLinked = linkedId === client.userId;

              return (
                <li
                  key={client.userId}
                  className="flex items-start gap-3 rounded-md border border-gray-200 p-3"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-sm font-semibold text-gray-700">
                    {client.businessName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-[1.35] text-gray-950">{client.businessName}</p>
                    <p className="text-sm leading-[1.35] text-zinc-600">
                      {[client.contactName, client.websiteUrl, client.industry]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  {isLinked ? (
                    <button
                      type="button"
                      disabled={pendingId === client.userId}
                      onClick={() => handleRemove(client.userId)}
                      className="shrink-0 text-sm font-semibold uppercase text-zinc-400 hover:text-zinc-600"
                    >
                      — Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={pendingId === client.userId}
                      onClick={() => handleSelect(client.userId)}
                      className="shrink-0 text-sm font-semibold uppercase text-[#1D4ED8] hover:underline"
                    >
                      Select
                    </button>
                  )}
                </li>
              );
            })
          )}
        </ul>
      )}

      {!isLoading && !loadError && kind === 'audit' && (
        <ul className="flex flex-col gap-3">
          {filteredAudits.length === 0 ? (
            <li className="text-sm text-zinc-600">{config.emptyMessage}</li>
          ) : (
            filteredAudits.map((audit) => {
              const isLinked = linkedId === audit.auditLeadId;

              return (
                <li
                  key={audit.auditLeadId}
                  className="flex items-start gap-3 rounded-md border border-gray-200 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-[1.35] text-gray-950">{audit.displayId}</p>
                    <p className="text-sm leading-[1.35] text-zinc-600">
                      {audit.websiteUrl} · {audit.email}
                    </p>
                    <p className="text-sm text-zinc-500">{formatListDate(audit.timestamp)}</p>
                  </div>
                  {isLinked ? (
                    <button
                      type="button"
                      disabled={pendingId === audit.auditLeadId}
                      onClick={() => handleRemove(audit.auditLeadId)}
                      className="shrink-0 text-sm font-semibold uppercase text-zinc-400 hover:text-zinc-600"
                    >
                      — Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={pendingId === audit.auditLeadId}
                      onClick={() => handleSelect(audit.auditLeadId)}
                      className="shrink-0 text-sm font-semibold uppercase text-[#1D4ED8] hover:underline"
                    >
                      Select
                    </button>
                  )}
                </li>
              );
            })
          )}
        </ul>
      )}

      {!isLoading && !loadError && kind === 'order' && (
        <ul className="flex flex-col gap-3">
          {filteredOrders.length === 0 ? (
            <li className="text-sm text-zinc-600">{config.emptyMessage}</li>
          ) : (
            filteredOrders.map((order) => {
              const isLinked = linkedId === order.orderId;

              return (
                <li
                  key={order.orderId}
                  className="flex items-start gap-3 rounded-md border border-gray-200 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-[1.35] text-gray-950">#{order.displayId}</p>
                    <p className="text-sm leading-[1.35] text-zinc-600">
                      {order.skuDescription} · {formatCurrency(order.amount)} ·{' '}
                      {formatListDate(order.timestamp)}
                    </p>
                  </div>
                  {isLinked ? (
                    <button
                      type="button"
                      disabled={pendingId === order.orderId}
                      onClick={() => handleRemove(order.orderId)}
                      className="shrink-0 text-sm font-semibold uppercase text-zinc-400 hover:text-zinc-600"
                    >
                      — Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={pendingId === order.orderId}
                      onClick={() => handleSelect(order.orderId)}
                      className="shrink-0 text-sm font-semibold uppercase text-[#1D4ED8] hover:underline"
                    >
                      Select
                    </button>
                  )}
                </li>
              );
            })
          )}
        </ul>
      )}
    </AdminDrawer>
  );
}
