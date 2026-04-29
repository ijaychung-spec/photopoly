const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const PRICE_IDS = {
  'matt': 'price_1THsP5CggTwK7oTerYgWr1jJ',
  'prem': 'price_1THsPxCggTwK7oTeGA03PrXY',
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { coating, qty, orderId, shareId, origin, shipping } = req.body;

    if (!orderId || !shareId || !origin) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const safeQty = Math.max(1, Math.min(10, parseInt(qty) || 1));
    const safeShipping = (typeof shipping === 'number' && shipping >= 0) ? shipping : 4.99;
    const priceId = PRICE_IDS[coating] || PRICE_IDS['matt'];

    const lineItems = [{ price: priceId, quantity: safeQty }];

    if (safeShipping > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: { name: 'Shipping (USPS)' },
          unit_amount: Math.round(safeShipping * 100),
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      locale: 'en',
      success_url: origin + '/photopoly-confirm?order=' + orderId + '&share=' + shareId + '&paid=1',
      cancel_url: origin + '/photopoly?cancelled=1',
      metadata: { order_id: orderId, share_id: shareId },
      billing_address_collection: 'auto',
    });

    return res.status(200).json({ url: session.url });

  } catch (err) {
    console.error('Stripe error:', err);
    return res.status(500).json({ error: err.message });
  }
};
