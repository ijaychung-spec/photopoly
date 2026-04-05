const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Stripe Price IDs
const PRICE_IDS = {
  'matt': 'price_1THsP5CggTwK7oTerYgWr1jJ',  // Matte $16.99
  'prem': 'price_1THsPxCggTwK7oTeGA03PrXY',  // Premium $19.99
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const data = JSON.parse(event.body);
    const { coating, qty, orderId, shareId, origin, shipping } = data;

    // Validate inputs
    if(!orderId || !shareId || !origin) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
    }
    const safeQty = Math.max(1, Math.min(10, parseInt(qty) || 1));
    const safeShipping = (typeof shipping === 'number' && shipping >= 0) ? shipping : 4.99;

    const priceId = PRICE_IDS[coating] || PRICE_IDS['matt'];

    const lineItems = [
      {
        price: priceId,
        quantity: safeQty,
      }
    ];

    // Add shipping as separate line item if not free
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
      success_url: origin + '/photopoly-confirm?order=' + orderId + '&share=' + shareId + '&paid=1',
      cancel_url: origin + '/photopoly?cancelled=1',
      metadata: {
        order_id: orderId,
        share_id: shareId,
      },
      billing_address_collection: 'auto',
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error('Stripe error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
