'use client';

import { Currency, PaymentMethod } from '@/lib/types';
import { CURRENCY_PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '@/lib/constants';
import { CreditCard, Zap, Banknote } from 'lucide-react';

const methodIcons: Record<string, React.ReactNode> = {
  stripe: <CreditCard className="w-4 h-4" />,
  mercadopago: <Banknote className="w-4 h-4" />,
  galiopay: <Banknote className="w-4 h-4" />,
  lightning: <Zap className="w-4 h-4" />,
};

export default function PaymentMethodSelector({
  currency,
  selectedMethod,
  onSelect,
}: {
  currency: Currency;
  selectedMethod: PaymentMethod | null;
  onSelect: (method: PaymentMethod) => void;
}) {
  const methods = CURRENCY_PAYMENT_METHODS[currency] || [];

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Payment Method</h4>
      <div className="grid grid-cols-2 gap-2">
        {methods.map(method => (
          <button
            key={method}
            onClick={() => onSelect(method as PaymentMethod)}
            className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-sm ${
              selectedMethod === method
                ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                : 'bg-white/[0.04] border-white/[0.07] text-[#9CA3AF] hover:bg-white/[0.06]'
            }`}
          >
            {methodIcons[method]}
            <span className="text-xs font-medium">{PAYMENT_METHOD_LABELS[method]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
