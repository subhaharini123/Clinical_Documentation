import { TranscriptLine, SoapNote } from '../types/clinical';

export interface DemoConsultation {
  id: string;
  title: string;
  subtitle: string;
  patientName: string;
  patientId: string;
  age: number;
  gender: string;
  language: 'English' | 'Tamil' | 'Tanglish';
  description: string;
  transcript: TranscriptLine[];
  precomputedSoapNote: SoapNote;
}

export const DEMO_CONSULTATIONS: DemoConsultation[] = [
  {
    id: 'demo-tanglish-fever',
    title: 'Consultation 1: Acute Febrile Illness (Tanglish)',
    subtitle: 'Tanglish code-switching, Penicillin allergy & Paracetamol',
    patientName: 'Ramesh Kumar',
    patientId: 'SYN-8492',
    age: 34,
    gender: 'Male',
    language: 'Tanglish',
    description: 'Patient speaks Tanglish (Tamil + English code-switching). Reports 3-day fever and headache, denies chest pain, notes Penicillin allergy. Doctor prescribes Paracetamol 500 mg TDS.',
    transcript: [
      { id: 'L1', speaker: 'Doctor', text: 'Enna problem sollunga?', confidence: 'high' },
      { id: 'L2', speaker: 'Patient', text: '3 naala fever irukku, thalaivali um irukku.', confidence: 'high' },
      { id: 'L3', speaker: 'Patient', text: 'Chest pain illa. Penicillin allergy irukku.', confidence: 'high' },
      { id: 'L4', speaker: 'Doctor', text: 'Temperature 101 F, BP 120/80. Throat konjam red.', confidence: 'high' },
      { id: 'L5', speaker: 'Doctor', text: 'Paracetamol 500 mg, naalaikku moonu time saapdunga.', confidence: 'high' },
      { id: 'L6', speaker: 'Doctor', text: '5 naal apram vaanga.', confidence: 'high' }
    ],
    precomputedSoapNote: {
      soap: {
        S: [
          {
            id: 's1',
            text: 'Patient presents with fever and headache lasting for 3 days ("3 naala fever irukku, thalaivali um irukku").',
            evidence: ['L2'],
            flags: []
          },
          {
            id: 's2',
            text: 'Explicitly denies chest pain ("Chest pain illa").',
            evidence: ['L3'],
            flags: [
              {
                id: 'flag-neg-1',
                type: 'Negation',
                reason: 'Patient specifically confirmed absence of chest pain (Tanglish: "Chest pain illa"). Verify negation integrity.',
                severity: 'red',
                confirmed: false
              }
            ]
          },
          {
            id: 's3',
            text: 'Reports known allergy to Penicillin ("Penicillin allergy irukku").',
            evidence: ['L3'],
            flags: [
              {
                id: 'flag-allergy-1',
                type: 'Allergy',
                reason: 'Documented Penicillin allergy. Beta-lactam antibiotics are strictly contraindicated.',
                severity: 'red',
                confirmed: false
              }
            ]
          }
        ],
        O: [
          {
            id: 'o1',
            text: 'Temperature recorded at 101 °F; Blood Pressure is 120/80 mmHg.',
            evidence: ['L4'],
            flags: [
              {
                id: 'flag-vitals-1',
                type: 'Number/Vitals',
                reason: 'Febrile temperature (101 °F) and baseline BP (120/80 mmHg).',
                severity: 'amber',
                confirmed: false
              }
            ]
          },
          {
            id: 'o2',
            text: 'Oropharyngeal exam: Mild erythema present ("Throat konjam red").',
            evidence: ['L4'],
            flags: []
          }
        ],
        A: [
          // Doctor did not state a formal diagnosis in the dialogue!
          // AI must NEVER invent a diagnosis - leaves assessment empty with placeholder.
        ],
        P: [
          {
            id: 'p1',
            text: 'Prescribed Paracetamol 500 mg orally three times daily ("naalaikku moonu time saapdunga").',
            evidence: ['L5'],
            flags: [
              {
                id: 'flag-med-1',
                type: 'Medicine/Dose',
                reason: 'Verify Paracetamol dose (500 mg) and dosing interval (TDS / 3 times daily).',
                severity: 'red',
                confirmed: false
              }
            ]
          },
          {
            id: 'p2',
            text: 'Patient advised to return for clinical follow-up in 5 days ("5 naal apram vaanga").',
            evidence: ['L6'],
            flags: []
          }
        ]
      },
      medications: [
        {
          id: 'med-1',
          name: 'Paracetamol',
          dose: '500 mg',
          frequency: 'Three times daily (TDS)',
          duration: '5 days',
          evidence: ['L5']
        }
      ],
      followUp: {
        text: 'Review in clinic in 5 days, or sooner if fever spikes or warning symptoms develop.',
        evidence: ['L6']
      },
      missingInfo: [
        'Doctor did not state a definitive or differential diagnosis during the encounter.',
        'Hydration advice and warning signs (red flags) were not explicitly spoken.'
      ]
    }
  },
  {
    id: 'demo-english-htn',
    title: 'Consultation 2: Hypertension Management (English)',
    subtitle: 'Amlodipine dose escalation & Look-alike drug safeguard',
    patientName: 'Rajesh Sharma',
    patientId: 'SYN-6104',
    age: 58,
    gender: 'Male',
    language: 'English',
    description: 'Hypertension follow-up. Doctor adjusts Amlodipine from 5 mg to 10 mg daily. Critical safety check flags look-alike drug pair Amlodipine vs Amiodarone.',
    transcript: [
      { id: 'L1', speaker: 'Doctor', text: 'Good morning Mr. Rajesh, how have you been since your last visit?', confidence: 'high' },
      { id: 'L2', speaker: 'Patient', text: 'Morning doctor. Feeling mostly fine, no dizzy spells, but ankles get slightly swollen in the evening.', confidence: 'high' },
      { id: 'L3', speaker: 'Doctor', text: "Let's check vitals. Blood pressure is 142/88 mmHg, pulse 74 bpm. Weight is 78 kg.", confidence: 'high' },
      { id: 'L4', speaker: 'Patient', text: 'I have been taking Amlodipine 5 mg once daily without missing doses. No chest pain or shortness of breath.', confidence: 'high' },
      { id: 'L5', speaker: 'Doctor', text: 'Blood pressure is still slightly elevated. We will increase Amlodipine to 10 mg once daily in the morning.', confidence: 'high' },
      { id: 'L6', speaker: 'Doctor', text: 'Be careful not to confuse Amlodipine with Amiodarone, which is for heart arrhythmias. Reduce dietary salt intake.', confidence: 'medium' },
      { id: 'L7', speaker: 'Doctor', text: 'Repeat serum electrolytes and renal function tests in 2 weeks. See me in 4 weeks.', confidence: 'high' }
    ],
    precomputedSoapNote: {
      soap: {
        S: [
          {
            id: 's1',
            text: 'Patient attends follow-up for chronic hypertension. Denies dizziness; reports mild bilateral evening ankle edema.',
            evidence: ['L2'],
            flags: [
              {
                id: 'flag-neg-2a',
                type: 'Negation',
                reason: 'Patient confirmed no dizzy spells ("no dizzy spells"). Verify absence of postural hypotension.',
                severity: 'red',
                confirmed: false
              }
            ]
          },
          {
            id: 's2',
            text: 'Current regimen: Amlodipine 5 mg once daily with full adherence. Denies chest pain or shortness of breath.',
            evidence: ['L4'],
            flags: [
              {
                id: 'flag-neg-2b',
                type: 'Negation',
                reason: 'Patient explicitly stated "No chest pain or shortness of breath". Negative cardiovascular symptoms.',
                severity: 'red',
                confirmed: false
              }
            ]
          }
        ],
        O: [
          {
            id: 'o1',
            text: 'Vitals: Blood pressure 142/88 mmHg (sub-optimally controlled), pulse 74 bpm, weight 78 kg.',
            evidence: ['L3'],
            flags: [
              {
                id: 'flag-vitals-2',
                type: 'Number/Vitals',
                reason: 'BP is 142/88 mmHg, pulse 74 bpm, weight 78 kg.',
                severity: 'amber',
                confirmed: false
              }
            ]
          }
        ],
        A: [
          {
            id: 'a1',
            text: 'Sub-optimally controlled hypertension on monotherapy.',
            evidence: ['L5'],
            flags: []
          }
        ],
        P: [
          {
            id: 'p1',
            text: 'Increase Amlodipine dose from 5 mg to 10 mg orally once daily in the morning.',
            evidence: ['L5'],
            flags: [
              {
                id: 'flag-med-2a',
                type: 'Medicine/Dose',
                reason: 'Dose escalation from 5 mg to 10 mg. Monitor for increased peripheral edema.',
                severity: 'red',
                confirmed: false
              }
            ]
          },
          {
            id: 'p2',
            text: 'Counselled on Look-Alike Sound-Alike (LASA) safety: cautioned patient not to confuse Amlodipine (antihypertensive) with Amiodarone (antiarrhythmic). Advised dietary sodium restriction.',
            evidence: ['L6'],
            flags: [
              {
                id: 'flag-med-2b',
                type: 'Medicine/Dose',
                reason: 'Look-Alike Sound-Alike alert: Amlodipine vs Amiodarone. High-risk medication safety pairing.',
                severity: 'red',
                confirmed: false
              },
              {
                id: 'flag-conf-2',
                type: 'Low audio confidence',
                reason: 'Cited line L6 was marked medium audio confidence.',
                severity: 'amber',
                confirmed: false
              }
            ]
          },
          {
            id: 'p3',
            text: 'Order repeat serum electrolytes and renal function tests (RFT) in 2 weeks.',
            evidence: ['L7'],
            flags: []
          }
        ]
      },
      medications: [
        {
          id: 'med-2',
          name: 'Amlodipine',
          dose: '10 mg',
          frequency: 'Once daily (morning)',
          duration: '30 days',
          evidence: ['L5']
        }
      ],
      followUp: {
        text: 'Follow-up appointment in 4 weeks with home BP log and lab results.',
        evidence: ['L7']
      },
      missingInfo: [
        'Home blood pressure log measurements were not recorded during this encounter.'
      ]
    }
  },
  {
    id: 'demo-allergic-rhinitis',
    title: 'Consultation 3: Allergic Rhinitis (English with Tamil Accent)',
    subtitle: 'Sulfa allergy safeguard, Cetirizine & Saline spray',
    patientName: 'Priya Sundaram',
    patientId: 'SYN-3921',
    age: 29,
    gender: 'Female',
    language: 'English',
    description: 'Patient presents with severe rhinitis and throat itching. Discloses severe Sulfa drug allergy resulting in prior skin rash. Prescribed Cetirizine and saline nasal spray.',
    transcript: [
      { id: 'L1', speaker: 'Doctor', text: 'Vanakkam Mrs. Priya, what brings you in today?', confidence: 'high' },
      { id: 'L2', speaker: 'Patient', text: 'Doctor, severe sneezing and runny nose for one week, throat itching also there.', confidence: 'high' },
      { id: 'L3', speaker: 'Patient', text: 'No fever, no wheezing. But I have severe allergy to Sulfa drugs, got skin rash last year.', confidence: 'high' },
      { id: 'L4', speaker: 'Doctor', text: 'Examination shows clear chest, nasal mucosa pale and boggy, temperature normal at 98.4 F.', confidence: 'high' },
      { id: 'L5', speaker: 'Doctor', text: 'Diagnosis is allergic rhinitis. I will prescribe Cetirizine 10 mg once at night for 7 days.', confidence: 'high' },
      { id: 'L6', speaker: 'Doctor', text: 'Also use normal saline nasal spray two puffs both nostrils twice daily. Avoid cold exposure.', confidence: 'high' },
      { id: 'L7', speaker: 'Doctor', text: 'If symptoms persist after 10 days, follow up for allergy evaluation.', confidence: 'medium' }
    ],
    precomputedSoapNote: {
      soap: {
        S: [
          {
            id: 's1',
            text: 'Presents with 1-week history of intense paroxysmal sneezing, rhinorrhea, and pruritus of the posterior pharynx ("throat itching").',
            evidence: ['L2'],
            flags: []
          },
          {
            id: 's2',
            text: 'Denies fever and wheezing ("No fever, no wheezing").',
            evidence: ['L3'],
            flags: [
              {
                id: 'flag-neg-3',
                type: 'Negation',
                reason: 'Patient explicitly stated "No fever, no wheezing". Negation confirmed in transcript.',
                severity: 'red',
                confirmed: false
              }
            ]
          },
          {
            id: 's3',
            text: 'Critical Allergy: Documented severe hypersensitivity to Sulfonamide (Sulfa) medications with prior cutaneous rash reaction.',
            evidence: ['L3'],
            flags: [
              {
                id: 'flag-allergy-3',
                type: 'Allergy',
                reason: 'Sulfa drug allergy documented. Avoid TMP-SMX (Bactrim/Septra), sulfonylureas, and sulfonamide-derived diuretics.',
                severity: 'red',
                confirmed: false
              }
            ]
          }
        ],
        O: [
          {
            id: 'o1',
            text: 'Vital signs: Body temperature 98.4 °F. Chest auscultation clear bilaterally with no rhonchi or wheeze.',
            evidence: ['L4'],
            flags: [
              {
                id: 'flag-vitals-3',
                type: 'Number/Vitals',
                reason: 'Afebrile at 98.4 °F, lungs clear.',
                severity: 'amber',
                confirmed: false
              }
            ]
          },
          {
            id: 'o2',
            text: 'Anterior rhinoscopy: Nasal mucosa appears pale, swollen, and boggy with serous secretions.',
            evidence: ['L4'],
            flags: []
          }
        ],
        A: [
          {
            id: 'a1',
            text: 'Allergic Rhinitis (acute exacerbation).',
            evidence: ['L5'],
            flags: []
          }
        ],
        P: [
          {
            id: 'p1',
            text: 'Cetirizine 10 mg orally once daily at bedtime for 7 days.',
            evidence: ['L5'],
            flags: [
              {
                id: 'flag-med-3',
                type: 'Medicine/Dose',
                reason: 'Verify Cetirizine 10 mg dosage and duration (7 days). Non-sedating second-generation H1 antihistamine.',
                severity: 'red',
                confirmed: false
              }
            ]
          },
          {
            id: 'p2',
            text: 'Normal saline (0.9% NaCl) nasal spray: 2 sprays into each nostril twice daily. Avoid cold exposure and known aerosol allergens.',
            evidence: ['L6'],
            flags: []
          },
          {
            id: 'p3',
            text: 'Follow-up for formal allergy profiling if symptoms persist past 10 days.',
            evidence: ['L7'],
            flags: [
              {
                id: 'flag-conf-3',
                type: 'Low audio confidence',
                reason: 'Cited line L7 has medium audio capture confidence.',
                severity: 'amber',
                confirmed: false
              }
            ]
          }
        ]
      },
      medications: [
        {
          id: 'med-3a',
          name: 'Cetirizine',
          dose: '10 mg',
          frequency: 'Once daily at bedtime',
          duration: '7 days',
          evidence: ['L5']
        },
        {
          id: 'med-3b',
          name: 'Normal Saline Nasal Spray',
          dose: '2 puffs each nostril',
          frequency: 'Twice daily',
          duration: '10 days',
          evidence: ['L6']
        }
      ],
      followUp: {
        text: 'Follow up in clinic in 10 days if symptoms fail to resolve or if secondary sinusitis signs arise.',
        evidence: ['L7']
      },
      missingInfo: [
        'Occupational allergen exposure history was not documented during this visit.'
      ]
    }
  }
];
