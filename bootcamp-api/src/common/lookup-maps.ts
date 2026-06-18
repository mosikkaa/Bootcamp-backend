export const WEEKLY_SCHEDULE_MAP: Record<
  number,
  { label: string; days: [string, string] }
> = {
  1: { label: 'Mon - Wed', days: ['Monday', 'Wednesday'] },
  2: { label: 'Tue - Thu', days: ['Tuesday', 'Thursday'] },
  3: { label: 'Fri - Sat', days: ['Friday', 'Saturday'] },
  4: { label: 'Sat - Sun', days: ['Saturday', 'Sunday'] },
};

export const TIME_SLOT_MAP: Record<
  number,
  { label: string; startTime: string; endTime: string; display12h: string }
> = {
  1: {
    label: '(9:00 AM - 11:00 AM)',
    startTime: '09:00',
    endTime: '11:00',
    display12h: '9:00 AM - 11:00 AM',
  },
  2: {
    label: '(2:00 PM - 4:00 PM)',
    startTime: '14:00',
    endTime: '16:00',
    display12h: '2:00 PM - 4:00 PM',
  },
  3: {
    label: '(6:00 PM - 8:00 PM)',
    startTime: '18:00',
    endTime: '20:00',
    display12h: '6:00 PM - 8:00 PM',
  },
};
