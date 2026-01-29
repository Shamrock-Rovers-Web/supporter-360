export interface FTConfig {
  apiUrl: string;
  apiKey: string;
}

export interface FTCustomer {
  CustomerID: string;
  Email: string;
  FirstName?: string;
  LastName?: string;
  Phone?: string;
  CreatedDate: string;
}

export interface FTOrder {
  OrderID: string;
  CustomerID: string;
  OrderDate: string;
  TotalAmount: number;
  Status: string;
  Items: FTOrderItem[];
}

export interface FTOrderItem {
  ProductID: string;
  CategoryID?: string;
  Quantity: number;
  Price: number;
  ProductName: string;
}

export interface FTStadiumEntry {
  EntryID: string;
  CustomerID: string;
  EventID: string;
  EventName: string;
  EntryTime: string;
  Gate?: string;
}

export interface FTCheckPoint {
  last_customer_fetch: string | null;
  last_order_fetch: string | null;
  last_entry_fetch: string | null;
}

export class FutureTicketingClient {
  private config: FTConfig;

  constructor(config?: FTConfig) {
    this.config = config || {
      apiUrl: process.env.FUTURE_TICKETING_API_URL || '',
      apiKey: process.env.FUTURE_TICKETING_API_KEY || '',
    };
  }

  private async request<T>(endpoint: string, params?: Record<string, string>): Promise<T[]> {
    const url = new URL(endpoint, this.config.apiUrl);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`FT API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as unknown;
    if (Array.isArray(data)) return data as T[];
    const result = (data as { data?: T[] }).data;
    return Array.isArray(result) ? result : [];
  }

  async getCustomers(since?: string): Promise<FTCustomer[]> {
    return this.request<FTCustomer>('/api/customers', since
      ? { modifiedSince: since }
      : undefined
    );
  }

  async getOrders(since?: string): Promise<FTOrder[]> {
    return this.request<FTOrder>('/api/orders', since
      ? { sinceDate: since }
      : undefined
    );
  }

  async getStadiumEntries(since?: string): Promise<FTStadiumEntry[]> {
    return this.request<FTStadiumEntry>('/api/entries', since
      ? { sinceDate: since }
      : undefined
    );
  }
}
