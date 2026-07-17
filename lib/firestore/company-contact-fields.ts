/** Maps siteFix contact fields for My Company read/write (not stored under company.*). */

export type ContactNameFields = {
  contactFirstName: string;
  contactLastName: string;
};

export function readContactNameFields(
  siteFix: Record<string, unknown> | null | undefined
): ContactNameFields {
  const data = siteFix ?? {};

  return {
    contactFirstName:
      typeof data.contactName === 'string' ? data.contactName : '',
    contactLastName:
      typeof data.contactLastName === 'string' ? data.contactLastName : '',
  };
}

export function buildContactNameUpdatePayload(
  contactFirstName: string,
  contactLastName: string
): Record<string, string> {
  return {
    'siteFix.contactName': contactFirstName.trim(),
    'siteFix.contactLastName': contactLastName.trim(),
  };
}

/** True when key belongs on siteFix, not company.* */
export function isContactNameFormField(key: string): key is keyof ContactNameFields {
  return key === 'contactFirstName' || key === 'contactLastName';
}
