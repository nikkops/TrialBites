//Sample Trials before any backend connections or setups
export const trials = [
  {
    id: 'trial-1',
    foodName: 'Oatmeal',
    startDate: '2026-09-18',
    status: 'active',
    symptoms: [
      {
        id: 'symptom-1',
        date: '2026-09-19',
        severity: 2,
        notes: 'Mild stomach discomfort after breakfast.',
      },
    ],
  },
  {
    id: 'trial-2',
    foodName: 'Blueberries',
    startDate: '2026-08-25',
    status: 'safe',
    symptoms: [],
  },
  {
    id: 'trial-3',
    foodName: 'Almonds',
    startDate: '2026-08-04',
    status: 'unsafe',
    symptoms: [
      {
        id: 'symptom-2',
        date: '2026-08-05',
        severity: 7,
        notes: 'Itchy throat and skin irritation.',
      },
    ],
  },
]
