import { getPaymentReturnConfig } from './paymentReturnConfig.mjs'
import styles from './PaymentReturnPage.module.css'

export default function PaymentReturnPage({ flow, outcome }) {
  const paymentFlow = getPaymentReturnConfig(flow, outcome)
  const wasCancelled = outcome === 'cancel'

  return (
    <main
      aria-labelledby="payment-return-title"
      className={styles.returnPage}
      style={{
        minHeight: '100vh',
        display: 'grid',
        padding: 'clamp(1.5rem, 5vw, 4rem)',
        background: '#f7f8fa',
      }}
    >
      <section
        className={styles.returnCard}
        style={{
          width: 'min(100%, 34rem)',
          padding: 'clamp(1.5rem, 5vw, 3rem)',
          border: '1px solid #dfe3e8',
          borderRadius: '1.25rem',
          background: '#ffffff',
          boxShadow: '0 1rem 3rem rgba(24, 35, 49, 0.08)',
        }}
      >
        <p style={{ margin: 0, color: '#667085', fontSize: '0.875rem', fontWeight: 700 }}>
          {paymentFlow.eyebrow}
        </p>
        <h1
          id="payment-return-title"
          style={{
            margin: '0.75rem 0 1rem',
            color: '#182331',
            fontSize: 'clamp(1.75rem, 6vw, 2.5rem)',
            lineHeight: 1.1,
          }}
        >
          {wasCancelled ? 'Payment was not completed' : 'Payment return received'}
        </h1>
        <p style={{ margin: 0, color: '#475467', lineHeight: 1.6 }}>
          {wasCancelled
            ? 'No payment confirmation was received. You can return to your order and try again when you are ready.'
            : 'This page does not confirm payment. Open the app to check the verified booking or order status.'}
        </p>
        <div
          className={styles.returnDetails}
          style={{ display: 'grid', gap: '0.75rem', marginTop: '1.75rem' }}
        >
          {paymentFlow.appHref ? (
            <a
              className={styles.primaryAction}
              data-primary-return-action
              href={paymentFlow.appHref}
              style={{
                display: 'inline-flex',
                justifyContent: 'center',
                padding: '0.8rem 1rem',
                borderRadius: '0.75rem',
                background: '#182331',
                color: '#ffffff',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              {paymentFlow.appLabel}
            </a>
          ) : null}
          <p style={{ margin: 0, color: '#475467', lineHeight: 1.6 }}>
            {paymentFlow.returnInstruction}
          </p>
        </div>
        <p style={{ margin: '1.25rem 0 0', color: '#667085', fontSize: '0.8125rem', lineHeight: 1.5 }}>
          Payment details are verified in the app and are not displayed on this return page.
        </p>
      </section>
    </main>
  )
}
