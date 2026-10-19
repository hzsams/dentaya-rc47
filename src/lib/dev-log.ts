export function devError(
  ...args: unknown[]
) {
  if (
    process.env.NODE_ENV !==
    "production"
  ) {
    console.error(...args);
  }
}
