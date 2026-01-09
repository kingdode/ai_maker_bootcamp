/**
 * Offers Table Component
 * Displays offers in a sortable, filterable table format
 */

'use client';

import { useState, useMemo } from 'react';
import { Offer } from '../types/offer';

interface OffersTableProps {
  offers: Offer[];
}

type SortField = 'merchant' | 'offer_value' | 'issuer' | 'card_name' | 'last_scanned_at';
type SortDirection = 'asc' | 'desc';

export default function OffersTable({ offers }: OffersTableProps) {
  const [sortField, setSortField] = useState<SortField>('last_scanned_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [issuerFilter, setIssuerFilter] = useState<string>('all');
  const [cardFilter, setCardFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');

  // Get unique card names and channels for filters
  const uniqueCards = useMemo(() => {
    const cards = new Set(offers.map(o => o.card_name));
    return Array.from(cards).sort();
  }, [offers]);

  // Filter and sort offers
  const filteredAndSortedOffers = useMemo(() => {
    let filtered = [...offers];

    // Apply filters
    if (issuerFilter !== 'all') {
      filtered = filtered.filter(o => o.issuer === issuerFilter);
    }
    if (cardFilter !== 'all') {
      filtered = filtered.filter(o => o.card_name === cardFilter);
    }
    if (channelFilter !== 'all') {
      filtered = filtered.filter(o => o.channel === channelFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'merchant':
          aValue = a.merchant.toLowerCase();
          bValue = b.merchant.toLowerCase();
          break;
        case 'offer_value':
          // Extract numeric value for comparison
          aValue = parseFloat(a.offer_value.replace(/[^0-9.]/g, '')) || 0;
          bValue = parseFloat(b.offer_value.replace(/[^0-9.]/g, '')) || 0;
          // Percentages generally rank higher
          if (a.offer_type === 'percent' && b.offer_type === 'flat') return -1;
          if (a.offer_type === 'flat' && b.offer_type === 'percent') return 1;
          break;
        case 'issuer':
          aValue = a.issuer;
          bValue = b.issuer;
          break;
        case 'card_name':
          aValue = a.card_name.toLowerCase();
          bValue = b.card_name.toLowerCase();
          break;
        case 'last_scanned_at':
          aValue = new Date(a.last_scanned_at).getTime();
          bValue = new Date(b.last_scanned_at).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [offers, sortField, sortDirection, issuerFilter, cardFilter, channelFilter]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatChannel = (channel: string) => {
    if (channel === 'in_store') return 'In-Store';
    if (channel === 'online') return 'Online';
    return 'Unknown';
  };

  const formatIssuer = (issuer: string) => {
    return issuer === 'chase' ? 'Chase' : 'Amex';
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-gray-400">↕</span>;
    return sortDirection === 'asc' ? <span>↑</span> : <span>↓</span>;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Filters */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Issuer:</label>
            <select
              value={issuerFilter}
              onChange={(e) => setIssuerFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="chase">Chase</option>
              <option value="amex">Amex</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Card:</label>
            <select
              value={cardFilter}
              onChange={(e) => setCardFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              {uniqueCards.map(card => (
                <option key={card} value={card}>{card}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Channel:</label>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="online">Online</option>
              <option value="in_store">In-Store</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th
                className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('merchant')}
              >
                <div className="flex items-center gap-2">
                  Merchant
                  <SortIcon field="merchant" />
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('offer_value')}
              >
                <div className="flex items-center gap-2">
                  Offer
                  <SortIcon field="offer_value" />
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('issuer')}
              >
                <div className="flex items-center gap-2">
                  Issuer
                  <SortIcon field="issuer" />
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('card_name')}
              >
                <div className="flex items-center gap-2">
                  Card
                  <SortIcon field="card_name" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Channel
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('last_scanned_at')}
              >
                <div className="flex items-center gap-2">
                  Last Scanned
                  <SortIcon field="last_scanned_at" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredAndSortedOffers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No offers match the current filters.
                </td>
              </tr>
            ) : (
              filteredAndSortedOffers.map((offer, index) => (
                <tr
                  key={`${offer.merchant}-${offer.card_name}-${index}`}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 max-w-xs truncate" title={offer.merchant}>
                    {offer.merchant}
                  </td>
                  <td className="px-6 py-4 text-sm text-blue-600 font-semibold">
                    {offer.offer_value}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      offer.issuer === 'chase' ? 'bg-blue-100 text-blue-800' : 'bg-indigo-100 text-indigo-800'
                    }`}>
                      {formatIssuer(offer.issuer)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate" title={offer.card_name}>
                    {offer.card_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatChannel(offer.channel)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDate(offer.last_scanned_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

