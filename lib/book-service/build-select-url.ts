import type { ReadonlyURLSearchParams } from 'next/navigation';

export function buildSelectQueryString(
  searchParams: ReadonlyURLSearchParams | URLSearchParams
): string {
  const params = new URLSearchParams();
  const skus = searchParams.get('skus');
  const email = searchParams.get('email');

  if (skus) {
    params.set('skus', skus);
  }
  if (email) {
    params.set('email', email);
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

export function buildSelectPageHref(
  searchParams: ReadonlyURLSearchParams | URLSearchParams
): string {
  return `/book-service/select${buildSelectQueryString(searchParams)}`;
}

export function buildSelectSkuHref(
  sku: string,
  searchParams: ReadonlyURLSearchParams | URLSearchParams
): string {
  return `/book-service/select/${sku}${buildSelectQueryString(searchParams)}`;
}
