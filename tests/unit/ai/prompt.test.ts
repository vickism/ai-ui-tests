import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '../../../src/ai/prompt.js';

describe('buildSystemPrompt', () => {
  it('includes agent identity', () => {
    const prompt = buildSystemPrompt('');
    expect(prompt).toContain('You are Synth');
    expect(prompt).toContain('QA testing agent');
  });

  it('includes the phased approach', () => {
    const prompt = buildSystemPrompt('');
    expect(prompt).toContain('Phase 1');
    expect(prompt).toContain('Phase 2');
    expect(prompt).toContain('Phase 3');
    expect(prompt).toContain('Phase 4');
  });

  it('includes action rules', () => {
    const prompt = buildSystemPrompt('');
    expect(prompt).toContain('ONE action at a time');
    expect(prompt).toContain('done');
  });

  it('includes element verification guidance', () => {
    const prompt = buildSystemPrompt('');
    expect(prompt).toContain('confirm the target element exists');
    expect(prompt).toContain('Element Selection');
    expect(prompt).toContain('ARIA roles');
  });

  it('includes form data guidance', () => {
    const prompt = buildSystemPrompt('');
    expect(prompt).toContain('dummy data');
    expect(prompt).toContain('QA');
    expect(prompt).toContain('timestamp');
  });

  it('includes error recovery strategy', () => {
    const prompt = buildSystemPrompt('');
    expect(prompt).toContain('Error Recovery');
    expect(prompt).toContain('Retry once');
    expect(prompt).toContain('blocker');
  });

  it('includes assertion guidance', () => {
    const prompt = buildSystemPrompt('');
    expect(prompt).toContain('Assert the Result');
    expect(prompt).toContain('assert_visible');
    expect(prompt).toContain('evidence');
  });

  it('includes structured report guidance', () => {
    const prompt = buildSystemPrompt('');
    expect(prompt).toContain('PASS');
    expect(prompt).toContain('FAIL');
    expect(prompt).toContain('evidence');
  });

  it('includes thinking out loud instructions', () => {
    const prompt = buildSystemPrompt('');
    expect(prompt).toContain('Thinking Out Loud');
    expect(prompt).toContain('reasoning');
  });

  it('includes app context when provided', () => {
    const prompt = buildSystemPrompt('My app has a /login page and a /dashboard.');
    expect(prompt).toContain('The following describes the application');
    expect(prompt).toContain('/login');
    expect(prompt).toContain('/dashboard');
  });

  it('omits app context section when empty', () => {
    const prompt = buildSystemPrompt('');
    expect(prompt).not.toContain('The following describes the application');
  });

  it('includes SPA navigation guidance', () => {
    const prompt = buildSystemPrompt('');
    expect(prompt).toContain('SPA navigation');
    expect(prompt).toContain('prefer clicking nav links');
  });

  it('includes remembered selectors when memory provided', () => {
    const memory = [
      {
        elementDescription: 'login button',
        selector: 'Sign In',
        strategy: 'text' as const,
        action: 'click',
        pageUrl: '/login',
        confidence: 0.9,
        lastUsed: new Date().toISOString(),
        useCount: 5,
      },
    ];
    const prompt = buildSystemPrompt('', memory);
    expect(prompt).toContain('Remembered Selectors');
    expect(prompt).toContain('login button');
    expect(prompt).toContain('Sign In');
    expect(prompt).toContain('90%');
  });

  it('omits remembered selectors when memory is empty', () => {
    const prompt = buildSystemPrompt('', []);
    expect(prompt).not.toContain('Remembered Selectors');
  });

  it('omits remembered selectors when memory is undefined', () => {
    const prompt = buildSystemPrompt('');
    expect(prompt).not.toContain('Remembered Selectors');
  });
});
