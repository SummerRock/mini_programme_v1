/**
 * JSON 数据源格式校验测试
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4
 */

const healthTips = require('../../../data/health-tips.json');
const motivationalQuotes = require('../../../data/motivational-quotes.json');

describe('data/health-tips.json', () => {
  test('should be an array with at least 15 entries', () => {
    expect(Array.isArray(healthTips)).toBe(true);
    expect(healthTips.length).toBeGreaterThanOrEqual(15);
  });

  test('each entry should have id (string), title (string), content (string)', () => {
    healthTips.forEach((tip) => {
      expect(typeof tip.id).toBe('string');
      expect(typeof tip.title).toBe('string');
      expect(typeof tip.content).toBe('string');
    });
  });

  test('all ids should be unique', () => {
    const ids = healthTips.map((tip) => tip.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('data/motivational-quotes.json', () => {
  test('should be an array with at least 10 entries', () => {
    expect(Array.isArray(motivationalQuotes)).toBe(true);
    expect(motivationalQuotes.length).toBeGreaterThanOrEqual(10);
  });

  test('each entry should have id (string), text (string), author (string or null)', () => {
    motivationalQuotes.forEach((quote) => {
      expect(typeof quote.id).toBe('string');
      expect(typeof quote.text).toBe('string');
      expect(quote.author === null || typeof quote.author === 'string').toBe(true);
    });
  });

  test('all ids should be unique', () => {
    const ids = motivationalQuotes.map((quote) => quote.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
