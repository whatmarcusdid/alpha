'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import type { User } from 'firebase/auth';
import { onAuthStateChange } from '@/lib/auth';
import { getSitesForUser } from '@/lib/firestore/sites';
import { Site } from '@/types';
import { GlobeAltIcon } from '@heroicons/react/24/outline';
import { updateSiteThumbnail } from '@/lib/firestore/updateSiteThumbnail';
import { PageCard } from '@/components/layout/PageCard';

export default function SitesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchThumbnail = useCallback(async (site: Site) => {
    if (site.status !== 'active' || site.thumbnailUrl) {
      return;
    }

    try {
      const response = await fetch('/api/get-og-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: site.url }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.ogImageUrl) {
        await updateSiteThumbnail(site.id, data.ogImageUrl);

        setSites(currentSites =>
          currentSites.map(s =>
            s.id === site.id ? { ...s, thumbnailUrl: data.ogImageUrl } : s
          )
        );
      }
    } catch (error) {
      console.error(`Failed to fetch thumbnail for ${site.name}:`, error);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChange((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function fetchSites() {
      if (user) {
        try {
          const userSites = await getSitesForUser(user.uid);
          setSites(userSites);
        } catch (error) {
          console.error('Error fetching sites:', error);
          setSites([]);
        } finally {
          setLoading(false);
        }
      } else if (user === null) {
        setLoading(false);
        setSites([]);
      }
    }

    fetchSites();
  }, [user]);

  useEffect(() => {
    if (sites.length > 0) {
      sites.forEach(site => {
        if (site.status === 'active' && !site.thumbnailUrl) {
          fetchThumbnail(site);
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sites]);

  return (
    <main className="max-w-[1440px] mx-auto px-0 py-8">
      <PageCard>
        <h1 className="text-2xl font-semibold text-gray-900 mb-8">Sites</h1>
        {
          loading ? (
            <div className="flex justify-center items-center h-48">Loading your sites...</div>
          ) : sites.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sites.map((site) => (
                <div 
                  key={site.id}
                  onClick={() => {
                    if (site.status === 'active') {
                      const url = site.url.startsWith('http') ? site.url : `https://${site.url}`;
                      window.open(url, '_blank');
                    }
                  }}
                  className={`bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden group relative ${site.status === 'active' ? 'cursor-pointer hover:shadow-md transition-shadow' : 'cursor-default'}`}>
                  <div className="aspect-[16/10] bg-gray-100 flex items-center justify-center">
                    {site.thumbnailUrl ? (
                      <img src={site.thumbnailUrl} alt={`Thumbnail for ${site.name}`} className="w-full h-full object-cover" />
                    ) : (
                      <GlobeAltIcon className="h-12 w-12 text-gray-400" />
                    )}
                  </div>
                  {site.status === 'provisioning' && (
                    <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-800 text-xs font-semibold px-2 py-1 rounded-full">
                      Building...
                    </div>
                  )}
                  <div className="p-4">
                    <p className="text-lg font-semibold text-gray-900 truncate">{site.name}</p>
                    <p className="text-sm text-gray-500 capitalize">{site.type.replace('_', ' ')}</p>
                    <p className="text-sm text-gray-600 truncate mt-1">{site.url}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 px-4 border-2 border-dashed border-gray-200 rounded-lg">
              <GlobeAltIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h2 className="mt-4 text-lg font-semibold text-gray-900">No Websites Added</h2>
              <p className="mt-2 max-w-md mx-auto text-sm text-gray-500">
                No websites have been added to your plan. Get started with one of our packages in order to add your website to the dashboard.
              </p>
              <div className="mt-6">
                <Link href="/dashboard/products">
                  <span className="px-6 py-2 rounded-full bg-[#9be382] hover:bg-[#8dd370] text-[#232521] font-semibold transition-colors">
                    Go To Products
                  </span>
                </Link>
              </div>
            </div>
          )
        }
      </PageCard>
    </main>
  );
}
