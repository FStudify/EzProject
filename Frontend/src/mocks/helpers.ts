export const daysFromNow = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

export const hoursFromNow = (hours: number): string => {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  return d.toISOString();
};

export const hoursAgo = (hours: number): string => {
  const d = new Date();
  d.setHours(d.getHours() - hours);
  return d.toISOString();
};
