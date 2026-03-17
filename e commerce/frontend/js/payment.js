/* ============================================================
   payment.js – Razorpay checkout integration for SkillHub
   ============================================================ */
import api from './api.js';
import { toast, getUser, formatPrice } from './auth.js';

/**
 * Initiate Razorpay payment for an existing order
 * @param {number} orderId  - DB order ID
 * @param {function} onSuccess - callback called after successful payment
 */
export async function initiatePayment(orderId, onSuccess) {
  try {
    // 1. Create Razorpay order on backend
    const rz = await api.post(`/payments/create-order?order_id=${orderId}`);
    const user = getUser();

    const options = {
      key:          rz.key,
      amount:       rz.amount,
      currency:     rz.currency,
      name:         'SkillHub',
      description:  rz.service_title || 'Service Payment',
      order_id:     rz.razorpay_order_id,
      prefill: {
        name:  user?.name  || '',
        email: user?.email || '',
      },
      theme: { color: '#1e4fc2' },
      handler: async function (response) {
        try {
          // 2. Verify on backend
          await api.post('/payments/verify', {
            razorpay_order_id:   response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature:  response.razorpay_signature,
            order_id:            orderId,
          });
          toast('Payment successful! Order is now active.', 'success');
          if (typeof onSuccess === 'function') onSuccess();
        } catch (e) {
          toast(e.message || 'Payment verification failed', 'error');
        }
      },
      modal: {
        ondismiss: () => toast('Payment cancelled', 'info'),
      },
    };

    if (!window.Razorpay) {
      toast('Loading payment gateway…', 'info');
      await loadRazorpayScript();
    }
    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', e => toast(`Payment failed: ${e.error.description}`, 'error'));
    rzp.open();
  } catch (err) {
    toast(err.message || 'Could not initiate payment', 'error');
  }
}

function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload  = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

/**
 * Show payment summary modal (static, before Razorpay popup)
 */
export function showPaymentModal(service, orderId, onConfirm) {
  const existing = document.getElementById('payment-modal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'payment-modal';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:420px">
      <div class="modal-header">
        <h3>💳 Secure Payment</h3>
        <button class="modal-close" id="close-payment-modal">&times;</button>
      </div>
      <div class="modal-body">
        <div class="order-summary">
          <h4 style="margin-bottom:12px;font-size:.95rem">Order Summary</h4>
          <div class="order-summary-row">
            <span>Project</span>
            <span><strong>${service.title}</strong></span>
          </div>
          <div class="order-summary-row">
            <span>Freelancer</span>
            <span>${service.owner?.name || ''}</span>
          </div>
          <div class="order-summary-row total">
            <span>Total</span>
            <span>${formatPrice(service.price)}</span>
          </div>
        </div>
        <p style="font-size:.82rem;color:#6c757d;margin-bottom:16px">
          Payments are processed securely via Razorpay. You'll be redirected to complete payment.
        </p>
        <div class="payment-options">
          <div class="payment-option selected">
            <div class="payment-option-label"><span>💳</span> Credit / Debit Card</div>
            <span>›</span>
          </div>
          <div class="payment-option">
            <div class="payment-option-label"><span>📱</span> Pay with UPI</div>
            <span>›</span>
          </div>
          <div class="payment-option">
            <div class="payment-option-label">
              <img src="https://razorpay.com/favicon.png" style="width:18px;height:18px;border-radius:4px"> Razorpay
            </div>
            <span>›</span>
          </div>
        </div>
        <button id="pay-now-btn" class="btn btn-primary btn-block" style="margin-top:20px;padding:14px">
          Pay Now ${formatPrice(service.price)}
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Payment option selection
  overlay.querySelectorAll('.payment-option').forEach(opt => {
    opt.addEventListener('click', () => {
      overlay.querySelectorAll('.payment-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
    });
  });

  document.getElementById('close-payment-modal').onclick = () => overlay.remove();
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  document.getElementById('pay-now-btn').onclick = () => {
    overlay.remove();
    if (typeof onConfirm === 'function') onConfirm(orderId);
  };
}
