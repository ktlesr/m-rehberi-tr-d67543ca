import { format } from 'date-fns';
import { CircleCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import {
  contactSchema,
  type ContactErrors,
  type ContactForm,
} from '../lib/contactSchema';

const empty = {
  name: '',
  email: '',
  topic: '',
  callbackDate: format(new Date(), 'yyyy-MM-dd'),
  message: '',
};

const inputClass =
  'mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none';

export default function ContactPage() {
  const [values, setValues] = useState(empty);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [sent, setSent] = useState<ContactForm | null>(null);

  function update(field: keyof typeof empty, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = contactSchema.safeParse(values);
    if (!result.success) {
      const next: ContactErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof ContactForm;
        next[field] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setSent(result.data);
  }

  if (sent) {
    return (
      <div className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-4">
        <CircleCheck className="h-5 w-5 text-emerald-700" aria-hidden />
        <p>
          Thanks, {sent.name}. We will get back to you on{' '}
          {format(new Date(sent.callbackDate), 'EEEE d MMMM')}.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-lg space-y-4">
      <h1 className="text-2xl font-bold">Contact us</h1>

      <label className="block text-sm font-medium">
        Name
        <input
          className={inputClass}
          value={values.name}
          onChange={(e) => update('name', e.target.value)}
        />
        {errors.name && <span className="text-xs text-red-700">{errors.name}</span>}
      </label>

      <label className="block text-sm font-medium">
        Email
        <input
          type="email"
          className={inputClass}
          value={values.email}
          onChange={(e) => update('email', e.target.value)}
        />
        {errors.email && <span className="text-xs text-red-700">{errors.email}</span>}
      </label>

      <label className="block text-sm font-medium">
        Topic
        <select
          className={inputClass}
          value={values.topic}
          onChange={(e) => update('topic', e.target.value)}
        >
          <option value="">Choose one</option>
          <option value="feedback">Feedback</option>
          <option value="bug">Something is broken</option>
          <option value="other">Something else</option>
        </select>
        {errors.topic && <span className="text-xs text-red-700">{errors.topic}</span>}
      </label>

      <label className="block text-sm font-medium">
        Call me back on
        <input
          type="date"
          className={inputClass}
          value={values.callbackDate}
          onChange={(e) => update('callbackDate', e.target.value)}
        />
        {errors.callbackDate && (
          <span className="text-xs text-red-700">{errors.callbackDate}</span>
        )}
      </label>

      <label className="block text-sm font-medium">
        Message
        <textarea
          rows={5}
          className={inputClass}
          value={values.message}
          onChange={(e) => update('message', e.target.value)}
        />
        {errors.message && <span className="text-xs text-red-700">{errors.message}</span>}
      </label>

      <button
        type="submit"
        className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
      >
        Send
      </button>
    </form>
  );
}
