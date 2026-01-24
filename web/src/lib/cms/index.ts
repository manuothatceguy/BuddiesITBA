import { CMSClient, FAQ, TeamMember, Event, BlogPost } from './types';
import { Locale } from '@/i18n/config';

// Mock implementation - will be replaced with Notion
class MockCMS implements CMSClient {
  async getFAQs(locale: Locale): Promise<FAQ[]> {
    return [
      {
        id: '1',
        question: locale === 'es' ? '¿Qué es Buddies ITBA?' : 'What is Buddies ITBA?',
        answer: locale === 'es'
          ? 'Somos una organización estudiantil que conecta estudiantes locales con estudiantes de intercambio.'
          : 'We are a student organization that connects local students with exchange students.',
        category: 'general',
        order: 1
      }
    ];
  }

  async getTeamMembers(_locale: Locale): Promise<TeamMember[]> {
    return [];
  }

  async getUpcomingEvents(_locale: Locale): Promise<Event[]> {
    return [];
  }

  async getPosts(_locale: Locale, _limit?: number): Promise<BlogPost[]> {
    return [];
  }
}

export const cms: CMSClient = new MockCMS();

export * from './types';
