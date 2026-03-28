/**
 * Tests for new structured data additions — webSiteJsonLd.
 */
import { webSiteJsonLd, organizationJsonLd, breadcrumbJsonLd } from '@/lib/structured-data';

describe('webSiteJsonLd', () => {
  const result = webSiteJsonLd();

  it('has @context set to schema.org', () => {
    expect(result['@context']).toBe('https://schema.org');
  });

  it('has @type WebSite', () => {
    expect(result['@type']).toBe('WebSite');
  });

  it('has name HireMatch', () => {
    expect(result.name).toBe('HireMatch');
  });

  it('has a url', () => {
    expect(result.url).toBeTruthy();
    expect(typeof result.url).toBe('string');
  });

  it('has description', () => {
    expect(result.description).toBeTruthy();
  });

  it('has SearchAction potentialAction', () => {
    expect(result.potentialAction).toBeDefined();
    expect(result.potentialAction['@type']).toBe('SearchAction');
  });

  it('SearchAction target has EntryPoint with urlTemplate', () => {
    const target = result.potentialAction.target;
    expect(target['@type']).toBe('EntryPoint');
    expect(target.urlTemplate).toContain('{search_term_string}');
  });

  it('SearchAction has query-input', () => {
    expect(result.potentialAction['query-input']).toContain('search_term_string');
  });
});

describe('organizationJsonLd', () => {
  const result = organizationJsonLd();

  it('has @type Organization', () => {
    expect(result['@type']).toBe('Organization');
  });

  it('has name HireMatch', () => {
    expect(result.name).toBe('HireMatch');
  });
});

describe('breadcrumbJsonLd', () => {
  const result = breadcrumbJsonLd([
    { name: 'Home', url: 'https://www.hirematch.com' },
    { name: 'Blog', url: 'https://www.hirematch.com/blog' },
    { name: 'Post', url: 'https://www.hirematch.com/blog/test' },
  ]);

  it('has @type BreadcrumbList', () => {
    expect(result['@type']).toBe('BreadcrumbList');
  });

  it('has correct number of items', () => {
    expect(result.itemListElement).toHaveLength(3);
  });

  it('items have sequential positions starting at 1', () => {
    result.itemListElement.forEach((item: { position: number }, i: number) => {
      expect(item.position).toBe(i + 1);
    });
  });
});
