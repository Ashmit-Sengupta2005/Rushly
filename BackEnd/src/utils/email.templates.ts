// Simple HTML email templates. Real production apps use React Email or MJML
// for responsive templates; for Rushly's demo, inline HTML strings are fine.
//
// Every template is a pure function: takes typed data, returns rendered HTML.
// This means templates are testable in isolation and can be swapped without
// touching the send logic.

export interface OrderConfirmationData {
  customerName: string;
  orderId: string;
  totalAmount: number;   // in paise
  currency: string;
  itemCount: number;
}

export interface RefundConfirmationData {
  customerName: string;
  orderId: string;
  totalRefunded: number;
  currency: string;
}

export interface RestockNotificationData {
  customerName: string;
  productName: string;
  productUrl: string;
  imageUrl: string | null;
  price: number; // paise
}

// Format money (paise → ₹X.XX)
const formatMoney = (paise: number, currency: string) => {
  const symbol = currency === 'INR' ? '₹' : currency;
  const amount = (paise / 100).toFixed(2);
  return `${symbol}${amount}`;
};

// Basic HTML wrapper — inline styles because most email clients strip <style>
const wrapper = (bodyContent: string) => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
    <div style="border: 1px solid #eee; border-radius: 8px; padding: 32px;">
      <h1 style="color: #111; margin-top: 0;">Rushly</h1>
      ${bodyContent}
      <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
      <p style="color: #999; font-size: 12px;">This is an automated email from Rushly. Please do not reply.</p>
    </div>
  </body>
</html>
`.trim();

export const emailTemplates = {
  orderConfirmation: (data: OrderConfirmationData) => ({
    subject: `Order confirmed — #${data.orderId.slice(0, 8)}`,
    html: wrapper(`
      <h2>Order Confirmed 🎉</h2>
      <p>Hi ${data.customerName},</p>
      <p>Your order has been confirmed and payment processed successfully.</p>
      <div style="background: #f7f7f7; padding: 16px; border-radius: 6px; margin: 24px 0;">
        <p style="margin: 4px 0;"><strong>Order ID:</strong> ${data.orderId}</p>
        <p style="margin: 4px 0;"><strong>Items:</strong> ${data.itemCount}</p>
        <p style="margin: 4px 0;"><strong>Total:</strong> ${formatMoney(data.totalAmount, data.currency)}</p>
      </div>
      <p>We'll send you another update when your order ships.</p>
      <p>Thanks for shopping with Rushly!</p>
    `),
    text: `Order Confirmed — Rushly\n\nHi ${data.customerName},\n\nYour order ${data.orderId} has been confirmed. Total: ${formatMoney(data.totalAmount, data.currency)}.\n\nThanks for shopping with Rushly!`,
  }),

  refundConfirmation: (data: RefundConfirmationData) => ({
    subject: `Refund processed — #${data.orderId.slice(0, 8)}`,
    html: wrapper(`
      <h2>Refund Processed</h2>
      <p>Hi ${data.customerName},</p>
      <p>Your refund has been processed and the amount will appear in your account within 5-10 business days depending on your bank.</p>
      <div style="background: #f7f7f7; padding: 16px; border-radius: 6px; margin: 24px 0;">
        <p style="margin: 4px 0;"><strong>Order ID:</strong> ${data.orderId}</p>
        <p style="margin: 4px 0;"><strong>Refunded:</strong> ${formatMoney(data.totalRefunded, data.currency)}</p>
      </div>
      <p>If you have any questions, please reach out to our support team.</p>
    `),
    text: `Refund Processed — Rushly\n\nHi ${data.customerName},\n\nWe've refunded ${formatMoney(data.totalRefunded, data.currency)} for order ${data.orderId}. Expect it in your account within 5-10 business days.`,
  }),

  restockNotification: (data: RestockNotificationData) => ({
    subject: `It's back: ${data.productName}`,
    html: wrapper(`
      <h2>Back in stock ⚡</h2>
      <p>Hi ${data.customerName},</p>
      <p>Good news — <strong>${data.productName}</strong> is available again. Restocks sell out fast, so don't wait too long.</p>
      ${data.imageUrl ? `<img src="${data.imageUrl}" alt="${data.productName}" width="280" style="display:block; border-radius: 8px; margin: 24px 0;">` : ''}
      <p style="margin: 4px 0;"><strong>Price:</strong> ${formatMoney(data.price, 'INR')}</p>
      <p style="margin: 24px 0;">
        <a href="${data.productUrl}" style="background: #111; color: #fff; padding: 12px 20px; border-radius: 6px; text-decoration: none; display: inline-block;">Shop now</a>
      </p>
    `),
    text: `Back in stock — Rushly

Hi ${data.customerName},

${data.productName} is available again (${formatMoney(data.price, 'INR')}). Shop now: ${data.productUrl}`,
  }),
};