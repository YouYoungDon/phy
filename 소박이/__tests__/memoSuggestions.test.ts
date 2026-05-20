import { appendMemoSuggestion } from '../src/components/expense/MemoSuggestions';

describe('appendMemoSuggestion', () => {
  it('returns the suggestion when memo is empty', () => {
    expect(appendMemoSuggestion('', '라떼')).toBe('라떼');
  });

  it('returns the suggestion when memo is whitespace only', () => {
    expect(appendMemoSuggestion('   ', '라떼')).toBe('라떼');
  });

  it('appends with ", " separator when memo has content', () => {
    expect(appendMemoSuggestion('아메리카노', '디저트')).toBe('아메리카노, 디저트');
  });

  it('trims trailing whitespace before appending', () => {
    expect(appendMemoSuggestion('라떼 ', '디저트')).toBe('라떼, 디저트');
  });

  it('returns original memo when suggestion is already present as a comma-separated token', () => {
    expect(appendMemoSuggestion('아메리카노, 디저트', '디저트')).toBe('아메리카노, 디저트');
  });

  it('returns original memo when appending would exceed 60 chars', () => {
    const long = '아'.repeat(58); // 58 chars
    // Appending ", 라떼" would push to 58 + 4 = 62 chars
    expect(appendMemoSuggestion(long, '라떼')).toBe(long);
  });

  it('allows append that lands exactly at 60 chars', () => {
    // Build a memo where memo.trim() + ', ' + '라떼' === 60 chars
    // '라떼' is 2 chars. ', ' is 2 chars. So memo needs to be 56 chars to land at 60.
    const memo = '아'.repeat(56);
    const result = appendMemoSuggestion(memo, '라떼');
    expect(result.length).toBe(60);
    expect(result).toBe(`${memo}, 라떼`);
  });
});
