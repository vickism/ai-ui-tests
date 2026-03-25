import { describe, expect, it } from 'vitest'
import { TestDataSession } from '../../../src/test-data/session.js'

describe('TestDataSession', () => {
  it('generates and resolves aliased values', () => {
    const session = new TestDataSession('Create borrower', { seed: 12345 })

    const result = session.generate('borrower', [
      { key: 'fullName', kind: 'person.fullName', prefix: 'QA Borrower', unique: true },
      { key: 'email', kind: 'internet.email', domain: 'test.local', unique: true },
    ])

    expect(result.alias).toBe('borrower')
    expect(result.createdKeys).toEqual(['fullName', 'email'])
    expect(result.values.fullName).toContain('QA Borrower')
    expect(result.values.fullName).toContain(result.runId)
    expect(result.values.email).toContain('@test.local')
    expect(session.resolve('borrower.fullName')).toBe(result.values.fullName)
    expect(session.resolve('borrower.email')).toBe(result.values.email)
  })

  it('reuses existing values when the same alias and key are requested again', () => {
    const session = new TestDataSession('Create borrower', { seed: 12345 })

    const first = session.generate('borrower', [{ key: 'fullName', kind: 'person.fullName', unique: true }])
    const second = session.generate('borrower', [
      { key: 'fullName', kind: 'person.fullName', unique: true },
      { key: 'email', kind: 'internet.email', unique: true },
    ])

    expect(second.reusedKeys).toEqual(['fullName'])
    expect(second.createdKeys).toEqual(['email'])
    expect(second.values.fullName).toBe(first.values.fullName)
  })

  it('throws on unknown references', () => {
    const session = new TestDataSession('Create borrower', { seed: 12345 })

    expect(() => session.resolve('borrower.fullName')).toThrow('Unknown test data alias')
  })
})
