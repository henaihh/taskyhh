'use client';

import { useState } from 'react';
import { UserProfile, Currency, PaymentMethod } from '@/lib/types';
import { CREDIT_PACKAGES, CURRENCY_PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '@/lib/constants';
import { useIsDesktop } from '@/lib/useIsDesktop';

const PKGS = {
  USD: { symbol: '$', min: 20, step: 5 },
  ARS: { symbol: 'ARS ', min: 30000, step: 5000 },
  BTC: { symbol: '₿', min: 0.0005, step: 0.00025 },
};

export default function CreditPanel({
  anim,
  onClose,
  profile,
  userId,
  spent,
  doneCount,
}: {
  anim: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  userId: string;
  spent: number;
  doneCount: number;
}) {
  const [cur, setCur] = useState<Currency>('ARS');
  const [amount, setAmount] = useState(20);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(false);
  const isDesktop = useIsDesktop();

  const balance = Number(profile?.credit_balance_usd || 0);
  const pkg = PKGS[cur];
  const maxVal = pkg.min * 10;

  const handleCurrencyChange = (c: Currency) => {
    setCur(c);
    setAmount(PKGS[c].min);
    setMethod(null);
  };

  const formatAmount = (val: number) => {
    if (cur === 'BTC') return `₿${val.toFixed(5)} (${Math.round(val * 100000).toLocaleString()} sats)`;
    if (cur === 'ARS') return `ARS ${val.toLocaleString()}`;
    return `$${val}`;
  };

  const formatShort = (val: number) => {
    if (cur === 'BTC') return `₿${val.toFixed(4)}`;
    if (cur === 'ARS') return `${(val / 1000).toFixed(0)}k`;
    return `$${val}`;
  };

  const handleTopUp = async () => {
    const m = method || (CURRENCY_PAYMENT_METHODS[cur]?.[0] as PaymentMethod);
    if (!m) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/payments/${m}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency: cur, userId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else if (data.invoice) {
        if (typeof window !== 'undefined' && (window as any).webln) {
          try {
            await (window as any).webln.enable();
            await (window as any).webln.sendPayment(data.invoice);
            await fetch('/api/payments/lightning', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentId: data.paymentId }) });
            onClose();
          } catch { alert(`Lightning Invoice:\n${data.invoice}`); }
        } else { alert(`Lightning Invoice:\n${data.invoice}`); }
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const quickPicks = [1, 2, 4, 6, 8, 10].map(m => pkg.min + (pkg.step * (m - 1) * 2));

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 100, transition: 'opacity 0.3s', display: 'flex', alignItems: isDesktop ? 'center' : 'flex-end', justifyContent: 'center', opacity: anim ? 1 : 0 }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={isDesktop ? {
          background: '#111827', borderRadius: 20, maxWidth: 560, width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.3s', border: '1px solid rgba(255,255,255,0.08)', transform: anim ? 'scale(1)' : 'scale(0.95)', opacity: anim ? 1 : 0,
        } : {
          background: '#111827', borderRadius: '24px 24px 0 0', maxWidth: 480, width: '100%', maxHeight: '92vh', display: 'flex', flexDirection: 'column', transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none', transform: anim ? 'translateY(0)' : 'translateY(100%)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#818CF8', fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: 'pointer', padding: '4px 0' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            <span>Back</span>
          </button>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#818CF8', fontFamily: "'Space Mono', monospace" }}>Credits</span>
        </div>

        <div style={{ overflowY: 'auto', padding: '20px 20px 0', flex: 1 }}>
          {/* Balance Card */}
          <div style={{ position: 'relative', background: 'linear-gradient(135deg, #1E1B4B, #312E81)', borderRadius: 18, padding: 22, marginBottom: 24, overflow: 'hidden', border: '1px solid rgba(99,102,241,0.2)' }}>
            <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.25), transparent 70%)' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <p style={{ fontSize: 11, color: '#818CF8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Space Mono', monospace", marginBottom: 6 }}>Available Balance</p>
              <h2 style={{ fontSize: 36, fontWeight: 700, color: '#F9FAFB', fontFamily: "'Space Mono', monospace", letterSpacing: '-0.02em', marginBottom: 16, margin: 0 }}>${balance.toFixed(2)}</h2>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <span style={{ fontSize: 9, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'Space Mono', monospace", display: 'block', marginBottom: 3 }}>Spent</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#D1D5DB', fontFamily: "'Space Mono', monospace" }}>${spent.toFixed(3)}</span>
                </div>
                <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.1)' }} />
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <span style={{ fontSize: 9, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'Space Mono', monospace", display: 'block', marginBottom: 3 }}>Tasks</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#D1D5DB', fontFamily: "'Space Mono', monospace" }}>{doneCount}</span>
                </div>
                <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.1)' }} />
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <span style={{ fontSize: 9, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'Space Mono', monospace", display: 'block', marginBottom: 3 }}>Avg/Task</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#D1D5DB', fontFamily: "'Space Mono', monospace" }}>${doneCount ? (spent / doneCount).toFixed(3) : '0.000'}</span>
                </div>
              </div>
            </div>
          </div>

          <h4 style={{ fontSize: 14, fontWeight: 700, color: '#E5E7EB', marginBottom: 14 }}>Top Up Credits</h4>

          {/* Currency Selector */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {(['ARS'] as Currency[]).map(c => (
              <button key={c} onClick={() => handleCurrencyChange(c)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', borderRadius: 10, background: cur === c ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)', border: cur === c ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.08)', color: cur === c ? '#818CF8' : '#6B7280', fontSize: 13, fontWeight: 700, fontFamily: "'Space Mono', monospace", cursor: 'pointer', transition: 'all 0.2s' }}>
                {c === 'BTC' && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v2m0 16v2M9 4h4.5a3.5 3.5 0 010 7H9m0 0h5.5a3.5 3.5 0 010 7H9m0-14v14"/></svg>
                )}
                <span>{c}</span>
              </button>
            ))}
          </div>

          {/* Slider */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>Amount</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#F9FAFB', fontFamily: "'Space Mono', monospace" }}>{formatAmount(amount)}</span>
            </div>
            <input type="range" min={pkg.min} max={maxVal} step={pkg.step} value={amount} onChange={e => setAmount(Number(e.target.value))} style={{ width: '100%', marginTop: 8 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: '#4B5563', fontFamily: "'Space Mono', monospace" }}>
              <span>{cur === 'BTC' ? `₿${pkg.min}` : cur === 'ARS' ? `ARS ${pkg.min.toLocaleString()}` : `$${pkg.min}`}</span>
              <span>{cur === 'BTC' ? `₿${(maxVal).toFixed(4)}` : cur === 'ARS' ? `ARS ${maxVal.toLocaleString()}` : `$${maxVal}`}</span>
            </div>
          </div>

          {/* Quick Picks */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
            {quickPicks.map((v, i) => (
              <button key={i} onClick={() => setAmount(v)} style={{ padding: '9px 0', borderRadius: 8, background: amount === v ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)', border: amount === v ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.08)', color: amount === v ? '#818CF8' : '#9CA3AF', fontSize: 12, fontWeight: 700, fontFamily: "'Space Mono', monospace", cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center' }}>
                {formatShort(v)}
              </button>
            ))}
          </div>

          {/* Info */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 14, marginBottom: 20 }}>
            {[
              { label: <><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#818CF8' }}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> Est. tasks</>, value: cur === 'BTC' ? `~${Math.round(amount * 100000 / 5)}-${Math.round(amount * 100000 / 0.5)}` : cur === 'ARS' ? `~${Math.round(amount / 500)}-${Math.round(amount / 50)}` : `~${Math.round(amount / 0.5)}-${Math.round(amount / 0.01)}` },
              { label: 'Service fee', value: 'Included in cost', muted: true },
              { label: 'Payment', value: cur === 'BTC' ? 'Lightning / On-chain' : 'Card / Transfer' },
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: 12, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 6 }}>{row.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: row.muted ? '#6B7280' : '#E5E7EB', fontFamily: "'Space Mono', monospace" }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Top Up Button */}
          <button
            onClick={handleTopUp}
            disabled={loading}
            style={{ width: '100%', padding: '14px 0', borderRadius: 14, background: 'linear-gradient(135deg, #6366F1, #7C3AED)', border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", cursor: loading ? 'wait' : 'pointer', boxShadow: '0 4px 16px rgba(99,102,241,0.25)', transition: 'all 0.2s', letterSpacing: '-0.01em', opacity: loading ? 0.7 : 1 }}
            onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(99,102,241,0.4)'; }}}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(99,102,241,0.25)'; }}
          >
            {loading ? 'Processing...' : `Top Up ${cur === 'BTC' ? `₿${amount.toFixed(5)}` : cur === 'ARS' ? `ARS ${amount.toLocaleString()}` : `$${amount}`}`}
          </button>

          <p style={{ fontSize: 11, color: '#4B5563', textAlign: 'center', marginTop: 14, lineHeight: 1.5 }}>
            Credits never expire. Cost = AI tokens used + 35% service fee.
          </p>

          <div style={{ height: 30 }} />
        </div>
      </div>
    </div>
  );
}
