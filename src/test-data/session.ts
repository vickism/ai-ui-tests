import { Faker, base, en } from '@faker-js/faker'
import { randomInt } from 'node:crypto'

export const TEST_DATA_KINDS = [
  'person.firstName',
  'person.lastName',
  'person.fullName',
  'company.name',
  'internet.email',
  'phone.number',
  'date.future',
  'date.birthdateAdult',
  'number.int',
  'finance.amount',
  'location.streetAddress',
  'location.city',
  'location.zipCode',
  'string.uuid',
  'lorem.words',
] as const

export type TestDataKind = (typeof TEST_DATA_KINDS)[number]

export interface TestDataFieldSpec {
  key: string
  kind: TestDataKind
  unique?: boolean
  prefix?: string
  suffix?: string
  domain?: string
  min?: number
  max?: number
  decimals?: number
}

export interface GeneratedTestData {
  alias: string
  createdKeys: string[]
  reusedKeys: string[]
  runId: string
  seed: number
  values: Record<string, string>
}

export class TestDataSession {
  private readonly faker: Faker
  private readonly aliases = new Map<string, Record<string, string>>()
  private uniqueCounter = 0

  readonly runId: string
  readonly seed: number

  constructor(_testName: string, options: { seed?: number } = {}) {
    this.seed = options.seed ?? randomInt(1, 2147483646)
    this.runId = `t${this.seed.toString(36).padStart(6, '0').slice(-6)}`
    this.faker = new Faker({ locale: [en, base] })
    this.faker.seed(this.seed)
  }

  generate(alias: string, fields: TestDataFieldSpec[]): GeneratedTestData {
    const aliasName = validateRefPart(alias, 'Alias')
    const existing = this.aliases.get(aliasName) ?? {}
    const values = { ...existing }
    const createdKeys: string[] = []
    const reusedKeys: string[] = []

    for (const field of fields) {
      const key = validateRefPart(field.key, 'Field key')
      if (values[key]) {
        reusedKeys.push(key)
        continue
      }

      values[key] = this.generateValue(field)
      createdKeys.push(key)
    }

    this.aliases.set(aliasName, values)

    return {
      alias: aliasName,
      createdKeys,
      reusedKeys,
      runId: this.runId,
      seed: this.seed,
      values,
    }
  }

  resolve(ref: string): string {
    const [alias, key, ...rest] = ref.split('.')
    if (!alias || !key || rest.length > 0) {
      throw new Error(`Invalid test data reference "${ref}". Expected "alias.field".`)
    }

    const record = this.aliases.get(alias)
    if (!record) {
      throw new Error(`Unknown test data alias "${alias}".`)
    }

    const value = record[key]
    if (!value) {
      throw new Error(`Unknown test data field "${ref}".`)
    }

    return value
  }

  private generateValue(field: TestDataFieldSpec): string {
    switch (field.kind) {
      case 'person.firstName':
        return this.decorateText(this.faker.person.firstName(), field)

      case 'person.lastName':
        return this.decorateText(this.faker.person.lastName(), field)

      case 'person.fullName':
        return this.decorateText(this.faker.person.fullName(), field)

      case 'company.name':
        return this.decorateText(this.faker.company.name(), field)

      case 'internet.email':
        return this.generateEmail(field)

      case 'phone.number':
        return this.faker.phone.number({ style: 'international' })

      case 'date.future': {
        const date = this.faker.date.future({ years: 2 })
        if (field.unique) {
          date.setDate(date.getDate() + this.nextUniqueCounter())
        }
        return formatDate(date)
      }

      case 'date.birthdateAdult': {
        const date = this.faker.date.birthdate({ mode: 'age', min: 18, max: 80 })
        if (field.unique) {
          date.setDate(date.getDate() - this.nextUniqueCounter())
        }
        return formatDate(date)
      }

      case 'number.int': {
        const min = field.min ?? 1
        const max = field.max ?? 99999
        if (field.unique) {
          const counter = this.nextUniqueCounter()
          if (counter > max - min) {
            throw new Error(
              `Cannot generate unique number.int: range [${min}, ${max}] is exhausted after ${counter} calls. Widen the range or remove unique: true.`,
            )
          }
          return String(this.faker.number.int({ min, max: max - counter }) + counter)
        }
        return String(this.faker.number.int({ min, max }))
      }

      case 'finance.amount': {
        const min = field.min ?? 1000
        const max = field.max ?? 100000
        const decimals = field.decimals ?? 0
        if (field.unique) {
          const counter = this.nextUniqueCounter()
          if (counter > max - min) {
            throw new Error(
              `Cannot generate unique finance.amount: range [${min}, ${max}] is exhausted after ${counter} calls. Widen the range or remove unique: true.`,
            )
          }
          const amount = Number(this.faker.finance.amount({ min, max: max - counter, dec: decimals }))
          return (amount + counter).toFixed(decimals)
        }
        return Number(this.faker.finance.amount({ min, max, dec: decimals })).toFixed(decimals)
      }

      case 'location.streetAddress':
        return this.decorateText(this.faker.location.streetAddress(), field)

      case 'location.city':
        return this.decorateText(this.faker.location.city(), field)

      case 'location.zipCode':
        return this.faker.location.zipCode()

      case 'string.uuid':
        return this.faker.string.uuid()

      case 'lorem.words':
        return this.decorateText(this.faker.lorem.words({ min: 2, max: 4 }), field)
    }
  }

  private decorateText(value: string, field: TestDataFieldSpec): string {
    const parts = [field.prefix?.trim(), value.trim(), field.suffix?.trim()].filter(Boolean)
    let result = parts.join(' ')

    if (field.unique) {
      result = `${result} ${this.nextUniqueToken()}`
    }

    return result.trim()
  }

  private generateEmail(field: TestDataFieldSpec): string {
    const firstName = this.faker.person.firstName()
    const lastName = this.faker.person.lastName()
    const provider = field.domain ?? 'test.local'
    const email = this.faker.internet.email({ firstName, lastName, provider }).toLowerCase()

    if (!field.unique) {
      return email
    }

    const atIndex = email.indexOf('@')
    const uniqueToken = this.nextUniqueToken()
    if (atIndex === -1) {
      return `${email}.${uniqueToken}`
    }

    return `${email.slice(0, atIndex)}+${uniqueToken}${email.slice(atIndex)}`
  }

  private nextUniqueCounter(): number {
    this.uniqueCounter += 1
    return this.uniqueCounter
  }

  private nextUniqueToken(): string {
    return `${this.runId}-${String(this.nextUniqueCounter()).padStart(2, '0')}`
  }
}

function validateRefPart(value: string, label: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    throw new Error(`${label} is required.`)
  }

  if (trimmed.includes('.')) {
    throw new Error(`${label} must not contain ".".`)
  }

  return trimmed
}

function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10)
}
