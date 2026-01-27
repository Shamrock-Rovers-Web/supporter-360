import { query } from '../db/connection';

export interface ReconciliationResult {
  source: string;
  eventsFound: number;
  eventsCreated: number;
  errors: string[];
}

export class ReconcilerService {
  async reconcileAll(): Promise<ReconciliationResult[]> {
    const results: ReconciliationResult[] = [];

    const lookbackResult = await query(
      "SELECT value::numeric as hours FROM config WHERE key = 'reconciliation_lookback_hours'"
    );
    const lookbackHours = lookbackResult.rows[0]?.hours || 24;

    const since = new Date(Date.now() - lookbackHours * 60 * 60 * 1000).toISOString();

    return results;
  }

  private async reconcileShopify(since: string): Promise<ReconciliationResult> {
    return {
      source: 'shopify',
      eventsFound: 0,
      eventsCreated: 0,
      errors: [],
    };
  }

  private async reconcileStripe(since: string): Promise<ReconciliationResult> {
    return {
      source: 'stripe',
      eventsFound: 0,
      eventsCreated: 0,
      errors: [],
    };
  }

  private async reconcileGoCardless(since: string): Promise<ReconciliationResult> {
    return {
      source: 'gocardless',
      eventsFound: 0,
      eventsCreated: 0,
      errors: [],
    };
  }
}
