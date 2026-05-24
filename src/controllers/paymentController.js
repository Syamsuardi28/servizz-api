const crypto = require('crypto');
const { query } = require('../config/db');
const { createError } = require('../middleware/errorHandler');

/**
 * POST /payment/charge
 * Pelanggan memulai pembayaran biaya kunjungan via Midtrans Snap.
 * Body: { order_id, payment_type }
 * Response: { snap_token, redirect_url }
 */
const charge = async (req, res, next) => {
  try {
    const { order_id, payment_type } = req.body;
    const id_user = req.user.id_user;

    const rows = await query(
      `SELECT o.id_order, o.biaya_kunjungan, o.status_order,
              u.nama, u.email, u.no_hp
       FROM orders o
       JOIN users u ON u.id_user = o.id_user
       WHERE o.id_order = ? AND o.id_user = ?`,
      [order_id, id_user]
    );

    if (rows.length === 0) throw createError(404, 'Pesanan tidak ditemukan.');

    const order = rows[0];
    if (!['Menunggu', 'Dikonfirmasi'].includes(order.status_order)) {
      throw createError(400, 'Pesanan tidak dalam status yang bisa dibayar.');
    }

    const serverKey  = process.env.MIDTRANS_SERVER_KEY;
    const baseUrl    = process.env.MIDTRANS_BASE_URL;
    const authHeader = `Basic ${Buffer.from(serverKey + ':').toString('base64')}`;

    const snapPayload = {
      transaction_details: {
        order_id:     `SERVIZZ-${order_id}-${Date.now()}`,
        gross_amount: parseInt(order.biaya_kunjungan, 10),
      },
      customer_details: {
        first_name: order.nama,
        email:      order.email,
        phone:      order.no_hp,
      },
      payment_type,
    };

    const snapResponse = await fetch(baseUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
      body:    JSON.stringify(snapPayload),
    });

    if (!snapResponse.ok) {
      const errBody = await snapResponse.json();
      console.error('[Payment] Midtrans error:', errBody);
      throw createError(502, 'Gagal menghubungi payment gateway.');
    }

    const snapData = await snapResponse.json();

    res.json({
      message:      'Silakan lanjutkan pembayaran.',
      snap_token:   snapData.token,
      redirect_url: snapData.redirect_url,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /payment/callback
 * Webhook dari Midtrans — tidak butuh JWT.
 */
const callback = async (req, res, next) => {
  try {
    const {
      order_id: snapOrderId,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status,
    } = req.body;

    // Verifikasi signature Midtrans
    const serverKey   = process.env.PAYMENT_CALLBACK_SECRET;
    const expectedSig = crypto
      .createHash('sha512')
      .update(`${snapOrderId}${status_code}${gross_amount}${serverKey}`)
      .digest('hex');

    if (signature_key !== expectedSig) {
      return res.status(403).json({ message: 'Signature tidak valid.' });
    }

    // Format order_id: "SERVIZZ-{id_order}-{timestamp}"
    const id_order = parseInt(snapOrderId.split('-')[1], 10);

    const isSuccess =
      (transaction_status === 'capture' && fraud_status === 'accept') ||
      transaction_status === 'settlement';

    if (isSuccess) {
      await query(
        `UPDATE orders SET status_order = 'Dikonfirmasi', updated_at = NOW()
         WHERE id_order = ? AND status_order = 'Menunggu'`,
        [id_order]
      );
    }

    res.status(200).json({ message: 'Callback diterima.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { charge, callback };
