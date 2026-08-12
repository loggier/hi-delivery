import { describe, expect, it } from 'vitest';
import { appendMapsReference, parseMapsCoordinateUrl } from '@/lib/shipping-address-url';

describe('shipping address URL helpers', () => {
  it('parses Google Maps q coordinates', () => {
    expect(parseMapsCoordinateUrl('https://maps.google.com/?q=25.786736,-100.470116')).toEqual({
      lat: 25.786736,
      lng: -100.470116,
    });
  });

  it('rejects invalid coordinate URLs', () => {
    expect(parseMapsCoordinateUrl('https://maps.google.com/?q=abc,123')).toBeNull();
    expect(parseMapsCoordinateUrl('https://maps.google.com/?q=95,-100')).toBeNull();
  });

  it('appends a labeled URL with a blank line and avoids duplicates', () => {
    const url = 'https://maps.google.com/?q=25.786736,-100.470116';
    expect(appendMapsReference('Portón negro', url)).toBe(
      `Portón negro\n\nUbicación Google Maps: ${url}`,
    );
    expect(appendMapsReference(`Portón negro\n\nUbicación Google Maps: ${url}`, url)).toBe(
      `Portón negro\n\nUbicación Google Maps: ${url}`,
    );
  });
});
