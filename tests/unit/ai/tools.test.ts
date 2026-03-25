import { describe, it, expect } from 'vitest';
import { createTools } from '../../../src/ai/tools.js';

describe('createTools', () => {
  // We can't create a real page, but we can verify the tool structure
  // by creating tools with a mock context
  const mockCtx = {
    page: {} as any,
    screenshotDir: './screenshots',
    testName: 'test',
    stepCount: 0,
    onPageStateUpdate: () => {},
  };

  it('creates all 25 tools', () => {
    const tools = createTools(mockCtx);
    const toolNames = Object.keys(tools);
    expect(toolNames).toHaveLength(25);
  });

  it('includes all core action tools', () => {
    const tools = createTools(mockCtx);
    const names = Object.keys(tools);
    expect(names).toContain('navigate');
    expect(names).toContain('click');
    expect(names).toContain('type');
    expect(names).toContain('press_key');
    expect(names).toContain('scroll');
    expect(names).toContain('hover');
    expect(names).toContain('select_option');
    expect(names).toContain('check');
    expect(names).toContain('uncheck');
  });

  it('includes navigation tools', () => {
    const tools = createTools(mockCtx);
    expect(Object.keys(tools)).toContain('go_back');
    expect(Object.keys(tools)).toContain('go_forward');
  });

  it('includes assertion tools', () => {
    const tools = createTools(mockCtx);
    expect(Object.keys(tools)).toContain('assert_visible');
    expect(Object.keys(tools)).toContain('assert_url');
    expect(Object.keys(tools)).toContain('assert_text_contains');
  });

  it('includes wait tools', () => {
    const tools = createTools(mockCtx);
    expect(Object.keys(tools)).toContain('wait');
    expect(Object.keys(tools)).toContain('wait_for_element');
    expect(Object.keys(tools)).toContain('wait_for_network_idle');
  });

  it('includes control tools', () => {
    const tools = createTools(mockCtx);
    expect(Object.keys(tools)).toContain('screenshot');
    expect(Object.keys(tools)).toContain('drag_and_drop');
    expect(Object.keys(tools)).toContain('done');
  });

  it('done tool has no execute function', () => {
    const tools = createTools(mockCtx);
    expect(tools.done.execute).toBeUndefined();
  });

  it('all tools except done have execute functions', () => {
    const tools = createTools(mockCtx);
    for (const [name, t] of Object.entries(tools)) {
      if (name === 'done') continue;
      expect(t.execute, `${name} should have execute`).toBeDefined();
    }
  });

  it('all tools have descriptions', () => {
    const tools = createTools(mockCtx);
    for (const [name, t] of Object.entries(tools)) {
      expect(t.description, `${name} should have description`).toBeTruthy();
    }
  });
});
