import { QUEUE_NAMES } from '../types';
import type { QueueName } from '../types';

describe('QUEUE_NAMES', () => {
  it('defines all 5 queues', () => {
    expect(Object.keys(QUEUE_NAMES)).toHaveLength(5);
  });

  it('has correct scrape:high name', () => {
    expect(QUEUE_NAMES.SCRAPE_HIGH).toBe('scrape:high');
  });

  it('has correct scrape:standard name', () => {
    expect(QUEUE_NAMES.SCRAPE_STANDARD).toBe('scrape:standard');
  });

  it('has correct scrape:low name', () => {
    expect(QUEUE_NAMES.SCRAPE_LOW).toBe('scrape:low');
  });

  it('has correct embed:process name', () => {
    expect(QUEUE_NAMES.EMBED_PROCESS).toBe('embed:process');
  });

  it('has correct webhook:deliver name', () => {
    expect(QUEUE_NAMES.WEBHOOK_DELIVER).toBe('webhook:deliver');
  });

  it('all queue names are unique', () => {
    const values = Object.values(QUEUE_NAMES);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });

  it('all queue names follow namespace:action pattern', () => {
    for (const name of Object.values(QUEUE_NAMES)) {
      expect(name).toMatch(/^[a-z]+:[a-z]+$/);
    }
  });
});
