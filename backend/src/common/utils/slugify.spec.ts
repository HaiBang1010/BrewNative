import { slugify } from './slugify.js';

describe('slugify', () => {
  it('removes Vietnamese diacritics', () => {
    expect(slugify('Cà phê sữa đá')).toBe('ca-phe-sua-da');
    expect(slugify('Đồ uống ĐẶC BIỆT')).toBe('do-uong-dac-biet');
  });

  it('collapses separators and trims dashes', () => {
    expect(slugify('  Trà -- Trái cây!! ')).toBe('tra-trai-cay');
  });
});
