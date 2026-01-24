import { Client } from '@notionhq/client';
import {
  PageObjectResponse,
  RichTextItemResponse,
} from '@notionhq/client/build/src/api-endpoints';
import { CMSClient, FAQ, TeamMember, Event, BlogPost } from './types';
import { Locale } from '@/i18n/config';

type NotionPage = PageObjectResponse;
type NotionProperties = PageObjectResponse['properties'];

export class NotionCMS implements CMSClient {
  private client: Client;
  private dataSourceIdCache: Map<string, string> = new Map();

  constructor() {
    if (!process.env.NOTION_TOKEN) {
      throw new Error('NOTION_TOKEN is not defined');
    }
    this.client = new Client({ auth: process.env.NOTION_TOKEN });
  }

  /**
   * In Notion API v5, databases have separate data_source_ids for queries.
   * This method retrieves the data_source_id from the database metadata.
   */
  private async getDataSourceId(databaseId: string): Promise<string> {
    // Check cache first
    const cached = this.dataSourceIdCache.get(databaseId);
    if (cached) return cached;

    // Fetch database to get data_sources array
    const db = await this.client.databases.retrieve({ database_id: databaseId });
    const dataSources = (db as any).data_sources;

    if (!dataSources || dataSources.length === 0) {
      throw new Error(`No data sources found for database ${databaseId}`);
    }

    const dataSourceId = dataSources[0].id;
    this.dataSourceIdCache.set(databaseId, dataSourceId);
    return dataSourceId;
  }

  async getFAQs(locale: Locale): Promise<FAQ[]> {
    const databaseId = process.env.NOTION_FAQ_DB;
    if (!databaseId) {
      console.warn('NOTION_FAQ_DB not defined, returning empty array');
      return [];
    }

    const dataSourceId = await this.getDataSourceId(databaseId);
    const response = await this.client.dataSources.query({
      data_source_id: dataSourceId,
      sorts: [{ property: 'Order', direction: 'ascending' }],
    });

    return response.results
      .filter((page): page is NotionPage => 'properties' in page)
      .map((page) => ({
        id: page.id,
        question: this.getLocalizedText(page.properties, 'Question', locale),
        answer: this.getLocalizedText(page.properties, 'Answer', locale),
        category: this.getSelectValue(page.properties, 'Category') || 'general',
        order: this.getNumberValue(page.properties, 'Order') || 0,
      }));
  }

  async getTeamMembers(locale: Locale): Promise<TeamMember[]> {
    const databaseId = process.env.NOTION_TEAM_DB;
    if (!databaseId) {
      console.warn('NOTION_TEAM_DB not defined, returning empty array');
      return [];
    }

    const dataSourceId = await this.getDataSourceId(databaseId);
    const response = await this.client.dataSources.query({
      data_source_id: dataSourceId,
      sorts: [{ property: 'Order', direction: 'ascending' }],
    });

    return response.results
      .filter((page): page is NotionPage => 'properties' in page)
      .map((page) => ({
        id: page.id,
        name: this.getTitleText(page.properties, 'Name'),
        role: this.getLocalizedText(page.properties, 'Role', locale),
        bio: this.getLocalizedText(page.properties, 'Bio', locale),
        image: this.getFileUrl(page.properties, 'Image') || '',
        linkedin: this.getUrlValue(page.properties, 'LinkedIn'),
      }));
  }

  async getUpcomingEvents(locale: Locale): Promise<Event[]> {
    const databaseId = process.env.NOTION_EVENTS_DB;
    if (!databaseId) {
      console.warn('NOTION_EVENTS_DB not defined, returning empty array');
      return [];
    }

    const now = new Date().toISOString();
    const dataSourceId = await this.getDataSourceId(databaseId);

    const response = await this.client.dataSources.query({
      data_source_id: dataSourceId,
      filter: {
        property: 'Date',
        date: { on_or_after: now },
      },
      sorts: [{ property: 'Date', direction: 'ascending' }],
    });

    return response.results
      .filter((page): page is NotionPage => 'properties' in page)
      .map((page) => {
        const regType = this.getSelectValue(page.properties, 'RegistrationType')?.toLowerCase();
        return {
          id: page.id,
          title: this.getLocalizedText(page.properties, 'Title', locale),
          description: this.getLocalizedText(page.properties, 'Description', locale),
          date: new Date(this.getDateValue(page.properties, 'Date') || ''),
          location: this.getRichText(page.properties, 'Location'),
          image: this.getFileUrl(page.properties, 'Image'),
          capacity: this.getNumberValue(page.properties, 'Capacity'),
          registeredCount: this.getNumberValue(page.properties, 'RegisteredCount'),
          registrationType: (regType === 'whatsapp' || regType === 'forms') ? regType : null,
          registrationLink: this.getUrlValue(page.properties, 'RegistrationLink'),
        };
      });
  }

  async getPosts(locale: Locale, limit?: number): Promise<BlogPost[]> {
    const databaseId = process.env.NOTION_BLOG_DB;
    if (!databaseId) {
      console.warn('NOTION_BLOG_DB not defined, returning empty array');
      return [];
    }

    const dataSourceId = await this.getDataSourceId(databaseId);
    const response = await this.client.dataSources.query({
      data_source_id: dataSourceId,
      filter: {
        property: 'Published',
        checkbox: { equals: true },
      },
      sorts: [{ property: 'PublishedAt', direction: 'descending' }],
      page_size: limit,
    });

    return response.results
      .filter((page): page is NotionPage => 'properties' in page)
      .map((page) => ({
        id: page.id,
        slug: this.getRichText(page.properties, 'Slug'),
        title: this.getLocalizedText(page.properties, 'Title', locale),
        excerpt: this.getLocalizedText(page.properties, 'Excerpt', locale),
        content: '', // Content requires fetching blocks separately
        coverImage: this.getFileUrl(page.properties, 'CoverImage') || '',
        publishedAt: new Date(this.getDateValue(page.properties, 'PublishedAt') || ''),
        author: {
          id: '',
          name: this.getRichText(page.properties, 'AuthorName'),
          role: '',
          bio: '',
          image: '',
        },
      }));
  }

  // Helper methods for extracting Notion property values

  private getLocalizedText(
    properties: NotionProperties,
    field: string,
    locale: Locale
  ): string {
    const localizedField = `${field}_${locale.toUpperCase()}`;
    // Try localized field first, fall back to base field
    return (
      this.getRichText(properties, localizedField) ||
      this.getTitleText(properties, localizedField) ||
      this.getRichText(properties, field) ||
      this.getTitleText(properties, field)
    );
  }

  private getTitleText(properties: NotionProperties, field: string): string {
    const prop = properties[field];
    if (prop?.type === 'title') {
      return this.extractRichText(prop.title);
    }
    return '';
  }

  private getRichText(properties: NotionProperties, field: string): string {
    const prop = properties[field];
    if (prop?.type === 'rich_text') {
      return this.extractRichText(prop.rich_text);
    }
    return '';
  }

  private extractRichText(richText: RichTextItemResponse[]): string {
    return richText.map((t) => t.plain_text).join('');
  }

  private getSelectValue(properties: NotionProperties, field: string): string | undefined {
    const prop = properties[field];
    if (prop?.type === 'select') {
      return prop.select?.name;
    }
    return undefined;
  }

  private getNumberValue(properties: NotionProperties, field: string): number | undefined {
    const prop = properties[field];
    if (prop?.type === 'number') {
      return prop.number ?? undefined;
    }
    return undefined;
  }

  private getDateValue(properties: NotionProperties, field: string): string | undefined {
    const prop = properties[field];
    if (prop?.type === 'date') {
      return prop.date?.start;
    }
    return undefined;
  }

  private getUrlValue(properties: NotionProperties, field: string): string | undefined {
    const prop = properties[field];
    if (prop?.type === 'url') {
      return prop.url ?? undefined;
    }
    return undefined;
  }

  private getFileUrl(properties: NotionProperties, field: string): string | undefined {
    const prop = properties[field];
    if (prop?.type === 'files' && prop.files.length > 0) {
      const file = prop.files[0];
      if (file.type === 'file') {
        return file.file.url;
      } else if (file.type === 'external') {
        return file.external.url;
      }
    }
    return undefined;
  }
}
