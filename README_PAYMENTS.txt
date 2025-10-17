PayPal integration:
- Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to .env.local
- This project uses PayPal sandbox endpoints by default.
- For production, switch API base URLs to live endpoints and set proper credentials.
- Flow:
  1) Frontend creates letter (status pending_payment).
  2) Frontend calls /api/create-paypal-order to create PayPal order.
  3) Frontend should redirect user to PayPal approval page or open PayPal buttons.
  4) After approval, call /api/capture-paypal-order to capture and mark letter as paid.
