import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '../../../src/ai/prompt.js';

describe('buildSystemPrompt', () => {
  it('includes agent identity', () => {
    const prompt = buildSystemPrompt('');
    expect(prompt).toContain('You are Synth');
    expect(prompt).toContain('QA testing agent');
  });

  it('includes rules for the agent', () => {
    const prompt = buildSystemPrompt('');
    expect(prompt).toContain('ONE action at a time');
    expect(prompt).toContain('done');
  });

  it('includes selector tips', () => {
    const prompt = buildSystemPrompt('');
    expect(prompt).toContain('Element Selection Tips');
    expect(prompt).toContain('ARIA roles');
  });

  it('includes app context when provided', () => {
    const prompt = buildSystemPrompt('My app has a /login page and a /dashboard.');
    expect(prompt).toContain('App Context');
    expect(prompt).toContain('/login');
    expect(prompt).toContain('/dashboard');
  });

  it('omits app context section when empty', () => {
    const prompt = buildSystemPrompt('');
    expect(prompt).not.toContain('App Context');
  });

  it('instructs user-perspective testing', () => {
    const prompt = buildSystemPrompt('');
    expect(prompt).toContain("USER's perspective");
  });
});
