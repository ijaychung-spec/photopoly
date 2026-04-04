const EasyPost = require('@easypost/api');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const client = new EasyPost(process.env.EASYPOST_API_KEY);

  try {
    const data = JSON.parse(event.body);
    const { order } = data;

    if (!order || !order.cust_name || !order.cust_addr || !order.cust_city || !order.cust_state || !order.cust_zip) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing shipping address' }) };
    }

    // From address (your business address)
    const fromAddress = await client.Address.create({
      name: 'Photopoly',
      street1: process.env.SHIP_FROM_ADDR || '123 Business St',
      city: process.env.SHIP_FROM_CITY || 'Irvine',
      state: process.env.SHIP_FROM_STATE || 'CA',
      zip: process.env.SHIP_FROM_ZIP || '92618',
      country: 'US',
      phone: process.env.SHIP_FROM_PHONE || '',
    });

    // To address
    const toAddress = await client.Address.create({
      name: order.cust_name,
      street1: order.cust_addr,
      city: order.cust_city,
      state: order.cust_state,
      zip: order.cust_zip,
      country: 'US',
      phone: order.cust_phone || '',
      email: order.cust_email || '',
    });

    // Parcel (standard magnet set size)
    const parcel = await client.Parcel.create({
      length: 6,
      width: 4,
      height: 1,
      weight: 4, // oz
    });

    // Create shipment
    const shipment = await client.Shipment.create({
      from_address: fromAddress,
      to_address: toAddress,
      parcel: parcel,
    });

    // Buy cheapest USPS rate
    const uspsRates = shipment.rates
      .filter(r => r.carrier === 'USPS')
      .sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate));

    if (!uspsRates.length) {
      throw new Error('No USPS rates available for this address');
    }

    const boughtShipment = await client.Shipment.buy(shipment.id, uspsRates[0]);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tracking_number: boughtShipment.tracking_code,
        label_url: boughtShipment.postage_label.label_url,
        carrier: boughtShipment.selected_rate.carrier,
        service: boughtShipment.selected_rate.service,
        rate: boughtShipment.selected_rate.rate,
      }),
    };

  } catch (err) {
    console.error('EasyPost error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
