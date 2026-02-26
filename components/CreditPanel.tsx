'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Wallet, TrendingUp, CheckCircle, Loader2 } from 'lucide-react';
import { UserProfile, Currency, PaymentMethod } from '@/lib/types';
import { CREDIT_PACKAGES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import PaymentMethodSelector from './PaymentMethodSelector';

const currencies: Currency[] = ['USD', 'ARS', 'BTC'];
const currencySymbols: Record<Currency, string> = { USD: '$', ARS: '$', BTC: '₿' };

export default function CreditPanel({
  onClose,
  profile,
  userId,
}: {
  onClose: () => void;
  profile: UserProfile | null;
  userId: string;
}) {
  const [currency, setCurrency] = useState<Currency>('USD');
  const [amount, setAmount] = useState(CREDIT_PACKAGES.USD.min);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(false);

  const pkg = CREDIT_PACKAGES[currency];
  const balance = Number(profile?.credit_balance_usd || 0);
  const totalSpent = Number(profile?.total_spent_usd || 0);
  const tasksCompleted = profile?.total_tasks_completed || 0;
  const avgCost = tasksCompleted > 0 ? totalSpent / tasksCompleted : 0;

  const handleCurrencyChange = (c: Currency) => {
    setCurrency(c);
    setAmount(CREDIT_PACKAGES[c].min);
    setMethod(null);
  };

  const handleTopUp = async () => {
    if (!method) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/payments/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency, userId }),
      });
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else if (data.invoice) {
        // Lightning: try WebLN first
        if (typeof window !== 'undefined' && (window as any).webln) {
          try {
            await (window as any).webln.enable();
            const { preimage } = await (window as any).webln.sendPayment(data.invoice);
            // Verify payment
            await fetch(`/api/payments/lightning`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ preimage, paymentId: data.paymentId }),
            });
            onClose();
          } catch {
            // Fallback: show invoice for QR scanning
            alert(`Lightning Invoice:\n${data.invoice}`);
          }
        } else {
          alert(`Lightning Invoice:\n${data.invoice}`);
        }
      }
    } catch (err) {
      console.error('Payment error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
      />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto bg-[#0B0F1A] border-t border-white/[0.07] rounded-t-3xl mx-auto max-w-[480px]"
      >
        <div className="p-5 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Wallet className="w-5 h-5 text-[#818CF8]" />
              Credits
            </h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06]">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Balance Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#6366F1]/30 to-[#818CF8]/20 border border-indigo-500/20">
            <p className="text-xs text-indigo-300 mb-1">Available Balance</p>
            <p className="text-3xl font-bold font-mono">${balance.toFixed(2)}</p>
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div>
                <p className="text-[10px] text-indigo-300/60 uppercase">Spent</p>
                <p className="text-sm font-mono font-bold">${totalSpent.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[10px] text-indigo-300/60 uppercase">Tasks</p>
                <p className="text-sm font-mono font-bold">{tasksCompleted}</p>
              </div>
              <div>
                <p className="text-[10px] text-indigo-300/60 uppercase">Avg/Task</p>
                <p className="text-sm font-mono font-bold">${avgCost.toFixed(4)}</p>
              </div>
            </div>
          </div>

          {/* Currency Selector */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Currency</h4>
            <div className="flex gap-2">
              {currencies.map(c => (
                <button
                  key={c}
                  onClick={() => handleCurrencyChange(c)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    currency === c
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                      : 'bg-white/[0.04] text-[#6B7280] border border-white/[0.07] hover:bg-white/[0.06]'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Amount Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Amount</h4>
              <span className="font-mono text-sm font-bold text-[#F9FAFB]">
                {currencySymbols[currency]}{currency === 'BTC' ? amount.toFixed(5) : amount.toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              min={pkg.min}
              max={pkg.max}
              step={pkg.step}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
            {/* Quick picks */}
            <div className="flex gap-2 flex-wrap">
              {Array.from({ length: 4 }, (_, i) => {
                const val = pkg.min + pkg.step * i * Math.floor((pkg.max - pkg.min) / (pkg.step * 3));
                return Math.min(val, pkg.max);
              }).map((val, i) => (
                <button
                  key={i}
                  onClick={() => setAmount(val)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                    amount === val
                      ? 'bg-indigo-500/20 text-indigo-300'
                      : 'bg-white/[0.04] text-[#6B7280] hover:bg-white/[0.06]'
                  }`}
                >
                  {currencySymbols[currency]}{currency === 'BTC' ? val.toFixed(4) : val.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Method */}
          <PaymentMethodSelector
            currency={currency}
            selectedMethod={method}
            onSelect={setMethod}
          />

          {/* Top Up Button */}
          <Button
            onClick={handleTopUp}
            disabled={!method || loading}
            className="w-full h-12 bg-gradient-to-r from-[#6366F1] to-[#818CF8] hover:opacity-90 text-white font-semibold rounded-xl"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              `Top Up ${currencySymbols[currency]}${currency === 'BTC' ? amount.toFixed(5) : amount.toLocaleString()}`
            )}
          </Button>

          {/* Disclaimer */}
          <p className="text-[10px] text-[#6B7280] text-center">
            Credits never expire. Cost = AI tokens + 35% service fee.
          </p>

          <div className="h-4" />
        </div>
      </motion.div>
    </>
  );
}
