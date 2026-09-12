import { isBefore, isValid, parseISO, startOfToday } from 'date-fns';
import { z } from 'zod';

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Tell us your name.'),
  email: z.email('Enter a valid email address.'),
  topic: z.enum(['feedback', 'bug', 'other'], { message: 'Pick a topic.' }),
  callbackDate: z
    .string()
    .refine((value) => isValid(parseISO(value)), 'Pick a date.')
    .refine(
      (value) => !isBefore(parseISO(value), startOfToday()),
      'The date cannot be in the past.',
    ),
  message: z
    .string()
    .trim()
    .min(20, 'Give us a little more detail — at least 20 characters.')
    .max(1000, 'Keep it under 1000 characters.'),
});

export type ContactForm = z.infer<typeof contactSchema>;
export type ContactErrors = Partial<Record<keyof ContactForm, string>>;
