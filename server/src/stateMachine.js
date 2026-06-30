// Server-enforced request state machine (TZ §4.3). Invalid transitions are
// rejected at the service layer, not just the UI.

// allowed[from] = [ ...to ]
export const TRANSITIONS = {
  new:              ['assigned', 'cancelled'],
  assigned:         ['clarifying', 'quoting', 'cancelled'],
  clarifying:       ['quoting', 'cancelled'],
  quoting:          ['quote_sent', 'cancelled'],
  quote_sent:       ['quote_accepted', 'quote_expired', 'cancelled'],
  quote_accepted:   ['awaiting_payment', 'cancelled'],
  awaiting_payment: ['paid', 'quote_expired', 'cancelled'],
  paid:             ['booking', 'refund_requested'],
  booking:          ['booked', 'booking_failed'],
  booked:           ['completed', 'refund_requested'],
  completed:        [],
  // side / terminal
  quote_expired:    ['quoting', 'cancelled'],
  booking_failed:   ['booking', 'refund_requested'],
  refund_requested: ['refunded'],
  refunded:         [],
  cancelled:        [],
};

// Which roles may move a request INTO a given status.
// 'system' = set by a payment webhook / automation, never by a person.
const ACTOR_RULES = {
  assigned:         ['operator', 'lead', 'admin'],
  clarifying:       ['operator', 'lead', 'admin'],
  quoting:          ['operator', 'lead', 'admin'],
  quote_sent:       ['operator', 'lead', 'admin'],
  quote_accepted:   ['client'],                 // only the client accepts
  awaiting_payment: ['client', 'operator', 'lead', 'admin', 'system'], // client may self-invoice an accepted offer
  paid:             ['system'],                 // only the payment webhook
  booking:          ['operator', 'lead', 'admin'],
  booked:           ['operator', 'lead', 'admin'],
  booking_failed:   ['operator', 'lead', 'admin', 'system'],
  completed:        ['operator', 'lead', 'admin', 'system'],
  quote_expired:    ['operator', 'lead', 'admin', 'system'],
  cancelled:        ['client', 'operator', 'lead', 'admin'],
  refund_requested: ['client', 'operator', 'lead', 'admin'],
  refunded:         ['operator', 'lead', 'admin', 'system'],
};

export function canTransition(from, to) {
  return Array.isArray(TRANSITIONS[from]) && TRANSITIONS[from].includes(to);
}

export function actorMayMoveTo(role, to) {
  const allowed = ACTOR_RULES[to];
  return Array.isArray(allowed) && allowed.includes(role);
}

export const TERMINAL = new Set(['completed', 'cancelled', 'refunded']);
