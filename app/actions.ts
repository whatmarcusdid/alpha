'use server';

import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
});

export async function signIn(prevState: any, formData: FormData) {
  const validatedFields = schema.safeParse({
    email: formData.get('email'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: null,
    };
  }

  // For now, we'll just simulate a successful sign-in
  // In a real app, you would handle authentication here
  if (validatedFields.data.email === 'test@example.com') {
    return { message: 'Sign-in successful!', errors: {} };
  } else {
    return {
      message: 'Invalid email or password',
      errors: {},
    };
  }
}
