export interface MailchimpConfig {
  apiKey: string;
  dc: string;
}

export interface MailchimpContact {
  id: string;
  email_address: string;
  tags: string[];
}

export interface MailchimpAudience {
  id: string;
  name: string;
}

export class MailchimpClient {
  private config: MailchimpConfig;
  private baseUrl: string;

  constructor(config?: MailchimpConfig) {
    const apiKey = config?.apiKey || process.env.MAILCHIMP_API_KEY || '';
    const dc = config?.dc || process.env.MAILCHIMP_DC || this.extractDcFromKey(apiKey);

    this.config = { apiKey, dc };
    this.baseUrl = `https://${dc}.api.mailchimp.com/3.0`;
  }

  private extractDcFromKey(apiKey: string): string {
    const match = apiKey.match(/-(.+)$/);
    return match ? match[1] : 'us1';
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Mailchimp API error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<T>;
  }

  async getAudiences(): Promise<MailchimpAudience[]> {
    const result = await this.request<{ audiences: MailchimpAudience[] }>('/audiences');
    return result.audiences || [];
  }

  async getContact(audienceId: string, email: string): Promise<MailchimpContact | null> {
    const hashed = this.hashEmail(email);
    try {
      return await this.request<MailchimpContact>(`/lists/${audienceId}/members/${hashed}`);
    } catch {
      return null;
    }
  }

  async addTags(audienceId: string, subscriberHash: string, tags: string[]): Promise<void> {
    await this.request(`/lists/${audienceId}/members/${subscriberHash}/tags`, {
      method: 'POST',
      body: JSON.stringify({
        tags: tags.map(tag => ({ name: tag, status: 'active' })),
      }),
    });
  }

  async removeTags(audienceId: string, subscriberHash: string, tags: string[]): Promise<void> {
    await this.request(`/lists/${audienceId}/members/${subscriberHash}/tags`, {
      method: 'POST',
      body: JSON.stringify({
        tags: tags.map(tag => ({ name: tag, status: 'inactive' })),
      }),
    });
  }

  private hashEmail(email: string): string {
    const crypto = require('crypto');
    return crypto.createHash('md5')
      .update(email.toLowerCase().trim())
      .digest('hex');
  }
}
