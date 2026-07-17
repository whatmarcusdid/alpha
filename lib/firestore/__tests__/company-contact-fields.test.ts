import { describe, expect, it } from 'vitest';

import {
  buildContactNameUpdatePayload,
  isContactNameFormField,
  readContactNameFields,
} from '@/lib/firestore/company-contact-fields';

describe('readContactNameFields', () => {
  it('reads contactName as contactFirstName and optional contactLastName', () => {
    expect(
      readContactNameFields({
        contactName: 'Mike',
        contactLastName: 'Johnson',
      })
    ).toEqual({
      contactFirstName: 'Mike',
      contactLastName: 'Johnson',
    });
  });

  it('returns empty strings when siteFix contact fields are missing', () => {
    expect(readContactNameFields(undefined)).toEqual({
      contactFirstName: '',
      contactLastName: '',
    });
  });
});

describe('buildContactNameUpdatePayload', () => {
  it('writes siteFix.contactName and siteFix.contactLastName', () => {
    expect(buildContactNameUpdatePayload('Mike', 'Johnson')).toEqual({
      'siteFix.contactName': 'Mike',
      'siteFix.contactLastName': 'Johnson',
    });
  });

  it('allows empty last name', () => {
    expect(buildContactNameUpdatePayload('Mike', '')).toEqual({
      'siteFix.contactName': 'Mike',
      'siteFix.contactLastName': '',
    });
  });

  it('trims whitespace', () => {
    expect(buildContactNameUpdatePayload('  Mike  ', '  ')).toEqual({
      'siteFix.contactName': 'Mike',
      'siteFix.contactLastName': '',
    });
  });
});

describe('isContactNameFormField', () => {
  it('identifies contact name form keys', () => {
    expect(isContactNameFormField('contactFirstName')).toBe(true);
    expect(isContactNameFormField('contactLastName')).toBe(true);
    expect(isContactNameFormField('legalName')).toBe(false);
  });
});
