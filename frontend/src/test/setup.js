import '@testing-library/jest-dom/vitest';

beforeEach(() => {
    localStorage.clear();
});

window.scrollTo = vi.fn();
