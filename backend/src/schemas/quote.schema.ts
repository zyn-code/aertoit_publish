import { z } from 'zod';

/**
 * Accepts French numbers in the shapes people actually type:
 *   0146639959 · 01 46 63 99 59 · 01.46.63.99.59 · +33 1 46 63 99 59
 */
const FRENCH_PHONE = /^(?:(?:\+|00)33[\s.-]?(?:\(0\)[\s.-]?)?|0)[1-9](?:[\s.-]?\d{2}){4}$/;

/**
 * Two shapes share one endpoint:
 *
 *  - `full`     — the contact page form: service, name, phone, e-mail, commune.
 *  - `callback` — the short "Demande de Devis Rapide" block on service pages,
 *                 which only asks to be called back, so e-mail and commune are
 *                 not collected and must not be demanded.
 *
 * Both still require explicit RGPD consent.
 */
export const quoteRequestSchema = z.object({
  serviceSlug: z
    .string()
    .min(1, 'Veuillez sélectionner un service.')
    .max(120),

  fullName: z
    .string()
    .trim()
    .min(2, 'Veuillez saisir votre nom complet.')
    .max(200),

  phone: z
    .string()
    .trim()
    .regex(FRENCH_PHONE, 'Veuillez saisir un numéro de téléphone valide.'),

  /** Which form produced this; decides whether e-mail and commune are required. */
  requestType: z.enum(['full', 'callback']).default('full'),

  // Optional at field level, then required for `full` by the refinement below.
  // Declaring them required here would reject every callback outright.
  email: z
    .email('Veuillez saisir une adresse e-mail valide.')
    .max(255)
    .optional(),

  commune: z
    .string()
    .trim()
    .min(2, 'Veuillez saisir le nom de votre commune.')
    .max(160)
    .optional(),

  message: z.string().trim().max(4000).optional(),

  /**
   * RGPD art. 13 — the submission is rejected without explicit consent, and
   * the value is persisted as the audit trail.
   */
  consentGiven: z.literal(true, {
    message: 'Vous devez accepter la politique de confidentialité.',
  }),

  sourcePage: z.string().max(255).optional(),

  /**
   * Honeypot. Real users never see this field, so any value means a bot.
   *
   * Validation deliberately ACCEPTS a filled value: rejecting it here would
   * return a 422 naming the field, which tells the bot exactly what caught
   * it. The route handler checks the value instead and answers 202 without
   * writing a row, so the script sees success and does not adapt.
   */
  website: z.string().max(200).optional(),
})
  // The full form still demands e-mail and commune; the callback form does
  // not collect them. Enforced here rather than at field level so each error
  // still points at the field the visitor can actually fix.
  .refine((d) => d.requestType !== 'full' || !!d.email, {
    message: 'Veuillez saisir une adresse e-mail valide.',
    path: ['email'],
  })
  .refine((d) => d.requestType !== 'full' || !!d.commune, {
    message: 'Veuillez saisir le nom de votre commune.',
    path: ['commune'],
  });

export type QuoteRequestInput = z.infer<typeof quoteRequestSchema>;

export const jobApplicationSchema = z.object({
  jobSlug: z.string().min(1).max(160),
  fullName: z.string().trim().min(2, 'Veuillez saisir votre nom complet.').max(200),
  email: z.email('Veuillez saisir une adresse e-mail valide.').max(255),
  phone: z.string().trim().regex(FRENCH_PHONE, 'Veuillez saisir un numéro de téléphone valide.'),
  message: z.string().trim().max(4000).optional(),
  consentGiven: z.literal(true, {
    message: 'Vous devez accepter la politique de confidentialité.',
  }),
  /** Honeypot — see the note on quoteRequestSchema.website. */
  website: z.string().max(200).optional(),
});

export type JobApplicationInput = z.infer<typeof jobApplicationSchema>;
