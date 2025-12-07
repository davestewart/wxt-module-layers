import { inspect } from 'node:util'
import pc from 'picocolors'
import { Wxt } from 'wxt'

const LOG_TYPES = [
  'error',
  'warn',
  'log',
  'info',
  'debug',
  'success',
  'trace'
] as const

export const LOG_LEVEL = {
  error: 0,
  warn: 1,
  log: 2,
  info: 3,
  success: 3,
  fail: 3,
  ready: 3,
  start: 3,
  debug: 4,
  trace: 5
} as const

export type LogLevel = keyof typeof LOG_LEVEL

export type LogType = typeof LOG_TYPES[number]

type Logger = Wxt['logger']

function indent (str: string, spaces = 2): string {
  const indent = ' '.repeat(spaces)
  return '\n' + str
    .trim()
    .split('\n')
    .map(line => indent + line)
    .join('\n')
}

function getLabelPrefix (label: string, method: LogType, logLevel: LogLevel): string {
  const index = LOG_LEVEL[logLevel]
  if (index >= 4) {
    const prefix = pc.dim(`[${label}]`)
    return `${method === 'log' ? '  ' : ''}${prefix} `
  }
  return ''
}

function getFormattedArgs (args: unknown[], type: LogType): unknown[] {
  const settings = { depth: null, colors: true, compact: false }
  return args.map(arg =>
    typeof arg === 'string'
      ? arg
      : indent(inspect(arg, settings), type === 'log' ? 4 : 6)
  )
}

/**
 * Makes a copy of the WXT logger with a prefix and log level
 *
 * @param wxt
 * @param label
 * @param level
 */
export function createLogger (wxt: Wxt, label = '', level: LogLevel = 'info'): Logger {
  function wrapLoggerMethod(logger: any, type: LogType): void {
    const originalFn = logger[type].bind(logger)
    logger[type] = (message: string, ...args: unknown[]) => {
      const formattedArgs = getFormattedArgs(args, type)
      const prefix = getLabelPrefix(label, type, level)
      originalFn(`${prefix}${message}`, ...formattedArgs)
    }
  }

  const logger: Logger = (wxt.logger as any).create({ level })

  LOG_TYPES.forEach(type => {
    wrapLoggerMethod(logger, type)
  })

  return logger
}
