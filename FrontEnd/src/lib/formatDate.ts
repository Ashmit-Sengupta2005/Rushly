// One formatter instance (constructing Intl.DateTimeFormat is relatively costly)
const dateTimeFormat = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/** "1 Oct 2026, 4:35 pm" */
export function formatDate(iso: string): string {
  return dateTimeFormat.format(new Date(iso));
}
