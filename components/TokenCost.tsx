'use client';

export default function TokenCost({
  clientCost,
  inputTokens,
  outputTokens,
}: {
  clientCost: number;
  inputTokens?: number;
  outputTokens?: number;
}) {
  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/20 font-mono text-[10px] text-emerald-400 font-bold">
      ${clientCost.toFixed(4)}
      {inputTokens !== undefined && (
        <span className="text-emerald-400/60">
          ({inputTokens.toLocaleString()}in/{outputTokens?.toLocaleString()}out)
        </span>
      )}
    </div>
  );
}
