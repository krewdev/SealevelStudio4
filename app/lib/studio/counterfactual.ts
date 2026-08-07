export type CounterfactualFill = {
  quoteSol: number;
  chainSol: number;
  sandwichSol: number;
  waitSol: number;
  slipSol: number;
  extractedSol: number;
  waitEdgeSol: number;
};

export function counterfactualFill(opts: {
  quoteSol: number;
  chainSol: number;
  feeSol?: number;
  sandwichBps?: number;
  waitImproveBps?: number;
}): CounterfactualFill {
  const quote = Math.max(0, opts.quoteSol || 0);
  const chain = Math.max(0, opts.chainSol || 0);
  const sandwichBps = opts.sandwichBps ?? 80;
  const waitBps = opts.waitImproveBps ?? 12;
  const sandwichSol = Math.max(0, chain * (1 - sandwichBps / 10_000));
  const waitSol = chain * (1 + waitBps / 10_000);
  const slipSol = quote - chain;
  const extractedSol = chain - sandwichSol;
  return {
    quoteSol: quote,
    chainSol: chain,
    sandwichSol,
    waitSol,
    slipSol,
    extractedSol,
    waitEdgeSol: waitSol - chain,
  };
}
