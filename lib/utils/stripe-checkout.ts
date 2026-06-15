/**
 * Redirect to Stripe Checkout in the current tab.
 * Avoids opening a second tab that can steal focus or leave a stale boost page open.
 */
export function redirectToStripeCheckout(checkoutUrl: string): void {
  if (!checkoutUrl) {
    throw new Error('No checkout URL received');
  }

  window.location.assign(checkoutUrl);
}
