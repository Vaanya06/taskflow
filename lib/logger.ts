export function log(message: string, data?: unknown) {
  console.log({
    time: new Date(),
    message,
    data
  })
}