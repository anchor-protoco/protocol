import { config } from '../config/config';
import { withRetry } from '../utils/retry';

export interface CoinGeckoPrice {
  id: string;
  priceUsd: number;
}

export async function fetchCoinGeckoPrice(id: string): Promise<CoinGeckoPrice> {
  const url = `${config.COINGECKO_BASE_URL}/simple/price?ids=${id}&vs_currencies=usd`;
  return withRetry(async () => {
    //const res = await fetch(url);
    const res = await fetch(url, {
      headers: {
        'x-cg-demo-api-key': 'CG-TtQgZX9c9RkAnBQLmcwJhzLd', //config.COINGECKO_API_KEY,
        'User-Agent': 'LendingOracle/1.0',
      },
    });
    if (!res.ok) {
      throw new Error(`CoinGecko error ${res.status}`);
    }
    const json = (await res.json()) as Record<string, { usd: number }>;
    const price = json[id]?.usd;
    if (!price || price <= 0) {
      throw new Error('Invalid price');
    }
    return { id, priceUsd: price };
  });
}
